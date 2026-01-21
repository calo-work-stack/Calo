import { prisma } from "../lib/database";
import {
  CalendarStats,
  DayData,
  WeeklyAnalysis,
  CalendarEvent,
  GamificationBadge,
} from "../types/calendar";

// ============ CACHING FOR LIGHTNING FAST RESPONSES ============
const calendarCache = new Map<string, { data: any; timestamp: number }>();
const CALENDAR_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

const getCacheKey = (user_id: string, year: number, month: number) =>
  `calendar_${user_id}_${year}_${month}`;

export class CalendarService {
  // Default nutritional goals (can be customized per user later)
  private static getDefaultGoals() {
    return {
      calories: 2000,
      protein: 150,
      carbs: 250,
      fat: 67,
      water: 2000, // ml
    };
  }

  // Clear cache for a user (call after meal/water updates)
  static clearUserCache(user_id: string) {
    for (const [key] of calendarCache) {
      if (key.includes(user_id)) {
        calendarCache.delete(key);
      }
    }
  }

  static async getCalendarData(
    user_id: string,
    year: number,
    month: number
  ): Promise<Record<string, DayData>> {
    try {
      // Check cache first
      const cacheKey = getCacheKey(user_id, year, month);
      const cached = calendarCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CALENDAR_CACHE_DURATION) {
        console.log("⚡ Returning cached calendar data");
        return cached.data;
      }

      console.log("📅 Fetching calendar data for user:", user_id, year, month);

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // ⚡ PARALLEL QUERIES - fetch all data at once instead of sequentially
      const [meals, dailyGoals, waterIntakes, events] = await Promise.all([
        // Fetch meals - only select needed fields for performance
        prisma.meal.findMany({
          where: {
            user_id: user_id,
            upload_time: { gte: startDate, lte: endDate },
          },
          select: {
            meal_id: true,
            upload_time: true,
            calories: true,
            protein_g: true,
            carbs_g: true,
            fats_g: true,
            meal_period: true,
          },
          orderBy: { upload_time: "asc" },
        }),

        // Fetch daily goals
        prisma.dailyGoal.findMany({
          where: {
            user_id: user_id,
            date: { gte: startDate, lte: endDate },
          },
          select: {
            date: true,
            calories: true,
            protein_g: true,
            carbs_g: true,
            fats_g: true,
            water_ml: true,
          },
        }),

        // Fetch water intake
        prisma.waterIntake.findMany({
          where: {
            user_id: user_id,
            date: { gte: startDate, lte: endDate },
          },
          select: {
            date: true,
            cups_consumed: true,
            milliliters_consumed: true,
          },
        }),

        // Fetch calendar events
        prisma.calendarEvent.findMany({
          where: {
            user_id: user_id,
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
          orderBy: { date: "asc" },
        }),
      ]);

      console.log("⚡ Parallel fetch complete:", meals.length, "meals");

      // Get default goals for fallback
      const defaultGoals = this.getDefaultGoals();

      // Group meals by date
      const mealsByDate: Record<string, any[]> = {};
      meals.forEach((meal) => {
        const dateStr = new Date(meal.upload_time).toISOString().split("T")[0];
        if (!mealsByDate[dateStr]) {
          mealsByDate[dateStr] = [];
        }
        mealsByDate[dateStr].push(meal);
      });

      // Group daily goals by date
      const goalsByDate: Record<string, any> = {};
      dailyGoals.forEach((goal) => {
        const dateStr = new Date(goal.date).toISOString().split("T")[0];
        goalsByDate[dateStr] = goal;
      });

      // Group water intakes by date
      const waterByDate: Record<string, any> = {};
      waterIntakes.forEach((water) => {
        const dateStr = new Date(water.date).toISOString().split("T")[0];
        waterByDate[dateStr] = water;
      });

      // Group events by date
      const eventsByDate: Record<string, any[]> = {};
      events.forEach((event) => {
        const dateStr = new Date(event.date).toISOString().split("T")[0];
        if (!eventsByDate[dateStr]) {
          eventsByDate[dateStr] = [];
        }
        eventsByDate[dateStr].push(event);
      });

      // Generate calendar data for each day of the month
      const calendarData: Record<string, DayData> = {};
      const daysInMonth = endDate.getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dateStr = date.toISOString().split("T")[0];
        const dayMeals = mealsByDate[dateStr] || [];
        const dayGoal = goalsByDate[dateStr];
        const dayWater = waterByDate[dateStr];
        const dayEvents = eventsByDate[dateStr] || [];

        // Use custom goals if available, otherwise use defaults
        const goals = dayGoal
          ? {
              calories: Number(dayGoal.calories),
              protein: Number(dayGoal.protein_g),
              carbs: Number(dayGoal.carbs_g),
              fat: Number(dayGoal.fats_g),
              water: Number(dayGoal.water_ml) || defaultGoals.water,
            }
          : defaultGoals;

        // Count only main meals (breakfast, lunch, dinner, late_night)
        const mainMealPeriods = ["breakfast", "lunch", "dinner", "late_night"];
        const mainMealsCount = dayMeals.filter((meal) =>
          mainMealPeriods.includes(meal.meal_period?.toLowerCase() || "")
        ).length;

        // Calculate totals for the day
        const totals = dayMeals.reduce(
          (acc, meal) => ({
            calories: acc.calories + (Number(meal.calories) || 0),
            protein: acc.protein + (Number(meal.protein_g) || 0),
            carbs: acc.carbs + (Number(meal.carbs_g) || 0),
            fat: acc.fat + (Number(meal.fats_g) || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        // Get water intake
        const waterIntake = dayWater ? dayWater.milliliters_consumed : 0;

        // Calculate quality score
        const quality_score = this.calculateQualityScore(
          totals,
          goals,
          dayEvents,
          waterIntake
        );

        // Format events for response
        const formattedEvents = dayEvents.map((event) => ({
          id: event.event_id,
          title: event.title,
          type: event.type,
          created_at: event.created_at.toISOString(),
          description: event.description || undefined,
        }));

        calendarData[dateStr] = {
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
          water_goal_ml: goals.water,
          water_intake_ml: waterIntake,
          events: formattedEvents,
        };
      }

      // Cache the result
      calendarCache.set(cacheKey, {
        data: calendarData,
        timestamp: Date.now(),
      });

      console.log("⚡ Calendar data cached for", Object.keys(calendarData).length, "days");
      return calendarData;
    } catch (error) {
      console.error("💥 Error fetching calendar data:", error);
      throw new Error("Failed to fetch calendar data");
    }
  }

  static async getStatistics(
    user_id: string,
    year: number,
    month: number
  ): Promise<CalendarStats> {
    try {
      console.log("📊 Calculating statistics for user:", user_id, year, month);

      // Calculate previous month values
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;

      // ⚡ PARALLEL FETCH - get both months at once
      const [currentMonthData, prevMonthData] = await Promise.all([
        this.getCalendarData(user_id, year, month),
        this.getCalendarData(user_id, prevYear, prevMonth),
      ]);

      const currentDays = Object.values(currentMonthData);
      const prevDays = Object.values(prevMonthData);

      // Calculate current month statistics
      const goalDays = currentDays.filter(
        (day) => day.calories_actual >= day.calories_goal * 0.9
      ).length;

      const totalDays = currentDays.length;
      const monthlyProgress = totalDays > 0 ? (goalDays / totalDays) * 100 : 0;

      // Calculate streak days
      const streakDays = this.calculateStreakDays(currentDays);

      // Calculate averages
      const totalCalories = currentDays.reduce(
        (sum, day) => sum + day.calories_actual,
        0
      );
      const totalProtein = currentDays.reduce(
        (sum, day) => sum + day.protein_actual,
        0
      );
      const totalWater = currentDays.reduce(
        (sum, day) => sum + day.water_intake_ml,
        0
      );
      const averageCalories = totalDays > 0 ? totalCalories / totalDays : 0;
      const averageProtein = totalDays > 0 ? totalProtein / totalDays : 0;
      const averageWater = totalDays > 0 ? totalWater / totalDays : 0;

      // Analyze weeks with detailed insights
      const weeklyAnalysis = this.analyzeWeeksDetailed(currentDays);

      // Calculate improvement vs previous month
      const prevGoalDays = prevDays.filter(
        (day) => day.calories_actual >= day.calories_goal * 0.9
      ).length;
      const prevProgress =
        prevDays.length > 0 ? (prevGoalDays / prevDays.length) * 100 : 0;
      const improvementPercent = Math.round(monthlyProgress - prevProgress);

      // Generate motivational message
      const motivationalMessage = this.generateMotivationalMessage(
        monthlyProgress,
        streakDays,
        improvementPercent
      );

      // Get gamification badges
      const badges = await this.checkAndAwardBadges(
        user_id,
        currentDays,
        monthlyProgress,
        streakDays
      );

      const statistics: CalendarStats = {
        monthlyProgress: Math.round(monthlyProgress),
        streakDays,
        bestWeek: weeklyAnalysis.bestWeek,
        challengingWeek: weeklyAnalysis.challengingWeek,
        improvementPercent,
        totalGoalDays: goalDays,
        averageCalories: Math.round(averageCalories),
        averageProtein: Math.round(averageProtein),
        averageWater: Math.round(averageWater),
        motivationalMessage,
        gamificationBadges: badges,
        weeklyInsights: weeklyAnalysis.insights,
      };

      console.log("✅ Generated statistics:", statistics);
      return statistics;
    } catch (error) {
      console.error("💥 Error calculating statistics:", error);
      throw new Error("Failed to calculate statistics");
    }
  }

  static async addEvent(
    user_id: string,
    date: string,
    title: string,
    type: string,
    description?: string
  ): Promise<CalendarEvent> {
    try {
      console.log("📝 Adding event for user:", user_id, {
        date,
        title,
        type,
        description,
      });

      const event = await prisma.calendarEvent.create({
        data: {
          user_id,
          date: new Date(date),
          title,
          type,
          description,
        },
      });

      console.log("✅ Event created:", event);

      return {
        id: event.event_id,
        user_id: event.user_id,
        date: event.date.toISOString().split("T")[0],
        title: event.title,
        type: event.type,
        description: event.description || undefined,
        created_at: event.created_at.toISOString(),
        updated_at: event.updated_at.toISOString(),
      };
    } catch (error) {
      console.error("💥 Error adding event:", error);
      throw new Error("Failed to add event");
    }
  }

  static async getEventsForDate(
    user_id: string,
    date: string
  ): Promise<CalendarEvent[]> {
    try {
      console.log("📅 Getting events for date:", date);

      const events = await prisma.calendarEvent.findMany({
        where: {
          user_id,
          date: new Date(date),
        },
        orderBy: {
          created_at: "asc",
        },
      });

      return events.map((event) => ({
        id: event.event_id,
        user_id: event.user_id,
        date: event.date.toISOString().split("T")[0],
        title: event.title,
        type: event.type,
        description: event.description || undefined,
        created_at: event.created_at.toISOString(),
        updated_at: event.updated_at.toISOString(),
      }));
    } catch (error) {
      console.error("💥 Error fetching events:", error);
      throw new Error("Failed to fetch events");
    }
  }

  static async deleteEvent(user_id: string, event_id: string): Promise<void> {
    try {
      console.log("🗑️ Deleting event:", event_id);

      await prisma.calendarEvent.deleteMany({
        where: {
          event_id,
          user_id,
        },
      });

      console.log("✅ Event deleted");
    } catch (error) {
      console.error("💥 Error deleting event:", error);
      throw new Error("Failed to delete event");
    }
  }

  // Helper methods

  private static calculateQualityScore(
    totals: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    },
    goals: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      water: number;
    },
    events: any[],
    waterIntake: number
  ): number {
    if (totals.calories === 0) return 0;

    // Basic scoring based on macros
    const caloriesScore = Math.min(totals.calories / goals.calories, 1.5);
    const proteinScore = Math.min(totals.protein / goals.protein, 1.2);
    const waterScore = Math.min(waterIntake / goals.water, 1.0);

    // Event-based adjustments
    let eventMultiplier = 1.0;
    const hasWorkoutEvent = events.some((event) => event.type === "workout");
    const hasFastingEvent = events.some(
      (event) =>
        event.type === "health" && event.title.toLowerCase().includes("fast")
    );

    if (hasWorkoutEvent) {
      eventMultiplier = 1.1;
    }
    if (hasFastingEvent) {
      eventMultiplier = 0.9;
    }

    // Penalize deviations from goals
    const caloriesPenalty = Math.abs(1 - caloriesScore) * 2;
    const proteinPenalty = Math.abs(1 - proteinScore) * 1.5;
    const waterPenalty = Math.abs(1 - waterScore) * 1.0;

    const baseScore = 10;
    const finalScore = Math.max(
      1,
      (baseScore - caloriesPenalty - proteinPenalty - waterPenalty) *
        eventMultiplier
    );

    return Math.round(finalScore);
  }

  private static calculateStreakDays(days: DayData[]): number {
    let streak = 0;
    const today = new Date();

    const sortedDays = days
      .filter((day) => new Date(day.date) <= today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (const day of sortedDays) {
      const progress = day.calories_actual / day.calories_goal;
      if (progress >= 0.9) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private static analyzeWeeksDetailed(days: DayData[]): {
    bestWeek: string;
    challengingWeek: string;
    insights: {
      bestWeekDetails: any;
      challengingWeekDetails: any;
    };
  } {
    const weeks: WeeklyAnalysis[] = [];
    const sortedDays = days.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = 0; i < sortedDays.length; i += 7) {
      const weekDays = sortedDays.slice(i, i + 7);
      if (weekDays.length === 0) continue;

      const weekStart = weekDays[0].date;
      const weekEnd = weekDays[weekDays.length - 1].date;

      const weekScore =
        weekDays.reduce((sum, day) => {
          const progress = (day.calories_actual / day.calories_goal) * 100;
          return sum + Math.min(progress, 100);
        }, 0) / weekDays.length;

      const goalDays = weekDays.filter(
        (day) => day.calories_actual >= day.calories_goal * 0.9
      ).length;

      const highlights: string[] = [];
      const challenges: string[] = [];

      if (goalDays >= 6) {
        highlights.push("Almost perfect week!");
      }
      if (goalDays >= 4) {
        highlights.push(`${goalDays} days of goal achievement`);
      }

      const avgQuality =
        weekDays.reduce((sum, day) => sum + day.quality_score, 0) /
        weekDays.length;
      if (avgQuality >= 8) {
        highlights.push("Excellent nutrition quality");
      }

      const lowDays = weekDays.filter(
        (day) => day.calories_actual / day.calories_goal < 0.7
      ).length;
      if (lowDays >= 2) {
        challenges.push(`${lowDays} days below 70% of goal`);
      }

      const overDays = weekDays.filter(
        (day) => day.calories_actual / day.calories_goal > 1.1
      ).length;
      if (overDays >= 2) {
        challenges.push(`${overDays} days of overeating`);
      }

      weeks.push({
        weekStart,
        weekEnd,
        averageProgress: weekScore,
        totalDays: weekDays.length,
        goalDays,
        highlights,
        challenges,
      });
    }

    if (weeks.length === 0) {
      return {
        bestWeek: "No data available",
        challengingWeek: "No data available",
        insights: {
          bestWeekDetails: null,
          challengingWeekDetails: null,
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
      },
    };
  }

  private static generateMotivationalMessage(
    monthlyProgress: number,
    streakDays: number,
    improvementPercent: number
  ): string {
    const messages = {
      excellent: [
        "🎉 Outstanding! You're crushing your goals!",
        "🌟 Absolutely amazing progress!",
        "💪 You're on fire! Keep this momentum!",
      ],
      great: [
        "💪 Great job! You're doing really well!",
        "🎯 Fantastic progress! You're almost there!",
        "🔥 Keep up the excellent work!",
      ],
      good: [
        "👍 Good progress! Keep pushing forward!",
        "📈 You're making steady improvements!",
        "🌱 Great foundation! Keep building on it!",
      ],
      encouraging: [
        "🌟 Every step counts! You've got this!",
        "💫 Progress takes time - you're doing great!",
        "🎯 Small steps lead to big changes!",
      ],
    };

    if (monthlyProgress >= 90) {
      return messages.excellent[
        Math.floor(Math.random() * messages.excellent.length)
      ];
    } else if (monthlyProgress >= 75) {
      return messages.great[Math.floor(Math.random() * messages.great.length)];
    } else if (monthlyProgress >= 50) {
      return messages.good[Math.floor(Math.random() * messages.good.length)];
    } else if (improvementPercent > 10) {
      return "📈 Nice improvement from last month!";
    } else if (streakDays >= 3) {
      return `🔥 ${streakDays} day streak! Keep it going!`;
    } else {
      return messages.encouraging[
        Math.floor(Math.random() * messages.encouraging.length)
      ];
    }
  }

  private static async checkAndAwardBadges(
    user_id: string,
    days: DayData[],
    monthlyProgress: number,
    streakDays: number
  ): Promise<any[]> {
    try {
      const badges = [];

      const goalDays = days.filter(
        (day) => day.calories_actual >= day.calories_goal * 0.9
      ).length;
      const perfectDays = days.filter((day) => day.quality_score >= 9).length;

      const badgeConditions = [
        {
          condition: streakDays >= 7,
          name: "Week Warrior",
          description: "7 days streak of meeting goals",
          icon: "🔥",
          points: 100,
        },
        {
          condition: streakDays >= 30,
          name: "Monthly Master",
          description: "30 days streak - incredible!",
          icon: "🏆",
          points: 500,
        },
        {
          condition: monthlyProgress >= 90,
          name: "Monthly Champion",
          description: "90%+ monthly goal achievement",
          icon: "🥇",
          points: 200,
        },
        {
          condition: perfectDays >= 5,
          name: "Quality King",
          description: "5+ days of perfect nutrition",
          icon: "💎",
          points: 150,
        },
        {
          condition: goalDays >= 15,
          name: "Consistency Master",
          description: "15+ days of goal achievement",
          icon: "⭐",
          points: 120,
        },
      ];

      const existingBadges = await prisma.gamificationBadge.findMany({
        where: {
          user_id,
          achieved_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const existingBadgeNames = existingBadges.map((badge) => badge.name);

      for (const badgeCondition of badgeConditions) {
        if (
          badgeCondition.condition &&
          !existingBadgeNames.includes(badgeCondition.name)
        ) {
          const newBadge = await prisma.gamificationBadge.create({
            data: {
              user_id,
              name: badgeCondition.name,
              description: badgeCondition.description,
              icon: badgeCondition.icon,
              condition: JSON.stringify(badgeCondition),
              points: badgeCondition.points,
            },
          });
          badges.push(newBadge);
        }
      }

      const recentBadges = await prisma.gamificationBadge.findMany({
        where: {
          user_id,
          achieved_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          achieved_at: "desc",
        },
        take: 10,
      });

      return recentBadges.map((badge) => ({
        id: badge.badge_id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        achieved_at: badge.achieved_at.toISOString(),
      }));
    } catch (error) {
      console.error("💥 Error checking badges:", error);
      return [];
    }
  }
}
