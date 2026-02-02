import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Image,
  Animated,
  Pressable,
  Dimensions,
  Platform,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Star,
  Flame,
  CheckCircle2,
  Circle,
  ChefHat,
  Calendar,
  Target,
  Timer,
  Trophy,
  Sparkles,
  TrendingUp,
  Check,
  RefreshCw,
  SkipForward,
} from "lucide-react-native";
import { api } from "@/src/services/api";
import { DietaryIcons } from "@/components/menu/DietaryIcons";
import { LinearGradient } from "expo-linear-gradient";
import {
  GoalProgressRing,
  DaysRemainingBadge,
  DayProgressRow,
  StreakBadge,
  calculateStreak,
  MealSwapModal,
  DailyTipsCard,
  WeeklySummaryCard,
  QuickTipsGuide,
} from "@/components/menu";
import type { DayProgress } from "@/components/menu";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Ingredient {
  ingredient_id: string;
  name: string;
  quantity: string;
  checked?: boolean;
}

interface Meal {
  meal_id: string;
  meal_type: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Ingredient[];
  instructions: string;
  image_url?: string;
  dietary_tags?: string[];
  is_logged?: boolean;
}

interface DayMeals {
  day: number;
  date: string;
  meals: Meal[];
  caloriesTarget?: number;
  caloriesActual?: number;
}

interface MealPlan {
  plan_id: string;
  name: string;
  duration: number;
  start_date: string;
  end_date: string;
  days: DayMeals[];
  status: string;
  daily_calorie_target?: number;
}

// ==================== SKELETON LOADER ====================

const SkeletonPulse = React.memo(({ style }: { style?: any }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return <Animated.View style={[style, { opacity: pulseAnim }]} />;
});

// ==================== PROGRESS SUMMARY CARD ====================

const ProgressSummaryCard = React.memo(
  ({
    plan,
    selectedDay,
    totalDays,
    completionRate,
    streak,
    weeklyVariance,
    dayProgressData,
    colors,
    t,
    onDayPress,
  }: {
    plan: MealPlan;
    selectedDay: number;
    totalDays: number;
    completionRate: number;
    streak: number;
    weeklyVariance: number;
    dayProgressData: DayProgress[];
    colors: any;
    t: any;
    onDayPress: (day: number) => void;
  }) => {
    const dailyTarget = plan.daily_calorie_target || 2000;
    const todayData = dayProgressData[selectedDay];
    const caloriesActual = todayData?.caloriesActual || 0;

    return (
      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        {/* Header Row */}
        <View style={styles.summaryHeader}>
          <View style={styles.summaryHeaderLeft}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              {plan.name}
            </Text>
            <Text style={[styles.summarySubtitle, { color: colors.icon }]}>
              {t("menu.day_of", "Day {{current}} of {{total}}", {
                current: selectedDay + 1,
                total: totalDays,
              })}
            </Text>
          </View>
          <DaysRemainingBadge
            startDate={plan.start_date}
            endDate={plan.end_date}
            variant="compact"
          />
        </View>

        {/* Compact Stats Row */}
        <View style={styles.compactStatsRow}>
          <View style={styles.compactStatItem}>
            <GoalProgressRing
              actual={caloriesActual}
              target={dailyTarget}
              size={56}
              strokeWidth={5}
              showVariance={false}
            />
            <View style={styles.compactStatText}>
              <Text style={[styles.compactStatValue, { color: colors.text }]}>
                {Math.round(caloriesActual)}
              </Text>
              <Text style={[styles.compactStatLabel, { color: colors.icon }]}>
                / {dailyTarget} {t("menu.kcal", "kcal")}
              </Text>
            </View>
          </View>

          {streak > 0 && (
            <View style={styles.compactStatItem}>
              <StreakBadge streak={streak} showLabel={false} />
              <Text style={[styles.compactStatLabel, { color: colors.icon }]}>
                {t("menu.day_streak", "day streak")}
              </Text>
            </View>
          )}

          <View style={styles.compactStatItem}>
            <View style={[styles.varianceChip, {
              backgroundColor: weeklyVariance <= 0 ? colors.emerald500 + "15" : (colors.error || "#ef4444") + "15"
            }]}>
              <Text style={[styles.varianceChipText, {
                color: weeklyVariance <= 0 ? colors.emerald500 : colors.error || "#ef4444"
              }]}>
                {weeklyVariance > 0 ? "+" : ""}{weeklyVariance}
              </Text>
            </View>
            <Text style={[styles.compactStatLabel, { color: colors.icon }]}>
              {t("menu.weekly_variance", "weekly")}
            </Text>
          </View>
        </View>

        {/* Day Progress Row */}
        <DayProgressRow
          days={dayProgressData}
          currentDay={selectedDay + 1}
          onDayPress={(day) => onDayPress(day - 1)}
          compact={true}
        />
      </View>
    );
  }
);

