/**
 * Push Notification Service using Firebase Cloud Messaging (FCM)
 * Handles sending push notifications to mobile devices
 *
 * This service stores all notifications in the database and optionally sends
 * them via Firebase Cloud Messaging if configured.
 */

import { PrismaClient, NotificationType, Platform } from '@prisma/client';

const prisma = new PrismaClient();

// Firebase Admin - loaded dynamically to avoid build errors if not installed
let admin: any = null;
let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK if available and configured
 */
function initializeFirebase(): void {
  if (firebaseInitialized) return;

  // Check if FIREBASE_SERVICE_ACCOUNT_KEY exists first
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.log('ℹ️ FIREBASE_SERVICE_ACCOUNT_KEY not configured. Notifications will be stored locally.');
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    admin = require('firebase-admin');
    const serviceAccount = JSON.parse(serviceAccountKey);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('ℹ️ firebase-admin not installed. Run: npm install firebase-admin');
    } else {
      console.warn('⚠️ Failed to initialize Firebase:', error.message);
    }
  }
}

// Initialize on module load
initializeFirebase();

// Notification payload types
interface NotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}

interface MealReminderData {
  mealType: string;
  mealName?: string;
  calories?: number;
  menuId?: string;
  dayNumber?: number;
}

interface WaterReminderData {
  currentIntake: number;
  goalIntake: number;
  remainingCups: number;
}

interface AchievementData {
  achievementId: string;
  achievementName: string;
  points: number;
  icon?: string;
}

interface StreakData {
  currentStreak: number;
  bestStreak: number;
  message: string;
}

