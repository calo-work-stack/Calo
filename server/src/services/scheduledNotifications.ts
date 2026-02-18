/**
 * Scheduled Notifications Service
 * Handles automatic sending of meal reminders, water reminders, and other scheduled notifications
 */

import { PrismaClient, MealTiming } from '@prisma/client';
import { PushNotificationService } from './pushNotificationService';
import cron from 'node-cron';

const prisma = new PrismaClient();

// Track sent reminders to prevent duplicates within a minute
const sentReminders = new Map<string, number>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, timestamp] of sentReminders.entries()) {
    if (timestamp < fiveMinutesAgo) {
      sentReminders.delete(key);
    }
  }
}, 5 * 60 * 1000);

export class ScheduledNotificationService {
  private static mealReminderJob: cron.ScheduledTask | null = null;
  private static waterReminderJob: cron.ScheduledTask | null = null;
  private static weeklyReportJob: cron.ScheduledTask | null = null;
  private static streakReminderJob: cron.ScheduledTask | null = null;

  /**
   * Initialize all scheduled notification jobs
   */
  static initialize(): void {
    console.log('📅 Initializing scheduled notification service...');

    // Check meal reminders every minute
    this.mealReminderJob = cron.schedule('* * * * *', async () => {
      await this.checkMealReminders();
    });

    // Check water reminders every 30 minutes
    this.waterReminderJob = cron.schedule('*/30 * * * *', async () => {
      await this.checkWaterReminders();
    });

    // Send weekly reports every Sunday at 10:00 AM (server time)
    this.weeklyReportJob = cron.schedule('0 10 * * 0', async () => {
      await this.sendWeeklyReports();
    });

    // Check streak reminders every day at 20:00 (8 PM)
    this.streakReminderJob = cron.schedule('0 20 * * *', async () => {
      await this.checkStreakReminders();
    });

    console.log('✅ Scheduled notification service initialized');
  }

  /**
   * Stop all scheduled jobs
   */
  static stop(): void {
    this.mealReminderJob?.stop();
    this.waterReminderJob?.stop();
    this.weeklyReportJob?.stop();
    this.streakReminderJob?.stop();
    console.log('⏹️ Scheduled notification service stopped');
  }

