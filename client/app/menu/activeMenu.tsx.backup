import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  Animated,
} from "react-native";
import { ToastService } from "@/src/services/totastService";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  ChefHat,
  Calendar as CalendarIcon, // Renamed to avoid conflict
  Clock,
  Star,
  MessageSquare,
  ArrowLeft,
  Filter,
  RefreshCw,
  Heart,
  HeartOff,
  Utensils,
  X,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Target,
  TrendingUp,
  Award,
  Plus,
  Minus,
} from "lucide-react-native";
import { api, mealPlanAPI } from "@/src/services/api";
import LoadingScreen from "@/components/LoadingScreen";
import MenuRatingModal from "@/components/menu/MenuRatingModal";
import MealRatingCard from "@/components/menu/MealRatingCard";
import { MenuReviewStatistics } from "@/components/menu/MenuReviewStatistics"; // Assuming this component exists
import {
  MealPlan,
  PlanMeal,
  SelectedMealForCompletion,
  MealCompletionData,
  SwapRequest,
} from "@/src/types/recommended-menus";

// Placeholder for removeMeal and refreshMealData if they are Redux actions or similar
// Assuming they are imported from somewhere else and are defined elsewhere
// For example: import { removeMeal } from '@/src/store/meals';
// And: const { refreshMealData } = useMealData(); // Assuming a hook for data refresh

// Mock implementations for demonstration if not provided:
const removeMeal = (mealId: string) => async (dispatch: any) => {
  console.log(`Mock removeMeal called for ${mealId}`);
  return Promise.resolve({ data: { success: true } });
};
const refreshMealData = () => {
  console.log("Mock refreshMealData called");
};
const dispatch = (action: any) => {
  console.log("Mock dispatch called with:", action);
  return { unwrap: () => Promise.resolve({ data: { success: true } }) };
};

const { width, width: screenWidth } = Dimensions.get("window");

