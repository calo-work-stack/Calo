import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
  Modal,
  Share,
  Image,
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
  ChefHat,
  Calendar,
  Clock,
  Star,
  Flame,
  Target,
  Heart,
  Share2,
  ChevronDown,
  ChevronUp,
  Utensils,
  Wallet,
  Info,
  Check,
  Sparkles,
  ShoppingCart,
  Play,
  Users,
  Timer,
  Leaf,
  TrendingUp,
  TrendingDown,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/src/services/api";
import { DietaryIcons } from "@/components/menu/DietaryIcons";
import { DaysRemainingBadge, GoalProgressRingCompact, getGoalStatus, getStatusColor } from "@/components/menu";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Ingredient {
  ingredient_id: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  estimated_cost?: number;
}

interface Meal {
  meal_id: string;
  name: string;
  meal_type: string;
  day_number: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  prep_time_minutes?: number;
  cooking_method?: string;
  instructions?: string;
  ingredients: Ingredient[];
  image_url?: string;
  dietary_tags?: string[];
}

// Helper function to calculate meal cost from ingredients
const calculateMealCost = (meal: Meal): number => {
  if (!meal.ingredients || meal.ingredients.length === 0) return 0;
  return meal.ingredients.reduce((sum, ing) => sum + (ing.estimated_cost || 0), 0);
};

interface MenuDetails {
  menu_id: string;
  title: string;
  description?: string;
  total_calories: number;
  total_protein?: number;
  total_carbs?: number;
  total_fat?: number;
  days_count: number;
  dietary_category?: string;
  estimated_cost?: number;
  prep_time_minutes?: number;
  difficulty_level?: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  meals: Meal[];
  daily_calorie_target?: number;
}

interface DayGoalInfo {
  day: number;
  caloriesActual: number;
  caloriesTarget: number;
  status: "met" | "over" | "under" | "pending";
  variance: number;
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

// ==================== STAT CARD ====================

const StatCard = React.memo(
  ({
    icon: Icon,
    value,
    label,
    color,
    bgColor,
  }: {
    icon: any;
    value: string;
    label: string;
    color: string;
    bgColor: string;
  }) => {
    const { colors } = useTheme();

    return (
      <View style={[styles.statCard, { backgroundColor: colors.card }]}>
        <View style={[styles.statIconBg, { backgroundColor: bgColor }]}>
          <Icon size={20} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.icon }]}>{label}</Text>
      </View>
    );
  }
);

// ==================== DAY SELECTOR ====================