  /**
   * Check and send meal reminders based on user preferences
   */
  static async checkMealReminders(): Promise<void> {
    try {
      // Get all users with meal reminder preferences
      const usersWithPreferences = await prisma.notificationPreference.findMany({
        where: {
          meal_reminders: true,
        },
        include: {
          user: {
            select: {
              user_id: true,
              preferred_lang: true,
              active_menu_id: true,
            },
          },
        },
      });

      for (const pref of usersWithPreferences) {
        const userTimezone = pref.timezone || 'Asia/Jerusalem';
        const userTime = getCurrentTimeInTimezone(userTimezone);

        // Check each meal type
        const mealTimes: { type: MealTiming; time: string | null }[] = [
          { type: 'BREAKFAST', time: pref.breakfast_reminder_time },
          { type: 'LUNCH', time: pref.lunch_reminder_time },
          { type: 'DINNER', time: pref.dinner_reminder_time },
          { type: 'SNACK', time: pref.snack_reminder_time },
        ];

        for (const meal of mealTimes) {
          if (meal.time && userTime === meal.time) {
            // Check if we already sent this reminder in the last minute
            const reminderKey = `${pref.user.user_id}-${meal.type}-${userTime}`;
            if (sentReminders.has(reminderKey)) {
              continue; // Skip duplicate
            }

            // Get the meal details from active menu if available
            let mealName: string | undefined;
            let dayNumber = 1;

            if (pref.user.active_menu_id) {
              const activeMeal = await getUpcomingMeal(
                pref.user.user_id,
                pref.user.active_menu_id,
                meal.type
              );
              if (activeMeal) {
                mealName = activeMeal.name;
                dayNumber = activeMeal.day_number;
              }
            }

            await PushNotificationService.sendMealReminder(
              pref.user.user_id,
              {
                mealType: meal.type,
                mealName,
                menuId: pref.user.active_menu_id || undefined,
                dayNumber,
              },
              pref.user.preferred_lang === 'HE' ? 'he' : 'en'
            );

            // Mark as sent
            sentReminders.set(reminderKey, Date.now());

            console.log(`📧 Sent ${meal.type} reminder to user ${pref.user.user_id}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking meal reminders:', error);
    }
  }

  /**
   * Check and send water reminders based on user preferences
   */
  static async checkWaterReminders(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get users who need water reminders
      const usersWithPreferences = await prisma.notificationPreference.findMany({
        where: {
          water_reminders: true,
        },
        include: {
          user: {
            select: {
              user_id: true,
              preferred_lang: true,
            },
          },
        },
      });

      for (const pref of usersWithPreferences) {
        const userTimezone = pref.timezone || 'Asia/Jerusalem';
        const currentHour = getHourInTimezone(userTimezone);

        // Only send reminders during waking hours (8 AM - 10 PM)
        if (currentHour < 8 || currentHour >= 22) {
          continue;
        }

        // Check quiet hours
        if (pref.quiet_hours_enabled) {
          const userTime = getCurrentTimeInTimezone(userTimezone);
          if (isInQuietHours(userTime, pref.quiet_hours_start || '22:00', pref.quiet_hours_end || '07:00')) {
            continue;
          }
        }

        // Get today's water intake and goal
        const [waterIntake, dailyGoal] = await Promise.all([
          prisma.waterIntake.findFirst({
            where: {
              user_id: pref.user.user_id,
              date: {
                gte: today,
                lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
              },
            },
          }),
          prisma.dailyGoal.findFirst({
            where: {
              user_id: pref.user.user_id,
              date: today,
            },
          }),
        ]);

        const currentIntake = waterIntake?.milliliters_consumed || 0;
        const goalIntake = dailyGoal?.water_ml || 2500;
        const remainingMl = goalIntake - currentIntake;

        // Only remind if they haven't reached their goal
        if (remainingMl > 0) {
          const remainingCups = Math.ceil(remainingMl / 250);

          await PushNotificationService.sendWaterReminder(
            pref.user.user_id,
            {
              currentIntake,
              goalIntake,
              remainingCups,
            },
            pref.user.preferred_lang === 'HE' ? 'he' : 'en'
          );

          console.log(`💧 Sent water reminder to user ${pref.user.user_id}`);
        }
      }
    } catch (error) {
      console.error('❌ Error checking water reminders:', error);
    }
  }

  /**
   * Send weekly reports to all users
   */
  static async sendWeeklyReports(): Promise<void> {
    try {
      console.log('📊 Sending weekly reports...');

      const usersWithReports = await prisma.notificationPreference.findMany({
        where: {
          weekly_reports: true,
        },
        include: {
          user: {
            select: {
              user_id: true,
              preferred_lang: true,
              current_streak: true,
            },
          },
        },
      });

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      for (const pref of usersWithReports) {
        // Get weekly stats
        const [completions, meals] = await Promise.all([
          prisma.mealCompletion.count({
            where: {
              user_id: pref.user.user_id,
              completed_date: { gte: weekAgo },
            },
          }),
          prisma.meal.aggregate({
            where: {
              user_id: pref.user.user_id,
              upload_time: { gte: weekAgo },
            },
            _sum: { calories: true },
          }),
        ]);

        const totalCalories = meals._sum.calories || 0;
        const estimatedTotalMeals = 21; // 3 meals × 7 days

        await PushNotificationService.sendWeeklyReport(
          pref.user.user_id,
          {
            totalCalories,
            mealsCompleted: completions,
            totalMeals: estimatedTotalMeals,
            streakDays: pref.user.current_streak || 0,
          },
          pref.user.preferred_lang === 'HE' ? 'he' : 'en'
        );
      }

      console.log(`✅ Sent ${usersWithReports.length} weekly reports`);
    } catch (error) {
      console.error('❌ Error sending weekly reports:', error);
    }
  }

  /**
   * Check and send streak reminders to users at risk of losing their streak
   */
  static async checkStreakReminders(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get users with active streaks who haven't completed any meals today
      const usersWithStreaks = await prisma.user.findMany({
        where: {
          current_streak: { gt: 0 },
        },
        select: {
          user_id: true,
          preferred_lang: true,
          current_streak: true,
          best_streak: true,
          notificationPreferences: {
            select: {
              goal_reminders: true,
              timezone: true,
            },
          },
        },
      });

      for (const user of usersWithStreaks) {
        // Skip if user doesn't want goal reminders
        if (!user.notificationPreferences?.goal_reminders) {
          continue;
        }

        // Check if user has completed any meals today
        const todayCompletions = await prisma.mealCompletion.count({
          where: {
            user_id: user.user_id,
            completed_date: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        });

        if (todayCompletions === 0) {
          // User is at risk of losing their streak
          await PushNotificationService.sendStreakNotification(
            user.user_id,
            {
              currentStreak: user.current_streak || 0,
              bestStreak: user.best_streak || 0,
              message: "Don't lose your streak! Complete a meal today.",
            },
            user.preferred_lang === 'HE' ? 'he' : 'en'
          );

          console.log(`🔥 Sent streak reminder to user ${user.user_id}`);
        }
      }
    } catch (error) {
      console.error('❌ Error checking streak reminders:', error);
    }
  }

  /**
   * Send achievement notification when a user earns an achievement
   */
  static async notifyAchievement(
    userId: string,
    achievementName: string,
    achievementId: string,
    points: number
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { preferred_lang: true },
      });

      await PushNotificationService.sendAchievementNotification(
        userId,
        {
          achievementId,
          achievementName,
          points,
        },
        user?.preferred_lang === 'HE' ? 'he' : 'en'
      );
    } catch (error) {
      console.error('❌ Error sending achievement notification:', error);
    }
  }
}

// Helper functions

function getCurrentTimeInTimezone(timezone: string): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  };
  return now.toLocaleTimeString('en-US', options).substring(0, 5);
}

function getHourInTimezone(timezone: string): number {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    hour12: false,
    timeZone: timezone,
  };
  return parseInt(now.toLocaleTimeString('en-US', options));
}

function isInQuietHours(currentTime: string, start: string, end: string): boolean {
  const current = timeToMinutes(currentTime);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (startMinutes <= endMinutes) {
    return current >= startMinutes && current <= endMinutes;
  } else {
    return current >= startMinutes || current <= endMinutes;
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

async function getUpcomingMeal(
  userId: string,
  menuId: string,
  mealType: MealTiming
): Promise<{ name: string; day_number: number } | null> {
  const menu = await prisma.recommendedMenu.findUnique({
    where: { menu_id: menuId },
    include: {
      meals: {
        where: { meal_type: mealType },
        orderBy: { day_number: 'asc' },
      },
    },
  });

  if (!menu || !menu.start_date) return null;

  // Calculate current day
  const startDate = new Date(menu.start_date);
  startDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentDay = daysDiff + 1;

  // Find meal for current day
  const meal = menu.meals.find(m => m.day_number === currentDay);

  return meal ? { name: meal.name, day_number: meal.day_number } : null;
}

export default ScheduledNotificationService;