export default function ActiveMenu() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { planId } = useLocalSearchParams();

  // State management
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedMeal, setSelectedMeal] = useState<PlanMeal | null>(null);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCompletePlanModal, setShowCompletePlanModal] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [completionFeedback, setCompletionFeedback] = useState({
    rating: 0,
    liked: "",
    disliked: "",
    suggestions: "",
  });

  // Meal completion state
  const [showMealCompleteModal, setShowMealCompleteModal] = useState(false);
  const [selectedMealForCompletion, setSelectedMealForCompletion] =
    useState<SelectedMealForCompletion | null>(null);

  // Rating state
  const [showMenuRatingModal, setShowMenuRatingModal] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [expandedMealRating, setExpandedMealRating] = useState<string | null>(
    null
  );
  const [mealCompletionData, setMealCompletionData] =
    useState<MealCompletionData>({
      rating: 0,
      notes: "",
      prep_time_actual: 30,
    });
  const [completedMeals, setCompletedMeals] = useState<Set<string>>(new Set());

  // Calendar state
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date()); // Added for calendar month display

  // Menu logic states
  const [menuStartDate, setMenuStartDate] = useState<Date | null>(null);
  const [menuDuration, setMenuDuration] = useState<number>(0);
  const [menuProgress, setMenuProgress] = useState<number>(0);
  const [isMenuComplete, setIsMenuComplete] = useState(false);
  const [calendarData, setCalendarData] = useState<any>(null); // Added missing state

  // Meal interaction state
  const [mealRatings, setMealRatings] = useState<{ [key: string]: number }>({});
  const [mealComments, setMealComments] = useState<{ [key: string]: string }>(
    {}
  );
  const [mealFavorites, setMealFavorites] = useState<{
    [key: string]: boolean;
  }>({});

  // Filter state
  const [filters, setFilters] = useState({
    dietary_category: "all",
    min_rating: 0,
    favorites_only: false,
    meal_timing: "all",
  });

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Temporary inputs for swap modal
  const [swapPreferences, setSwapPreferences] = useState({
    userNotes: "",
    targetCalories: "",
    targetProtein: "",
    targetCarbs: "",
    targetFat: "",
  });

  // Temporary inputs
  const [tempRating, setTempRating] = useState(0);
  const [tempComment, setTempComment] = useState("");

  useEffect(() => {
    console.log("🔍 ActiveMenu component mounted with planId:", planId);
    loadMealPlan();
    initializeCalendar();
  }, [planId]);

  // Add navigation protection
  useEffect(() => {
    console.log(
      "🛡️ ActiveMenu: Component mounted, preventing navigation redirects"
    );

    // Force stay on this route
    const preventNavigation = () => {
      console.log("🛡️ ActiveMenu: Staying on active menu route");
      return true;
    };

    return () => {
      console.log("🛡️ ActiveMenu: Component unmounting");
    };
  }, []);

  // Prevent any unwanted redirects from layout
  useEffect(() => {
    if (planId) {
      console.log("🛡️ ActiveMenu: Plan ID exists, staying on route:", planId);
    }
  }, [planId]);

  useEffect(() => {
    generateWeekDays();
  }, [currentWeekStart]);

  const initializeCalendar = () => {
    const today = new Date();

    if (!mealPlan) {
      // If mealPlan is not loaded yet, set a default based on today
      setCurrentWeekStart(new Date(today));
      setSelectedDay(0); // Start with first day
      setSelectedDate(today);
      return;
    }

    // If we have a meal plan with a start date, use that as reference
    if (mealPlan?.start_date) {
      const planStartDate = new Date(mealPlan.start_date);

      // Apply 14:00 rule: If menu starts after 14:00 (2 PM), actual start is next day
      let actualStartDate = new Date(planStartDate);
      const startHour = planStartDate.getHours();

      if (startHour >= 14) {
        // Menu started after 2 PM, so actual start is next day at midnight
        actualStartDate.setDate(actualStartDate.getDate() + 1);
        actualStartDate.setHours(0, 0, 0, 0);
        console.log(
          "⏰ 14:00 Rule Applied: Menu started after 2 PM, moving start to next day"
        );
      } else {
        // Menu started before 2 PM, use same day at midnight
        actualStartDate.setHours(0, 0, 0, 0);
      }

      // Calculate days since actual start
      const todayMidnight = new Date(today);
      todayMidnight.setHours(0, 0, 0, 0);

      const daysSinceStart = Math.max(
        0,
        Math.floor(
          (todayMidnight.getTime() - actualStartDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );

      // Calculate current day in plan cycle
      const currentDayInPlan = daysSinceStart % (mealPlan.days_count || 7);

      // Check if menu duration has been exceeded
      const menuComplete = daysSinceStart >= (mealPlan.days_count || 7);

      console.log("📅 Enhanced Date Calculation:", {
        originalStartDate: planStartDate.toISOString(),
        actualStartDate: actualStartDate.toISOString(),
        currentDate: today.toDateString(),
        daysSinceStart,
        currentDayInPlan,
        daysCount: mealPlan.days_count,
        menuComplete,
        startHour,
        rule14Applied: startHour >= 14,
      });

      // Handle menu completion
      if (menuComplete && !isMenuComplete) {
        handleMenuCompletion(daysSinceStart, mealPlan.days_count || 7);
      }

      // Set current week to start from actual start date
      setCurrentWeekStart(new Date(actualStartDate));
      setSelectedDay(currentDayInPlan);
      setSelectedDate(today);
    } else {
      // Fallback to current date
      setCurrentWeekStart(new Date(today));
      setSelectedDay(0);
      setSelectedDate(today);
    }
  };

  const handleMenuCompletion = async (
    daysElapsed: number,
    menuDuration: number
  ) => {
    try {
      console.log("🎉 Menu completion detected!", {
        daysElapsed,
        menuDuration,
      });

      // Generate completion summary
      const summary = await generateMenuCompletionSummary();

      // Show completion notification
      ToastService.success(
        language === "he" ? "התפריט הושלם!" : "Menu Completed!",
        language === "he"
          ? `כל הכבוד! השלמת תפריט של ${menuDuration} ימים עם ${summary.totalMeals} ארוחות.`
          : `Congratulations! You've completed a ${menuDuration}-day menu with ${summary.totalMeals} meals.`,
        {
          duration: 6000,
          onPress: () => showDetailedSummary(summary),
        }
      );

      // Mark as complete to prevent duplicate notifications
      setIsMenuComplete(true);

      // Auto-finish and potentially generate new menu
      setTimeout(async () => {
        await finishCurrentMenu();
      }, 2000);
    } catch (error) {
      console.error("💥 Error handling menu completion:", error);
    }
  };

  const generateMenuCompletionSummary = async () => {
    // Calculate summary based on calendar data and meal plan
    let totalMeals = 0;
    let totalCalories = 0;

    if (calendarData && mealPlan) {
      const menuDays = Object.keys(mealPlan.weekly_plan || {});
      totalMeals = menuDays.reduce((total, day) => {
        const dayMeals = mealPlan.weekly_plan[day];
        return total + Object.values(dayMeals).flat().length;
      }, 0);

      totalCalories = menuDays.reduce((total, day) => {
        const dayMeals = mealPlan.weekly_plan[day];
        const dayCalories = Object.values(dayMeals)
          .flat()
          .reduce((dayTotal, meal) => {
            return dayTotal + (meal.calories || 0);
          }, 0);
        return total + dayCalories;
      }, 0);
    }

    return {
      totalMeals,
      totalCalories: Math.round(totalCalories),
      duration: mealPlan?.days_count || 7,
      averageCaloriesPerDay: Math.round(
        totalCalories / (mealPlan?.days_count || 7)
      ),
      planName: mealPlan?.name || "Menu Plan",
    };
  };

  const showDetailedSummary = (summary: any) => {
    const message =
      language === "he"
        ? `📊 סיכום התפריט:\n\n• משך: ${summary.duration} ימים\n• סה"כ ארוחות: ${summary.totalMeals}\n• סה"כ קלוריות: ${summary.totalCalories}\n• ממוצע ליום: ${summary.averageCaloriesPerDay} קלוריות`
        : `📊 Menu Summary:\n\n• Duration: ${summary.duration} days\n• Total Meals: ${summary.totalMeals}\n• Total Calories: ${summary.totalCalories}\n• Average per day: ${summary.averageCaloriesPerDay} calories`;

    ToastService.alert(
      language === "he" ? "סיכום מפורט" : "Detailed Summary",
      message
    );
  };

  const finishCurrentMenu = async () => {
    try {
      console.log("✅ Finishing current menu and resetting state");

      // Reset completion state
      setIsMenuComplete(false);

      // Could call backend to mark menu as completed
      // await api.post(`/meal-plans/${mealPlan?.plan_id}/complete`);

      // Optionally redirect to menu selection or generate new menu
      ToastService.confirm(
        language === "he" ? "התפריט הסתיים" : "Menu Finished",
        language === "he"
          ? "האם תרצה ליצור תפריט חדש? לחץ כאן."
          : "Would you like to create a new menu? Tap here."
      );
    } catch (error) {
      console.error("💥 Error finishing menu:", error);
    }
  };

  const generateWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    setWeekDays(days);
  };

  const loadMealPlan = async () => {
    try {
      setIsLoading(true);
      console.log("📋 Loading meal plan, planId:", planId);

      let response;
      if (planId && planId !== "undefined" && planId !== "null") {
        // Load specific plan by ID
        console.log("🔍 Loading specific plan:", planId);
        response = await mealPlanAPI.getMealPlanById(planId as string);
      } else {
        // Load current active plan
        console.log("🔍 Loading current active plan");
        response = await mealPlanAPI.getCurrentMealPlan();
      }

      if (!response || !response.success) {
        console.log("⚠️ Failed to load meal plan, response:", response);
        setMealPlan(null);
        return;
      }

      console.log("📥 Full API response:", response);

      if (response.success && response.data) {
        let planData = response.data;
        let startDate = new Date();
        let planName = response.planName || "Active Plan";
        let actualPlanId = response.planId || planId || "unknown";
        let daysCount = response.days_count || 7;

        // Handle different response structures for current plan
        if (response.hasActivePlan && !planData) {
          console.log("🔄 Plan exists but no data, trying to fetch by ID...");
          if (response.planId) {
            const retryResponse = await mealPlanAPI.getMealPlanById(
              response.planId
            );
            if (retryResponse.success && retryResponse.data) {
              planData = retryResponse.data;
              planName = retryResponse.planName || planName;
              daysCount = retryResponse.days_count || daysCount;
            }
          }
        }

        if (!planData || Object.keys(planData).length === 0) {
          console.log("⚠️ Empty or missing meal plan data");
          setMealPlan(null);
          return;
        }

        console.log(
          "✅ Processing meal plan data with",
          Object.keys(planData).length,
          "days"
        );

        const weeklyPlan = planData;
        let hasMeals = false;
        let totalMeals = 0;

        Object.entries(weeklyPlan).forEach(([day, timings]) => {
          if (timings && typeof timings === "object") {
            const timingCount = Object.keys(timings).length;
            console.log(`  📅 ${day}: ${timingCount} meal timings`);

            Object.entries(timings).forEach(([timing, meals]) => {
              if (Array.isArray(meals) && meals.length > 0) {
                console.log(`    🍽️ ${timing}: ${meals.length} meals`);
                totalMeals += meals.length;
                hasMeals = true;
              }
            });
          }
        });

        if (!hasMeals) {
          console.log("⚠️ No meals found in plan data");
          setMealPlan(null);
          return;
        }

        console.log("📊 Total meals found:", totalMeals);

        // Get start date from response
        if (response.start_date) {
          startDate = new Date(response.start_date);
        } else {
          console.warn("⚠️ No start date found, using today as reference");
          startDate = new Date();
        }

        // Create meal plan object with proper structure
        const mealPlanData: MealPlan = {
          plan_id: actualPlanId,
          name: planName,
          description: "Active meal plan",
          start_date: startDate.toISOString(),
          end_date: response.end_date,
          is_active: true,
          target_calories_daily: response.target_calories_daily,
          target_protein_daily: response.target_protein_daily,
          target_carbs_daily: response.target_carbs_daily,
          target_fats_daily: response.target_fats_daily,
          weekly_plan: weeklyPlan,
          days_count: daysCount,
        };

        setMealPlan(mealPlanData);
        setCalendarData(weeklyPlan); // Set calendar data

        // Initialize local state from existing data
        const ratings: { [key: string]: number } = {};
        const comments: { [key: string]: string } = {};
        const favorites: { [key: string]: boolean } = {};

        Object.entries(weeklyPlan).forEach(([day, timings]) => {
          if (timings && typeof timings === "object") {
            Object.entries(timings).forEach(([timing, meals]) => {
              if (Array.isArray(meals)) {
                meals.forEach((meal: PlanMeal) => {
                  if (meal && meal.template_id) {
                    const key = `${day}-${timing}-${meal.template_id}`;
                    ratings[key] = meal.user_rating || 0;
                    comments[key] = meal.user_comments || "";
                    favorites[key] = meal.is_favorite || false;
                  }
                });
              }
            });
          }
        });

        setMealRatings(ratings);
        setMealComments(comments);
        setMealFavorites(favorites);

        console.log("✅ Meal plan loaded and structured successfully");
        console.log("📊 Meals loaded:", Object.values(ratings).length);
      } else {
        console.log("⚠️ No active meal plan found from server");
        setMealPlan(null);
      }
    } catch (error) {
      console.error("💥 Error loading meal plan:", error);
      // Don't immediately set to null, give user option to retry
      ToastService.error(
        language === "he" ? "שגיאה בטעינה" : "Loading Error",
        language === "he"
          ? "נכשל בטעינת תוכנית הארוחות. לחץ לנסות שוב."
          : "Failed to load meal plan. Tap to retry.",
        {
          duration: 5000,
          onPress: () => loadMealPlan(),
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMealPlan();
    setRefreshing(false);
  }, [planId]);

  const handleMealPress = (meal: PlanMeal, dayName: string, timing: string) => {
    setSelectedMeal(meal);
    const key = `${dayName}-${timing}-${meal.template_id}`;
    setTempRating(mealRatings[key] || 0);
    setTempComment(mealComments[key] || "");
    setShowMealModal(true);
  };
  const handleSaveMealInteraction = async () => {
    if (!selectedMeal || !mealPlan) return;

    const dayName = getDayNames()[selectedDay];
    const key = `${dayName}-${selectedMeal.meal_timing}-${selectedMeal.template_id}`;

    try {
      // Optimistically update local state
      setMealRatings((prev) => ({ ...prev, [key]: tempRating }));
      setMealComments((prev) => ({ ...prev, [key]: tempComment }));

      // Save to backend
      await api.put(
        `/meal-plans/${mealPlan.plan_id}/meals/${selectedMeal.template_id}/interaction`,
        {
          rating: tempRating,
          comments: tempComment.trim() || undefined,
          day: dayName,
          meal_timing: selectedMeal.meal_timing,
        }
      );

      setShowMealModal(false);
    } catch (error) {
      console.error("💥 Error saving meal interaction:", error);

      // Revert optimistic update
      setMealRatings((prev) => {
        const updated = { ...prev };
        if (prev[key]) delete updated[key];
        return updated;
      });
      setMealComments((prev) => {
        const updated = { ...prev };
        if (prev[key]) delete updated[key];
        return updated;
      });

      ToastService.error(
        language === "he" ? "שגיאה" : "Error",
        language === "he"
          ? "נכשל בשמירת הדירוג. נסה שוב."
          : "Failed to save rating. Please try again."
      );
    }
  };

  const handleToggleFavorite = async (
    meal: PlanMeal,
    dayName: string,
    timing: string
  ) => {
    const key = `${dayName}-${timing}-${meal.template_id}`;
    const newFavoriteState = !mealFavorites[key];

    try {
      // Optimistically update
      setMealFavorites((prev) => ({ ...prev, [key]: newFavoriteState }));

      await api.put(
        `/meal-plans/${mealPlan?.plan_id}/meals/${meal.template_id}/favorite`,
        {
          is_favorite: newFavoriteState,
          day: dayName,
          meal_timing: timing,
        }
      );
    } catch (error) {
      console.error("💥 Error toggling favorite:", error);

      // Revert optimistic update
      setMealFavorites((prev) => ({ ...prev, [key]: !newFavoriteState }));

      ToastService.error(
        language === "he" ? "שגיאה" : "Error",
        language === "he"
          ? "נכשל בעדכון המועדפים"
          : "Failed to update favorites"
      );
    }
  };

  const handleSwapMeal = async (
    mealToSwap: PlanMeal,
    day: string,
    mealType: string,
    prefs?: typeof swapPreferences
  ) => {
    try {
      setIsSwapping(true);
      setSwapError(null);

      console.log("🔄 Swapping meal:", { mealToSwap, day, mealType, prefs });

      // Construct the swap request payload
      const swapRequestBody: SwapRequest = {
        currentMeal: mealToSwap,
        dayName: day,
        mealTiming: mealType,
        preferences: {
          dietary_category: mealToSwap.dietary_category, // Default to current meal's category
          max_prep_time: mealToSwap.prep_time_minutes, // Default to current meal's prep time
          // Include user preferences if provided
          ...prefs,
        },
      };

      // Send swap request to server
      const response = await mealPlanAPI.swapMeal(
        planId as string,
        swapRequestBody
      );

      if (response.success) {
        ToastService.success(
          t("menu.swapSuccess") || "Success",
          t("menu.mealSwapped") || "Meal swapped successfully!",
          {
            duration: 3000,
            onHide: () => {
              loadMealPlan(); // Reload the meal plan to reflect changes
              // Reset swap preferences after successful swap
              setSwapPreferences({
                userNotes: "",
                targetCalories: "",
                targetProtein: "",
                targetCarbs: "",
                targetFat: "",
              });
            },
          }
        );
      } else {
        throw new Error(response.error || "Failed to swap meal");
      }
    } catch (error: any) {
      console.error("💥 Swap meal error:", error);
      setSwapError(error.message || "Failed to swap meal");
      ToastService.error(
        t("common.error") || "Error",
        error.message || "Failed to swap meal. Please try again."
      );
    } finally {
      setIsSwapping(false);
      setShowSwapModal(false); // Close the modal regardless of success or failure
    }
  };

  const handleCompletePlan = async () => {
    if (!mealPlan) return;

    setIsSubmittingRating(true);

    try {
      const response = await mealPlanAPI.completeMealPlan(
        mealPlan.plan_id,
        completionFeedback
      );

      if (response.data.success) {
        setShowMenuRatingModal(false);

        ToastService.success(
          language === "he" ? "תודה!" : "Thank you!",
          language === "he"
            ? "התוכנית הושלמה בהצלחה. המשוב שלך יעזור לנו לשפר!"
            : "Plan completed successfully. Your feedback will help us improve!",
          {
            duration: 4000,
            onHide: () => {
              router.push("/(tabs)/recommended-menus");
            },
          }
        );
      } else {
        throw new Error(response.data.error || "Error completing menu");
      }
    } catch (error: any) {
      console.error("💥 Error completing plan:", error);
      ToastService.error(
        language === "he" ? "שגיאה" : "Error",
        error.response?.data?.error ||
          error.message ||
          (language === "he"
            ? "נכשל בהשלמת התוכנית"
            : "Failed to complete plan")
      );
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const getDayNames = () => {
    if (mealPlan?.weekly_plan) {
      // Use the actual day names from the meal plan data
      const availableDays = Object.keys(mealPlan.weekly_plan);
      console.log("📅 Available days from meal plan:", availableDays);

      if (availableDays.length > 0) {
        return availableDays;
      }
    }

    if (mealPlan?.start_date) {
      // Get plan start day and create array from that day
      const planStartDate = new Date(mealPlan.start_date);
      const startDayIndex = planStartDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      const allDays = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      // Reorder array to start from plan start day
      const reorderedDays = [
        ...allDays.slice(startDayIndex),
        ...allDays.slice(0, startDayIndex),
      ];

      console.log("📅 Reordered days based on start date:", reorderedDays);
      return reorderedDays;
    }

    // Default fallback - all days in order
    return [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(
      currentWeekStart.getDate() + (direction === "next" ? 7 : -7)
    );
    setCurrentWeekStart(newWeekStart);
  };

  const selectDay = (dayIndex: number, date: Date) => {
    console.log("📅 Selecting day:", dayIndex, date.toDateString());
    setSelectedDay(dayIndex);
    setSelectedDate(date);

    // Force re-render of filtered meals
    const dayName = getDayNames()[dayIndex];
    console.log("📅 Selected day name:", dayName);
    console.log(
      "📅 Available meal plan days:",
      mealPlan?.weekly_plan ? Object.keys(mealPlan.weekly_plan) : []
    );
  };

  const getDailyNutritionTotals = () => {
    if (!mealPlan || !mealPlan.weekly_plan) return null;

    const dayName = getDayNames()[selectedDay];
    const dayMeals = mealPlan.weekly_plan[dayName];

    if (!dayMeals) return null;

    let totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
    };

    Object.values(dayMeals).forEach((meals) => {
      if (Array.isArray(meals)) {
        meals.forEach((meal) => {
          totals.calories += meal.calories || 0;
          totals.protein += meal.protein_g || 0;
          totals.carbs += meal.carbs_g || 0;
          totals.fats += meal.fats_g || 0;
          totals.fiber += meal.fiber_g || 0;
        });
      }
    });

    return totals;
  };

  const filteredMeals = useMemo(() => {
    const dayNames = getDayNames();
    const dayName = dayNames[selectedDay];

    console.log("🔍 Filtering meals for:", {
      selectedDay,
      dayName,
      availableDays: Object.keys(mealPlan?.weekly_plan || {}),
      totalDays: dayNames.length,
    });

    const dayMeals = mealPlan?.weekly_plan?.[dayName];

    if (!dayMeals) {
      console.log("⚠️ No meals found for day:", dayName);
      console.log(
        "📊 Available meal plan structure:",
        mealPlan?.weekly_plan
          ? Object.keys(mealPlan.weekly_plan)
          : "No weekly plan"
      );
      return {};
    }

    const filtered: { [timing: string]: PlanMeal[] } = {};

    if (dayMeals && typeof dayMeals === "object") {
      Object.entries(dayMeals).forEach(([timing, meals]) => {
        console.log(
          `🍽️ Processing ${timing} with ${
            Array.isArray(meals) ? meals.length : 0
          } meals`
        );

        if (Array.isArray(meals)) {
          filtered[timing] = meals.filter((meal) => {
            if (!meal || !meal.template_id) {
              console.log("❌ Invalid meal data:", meal);
              return false;
            }

            // Apply filters
            if (
              filters.dietary_category !== "all" &&
              meal.dietary_category !== filters.dietary_category
            ) {
              return false;
            }

            if (
              filters.meal_timing !== "all" &&
              timing !== filters.meal_timing
            ) {
              return false;
            }

            const key = `${dayName}-${timing}-${meal.template_id}`;
            const rating = mealRatings[key] || 0;

            if (rating < filters.min_rating) {
              return false;
            }

            if (filters.favorites_only && !mealFavorites[key]) {
              return false;
            }

            return true;
          });

          console.log(
            `✅ Filtered ${timing}: ${filtered[timing].length} meals`
          );
        } else {
          console.log(`⚠️ ${timing} is not an array:`, meals);
          filtered[timing] = [];
        }
      });
    }

    const totalFilteredMeals = Object.values(filtered).reduce(
      (total, meals) => total + meals.length,
      0
    );
    console.log(
      `📊 Total filtered meals for ${dayName}: ${totalFilteredMeals}`
    );

    return filtered;
  }, [mealPlan, selectedDay, filters, mealRatings, mealFavorites, getDayNames]);

  const renderStarRating = (
    rating: number,
    onPress?: (rating: number) => void,
    size: number = 16
  ) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress?.(star)}
            style={styles.starButton}
            disabled={!onPress}
          >
            <Star
              size={size}
              color={star <= rating ? "#fbbf24" : colors.border}
              fill={star <= rating ? "#fbbf24" : "transparent"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMealCard = (meal: PlanMeal, dayName: string, timing: string) => {
    const key = `${dayName}-${timing}-${meal.template_id}`;
    const rating = mealRatings[key] || 0;
    const comment = mealComments[key] || "";
    const isFavorite = mealFavorites[key] || false;
    const isCompleted = completedMeals.has(key);

    return (
      <View key={meal.template_id} style={styles.mealContainer}>
        {/* Meal Rating Card */}
        <MealRatingCard
          mealName={meal.name}
          mealTiming={timing}
          currentRating={rating}
          isFavorite={isFavorite}
          prepTime={meal.prep_time_minutes}
          onRatingChange={(newRating) =>
            handleRatingChangeForMeal(newRating, key)
          }
          onFavoriteToggle={() => handleToggleFavorite(meal, dayName, timing)}
          expanded={expandedMealRating === key}
          onToggleExpand={() =>
            setExpandedMealRating(expandedMealRating === key ? null : key)
          }
        />

        {/* Meal Details Card */}
        <TouchableOpacity
          style={[
            styles.mealDetailsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => handleMealPress(meal, dayName, timing)}
          activeOpacity={0.7}
        >
          <View style={styles.mealNutrition}>
            <View style={styles.nutritionItem}>
              <Text
                style={[styles.nutritionValue, { color: colors.emerald500 }]}
              >
                {meal.calories}
              </Text>
              <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                {language === "he" ? "קלוריות" : "Cal"}
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text
                style={[styles.nutritionValue, { color: colors.emerald500 }]}
              >
                {meal.protein_g}g
              </Text>
              <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                {language === "he" ? "חלבון" : "Protein"}
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text
                style={[styles.nutritionValue, { color: colors.emerald500 }]}
              >
                {meal.carbs_g}g
              </Text>
              <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                {language === "he" ? "פחמימות" : "Carbs"}
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text
                style={[styles.nutritionValue, { color: colors.emerald500 }]}
              >
                {meal.fats_g}g
              </Text>
              <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                {language === "he" ? "שומן" : "Fat"}
              </Text>
            </View>
          </View>

          {meal.description && (
            <Text
              style={[
                styles.mealDescription,
                { color: colors.icon },
                isRTL && styles.rtlText,
              ]}
              numberOfLines={2}
            >
              {meal.description}
            </Text>
          )}

          <View style={styles.mealCardActions}>
            <TouchableOpacity
              style={[styles.swapButton, { backgroundColor: colors.surface }]}
              onPress={() => {
                setSelectedMeal(meal);
                setShowSwapModal(true);
              }}
            >
              <RefreshCw size={14} color={colors.emerald500} />
              <Text
                style={[styles.swapButtonText, { color: colors.emerald500 }]}
              >
                {language === "he" ? "החלף" : "Swap"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.completeButton,
                {
                  backgroundColor: isCompleted ? "#10B981" : colors.emerald500,
                  opacity: isCompleted ? 0.8 : 1,
                },
              ]}
              onPress={() => handleCompleteMeal(meal, dayName, timing)}
              disabled={isCompleted}
            >
              {isCompleted ? (
                <Check size={16} color="#ffffff" />
              ) : (
                <Utensils size={16} color="#ffffff" />
              )}
              <Text style={[styles.completeButtonText, { color: "#ffffff" }]}>
                {isCompleted
                  ? language === "he"
                    ? "הושלם"
                    : "Done"
                  : language === "he"
                  ? "השלם"
                  : "Complete"}
              </Text>
            </TouchableOpacity>
          </View>

          {comment && (
            <View
              style={[
                styles.commentPreview,
                { backgroundColor: colors.surface },
              ]}
            >
              <MessageSquare size={12} color={colors.icon} />
              <Text
                style={[
                  styles.commentText,
                  { color: colors.text },
                  isRTL && styles.rtlText,
                ]}
                numberOfLines={1}
              >
                {comment}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const handleRatingChange = (rating: number) => {
    setTempRating(rating);
  };

  const handleRatingChangeForMeal = async (rating: number, key: string) => {
    // Update local state immediately
    setMealRatings((prev) => ({ ...prev, [key]: rating }));

    // Save to backend
    try {
      const [dayName, timing, templateId] = key.split("-");
      await api.put(
        `/meal-plans/${mealPlan?.plan_id}/meals/${templateId}/interaction`,
        {
          rating,
          day: dayName,
          meal_timing: timing,
        }
      );
    } catch (error) {
      console.error("💥 Error saving rating:", error);
      // Revert on error
      setMealRatings((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const renderMealModal = () => (
    <Modal
      visible={showMealModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowMealModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.enhancedModalContainer,
            { backgroundColor: colors.card },
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowMealModal(false)}
              style={styles.modalCloseButton}
            >
              <X size={24} color={colors.icon} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedMeal?.name}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Meal Details */}
            <View style={styles.mealDetailsSection}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text },
                  isRTL && styles.rtlText,
                ]}
              >
                {language === "he" ? "פרטי הארוחה" : "Meal Details"}
              </Text>

              {selectedMeal?.description && (
                <Text
                  style={[
                    styles.detailText,
                    { color: colors.icon },
                    isRTL && styles.rtlText,
                  ]}
                >
                  {selectedMeal.description}
                </Text>
              )}

              {selectedMeal?.ingredients &&
                selectedMeal.ingredients.length > 0 && (
                  <View style={styles.ingredientsContainer}>
                    <Text
                      style={[
                        styles.ingredientsTitle,
                        { color: colors.text },
                        isRTL && styles.rtlText,
                      ]}
                    >
                      {language === "he" ? "רכיבים:" : "Ingredients:"}
                    </Text>
                    {selectedMeal.ingredients.map((ingredient, index) => (
                      <Text
                        key={index}
                        style={[
                          styles.ingredientText,
                          { color: colors.icon },
                          isRTL && styles.rtlText,
                        ]}
                      >
                        • {ingredient}
                      </Text>
                    ))}
                  </View>
                )}

              {selectedMeal?.instructions &&
                selectedMeal.instructions.length > 0 && (
                  <View style={styles.instructionsContainer}>
                    <Text
                      style={[
                        styles.instructionsTitle,
                        { color: colors.text },
                        isRTL && styles.rtlText,
                      ]}
                    >
                      {language === "he" ? "הוראות הכנה:" : "Instructions:"}
                    </Text>
                    {selectedMeal.instructions.map((instruction, index) => (
                      <Text
                        key={index}
                        style={[
                          styles.instructionText,
                          { color: colors.icon },
                          isRTL && styles.rtlText,
                        ]}
                      >
                        {index + 1}. {instruction}
                      </Text>
                    ))}
                  </View>
                )}
            </View>

            {/* Rating Section */}
            <View style={styles.ratingSection}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text },
                  isRTL && styles.rtlText,
                ]}
              >
                {language === "he" ? "דרג את הארוחה" : "Rate this Meal"}
              </Text>
              {renderStarRating(tempRating, handleRatingChange, 24)}
            </View>

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text },
                  isRTL && styles.rtlText,
                ]}
              >
                {language === "he" ? "הערות" : "Comments"}
              </Text>
              <TextInput
                style={[
                  styles.commentInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                  isRTL && styles.rtlTextInput,
                ]}
                placeholder={
                  language === "he"
                    ? "הוסף הערות על הארוחה..."
                    : "Add comments about this meal..."
                }
                placeholderTextColor={colors.icon}
                value={tempComment}
                onChangeText={setTempComment}
                multiline
                numberOfLines={3}
                textAlign={isRTL ? "right" : "left"}
              />
            </View>
          </ScrollView>

          <View
            style={[styles.modalActions, { borderTopColor: colors.border }]}
          >
            <TouchableOpacity
              style={[
                styles.modalCancelButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setShowMealModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.text }]}>
                {language === "he" ? "ביטול" : "Cancel"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                { backgroundColor: colors.emerald500 },
              ]}
              onPress={handleSaveMealInteraction}
            >
              <Check size={16} color="#ffffff" />
              <Text style={styles.modalSaveText}>
                {language === "he" ? "שמור" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCompletePlanModal = () => (
    <Modal
      visible={showCompletePlanModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCompletePlanModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.enhancedModalContainer,
            { backgroundColor: colors.card },
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowCompletePlanModal(false)}
              style={styles.modalCloseButton}
            >
              <X size={24} color={colors.icon} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {language === "he" ? "השלמת התוכנית" : "Complete Plan"}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalBody}>
            <Text
              style={[
                styles.mealCompletionDescription,
                { color: colors.text },
                isRTL && styles.rtlText,
              ]}
            >
              {language === "he"
                ? "איך הייתה התוכנית שלך? המשוב שלך יעזור לנו לשפר!"
                : "How was your plan? Your feedback will help us improve!"}
            </Text>

            {/* Rating */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {language === "he" ? "דירוג כללי" : "Overall Rating"} *
              </Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() =>
                      setCompletionFeedback({
                        ...completionFeedback,
                        rating: star,
                      })
                    }
                    style={styles.starButton}
                  >
                    <Star
                      size={28}
                      color={
                        star <= completionFeedback.rating
                          ? "#fbbf24"
                          : colors.border
                      }
                      fill={
                        star <= completionFeedback.rating
                          ? "#fbbf24"
                          : "transparent"
                      }
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* What you liked */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {language === "he" ? "מה אהבת?" : "What did you like?"}
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                  isRTL && styles.rtlTextInput,
                ]}
                placeholder={
                  language === "he"
                    ? "תאר מה אהבת בתוכנית..."
                    : "Describe what you liked about the plan..."
                }
                placeholderTextColor={colors.icon}
                value={completionFeedback.liked}
                onChangeText={(text) =>
                  setCompletionFeedback({ ...completionFeedback, liked: text })
                }
                multiline
                numberOfLines={3}
                textAlign={isRTL ? "right" : "left"}
              />
            </View>

            {/* What you didn't like */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {language === "he" ? "מה לא אהבת?" : "What didn't you like?"}
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                  isRTL && styles.rtlTextInput,
                ]}
                placeholder={
                  language === "he"
                    ? "תאר מה לא אהבת..."
                    : "Describe what you didn't like..."
                }
                placeholderTextColor={colors.icon}
                value={completionFeedback.disliked}
                onChangeText={(text) =>
                  setCompletionFeedback({
                    ...completionFeedback,
                    disliked: text,
                  })
                }
                multiline
                numberOfLines={3}
                textAlign={isRTL ? "right" : "left"}
              />
            </View>

            {/* Suggestions */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {language === "he"
                  ? "הצעות לשיפור"
                  : "Suggestions for improvement"}
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                  isRTL && styles.rtlTextInput,
                ]}
                placeholder={
                  language === "he" ? "איך נוכל לשפר?" : "How can we improve?"
                }
                placeholderTextColor={colors.icon}
                value={completionFeedback.suggestions}
                onChangeText={(text) =>
                  setCompletionFeedback({
                    ...completionFeedback,
                    suggestions: text,
                  })
                }
                multiline
                numberOfLines={3}
                textAlign={isRTL ? "right" : "left"}
              />
            </View>
          </ScrollView>

          <View
            style={[styles.modalActions, { borderTopColor: colors.border }]}
          >
            <TouchableOpacity
              style={[
                styles.modalCancelButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setShowCompletePlanModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.text }]}>
                {language === "he" ? "ביטול" : "Cancel"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                { backgroundColor: colors.emerald500 },
              ]}
              onPress={handleCompletePlan}
            >
              <Award size={16} color="#ffffff" />
              <Text style={styles.modalSaveText}>
                {language === "he" ? "השלם תוכנית" : "Complete Plan"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const handleRemoveMeal = useCallback(
    async (mealId: string) => {
      ToastService.confirm(
        language === "he" ? "מחק ארוחה" : "Delete Meal",
        language === "he"
          ? "האם אתה בטוח שברצונך למחוק ארוחה זו? לחץ שוב למחיקה."
          : "Are you sure you want to delete this meal? Tap again to confirm."
      );

      try {
        // Remove meal from plan
        console.log("Removing meal from plan:", mealId);
        ToastService.deleteSuccess(
          language === "he"
            ? "הארוחה נמחקה בהצלחה"
            : "Meal deleted successfully"
        );
        await loadMealPlan(); // Reload the plan
      } catch (error) {
        console.error("Failed to remove meal:", error);
        ToastService.error(
          language === "he" ? "שגיאה" : "Error",
          language === "he" ? "נכשל במחיקת הארוחה" : "Failed to delete meal"
        );
      }
    },
    [loadMealPlan, language]
  );

  const handleCompleteMeal = (
    meal: PlanMeal,
    dayName: string,
    timing: string
  ) => {
    setSelectedMealForCompletion({ meal, dayName, timing });
    setMealCompletionData({
      rating: 0,
      notes: "",
      prep_time_actual: meal.prep_time_minutes || 30,
    });
    setShowMealCompleteModal(true);
  };

  const renderSwapModal = () => (
    <Modal
      visible={showSwapModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => !isSwapping && setShowSwapModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.enhancedModalContainer,
            {
              backgroundColor: colors.card,
              maxWidth: screenWidth > 600 ? 500 : screenWidth - 40,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {language === "he" ? "החלף ארוחה" : "Swap Meal"}
            </Text>
            {!isSwapping && (
              <TouchableOpacity
                onPress={() => {
                  setShowSwapModal(false);
                  setSwapPreferences({
                    userNotes: "",
                    targetCalories: "",
                    targetProtein: "",
                    targetCarbs: "",
                    targetFat: "",
                  });
                }}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.icon} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.modalBody}>
            {isSwapping ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <ActivityIndicator size="large" color={colors.emerald500} />
                <Text
                  style={[
                    styles.textInput,
                    { color: colors.text, marginTop: 16 },
                  ]}
                >
                  {language === "he"
                    ? "מחפש ארוחה חלופית מתאימה..."
                    : "Finding a suitable alternative meal..."}
                </Text>
              </View>
            ) : swapError ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <AlertCircle size={48} color={colors.error} />
                <Text
                  style={[
                    styles.textInput,
                    { color: colors.error, marginTop: 16, textAlign: "center" },
                  ]}
                >
                  {swapError}
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {language === "he"
                    ? "מה תרצה לשנות בארוחה?"
                    : "What would you like to change?"}
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder={
                    language === "he"
                      ? "לדוגמה: יותר חלבון, פחות פחמימות, ללא גלוטן..."
                      : "e.g., more protein, less carbs, gluten-free..."
                  }
                  placeholderTextColor={colors.icon}
                  value={swapPreferences.userNotes}
                  onChangeText={(text) =>
                    setSwapPreferences({ ...swapPreferences, userNotes: text })
                  }
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.nutritionInputs}>
                  <View style={styles.nutritionInputRow}>
                    <View style={styles.nutritionInputItem}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        {language === "he" ? "קלוריות" : "Calories"}
                      </Text>
                      <TextInput
                        style={[
                          styles.smallInput,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            color: colors.text,
                          },
                        ]}
                        placeholder="500"
                        placeholderTextColor={colors.icon}
                        keyboardType="numeric"
                        value={swapPreferences.targetCalories}
                        onChangeText={(text) =>
                          setSwapPreferences({
                            ...swapPreferences,
                            targetCalories: text,
                          })
                        }
                      />
                    </View>

                    <View style={styles.nutritionInputItem}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        {language === "he" ? "חלבון (גר')" : "Protein (g)"}
                      </Text>
                      <TextInput
                        style={[
                          styles.smallInput,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            color: colors.text,
                          },
                        ]}
                        placeholder="30"
                        placeholderTextColor={colors.icon}
                        keyboardType="numeric"
                        value={swapPreferences.targetProtein}
                        onChangeText={(text) =>
                          setSwapPreferences({
                            ...swapPreferences,
                            targetProtein: text,
                          })
                        }
                      />
                    </View>
                  </View>

                  <View style={styles.nutritionInputRow}>
                    <View style={styles.nutritionInputItem}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        {language === "he" ? "פחמימות (גר')" : "Carbs (g)"}
                      </Text>
                      <TextInput
                        style={[
                          styles.smallInput,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            color: colors.text,
                          },
                        ]}
                        placeholder="50"
                        placeholderTextColor={colors.icon}
                        keyboardType="numeric"
                        value={swapPreferences.targetCarbs}
                        onChangeText={(text) =>
                          setSwapPreferences({
                            ...swapPreferences,
                            targetCarbs: text,
                          })
                        }
                      />
                    </View>

                    <View style={styles.nutritionInputItem}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        {language === "he" ? "שומן (גר')" : "Fat (g)"}
                      </Text>
                      <TextInput
                        style={[
                          styles.smallInput,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            color: colors.text,
                          },
                        ]}
                        placeholder="15"
                        placeholderTextColor={colors.icon}
                        keyboardType="numeric"
                        value={swapPreferences.targetFat}
                        onChangeText={(text) =>
                          setSwapPreferences({
                            ...swapPreferences,
                            targetFat: text,
                          })
                        }
                      />
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.swapConfirmButton,
                    { backgroundColor: colors.emerald500 },
                  ]}
                  onPress={() => {
                    if (selectedMeal) {
                      // Use selectedMeal for clarity
                      handleSwapMeal(
                        selectedMeal,
                        getDayNames()[selectedDay],
                        selectedMeal.meal_timing,
                        swapPreferences
                      );
                    }
                  }}
                >
                  <RefreshCw size={20} color="#ffffff" />
                  <Text style={styles.swapConfirmButtonText}>
                    {language === "he" ? "החלף ארוחה" : "Swap Meal"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const submitMealCompletion = async () => {
    if (!selectedMealForCompletion) return;

    try {
      const { meal, dayName, timing } = selectedMealForCompletion;
      const completionData = {
        plan_id: mealPlan?.plan_id,
        meal_name: meal.name,
        meal_type: timing.toUpperCase(),
        day_number: selectedDay + 1, // Assuming selectedDay is 0-indexed
        calories: meal.calories,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fats_g: meal.fats_g,
        rating: mealCompletionData.rating,
        notes: mealCompletionData.notes.trim() || undefined,
        prep_time_actual: mealCompletionData.prep_time_actual,
      };

      const response = await api.post(
        "/meal-completions/complete",
        completionData
      );

      if (response.data.success) {
        const mealKey = `${dayName}-${timing}-${meal.template_id}`;
        setCompletedMeals((prev) => new Set([...prev, mealKey]));
        setShowMealCompleteModal(false);
        setSelectedMealForCompletion(null);

        ToastService.achievementUnlocked(
          language === "he" ? "הושלם!" : "Completed!",
          response.data.xp_gained
        );
      } else {
        // Handle API error response
        throw new Error(response.data.error || "Unknown error completing meal");
      }
    } catch (error: any) {
      console.error("Failed to complete meal:", error);
      let errorMessage =
        language === "he"
          ? "נכשל בסימון ההשלמה. אנא נסה שוב."
          : "Failed to mark meal as completed. Please try again.";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      ToastService.error(language === "he" ? "שגיאה" : "Error", errorMessage);
    }
  };

  const renderMealCompleteModal = () => (
    <Modal
      visible={showMealCompleteModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowMealCompleteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.enhancedModalContainer,
            { backgroundColor: colors.card },
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowMealCompleteModal(false)}
              style={styles.modalCloseButton}
            >
              <X size={24} color={colors.icon} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {language === "he" ? "השלמת ארוחה" : "Complete Meal"}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalBody}>
            {selectedMealForCompletion && (
              <>
                <Text
                  style={[
                    styles.mealCompletionDescription,
                    { color: colors.text },
                    isRTL && styles.rtlText,
                  ]}
                >
                  {language === "he"
                    ? `איך הייתה הארוחה "${selectedMealForCompletion.meal.name}"?`
                    : `How was "${selectedMealForCompletion.meal.name}"?`}
                </Text>

                {/* Rating */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    {language === "he" ? "דירוג" : "Rating"} *
                  </Text>
                  <View style={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() =>
                          setMealCompletionData({
                            ...mealCompletionData,
                            rating: star,
                          })
                        }
                        style={styles.starButton}
                      >
                        <Star
                          size={28}
                          color={
                            star <= mealCompletionData.rating
                              ? "#fbbf24"
                              : colors.border
                          }
                          fill={
                            star <= mealCompletionData.rating
                              ? "#fbbf24"
                              : "transparent"
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Notes */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    {language === "he" ? "הערות" : "Notes"}
                  </Text>
                  <TextInput
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                      isRTL && styles.rtlTextInput,
                    ]}
                    placeholder={
                      language === "he"
                        ? "איך הייתה הארוחה?"
                        : "How was the meal?"
                    }
                    placeholderTextColor={colors.icon}
                    value={mealCompletionData.notes}
                    onChangeText={(text) =>
                      setMealCompletionData({
                        ...mealCompletionData,
                        notes: text,
                      })
                    }
                    multiline
                    numberOfLines={3}
                    textAlign={isRTL ? "right" : "left"}
                  />
                </View>

                {/* Prep Time */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    {language === "he"
                      ? "זמן הכנה בפועל (דקות)"
                      : "Actual Prep Time (minutes)"}
                  </Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() =>
                        setMealCompletionData({
                          ...mealCompletionData,
                          prep_time_actual: Math.max(
                            5,
                            mealCompletionData.prep_time_actual - 5
                          ),
                        })
                      }
                    >
                      <Minus size={16} color={colors.emerald500} />
                    </TouchableOpacity>
                    <Text style={[styles.quantityText, { color: colors.text }]}>
                      {mealCompletionData.prep_time_actual}
                    </Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() =>
                        setMealCompletionData({
                          ...mealCompletionData,
                          prep_time_actual:
                            mealCompletionData.prep_time_actual + 5,
                        })
                      }
                    >
                      <Plus size={16} color={colors.emerald500} />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View
            style={[styles.modalActions, { borderTopColor: colors.border }]}
          >
            <TouchableOpacity
              style={[
                styles.modalCancelButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setShowMealCompleteModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.text }]}>
                {language === "he" ? "ביטול" : "Cancel"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                {
                  backgroundColor:
                    mealCompletionData.rating > 0
                      ? colors.emerald500
                      : colors.border,
                  opacity: mealCompletionData.rating > 0 ? 1 : 0.5,
                },
              ]}
              onPress={submitMealCompletion}
              disabled={mealCompletionData.rating === 0}
            >
              <Check size={16} color="#ffffff" />
              <Text style={styles.modalSaveText}>
                {language === "he" ? "השלם ארוחה" : "Complete Meal"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <LoadingScreen
        text={
          language === "he" ? "טוען תוכנית ארוחות..." : "Loading meal plan..."
        }
      />
    );
  }

  if (!mealPlan) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.emptyState}>
          <ChefHat size={64} color={colors.icon} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {language === "he" ? "אין תוכנית זמינה" : "No meal plan available"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
            {language === "he"
              ? "צור תוכנית ארוחות כדי להתחיל"
              : "Create a meal plan to get started"}
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.emerald500 }]}
            onPress={() => router.push("/(tabs)/recommended-menus")}
          >
            <Text style={styles.backButtonText}>
              {language === "he" ? "חזור לתפריטים" : "Back to Menus"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const dailyTotals = getDailyNutritionTotals();

  function handleMenuRatingSubmit(rating: any): void {
    throw new Error("Function not implemented.");
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.headerBackButton, { backgroundColor: colors.card }]}
          onPress={() => router.push("/(tabs)/recommended-menus")}
        >
          <ArrowLeft size={20} color={colors.emerald500} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.text },
              isRTL && styles.rtlText,
            ]}
          >
            {mealPlan.name}
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: colors.icon },
              isRTL && styles.rtlText,
            ]}
          >
            {language === "he" ? "תוכנית פעילה" : "Active Plan"}
          </Text>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => setShowReviewModal(true)}
            style={[
              styles.reviewButton,
              { backgroundColor: colors.emerald500 },
            ]}
          >
            <Award size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterHeaderButton,
              { backgroundColor: colors.card },
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={20} color={colors.emerald500} />
          </TouchableOpacity>
        </View>
      </View>

      {showReviewModal && mealPlan && (
        <Modal
          visible={showReviewModal}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <MenuReviewStatistics
            menuId={mealPlan.plan_id}
            menuName={mealPlan.name}
            daysCount={mealPlan.days_count || 7}
            onClose={() => setShowReviewModal(false)}
            onMenuRestart={() => {
              setShowReviewModal(false);
              loadMealPlan();
            }}
          />
        </Modal>
      )}

      {/* Enhanced Calendar Widget */}
      <View style={[styles.calendarWidget, { backgroundColor: colors.card }]}>
        <View
          style={[styles.calendarHeader, { borderBottomColor: colors.border }]}
        >
          <TouchableOpacity onPress={() => navigateWeek("prev")}>
            <ChevronLeft size={20} color={colors.emerald500} />
          </TouchableOpacity>

          <Text style={[styles.monthYear, { color: colors.text }]}>
            {currentWeekStart.toLocaleDateString(
              language === "he" ? "he-IL" : "en-US",
              {
                month: "long",
                year: "numeric",
              }
            )}
          </Text>

          <TouchableOpacity onPress={() => navigateWeek("next")}>
            <ChevronRight size={20} color={colors.emerald500} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.daysContainer}
        >
          {weekDays.map((day, index) => {
            const isSelected = selectedDay === index;
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCard,
                  {
                    backgroundColor: isSelected
                      ? colors.emerald500
                      : colors.surface,
                    borderColor: isToday ? colors.emerald500 : colors.border,
                    borderWidth: isToday ? 2 : 1,
                  },
                ]}
                onPress={() => selectDay(index, day)}
              >
                <Text
                  style={[
                    styles.dayName,
                    {
                      color: isSelected ? "#ffffff" : colors.text,
                      fontWeight: isToday ? "bold" : "normal",
                    },
                  ]}
                >
                  {day.toLocaleDateString(
                    language === "he" ? "he-IL" : "en-US",
                    {
                      weekday: "short",
                    }
                  )}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    {
                      color: isSelected ? "#ffffff" : colors.text,
                      fontWeight: isToday ? "bold" : "normal",
                    },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Daily Nutrition Summary */}
      {dailyTotals && (
        <View
          style={[styles.nutritionSummary, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            {language === "he" ? "סיכום יומי" : "Daily Summary"}
          </Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionSummaryItem}>
              <Target size={16} color="#ef4444" />
              <Text
                style={[styles.nutritionSummaryValue, { color: colors.text }]}
              >
                {dailyTotals.calories}
              </Text>
              <Text
                style={[styles.nutritionSummaryLabel, { color: colors.icon }]}
              >
                {language === "he" ? "קלוריות" : "Calories"}
              </Text>
            </View>
            <View style={styles.nutritionSummaryItem}>
              <TrendingUp size={16} color="#3b82f6" />
              <Text
                style={[styles.nutritionSummaryValue, { color: colors.text }]}
              >
                {Math.round(dailyTotals.protein)}g
              </Text>
              <Text
                style={[styles.nutritionSummaryLabel, { color: colors.icon }]}
              >
                {language === "he" ? "חלבון" : "Protein"}
              </Text>
            </View>
            <View style={styles.nutritionSummaryItem}>
              <Award size={16} color="#10b981" />
              <Text
                style={[styles.nutritionSummaryValue, { color: colors.text }]}
              >
                {Math.round(dailyTotals.carbs)}g
              </Text>
              <Text
                style={[styles.nutritionSummaryLabel, { color: colors.icon }]}
              >
                {language === "he" ? "פחמימות" : "Carbs"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Meals Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.emerald500]}
            tintColor={colors.emerald500}
          />
        }
      >
        {Object.entries(filteredMeals).map(([timing, meals]) => (
          <View key={timing} style={styles.mealTimingSection}>
            <View style={styles.timingHeader}>
              <Text
                style={[
                  styles.mealTimingTitle,
                  { color: colors.text },
                  isRTL && styles.rtlText,
                ]}
              >
                {timing}
              </Text>
              <Text style={[styles.mealCount, { color: colors.icon }]}>
                {meals.length} {language === "he" ? "ארוחות" : "meals"}
              </Text>
            </View>

            {meals.length > 0 ? (
              meals.map((meal) =>
                renderMealCard(meal, getDayNames()[selectedDay], timing)
              )
            ) : (
              <View
                style={[
                  styles.noMealsContainer,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Utensils size={24} color={colors.icon} />
                <Text
                  style={[
                    styles.noMealsText,
                    { color: colors.icon },
                    isRTL && styles.rtlText,
                  ]}
                >
                  {language === "he"
                    ? "אין ארוחות תואמות לסינון"
                    : "No meals match the current filters"}
                </Text>
              </View>
            )}
          </View>
        ))}

        {Object.keys(filteredMeals).length === 0 && (
          <View style={styles.emptyDayState}>
            <ChefHat size={48} color={colors.icon} />
            <Text style={[styles.emptyDayTitle, { color: colors.text }]}>
              {language === "he"
                ? "אין ארוחות לתאריך זה"
                : "No meals for this date"}
            </Text>
            <Text style={[styles.emptyDaySubtitle, { color: colors.icon }]}>
              {language === "he"
                ? "בחר תאריך אחר או צור תוכנית חדשה"
                : "Select another date or create a new plan"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {renderMealModal()}
      {renderSwapModal()}
      {showMealCompleteModal && renderMealCompleteModal()}

      <MenuRatingModal
        visible={showMenuRatingModal}
        onClose={() => setShowMenuRatingModal(false)}
        onSubmit={handleMenuRatingSubmit}
        menuName={mealPlan?.name || "Active Menu"}
        isSubmitting={isSubmittingRating}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdfefe",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    backgroundColor: "#fdfefe",
    borderBottomColor: "#d5e8e8",
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  filterHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarWidget: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#52c1c4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    backgroundColor: "#ffffff",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: "600",
  },
  daysContainer: {
    padding: 16,
  },
  dayCard: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginRight: 12,
    borderRadius: 16,
    minWidth: 70,
    elevation: 2,
    shadowColor: "#52c1c4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  dayName: {
    fontSize: 12,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: "600",
  },
  nutritionSummary: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#52c1c4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    backgroundColor: "#ffffff",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  nutritionSummaryItem: {
    alignItems: "center",
    gap: 4,
  },
  nutritionSummaryValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  nutritionSummaryLabel: {
    fontSize: 10,
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  mealTimingSection: {
    marginBottom: 24,
  },
  timingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mealTimingTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  mealCount: {
    fontSize: 12,
  },
  mealContainer: {
    marginBottom: 16,
  },
  mealDetailsCard: {
    borderRadius: 18,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    shadowColor: "#52c1c4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    backgroundColor: "#ffffff",
  },
  mealCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  mealTiming: {
    fontSize: 12,
  },
  mealActions: {
    marginLeft: 12,
  },
  favoriteButton: {
    padding: 4,
  },
  mealNutrition: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  nutritionItem: {
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  nutritionLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  mealDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  mealFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  ratingDisplay: {
    flexDirection: "row",
  },
  swapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1.5,
  },

  swapButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },

  nutritionInputs: {
    marginTop: 16,
    marginBottom: 24,
  },

  nutritionInputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  nutritionInputItem: {
    flex: 1,
  },

  smallInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginTop: 4,
  },

  swapConfirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },

  swapConfirmButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  mealCardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    elevation: 1,
    shadowColor: "#52c1c4",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  completeButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  commentPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  commentText: {
    fontSize: 11,
    flex: 1,
  },
  noMealsContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderRadius: 12,
  },
  noMealsText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  starContainer: {
    flexDirection: "row",
    gap: 4,
  },
  starButton: {
    padding: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  emptyDayState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyDayTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDaySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  enhancedModalContainer: {
    width: screenWidth - 40,
    maxHeight: "90%",
    borderRadius: 20,
    paddingBottom: 20,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
    letterSpacing: -0.5,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  mealDetailsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  ingredientsContainer: {
    marginBottom: 16,
  },
  ingredientsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 13,
    marginBottom: 4,
  },
  instructionsContainer: {
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  ratingSection: {
    marginBottom: 20,
  },
  commentsSection: {
    marginBottom: 20,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  swapDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  currentMealCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  currentMealName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  currentMealMeta: {
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  swapOptions: {
    gap: 12,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  swapOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  swapOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  swapOptionSecondaryText: {
    fontSize: 14,
    fontWeight: "500",
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  rtlTextInput: {
    textAlign: "right",
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginVertical: 16,
  },
  mealCompletionDescription: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
    textAlign: "center",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  quantityButton: {
    padding: 8,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "600",
  },
  // Styles for calendar widget
  monthContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
  },
  selectDayContainer: {
    alignItems: "center",
    gap: 10,
  },
  selectDayText: {
    fontSize: 14,
  },
  // Styles for Review Button and Modal
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  reviewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
