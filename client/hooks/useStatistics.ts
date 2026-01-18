import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/src/services/api";
import { StatisticsData } from "@/src/store/calendarSlice";
import {
  UserQuestionnaire,
  NutritionMetric,
  ProgressData,
  Achievement,
} from "@/src/types/statistics";

export type TimePeriod = "today" | "week" | "month";

interface StatisticsState {
  statisticsData: StatisticsData | null;
  userQuestionnaire: UserQuestionnaire | null;
  metrics: NutritionMetric[];
  weeklyData: ProgressData[];
  achievements: Achievement[];
  aiRecommendations: any[];
  isLoading: boolean;
  isLoadingRecommendations: boolean;
  error: string | null;
}

interface ProgressStats {
  totalDays: number;
  successfulDays: number;
  averageCompletion: number;
  bestStreak: number;
  currentStreak: number;
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    water: number;
  };
}

interface GamificationStats {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalPoints: number;
  dailyStreak: number;
  weeklyStreak: number;
  perfectDays: number;
  xpToNext: number;
  xpProgress: number;
}

const getRarityColor = (rarity: string): string => {
  switch (rarity.toUpperCase()) {
    case "LEGENDARY": return "#F59E0B";
    case "EPIC": return "#8B5CF6";
    case "RARE": return "#3B82F6";
    case "UNCOMMON": return "#F97316";
    case "COMMON":
    default: return "#10B981";
  }
};

