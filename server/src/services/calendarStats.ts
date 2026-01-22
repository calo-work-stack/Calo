import { prisma } from "../lib/database";
import {
  EnhancedCalendarStats,
  DayData,
  MonthlyNutritionBreakdown,
  MacroTrends,
  WeeklyAnalysisDetail,
  GamificationBadge,
} from "../types/calendarStats";

export class calendarStatsService {
  static async getEnhancedStatistics(
    user_id: string,
    year: number,
    month: number
  ): Promise<EnhancedCalendarStats> {
    try {
      console.log(
        "📊 Calculating enhanced statistics for user:",
        user_id,
        year,
        month
      );

      // FIXED: Properly handle date boundaries for UTC
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevStartDate = new Date(
        Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0, 0)
      );
      const prevEndDate = new Date(
        Date.UTC(prevYear, prevMonth, 0, 23, 59, 59, 999)
      );

      console.log("📅 Date ranges:", {
        current: { start: startDate.toISOString(), end: endDate.toISOString() },
        previous: {
          start: prevStartDate.toISOString(),
          end: prevEndDate.toISOString(),
        },
      });

      // Fetch all data in parallel with better error handling
      const [
        currentMeals,
        prevMeals,
        currentDailyGoals,
        prevDailyGoals,
        currentWater,
        prevWater,
        currentEvents,
        userBadges,
        userProfile,
      ] = await Promise.all([
        prisma.meal
          .findMany({
            where: {
              user_id,
              upload_time: { gte: startDate, lte: endDate },
            },
            select: {
              upload_time: true,
              meal_period: true,
              calories: true,
              protein_g: true,
              carbs_g: true,
              fats_g: true,
            },
            orderBy: { upload_time: "asc" },
          })
          .catch((err) => {
            console.error("❌ Error fetching current meals:", err);
            return [];
          }),
        prisma.meal
          .findMany({
            where: {
              user_id,
              upload_time: { gte: prevStartDate, lte: prevEndDate },
            },
            select: {
              upload_time: true,
              calories: true,
              protein_g: true,
              carbs_g: true,
              fats_g: true,
            },
          })
          .catch((err) => {
            console.error("❌ Error fetching previous meals:", err);
            return [];
          }),
        prisma.dailyGoal
          .findMany({
            where: {
              user_id,
              date: { gte: startDate, lte: endDate },
            },
            select: {
              date: true,
              calories: true,
              protein_g: true,
              carbs_g: true,
              fats_g: true,
            },
          })
          .catch((err) => {
            console.error("❌ Error fetching current goals:", err);
            return [];
          }),
        prisma.dailyGoal
          .findMany({
            where: {
              user_id,
              date: { gte: prevStartDate, lte: prevEndDate },
            },
            select: {
              date: true,
              calories: true,
              protein_g: true,
              carbs_g: true,
              fats_g: true,
            },
          })
          .catch((err) => {
            console.error("❌ Error fetching previous goals:", err);
            return [];
          }),
        prisma.waterIntake
          .findMany({
            where: {
              user_id,
              date: { gte: startDate, lte: endDate },
            },
            select: {
              date: true,
              milliliters_consumed: true,
            },
          })
          .catch((err) => {
            console.error("❌ Error fetching current water:", err);
            return [];
          }),
        prisma.waterIntake
          .findMany({
            where: {
              user_id,
              date: { gte: prevStartDate, lte: prevEndDate },
            },
            select: {
              date: true,
              milliliters_consumed: true,
            },
          })
          .catch((err) => {
            console.error("❌ Error fetching previous water:", err);
            return [];
          }),
        prisma.calendarEvent
          .findMany({
            where: {
              user_id,
              date: { gte: startDate, lte: endDate },
            },
            select: {
              event_id: true,
              date: true,
              title: true,
              type: true,
              description: true,
              created_at: true,
            },
          })
          .catch((err) => {
            console.error("❌ Error fetching events:", err);
            return [];
          }),
        prisma.gamificationBadge
          .findMany({
            where: {
              user_id,
              achieved_at: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
            orderBy: { achieved_at: "desc" },
            take: 10,
          })
          .catch((err) => {
            console.error("❌ Error fetching badges:", err);
            return [];
          }),
        prisma.user
          .findUnique({
            where: { user_id },
            select: { total_points: true },
          })
          .catch((err) => {
            console.error("❌ Error fetching user profile:", err);
            return null;
          }),
      ]);

      console.log("📊 Data fetched:", {
        currentMeals: currentMeals.length,
        prevMeals: prevMeals.length,
        currentEvents: currentEvents.length,
      });

      // Get default goals
      const defaultGoals = {
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 67,
        water: 2000,
      };

      // Process daily data
      const dailyData = this.processDailyData(
        currentMeals,
        currentDailyGoals,
        currentWater,
        currentEvents,
        startDate,
        endDate,
        defaultGoals
      );

      // Calculate all statistics
      const basicStats = this.calculateBasicStats(dailyData, defaultGoals);
      const nutritionBreakdown = this.calculateNutritionBreakdown(dailyData);
      const weeklyAnalysis = this.analyzeWeeks(dailyData);
      const macroTrends = this.calculateMacroTrends(dailyData);

      // Calculate previous month stats for comparison
      const prevStats = this.calculatePreviousMonthStats(
        prevMeals,
        prevDailyGoals,
        prevWater,
        prevStartDate,
        prevEndDate,
        defaultGoals
      );

      const comparison = {
        caloriesDiff: basicStats.averageCalories - prevStats.averageCalories,
        proteinDiff: basicStats.averageProtein - prevStats.averageProtein,
        carbsDiff: basicStats.averageCarbs - prevStats.averageCarbs,
        fatDiff: basicStats.averageFat - prevStats.averageFat,
        waterDiff: basicStats.averageWater - prevStats.averageWater,
        progressDiff: basicStats.monthlyProgress - prevStats.monthlyProgress,
        streakDiff: basicStats.streakDays - prevStats.streakDays,
      };

      const motivationalMessage = this.generateMotivationalMessage(
        basicStats.monthlyProgress,
        basicStats.streakDays,
        comparison.progressDiff
      );

      const badges: GamificationBadge[] = userBadges.map((badge) => ({
        id: badge.badge_id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        achieved_at: badge.achieved_at.toISOString(),
        points: badge.points,
      }));

      const stats: EnhancedCalendarStats = {
        ...basicStats,
        nutritionBreakdown,
        macroTrends,
        bestWeek: weeklyAnalysis.bestWeek,
        challengingWeek: weeklyAnalysis.challengingWeek,
        weeklyInsights: weeklyAnalysis.insights,
        improvementPercent: Math.round(comparison.progressDiff),
        motivationalMessage,
        gamificationBadges: badges,
        totalPoints: userProfile?.total_points || 0,
        comparison,
      };

      console.log("✅ Enhanced statistics calculated successfully");
      return stats;
    } catch (error) {
      console.error("💥 Error calculating enhanced statistics:", error);
      // Return default stats instead of throwing to keep calendar functional
      console.log("⚠️ Returning default statistics due to error");
      return this.getDefaultStats();
    }
  }

