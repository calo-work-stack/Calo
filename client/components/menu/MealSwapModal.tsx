import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import {
  X,
  RefreshCw,
  Check,
  Flame,
  Target,
  Wheat,
  Droplets,
  Sparkles,
  Clock,
  ChevronRight,
} from "lucide-react-native";
import { api } from "@/src/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MealAlternative {
  meal_id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time_minutes?: number;
  cooking_method?: string;
  description?: string;
  match_reason?: string;
  ingredients?: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
}

interface OriginalMeal {
  meal_id: string;
  name: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealSwapModalProps {
  visible: boolean;
  onClose: () => void;
  onSwap: (newMeal: MealAlternative) => void;
  menuId: string;
  originalMeal: OriginalMeal | null;
}

const AlternativeCard: React.FC<{
  alternative: MealAlternative;
  originalMeal: OriginalMeal;
  onSelect: () => void;
  isLoading: boolean;
  colors: any;
  t: any;
}> = ({ alternative, originalMeal, onSelect, isLoading, colors, t }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const calorieDiff = alternative.calories - originalMeal.calories;
  const proteinDiff = alternative.protein - originalMeal.protein;

  const getNutritionBadgeColor = (diff: number, isCalories: boolean) => {
    if (Math.abs(diff) < 20) return colors.emerald500;
    if (isCalories) {
      return diff > 0 ? colors.warning || "#f59e0b" : colors.emerald500;
    }
    return diff > 0 ? colors.emerald500 : colors.warning || "#f59e0b";
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isLoading}
        style={[styles.alternativeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* Header */}
        <View style={styles.alternativeHeader}>
          <View style={styles.alternativeNameContainer}>
            <Text style={[styles.alternativeName, { color: colors.text }]} numberOfLines={2}>
              {alternative.name}
            </Text>
            {alternative.match_reason && (
              <View style={[styles.matchReasonBadge, { backgroundColor: colors.emerald500 + "15" }]}>
                <Sparkles size={10} color={colors.emerald500} />
                <Text style={[styles.matchReasonText, { color: colors.emerald500 }]}>
                  {alternative.match_reason}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.selectButton, { backgroundColor: colors.emerald500 }]}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.selectButtonText}>{t("menu.select", "Select")}</Text>
                <ChevronRight size={14} color="#ffffff" />
              </>
            )}
          </View>
        </View>

        {/* Nutrition Comparison Grid */}
        <View style={[styles.nutritionCompareGrid, { backgroundColor: colors.surface }]}>
          {/* Calories */}
          <View style={styles.nutritionCompareItem}>
            <View style={styles.nutritionCompareRow}>
              <Flame size={14} color={colors.warning || "#f59e0b"} />
              <Text style={[styles.nutritionCompareValue, { color: colors.text }]}>
                {alternative.calories}
              </Text>
              <Text style={[styles.nutritionCompareUnit, { color: colors.icon }]}>
                {t("menu.kcal", "kcal")}
              </Text>
            </View>
            <View
              style={[
                styles.diffBadge,
                { backgroundColor: getNutritionBadgeColor(calorieDiff, true) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.diffText,
                  { color: getNutritionBadgeColor(calorieDiff, true) },
                ]}
              >
                {calorieDiff > 0 ? "+" : ""}
                {calorieDiff}
              </Text>
            </View>
          </View>

          {/* Protein */}
          <View style={styles.nutritionCompareItem}>
            <View style={styles.nutritionCompareRow}>
              <Target size={14} color={colors.emerald500} />
              <Text style={[styles.nutritionCompareValue, { color: colors.text }]}>
                {alternative.protein}g
              </Text>
              <Text style={[styles.nutritionCompareUnit, { color: colors.icon }]}>
                {t("menu.protein_short", "P")}
              </Text>
            </View>
            <View
              style={[
                styles.diffBadge,
                { backgroundColor: getNutritionBadgeColor(proteinDiff, false) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.diffText,
                  { color: getNutritionBadgeColor(proteinDiff, false) },
                ]}
              >
                {proteinDiff > 0 ? "+" : ""}
                {proteinDiff}g
              </Text>
            </View>
          </View>

          {/* Carbs */}
          <View style={styles.nutritionCompareItem}>
            <View style={styles.nutritionCompareRow}>
              <Wheat size={14} color="#f59e0b" />
              <Text style={[styles.nutritionCompareValue, { color: colors.text }]}>
                {alternative.carbs}g
              </Text>
              <Text style={[styles.nutritionCompareUnit, { color: colors.icon }]}>
                {t("menu.carbs_short", "C")}
              </Text>
            </View>
          </View>

          {/* Fat */}
          <View style={styles.nutritionCompareItem}>
            <View style={styles.nutritionCompareRow}>
              <Droplets size={14} color={colors.error || "#ef4444"} />
              <Text style={[styles.nutritionCompareValue, { color: colors.text }]}>
                {alternative.fat}g
              </Text>
              <Text style={[styles.nutritionCompareUnit, { color: colors.icon }]}>
                {t("menu.fat_short", "F")}
              </Text>
            </View>
          </View>
        </View>

        {/* Prep Time */}
        {alternative.prep_time_minutes && (
          <View style={styles.prepTimeRow}>
            <Clock size={12} color={colors.icon} />
            <Text style={[styles.prepTimeText, { color: colors.icon }]}>
              {alternative.prep_time_minutes} {t("menu.minutes", "min")}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

export const MealSwapModal: React.FC<MealSwapModalProps> = ({
  visible,
  onClose,
  onSwap,
  menuId,
  originalMeal,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [alternatives, setAlternatives] = useState<MealAlternative[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && originalMeal) {
      loadAlternatives();
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible, originalMeal]);

  const loadAlternatives = async () => {
    if (!originalMeal) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(
        `/recommended-menus/${menuId}/meal-alternatives/${originalMeal.meal_id}`
      );

      if (response.data.success) {
        setAlternatives(response.data.data || []);
      } else {
        setError(t("menu.failed_load_alternatives", "Failed to load alternatives"));
      }
    } catch (err) {
      console.error("Error loading meal alternatives:", err);
      setError(t("menu.failed_load_alternatives", "Failed to load alternatives"));
      // Generate fallback alternatives based on original meal
      setAlternatives(generateFallbackAlternatives(originalMeal));
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackAlternatives = (meal: OriginalMeal): MealAlternative[] => {
    const mealTypeAlternatives: Record<string, MealAlternative[]> = {
      BREAKFAST: [
        {
          meal_id: `alt_${Date.now()}_1`,
          name: t("menu.alt_overnight_oats", "Overnight Oats with Berries"),
          calories: Math.round(meal.calories * 0.95),
          protein: Math.round(meal.protein * 0.9),
          carbs: Math.round(meal.carbs * 1.1),
          fat: Math.round(meal.fat * 0.85),
          prep_time_minutes: 5,
          match_reason: t("menu.similar_nutrition", "Similar nutrition"),
        },
        {
          meal_id: `alt_${Date.now()}_2`,
          name: t("menu.alt_veggie_omelet", "Veggie Omelet"),
          calories: Math.round(meal.calories * 0.85),
          protein: Math.round(meal.protein * 1.3),
          carbs: Math.round(meal.carbs * 0.5),
          fat: Math.round(meal.fat * 1.1),
          prep_time_minutes: 15,
          match_reason: t("menu.higher_protein", "Higher protein"),
        },
        {
          meal_id: `alt_${Date.now()}_3`,
          name: t("menu.alt_smoothie_bowl", "Protein Smoothie Bowl"),
          calories: Math.round(meal.calories * 1.05),
          protein: Math.round(meal.protein * 1.1),
          carbs: Math.round(meal.carbs * 1.2),
          fat: Math.round(meal.fat * 0.7),
          prep_time_minutes: 10,
          match_reason: t("menu.quick_prep", "Quick preparation"),
        },
      ],
      LUNCH: [
        {
          meal_id: `alt_${Date.now()}_1`,
          name: t("menu.alt_grain_bowl", "Mediterranean Grain Bowl"),
          calories: Math.round(meal.calories * 0.95),
          protein: Math.round(meal.protein * 0.95),
          carbs: Math.round(meal.carbs * 1.05),
          fat: Math.round(meal.fat * 0.9),
          prep_time_minutes: 20,
          match_reason: t("menu.similar_nutrition", "Similar nutrition"),
        },
        {
          meal_id: `alt_${Date.now()}_2`,
          name: t("menu.alt_chicken_wrap", "Grilled Chicken Wrap"),
          calories: Math.round(meal.calories * 1.0),
          protein: Math.round(meal.protein * 1.2),
          carbs: Math.round(meal.carbs * 0.9),
          fat: Math.round(meal.fat * 0.95),
          prep_time_minutes: 15,
          match_reason: t("menu.higher_protein", "Higher protein"),
        },
        {
          meal_id: `alt_${Date.now()}_3`,
          name: t("menu.alt_soup_salad", "Soup & Salad Combo"),
          calories: Math.round(meal.calories * 0.8),
          protein: Math.round(meal.protein * 0.85),
          carbs: Math.round(meal.carbs * 0.75),
          fat: Math.round(meal.fat * 0.8),
          prep_time_minutes: 25,
          match_reason: t("menu.lighter_option", "Lighter option"),
        },
      ],
      DINNER: [
        {
          meal_id: `alt_${Date.now()}_1`,
          name: t("menu.alt_fish_vegetables", "Baked Fish with Vegetables"),
          calories: Math.round(meal.calories * 0.9),
          protein: Math.round(meal.protein * 1.1),
          carbs: Math.round(meal.carbs * 0.7),
          fat: Math.round(meal.fat * 0.85),
          prep_time_minutes: 35,
          match_reason: t("menu.lean_protein", "Lean protein"),
        },
        {
          meal_id: `alt_${Date.now()}_2`,
          name: t("menu.alt_stir_fry", "Chicken Stir Fry"),
          calories: Math.round(meal.calories * 0.95),
          protein: Math.round(meal.protein * 1.05),
          carbs: Math.round(meal.carbs * 0.9),
          fat: Math.round(meal.fat * 0.95),
          prep_time_minutes: 25,
          match_reason: t("menu.similar_nutrition", "Similar nutrition"),
        },
        {
          meal_id: `alt_${Date.now()}_3`,
          name: t("menu.alt_pasta_primavera", "Pasta Primavera"),
          calories: Math.round(meal.calories * 1.1),
          protein: Math.round(meal.protein * 0.8),
          carbs: Math.round(meal.carbs * 1.3),
          fat: Math.round(meal.fat * 1.05),
          prep_time_minutes: 30,
          match_reason: t("menu.comfort_option", "Comfort option"),
        },
      ],
      SNACK: [
        {
          meal_id: `alt_${Date.now()}_1`,
          name: t("menu.alt_greek_yogurt", "Greek Yogurt with Nuts"),
          calories: Math.round(meal.calories * 0.95),
          protein: Math.round(meal.protein * 1.2),
          carbs: Math.round(meal.carbs * 0.8),
          fat: Math.round(meal.fat * 1.1),
          prep_time_minutes: 2,
          match_reason: t("menu.higher_protein", "Higher protein"),
        },
        {
          meal_id: `alt_${Date.now()}_2`,
          name: t("menu.alt_fruit_cottage", "Fruit & Cottage Cheese"),
          calories: Math.round(meal.calories * 0.9),
          protein: Math.round(meal.protein * 1.1),
          carbs: Math.round(meal.carbs * 1.1),
          fat: Math.round(meal.fat * 0.7),
          prep_time_minutes: 3,
          match_reason: t("menu.balanced_snack", "Balanced snack"),
        },
        {
          meal_id: `alt_${Date.now()}_3`,
          name: t("menu.alt_protein_bar", "Protein Energy Bar"),
          calories: Math.round(meal.calories * 1.05),
          protein: Math.round(meal.protein * 1.0),
          carbs: Math.round(meal.carbs * 1.2),
          fat: Math.round(meal.fat * 0.9),
          prep_time_minutes: 0,
          match_reason: t("menu.grab_and_go", "Grab & go"),
        },
      ],
    };

    const mealType = meal.meal_type?.toUpperCase() || "LUNCH";
    return mealTypeAlternatives[mealType] || mealTypeAlternatives.LUNCH;
  };

  const handleSelectAlternative = async (alternative: MealAlternative) => {
    if (!originalMeal) return;

    try {
      setIsSwapping(alternative.meal_id);

      // Call the replace meal API with full alternative nutrition data
      const response = await api.post(`/recommended-menus/${menuId}/replace-meal`, {
        mealId: originalMeal.meal_id,
        preferences: {
          targetCalories: alternative.calories,
          targetProtein: alternative.protein,
          targetCarbs: alternative.carbs,
          targetFat: alternative.fat,
          selectedAlternativeId: alternative.meal_id,
          alternativeName: alternative.name,
          prepTime: alternative.prep_time_minutes,
          cookingMethod: alternative.cooking_method,
        },
      });

      if (response.data.success) {
        onSwap(alternative);
        onClose();
      } else {
        setError(t("menu.swap_failed", "Failed to swap meal"));
      }
    } catch (err) {
      console.error("Error swapping meal:", err);
      setError(t("menu.swap_failed", "Failed to swap meal. Please try again."));
    } finally {
      setIsSwapping(null);
    }
  };

  if (!originalMeal) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background, transform: [{ translateY }] },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.headerLeft}>
                <RefreshCw size={20} color={colors.emerald500} />
                <View style={styles.headerTextContainer}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {t("menu.swap_meal", "Swap Meal")}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.icon }]} numberOfLines={1}>
                    {t("menu.replace", "Replace")} "{originalMeal.name}"
                  </Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]}>
                <X size={20} color={colors.icon} />
              </Pressable>
            </View>

            {/* Current Meal Summary */}
            <View style={[styles.currentMealSummary, { backgroundColor: colors.surface }]}>
              <Text style={[styles.currentMealLabel, { color: colors.icon }]}>
                {t("menu.current_meal", "Current")}:
              </Text>
              <View style={styles.currentMealStats}>
                <Text style={[styles.currentMealStat, { color: colors.text }]}>
                  {originalMeal.calories} {t("menu.kcal", "kcal")}
                </Text>
                <Text style={[styles.currentMealStatDivider, { color: colors.border }]}>|</Text>
                <Text style={[styles.currentMealStat, { color: colors.text }]}>
                  {originalMeal.protein}g {t("menu.protein_short", "P")}
                </Text>
                <Text style={[styles.currentMealStatDivider, { color: colors.border }]}>|</Text>
                <Text style={[styles.currentMealStat, { color: colors.text }]}>
                  {originalMeal.carbs}g {t("menu.carbs_short", "C")}
                </Text>
                <Text style={[styles.currentMealStatDivider, { color: colors.border }]}>|</Text>
                <Text style={[styles.currentMealStat, { color: colors.text }]}>
                  {originalMeal.fat}g {t("menu.fat_short", "F")}
                </Text>
              </View>
            </View>

            {/* Alternatives List */}
            <ScrollView
              style={styles.alternativesList}
              contentContainerStyle={styles.alternativesContent}
              showsVerticalScrollIndicator={false}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.emerald500} />
                  <Text style={[styles.loadingText, { color: colors.icon }]}>
                    {t("menu.finding_alternatives", "Finding alternatives...")}
                  </Text>
                </View>
              ) : error && alternatives.length === 0 ? (
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { color: colors.error || "#ef4444" }]}>
                    {error}
                  </Text>
                  <Pressable
                    onPress={loadAlternatives}
                    style={[styles.retryButton, { backgroundColor: colors.emerald500 }]}
                  >
                    <Text style={styles.retryButtonText}>{t("common.retry", "Retry")}</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={[styles.alternativesTitle, { color: colors.text }]}>
                    {t("menu.meal_alternatives", "Meal Alternatives")}
                  </Text>
                  {alternatives.map((alternative) => (
                    <AlternativeCard
                      key={alternative.meal_id}
                      alternative={alternative}
                      originalMeal={originalMeal}
                      onSelect={() => handleSelectAlternative(alternative)}
                      isLoading={isSwapping === alternative.meal_id}
                      colors={colors}
                      t={t}
                    />
                  ))}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    maxHeight: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  currentMealSummary: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  currentMealLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  currentMealStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    flexWrap: "wrap",
  },
  currentMealStat: {
    fontSize: 12,
    fontWeight: "700",
  },
  currentMealStatDivider: {
    fontSize: 12,
  },
  alternativesList: {
    maxHeight: 450,
  },
  alternativesContent: {
    padding: 20,
    gap: 14,
  },
  alternativesTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  alternativeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  alternativeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  alternativeNameContainer: {
    flex: 1,
    gap: 6,
  },
  alternativeName: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  matchReasonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  matchReasonText: {
    fontSize: 10,
    fontWeight: "600",
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  selectButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  nutritionCompareGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    borderRadius: 12,
  },
  nutritionCompareItem: {
    alignItems: "center",
    gap: 4,
  },
  nutritionCompareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nutritionCompareValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  nutritionCompareUnit: {
    fontSize: 10,
    fontWeight: "500",
  },
  diffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diffText: {
    fontSize: 10,
    fontWeight: "700",
  },
  prepTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  prepTimeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  errorContainer: {
    padding: 40,
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default MealSwapModal;