export function useStatistics(initialPeriod: TimePeriod = "week") {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(initialPeriod);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<StatisticsState>({
    statisticsData: null,
    userQuestionnaire: null,
    metrics: [],
    weeklyData: [],
    achievements: [],
    aiRecommendations: [],
    isLoading: true,
    isLoadingRecommendations: false,
    error: null,
  });

  // Fetch achievements
  const fetchAchievements = useCallback(async () => {
    try {
      const response = await api.get("/statistics/achievements");
      if (response.data.success && response.data.data) {
        const achievements = response.data.data.map((achievement: any) => ({
          id: achievement.id,
          title: achievement.title || { en: "Achievement", he: "הישג" },
          description: achievement.description || { en: "Description", he: "תיאור" },
          icon: achievement.icon || "trophy",
          color: getRarityColor(achievement.rarity || "COMMON"),
          progress: achievement.progress || 0,
          maxProgress: achievement.max_progress || 1,
          unlocked: achievement.unlocked || false,
          category: achievement.category || "MILESTONE",
          xpReward: achievement.xpReward || 0,
          rarity: achievement.rarity || "COMMON",
          unlockedDate: achievement.unlockedDate,
        }));
        setState(prev => ({ ...prev, achievements }));
        return achievements;
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
      return [];
    }
  }, []);

  // Fetch AI recommendations
  const fetchAIRecommendations = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingRecommendations: true }));
    try {
      const response = await api.get("/recommendations");
      if (response.data.success && Array.isArray(response.data.data)) {
        const recommendations = response.data.data.map((rec: any) => ({
          id: rec.id,
          date: rec.date,
          created_at: rec.created_at,
          is_read: rec.is_read,
          recommendations: rec.recommendations,
          priority_level: rec.priority_level,
          confidence_score: rec.confidence_score,
          based_on: rec.based_on,
          user_id: rec.user_id,
        }));
        setState(prev => ({ ...prev, aiRecommendations: recommendations }));
        return recommendations;
      }
      setState(prev => ({ ...prev, aiRecommendations: [] }));
      return [];
    } catch (error) {
      console.error("Failed to fetch AI recommendations:", error);
      setState(prev => ({ ...prev, aiRecommendations: [] }));
      return [];
    } finally {
      setState(prev => ({ ...prev, isLoadingRecommendations: false }));
    }
  }, []);

  // Fetch main statistics
  const fetchStatistics = useCallback(async (period: TimePeriod) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [statisticsResponse, questionnaireResponse] = await Promise.all([
        api.get(`/statistics?period=${period}`),
        api.get("/questionnaire"),
      ]);

      // Also fetch recommendations in the background
      fetchAIRecommendations();

      let statisticsData: StatisticsData | null = null;
      let userQuestionnaire: UserQuestionnaire | null = null;

      if (statisticsResponse.data.success && statisticsResponse.data.data) {
        statisticsData = statisticsResponse.data.data;
      }

      if (questionnaireResponse.data.success && questionnaireResponse.data.data) {
        const qData = questionnaireResponse.data.data;
        let mealsPerDay = 3;
        if (qData.meals_per_day) {
          const cleanedMeals = qData.meals_per_day.toString().replace(/[^0-9]/g, "");
          mealsPerDay = parseInt(cleanedMeals) || 3;
        }

        userQuestionnaire = {
          mealsPerDay,
          dailyCalories: qData.daily_calories || 2000,
          dailyProtein: qData.daily_protein || 120,
          dailyCarbs: qData.daily_carbs || 250,
          dailyFats: qData.daily_fats || 70,
          dailyFiber: qData.daily_fiber || 25,
          dailyWater: qData.daily_water || 2500,
        };
      }

      setState(prev => ({
        ...prev,
        statisticsData,
        userQuestionnaire,
        isLoading: false,
        error: statisticsData ? null : "No statistics data available",
      }));

      return { statisticsData, userQuestionnaire };
    } catch (err: any) {
      console.error("Error fetching statistics:", err);
      const errorMessage = err.response?.data?.message || "Failed to load statistics data";
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { statisticsData: null, userQuestionnaire: null };
    }
  }, [fetchAIRecommendations]);

  // Generate nutrition metrics
  const generateMetrics = useCallback((
    statisticsData: StatisticsData,
    userQuestionnaire: UserQuestionnaire,
    t: (key: string) => string,
    language: string
  ): NutritionMetric[] => {
    const calculateTrend = (current: number, target: number): "up" | "down" | "stable" => {
      const ratio = current / target;
      if (ratio > 1.1) return "up";
      if (ratio < 0.9) return "down";
      return "stable";
    };

    const baseData = [
      {
        id: "calories",
        name: t("statistics.total_calories") || "Total Calories",
        nameEn: "Calories",
        value: statisticsData.averageCalories || 0,
        target: userQuestionnaire.dailyCalories,
        unit: "kcal",
        color: "#EF4444",
        category: "macros" as const,
        description: language === "he" ? "צריכת קלוריות יומית" : "Daily calorie intake",
        trend: calculateTrend(statisticsData.averageCalories || 0, userQuestionnaire.dailyCalories),
      },
      {
        id: "protein",
        name: t("statistics.protein") || "Protein",
        nameEn: "Protein",
        value: statisticsData.averageProtein || 0,
        target: userQuestionnaire.dailyProtein,
        unit: "g",
        color: "#8B5CF6",
        category: "macros" as const,
        description: language === "he" ? "חלבון לבניית שרירים" : "Protein for muscles",
        trend: calculateTrend(statisticsData.averageProtein || 0, userQuestionnaire.dailyProtein),
      },
      {
        id: "carbs",
        name: t("statistics.carbohydrates") || "Carbs",
        nameEn: "Carbs",
        value: statisticsData.averageCarbs || 0,
        target: userQuestionnaire.dailyCarbs,
        unit: "g",
        color: "#F59E0B",
        category: "macros" as const,
        description: language === "he" ? "פחמימות לאנרגיה" : "Carbs for energy",
        trend: calculateTrend(statisticsData.averageCarbs || 0, userQuestionnaire.dailyCarbs),
      },
      {
        id: "fats",
        name: t("statistics.fats") || "Fats",
        nameEn: "Fats",
        value: statisticsData.averageFats || 0,
        target: userQuestionnaire.dailyFats,
        unit: "g",
        color: "#10B981",
        category: "macros" as const,
        description: language === "he" ? "שומנים בריאים" : "Healthy fats",
        trend: calculateTrend(statisticsData.averageFats || 0, userQuestionnaire.dailyFats),
      },
      {
        id: "fiber",
        name: t("statistics.fiber") || "Fiber",
        nameEn: "Fiber",
        value: statisticsData.averageFiber || 0,
        target: userQuestionnaire.dailyFiber,
        unit: "g",
        color: "#22C55E",
        category: "micros" as const,
        description: language === "he" ? "סיבים תזונתיים" : "Dietary fiber",
        trend: calculateTrend(statisticsData.averageFiber || 0, userQuestionnaire.dailyFiber),
      },
      {
        id: "water",
        name: t("statistics.hydration") || "Water",
        nameEn: "Water",
        value: statisticsData.averageFluids || 0,
        target: userQuestionnaire.dailyWater,
        unit: "ml",
        color: "#3B82F6",
        category: "hydration" as const,
        description: language === "he" ? "צריכת נוזלים" : "Fluid intake",
        trend: calculateTrend(statisticsData.averageFluids || 0, userQuestionnaire.dailyWater),
      },
    ];

    return baseData.map((metric) => {
      const percentage = metric.target > 0 ? (metric.value / metric.target) * 100 : 0;
      let status: "excellent" | "good" | "warning" | "danger" = "danger";

      if (metric.id === "calories") {
        if (percentage >= 90 && percentage <= 110) status = "excellent";
        else if (percentage >= 80 && percentage <= 120) status = "good";
        else if (percentage >= 70 && percentage <= 130) status = "warning";
      } else {
        if (percentage >= 90) status = "excellent";
        else if (percentage >= 75) status = "good";
        else if (percentage >= 50) status = "warning";
      }

      return { ...metric, percentage: Math.round(percentage), status };
    });
  }, []);

  // Generate weekly data
  const generateWeeklyData = useCallback((
    statisticsData: StatisticsData,
    userQuestionnaire: UserQuestionnaire
  ): ProgressData[] => {
    if (!statisticsData?.dailyBreakdown || statisticsData.dailyBreakdown.length === 0) {
      return [];
    }

    return statisticsData.dailyBreakdown.map((day: any) => ({
      date: day.date,
      calories: day.calories || 0,
      protein: day.protein_g || 0,
      carbs: day.carbs_g || 0,
      fats: day.fats_g || 0,
      water: day.liquids_ml || 0,
      weight: day.weight_kg,
      mood: (day.mood as "happy" | "neutral" | "sad") || "neutral",
      energy: (day.energy as "high" | "medium" | "low") || "medium",
      satiety: (day.satiety as "very_full" | "satisfied" | "hungry") || "satisfied",
      mealQuality: day.meal_quality || 3,
      mealsCount: day.meals_count || 0,
      requiredMeals: userQuestionnaire.mealsPerDay,
    }));
  }, []);

  // Calculate progress stats
  const progressStats = useMemo((): ProgressStats => {
    if (!state.statisticsData) {
      return {
        totalDays: 0,
        successfulDays: 0,
        averageCompletion: 0,
        bestStreak: 0,
        currentStreak: 0,
        averages: { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0 },
      };
    }

    return {
      totalDays: state.statisticsData.totalDays || 0,
      successfulDays: state.statisticsData.successfulDays || 0,
      averageCompletion: Math.round(state.statisticsData.averageCompletion || 0),
      bestStreak: state.statisticsData.bestStreak || 0,
      currentStreak: state.statisticsData.currentStreak || 0,
      averages: {
        calories: Math.round(state.statisticsData.averageCalories || 0),
        protein: Math.round(state.statisticsData.averageProtein || 0),
        carbs: Math.round(state.statisticsData.averageCarbs || 0),
        fats: Math.round(state.statisticsData.averageFats || 0),
        water: Math.round(state.statisticsData.averageFluids || 0),
      },
    };
  }, [state.statisticsData]);

  // Calculate gamification stats - use server's level if available
  const gamificationStats = useMemo((): GamificationStats => {
    if (!state.statisticsData) {
      return {
        level: 1,
        currentXP: 0,
        nextLevelXP: 1000,
        totalPoints: 0,
        dailyStreak: 0,
        weeklyStreak: 0,
        perfectDays: 0,
        xpToNext: 1000,
        xpProgress: 0,
      };
    }

    const totalPoints = state.statisticsData.totalPoints || 0;
    // Use server's level if available, otherwise calculate from totalPoints
    const serverLevel = state.statisticsData.level;
    const calculatedLevel = Math.max(1, Math.floor(totalPoints / 1000) + 1);
    const level = serverLevel && serverLevel > 0 ? serverLevel : calculatedLevel;

    // Calculate XP progress within current level
    // Each level requires 1000 XP, so currentXP is the progress within the current level
    const xpRequiredForCurrentLevel = (level - 1) * 1000;
    const currentXP = Math.max(0, totalPoints - xpRequiredForCurrentLevel);
    const nextLevelXP = 1000;

    // Use server's currentXP if available (for more accurate display)
    const displayCurrentXP = state.statisticsData.currentXP !== undefined
      ? state.statisticsData.currentXP
      : currentXP;

    return {
      level,
      currentXP: displayCurrentXP,
      nextLevelXP,
      totalPoints,
      dailyStreak: state.statisticsData.currentStreak || 0,
      weeklyStreak: state.statisticsData.weeklyStreak || 0,
      perfectDays: state.statisticsData.perfectDays || 0,
      xpToNext: Math.max(0, nextLevelXP - displayCurrentXP),
      xpProgress: Math.min(100, (displayCurrentXP / nextLevelXP) * 100),
    };
  }, [state.statisticsData]);

  // Handle period change
  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchStatistics(selectedPeriod);
      await fetchAchievements();
    } finally {
      setRefreshing(false);
    }
  }, [selectedPeriod, fetchStatistics, fetchAchievements]);

  // Initial fetch
  useEffect(() => {
    fetchStatistics(selectedPeriod);
  }, [selectedPeriod, fetchStatistics]);

  // Update metrics when data changes
  const updateMetrics = useCallback((
    t: (key: string) => string,
    language: string
  ) => {
    if (state.statisticsData && state.userQuestionnaire) {
      const metrics = generateMetrics(state.statisticsData, state.userQuestionnaire, t, language);
      const weeklyData = generateWeeklyData(state.statisticsData, state.userQuestionnaire);
      setState(prev => ({ ...prev, metrics, weeklyData }));
    }
  }, [state.statisticsData, state.userQuestionnaire, generateMetrics, generateWeeklyData]);

  return {
    // State
    ...state,
    selectedPeriod,
    refreshing,
    progressStats,
    gamificationStats,

    // Actions
    setSelectedPeriod: handlePeriodChange,
    refresh: handleRefresh,
    fetchStatistics,
    fetchAchievements,
    fetchAIRecommendations,
    updateMetrics,

    // Computed
    hasData: !!state.statisticsData,
    categorizedMetrics: {
      macros: state.metrics.filter(m => m.category === "macros"),
      micros: state.metrics.filter(m => m.category === "micros"),
      hydration: state.metrics.filter(m => m.category === "hydration"),
    },
  };
}
