import { prisma } from "../lib/database";

/**
 * Comprehensive User Context Service
 * Gathers all user data for intelligent AI personalization
 */

// Cache for user context to avoid repeated DB queries
const contextCache = new Map<string, { data: ComprehensiveUserContext; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export interface NutritionGoals {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFats: number;
  dailyFiber: number;
  dailyWater: number;
  mealsPerDay: number;
}

export interface UserProfile {
  userId: string;
  age: number;
  gender: string;
  weight: number;
  height: number;
  targetWeight: number;
  mainGoal: string;
  secondaryGoal: string | null;
  activityLevel: string;
  dietaryStyle: string;
  allergies: string[];
  medicalConditions: string[];
  likedFoods: string[];
  dislikedFoods: string[];
  cookingPreference: string;
  availableCookingMethods: string[];
  dailyBudget: number;
  kosher: boolean;
  subscriptionTier: string;
}

export interface PerformanceMetrics {
  // Daily averages
  avgDailyCalories: number;
  avgDailyProtein: number;
  avgDailyCarbs: number;
  avgDailyFats: number;
  avgDailyWater: number;

  // Goal achievement
  calorieGoalAchievementRate: number;
  proteinGoalAchievementRate: number;
  waterGoalAchievementRate: number;
  overallGoalAchievementRate: number;

  // Patterns
  avgMealsPerDay: number;
  consistencyScore: number;
  bestPerformingDayOfWeek: string;
  worstPerformingDayOfWeek: string;

  // Trends
  caloriesTrend: "increasing" | "stable" | "decreasing";
  proteinTrend: "increasing" | "stable" | "decreasing";
  weightTrend: "gaining" | "stable" | "losing";
}

export interface StreakData {
  currentDailyStreak: number;
  longestDailyStreak: number;
  currentWeeklyStreak: number;
  perfectDays: number;
  totalActiveDays: number;
  lastActiveDate: string | null;
}

export interface AchievementData {
  totalUnlocked: number;
  totalAvailable: number;
  recentlyUnlocked: string[];
  nearCompletion: Array<{ name: string; progress: number; required: number }>;
  totalXPEarned: number;
  currentLevel: number;
}

export interface MealPatterns {
  preferredMealTimes: { breakfast: string; lunch: string; dinner: string };
  preferredBreakfastTime: string;
  preferredLunchTime: string;
  preferredDinnerTime: string;
  frequentFoods: Array<{ name: string; count: number; avgCalories: number }>;
  frequentMealTypes: Array<{ type: string; count: number }>;
  avgCaloriesPerMeal: { breakfast: number; lunch: number; dinner: number; snack: number };
  mostCommonProteins: string[];
  mostCommonCarbs: string[];
  averageMealsPerDay: number;
  proteinSourcesUsed: string[];
  carbSourcesUsed: string[];
  vegetablesConsumed: string[];
}

export interface RecentActivity {
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFats: number;
  todayWater: number;
  todayMealsCount: number;
  lastMealTime: string | null;
  remainingCalories: number;
  remainingProtein: number;
  remainingWater: number;
}

export interface HealthInsights {
  bmiCategory: string;
  estimatedBMR: number;
  estimatedTDEE: number;
  recommendedDeficitOrSurplus: number;
  hydrationStatus: "low" | "adequate" | "good" | "excellent";
  proteinIntakeStatus: "low" | "adequate" | "optimal" | "high";
  fiberIntakeStatus: "low" | "adequate" | "good";
}

export interface ComprehensiveUserContext {
  profile: UserProfile;
  goals: NutritionGoals;
  performance: PerformanceMetrics;
  streaks: StreakData;
  achievements: AchievementData;
  mealPatterns: MealPatterns;
  recentActivity: RecentActivity;
  healthInsights: HealthInsights;
  contextTimestamp: string;
  dataCompleteness: number; // 0-100 score of how much data we have
}

export class UserContextService {
  /**
   * Get comprehensive user context for AI personalization
   * Uses caching to improve performance
   */
  static async getComprehensiveContext(
    userId: string,
    forceRefresh = false
  ): Promise<ComprehensiveUserContext> {
    // Check cache first
    if (!forceRefresh) {
      const cached = contextCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
    }

    console.log(`📊 Building comprehensive context for user: ${userId}`);
    const startTime = Date.now();

    try {
      // Fetch all data in parallel for speed
      const [
        profile,
        goals,
        performance,
        streaks,
        achievements,
        mealPatterns,
        recentActivity,
      ] = await Promise.all([
        this.getUserProfile(userId),
        this.getNutritionGoals(userId),
        this.getPerformanceMetrics(userId),
        this.getStreakData(userId),
        this.getAchievementData(userId),
        this.getMealPatterns(userId),
        this.getRecentActivity(userId),
      ]);

      // Calculate health insights based on profile
      const healthInsights = this.calculateHealthInsights(profile, goals, performance);

      // Calculate data completeness score
      const dataCompleteness = this.calculateDataCompleteness({
        profile,
        goals,
        performance,
        mealPatterns,
      });

      const context: ComprehensiveUserContext = {
        profile,
        goals,
        performance,
        streaks,
        achievements,
        mealPatterns,
        recentActivity,
        healthInsights,
        contextTimestamp: new Date().toISOString(),
        dataCompleteness,
      };

      // Cache the result
      contextCache.set(userId, { data: context, timestamp: Date.now() });

      console.log(`✅ Context built in ${Date.now() - startTime}ms (completeness: ${dataCompleteness}%)`);
      return context;
    } catch (error) {
      console.error("Error building user context:", error);
      return this.getMinimalContext(userId);
    }
  }

  /**
   * Get user profile from questionnaire and user data
   */
  private static async getUserProfile(userId: string): Promise<UserProfile> {
    const [user, questionnaire] = await Promise.all([
      prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          subscription_type: true,
        },
      }),
      prisma.userQuestionnaire.findFirst({
        where: { user_id: userId },
        orderBy: { date_completed: "desc" },
      }),
    ]);

    return {
      userId,
      age: questionnaire?.age || 30,
      gender: questionnaire?.gender || "unknown",
      weight: questionnaire?.weight_kg || 70,
      height: questionnaire?.height_cm || 170,
      targetWeight: questionnaire?.target_weight_kg || questionnaire?.weight_kg || 70,
      mainGoal: questionnaire?.main_goal || "MAINTAIN_WEIGHT",
      secondaryGoal: questionnaire?.specific_goal?.[0] || null,
      activityLevel: questionnaire?.physical_activity_level || "MODERATE",
      dietaryStyle: questionnaire?.dietary_style || "Regular",
      allergies: (questionnaire?.allergies as string[]) || [],
      medicalConditions: (questionnaire?.medical_conditions as string[]) || [],
      likedFoods: (questionnaire?.liked_foods as string[]) || [],
      dislikedFoods: (questionnaire?.disliked_foods as string[]) || [],
      cookingPreference: questionnaire?.cooking_preference || "MIXED",
      availableCookingMethods: (questionnaire?.available_cooking_methods as string[]) || [],
      dailyBudget: questionnaire?.daily_food_budget || 50,
      kosher: questionnaire?.kosher || false,
      subscriptionTier: user?.subscription_type || "FREE",
    };
  }

  /**
   * Get user's nutrition goals from NutritionPlan
   */
  private static async getNutritionGoals(userId: string): Promise<NutritionGoals> {
    const [nutritionPlan, questionnaire] = await Promise.all([
      prisma.nutritionPlan.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
      }),
      prisma.userQuestionnaire.findFirst({
        where: { user_id: userId },
        orderBy: { date_completed: "desc" },
        select: {
          meals_per_day: true,
        },
      }),
    ]);

    // Calculate water goal based on weight (30ml per kg of body weight is common recommendation)
    const userWeight = await prisma.userQuestionnaire.findFirst({
      where: { user_id: userId },
      orderBy: { date_completed: "desc" },
      select: { weight_kg: true },
    });
    const estimatedWaterGoal = Math.round((userWeight?.weight_kg || 70) * 30);

    return {
      dailyCalories: nutritionPlan?.goal_calories || 2000,
      dailyProtein: nutritionPlan?.goal_protein_g || 120,
      dailyCarbs: nutritionPlan?.goal_carbs_g || 250,
      dailyFats: nutritionPlan?.goal_fats_g || 70,
      dailyFiber: 25, // Default fiber recommendation
      dailyWater: estimatedWaterGoal || 2500,
      mealsPerDay: this.parseMealsPerDay(questionnaire?.meals_per_day),
    };
  }

  /**
   * Get performance metrics from last 30 days
   */
  private static async getPerformanceMetrics(userId: string): Promise<PerformanceMetrics> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [meals, waterIntake, goals, nutritionPlan, questionnaire] = await Promise.all([
      prisma.meal.findMany({
        where: {
          user_id: userId,
          created_at: { gte: thirtyDaysAgo },
        },
        select: {
          calories: true,
          protein_g: true,
          carbs_g: true,
          fats_g: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.waterIntake.findMany({
        where: {
          user_id: userId,
          date: { gte: thirtyDaysAgo },
        },
        select: {
          cups_consumed: true,
          date: true,
        },
      }),
      prisma.dailyGoal.findMany({
        where: {
          user_id: userId,
          date: { gte: thirtyDaysAgo },
        },
      }),
      prisma.nutritionPlan.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
      }),
      prisma.userQuestionnaire.findFirst({
        where: { user_id: userId },
        orderBy: { date_completed: "desc" },
        select: {
          weight_kg: true,
        },
      }),
    ]);

    // Calculate daily aggregates
    const dailyData = this.aggregateMealsByDay(meals);
    const activeDays = Object.keys(dailyData).length || 1;

    // Calculate averages
    const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const totalProtein = meals.reduce((sum, m) => sum + (m.protein_g || 0), 0);
    const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs_g || 0), 0);
    const totalFats = meals.reduce((sum, m) => sum + (m.fats_g || 0), 0);
    const totalWater = waterIntake.reduce((sum, w) => sum + (w.cups_consumed || 0) * 250, 0);

    const avgDailyCalories = totalCalories / activeDays;
    const avgDailyProtein = totalProtein / activeDays;
    const avgDailyCarbs = totalCarbs / activeDays;
    const avgDailyFats = totalFats / activeDays;
    const avgDailyWater = totalWater / activeDays;

    // Goal achievement rates from NutritionPlan
    const targetCalories = nutritionPlan?.goal_calories || 2000;
    const targetProtein = nutritionPlan?.goal_protein_g || 120;
    const estimatedWaterTarget = Math.round((questionnaire?.weight_kg || 70) * 30);
    const targetWater = estimatedWaterTarget || 2500;

    const calorieGoalAchievementRate = this.calculateGoalAchievement(dailyData, targetCalories, "calories");
    const proteinGoalAchievementRate = this.calculateGoalAchievement(dailyData, targetProtein, "protein");
    const waterGoalAchievementRate = avgDailyWater / targetWater;

    // Day of week patterns
    const dayPatterns = this.analyzeDayOfWeekPatterns(dailyData);

    // Trends (compare last 7 days to previous 7 days)
    const recentMeals = meals.filter(m => m.created_at >= sevenDaysAgo);
    const olderMeals = meals.filter(m => m.created_at < sevenDaysAgo && m.created_at >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000));

    const recentAvgCal = recentMeals.reduce((s, m) => s + (m.calories || 0), 0) / Math.max(recentMeals.length, 1);
    const olderAvgCal = olderMeals.reduce((s, m) => s + (m.calories || 0), 0) / Math.max(olderMeals.length, 1);

    return {
      avgDailyCalories: Math.round(avgDailyCalories),
      avgDailyProtein: Math.round(avgDailyProtein),
      avgDailyCarbs: Math.round(avgDailyCarbs),
      avgDailyFats: Math.round(avgDailyFats),
      avgDailyWater: Math.round(avgDailyWater),
      calorieGoalAchievementRate: Math.min(calorieGoalAchievementRate, 1.5),
      proteinGoalAchievementRate: Math.min(proteinGoalAchievementRate, 1.5),
      waterGoalAchievementRate: Math.min(waterGoalAchievementRate, 1.5),
      overallGoalAchievementRate: (calorieGoalAchievementRate + proteinGoalAchievementRate + waterGoalAchievementRate) / 3,
      avgMealsPerDay: meals.length / activeDays,
      consistencyScore: this.calculateConsistency(dailyData),
      bestPerformingDayOfWeek: dayPatterns.best,
      worstPerformingDayOfWeek: dayPatterns.worst,
      caloriesTrend: this.determineTrend(recentAvgCal, olderAvgCal),
      proteinTrend: this.determineTrend(
        recentMeals.reduce((s, m) => s + (m.protein_g || 0), 0) / Math.max(recentMeals.length, 1),
        olderMeals.reduce((s, m) => s + (m.protein_g || 0), 0) / Math.max(olderMeals.length, 1)
      ),
      weightTrend: "stable", // Would need weight tracking data
    };
  }

  /**
   * Get streak data
   */
  private static async getStreakData(userId: string): Promise<StreakData> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const meals = await prisma.meal.findMany({
      where: {
        user_id: userId,
        created_at: { gte: thirtyDaysAgo },
      },
      select: { created_at: true },
      orderBy: { created_at: "desc" },
    });

    // Get unique dates with meals
    const datesWithMeals = new Set(
      meals.map(m => m.created_at.toISOString().split("T")[0])
    );

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = new Date();
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (datesWithMeals.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (checkDate.toDateString() === new Date().toDateString()) {
        // Today hasn't had meals yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
      if (currentStreak > 30) break; // Safety limit
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDates = Array.from(datesWithMeals).sort();

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      currentDailyStreak: currentStreak,
      longestDailyStreak: longestStreak,
      currentWeeklyStreak: Math.floor(currentStreak / 7),
      perfectDays: datesWithMeals.size,
      totalActiveDays: datesWithMeals.size,
      lastActiveDate: sortedDates[sortedDates.length - 1] || null,
    };
  }

  /**
   * Get achievement data
   */
  private static async getAchievementData(userId: string): Promise<AchievementData> {
    const achievements = await prisma.userAchievement.findMany({
      where: { user_id: userId },
      include: { achievement: true },
    });

    const allAchievements = await prisma.achievement.findMany();

    const unlockedAchievements = achievements.filter(a => a.unlocked);
    const recentlyUnlocked = unlockedAchievements
      .filter(a => {
        const unlockDate = a.unlocked_date;
        if (!unlockDate) return false;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return unlockDate >= sevenDaysAgo;
      })
      .map(a => a.achievement?.title || "Achievement");

    const nearCompletion = achievements
      .filter(a => !a.unlocked && a.progress > 0)
      .map(a => ({
        name: a.achievement?.title || "Achievement",
        progress: a.progress,
        required: a.achievement?.max_progress || 1,
      }))
      .filter(a => a.progress / a.required >= 0.7)
      .slice(0, 5);

    const totalXP = unlockedAchievements.reduce((sum, a) => sum + (a.achievement?.points_awarded || 0), 0);

    return {
      totalUnlocked: unlockedAchievements.length,
      totalAvailable: allAchievements.length,
      recentlyUnlocked,
      nearCompletion,
      totalXPEarned: totalXP,
      currentLevel: Math.floor(totalXP / 1000) + 1,
    };
  }

  /**
   * Get meal patterns from history
   */
  private static async getMealPatterns(userId: string): Promise<MealPatterns> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const meals = await prisma.meal.findMany({
      where: {
        user_id: userId,
        created_at: { gte: thirtyDaysAgo },
      },
      select: {
        meal_name: true,
        calories: true,
        protein_g: true,
        meal_period: true,
        created_at: true,
        ingredients: true,
      },
    });

    // Analyze meal times
    const mealTimes = { breakfast: [] as string[], lunch: [] as string[], dinner: [] as string[] };
    const mealCalories = { breakfast: [] as number[], lunch: [] as number[], dinner: [] as number[], snack: [] as number[] };
    const foodFrequency = new Map<string, { count: number; totalCalories: number }>();
    const mealTypeFrequency = new Map<string, number>();

    for (const meal of meals) {
      const hour = meal.created_at.getHours();
      const timeStr = `${hour}:00`;
      const period = meal.meal_period?.toLowerCase() || this.inferMealPeriod(hour);

      if (period === "breakfast") {
        mealTimes.breakfast.push(timeStr);
        mealCalories.breakfast.push(meal.calories || 0);
      } else if (period === "lunch") {
        mealTimes.lunch.push(timeStr);
        mealCalories.lunch.push(meal.calories || 0);
      } else if (period === "dinner") {
        mealTimes.dinner.push(timeStr);
        mealCalories.dinner.push(meal.calories || 0);
      } else {
        mealCalories.snack.push(meal.calories || 0);
      }

      // Track food frequency
      if (meal.meal_name) {
        const existing = foodFrequency.get(meal.meal_name) || { count: 0, totalCalories: 0 };
        existing.count++;
        existing.totalCalories += meal.calories || 0;
        foodFrequency.set(meal.meal_name, existing);
      }

      // Track meal type frequency
      if (period) {
        mealTypeFrequency.set(period, (mealTypeFrequency.get(period) || 0) + 1);
      }
    }

    // Calculate averages and sort
    const frequentFoods = Array.from(foodFrequency.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgCalories: Math.round(data.totalCalories / data.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const frequentMealTypes = Array.from(mealTypeFrequency.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const preferredBreakfastTime = this.getMostFrequent(mealTimes.breakfast) || "08:00";
    const preferredLunchTime = this.getMostFrequent(mealTimes.lunch) || "13:00";
    const preferredDinnerTime = this.getMostFrequent(mealTimes.dinner) || "19:00";

    // Extract common proteins and carbs from frequent foods
    const proteinKeywords = ["chicken", "beef", "fish", "salmon", "tuna", "eggs", "tofu", "turkey", "pork", "lamb", "shrimp"];
    const carbKeywords = ["rice", "pasta", "bread", "potato", "quinoa", "oats", "tortilla", "couscous", "noodles"];

    const mostCommonProteins = frequentFoods
      .map(f => f.name.toLowerCase())
      .filter(name => proteinKeywords.some(kw => name.includes(kw)))
      .slice(0, 5);

    const mostCommonCarbs = frequentFoods
      .map(f => f.name.toLowerCase())
      .filter(name => carbKeywords.some(kw => name.includes(kw)))
      .slice(0, 5);

    // Calculate average meals per day
    const uniqueDays = new Set(meals.map(m => m.created_at.toISOString().split("T")[0]));
    const averageMealsPerDay = uniqueDays.size > 0 ? meals.length / uniqueDays.size : 0;

    return {
      preferredMealTimes: {
        breakfast: preferredBreakfastTime,
        lunch: preferredLunchTime,
        dinner: preferredDinnerTime,
      },
      preferredBreakfastTime,
      preferredLunchTime,
      preferredDinnerTime,
      frequentFoods,
      frequentMealTypes,
      avgCaloriesPerMeal: {
        breakfast: this.average(mealCalories.breakfast),
        lunch: this.average(mealCalories.lunch),
        dinner: this.average(mealCalories.dinner),
        snack: this.average(mealCalories.snack),
      },
      mostCommonProteins,
      mostCommonCarbs,
      averageMealsPerDay: Math.round(averageMealsPerDay * 10) / 10,
      proteinSourcesUsed: mostCommonProteins,
      carbSourcesUsed: mostCommonCarbs,
      vegetablesConsumed: [],
    };
  }

  /**
   * Get today's activity and remaining goals
   */
  private static async getRecentActivity(userId: string): Promise<RecentActivity> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayMeals, todayWater, nutritionPlan, questionnaire] = await Promise.all([
      prisma.meal.findMany({
        where: {
          user_id: userId,
          created_at: { gte: today },
        },
        select: {
          calories: true,
          protein_g: true,
          carbs_g: true,
          fats_g: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.waterIntake.findFirst({
        where: {
          user_id: userId,
          date: { gte: today },
        },
      }),
      prisma.nutritionPlan.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
      }),
      prisma.userQuestionnaire.findFirst({
        where: { user_id: userId },
        orderBy: { date_completed: "desc" },
        select: {
          weight_kg: true,
        },
      }),
    ]);

    const todayCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const todayProtein = todayMeals.reduce((sum, m) => sum + (m.protein_g || 0), 0);
    const todayCarbs = todayMeals.reduce((sum, m) => sum + (m.carbs_g || 0), 0);
    const todayFats = todayMeals.reduce((sum, m) => sum + (m.fats_g || 0), 0);
    const todayWaterAmount = (todayWater?.cups_consumed || 0) * 250;

    const targetCalories = nutritionPlan?.goal_calories || 2000;
    const targetProtein = nutritionPlan?.goal_protein_g || 120;
    const targetWater = Math.round((questionnaire?.weight_kg || 70) * 30) || 2500;

    return {
      todayCalories,
      todayProtein,
      todayCarbs,
      todayFats,
      todayWater: todayWaterAmount,
      todayMealsCount: todayMeals.length,
      lastMealTime: todayMeals[0]?.created_at?.toISOString() || null,
      remainingCalories: Math.max(0, targetCalories - todayCalories),
      remainingProtein: Math.max(0, targetProtein - todayProtein),
      remainingWater: Math.max(0, targetWater - todayWaterAmount),
    };
  }

  /**
   * Calculate health insights based on user data
   */
  private static calculateHealthInsights(
    profile: UserProfile,
    goals: NutritionGoals,
    performance: PerformanceMetrics
  ): HealthInsights {
    // Calculate BMI
    const heightM = profile.height / 100;
    const bmi = profile.weight / (heightM * heightM);
    let bmiCategory: string;
    if (bmi < 18.5) bmiCategory = "underweight";
    else if (bmi < 25) bmiCategory = "normal";
    else if (bmi < 30) bmiCategory = "overweight";
    else bmiCategory = "obese";

    // Calculate BMR (Mifflin-St Jeor)
    let bmr: number;
    if (profile.gender === "male") {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    // Calculate TDEE based on activity level
    const activityMultipliers: Record<string, number> = {
      SEDENTARY: 1.2,
      LIGHTLY_ACTIVE: 1.375,
      LIGHT: 1.375,
      MODERATE: 1.55,
      MODERATELY_ACTIVE: 1.55,
      VERY_ACTIVE: 1.725,
      HIGH: 1.725,
      EXTREMELY_ACTIVE: 1.9,
    };
    const tdee = bmr * (activityMultipliers[profile.activityLevel] || 1.55);

    // Recommended deficit/surplus based on goal
    let recommendedAdjustment = 0;
    if (profile.mainGoal === "WEIGHT_LOSS" || profile.mainGoal === "LOSE_WEIGHT") {
      recommendedAdjustment = -500; // 500 calorie deficit
    } else if (profile.mainGoal === "WEIGHT_GAIN" || profile.mainGoal === "GAIN_WEIGHT" || profile.mainGoal === "BUILD_MUSCLE") {
      recommendedAdjustment = 300; // 300 calorie surplus
    }

    // Hydration status
    const waterRatio = performance.avgDailyWater / goals.dailyWater;
    let hydrationStatus: "low" | "adequate" | "good" | "excellent";
    if (waterRatio < 0.5) hydrationStatus = "low";
    else if (waterRatio < 0.75) hydrationStatus = "adequate";
    else if (waterRatio < 1) hydrationStatus = "good";
    else hydrationStatus = "excellent";

    // Protein status
    const proteinPerKg = performance.avgDailyProtein / profile.weight;
    let proteinIntakeStatus: "low" | "adequate" | "optimal" | "high";
    if (proteinPerKg < 0.8) proteinIntakeStatus = "low";
    else if (proteinPerKg < 1.2) proteinIntakeStatus = "adequate";
    else if (proteinPerKg < 2) proteinIntakeStatus = "optimal";
    else proteinIntakeStatus = "high";

    // Fiber status (based on 25g daily recommendation)
    const fiberRatio = (performance.avgDailyCarbs * 0.1) / 25; // Rough estimate
    let fiberIntakeStatus: "low" | "adequate" | "good";
    if (fiberRatio < 0.6) fiberIntakeStatus = "low";
    else if (fiberRatio < 0.9) fiberIntakeStatus = "adequate";
    else fiberIntakeStatus = "good";

    return {
      bmiCategory,
      estimatedBMR: Math.round(bmr),
      estimatedTDEE: Math.round(tdee),
      recommendedDeficitOrSurplus: recommendedAdjustment,
      hydrationStatus,
      proteinIntakeStatus,
      fiberIntakeStatus,
    };
  }

  /**
   * Get minimal context when full context fails
   */
  private static async getMinimalContext(userId: string): Promise<ComprehensiveUserContext> {
    const questionnaire = await prisma.userQuestionnaire.findFirst({
      where: { user_id: userId },
      orderBy: { date_completed: "desc" },
    });

    return {
      profile: {
        userId,
        age: questionnaire?.age || 30,
        gender: questionnaire?.gender || "unknown",
        weight: questionnaire?.weight_kg || 70,
        height: questionnaire?.height_cm || 170,
        targetWeight: questionnaire?.target_weight_kg || 70,
        mainGoal: questionnaire?.main_goal || "MAINTAIN_WEIGHT",
        secondaryGoal: null,
        activityLevel: questionnaire?.physical_activity_level || "MODERATE",
        dietaryStyle: questionnaire?.dietary_style || "Regular",
        allergies: (questionnaire?.allergies as string[]) || [],
        medicalConditions: [],
        likedFoods: [],
        dislikedFoods: [],
        cookingPreference: "MIXED",
        availableCookingMethods: [],
        dailyBudget: 50,
        kosher: false,
        subscriptionTier: "FREE",
      },
      goals: {
        dailyCalories: 2000,
        dailyProtein: 120,
        dailyCarbs: 250,
        dailyFats: 70,
        dailyFiber: 25,
        dailyWater: Math.round((questionnaire?.weight_kg || 70) * 30),
        mealsPerDay: questionnaire?.meals_per_day || 3,
      },
      performance: {
        avgDailyCalories: 0,
        avgDailyProtein: 0,
        avgDailyCarbs: 0,
        avgDailyFats: 0,
        avgDailyWater: 0,
        calorieGoalAchievementRate: 0,
        proteinGoalAchievementRate: 0,
        waterGoalAchievementRate: 0,
        overallGoalAchievementRate: 0,
        avgMealsPerDay: 0,
        consistencyScore: 0,
        bestPerformingDayOfWeek: "Unknown",
        worstPerformingDayOfWeek: "Unknown",
        caloriesTrend: "stable",
        proteinTrend: "stable",
        weightTrend: "stable",
      },
      streaks: {
        currentDailyStreak: 0,
        longestDailyStreak: 0,
        currentWeeklyStreak: 0,
        perfectDays: 0,
        totalActiveDays: 0,
        lastActiveDate: null,
      },
      achievements: {
        totalUnlocked: 0,
        totalAvailable: 0,
        recentlyUnlocked: [],
        nearCompletion: [],
        totalXPEarned: 0,
        currentLevel: 1,
      },
      mealPatterns: {
        preferredMealTimes: { breakfast: "08:00", lunch: "13:00", dinner: "19:00" },
        preferredBreakfastTime: "08:00",
        preferredLunchTime: "13:00",
        preferredDinnerTime: "19:00",
        frequentFoods: [],
        frequentMealTypes: [],
        avgCaloriesPerMeal: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
        mostCommonProteins: [],
        mostCommonCarbs: [],
        averageMealsPerDay: 0,
        proteinSourcesUsed: [],
        carbSourcesUsed: [],
        vegetablesConsumed: [],
      },
      recentActivity: {
        todayCalories: 0,
        todayProtein: 0,
        todayCarbs: 0,
        todayFats: 0,
        todayWater: 0,
        todayMealsCount: 0,
        lastMealTime: null,
        remainingCalories: 2000,
        remainingProtein: 120,
        remainingWater: 2500,
      },
      healthInsights: {
        bmiCategory: "normal",
        estimatedBMR: 1500,
        estimatedTDEE: 2000,
        recommendedDeficitOrSurplus: 0,
        hydrationStatus: "adequate",
        proteinIntakeStatus: "adequate",
        fiberIntakeStatus: "adequate",
      },
      contextTimestamp: new Date().toISOString(),
      dataCompleteness: 10,
    };
  }

  // Helper methods
  private static parseMealsPerDay(value: any): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseInt(value.replace(/[^0-9]/g, ""));
      return isNaN(parsed) ? 3 : parsed;
    }
    return 3;
  }

  private static aggregateMealsByDay(meals: any[]): Record<string, any> {
    const byDay: Record<string, any> = {};
    for (const meal of meals) {
      const date = meal.created_at.toISOString().split("T")[0];
      if (!byDay[date]) {
        byDay[date] = { calories: 0, protein: 0, mealCount: 0 };
      }
      byDay[date].calories += meal.calories || 0;
      byDay[date].protein += meal.protein_g || 0;
      byDay[date].mealCount++;
    }
    return byDay;
  }

  private static calculateGoalAchievement(
    dailyData: Record<string, any>,
    target: number,
    field: string
  ): number {
    const days = Object.values(dailyData);
    if (days.length === 0) return 0;

    const achievedDays = days.filter(d => {
      const value = field === "calories" ? d.calories : d.protein;
      return value >= target * 0.8 && value <= target * 1.2;
    }).length;

    return achievedDays / days.length;
  }

  private static calculateConsistency(dailyData: Record<string, any>): number {
    const days = Object.values(dailyData);
    if (days.length < 2) return 0;

    const avgMeals = days.reduce((sum, d) => sum + d.mealCount, 0) / days.length;
    const consistentDays = days.filter(d => d.mealCount >= avgMeals * 0.7).length;

    return consistentDays / days.length;
  }

  private static analyzeDayOfWeekPatterns(dailyData: Record<string, any>): { best: string; worst: string } {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayScores: Record<string, number[]> = {};

    for (const [dateStr, data] of Object.entries(dailyData)) {
      const dayOfWeek = new Date(dateStr).getDay();
      const dayName = dayNames[dayOfWeek];
      if (!dayScores[dayName]) dayScores[dayName] = [];
      dayScores[dayName].push(data.calories);
    }

    let best = "Unknown";
    let worst = "Unknown";
    let bestAvg = 0;
    let worstAvg = Infinity;

    for (const [day, scores] of Object.entries(dayScores)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg > bestAvg) { bestAvg = avg; best = day; }
      if (avg < worstAvg) { worstAvg = avg; worst = day; }
    }

    return { best, worst };
  }

  private static determineTrend(recent: number, older: number): "increasing" | "stable" | "decreasing" {
    if (older === 0) return "stable";
    const change = (recent - older) / older;
    if (change > 0.1) return "increasing";
    if (change < -0.1) return "decreasing";
    return "stable";
  }

  private static inferMealPeriod(hour: number): string {
    if (hour >= 5 && hour < 11) return "breakfast";
    if (hour >= 11 && hour < 15) return "lunch";
    if (hour >= 17 && hour < 22) return "dinner";
    return "snack";
  }

  private static getMostFrequent(arr: string[]): string | null {
    if (arr.length === 0) return null;
    const counts = new Map<string, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    let maxCount = 0;
    let mostFrequent = arr[0];
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = item;
      }
    }
    return mostFrequent;
  }

  private static average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }

  private static calculateDataCompleteness(data: {
    profile: UserProfile;
    goals: NutritionGoals;
    performance: PerformanceMetrics;
    mealPatterns: MealPatterns;
  }): number {
    let score = 0;

    // Profile completeness (40 points)
    if (data.profile.age > 0) score += 5;
    if (data.profile.weight > 0) score += 5;
    if (data.profile.height > 0) score += 5;
    if (data.profile.mainGoal !== "MAINTAIN_WEIGHT") score += 5;
    if (data.profile.activityLevel !== "MODERATE") score += 5;
    if (data.profile.allergies.length > 0 || data.profile.dietaryStyle !== "Regular") score += 5;
    if (data.profile.likedFoods.length > 0) score += 5;
    if (data.profile.dislikedFoods.length > 0) score += 5;

    // Goals set (20 points)
    if (data.goals.dailyCalories > 0) score += 10;
    if (data.goals.dailyProtein > 0) score += 10;

    // Performance data (30 points)
    if (data.performance.avgDailyCalories > 0) score += 10;
    if (data.performance.avgMealsPerDay > 0) score += 10;
    if (data.performance.consistencyScore > 0) score += 10;

    // Meal patterns (10 points)
    if (data.mealPatterns.frequentFoods.length > 0) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Build AI prompt context string
   */
  static buildPromptContext(context: ComprehensiveUserContext): string {
    return `
=== USER PROFILE ===
Age: ${context.profile.age} | Gender: ${context.profile.gender}
Current Weight: ${context.profile.weight}kg | Target: ${context.profile.targetWeight}kg
Goal: ${context.profile.mainGoal}${context.profile.secondaryGoal ? ` (Secondary: ${context.profile.secondaryGoal})` : ""}
Activity Level: ${context.profile.activityLevel}
Dietary Style: ${context.profile.dietaryStyle}
ALLERGIES (CRITICAL): ${context.profile.allergies.length > 0 ? context.profile.allergies.join(", ") : "None"}
Medical Conditions: ${context.profile.medicalConditions.length > 0 ? context.profile.medicalConditions.join(", ") : "None"}
Liked Foods: ${context.profile.likedFoods.slice(0, 5).join(", ") || "Not specified"}
Disliked Foods: ${context.profile.dislikedFoods.slice(0, 5).join(", ") || "Not specified"}
Kosher: ${context.profile.kosher ? "Yes" : "No"}

=== NUTRITION GOALS ===
Daily Targets: ${context.goals.dailyCalories}kcal | ${context.goals.dailyProtein}g protein | ${context.goals.dailyCarbs}g carbs | ${context.goals.dailyFats}g fats
Water Goal: ${context.goals.dailyWater}ml | Meals/Day: ${context.goals.mealsPerDay}

=== PERFORMANCE (Last 30 Days) ===
Average Daily: ${context.performance.avgDailyCalories}kcal | ${context.performance.avgDailyProtein}g protein | ${context.performance.avgDailyWater}ml water
Goal Achievement: Calories ${Math.round(context.performance.calorieGoalAchievementRate * 100)}% | Protein ${Math.round(context.performance.proteinGoalAchievementRate * 100)}% | Water ${Math.round(context.performance.waterGoalAchievementRate * 100)}%
Consistency Score: ${Math.round(context.performance.consistencyScore * 100)}%
Avg Meals/Day: ${context.performance.avgMealsPerDay.toFixed(1)}
Best Day: ${context.performance.bestPerformingDayOfWeek} | Worst Day: ${context.performance.worstPerformingDayOfWeek}
Trends: Calories ${context.performance.caloriesTrend} | Protein ${context.performance.proteinTrend}

=== STREAKS & ACHIEVEMENTS ===
Current Streak: ${context.streaks.currentDailyStreak} days | Longest: ${context.streaks.longestDailyStreak} days
Level: ${context.achievements.currentLevel} | XP: ${context.achievements.totalXPEarned}
Achievements: ${context.achievements.totalUnlocked}/${context.achievements.totalAvailable} unlocked
${context.achievements.recentlyUnlocked.length > 0 ? `Recently Unlocked: ${context.achievements.recentlyUnlocked.join(", ")}` : ""}
${context.achievements.nearCompletion.length > 0 ? `Near Completion: ${context.achievements.nearCompletion.map(a => `${a.name} (${a.progress}/${a.required})`).join(", ")}` : ""}

=== TODAY'S PROGRESS ===
Consumed: ${context.recentActivity.todayCalories}kcal | ${context.recentActivity.todayProtein}g protein | ${context.recentActivity.todayWater}ml water
Meals Today: ${context.recentActivity.todayMealsCount}
Remaining: ${context.recentActivity.remainingCalories}kcal | ${context.recentActivity.remainingProtein}g protein | ${context.recentActivity.remainingWater}ml water
${context.recentActivity.lastMealTime ? `Last Meal: ${new Date(context.recentActivity.lastMealTime).toLocaleTimeString()}` : "No meals yet today"}

=== HEALTH INSIGHTS ===
BMI Category: ${context.healthInsights.bmiCategory}
Estimated TDEE: ${context.healthInsights.estimatedTDEE}kcal/day
Recommended Adjustment: ${context.healthInsights.recommendedDeficitOrSurplus > 0 ? "+" : ""}${context.healthInsights.recommendedDeficitOrSurplus}kcal
Hydration: ${context.healthInsights.hydrationStatus} | Protein Intake: ${context.healthInsights.proteinIntakeStatus}

=== MEAL PATTERNS ===
Usual Times: Breakfast ${context.mealPatterns.preferredMealTimes.breakfast} | Lunch ${context.mealPatterns.preferredMealTimes.lunch} | Dinner ${context.mealPatterns.preferredMealTimes.dinner}
Avg Calories/Meal: Breakfast ${context.mealPatterns.avgCaloriesPerMeal.breakfast} | Lunch ${context.mealPatterns.avgCaloriesPerMeal.lunch} | Dinner ${context.mealPatterns.avgCaloriesPerMeal.dinner}
${context.mealPatterns.frequentFoods.length > 0 ? `Frequent Foods: ${context.mealPatterns.frequentFoods.slice(0, 5).map(f => f.name).join(", ")}` : ""}

Data Completeness: ${context.dataCompleteness}%
`.trim();
  }

  /**
   * Clear cache for a user (call after significant data changes)
   */
  static clearCache(userId: string): void {
    contextCache.delete(userId);
  }

  /**
   * Clear all cache
   */
  static clearAllCache(): void {
    contextCache.clear();
  }
}