  /**
   * Returns default empty statistics when database is unavailable
   */
  private static getDefaultStats(): EnhancedCalendarStats {
    return {
      monthlyProgress: 0,
      streakDays: 0,
      totalGoalDays: 0,
      totalDays: 0,
      perfectDays: 0,
      averageCalories: 0,
      averageProtein: 0,
      averageCarbs: 0,
      averageFat: 0,
      averageWater: 0,
      averageQualityScore: 0,
      averageMealCount: 0,
      nutritionBreakdown: {
        calories: { average: 0, min: 0, max: 0, total: 0, goalAverage: 2000, adherencePercent: 0 },
        protein: { average: 0, min: 0, max: 0, total: 0, goalAverage: 150, adherencePercent: 0 },
        carbs: { average: 0, min: 0, max: 0, total: 0, goalAverage: 250, adherencePercent: 0 },
        fat: { average: 0, min: 0, max: 0, total: 0, goalAverage: 67, adherencePercent: 0 },
        water: { average: 0, min: 0, max: 0, total: 0, dailyGoal: 2000, adherencePercent: 0 },
      },
      macroTrends: {
        caloriesTrend: "stable",
        proteinTrend: "stable",
        carbsTrend: "stable",
        fatTrend: "stable",
        waterTrend: "stable",
        overallTrend: "stable",
      },
      bestWeek: "No data available",
      challengingWeek: "No data available",
      weeklyInsights: {
        bestWeekDetails: null as any,
        challengingWeekDetails: null as any,
        allWeeks: [],
      },
      improvementPercent: 0,
      motivationalMessage: "Start tracking your meals to see progress!",
      gamificationBadges: [],
      totalPoints: 0,
      comparison: {
        caloriesDiff: 0,
        proteinDiff: 0,
        carbsDiff: 0,
        fatDiff: 0,
        waterDiff: 0,
        progressDiff: 0,
        streakDiff: 0,
      },
    };
  }

