import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  ArrowLeft,
  Star,
  ChefHat,
  Trophy,
  TrendingUp,
  Check,
  Pencil,
  Square,
  Flame,
  Calendar,
  Sparkles,
} from "lucide-react-native";
import { api } from "@/src/services/api";
import { ToastService } from "@/src/services/totastService";
import {
  GoalProgressRing,
  MealSwapModal,
} from "@/components/menu";
import { TimelineMealCard } from "@/components/menu/TimelineMealCard";
import { MealCompletionFlow } from "@/components/menu/MealCompletionFlow";
import { MealEditModal } from "@/components/menu/MealEditModal";
import { MenuEditModal } from "@/components/menu/MenuEditModal";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Ingredient {
  ingredient_id: string;
  name: string;
  quantity: number | string;
  unit?: string;
  category?: string;
  estimated_cost?: number;
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
  cooking_method?: string;
  is_logged?: boolean;
  is_completed?: boolean;
  is_generating?: boolean;
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
  is_generating?: boolean;
}

// ==================== MEAL TIME CONFIG ====================
const MEAL_TIME_LABELS: Record<string, string> = {
  breakfast: "7:00",
  morning_snack: "10:30",
  lunch: "12:00",
  afternoon_snack: "15:00",
  dinner: "19:00",
  snack: "10:30",
  night_snack: "21:00",
};

// Maps meal types to the hour range they belong to (start hour)
const MEAL_TYPE_HOURS: Record<string, number> = {
  breakfast: 6,
  morning_snack: 10,
  lunch: 12,
  afternoon_snack: 15,
  snack: 10,
  dinner: 18,
  night_snack: 21,
};

/** Determine which meal type is "current" based on the current hour */
function getCurrentMealType(): string {
  const hour = new Date().getHours();
  if (hour < 10) return "breakfast";
  if (hour < 12) return "morning_snack";
  if (hour < 15) return "lunch";
  if (hour < 18) return "afternoon_snack";
  if (hour < 21) return "dinner";
  return "night_snack";
}

// ==================== DAY PILL ====================
const DayPill = React.memo(
  ({
    day,
    index,
    isSelected,
    isToday,
    completedCount,
    totalCount,
    colors,
    language,
    onSelect,
  }: {
    day: DayMeals;
    index: number;
    isSelected: boolean;
    isToday: boolean;
    completedCount: number;
    totalCount: number;
    colors: any;
    language: string;
    onSelect: () => void;
  }) => {
    const dayDate = new Date(day.date);
    const dayName = dayDate.toLocaleDateString(
      language === "he" ? "he-IL" : "en-US",
      { weekday: "short" }
    );
    const dateNum = dayDate.getDate();
    const allDone = totalCount > 0 && completedCount >= totalCount;

    return (
      <Pressable onPress={onSelect} style={[
        s.dayPill,
        isSelected && { backgroundColor: colors.warmOrange },
        !isSelected && isToday && { backgroundColor: colors.warmOrange + "15", borderColor: colors.warmOrange + "50", borderWidth: 1.5 },
        !isSelected && !isToday && { backgroundColor: colors.card },
      ]}>
        <Text style={[
          s.dayPillName,
          { color: isSelected ? "rgba(255,255,255,0.8)" : colors.textSecondary },
        ]}>
          {dayName}
        </Text>
        <Text style={[
          s.dayPillDate,
          { color: isSelected ? "#fff" : isToday ? colors.warmOrange : colors.text },
        ]}>
          {dateNum}
        </Text>
        {allDone && !isSelected && (
          <View style={[s.dayPillDone, { backgroundColor: colors.success }]}>
            <Check size={7} color="#fff" strokeWidth={4} />
          </View>
        )}
      </Pressable>
    );
  }
);

// ==================== MAIN COMPONENT ====================