// ==================== TODAY'S MEALS SECTION ====================

const TodaysMealsSection = React.memo(
  ({
    meals,
    expandedMeals,
    onToggleMeal,
    checkedIngredients,
    onToggleIngredient,
    onSwapMeal,
    colors,
    t,
  }: {
    meals: Meal[];
    expandedMeals: Set<string>;
    onToggleMeal: (mealId: string) => void;
    checkedIngredients: Set<string>;
    onToggleIngredient: (ingredientId: string, mealId: string) => void;
    onSwapMeal?: (meal: Meal) => void;
    colors: any;
    t: any;
  }) => {
    return (
      <View style={styles.todaysMealsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("menu.today_meals", "Today's Meals")}
        </Text>

        {meals.map((meal) => (
          <ActiveMealCard
            key={meal.meal_id}
            meal={meal}
            isExpanded={expandedMeals.has(meal.meal_id)}
            onToggle={() => onToggleMeal(meal.meal_id)}
            checkedIngredients={checkedIngredients}
            onToggleIngredient={onToggleIngredient}
            onSwapMeal={onSwapMeal}
            colors={colors}
            t={t}
          />
        ))}
      </View>
    );
  }
);

// ==================== DAY TAB ====================

const DayTab = React.memo(
  ({
    day,
    index,
    isSelected,
    onSelect,
    language,
    colors,
  }: {
    day: DayMeals;
    index: number;
    isSelected: boolean;
    onSelect: () => void;
    language: string;
    colors: any;
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = useCallback(() => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      onSelect();
    }, [onSelect, scaleAnim]);

    const dayDate = new Date(day.date);
    const dayName = dayDate.toLocaleDateString(
      language === "he" ? "he-IL" : "en-US",
      { weekday: "short" }
    );
    const dateNumber = dayDate.getDate();
    const monthName = dayDate.toLocaleDateString(
      language === "he" ? "he-IL" : "en-US",
      { month: "short" }
    );

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={handlePress}
          style={[
            styles.dayTab,
            {
              backgroundColor: isSelected ? colors.emerald500 : colors.card,
              borderColor: isSelected ? colors.emerald500 : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.dayTabName,
              { color: isSelected ? "rgba(255,255,255,0.85)" : colors.icon },
            ]}
          >
            {dayName}
          </Text>
          <Text
            style={[
              styles.dayTabDate,
              { color: isSelected ? "#ffffff" : colors.text },
            ]}
          >
            {dateNumber}
          </Text>
          <Text
            style={[
              styles.dayTabMonth,
              { color: isSelected ? "rgba(255,255,255,0.9)" : colors.icon },
            ]}
          >
            {monthName}
          </Text>
        </Pressable>
      </Animated.View>
    );
  }
);

// ==================== MEAL CARD ====================