  private static processDailyData(
    meals: any[],
    dailyGoals: any[],
    waterIntakes: any[],
    events: any[],
    startDate: Date,
    endDate: Date,
    defaultGoals: any
  ): DayData[] {
    const mealsByDate: Record<string, any[]> = {};
    const goalsByDate: Record<string, any> = {};
    const waterByDate: Record<string, any> = {};
    const eventsByDate: Record<string, any[]> = {};

    // FIXED: Better date validation and error handling
    const safeParseDate = (
      dateValue: any,
      fieldName: string
    ): string | null => {
      try {
        if (!dateValue) {
          console.warn(`⚠️ Missing ${fieldName}:`, dateValue);
          return null;
        }
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
          console.error(`❌ Invalid ${fieldName}:`, dateValue);
          return null;
        }
        return date.toISOString().split("T")[0];
      } catch (err) {
        console.error(`❌ Error parsing ${fieldName}:`, dateValue, err);
        return null;
      }
    };

    // Process meals with better error handling
    meals.forEach((meal) => {
      const dateStr = safeParseDate(meal.upload_time, "meal upload_time");
      if (!dateStr) return;

      if (!mealsByDate[dateStr]) mealsByDate[dateStr] = [];
      mealsByDate[dateStr].push(meal);
    });

    // Process daily goals
    dailyGoals.forEach((goal) => {
      const dateStr = safeParseDate(goal.date, "goal date");
      if (!dateStr) return;

      goalsByDate[dateStr] = goal;
    });

    // Process water intakes
    waterIntakes.forEach((water) => {
      const dateStr = safeParseDate(water.date, "water date");
      if (!dateStr) return;

      waterByDate[dateStr] = water;
    });

