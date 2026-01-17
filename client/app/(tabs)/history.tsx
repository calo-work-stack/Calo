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
import { Search, Filter, Plus, SlidersHorizontal } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import LoadingScreen from "@/components/LoadingScreen";
import ManualMealAddition from "@/components/history/ManualMealAddition";
import MealCard from "@/components/history/MealCard";
import InsightsCard from "@/components/history/InsightsCard";
import FilterModal from "@/components/history/FilterModal";
import { FilterOptions } from "@/src/types/history";

const { width } = Dimensions.get("window");

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const flatListRef = useRef<FlatList>(null);

  // URL params for deep linking
  const { mealId: selectedMealId } = useLocalSearchParams<{ mealId?: string }>();

  // Redux state
  const { meals, isLoading } = useSelector((state: RootState) => state.meal);

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
    maxCalories: 2000,
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
      // Reset filters to show all meals
      setFilters({
        category: "all",
        dateRange: "all",
        minCalories: 0,
        maxCalories: 2000,
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
            index: mealIndex + 1, // +1 for insights card
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

  // Toggle favorite
  const handleToggleFavorite = useCallback(
    async (mealId: string) => {
      try {
        await dispatch(toggleMealFavorite(mealId)).unwrap();
        refreshMealData();
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
        Alert.alert(t("common.error"), t("history.messages.favoriteUpdateFailed"));
      }
    },
    [dispatch, refreshMealData, t]
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
                refreshMealData();
              } catch (error) {
                console.error("Failed to duplicate meal:", error);
                Alert.alert(t("common.error"), t("history.messages.duplicateFailed"));
              }
            },
          },
        ]
      );
    },
    [dispatch, refreshMealData, t]
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
                refreshMealData();
              } catch (error) {
                console.error("Failed to remove meal:", error);
                Alert.alert(t("common.error"), t("history.messages.deleteFailed"));
              }
            },
          },
        ]
      );
    },
    [dispatch, refreshMealData, t]
  );

  // Save ratings
  const handleSaveRatings = useCallback(
    async (mealId: string, ratings: any) => {
      try {
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
        Alert.alert(t("common.success"), t("history.messages.ratingsSaved"));
        refreshMealData();
      } catch (error) {
        console.error("Failed to save ratings:", error);
        Alert.alert(t("common.error"), t("history.messages.ratingsSaveFailed"));
      }
    },
    [dispatch, refreshMealData, t]
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
      filters.maxCalories < 2000
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
        <MealCard
          meal={item}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleRemoveMeal}
          onDuplicate={handleDuplicateMeal}
          onSaveRatings={handleSaveRatings}
          isHighlighted={highlightedMealId === mealId}
        />
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
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t("history.emptyState.title")}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {searchQuery || hasActiveFilters
          ? t("history.emptyState.adjustedFilters")
          : t("history.emptyState.default")}
      </Text>
    </View>
  );

  if (isLoading && meals.length === 0) {
    return <LoadingScreen text={t("history.loading")} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("history.title")}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {filteredMeals.length} {t("history.insights.totalMeals").toLowerCase()}
            </Text>
          </View>

          {/* Search & Filter Bar */}
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
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
                  backgroundColor: hasActiveFilters ? colors.primary : colors.surfaceVariant,
                  borderColor: hasActiveFilters ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setShowFilters(true)}
              activeOpacity={0.7}
            >
              <SlidersHorizontal size={20} color={hasActiveFilters ? "#FFF" : colors.text} />
            </TouchableOpacity>
          </View>
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
        />

        {/* FAB - Add Meal */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowManualMealModal(true)}
          activeOpacity={0.9}
        >
          <Plus size={26} color="#FFF" strokeWidth={2.5} />
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTop: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
