import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useLocalSearchParams } from "expo-router";
import { RootState, AppDispatch } from "@/src/store";
import {
  fetchMeals,
  saveMealFeedback,
  toggleMealFavorite,
  duplicateMeal,
  removeMeal,
} from "@/src/store/mealSlice";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { useMealDataRefresh } from "@/hooks/useMealDataRefresh";
import {
  Search,
  Plus,
  SlidersHorizontal,
  History,
  Heart,
  Star,
  Flame,
} from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import ManualMealAddition from "@/components/history/ManualMealAddition";
import MealCard from "@/components/history/MealCard";
import InsightsCard from "@/components/history/InsightsCard";
import FilterModal from "@/components/history/FilterModal";
import { FilterOptions } from "@/src/types/history";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import {
  HistoryScreenSkeleton,
  OperationLoader,
  OperationType,
} from "@/components/loaders";

const { width } = Dimensions.get("window");

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const flatListRef = useRef<FlatList>(null);

  // URL params for deep linking
  const { mealId: selectedMealId } = useLocalSearchParams<{
    mealId?: string;
  }>();

  // Redux state
  const { meals, isLoading, isTogglingFavorite, isSavingFeedback } =
    useSelector((state: RootState) => state.meal);

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<
    "all" | "today" | "week" | "month" | "favorites"
  >("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showManualMealModal, setShowManualMealModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [highlightedMealId, setHighlightedMealId] = useState<string | null>(
    null,
  );

  // Operation loading states
  const [operationLoading, setOperationLoading] = useState<{
    visible: boolean;
    type: OperationType;
    message?: string;
  }>({ visible: false, type: "loading" });

  const [filters, setFilters] = useState<FilterOptions>({
    category: "all",
    dateRange: "all",
    minCalories: 0,
    maxCalories: 3000,
    showFavoritesOnly: false,
  });

  // Refresh hooks
  const { refreshAllMealData, refreshMealData } = useMealDataRefresh();

  // Load meals on mount
  useEffect(() => {
    dispatch(fetchMeals());
  }, [dispatch]);

  // Handle deep linking to specific meal
  useEffect(() => {
    if (selectedMealId && meals.length > 0 && !isLoading) {
      setFilters({
        category: "all",
        dateRange: "all",
        minCalories: 0,
        maxCalories: 3000,
        showFavoritesOnly: false,
      });
      setSearchQuery("");

      const mealIndex = meals.findIndex(
        (meal: any) =>
          (meal.meal_id?.toString() || meal.id?.toString()) === selectedMealId,
      );

      if (mealIndex !== -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: mealIndex + 1,
            animated: true,
            viewPosition: 0.3,
          });

          setHighlightedMealId(selectedMealId);
          setTimeout(() => setHighlightedMealId(null), 3000);
        }, 500);
      }
    }
  }, [selectedMealId, meals, isLoading]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAllMealData();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllMealData]);

  // Toggle favorite with optimistic update
  const handleToggleFavorite = useCallback(
    async (mealId: string) => {
      try {
        console.log("❤️ Toggling favorite for meal:", mealId);
        const result = await dispatch(toggleMealFavorite(mealId)).unwrap();
        console.log("✅ Favorite toggled:", result);
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
        Alert.alert(
          t("common.error"),
          t("history.messages.favoriteUpdateFailed"),
        );
      }
    },
    [dispatch, t],
  );

  // Duplicate meal
  const handleDuplicateMeal = useCallback(
    async (mealId: string) => {
      Alert.alert(
        t("history.confirm.copyTitle"),
        t("history.confirm.copyMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.copy"),
            onPress: async () => {
              setOperationLoading({
                visible: true,
                type: "duplicate",
                message: t("operations.duplicating"),
              });
              try {
                await dispatch(
                  duplicateMeal({
                    mealId,
                    newDate: new Date().toISOString().split("T")[0],
                  }),
                ).unwrap();
                setOperationLoading({ visible: false, type: "loading" });
                Alert.alert(
                  t("common.success"),
                  t("operations.success.duplicated"),
                );
              } catch (error) {
                console.error("Failed to duplicate meal:", error);
                setOperationLoading({ visible: false, type: "loading" });
                Alert.alert(
                  t("common.error"),
                  t("operations.error.duplicateFailed"),
                );
              }
            },
          },
        ],
      );
    },
    [dispatch, t],
  );

  // Delete meal
  const handleRemoveMeal = useCallback(
    async (mealId: string) => {
      Alert.alert(
        t("history.confirm.deleteTitle"),
        t("history.confirm.deleteMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              setOperationLoading({
                visible: true,
                type: "delete",
                message: t("operations.deletingMeal"),
              });
              try {
                await dispatch(removeMeal(mealId)).unwrap();
                setOperationLoading({ visible: false, type: "loading" });
              } catch (error) {
                console.error("Failed to remove meal:", error);
                setOperationLoading({ visible: false, type: "loading" });
                Alert.alert(
                  t("common.error"),
                  t("operations.error.mealDeleteFailed"),
                );
              }
            },
          },
        ],
      );
    },
    [dispatch, t],
  );

  // Save ratings with feedback
  const handleSaveRatings = useCallback(
    async (mealId: string, ratings: any) => {
      setOperationLoading({
        visible: true,
        type: "rate",
        message: t("operations.rating"),
      });
      try {
        console.log("⭐ Saving ratings for meal:", mealId, ratings);
        await dispatch(
          saveMealFeedback({
            mealId,
            feedback: {
              tasteRating: ratings.taste_rating,
              satietyRating: ratings.satiety_rating,
              energyRating: ratings.energy_rating,
              heavinessRating: ratings.heaviness_rating,
            },
          }),
        ).unwrap();
        console.log("✅ Ratings saved successfully");
        setOperationLoading({ visible: false, type: "loading" });
        Alert.alert(t("common.success"), t("operations.success.rated"));
      } catch (error) {
        console.error("Failed to save ratings:", error);
        setOperationLoading({ visible: false, type: "loading" });
        Alert.alert(t("common.error"), t("operations.error.rateFailed"));
      }
    },
    [dispatch, t],
  );

  // Filter meals
  const filteredMeals = useMemo(() => {
    if (!meals) return [];

    return meals.filter((meal: any) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          meal.name?.toLowerCase().includes(query) ||
          meal.meal_name?.toLowerCase().includes(query) ||
          meal.description?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      // FIX: Check _g fields FIRST since API returns protein_g, carbs_g, fats_g
      if (filters.category !== "all") {
        const calories = Number(meal.calories) || 0;
        const protein = Number(meal.protein_g) || Number(meal.protein) || 0;
        const carbs = Number(meal.carbs_g) || Number(meal.carbs) || 0;
        const fat = Number(meal.fats_g) || Number(meal.fat) || 0;
        const total = protein + carbs + fat;

        switch (filters.category) {
          case "high_protein":
            if (total === 0 || protein / total < 0.3) return false;
            break;
          case "high_carb":
            if (total === 0 || carbs / total < 0.5) return false;
            break;
          case "high_fat":
            if (total === 0 || fat / total < 0.35) return false;
            break;
          case "balanced":
            if (total === 0) return false;
            const pRatio = protein / total;
            const cRatio = carbs / total;
            const fRatio = fat / total;
            if (
              pRatio < 0.2 ||
              pRatio > 0.4 ||
              cRatio < 0.3 ||
              cRatio > 0.6 ||
              fRatio < 0.15 ||
              fRatio > 0.4
            )
              return false;
            break;
          case "low_calorie":
            if (calories > 300) return false;
            break;
        }
      }

      // Calorie range filter
      const calories = meal.calories || 0;
      if (calories < filters.minCalories || calories > filters.maxCalories)
        return false;

      // Favorites filter (from advanced filter OR quick filter)
      if (filters.showFavoritesOnly && !meal.is_favorite) return false;
      if (quickFilter === "favorites" && !meal.is_favorite) return false;

      // Date range filter (from advanced filter OR quick filter)
      const effectiveDateRange =
        quickFilter !== "all" && quickFilter !== "favorites"
          ? quickFilter
          : filters.dateRange;
      if (effectiveDateRange !== "all") {
        const mealDate = new Date(meal.created_at || meal.upload_time);
        const now = new Date();

        switch (effectiveDateRange) {
          case "today":
            if (mealDate.toDateString() !== now.toDateString()) return false;
            break;
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (mealDate < weekAgo) return false;
            break;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (mealDate < monthAgo) return false;
            break;
        }
      }

      return true;
    });
  }, [meals, searchQuery, filters, quickFilter]);

  // Calculate insights
  const insights = useMemo(() => {
    if (!filteredMeals.length) return null;

    const totalCalories = filteredMeals.reduce(
      (sum: number, meal: any) => sum + (meal.calories || 0),
      0,
    );
    const avgCalories = Math.round(totalCalories / filteredMeals.length);
    const favoriteMeals = filteredMeals.filter((meal: any) => meal.is_favorite);
    const ratedMeals = filteredMeals.filter(
      (meal: any) => meal.taste_rating && meal.taste_rating > 0,
    );
    const avgRating =
      ratedMeals.length > 0
        ? ratedMeals.reduce(
            (sum: number, meal: any) => sum + (meal.taste_rating || 0),
            0,
          ) / ratedMeals.length
        : 0;

    return {
      totalMeals: filteredMeals.length,
      avgCalories,
      favoriteMeals: favoriteMeals.length,
      avgRating: Math.round(avgRating * 10) / 10,
      totalCalories,
    };
  }, [filteredMeals]);

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.category !== "all" ||
      filters.dateRange !== "all" ||
      filters.showFavoritesOnly ||
      filters.minCalories > 0 ||
      filters.maxCalories < 3000
    );
  }, [filters]);

  // Render item
  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (item.type === "insights") {
        return <InsightsCard insights={item.data} />;
      }

      const mealId = item.meal_id?.toString() || item.id?.toString();

      return (
        <Animated.View entering={FadeIn.delay(index * 30).duration(300)}>
          <MealCard
            meal={item}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleRemoveMeal}
            onDuplicate={handleDuplicateMeal}
            onSaveRatings={handleSaveRatings}
            isHighlighted={highlightedMealId === mealId}
          />
        </Animated.View>
      );
    },
    [
      handleToggleFavorite,
      handleRemoveMeal,
      handleDuplicateMeal,
      handleSaveRatings,
      highlightedMealId,
    ],
  );

  // List data with insights card
  const listData = useMemo(() => {
    const data: any[] = [];
    if (insights) {
      data.push({ type: "insights", data: insights, key: "insights" });
    }
    return data.concat(
      filteredMeals.map((meal: any) => ({
        ...meal,
        key:
          meal.meal_id?.toString() ||
          meal.id?.toString() ||
          Math.random().toString(),
      })),
    );
  }, [filteredMeals, insights]);

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={isDark ? ["#374151", "#1F2937"] : ["#F3F4F6", "#E5E7EB"]}
        style={styles.emptyIconContainer}
      >
        <History size={48} color={colors.muted} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t("history.emptyState.title")}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {searchQuery || hasActiveFilters
          ? t("history.emptyState.adjustedFilters")
          : t("history.emptyState.default")}
      </Text>
      {(searchQuery || hasActiveFilters) && (
        <TouchableOpacity
          style={[
            styles.clearFiltersButton,
            { backgroundColor: colors.primary },
          ]}
          onPress={() => {
            setSearchQuery("");
            setFilters({
              category: "all",
              dateRange: "all",
              minCalories: 0,
              maxCalories: 3000,
              showFavoritesOnly: false,
            });
          }}
        >
          <Text style={styles.clearFiltersText}>
            {t("history.clearFilters") || "Clear Filters"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && meals.length === 0) {
    return <HistoryScreenSkeleton />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.headerTop}
          >
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {t("history.title")}
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              >
                {filteredMeals.length}{" "}
                {t("history.insights.totalMeals").toLowerCase()}
              </Text>
            </View>

            {/* Loading indicator for favorites/ratings */}
            {(isTogglingFavorite || isSavingFeedback) && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </Animated.View>

          {/* Search & Filter Bar */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(400)}
            style={styles.searchRow}
          >
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Search size={20} color={colors.muted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t("history.searchPlaceholder")}
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: hasActiveFilters
                    ? colors.primary
                    : colors.card,
                  borderColor: hasActiveFilters
                    ? colors.primary
                    : colors.border,
                },
              ]}
              onPress={() => setShowFilters(true)}
              activeOpacity={0.7}
            >
              <SlidersHorizontal
                size={20}
                color={hasActiveFilters ? "#FFF" : colors.text}
              />
              {hasActiveFilters && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>!</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity
            style={[styles.fab]}
            onPress={() => setShowManualMealModal(true)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.emerald100, colors.emerald100]}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Plus size={26} color="#FFF" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        {/* Meals List */}
        <FlatList
          ref={flatListRef}
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
              });
            }, 100);
          }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />

        {/* FAB - Add Meal */}

        {/* Filter Modal */}
        <FilterModal
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Manual Meal Addition */}
        <ManualMealAddition
          visible={showManualMealModal}
          onClose={() => setShowManualMealModal(false)}
          onMealAdded={() => {
            dispatch(fetchMeals());
            refreshAllMealData();
          }}
        />

        {/* Operation Loader */}
        <OperationLoader
          visible={operationLoading.visible}
          type={operationLoading.type}
          message={operationLoading.message}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
    opacity: 0.7,
  },
  quickStats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  quickStatCard: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 20,
    gap: 4,
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: "row",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 18,
    height: 54,
    gap: 12,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  filterButton: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  filterBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
  },
  quickFiltersScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  quickFilters: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 2,
  },
  quickFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickFilterText: {
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 100,
    paddingTop: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.7,
  },
  clearFiltersButton: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  clearFiltersText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  fab: {
    width: "100%",
    alignSelf: "center",
    borderRadius: 20,
    paddingTop: 16,
  },
  fabGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
});