export default function ActiveMenu() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const router = useRouter();
  const { planId } = useLocalSearchParams();
  const { colors, isDark } = useTheme();

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

  // Meal completion flow state
  const [showCompletionFlow, setShowCompletionFlow] = useState(false);
  const [selectedMealForCompletion, setSelectedMealForCompletion] = useState<Meal | null>(null);
  const [completedMealIds, setCompletedMealIds] = useState<Set<string>>(new Set());

  // Edit modals state
  const [showMenuEditModal, setShowMenuEditModal] = useState(false);
  const [showMealEditModal, setShowMealEditModal] = useState(false);
  const [selectedMealForEdit, setSelectedMealForEdit] = useState<Meal | null>(null);

  const [isStopping, setIsStopping] = useState(false);
  const dayTabsRef = useRef<ScrollView>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ==================== DATE HELPERS ====================

  const getCurrentDayIndex = useCallback(
    (startDate: string, totalDays: number): number => {
      const startDateStr = startDate.split("T")[0];
      const [sy, sm, sd] = startDateStr.split("-").map(Number);
      const today = new Date();
      const startObj = new Date(sy, sm - 1, sd);
      const todayObj = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diff = Math.floor((todayObj.getTime() - startObj.getTime()) / 86400000);
      if (diff < 0) return 0;
      if (diff >= totalDays) return totalDays - 1;
      return diff;
    },
    []
  );

  const isDayToday = useCallback(
    (dayIndex: number): boolean => {
      if (!mealPlan?.days[dayIndex]?.date) return false;
      const dayDateStr = mealPlan.days[dayIndex].date.split("T")[0];
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      return dayDateStr === todayStr;
    },
    [mealPlan]
  );

  // ==================== DATA LOADING ====================

  useEffect(() => {
    loadMealPlan();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [planId]);

  useEffect(() => {
    if (mealPlan) {
      const currentDayIdx = getCurrentDayIndex(mealPlan.start_date, mealPlan.days.length);

      let todayDayIdx = -1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      mealPlan.days.forEach((d, i) => {
        const dayDate = new Date(d.date);
        dayDate.setHours(0, 0, 0, 0);
        if (dayDate.getTime() === today.getTime()) todayDayIdx = i;
      });

      const finalIdx = todayDayIdx >= 0 ? todayDayIdx : currentDayIdx;
      setSelectedDay(finalIdx);
      checkMenuCompletion();

      setTimeout(() => {
        dayTabsRef.current?.scrollTo({
          x: Math.max(0, finalIdx * 64 - 40),
          animated: true,
        });
      }, 300);

      // Poll if meals are still generating
      if (mealPlan.is_generating) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(() => {
          loadMealPlan(true);
        }, 5000);
      } else {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }
  }, [mealPlan?.plan_id, mealPlan?.is_generating]);

  const loadMealPlan = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
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
      if (!silent) ToastService.error(t("common.error"), t("active_menu.failed_to_load"));
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const checkMenuCompletion = () => {
    if (!mealPlan) return;
    const endDate = new Date(mealPlan.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    if (today > endDate && mealPlan.status === "active") {
      setReviewType(checkIfAllMealsCompleted() ? "completed" : "failed");
      setShowReviewModal(true);
    }
  };

  const checkIfAllMealsCompleted = () => {
    if (!mealPlan) return false;
    let total = 0, checked = 0;
    mealPlan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        total += meal.ingredients.length;
        meal.ingredients.forEach((ing) => {
          if (checkedIngredients.has(ing.ingredient_id)) checked++;
        });
      });
    });
    return total > 0 && checked / total >= 0.8;
  };

  // ==================== HANDLERS ====================

  const toggleMealExpanded = useCallback((mealId: string) => {
    setExpandedMeals((prev) => {
      const s = new Set(prev);
      s.has(mealId) ? s.delete(mealId) : s.add(mealId);
      return s;
    });
  }, []);

  const handleOpenSwapModal = useCallback((meal: Meal) => {
    setSelectedMealForSwap(meal);
    setShowSwapModal(true);
  }, []);

  const handleMealSwapped = useCallback(() => {
    loadMealPlan();
    setShowSwapModal(false);
    setSelectedMealForSwap(null);
    ToastService.success(t("menu.meal_swapped", "Meal Swapped"), t("menu.meal_swapped_desc", "Your meal has been updated successfully"));
  }, [t]);

  const handleOpenCompletionFlow = useCallback((meal: Meal) => {
    setSelectedMealForCompletion(meal);
    setShowCompletionFlow(true);
  }, []);

  const handleMealCompleted = useCallback((mealId: string) => {
    setCompletedMealIds((prev) => new Set([...prev, mealId]));
    loadMealPlan();
  }, []);

  const handleOpenMealEdit = useCallback((meal: Meal) => {
    setSelectedMealForEdit(meal);
    setShowMealEditModal(true);
  }, []);

  const handleStopMenu = useCallback(async () => {
    setIsStopping(true);
    try {
      await api.post(`/recommended-menus/${planId}/stop`);
      ToastService.success(t("menu_crud.menu_stopped", "Menu Stopped"), "");
      router.back();
    } catch {
      ToastService.error(t("common.error"), "");
    } finally {
      setIsStopping(false);
    }
  }, [planId, t, router]);

  const toggleIngredientCheck = useCallback(
    async (ingredientId: string, mealId: string) => {
      const wasChecked = checkedIngredients.has(ingredientId);
      const isNowChecked = !wasChecked;

      setCheckedIngredients((prev) => {
        const s = new Set(prev);
        isNowChecked ? s.add(ingredientId) : s.delete(ingredientId);
        return s;
      });

      try {
        await api.post(`/recommended-menus/${planId}/ingredients/${ingredientId}/check`, {
          meal_id: mealId,
          checked: isNowChecked,
        });
      } catch {
        setCheckedIngredients((prev) => {
          const s = new Set(prev);
          isNowChecked ? s.delete(ingredientId) : s.add(ingredientId);
          return s;
        });
      }
    },
    [checkedIngredients, planId]
  );

  const submitReview = async () => {
    if (rating === 0) return;
    try {
      setIsSubmittingReview(true);
      await api.post(`/recommended-menus/${planId}/review`, {
        type: reviewType,
        rating,
        feedback: feedback.trim() || null,
      });
      setShowReviewModal(false);
      router.back();
    } catch {
      ToastService.error(t("common.error"), "");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // ==================== COMPUTED ====================

  const currentDay = useMemo(
    () => (mealPlan ? mealPlan.days[selectedDay] : null),
    [mealPlan, selectedDay]
  );

  const targetCalories = mealPlan?.daily_calorie_target || 2000;

  // Consumed = only completed meals, Planned = all meals for the day
  const { consumedCalories, plannedCalories, completedToday, totalToday } = useMemo(() => {
    if (!currentDay) return { consumedCalories: 0, plannedCalories: 0, completedToday: 0, totalToday: 0 };
    let consumed = 0;
    let planned = 0;
    let completed = 0;
    for (const m of currentDay.meals) {
      planned += m.calories || 0;
      const isDone = m.is_completed || m.is_logged || completedMealIds.has(m.meal_id);
      if (isDone) {
        consumed += m.calories || 0;
        completed++;
      }
    }
    return { consumedCalories: consumed, plannedCalories: planned, completedToday: completed, totalToday: currentDay.meals.length };
  }, [currentDay, completedMealIds]);

  const dayProgress = useMemo(() => {
    if (!mealPlan) return new Map<number, { completed: number; total: number }>();
    const map = new Map<number, { completed: number; total: number }>();
    mealPlan.days.forEach((day, idx) => {
      const total = day.meals.length;
      const completed = day.meals.filter(
        (m) => m.is_completed || m.is_logged || completedMealIds.has(m.meal_id)
      ).length;
      map.set(idx, { completed, total });
    });
    return map;
  }, [mealPlan, completedMealIds]);

  // Days remaining
  const daysRemaining = useMemo(() => {
    if (!mealPlan) return 0;
    const end = new Date(mealPlan.end_date);
    const today = new Date();
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
  }, [mealPlan]);

  // ==================== LOADING ====================

  if (isLoading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.loadingCenter}>
          <ActivityIndicator size="large" color={colors.warmOrange} />
        </View>
      </SafeAreaView>
    );
  }

  if (!mealPlan) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.loadingCenter}>
          <View style={[s.emptyIcon, { backgroundColor: colors.warmOrange + "15" }]}>
            <ChefHat size={48} color={colors.warmOrange} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>
            {t("active_menu.no_active_menu")}
          </Text>
          <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
            {t("active_menu.no_menu_desc", "Create a personalized menu to get started")}
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/recommended-menus")}
            style={s.emptyBtnWrap}
          >
            <LinearGradient
              colors={[colors.warmOrange, "#D97706"]}
              style={s.emptyBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Sparkles size={18} color="#fff" />
              <Text style={s.emptyBtnText}>{t("active_menu.browse_menus")}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== RENDER ====================

  // Determine current meal based on time of day
  const currentMealType = getCurrentMealType();
  const currentHour = new Date().getHours();
  const isToday = isDayToday(selectedDay);

  const getMealStatus = (meal: Meal): "completed" | "current" | "upcoming" => {
    if (meal.is_completed || meal.is_logged || completedMealIds.has(meal.meal_id)) return "completed";
    if (!isToday) return "upcoming";

    const mealType = meal.meal_type.toLowerCase();
    const mealHour = MEAL_TYPE_HOURS[mealType] ?? 12;

    // Current = the meal whose time window matches the current hour
    if (mealType === currentMealType) return "current";

    // If the exact matching type isn't in today's meals, pick the closest upcoming
    if (mealHour > currentHour) return "upcoming";

    // Meal's time has passed but it's not completed
    return "upcoming";
  };

  // If no meal matches the exact current type, mark the first non-completed upcoming one as current
  const meals = currentDay?.meals || [];
  const hasExactMatch = meals.some(
    (m) => m.meal_type.toLowerCase() === currentMealType &&
           !m.is_completed && !m.is_logged && !completedMealIds.has(m.meal_id)
  );
  let fallbackCurrentFound = false;
  const getMealStatusFinal = (meal: Meal): "completed" | "current" | "upcoming" => {
    const base = getMealStatus(meal);
    if (hasExactMatch) return base;
    // No exact match - use first non-completed meal as current
    if (base === "upcoming" && !fallbackCurrentFound) {
      fallbackCurrentFound = true;
      return "current";
    }
    return base;
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* ===== HEADER ===== */}
      <View style={[s.header, { backgroundColor: isDark ? colors.surface : colors.card, borderBottomColor: colors.border + "40" }]}>
        <Pressable onPress={() => router.push("/(tabs)")} hitSlop={8} style={s.headerBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {mealPlan.name}
          </Text>
          <View style={s.headerMeta}>
            <Calendar size={11} color={colors.textSecondary} />
            <Text style={[s.headerMetaText, { color: colors.textSecondary }]}>
              {daysRemaining > 0
                ? t("menu.days_remaining", "{{count}} days left", { count: daysRemaining })
                : t("menu.last_day", "Last day")}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => setShowMenuEditModal(true)} hitSlop={8} style={[s.headerBtn, { backgroundColor: isDark ? colors.background : "#F3F4F6" }]}>
          <Pencil size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* ===== HERO CARD ===== */}
        <LinearGradient
          colors={isDark ? [colors.surface, colors.card] : ["#FFF7ED", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          {/* Top accent line */}
          <LinearGradient
            colors={[colors.warmOrange, "#D97706"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.heroAccent}
          />

          <View style={s.heroRow}>
            {/* Calorie ring */}
            <View style={s.heroRing}>
              <GoalProgressRing
                actual={consumedCalories}
                target={targetCalories}
                size={76}
                strokeWidth={7}
                showVariance={false}
              />
              <Text style={[s.heroRingLabel, { color: colors.textSecondary }]}>
                {t("menu.eaten_label", "eaten")}
              </Text>
            </View>

            {/* Stats */}
            <View style={s.heroStats}>
              <View style={s.heroStatBlock}>
                <View style={s.heroStatRow}>
                  <Flame size={15} color={colors.warmOrange} />
                  <Text style={[s.heroStatValue, { color: colors.text }]}>
                    {Math.round(consumedCalories)}
                  </Text>
                  <Text style={[s.heroStatUnit, { color: colors.textSecondary }]}>
                    / {targetCalories}
                  </Text>
                </View>
                <Text style={[s.heroStatLabel, { color: colors.textSecondary }]}>
                  {t("menu.calories_consumed", "calories consumed")}
                </Text>
              </View>

              <View style={[s.heroStatDivider, { backgroundColor: colors.border + "30" }]} />

              <View style={s.heroStatBlock}>
                <View style={s.heroStatRow}>
                  <Check size={15} color={colors.success} />
                  <Text style={[s.heroStatValue, { color: colors.text }]}>
                    {completedToday}
                  </Text>
                  <Text style={[s.heroStatUnit, { color: colors.textSecondary }]}>
                    / {totalToday}
                  </Text>
                </View>
                <Text style={[s.heroStatLabel, { color: colors.textSecondary }]}>
                  {t("menu.meals_done", "meals completed")}
                </Text>
              </View>
            </View>
          </View>

          {/* Planned calories info */}
          {plannedCalories > 0 && consumedCalories < plannedCalories && (
            <View style={[s.heroPlannedRow, { backgroundColor: colors.warmOrange + "08", borderColor: colors.warmOrange + "15" }]}>
              <Sparkles size={12} color={colors.warmOrange} />
              <Text style={[s.heroPlannedText, { color: colors.warmOrange }]}>
                {Math.round(plannedCalories)} kcal {t("menu.planned_today", "planned today")}
              </Text>
            </View>
          )}

          {/* Progress bar */}
          <View style={[s.heroProgressBg, { backgroundColor: colors.border + "20" }]}>
            <LinearGradient
              colors={[colors.warmOrange, "#D97706"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.heroProgressFill, { width: `${totalToday > 0 ? Math.min((completedToday / totalToday) * 100, 100) : 0}%` as any }]}
            />
          </View>
        </LinearGradient>

        {/* ===== DAY PILLS ===== */}
        <ScrollView
          ref={dayTabsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.dayPillsRow}
        >
          {mealPlan.days.map((day, index) => {
            const prog = dayProgress.get(index) || { completed: 0, total: 0 };
            return (
              <DayPill
                key={day.day}
                day={day}
                index={index}
                isSelected={selectedDay === index}
                isToday={isDayToday(index)}
                completedCount={prog.completed}
                totalCount={prog.total}
                colors={colors}
                language={language}
                onSelect={() => setSelectedDay(index)}
              />
            );
          })}
        </ScrollView>

        {/* ===== DAY SECTION LABEL ===== */}
        <View style={s.dayLabelRow}>
          <View>
            <Text style={[s.dayLabel, { color: colors.text }]}>
              {isDayToday(selectedDay)
                ? t("menu.today", "Today")
                : t("menu.day_n", "Day {{n}}", { n: selectedDay + 1 })}
            </Text>
            <Text style={[s.daySubLabel, { color: colors.textSecondary }]}>
              {currentDay
                ? new Date(currentDay.date).toLocaleDateString(
                    language === "he" ? "he-IL" : "en-US",
                    { weekday: "long", month: "short", day: "numeric" }
                  )
                : ""}
            </Text>
          </View>
          <View style={[s.mealCountBadge, { backgroundColor: colors.warmOrange + "12" }]}>
            <Text style={[s.mealCountText, { color: colors.warmOrange }]}>
              {currentDay?.meals.length || 0} {t("menu.meals_label", "meals")}
            </Text>
          </View>
        </View>

        {/* ===== GENERATING BANNER ===== */}
        {mealPlan.is_generating && (
          <View style={[s.generatingBanner, { backgroundColor: colors.warmOrange + "10", borderColor: colors.warmOrange + "25" }]}>
            <Sparkles size={16} color={colors.warmOrange} />
            <View style={{ flex: 1 }}>
              <Text style={[s.generatingBannerTitle, { color: colors.warmOrange }]}>
                {t("active_menu.ai_creating", "AI is creating your recipes")}
              </Text>
              <Text style={[s.generatingBannerDesc, { color: colors.textSecondary }]}>
                {t("active_menu.ai_creating_desc", "Meals will appear as they're ready. This usually takes a minute.")}
              </Text>
            </View>
          </View>
        )}

        {/* ===== TIMELINE MEALS ===== */}
        {currentDay?.meals.map((meal) => {
          const status = getMealStatusFinal(meal);
          return (
            <TimelineMealCard
              key={meal.meal_id}
              meal={{
                ...meal,
                is_completed: meal.is_completed || meal.is_logged || completedMealIds.has(meal.meal_id),
              }}
              status={status}
              timeLabel={MEAL_TIME_LABELS[meal.meal_type.toLowerCase()] || "12:00"}
              isExpanded={expandedMeals.has(meal.meal_id)}
              onToggle={() => toggleMealExpanded(meal.meal_id)}
              onComplete={() => handleOpenCompletionFlow(meal)}
              onSwap={() => handleOpenSwapModal(meal)}
              onEdit={() => handleOpenMealEdit(meal)}
              checkedIngredients={checkedIngredients}
              onToggleIngredient={toggleIngredientCheck}
            />
          );
        })}

        {/* ===== STOP BUTTON ===== */}
        <Pressable
          onPress={handleStopMenu}
          disabled={isStopping}
          style={[s.stopBtn, { borderColor: colors.error + "20", backgroundColor: colors.error + "06" }]}
        >
          {isStopping ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Square size={14} color={colors.error} />
              <Text style={[s.stopBtnText, { color: colors.error }]}>
                {t("menu_crud.stop_menu")}
              </Text>
            </>
          )}
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===== MODALS ===== */}
      <MealCompletionFlow
        visible={showCompletionFlow}
        meal={
          selectedMealForCompletion
            ? {
                meal_id: selectedMealForCompletion.meal_id,
                name: selectedMealForCompletion.name,
                meal_type: selectedMealForCompletion.meal_type,
                calories: selectedMealForCompletion.calories,
                protein: selectedMealForCompletion.protein,
                carbs: selectedMealForCompletion.carbs,
                fat: selectedMealForCompletion.fat,
                ingredients: selectedMealForCompletion.ingredients,
                day_number: currentDay?.day,
                cooking_method: selectedMealForCompletion.cooking_method,
                image_url: selectedMealForCompletion.image_url,
              }
            : null
        }
        menuId={planId as string}
        onClose={() => {
          setShowCompletionFlow(false);
          setSelectedMealForCompletion(null);
        }}
        onComplete={handleMealCompleted}
      />

      <MenuEditModal
        visible={showMenuEditModal}
        menuId={planId as string}
        initialTitle={mealPlan.name}
        initialDescription=""
        onClose={() => setShowMenuEditModal(false)}
        onSaved={() => loadMealPlan()}
        onDeleted={() => router.back()}
      />

      {selectedMealForEdit && (
        <MealEditModal
          visible={showMealEditModal}
          menuId={planId as string}
          mealId={selectedMealForEdit.meal_id}
          initialData={{
            name: selectedMealForEdit.name,
            calories: selectedMealForEdit.calories,
            protein: selectedMealForEdit.protein,
            carbs: selectedMealForEdit.carbs,
            fat: selectedMealForEdit.fat,
            instructions: selectedMealForEdit.instructions || "",
            ingredients: selectedMealForEdit.ingredients.map((i) => ({
              name: i.name,
              quantity: parseFloat(String(i.quantity)) || 1,
              unit: i.unit || "piece",
            })),
          }}
          onClose={() => {
            setShowMealEditModal(false);
            setSelectedMealForEdit(null);
          }}
          onSaved={() => loadMealPlan()}
          onDeleted={() => loadMealPlan()}
        />
      )}

      <MealSwapModal
        visible={showSwapModal}
        onClose={() => {
          setShowSwapModal(false);
          setSelectedMealForSwap(null);
        }}
        onSwap={handleMealSwapped}
        menuId={planId as string}
        language={language}
        originalMeal={
          selectedMealForSwap
            ? {
                meal_id: selectedMealForSwap.meal_id,
                name: selectedMealForSwap.name,
                meal_type: selectedMealForSwap.meal_type,
                calories: selectedMealForSwap.calories,
                protein: selectedMealForSwap.protein,
                carbs: selectedMealForSwap.carbs,
                fat: selectedMealForSwap.fat,
              }
            : null
        }
      />

      {/* Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={s.reviewOverlay}>
          <View style={[s.reviewCard, { backgroundColor: colors.card }]}>
            <View style={[s.reviewIcon, { backgroundColor: colors.warmOrange + "15" }]}>
              {reviewType === "completed" ? (
                <Trophy size={36} color={colors.warmOrange} />
              ) : (
                <TrendingUp size={36} color={colors.warmOrange} />
              )}
            </View>
            <Text style={[s.reviewTitle, { color: colors.text }]}>
              {reviewType === "completed"
                ? t("active_menu.congratulations")
                : t("active_menu.menu_period_ended")}
            </Text>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)} style={s.starBtn}>
                  <Star
                    size={32}
                    color={star <= rating ? "#F59E0B" : colors.border}
                    fill={star <= rating ? "#F59E0B" : "transparent"}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[s.reviewInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder={t("active_menu.share_experience")}
              placeholderTextColor={colors.textSecondary}
              multiline
              value={feedback}
              onChangeText={setFeedback}
              textAlignVertical="top"
            />
            <Pressable
              onPress={submitReview}
              disabled={isSubmittingReview}
              style={s.reviewSubmitWrap}
            >
              <LinearGradient
                colors={[colors.warmOrange, "#D97706"]}
                style={s.reviewSubmit}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.reviewSubmitText}>{t("active_menu.submit_review")}</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const s = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 32 },
  emptyIcon: { width: 96, height: 96, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 14, fontWeight: "500", textAlign: "center" },
  emptyBtnWrap: { marginTop: 12, borderRadius: 16, overflow: "hidden" },
  emptyBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 28, paddingVertical: 14, gap: 8 },
  emptyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  headerMetaText: { fontSize: 12, fontWeight: "500" },

  scrollContent: { paddingTop: 16, paddingBottom: 20 },

  // Hero card
  heroCard: {
    marginHorizontal: 20,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  heroAccent: {
    height: 3,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    padding: 18,
    paddingBottom: 14,
  },
  heroRing: {
    alignItems: "center",
  },
  heroRingLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  heroStats: { flex: 1, gap: 10 },
  heroStatBlock: { gap: 1 },
  heroStatRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  heroStatValue: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  heroStatUnit: { fontSize: 13, fontWeight: "600" },
  heroStatLabel: { fontSize: 11, fontWeight: "500", marginLeft: 20 },
  heroStatDivider: { height: 1, marginVertical: 2 },
  heroPlannedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 18,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  heroPlannedText: { fontSize: 12, fontWeight: "700" },
  heroProgressBg: { height: 4, marginHorizontal: 18, marginBottom: 18, borderRadius: 2, overflow: "hidden" },
  heroProgressFill: { height: "100%", borderRadius: 2 },

  // Day pills
  dayPillsRow: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 16,
  },
  dayPill: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    minWidth: 52,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  dayPillName: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  dayPillDate: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  dayPillDone: { width: 12, height: 12, borderRadius: 6, justifyContent: "center", alignItems: "center", marginTop: 4 },

  // Day label
  dayLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  dayLabel: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  daySubLabel: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  mealCountBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  mealCountText: { fontSize: 12, fontWeight: "700" },

  // Generating banner
  generatingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  generatingBannerTitle: { fontSize: 14, fontWeight: "700" },
  generatingBannerDesc: { fontSize: 12, fontWeight: "500", marginTop: 2, lineHeight: 17 },

  // Stop button
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  stopBtnText: { fontSize: 14, fontWeight: "700" },

  // Review modal
  reviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  reviewCard: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 380,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
  },
  reviewIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  reviewTitle: { fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 20, letterSpacing: -0.3 },
  starsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  starBtn: { padding: 4 },
  reviewInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    marginBottom: 20,
  },
  reviewSubmitWrap: { width: "100%", borderRadius: 16, overflow: "hidden" },
  reviewSubmit: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
  },
  reviewSubmitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