const ActiveMealCard = React.memo(
  ({
    meal,
    isExpanded,
    onToggle,
    checkedIngredients,
    onToggleIngredient,
    onSwapMeal,
    colors,
    t,
  }: {
    meal: Meal;
    isExpanded: boolean;
    onToggle: () => void;
    checkedIngredients: Set<string>;
    onToggleIngredient: (ingredientId: string, mealId: string) => void;
    onSwapMeal?: (meal: Meal) => void;
    colors: any;
    t: any;
  }) => {
    const getMealTypeConfig = useCallback((type: string) => {
      const configs: Record<string, { emoji: string; color: string; label: string }> = {
        breakfast: { emoji: "🍳", color: "#F59E0B", label: t("active_menu.meal_types.breakfast", "Breakfast") },
        lunch: { emoji: "🥗", color: "#10B981", label: t("active_menu.meal_types.lunch", "Lunch") },
        dinner: { emoji: "🍲", color: "#6366F1", label: t("active_menu.meal_types.dinner", "Dinner") },
        snack: { emoji: "🍎", color: "#EC4899", label: t("active_menu.meal_types.snack", "Snack") },
      };
      return configs[type.toLowerCase()] || { emoji: "🍽️", color: "#6B7280", label: type };
    }, [t]);

    const config = getMealTypeConfig(meal.meal_type);
    const ingredientCount = meal.ingredients.length;
    const checkedCount = meal.ingredients.filter((ing) =>
      checkedIngredients.has(ing.ingredient_id)
    ).length;
    const mealProgress = ingredientCount > 0 ? (checkedCount / ingredientCount) * 100 : 0;
    const isLogged = meal.is_logged || mealProgress === 100;

    return (
      <View
        style={[
          styles.mealCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Header */}
        <Pressable onPress={onToggle} style={styles.mealHeader}>
          {/* Meal Image */}
          <View style={styles.mealImageContainer}>
            {meal.image_url ? (
              <Image source={{ uri: meal.image_url }} style={styles.mealImage} />
            ) : (
              <View style={[styles.mealImagePlaceholder, { backgroundColor: config.color + "20" }]}>
                <Text style={styles.mealEmoji}>{config.emoji}</Text>
              </View>
            )}

            {/* Status indicator */}
            {isLogged ? (
              <View style={[styles.statusBadge, { backgroundColor: colors.emerald500 }]}>
                <Check size={10} color="#ffffff" strokeWidth={3} />
              </View>
            ) : mealProgress > 0 ? (
              <View style={[styles.statusBadge, { backgroundColor: colors.warning || "#f59e0b" }]}>
                <Text style={styles.statusBadgeText}>{Math.round(mealProgress)}%</Text>
              </View>
            ) : null}
          </View>

          {/* Meal Info */}
          <View style={styles.mealInfo}>
            <View style={styles.mealTypeRow}>
              <View style={[styles.mealTypeBadge, { backgroundColor: config.color }]}>
                <Text style={styles.mealTypeText}>{config.label}</Text>
              </View>
              <Text
                style={[
                  styles.mealStatusText,
                  {
                    color: isLogged
                      ? colors.emerald500
                      : colors.icon,
                  },
                ]}
              >
                {isLogged
                  ? t("menu.logged", "Logged")
                  : t("menu.pending", "Pending")}
              </Text>
            </View>
            <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={1}>
              {meal.name}
            </Text>
            <View style={styles.mealMeta}>
              <Flame size={14} color={colors.warning || "#f59e0b"} />
              <Text style={[styles.mealMetaText, { color: colors.icon }]}>
                {meal.calories} {t("menu.kcal", "kcal")}
              </Text>
              <Text style={[styles.mealMetaDot, { color: colors.icon }]}>•</Text>
              <Target size={14} color={colors.emerald500} />
              <Text style={[styles.mealMetaText, { color: colors.icon }]}>
                {meal.protein}g {t("menu.protein", "protein")}
              </Text>
              {meal.dietary_tags && meal.dietary_tags.length > 0 && (
                <DietaryIcons tags={meal.dietary_tags} size={14} style={{ marginLeft: 6 }} />
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.mealActions}>
            {/* Swap Button */}
            {onSwapMeal && !isLogged && (
              <Pressable
                onPress={() => onSwapMeal(meal)}
                style={[styles.swapButton, { backgroundColor: colors.emerald500 + "15" }]}
              >
                <RefreshCw size={16} color={colors.emerald500} />
              </Pressable>
            )}

            {/* Expand Icon */}
            <View style={[styles.expandIconBg, { backgroundColor: colors.surface }]}>
              {isExpanded ? (
                <ChevronUp size={20} color={colors.icon} />
              ) : (
                <ChevronDown size={20} color={colors.icon} />
              )}
            </View>
          </View>
        </Pressable>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
            {/* Nutrition Grid */}
            <View style={[styles.nutritionGrid, { backgroundColor: colors.surface }]}>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: colors.emerald500 }]}>
                  {meal.protein}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {t("menu.protein", "Protein")}
                </Text>
              </View>
              <View style={[styles.nutritionDivider, { backgroundColor: colors.border }]} />
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: "#f59e0b" }]}>
                  {meal.carbs}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {t("menu.carbs", "Carbs")}
                </Text>
              </View>
              <View style={[styles.nutritionDivider, { backgroundColor: colors.border }]} />
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: colors.error || "#ef4444" }]}>
                  {meal.fat}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {t("menu.fat", "Fat")}
                </Text>
              </View>
            </View>

            {/* Ingredients with Checkboxes */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ChefHat size={18} color={colors.emerald500} />
                <Text style={[styles.ingredientsSectionTitle, { color: colors.text }]}>
                  {t("active_menu.ingredients")}
                </Text>
                <View style={[styles.checkedBadge, { backgroundColor: colors.emerald500 + "20" }]}>
                  <Text style={[styles.checkedBadgeText, { color: colors.emerald500 }]}>
                    {checkedCount}/{ingredientCount}
                  </Text>
                </View>
              </View>
              <View style={styles.ingredientsList}>
                {meal.ingredients.map((ingredient) => {
                  const isChecked = checkedIngredients.has(ingredient.ingredient_id);

                  return (
                    <Pressable
                      key={ingredient.ingredient_id}
                      onPress={() => onToggleIngredient(ingredient.ingredient_id, meal.meal_id)}
                      style={[
                        styles.ingredientItem,
                        isChecked && { backgroundColor: colors.emerald500 + "10" },
                      ]}
                    >
                      {isChecked ? (
                        <CheckCircle2 size={22} color={colors.success || colors.emerald500} fill={colors.success || colors.emerald500} />
                      ) : (
                        <Circle size={22} color={colors.border} />
                      )}
                      <Text
                        style={[
                          styles.ingredientText,
                          { color: colors.text },
                          isChecked && [styles.ingredientTextChecked, { color: colors.icon }],
                        ]}
                      >
                        {ingredient.name} - {ingredient.quantity}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Instructions */}
            {meal.instructions && (
              <View style={styles.section}>
                <Text style={[styles.ingredientsSectionTitle, { color: colors.text }]}>
                  {t("active_menu.instructions")}
                </Text>
                <View style={[styles.instructionsContainer, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.instructionsText, { color: colors.icon }]}>
                    {meal.instructions}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }
);

// ==================== MAIN COMPONENT ====================

export default function ActiveMenu() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const router = useRouter();
  const { planId } = useLocalSearchParams();
  const { colors } = useTheme();

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewType, setReviewType] = useState<"completed" | "failed">("completed");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Meal swap state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedMealForSwap, setSelectedMealForSwap] = useState<Meal | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Calculate current day index based on start_date
  const getCurrentDayIndex = useCallback((startDate: string, totalDays: number): number => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Clamp to valid range (0 to totalDays-1)
    if (diffDays < 0) return 0;
    if (diffDays >= totalDays) return totalDays - 1;
    return diffDays;
  }, []);

  useEffect(() => {
    loadMealPlan();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [planId]);

  useEffect(() => {
    if (mealPlan) {
      // Set current day based on actual date
      const currentDayIdx = getCurrentDayIndex(mealPlan.start_date, mealPlan.days.length);
      setSelectedDay(currentDayIdx);
      checkMenuCompletion();
    }
  }, [mealPlan, getCurrentDayIndex]);

  const loadMealPlan = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/recommended-menus/${planId}/with-progress`);
      const plan = response.data.data;
      setMealPlan(plan);

      if (plan.ingredient_checks) {
        const checked = new Set<string>(
          plan.ingredient_checks
            .filter((c: any) => c.checked)
            .map((c: any) => c.ingredient_id as string)
        );
        setCheckedIngredients(checked);
      }
    } catch (error) {
      console.error("Error loading meal plan:", error);
      Alert.alert(t("common.error"), t("active_menu.failed_to_load"));
    } finally {
      setIsLoading(false);
    }
  };

  const checkMenuCompletion = () => {
    if (!mealPlan) return;

    const endDate = new Date(mealPlan.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (today > endDate && mealPlan.status === "active") {
      const allMealsCompleted = checkIfAllMealsCompleted();
      setReviewType(allMealsCompleted ? "completed" : "failed");
      setShowReviewModal(true);
    }
  };

  const checkIfAllMealsCompleted = () => {
    if (!mealPlan) return false;

    let totalIngredients = 0;
    let checkedCount = 0;

    mealPlan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        totalIngredients += meal.ingredients.length;
        meal.ingredients.forEach((ing) => {
          if (checkedIngredients.has(ing.ingredient_id)) {
            checkedCount++;
          }
        });
      });
    });

    return checkedCount / totalIngredients >= 0.8;
  };

  const toggleMealExpanded = useCallback((mealId: string) => {
    setExpandedMeals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  }, []);

  const handleOpenSwapModal = useCallback((meal: Meal) => {
    setSelectedMealForSwap(meal);
    setShowSwapModal(true);
  }, []);

  const handleMealSwapped = useCallback((newMeal: any) => {
    // Refresh the meal plan to get updated data
    loadMealPlan();
    setShowSwapModal(false);
    setSelectedMealForSwap(null);
  }, []);

  const toggleIngredientCheck = useCallback(
    async (ingredientId: string, mealId: string) => {
      const newChecked = new Set(checkedIngredients);
      const isChecked = !newChecked.has(ingredientId);

      if (isChecked) {
        newChecked.add(ingredientId);
      } else {
        newChecked.delete(ingredientId);
      }
      setCheckedIngredients(newChecked);

      try {
        await api.post(`/recommended-menus/${planId}/ingredients/${ingredientId}/check`, {
          meal_id: mealId,
          checked: isChecked,
        });
      } catch (error) {
        console.error("Error updating ingredient check:", error);
        // Revert on error
        if (isChecked) {
          newChecked.delete(ingredientId);
        } else {
          newChecked.add(ingredientId);
        }
        setCheckedIngredients(new Set(newChecked));
      }
    },
    [checkedIngredients, planId]
  );

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert(t("active_menu.please_rate"), t("active_menu.select_star_rating"));
      return;
    }

    try {
      setIsSubmittingReview(true);
      await api.post(`/recommended-menus/${planId}/review`, {
        type: reviewType,
        rating,
        feedback: feedback.trim() || null,
        reason: reviewType === "failed" ? feedback.trim() : null,
      });

      setShowReviewModal(false);
      Alert.alert(t("active_menu.thank_you"), t("active_menu.feedback_helps"), [
        { text: t("common.ok"), onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert(t("common.error"), t("active_menu.failed_to_submit"));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Calculate completion rate
  const completionRate = useMemo(() => {
    if (!mealPlan) return 0;

    let totalIngredients = 0;
    let checkedCount = 0;

    mealPlan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        totalIngredients += meal.ingredients.length;
        meal.ingredients.forEach((ing) => {
          if (checkedIngredients.has(ing.ingredient_id)) {
            checkedCount++;
          }
        });
      });
    });

    return totalIngredients > 0 ? (checkedCount / totalIngredients) * 100 : 0;
  }, [mealPlan, checkedIngredients]);

  // Calculate day progress data
  const dayProgressData: DayProgress[] = useMemo(() => {
    if (!mealPlan) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyTarget = mealPlan.daily_calorie_target || 2000;

    return mealPlan.days.map((day, index) => {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);

      // Calculate actual calories for this day
      let dayCheckedIngredients = 0;
      let dayTotalIngredients = 0;
      let caloriesActual = 0;

      day.meals.forEach((meal) => {
        dayTotalIngredients += meal.ingredients.length;
        const mealChecked = meal.ingredients.filter((ing) =>
          checkedIngredients.has(ing.ingredient_id)
        ).length;
        dayCheckedIngredients += mealChecked;

        // If meal is mostly checked, count its calories
        if (meal.ingredients.length > 0 && mealChecked / meal.ingredients.length >= 0.5) {
          caloriesActual += meal.calories;
        }
      });

      const dayProgress = dayTotalIngredients > 0
        ? (dayCheckedIngredients / dayTotalIngredients) * 100
        : 0;

      let status: DayProgress["status"] = "pending";
      if (dayDate < today) {
        status = "completed";
      } else if (dayDate.getTime() === today.getTime()) {
        status = "in_progress";
      }

      // Goal is met if within 10% of target
      const variance = Math.abs(caloriesActual - dailyTarget);
      const goalMet = status === "completed" && variance <= dailyTarget * 0.1;

      return {
        day: index + 1,
        date: day.date,
        status,
        caloriesActual,
        caloriesTarget: dailyTarget,
        goalMet,
      };
    });
  }, [mealPlan, checkedIngredients]);

  // Calculate streak
  const streak = useMemo(() => calculateStreak(dayProgressData), [dayProgressData]);

  // Calculate weekly variance
  const weeklyVariance = useMemo(() => {
    if (!dayProgressData.length) return 0;

    const completedDays = dayProgressData.filter((d) => d.status === "completed");
    if (!completedDays.length) return 0;

    const totalVariance = completedDays.reduce((sum, day) => {
      return sum + ((day.caloriesActual || 0) - (day.caloriesTarget || 2000));
    }, 0);

    return Math.round(totalVariance);
  }, [dayProgressData]);

  const currentDay = useMemo(
    () => (mealPlan ? mealPlan.days[selectedDay] : null),
    [mealPlan, selectedDay]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
            <SkeletonPulse style={[styles.skeletonHeaderTitle, { backgroundColor: colors.border }]} />
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.skeletonContent}>
            <SkeletonPulse style={[styles.skeletonSummaryCard, { backgroundColor: colors.border }]} />
            <SkeletonPulse style={[styles.skeletonDayTabs, { backgroundColor: colors.border }]} />
            {[1, 2].map((i) => (
              <SkeletonPulse key={i} style={[styles.skeletonMealCard, { backgroundColor: colors.border }]} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!mealPlan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <ChefHat size={64} color={colors.icon} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t("active_menu.no_active_menu")}
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.icon }]}>
            {t("active_menu.start_a_menu")}
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/recommended-menus")}
            style={[styles.errorButton, { backgroundColor: colors.emerald500 }]}
          >
            <Text style={styles.errorButtonText}>{t("active_menu.browse_menus")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {mealPlan.name}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Summary Card */}
        <ProgressSummaryCard
          plan={mealPlan}
          selectedDay={selectedDay}
          totalDays={mealPlan.days.length}
          completionRate={completionRate}
          streak={streak}
          weeklyVariance={weeklyVariance}
          dayProgressData={dayProgressData}
          colors={colors}
          t={t}
          onDayPress={setSelectedDay}
        />

        {/* Quick Tips Guide for new users */}
        <QuickTipsGuide />

        {/* Day Tabs */}
        <View style={[styles.dayTabsWrapper, { backgroundColor: colors.surface }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayTabsContent}
          >
            {mealPlan.days.map((day, index) => (
              <DayTab
                key={day.day}
                day={day}
                index={index}
                isSelected={selectedDay === index}
                onSelect={() => setSelectedDay(index)}
                language={language}
                colors={colors}
              />
            ))}
          </ScrollView>
        </View>

        {/* Weekly Summary Card */}
        <WeeklySummaryCard
          days={dayProgressData}
          streak={streak}
          onViewJourney={() => {
            // TODO: Navigate to journey screen when implemented
          }}
        />

        {/* Daily Tips Card */}
        <DailyTipsCard
          dayProgress={{
            caloriesActual: dayProgressData[selectedDay]?.caloriesActual || 0,
            caloriesTarget: mealPlan?.daily_calorie_target || 2000,
          }}
          streak={streak}
          completionRate={completionRate}
          compact={true}
        />

        {/* Today's Meals Section */}
        {currentDay && (
          <TodaysMealsSection
            meals={currentDay.meals}
            expandedMeals={expandedMeals}
            onToggleMeal={toggleMealExpanded}
            checkedIngredients={checkedIngredients}
            onToggleIngredient={toggleIngredientCheck}
            onSwapMeal={handleOpenSwapModal}
            colors={colors}
            t={t}
          />
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Meal Swap Modal */}
      <MealSwapModal
        visible={showSwapModal}
        onClose={() => {
          setShowSwapModal(false);
          setSelectedMealForSwap(null);
        }}
        onSwap={handleMealSwapped}
        menuId={planId as string}
        originalMeal={selectedMealForSwap ? {
          meal_id: selectedMealForSwap.meal_id,
          name: selectedMealForSwap.name,
          meal_type: selectedMealForSwap.meal_type,
          calories: selectedMealForSwap.calories,
          protein: selectedMealForSwap.protein,
          carbs: selectedMealForSwap.carbs,
          fat: selectedMealForSwap.fat,
        } : null}
      />

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.reviewModal, { backgroundColor: colors.card }]}>
            {/* Trophy Icon */}
            <View style={[styles.reviewIconContainer, { backgroundColor: colors.emerald500 + "20" }]}>
              {reviewType === "completed" ? (
                <Trophy size={40} color={colors.emerald500} />
              ) : (
                <TrendingUp size={40} color={colors.warning || "#f59e0b"} />
              )}
            </View>

            <Text style={[styles.reviewTitle, { color: colors.text }]}>
              {reviewType === "completed"
                ? t("active_menu.congratulations")
                : t("active_menu.menu_period_ended")}
            </Text>
            <Text style={[styles.reviewSubtitle, { color: colors.icon }]}>
              {reviewType === "completed"
                ? t("active_menu.completed_message")
                : t("active_menu.how_did_it_go")}
            </Text>

            {/* Star Rating */}
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)} style={styles.starButton}>
                  <Star
                    size={36}
                    color={star <= rating ? "#f59e0b" : colors.border}
                    fill={star <= rating ? "#f59e0b" : "transparent"}
                  />
                </Pressable>
              ))}
            </View>

            {/* Feedback Input */}
            <TextInput
              style={[
                styles.feedbackInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={
                reviewType === "completed"
                  ? t("active_menu.share_experience")
                  : t("active_menu.what_prevented")
              }
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={4}
              value={feedback}
              onChangeText={setFeedback}
              textAlignVertical="top"
            />

            {/* Action Button */}
            <Pressable
              onPress={submitReview}
              disabled={isSubmittingReview}
              style={[styles.submitButton, { backgroundColor: colors.emerald500 }]}
            >
              {isSubmittingReview ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>{t("active_menu.submit_review")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonHeaderTitle: {
    width: 150,
    height: 24,
    borderRadius: 8,
  },
  skeletonSummaryCard: {
    height: 280,
    borderRadius: 20,
    marginBottom: 16,
  },
  skeletonDayTabs: {
    height: 80,
    borderRadius: 16,
    marginBottom: 16,
  },
  skeletonMealCard: {
    height: 110,
    borderRadius: 18,
    marginBottom: 14,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: "700",
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  errorButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },

  // Summary Card
  summaryCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  summaryHeaderLeft: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  compactStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 14,
    paddingVertical: 8,
  },
  compactStatItem: {
    alignItems: "center",
    gap: 4,
  },
  compactStatText: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  compactStatValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  compactStatLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  varianceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  varianceChipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  progressStats: {
    flex: 1,
    alignItems: "flex-end",
    gap: 12,
    marginLeft: 20,
  },
  varianceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  varianceText: {
    fontSize: 14,
    fontWeight: "700",
  },
  varianceLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  onTrackText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dayProgressSection: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 4,
  },

  // Today's Meals
  todaysMealsSection: {
    paddingHorizontal: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },

  // Day Tabs
  dayTabsWrapper: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  dayTabsContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  dayTab: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 75,
    borderWidth: 1,
  },
  dayTabName: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayTabDate: {
    fontSize: 22,
    fontWeight: "800",
    marginVertical: 2,
  },
  dayTabMonth: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Meal Card
  mealCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  mealImageContainer: {
    marginRight: 14,
    position: "relative",
  },
  mealImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  mealImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  mealEmoji: {
    fontSize: 28,
  },
  statusBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  statusBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  mealInfo: {
    flex: 1,
    gap: 6,
  },
  mealTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mealTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealTypeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mealStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  mealName: {
    fontSize: 16,
    fontWeight: "700",
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  mealMetaText: {
    fontSize: 13,
    fontWeight: "500",
  },
  mealMetaDot: {
    fontSize: 13,
  },
  mealActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swapButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  expandIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  // Expanded Content
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 18,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  nutritionGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderRadius: 14,
  },
  nutritionItem: {
    alignItems: "center",
    flex: 1,
  },
  nutritionDivider: {
    width: 1,
    height: 28,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  nutritionLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ingredientsSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  checkedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: "auto",
  },
  checkedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  ingredientText: {
    fontSize: 14,
    flex: 1,
  },
  ingredientTextChecked: {
    textDecorationLine: "line-through",
  },
  instructionsContainer: {
    padding: 16,
    borderRadius: 14,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
  },

  // Review Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  reviewModal: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 420,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  reviewIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  reviewTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  reviewSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  feedbackInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    marginBottom: 24,
  },
  submitButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