// Export the PushNotificationService class
export class PushNotificationService {
  /**
   * Register a device token for push notifications
   */
  static async registerDevice(
    userId: string,
    token: string,
    platform: Platform,
    deviceName?: string,
    appVersion?: string
  ): Promise<boolean> {
    try {
      // Check if token already exists
      const existingToken = await prisma.deviceToken.findUnique({
        where: { token },
      });

      if (existingToken) {
        // Update existing token
        await prisma.deviceToken.update({
          where: { token },
          data: {
            user_id: userId,
            platform,
            device_name: deviceName,
            app_version: appVersion,
            is_active: true,
            last_used_at: new Date(),
          },
        });
      } else {
        // Create new token
        await prisma.deviceToken.create({
          data: {
            user_id: userId,
            token,
            platform,
            device_name: deviceName,
            app_version: appVersion,
            is_active: true,
          },
        });
      }

      console.log(`✅ Device registered for user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to register device:', error);
      return false;
    }
  }

  /**
   * Unregister a device token
   */
  static async unregisterDevice(token: string): Promise<boolean> {
    try {
      await prisma.deviceToken.update({
        where: { token },
        data: { is_active: false },
      });
      console.log(`✅ Device unregistered: ${token.substring(0, 10)}...`);
      return true;
    } catch (error) {
      console.error('❌ Failed to unregister device:', error);
      return false;
    }
  }

  /**
   * Send notification to a specific user
   */
  static async sendToUser(
    userId: string,
    notification: NotificationPayload,
    type: NotificationType = 'SYSTEM'
  ): Promise<boolean> {
    try {
      // Check user's notification preferences
      const preferences = await prisma.notificationPreference.findUnique({
        where: { user_id: userId },
      });

      // Check if notification type is enabled
      if (preferences) {
        if (type === 'MEAL_REMINDER' && !preferences.meal_reminders) return false;
        if (type === 'WATER_REMINDER' && !preferences.water_reminders) return false;
        if (type === 'GOAL_REMINDER' && !preferences.goal_reminders) return false;
        if (type === 'ACHIEVEMENT' && !preferences.achievement_alerts) return false;
        if (type === 'WEEKLY_REPORT' && !preferences.weekly_reports) return false;

        // Check quiet hours
        if (preferences.quiet_hours_enabled) {
          const now = new Date();
          const currentTime = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            timeZone: preferences.timezone
          });

          const start = preferences.quiet_hours_start || '22:00';
          const end = preferences.quiet_hours_end || '07:00';

          if (isTimeInQuietHours(currentTime, start, end)) {
            console.log(`⏸️ Notification blocked - quiet hours for user ${userId}`);
            return false;
          }
        }
      }

      // Get user's active device tokens
      const deviceTokens = await prisma.deviceToken.findMany({
        where: {
          user_id: userId,
          is_active: true,
        },
      });

      if (deviceTokens.length === 0) {
        console.log(`⚠️ No active devices for user ${userId}`);
        return false;
      }

      // Create notification history record
      const historyRecord = await prisma.notificationHistory.create({
        data: {
          user_id: userId,
          title: notification.title,
          body: notification.body,
          type,
          data: notification.data as any,
          status: 'PENDING',
        },
      });

      // If Firebase is not initialized, just store the notification
      if (!firebaseInitialized || !admin) {
        console.log(`📝 Notification stored for user ${userId} (Firebase not available)`);
        await prisma.notificationHistory.update({
          where: { id: historyRecord.id },
          data: {
            status: 'PENDING',
            error_message: 'Firebase not configured - notification stored for later delivery',
          },
        });
        return true; // Return true since we stored it
      }

      // Send to all active devices via FCM
      const tokens = deviceTokens.map(d => d.token);
      const message = {
        tokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: {
          ...notification.data,
          notificationId: historyRecord.id,
          type,
        },
        android: {
          priority: 'high' as const,
          notification: {
            channelId: getAndroidChannelId(type),
            priority: 'high' as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      // Update history record
      await prisma.notificationHistory.update({
        where: { id: historyRecord.id },
        data: {
          status: response.successCount > 0 ? 'SENT' : 'FAILED',
          sent_at: new Date(),
          error_message: response.failureCount > 0
            ? `${response.failureCount} devices failed`
            : null,
        },
      });

      // Handle failed tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              // Deactivate invalid token
              prisma.deviceToken.update({
                where: { token: tokens[idx] },
                data: { is_active: false },
              }).catch(console.error);
            }
          }
        });
      }

      console.log(`✅ Notification sent to user ${userId}: ${response.successCount}/${tokens.length} successful`);
      return response.successCount > 0;
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Send meal reminder notification
   */
  static async sendMealReminder(
    userId: string,
    data: MealReminderData,
    language: string = 'en'
  ): Promise<boolean> {
    const translations = getMealReminderTranslations(data.mealType, language);

    const notification: NotificationPayload = {
      title: translations.title,
      body: data.mealName
        ? translations.bodyWithMeal.replace('{mealName}', data.mealName)
        : translations.body,
      data: {
        type: 'meal_reminder',
        mealType: data.mealType,
        menuId: data.menuId || '',
        dayNumber: String(data.dayNumber || 1),
      },
    };

    return this.sendToUser(userId, notification, 'MEAL_REMINDER');
  }

  /**
   * Send water reminder notification
   */
  static async sendWaterReminder(
    userId: string,
    data: WaterReminderData,
    language: string = 'en'
  ): Promise<boolean> {
    const translations = getWaterReminderTranslations(language);

    const notification: NotificationPayload = {
      title: translations.title,
      body: translations.body
        .replace('{remaining}', String(data.remainingCups))
        .replace('{current}', String(data.currentIntake))
        .replace('{goal}', String(data.goalIntake)),
      data: {
        type: 'water_reminder',
        currentIntake: String(data.currentIntake),
        goalIntake: String(data.goalIntake),
      },
    };

    return this.sendToUser(userId, notification, 'WATER_REMINDER');
  }

  /**
   * Send achievement notification
   */
  static async sendAchievementNotification(
    userId: string,
    data: AchievementData,
    language: string = 'en'
  ): Promise<boolean> {
    const translations = getAchievementTranslations(language);

    const notification: NotificationPayload = {
      title: translations.title,
      body: translations.body
        .replace('{name}', data.achievementName)
        .replace('{points}', String(data.points)),
      data: {
        type: 'achievement',
        achievementId: data.achievementId,
        points: String(data.points),
      },
    };

    return this.sendToUser(userId, notification, 'ACHIEVEMENT');
  }

  /**
   * Send streak notification
   */
  static async sendStreakNotification(
    userId: string,
    data: StreakData,
    language: string = 'en'
  ): Promise<boolean> {
    const translations = getStreakTranslations(data.currentStreak, language);

    const notification: NotificationPayload = {
      title: translations.title.replace('{streak}', String(data.currentStreak)),
      body: translations.body,
      data: {
        type: 'streak',
        currentStreak: String(data.currentStreak),
        bestStreak: String(data.bestStreak),
      },
    };

    return this.sendToUser(userId, notification, 'STREAK');
  }

  /**
   * Send weekly report notification
   */
  static async sendWeeklyReport(
    userId: string,
    weekData: {
      totalCalories: number;
      mealsCompleted: number;
      totalMeals: number;
      streakDays: number;
    },
    language: string = 'en'
  ): Promise<boolean> {
    const translations = getWeeklyReportTranslations(language);
    // Prevent division by zero
    const completionRate = weekData.totalMeals > 0
      ? Math.round((weekData.mealsCompleted / weekData.totalMeals) * 100)
      : 0;

    const notification: NotificationPayload = {
      title: translations.title,
      body: translations.body
        .replace('{rate}', String(completionRate))
        .replace('{streak}', String(weekData.streakDays)),
      data: {
        type: 'weekly_report',
        completionRate: String(completionRate),
        mealsCompleted: String(weekData.mealsCompleted),
      },
    };

    return this.sendToUser(userId, notification, 'WEEKLY_REPORT');
  }

  /**
   * Send notification to multiple users
   */
  static async sendToMultipleUsers(
    userIds: string[],
    notification: NotificationPayload,
    type: NotificationType = 'SYSTEM'
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (const userId of userIds) {
      const result = await this.sendToUser(userId, notification, type);
      if (result) {
        successful++;
      } else {
        failed++;
      }
    }

    return { successful, failed };
  }

  /**
   * Get user's notification preferences
   */
  static async getPreferences(userId: string) {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { user_id: userId },
    });

    // Create default preferences if not exists
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          user_id: userId,
        },
      });
    }

    return preferences;
  }

  /**
   * Update user's notification preferences
   */
  static async updatePreferences(
    userId: string,
    updates: Partial<{
      meal_reminders: boolean;
      water_reminders: boolean;
      goal_reminders: boolean;
      achievement_alerts: boolean;
      weekly_reports: boolean;
      quiet_hours_enabled: boolean;
      quiet_hours_start: string;
      quiet_hours_end: string;
      timezone: string;
      breakfast_reminder_time: string;
      lunch_reminder_time: string;
      dinner_reminder_time: string;
      snack_reminder_time: string;
      water_reminder_interval: number;
    }>
  ) {
    return prisma.notificationPreference.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        ...updates,
      },
      update: updates,
    });
  }

  /**
   * Get notification history for a user
   */
  static async getHistory(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: NotificationType;
      unreadOnly?: boolean;
    } = {}
  ) {
    const { limit = 50, offset = 0, type, unreadOnly } = options;

    return prisma.notificationHistory.findMany({
      where: {
        user_id: userId,
        ...(type && { type }),
        ...(unreadOnly && { read_at: null }),
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      await prisma.notificationHistory.update({
        where: { id: notificationId },
        data: { read_at: new Date(), status: 'READ' },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notificationHistory.updateMany({
      where: {
        user_id: userId,
        read_at: null,
      },
      data: {
        read_at: new Date(),
        status: 'READ',
      },
    });
    return result.count;
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notificationHistory.count({
      where: {
        user_id: userId,
        read_at: null,
      },
    });
  }
}

// Helper functions

function isTimeInQuietHours(currentTime: string, start: string, end: string): boolean {
  const current = timeToMinutes(currentTime);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (startMinutes <= endMinutes) {
    // Same day range (e.g., 09:00 - 17:00)
    return current >= startMinutes && current <= endMinutes;
  } else {
    // Overnight range (e.g., 22:00 - 07:00)
    return current >= startMinutes || current <= endMinutes;
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getAndroidChannelId(type: NotificationType): string {
  const channels: Record<NotificationType, string> = {
    MEAL_REMINDER: 'meal_reminders',
    WATER_REMINDER: 'water_reminders',
    GOAL_REMINDER: 'goal_reminders',
    ACHIEVEMENT: 'achievements',
    STREAK: 'achievements',
    WEEKLY_REPORT: 'weekly_reports',
    SYSTEM: 'system',
    PROMOTIONAL: 'promotional',
  };
  return channels[type] || 'default';
}

// Translation functions
function getMealReminderTranslations(mealType: string, language: string) {
  const translations: Record<string, Record<string, { title: string; body: string; bodyWithMeal: string }>> = {
    en: {
      BREAKFAST: {
        title: '🌅 Time for Breakfast!',
        body: "Start your day right with a healthy breakfast",
        bodyWithMeal: "Time for {mealName} - your perfect morning fuel!",
      },
      LUNCH: {
        title: '☀️ Lunch Time!',
        body: "It's time to refuel with a nutritious lunch",
        bodyWithMeal: "Ready for {mealName}? Let's keep your energy up!",
      },
      DINNER: {
        title: '🌙 Dinner Time!',
        body: "End your day with a delicious dinner",
        bodyWithMeal: "Time for {mealName} - a perfect end to your day!",
      },
      SNACK: {
        title: '🍎 Snack Time!',
        body: "A healthy snack to keep you going",
        bodyWithMeal: "How about {mealName}? A perfect pick-me-up!",
      },
    },
    he: {
      BREAKFAST: {
        title: '🌅 זמן ארוחת בוקר!',
        body: 'התחל את היום עם ארוחת בוקר בריאה',
        bodyWithMeal: 'הגיע הזמן ל{mealName} - הדלק המושלם לבוקר!',
      },
      LUNCH: {
        title: '☀️ זמן צהריים!',
        body: 'הגיע הזמן לארוחת צהריים מזינה',
        bodyWithMeal: 'מוכן ל{mealName}? בוא נשמור על האנרגיה!',
      },
      DINNER: {
        title: '🌙 זמן ארוחת ערב!',
        body: 'סיים את היום עם ארוחת ערב טעימה',
        bodyWithMeal: 'הגיע הזמן ל{mealName} - סיום מושלם ליום!',
      },
      SNACK: {
        title: '🍎 זמן חטיף!',
        body: 'חטיף בריא לשמור על הקצב',
        bodyWithMeal: 'מה דעתך על {mealName}? טעינה מושלמת!',
      },
    },
  };

  const lang = translations[language] || translations.en;
  const type = mealType.toUpperCase();
  return lang[type] || lang.SNACK;
}

function getWaterReminderTranslations(language: string) {
  const translations: Record<string, { title: string; body: string }> = {
    en: {
      title: '💧 Stay Hydrated!',
      body: "You're {remaining} cups away from your goal. Current: {current}ml / {goal}ml",
    },
    he: {
      title: '💧 הישאר מלא מים!',
      body: 'נשארו לך {remaining} כוסות עד ליעד. כרגע: {current}מ"ל / {goal}מ"ל',
    },
  };
  return translations[language] || translations.en;
}

function getAchievementTranslations(language: string) {
  const translations: Record<string, { title: string; body: string }> = {
    en: {
      title: '🏆 Achievement Unlocked!',
      body: "You've earned '{name}' and gained {points} points!",
    },
    he: {
      title: '🏆 הישג נפתח!',
      body: "השגת '{name}' וזכית ב-{points} נקודות!",
    },
  };
  return translations[language] || translations.en;
}

function getStreakTranslations(streak: number, language: string) {
  const translations: Record<string, { title: string; body: string }> = {
    en: {
      title: streak >= 7 ? '🔥 Amazing Streak: {streak} days!' : '⭐ Keep Going: {streak} day streak!',
      body: streak >= 7
        ? "You're on fire! Keep up the incredible work!"
        : "Great job staying consistent! Don't break your streak!",
    },
    he: {
      title: streak >= 7 ? '🔥 רצף מדהים: {streak} ימים!' : '⭐ המשך כך: רצף של {streak} ימים!',
      body: streak >= 7
        ? 'אתה בוער! המשך בעבודה המדהימה!'
        : 'עבודה מצוינת על העקביות! אל תשבור את הרצף!',
    },
  };
  return translations[language] || translations.en;
}

function getWeeklyReportTranslations(language: string) {
  const translations: Record<string, { title: string; body: string }> = {
    en: {
      title: '📊 Your Weekly Summary',
      body: "You completed {rate}% of your meals this week with a {streak}-day streak!",
    },
    he: {
      title: '📊 סיכום שבועי',
      body: 'השלמת {rate}% מהארוחות השבוע עם רצף של {streak} ימים!',
    },
  };
  return translations[language] || translations.en;
}

export default PushNotificationService;