const DaySelector = React.memo(
  ({
    days,
    selectedDay,
    onSelectDay,
    meals,
    colors,
    t,
    dayGoals,
    dailyTarget,
  }: {
    days: number[];
    selectedDay: number;
    onSelectDay: (day: number) => void;
    meals: Meal[];
    colors: any;
    t: any;
    dayGoals?: DayGoalInfo[];
    dailyTarget?: number;
  }) => {
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
      const index = days.indexOf(selectedDay);
      if (index > 0 && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: Math.max(0, (index - 1) * 85),
          animated: true,
        });
      }
    }, [selectedDay, days]);

    const getDayGoalStatus = (day: number) => {
      if (!dayGoals) return null;
      return dayGoals.find((g) => g.day === day);
    };

    const getGoalIndicatorColor = (goalInfo: DayGoalInfo | null | undefined) => {
      if (!goalInfo || goalInfo.status === "pending") return null;
      switch (goalInfo.status) {
        case "met":
          return colors.emerald500;
        case "over":
          return colors.error || "#ef4444";
        case "under":
          return colors.warning || "#f59e0b";
        default:
          return null;
      }
    };

    return (
      <View style={[styles.daySelectorWrapper, { backgroundColor: colors.surface }]}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelectorContent}
        >
          {days.map((day) => {
            const isSelected = selectedDay === day;
            const dayMeals = meals.filter((m) => m.day_number === day);
            const totalCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
            const dayCost = dayMeals.reduce((sum, m) => sum + calculateMealCost(m), 0);
            const goalInfo = getDayGoalStatus(day);
            const indicatorColor = getGoalIndicatorColor(goalInfo);

            return (
              <Pressable
                key={day}
                onPress={() => onSelectDay(day)}
                style={[
                  styles.dayTab,
                  {
                    backgroundColor: isSelected ? colors.emerald500 : colors.card,
                    borderColor: isSelected ? colors.emerald500 : colors.border,
                  },
                ]}
              >
                {/* Goal status indicator */}
                {indicatorColor && !isSelected && (
                  <View
                    style={[
                      styles.goalIndicator,
                      { backgroundColor: indicatorColor },
                    ]}
                  >
                    {goalInfo?.status === "met" && (
                      <Check size={8} color="#ffffff" strokeWidth={3} />
                    )}
                  </View>
                )}
                <Text
                  style={[
                    styles.dayTabLabel,
                    { color: isSelected ? "rgba(255,255,255,0.8)" : colors.icon },
                  ]}
                >
                  {t("menu_details.day")}
                </Text>
                <Text
                  style={[
                    styles.dayTabNumber,
                    { color: isSelected ? "#ffffff" : colors.text },
                  ]}
                >
                  {day}
                </Text>
                <Text
                  style={[
                    styles.dayTabCalories,
                    { color: isSelected ? "rgba(255,255,255,0.9)" : colors.icon },
                  ]}
                >
                  {Math.round(totalCalories)} {t("menu_details.kcal")}
                </Text>
                {dayCost > 0 && (
                  <Text
                    style={[
                      styles.dayTabCost,
                      { color: isSelected ? "rgba(255,255,255,0.8)" : colors.icon },
                    ]}
                  >
                    ₪{dayCost.toFixed(0)}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }
);

// ==================== DAY SUMMARY CARD ====================

const DaySummaryCard = React.memo(
  ({
    dayNumber,
    meals,
    dailyTarget,
    colors,
    t,
  }: {
    dayNumber: number;
    meals: Meal[];
    dailyTarget: number;
    colors: any;
    t: any;
  }) => {
    const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
    const variance = totalCalories - dailyTarget;
    const status = getGoalStatus(totalCalories, dailyTarget);
    const statusColor = getStatusColor(status, colors);

    const getStatusIcon = () => {
      switch (status) {
        case "met":
          return <Check size={16} color={statusColor} strokeWidth={3} />;
        case "over":
          return <TrendingUp size={16} color={statusColor} />;
        case "under":
          return <TrendingDown size={16} color={statusColor} />;
      }
    };

    const getStatusLabel = () => {
      switch (status) {
        case "met":
          return t("menu.goals_met", "Goal Met");
        case "over":
          return t("menu.goals_over", "Over Goal");
        case "under":
          return t("menu.goals_under", "Under Goal");
      }
    };

    return (
      <View style={[styles.daySummaryCard, { backgroundColor: colors.card }]}>
        <View style={styles.daySummaryHeader}>
          <Text style={[styles.daySummaryTitle, { color: colors.text }]}>
            {t("menu.day_summary", "Day {{day}} Summary", { day: dayNumber })}
          </Text>
        </View>
        <View style={styles.daySummaryContent}>
          <View style={styles.daySummaryRow}>
            <Text style={[styles.daySummaryLabel, { color: colors.icon }]}>
              {t("menu.goal", "Goal")}:
            </Text>
            <Text style={[styles.daySummaryValue, { color: colors.text }]}>
              {dailyTarget} {t("menu.kcal", "kcal")}
            </Text>
          </View>
          <View style={styles.daySummaryRow}>
            <Text style={[styles.daySummaryLabel, { color: colors.icon }]}>
              {t("menu.actual", "Actual")}:
            </Text>
            <View style={styles.daySummaryActual}>
              <Text style={[styles.daySummaryValue, { color: colors.text }]}>
                {Math.round(totalCalories)} {t("menu.kcal", "kcal")}
              </Text>
              <View style={[styles.varianceBadge, { backgroundColor: statusColor + "20" }]}>
                {getStatusIcon()}
                <Text style={[styles.varianceText, { color: statusColor }]}>
                  {variance > 0 ? "+" : ""}{variance}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }
);

// ==================== MEAL CARD ====================

const MealCard = React.memo(
  ({
    meal,
    isExpanded,
    onToggle,
    colors,
    t,
  }: {
    meal: Meal;
    isExpanded: boolean;
    onToggle: () => void;
    colors: any;
    t: any;
  }) => {
    const expandAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(expandAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start();
    }, [isExpanded, expandAnim]);

    const getMealTypeConfig = useCallback((type: string) => {
      const configs: Record<string, { emoji: string; color: string; label: string }> = {
        BREAKFAST: { emoji: "🌅", color: "#F59E0B", label: t("menu_details.meal_types.BREAKFAST") },
        LUNCH: { emoji: "☀️", color: "#10B981", label: t("menu_details.meal_types.LUNCH") },
        DINNER: { emoji: "🌙", color: "#6366F1", label: t("menu_details.meal_types.DINNER") },
        SNACK: { emoji: "🍎", color: "#EC4899", label: t("menu_details.meal_types.SNACK") },
        MORNING_SNACK: { emoji: "🥐", color: "#F97316", label: t("menu_details.meal_types.MORNING_SNACK") },
        AFTERNOON_SNACK: { emoji: "🍪", color: "#A855F7", label: t("menu_details.meal_types.AFTERNOON_SNACK") },
      };
      return configs[type] || { emoji: "🍽️", color: "#6B7280", label: type };
    }, [t]);

    const config = getMealTypeConfig(meal.meal_type);

    return (
      <Animated.View
        style={[
          styles.mealCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Header */}
        <Pressable onPress={onToggle} style={styles.mealHeader}>
          {/* Meal Image/Emoji */}
          <View style={styles.mealImageContainer}>
            {meal.image_url ? (
              <Image source={{ uri: meal.image_url }} style={styles.mealImage} />
            ) : (
              <View
                style={[styles.mealImagePlaceholder, { backgroundColor: config.color + "20" }]}
              >
                <Text style={styles.mealEmoji}>{config.emoji}</Text>
              </View>
            )}
          </View>

          {/* Meal Info */}
          <View style={styles.mealInfo}>
            <View style={styles.mealTypeRow}>
              <View style={[styles.mealTypeBadge, { backgroundColor: config.color }]}>
                <Text style={styles.mealTypeText}>{config.label}</Text>
              </View>
              {meal.prep_time_minutes && (
                <View style={styles.prepTimeBadge}>
                  <Timer size={12} color={colors.icon} />
                  <Text style={[styles.prepTimeText, { color: colors.icon }]}>
                    {meal.prep_time_minutes}{t("menu_details.min")}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={2}>
              {meal.name}
            </Text>

            <View style={styles.mealMetaRow}>
              <View style={styles.mealMetaItem}>
                <Flame size={14} color={colors.warning || "#f59e0b"} />
                <Text style={[styles.mealMetaText, { color: colors.icon }]}>
                  {Math.round(meal.calories)} {t("menu_details.cal")}
                </Text>
              </View>
              <View style={styles.mealMetaItem}>
                <Target size={14} color={colors.emerald500} />
                <Text style={[styles.mealMetaText, { color: colors.icon }]}>
                  {Math.round(meal.protein)}g {t("menu_details.protein")}
                </Text>
              </View>
              {calculateMealCost(meal) > 0 && (
                <View style={styles.mealMetaItem}>
                  <Wallet size={14} color="#6366f1" />
                  <Text style={[styles.mealMetaText, { color: colors.icon }]}>
                    ₪{calculateMealCost(meal).toFixed(0)}
                  </Text>
                </View>
              )}
              {meal.dietary_tags && meal.dietary_tags.length > 0 && (
                <DietaryIcons tags={meal.dietary_tags} size={14} />
              )}
            </View>
          </View>

          {/* Expand Icon */}
          <View style={[styles.expandIconBg, { backgroundColor: colors.surface }]}>
            {isExpanded ? (
              <ChevronUp size={20} color={colors.icon} />
            ) : (
              <ChevronDown size={20} color={colors.icon} />
            )}
          </View>
        </Pressable>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
            {/* Nutrition Grid */}
            <View style={styles.nutritionSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("menu_details.nutrition_facts")}
              </Text>
              <View style={[styles.nutritionGrid, { backgroundColor: colors.surface }]}>
                <View style={styles.nutritionItem}>
                  <Text style={[styles.nutritionValue, { color: colors.emerald500 }]}>
                    {Math.round(meal.calories)}
                  </Text>
                  <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                    {t("menu_details.calories")}
                  </Text>
                </View>
                <View style={[styles.nutritionDivider, { backgroundColor: colors.border }]} />
                <View style={styles.nutritionItem}>
                  <Text style={[styles.nutritionValue, { color: colors.emerald500 }]}>
                    {Math.round(meal.protein)}g
                  </Text>
                  <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                    {t("menu_details.protein")}
                  </Text>
                </View>
                <View style={[styles.nutritionDivider, { backgroundColor: colors.border }]} />
                <View style={styles.nutritionItem}>
                  <Text style={[styles.nutritionValue, { color: "#f59e0b" }]}>
                    {Math.round(meal.carbs)}g
                  </Text>
                  <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                    {t("menu_details.carbs")}
                  </Text>
                </View>
                <View style={[styles.nutritionDivider, { backgroundColor: colors.border }]} />
                <View style={styles.nutritionItem}>
                  <Text style={[styles.nutritionValue, { color: colors.error || "#ef4444" }]}>
                    {Math.round(meal.fat)}g
                  </Text>
                  <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                    {t("menu_details.fat")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Ingredients */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ShoppingCart size={18} color={colors.emerald500} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("menu_details.ingredients")}
                </Text>
                <View style={[styles.ingredientCount, { backgroundColor: colors.emerald500 + "20" }]}>
                  <Text style={[styles.ingredientCountText, { color: colors.emerald500 }]}>
                    {meal.ingredients.length}
                  </Text>
                </View>
                {calculateMealCost(meal) > 0 && (
                  <View style={[styles.mealCostBadge, { backgroundColor: "#6366f1" + "20" }]}>
                    <Wallet size={12} color="#6366f1" />
                    <Text style={[styles.mealCostText, { color: "#6366f1" }]}>
                      ₪{calculateMealCost(meal).toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
              {meal.ingredients.length === 0 ? (
                <View style={[styles.emptyIngredientsContainer, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.emptyIngredientsText, { color: colors.icon }]}>
                    {t("menu_details.ingredients")} {t("active_menu.remaining", { count: 0 })}
                  </Text>
                </View>
              ) : (
                <View style={styles.ingredientsList}>
                  {meal.ingredients.map((ingredient) => (
                    <View key={ingredient.ingredient_id} style={styles.ingredientItem}>
                      <View style={[styles.ingredientDot, { backgroundColor: colors.emerald500 }]} />
                      <Text style={[styles.ingredientText, { color: colors.text }]}>
                        <Text style={styles.ingredientQuantity}>
                          {ingredient.quantity} {ingredient.unit}
                        </Text>{" "}
                        {ingredient.name}
                      </Text>
                      {ingredient.estimated_cost && ingredient.estimated_cost > 0 && (
                        <Text style={[styles.ingredientCost, { color: colors.icon }]}>
                          ₪{ingredient.estimated_cost.toFixed(1)}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Cooking Method */}
            {meal.cooking_method && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ChefHat size={18} color={colors.emerald500} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("menu_details.cooking_method")}
                  </Text>
                </View>
                <View style={[styles.cookingMethodBadge, { backgroundColor: colors.emerald500 + "15" }]}>
                  <Text style={[styles.cookingMethodText, { color: colors.emerald500 }]}>
                    {meal.cooking_method}
                  </Text>
                </View>
              </View>
            )}

            {/* Instructions */}
            {meal.instructions && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Info size={18} color="#f59e0b" />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("menu_details.instructions")}
                  </Text>
                </View>
                <View style={[styles.instructionsContainer, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.instructionsText, { color: colors.icon }]}>
                    {meal.instructions}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    );
  }
);

// ==================== MAIN COMPONENT ====================

export default function MenuDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();

  const [menu, setMenu] = useState<MenuDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showStartModal, setShowStartModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (id) {
      loadMenuDetails();
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
    ]).start();
  }, [id]);

  const loadMenuDetails = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/recommended-menus/${id}`);

      if (response.data.success && response.data.data) {
        setMenu(response.data.data);
        setIsFavorite(response.data.data.is_active);
      }
    } catch (error) {
      console.error("Error loading menu:", error);
      Alert.alert(t("common.error"), t("menu_details.failed_to_load"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMenu = async () => {
    try {
      setIsStarting(true);
      const response = await api.post(`/recommended-menus/${id}/activate`);

      if (response.data.success) {
        setShowStartModal(false);
        Alert.alert(t("common.success"), t("menu_details.menu_activated"), [
          {
            text: t("menu_details.view_active_menu"),
            onPress: () => router.push(`/menu/activeMenu?planId=${id}`),
          },
        ]);
      }
    } catch (error) {
      console.error("Error starting menu:", error);
      Alert.alert(t("common.error"), t("menu_details.failed_to_start"));
    } finally {
      setIsStarting(false);
    }
  };

  const handleShare = async () => {
    try {
      const mealCount = menu?.meals.length || 0;
      await Share.share({
        message: t("menu_details.share_message", {
          days: menu?.days_count,
          title: menu?.title,
          mealCount,
          calories: menu?.total_calories,
          cost: menu?.estimated_cost || 0,
        }),
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const toggleMealExpanded = useCallback((mealId: string) => {
    setExpandedMeal((prev) => (prev === mealId ? null : mealId));
  }, []);

  const mealsForDay = useMemo(
    () => menu?.meals.filter((m) => m.day_number === selectedDay) || [],
    [menu, selectedDay]
  );

  const uniqueDays = useMemo(
    () => [...new Set(menu?.meals.map((m) => m.day_number) || [])].sort((a, b) => a - b),
    [menu]
  );

  // Loading state with skeleton
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
            <SkeletonPulse style={[styles.skeletonHeaderTitle, { backgroundColor: colors.border }]} />
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.skeletonContent}>
            <View style={styles.skeletonStatsRow}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonPulse
                  key={i}
                  style={[styles.skeletonStatCard, { backgroundColor: colors.border }]}
                />
              ))}
            </View>
            <SkeletonPulse style={[styles.skeletonDaySelector, { backgroundColor: colors.border }]} />
            {[1, 2].map((i) => (
              <SkeletonPulse
                key={i}
                style={[styles.skeletonMealCard, { backgroundColor: colors.border }]}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!menu) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <ChefHat size={64} color={colors.icon} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t("menu_details.menu_not_found")}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.errorButton, { backgroundColor: colors.emerald500 }]}
          >
            <Text style={styles.errorButtonText}>{t("menu_details.go_back")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const avgCalPerDay = Math.round(menu.total_calories / menu.days_count);
  const avgProteinPerDay = menu.total_protein ? Math.round(menu.total_protein / menu.days_count) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {menu.title}
          </Text>
          <View style={styles.headerBadges}>
            <View style={[styles.headerBadge, { backgroundColor: colors.surface }]}>
              <Calendar size={12} color={colors.icon} />
              <Text style={[styles.headerBadgeText, { color: colors.icon }]}>
                {menu.days_count} {t("menu_details.days")}
              </Text>
            </View>
            {menu.is_active && menu.start_date && menu.end_date && (
              <DaysRemainingBadge
                startDate={menu.start_date}
                endDate={menu.end_date}
                variant="compact"
                showIcon={true}
              />
            )}
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable onPress={handleShare} style={styles.headerIconButton}>
            <Share2 size={20} color={colors.icon} />
          </Pressable>
          <Pressable onPress={() => setIsFavorite(!isFavorite)} style={styles.headerIconButton}>
            <Heart
              size={20}
              color={isFavorite ? colors.error : colors.icon}
              fill={isFavorite ? colors.error : "transparent"}
            />
          </Pressable>
        </View>
      </View>

      {/* Stats Cards */}
      <Animated.View
        style={[
          styles.statsContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollContent}
        >
          <StatCard
            icon={Flame}
            value={`${avgCalPerDay}`}
            label={t("menu_details.avg_cal_day")}
            color="#f59e0b"
            bgColor="#fef3c7"
          />
          <StatCard
            icon={Target}
            value={`${avgProteinPerDay}g`}
            label={t("menu_details.protein_day")}
            color="#10b981"
            bgColor="#dcfce7"
          />
          <StatCard
            icon={Wallet}
            value={`₪${menu.estimated_cost || 0}`}
            label={t("menu_details.est_cost")}
            color="#6366f1"
            bgColor="#e0e7ff"
          />
          <StatCard
            icon={Timer}
            value={`${menu.prep_time_minutes || 30}${t("menu_details.min")}`}
            label={t("menu_details.avg_prep")}
            color="#ec4899"
            bgColor="#fce7f3"
          />
        </ScrollView>
      </Animated.View>

      {/* Day Selector */}
      <DaySelector
        days={uniqueDays}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        meals={menu.meals}
        colors={colors}
        t={t}
        dailyTarget={menu.daily_calorie_target || Math.round(menu.total_calories / menu.days_count)}
      />

      {/* Meals List */}
      <Animated.ScrollView
        style={[styles.mealsScrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.mealsContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Day Summary Card */}
        <DaySummaryCard
          dayNumber={selectedDay}
          meals={mealsForDay}
          dailyTarget={menu.daily_calorie_target || Math.round(menu.total_calories / menu.days_count)}
          colors={colors}
          t={t}
        />

        {mealsForDay.map((meal) => (
          <MealCard
            key={meal.meal_id}
            meal={meal}
            isExpanded={expandedMeal === meal.meal_id}
            onToggle={() => toggleMealExpanded(meal.meal_id)}
            colors={colors}
            t={t}
          />
        ))}

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Floating Action Button */}
      {!menu.is_active && (
        <View style={styles.fabContainer}>
          <Pressable
            onPress={() => setShowStartModal(true)}
            style={({ pressed }) => [
              styles.fab,
              { transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
          >
            <LinearGradient
              colors={[colors.emerald500, colors.emerald600 || colors.emerald500]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Play size={22} color="#ffffff" />
              <Text style={styles.fabText}>{t("menu_details.start_menu")}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* Start Modal */}
      <Modal
        visible={showStartModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStartModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowStartModal(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[styles.startModal, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconContainer, { backgroundColor: colors.emerald500 + "20" }]}>
                  <Sparkles size={32} color={colors.emerald500} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t("menu_details.start_this_menu")}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
                  {t("menu_details.activate_description")}
                </Text>
              </View>

              <View style={styles.modalFeatures}>
                <View style={styles.modalFeature}>
                  <Check size={20} color={colors.success || colors.emerald500} />
                  <Text style={[styles.modalFeatureText, { color: colors.text }]}>
                    {t("menu_details.track_ingredients")}
                  </Text>
                </View>
                <View style={styles.modalFeature}>
                  <Check size={20} color={colors.success || colors.emerald500} />
                  <Text style={[styles.modalFeatureText, { color: colors.text }]}>
                    {t("menu_details.daily_progress")}
                  </Text>
                </View>
                <View style={styles.modalFeature}>
                  <Check size={20} color={colors.success || colors.emerald500} />
                  <Text style={[styles.modalFeatureText, { color: colors.text }]}>
                    {t("menu_details.completion_rewards")}
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setShowStartModal(false)}
                  style={[styles.modalButton, { backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>
                    {t("menu_details.cancel")}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleStartMenu}
                  disabled={isStarting}
                  style={[styles.modalButton, styles.modalPrimaryButton, { backgroundColor: colors.emerald500 }]}
                >
                  {isStarting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Sparkles size={18} color="#ffffff" />
                      <Text style={[styles.modalButtonText, { color: "#ffffff" }]}>
                        {t("menu_details.start_now")}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
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
    padding: 20,
  },
  skeletonHeaderTitle: {
    width: 150,
    height: 24,
    borderRadius: 8,
  },
  skeletonStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  skeletonStatCard: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  skeletonDaySelector: {
    height: 80,
    borderRadius: 16,
    marginBottom: 20,
  },
  skeletonMealCard: {
    height: 120,
    borderRadius: 18,
    marginBottom: 14,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
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
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerBadges: {
    flexDirection: "row",
    gap: 8,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },

  // Stats
  statsContainer: {
    paddingVertical: 16,
  },
  statsScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    width: 105,
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    gap: 8,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },

  // Day Selector
  daySelectorWrapper: {
    paddingVertical: 12,
  },
  daySelectorContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  dayTab: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 80,
    borderWidth: 1,
  },
  dayTabLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dayTabNumber: {
    fontSize: 24,
    fontWeight: "800",
    marginVertical: 2,
  },
  dayTabCalories: {
    fontSize: 11,
    fontWeight: "600",
  },
  dayTabCost: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  goalIndicator: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },

  // Day Summary Card
  daySummaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  daySummaryHeader: {
    marginBottom: 12,
  },
  daySummaryTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  daySummaryContent: {
    gap: 8,
  },
  daySummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  daySummaryLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  daySummaryValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  daySummaryActual: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  varianceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  varianceText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Meals
  mealsScrollView: {
    flex: 1,
  },
  mealsContainer: {
    padding: 16,
    gap: 14,
  },
  mealCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },
  mealHeader: {
    flexDirection: "row",
    padding: 16,
    gap: 14,
  },
  mealImageContainer: {},
  mealImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  mealImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  mealEmoji: {
    fontSize: 28,
  },
  mealInfo: {
    flex: 1,
    gap: 8,
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
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  prepTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  prepTimeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  mealName: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  mealMetaRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  mealMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mealMetaText: {
    fontSize: 13,
    fontWeight: "600",
  },
  expandIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },

  // Expanded Content
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 20,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  nutritionSection: {
    gap: 12,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  ingredientCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ingredientCountText: {
    fontSize: 12,
    fontWeight: "700",
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderRadius: 14,
  },
  nutritionItem: {
    alignItems: "center",
    gap: 4,
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
    fontWeight: "600",
  },
  ingredientsList: {
    gap: 10,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ingredientText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  ingredientQuantity: {
    fontWeight: "700",
  },
  ingredientCost: {
    fontSize: 12,
    fontWeight: "600",
  },
  mealCostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: "auto",
  },
  mealCostText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyIngredientsContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyIngredientsText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  cookingMethodBadge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  cookingMethodText: {
    fontSize: 14,
    fontWeight: "700",
  },
  instructionsContainer: {
    padding: 16,
    borderRadius: 14,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
  },

  // FAB
  fabContainer: {
    position: "absolute",
    bottom: Platform.select({ ios: 24, android: 20 }),
    right: 20,
    left: 20,
    alignItems: "flex-end",
  },
  fab: {
    borderRadius: 28,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 28,
  },
  fabText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  startModal: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
  },
  modalHeader: {
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  modalFeatures: {
    gap: 14,
    marginBottom: 28,
  },
  modalFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalFeatureText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    minWidth: 100,
  },
  modalPrimaryButton: {
    flex: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
