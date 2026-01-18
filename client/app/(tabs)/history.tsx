import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import { Search, Plus, SlidersHorizontal, History, Heart, Star, Flame } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import LoadingScreen from "@/components/LoadingScreen";
import ManualMealAddition from "@/components/history/ManualMealAddition";
import MealCard from "@/components/history/MealCard";
import InsightsCard from "@/components/history/InsightsCard";
import FilterModal from "@/components/history/FilterModal";
import { FilterOptions } from "@/src/types/history";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const flatListRef = useRef<FlatList>(null);

  // URL params for deep linking
  const { mealId: selectedMealId } = useLocalSearchParams<{ mealId?: string }>();

  // Redux state
  const { meals, isLoading, isTogglingFavorite, isSavingFeedback } = useSelector((state: RootState) => state.meal);

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showManualMealModal, setShowManualMealModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [highlightedMealId, setHighlightedMealId] = useState<string | null>(null);
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
          (meal.meal_id?.toString() || meal.id?.toString()) === selectedMealId
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
        Alert.alert(t("common.error"), t("history.messages.favoriteUpdateFailed"));
      }
    },
    [dispatch, t]
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
              try {
                await dispatch(
                  duplicateMeal({
                    mealId,
                    newDate: new Date().toISOString().split("T")[0],
                  })
                ).unwrap();
                Alert.alert(t("common.success"), t("history.messages.mealDuplicated"));
              } catch (error) {
                console.error("Failed to duplicate meal:", error);
                Alert.alert(t("common.error"), t("history.messages.duplicateFailed"));
              }
            },
          },
        ]
      );
    },
    [dispatch, t]
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
              try {
                await dispatch(removeMeal(mealId)).unwrap();
              } catch (error) {
                console.error("Failed to remove meal:", error);
                Alert.alert(t("common.error"), t("history.messages.deleteFailed"));
              }
            },
          },
        ]
      );
    },
    [dispatch, t]
  );

  // Save ratings with feedback
  const handleSaveRatings = useCallback(
    async (mealId: string, ratings: any) => {
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
          })
        ).unwrap();
        console.log("✅ Ratings saved successfully");
        Alert.alert(t("common.success"), t("history.messages.ratingsSaved"));
      } catch (error) {
        console.error("Failed to save ratings:", error);
        Alert.alert(t("common.error"), t("history.messages.ratingsSaveFailed"));
      }
    },
    [dispatch, t]
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
      if (filters.category !== "all") {
        const calories = meal.calories || 0;
        const protein = meal.protein || meal.protein_g || 0;
        const carbs = meal.carbs || meal.carbs_g || 0;
        const fat = meal.fat || meal.fats_g || 0;
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
            if (pRatio < 0.2 || pRatio > 0.4 || cRatio < 0.3 || cRatio > 0.6 || fRatio < 0.15 || fRatio > 0.4)
              return false;
            break;
          case "low_calorie":
            if (calories > 300) return false;
            break;
        }
      }

      // Calorie range filter
      const calories = meal.calories || 0;
      if (calories < filters.minCalories || calories > filters.maxCalories) return false;

      // Favorites filter
      if (filters.showFavoritesOnly && !meal.is_favorite) return false;

      // Date range filter
      if (filters.dateRange !== "all") {
        const mealDate = new Date(meal.created_at || meal.upload_time);
        const now = new Date();

        switch (filters.dateRange) {
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
  }, [meals, searchQuery, filters]);

  // Calculate insights
  const insights = useMemo(() => {
    if (!filteredMeals.length) return null;

    const totalCalories = filteredMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
    const avgCalories = Math.round(totalCalories / filteredMeals.length);
    const favoriteMeals = filteredMeals.filter((meal: any) => meal.is_favorite);
    const ratedMeals = filteredMeals.filter((meal: any) => meal.taste_rating && meal.taste_rating > 0);
    const avgRating =
      ratedMeals.length > 0
        ? ratedMeals.reduce((sum: number, meal: any) => sum + (meal.taste_rating || 0), 0) / ratedMeals.length
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

  // Render quick stats
  const renderQuickStats = () => {
    if (!insights) return null;

    return (
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.quickStats}>
        <View style={[styles.quickStatCard, { backgroundColor: isDark ? "#FF9F0A20" : "#FFF8F0" }]}>
          <Flame size={18} color="#FF9F0A" />
          <Text style={[styles.quickStatValue, { color: colors.text }]}>{insights.avgCalories}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.muted }]}>avg kcal</Text>
        </View>

        <View style={[styles.quickStatCard, { backgroundColor: isDark ? "#FF2D5520" : "#FFF0F3" }]}>
          <Heart size={18} color="#FF2D55" fill={insights.favoriteMeals > 0 ? "#FF2D55" : "transparent"} />
          <Text style={[styles.quickStatValue, { color: colors.text }]}>{insights.favoriteMeals}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.muted }]}>favorites</Text>
        </View>

        <View style={[styles.quickStatCard, { backgroundColor: isDark ? "#FFB80020" : "#FFFBEB" }]}>
          <Star size={18} color="#FFB800" fill={insights.avgRating > 0 ? "#FFB800" : "transparent"} />
          <Text style={[styles.quickStatValue, { color: colors.text }]}>{insights.avgRating || "-"}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.muted }]}>rating</Text>
        </View>
      </Animated.View>
    );
  };

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
    [handleToggleFavorite, handleRemoveMeal, handleDuplicateMeal, handleSaveRatings, highlightedMealId]
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
        key: meal.meal_id?.toString() || meal.id?.toString() || Math.random().toString(),
      }))
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
          style={[styles.clearFiltersButton, { backgroundColor: colors.primary }]}
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
          <Text style={styles.clearFiltersText}>{t("history.clearFilters") || "Clear Filters"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && meals.length === 0) {
    return <LoadingScreen text={t("loading.loading","loading.history")} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.headerTop}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {t("history.title")}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {filteredMeals.length} {t("history.insights.totalMeals").toLowerCase()}
              </Text>
            </View>

            {/* Loading indicator for favorites/ratings */}
            {(isTogglingFavorite || isSavingFeedback) && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </Animated.View>

          {/* Quick Stats */}
          {renderQuickStats()}

          {/* Search & Filter Bar */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.searchRow}>
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
                  backgroundColor: hasActiveFilters ? colors.primary : colors.card,
                  borderColor: hasActiveFilters ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setShowFilters(true)}
              activeOpacity={0.7}
            >
              <SlidersHorizontal size={20} color={hasActiveFilters ? "#FFF" : colors.text} />
              {hasActiveFilters && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>!</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
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
        <TouchableOpacity
          style={[styles.fab]}
          onPress={() => setShowManualMealModal(true)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#10B981", "#059669"]}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Plus size={26} color="#FFF" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>

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
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 2,
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    gap: 4,
  },
  quickStatValue: {
    fontSize: 20,
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
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },
  clearFiltersButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearFiltersText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});