    // Process events
    events.forEach((event) => {
      const dateStr = safeParseDate(event.date, "event date");
      if (!dateStr) return;

      if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];

      const createdAt = new Date(event.created_at);
      eventsByDate[dateStr].push({
        id: event.event_id,
        title: event.title,
        type: event.type,
        created_at: isNaN(createdAt.getTime())
          ? new Date().toISOString()
          : createdAt.toISOString(),
        description: event.description || undefined,
      });
    });

    const dailyData: DayData[] = [];

    // FIXED: Use UTC dates consistently
    const year = startDate.getUTCFullYear();
    const month = startDate.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    console.log(`📅 Processing ${daysInMonth} days for ${year}-${month + 1}`);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

      // Validate the created date
      if (isNaN(date.getTime())) {
        console.error("❌ Invalid date created:", year, month, day);
        continue;
      }

      const dateStr = date.toISOString().split("T")[0];
      const dayMeals = mealsByDate[dateStr] || [];
      const dayGoal = goalsByDate[dateStr];
      const dayWater = waterByDate[dateStr];
      const dayEvents = eventsByDate[dateStr] || [];

      const goals = dayGoal
        ? {
            calories: Number(dayGoal.calories) || defaultGoals.calories,
            protein: Number(dayGoal.protein_g) || defaultGoals.protein,
            carbs: Number(dayGoal.carbs_g) || defaultGoals.carbs,
            fat: Number(dayGoal.fats_g) || defaultGoals.fat,
          }
        : defaultGoals;

      const totals = dayMeals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (Number(meal.calories) || 0),
          protein: acc.protein + (Number(meal.protein_g) || 0),
          carbs: acc.carbs + (Number(meal.carbs_g) || 0),
          fat: acc.fat + (Number(meal.fats_g) || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      const mainMealPeriods = ["breakfast", "lunch", "dinner", "late_night"];
      const mainMealsCount = dayMeals.filter((meal) =>
        mainMealPeriods.includes(meal.meal_period?.toLowerCase() || "")
      ).length;

      const waterIntake = dayWater
        ? Number(dayWater.milliliters_consumed) || 0
        : 0;
      const quality_score = this.calculateQualityScore(
        totals,
        goals,
        waterIntake
      );

      dailyData.push({
        date: dateStr,
        calories_goal: goals.calories,
        calories_actual: totals.calories,
        protein_goal: goals.protein,
        protein_actual: totals.protein,
        carbs_goal: goals.carbs,
        carbs_actual: totals.carbs,
        fat_goal: goals.fat,
        fat_actual: totals.fat,
        meal_count: mainMealsCount,
        quality_score,
        water_intake_ml: waterIntake,
        events: dayEvents,
      });
    }

    console.log(`✅ Processed ${dailyData.length} days of data`);
    return dailyData;
  }

  private static calculateBasicStats(dailyData: DayData[], defaultGoals: any) {
    const totalDays = dailyData.length;
    const daysWithData = dailyData.filter((day) => day.calories_actual > 0);

    const goalDays = dailyData.filter(
      (day) => day.calories_actual >= day.calories_goal * 0.9
    ).length;

    const perfectDays = dailyData.filter(
      (day) => day.quality_score >= 9
    ).length;

    const monthlyProgress = totalDays > 0 ? (goalDays / totalDays) * 100 : 0;

    const streakDays = this.calculateStreakDays(dailyData);

    const averageCalories =
      daysWithData.length > 0
        ? daysWithData.reduce((sum, day) => sum + day.calories_actual, 0) /
          daysWithData.length
        : 0;

    const averageProtein =
      daysWithData.length > 0
        ? daysWithData.reduce((sum, day) => sum + day.protein_actual, 0) /
          daysWithData.length
        : 0;

    const averageCarbs =
      daysWithData.length > 0
        ? daysWithData.reduce((sum, day) => sum + day.carbs_actual, 0) /
          daysWithData.length
        : 0;

    const averageFat =
      daysWithData.length > 0
        ? daysWithData.reduce((sum, day) => sum + day.fat_actual, 0) /
          daysWithData.length
        : 0;

    const averageWater =
      daysWithData.length > 0
        ? daysWithData.reduce((sum, day) => sum + day.water_intake_ml, 0) /
          daysWithData.length
        : 0;

    const averageQualityScore =
      daysWithData.length > 0
        ? daysWithData.reduce((sum, day) => sum + day.quality_score, 0) /
          daysWithData.length
        : 0;

    const averageMealCount =
      daysWithData.length > 0
        ? daysWithData.reduce((sum, day) => sum + day.meal_count, 0) /
          daysWithData.length
        : 0;

    return {
      monthlyProgress: Math.round(monthlyProgress),
      streakDays,
      totalGoalDays: goalDays,
      totalDays,
      perfectDays,
      averageCalories: Math.round(averageCalories),
      averageProtein: Math.round(averageProtein),
      averageCarbs: Math.round(averageCarbs),
      averageFat: Math.round(averageFat),
      averageWater: Math.round(averageWater),
      averageQualityScore: Math.round(averageQualityScore * 10) / 10,
      averageMealCount: Math.round(averageMealCount * 10) / 10,
    };
  }

  private static calculateNutritionBreakdown(
    dailyData: DayData[]
  ): MonthlyNutritionBreakdown {
    const daysWithData = dailyData.filter((day) => day.calories_actual > 0);

    const calculateMacro = (
      actualKey: keyof DayData,
      goalKey: keyof DayData
    ) => {
      const values = daysWithData.map((day) => day[actualKey] as number);
      const goals = daysWithData.map((day) => day[goalKey] as number);

      const average =
        values.reduce((sum, val) => sum + val, 0) / (values.length || 1);
      const min = Math.min(...values, 0);
      const max = Math.max(...values, 0);
      const total = values.reduce((sum, val) => sum + val, 0);
      const goalAverage =
        goals.reduce((sum, val) => sum + val, 0) / (goals.length || 1);

      const adherencePercent =
        goalAverage > 0 ? (average / goalAverage) * 100 : 0;

      return {
        average: Math.round(average),
        min: Math.round(min),
        max: Math.round(max),
        total: Math.round(total),
        goalAverage: Math.round(goalAverage),
        adherencePercent: Math.round(adherencePercent),
      };
    };

    const waterValues = daysWithData.map((day) => day.water_intake_ml);
    const waterAverage =
      waterValues.reduce((sum, val) => sum + val, 0) /
      (waterValues.length || 1);

    return {
      calories: calculateMacro("calories_actual", "calories_goal"),
      protein: calculateMacro("protein_actual", "protein_goal"),
      carbs: calculateMacro("carbs_actual", "carbs_goal"),
      fat: calculateMacro("fat_actual", "fat_goal"),
      water: {
        average: Math.round(waterAverage),
        min: Math.round(Math.min(...waterValues, 0)),
        max: Math.round(Math.max(...waterValues, 0)),
        total: Math.round(waterValues.reduce((sum, val) => sum + val, 0)),
        dailyGoal: 2000,
        adherencePercent: Math.round((waterAverage / 2000) * 100),
      },
    };
  }

  private static calculateMacroTrends(dailyData: DayData[]): MacroTrends {
    const daysWithData = dailyData.filter((day) => day.calories_actual > 0);

    if (daysWithData.length < 7) {
      return {
        caloriesTrend: "stable",
        proteinTrend: "stable",
        carbsTrend: "stable",
        fatTrend: "stable",
        waterTrend: "stable",
        overallTrend: "stable",
      };
    }

    const midPoint = Math.floor(daysWithData.length / 2);
    const firstHalf = daysWithData.slice(0, midPoint);
    const secondHalf = daysWithData.slice(midPoint);

    const getTrend = (
      firstHalf: DayData[],
      secondHalf: DayData[],
      key: keyof DayData
    ): "increasing" | "decreasing" | "stable" => {
      const firstAvg =
        firstHalf.reduce((sum, day) => sum + (day[key] as number), 0) /
        firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, day) => sum + (day[key] as number), 0) /
        secondHalf.length;

      const diff = secondAvg - firstAvg;
      const threshold = firstAvg * 0.1;

      if (diff > threshold) return "increasing";
      if (diff < -threshold) return "decreasing";
      return "stable";
    };

    const caloriesTrend = getTrend(firstHalf, secondHalf, "calories_actual");
    const proteinTrend = getTrend(firstHalf, secondHalf, "protein_actual");
    const carbsTrend = getTrend(firstHalf, secondHalf, "carbs_actual");
    const fatTrend = getTrend(firstHalf, secondHalf, "fat_actual");
    const waterTrend = getTrend(firstHalf, secondHalf, "water_intake_ml");

    const firstHalfProgress =
      firstHalf.filter((day) => day.calories_actual >= day.calories_goal * 0.9)
        .length / firstHalf.length;
    const secondHalfProgress =
      secondHalf.filter((day) => day.calories_actual >= day.calories_goal * 0.9)
        .length / secondHalf.length;

    const overallTrend =
      secondHalfProgress > firstHalfProgress * 1.1
        ? "improving"
        : secondHalfProgress < firstHalfProgress * 0.9
        ? "declining"
        : "stable";

    return {
      caloriesTrend,
      proteinTrend,
      carbsTrend,
      fatTrend,
      waterTrend,
      overallTrend,
    };
  }

  private static analyzeWeeks(dailyData: DayData[]) {
    const weeks: WeeklyAnalysisDetail[] = [];

    for (let i = 0; i < dailyData.length; i += 7) {
      const weekDays = dailyData.slice(i, i + 7);
      if (weekDays.length === 0) continue;

      const daysWithData = weekDays.filter((day) => day.calories_actual > 0);
      if (daysWithData.length === 0) continue;

      const weekStart = weekDays[0].date;
      const weekEnd = weekDays[weekDays.length - 1].date;

      const goalDays = weekDays.filter(
        (day) => day.calories_actual >= day.calories_goal * 0.9
      ).length;

      const perfectDays = weekDays.filter(
        (day) => day.quality_score >= 9
      ).length;

      const averageProgress =
        weekDays.reduce((sum, day) => {
          const progress =
            day.calories_goal > 0
              ? (day.calories_actual / day.calories_goal) * 100
              : 0;
          return sum + Math.min(progress, 100);
        }, 0) / weekDays.length;

      const averageCalories = Math.round(
        daysWithData.reduce((sum, day) => sum + day.calories_actual, 0) /
          daysWithData.length
      );

      const averageProtein = Math.round(
        daysWithData.reduce((sum, day) => sum + day.protein_actual, 0) /
          daysWithData.length
      );

      const averageCarbs = Math.round(
        daysWithData.reduce((sum, day) => sum + day.carbs_actual, 0) /
          daysWithData.length
      );

      const averageFat = Math.round(
        daysWithData.reduce((sum, day) => sum + day.fat_actual, 0) /
          daysWithData.length
      );

      const averageWater = Math.round(
        daysWithData.reduce((sum, day) => sum + day.water_intake_ml, 0) /
          daysWithData.length
      );

      const highlights: string[] = [];
      const challenges: string[] = [];

      if (goalDays >= 6) highlights.push("Almost perfect week!");
      if (goalDays >= 4)
        highlights.push(`${goalDays} days of goal achievement`);
      if (perfectDays >= 3) highlights.push(`${perfectDays} perfect days`);

      const lowDays = weekDays.filter(
        (day) =>
          day.calories_goal > 0 && day.calories_actual / day.calories_goal < 0.7
      ).length;
      if (lowDays >= 2) challenges.push(`${lowDays} days below 70% of goal`);

      const overDays = weekDays.filter(
        (day) =>
          day.calories_goal > 0 && day.calories_actual / day.calories_goal > 1.1
      ).length;
      if (overDays >= 2) challenges.push(`${overDays} days of overeating`);

      weeks.push({
        weekStart,
        weekEnd,
        averageProgress,
        totalDays: weekDays.length,
        goalDays,
        highlights,
        challenges,
        averageCalories,
        averageProtein,
        averageCarbs,
        averageFat,
        averageWater,
        perfectDays,
      });
    }

    if (weeks.length === 0) {
      return {
        bestWeek: "No data available",
        challengingWeek: "No data available",
        insights: {
          bestWeekDetails: null as any,
          challengingWeekDetails: null as any,
          allWeeks: [],
        },
      };
    }

    const bestWeek = weeks.reduce((best, current) =>
      current.averageProgress > best.averageProgress ? current : best
    );

    const worstWeek = weeks.reduce((worst, current) =>
      current.averageProgress < worst.averageProgress ? current : worst
    );

    return {
      bestWeek: `${bestWeek.weekStart} to ${bestWeek.weekEnd} (${Math.round(
        bestWeek.averageProgress
      )}% avg)`,
      challengingWeek: `${worstWeek.weekStart} to ${
        worstWeek.weekEnd
      } (${Math.round(worstWeek.averageProgress)}% avg)`,
      insights: {
        bestWeekDetails: bestWeek,
        challengingWeekDetails: worstWeek,
        allWeeks: weeks,
      },
    };
  }

  private static calculatePreviousMonthStats(
    meals: any[],
    dailyGoals: any[],
    waterIntakes: any[],
    startDate: Date,
    endDate: Date,
    defaultGoals: any
  ) {
    const mealsByDate: Record<string, any[]> = {};
    const goalsByDate: Record<string, any> = {};
    const waterByDate: Record<string, any> = {};

    // Helper function for safe date parsing
    const safeParseDate = (
      dateValue: any,
      fieldName: string
    ): string | null => {
      try {
        if (!dateValue) return null;
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
          console.error(`❌ Invalid ${fieldName}:`, dateValue);
          return null;
        }
        return date.toISOString().split("T")[0];
      } catch (err) {
        console.error(`❌ Error parsing ${fieldName}:`, dateValue, err);
        return null;
      }
    };

    // Process meals
    meals.forEach((meal) => {
      const dateStr = safeParseDate(meal.upload_time, "meal upload_time");
      if (!dateStr) return;

      if (!mealsByDate[dateStr]) mealsByDate[dateStr] = [];
      mealsByDate[dateStr].push(meal);
    });

    // Process daily goals
    dailyGoals.forEach((goal) => {
      const dateStr = safeParseDate(goal.date, "goal date");
      if (!dateStr) return;

      goalsByDate[dateStr] = goal;
    });

    // Process water intakes
    waterIntakes.forEach((water) => {
      const dateStr = safeParseDate(water.date, "water date");
      if (!dateStr) return;

      waterByDate[dateStr] = water;
    });

    const dailyData: DayData[] = [];

    // Use UTC dates consistently
    const year = startDate.getUTCFullYear();
    const month = startDate.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

      // Validate the created date
      if (isNaN(date.getTime())) {
        console.error("❌ Invalid date created:", year, month, day);
        continue;
      }

      const dateStr = date.toISOString().split("T")[0];
      const dayMeals = mealsByDate[dateStr] || [];
      const dayGoal = goalsByDate[dateStr];
      const dayWater = waterByDate[dateStr];

      const goals = dayGoal
        ? {
            calories: Number(dayGoal.calories) || defaultGoals.calories,
            protein: Number(dayGoal.protein_g) || defaultGoals.protein,
            carbs: Number(dayGoal.carbs_g) || defaultGoals.carbs,
            fat: Number(dayGoal.fats_g) || defaultGoals.fat,
          }
        : defaultGoals;

      const totals = dayMeals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (Number(meal.calories) || 0),
          protein: acc.protein + (Number(meal.protein_g) || 0),
          carbs: acc.carbs + (Number(meal.carbs_g) || 0),
          fat: acc.fat + (Number(meal.fats_g) || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      const waterIntake = dayWater
        ? Number(dayWater.milliliters_consumed) || 0
        : 0;

      dailyData.push({
        date: dateStr,
        calories_goal: goals.calories,
        calories_actual: totals.calories,
        protein_goal: goals.protein,
        protein_actual: totals.protein,
        carbs_goal: goals.carbs,
        carbs_actual: totals.carbs,
        fat_goal: goals.fat,
        fat_actual: totals.fat,
        meal_count: dayMeals.length,
        quality_score: 0,
        water_intake_ml: waterIntake,
        events: [],
      });
    }

    const daysWithData = dailyData.filter((day) => day.calories_actual > 0);
    const goalDays = dailyData.filter(
      (day) => day.calories_actual >= day.calories_goal * 0.9
    ).length;

    const monthlyProgress =
      dailyData.length > 0 ? (goalDays / dailyData.length) * 100 : 0;

    const streakDays = this.calculateStreakDays(dailyData);

    return {
      monthlyProgress,
      streakDays,
      averageCalories:
        daysWithData.length > 0
          ? Math.round(
              daysWithData.reduce((sum, day) => sum + day.calories_actual, 0) /
                daysWithData.length
            )
          : 0,
      averageProtein:
        daysWithData.length > 0
          ? Math.round(
              daysWithData.reduce((sum, day) => sum + day.protein_actual, 0) /
                daysWithData.length
            )
          : 0,
      averageCarbs:
        daysWithData.length > 0
          ? Math.round(
              daysWithData.reduce((sum, day) => sum + day.carbs_actual, 0) /
                daysWithData.length
            )
          : 0,
      averageFat:
        daysWithData.length > 0
          ? Math.round(
              daysWithData.reduce((sum, day) => sum + day.fat_actual, 0) /
                daysWithData.length
            )
          : 0,
      averageWater:
        daysWithData.length > 0
          ? Math.round(
              daysWithData.reduce((sum, day) => sum + day.water_intake_ml, 0) /
                daysWithData.length
            )
          : 0,
    };
  }

  private static calculateStreakDays(days: DayData[]): number {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedDays = days
      .filter((day) => {
        const dayDate = new Date(day.date);
        if (isNaN(dayDate.getTime())) {
          console.error("❌ Invalid date in streak calculation:", day.date);
          return false;
        }
        dayDate.setHours(0, 0, 0, 0);
        return dayDate <= today;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (const day of sortedDays) {
      const progress =
        day.calories_goal > 0 ? day.calories_actual / day.calories_goal : 0;
      if (progress >= 0.9 && day.calories_actual > 0) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private static calculateQualityScore(
    totals: { calories: number; protein: number; carbs: number; fat: number },
    goals: { calories: number; protein: number; carbs: number; fat: number },
    waterIntake: number
  ): number {
    if (totals.calories === 0) return 0;

    const caloriesScore =
      goals.calories > 0 ? Math.min(totals.calories / goals.calories, 1.5) : 0;
    const proteinScore =
      goals.protein > 0 ? Math.min(totals.protein / goals.protein, 1.2) : 0;
    const waterScore = Math.min(waterIntake / 2000, 1.0);

    const caloriesPenalty = Math.abs(1 - caloriesScore) * 2;
    const proteinPenalty = Math.abs(1 - proteinScore) * 1.5;
    const waterPenalty = Math.abs(1 - waterScore) * 1.0;

    const baseScore = 10;
    const finalScore = Math.max(
      1,
      baseScore - caloriesPenalty - proteinPenalty - waterPenalty
    );

    return Math.min(10, Math.round(finalScore * 10) / 10);
  }

  private static generateMotivationalMessage(
    monthlyProgress: number,
    streakDays: number,
    improvementPercent: number
  ): string {
    if (monthlyProgress >= 90) {
      return "Outstanding! You're crushing your goals!";
    } else if (monthlyProgress >= 75) {
      return "Great job! You're doing really well!";
    } else if (monthlyProgress >= 50) {
      return "Good progress! Keep pushing forward!";
    } else if (improvementPercent > 10) {
      return "Nice improvement from last month!";
    } else if (streakDays >= 3) {
      return `${streakDays} day streak! Keep it going!`;
    } else {
      return "Every step counts! You've got this!";
    }
  }
}
