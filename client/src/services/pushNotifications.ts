/**
 * Push Notification Service
 * A comprehensive push notification system using react-native-push-notification
 * Works with Firebase Cloud Messaging (FCM) for Android and APNs for iOS
 * NO EXPO DEPENDENCIES
 */

import { Platform, AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PushNotification, {
  Importance,
  PushNotificationScheduleObject,
} from "react-native-push-notification";
import PushNotificationIOS from "@react-native-community/push-notification-ios";
import { api } from "./api";

// ==================== TYPES ====================

export interface DeviceToken {
  token: string;
  platform: "ios" | "android";
  deviceId?: string;
  createdAt: Date;
}

export interface NotificationPayload {
  id?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channelId?: string;
  sound?: boolean;
  vibrate?: boolean;
  priority?: "high" | "default" | "low";
  badge?: number;
  largeIcon?: string;
  smallIcon?: string;
  bigPictureUrl?: string;
}

export interface ScheduledNotification extends NotificationPayload {
  date: Date;
  repeatType?: "day" | "week" | "time" | "hour" | "minute";
  repeatTime?: number;
}

export interface MealReminderConfig {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  time: string; // HH:mm format
  enabled: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  mealReminders: boolean;
  goalReminders: boolean;
  waterReminders: boolean;
  weeklyReports: boolean;
  achievements: boolean;
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm
  quietHoursEnd: string; // HH:mm
  mealReminderConfigs: MealReminderConfig[];
}

// ==================== CONSTANTS ====================

const STORAGE_KEYS = {
  DEVICE_TOKEN: "push_device_token",
  NOTIFICATION_PREFS: "notification_preferences",
  LAST_NOTIFICATION_CHECK: "last_notification_check",
};

const NOTIFICATION_CHANNELS = {
  DEFAULT: {
    channelId: "default-channel",
    channelName: "Default Notifications",
    channelDescription: "General app notifications",
    importance: Importance.HIGH,
    vibrate: true,
    playSound: true,
  },
  MEAL_REMINDERS: {
    channelId: "meal-reminders",
    channelName: "Meal Reminders",
    channelDescription: "Reminders to log your meals",
    importance: Importance.HIGH,
    vibrate: true,
    playSound: true,
  },
  GOALS: {
    channelId: "goals-channel",
    channelName: "Goal Updates",
    channelDescription: "Notifications about your nutrition goals",
    importance: Importance.DEFAULT,
    vibrate: true,
    playSound: true,
  },
  ACHIEVEMENTS: {
    channelId: "achievements-channel",
    channelName: "Achievements",
    channelDescription: "Celebrate your achievements",
    importance: Importance.HIGH,
    vibrate: true,
    playSound: true,
  },
  WATER: {
    channelId: "water-reminders",
    channelName: "Water Reminders",
    channelDescription: "Stay hydrated reminders",
    importance: Importance.DEFAULT,
    vibrate: false,
    playSound: true,
  },
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  mealReminders: true,
  goalReminders: true,
  waterReminders: true,
  weeklyReports: true,
  achievements: true,
  sound: true,
  vibration: true,
  badge: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  mealReminderConfigs: [
    { mealType: "breakfast", time: "08:00", enabled: true },
    { mealType: "lunch", time: "12:30", enabled: true },
    { mealType: "dinner", time: "19:00", enabled: true },
    { mealType: "snack", time: "15:30", enabled: false },
  ],
};

// ==================== PUSH NOTIFICATION SERVICE ====================

class PushNotificationServiceClass {
  private static instance: PushNotificationServiceClass;
  private isInitialized = false;
  private deviceToken: string | null = null;
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;
  private appStateSubscription: any = null;
  private onNotificationCallback: ((notification: any) => void) | null = null;
  private onTokenRefreshCallback: ((token: string) => void) | null = null;

  private constructor() {}

  static getInstance(): PushNotificationServiceClass {
    if (!PushNotificationServiceClass.instance) {
      PushNotificationServiceClass.instance = new PushNotificationServiceClass();
    }
    return PushNotificationServiceClass.instance;
  }

  // ==================== INITIALIZATION ====================

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log("📱 Push notifications already initialized");
      return true;
    }

    try {
      console.log("🚀 Initializing push notification service...");

      // Load saved preferences
      await this.loadPreferences();

      // Configure the notification library
      this.configurePushNotification();

      // Create notification channels (Android)
      this.createNotificationChannels();

      // Listen for app state changes
      this.setupAppStateListener();

      // Load saved device token
      const savedToken = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_TOKEN);
      if (savedToken) {
        this.deviceToken = savedToken;
        console.log("📱 Loaded saved device token");
      }

      this.isInitialized = true;
      console.log("✅ Push notification service initialized successfully");

      return true;
    } catch (error) {
      console.error("❌ Failed to initialize push notifications:", error);
      return false;
    }
  }

  private configurePushNotification(): void {
    PushNotification.configure({
      // Called when Token is generated
      onRegister: (tokenData) => {
        console.log("📱 Device token received:", tokenData.token.substring(0, 20) + "...");
        this.deviceToken = tokenData.token;
        this.saveDeviceToken(tokenData.token);
        this.registerTokenWithServer(tokenData.token);

        if (this.onTokenRefreshCallback) {
          this.onTokenRefreshCallback(tokenData.token);
        }
      },

      // Called when a notification is received
      onNotification: (notification) => {
        console.log("🔔 Notification received:", notification);

        // Handle the notification
        this.handleNotification(notification);

        // Required on iOS
        if (Platform.OS === "ios") {
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        }
      },

      // Called when user taps on notification
      onAction: (notification) => {
        console.log("👆 Notification action:", notification.action);
        this.handleNotificationAction(notification);
      },

      // Called when registration fails
      onRegistrationError: (error) => {
        console.error("❌ Registration error:", error.message);
      },

      // iOS only
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // Should the initial notification be popped automatically
      popInitialNotification: true,

      // Request permissions on iOS
      requestPermissions: Platform.OS === "ios",
    });
  }

  private createNotificationChannels(): void {
    if (Platform.OS !== "android") return;

    Object.values(NOTIFICATION_CHANNELS).forEach((channel) => {
      PushNotification.createChannel(
        {
          channelId: channel.channelId,
          channelName: channel.channelName,
          channelDescription: channel.channelDescription,
          importance: channel.importance,
          vibrate: channel.vibrate,
          playSound: channel.playSound,
        },
        (created) => {
          if (created) {
            console.log(`✅ Created notification channel: ${channel.channelName}`);
          }
        }
      );
    });
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          // Clear badge count when app becomes active
          this.clearBadgeCount();
          // Check for any pending notifications
          this.checkPendingNotifications();
        }
      }
    );
  }

  // ==================== TOKEN MANAGEMENT ====================

  private async saveDeviceToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_TOKEN, token);
    } catch (error) {
      console.error("Failed to save device token:", error);
    }
  }

  private async registerTokenWithServer(token: string): Promise<void> {
    try {
      await api.post("/notifications/register-device", {
        token,
        platform: Platform.OS.toUpperCase(), // Server expects IOS or ANDROID
        deviceName: `${Platform.OS} ${Platform.Version}`,
        appVersion: "1.0.0", // TODO: Get from app.json or package.json
      });
      console.log("✅ Device token registered with server");
    } catch (error: any) {
      // Don't fail silently - log with details but don't crash the app
      if (error?.response?.status === 401) {
        console.log("⚠️ Not authenticated, will retry token registration after login");
      } else if (error?.code === 'ERR_NETWORK') {
        console.log("⚠️ Network error, will retry token registration later");
      } else {
        console.error("Failed to register device token with server:", error?.message || error);
      }
    }
  }

  async syncPreferencesWithServer(): Promise<void> {
    try {
      await api.put("/notifications/preferences", {
        meal_reminders: this.preferences.mealReminders,
        water_reminders: this.preferences.waterReminders,
        goal_reminders: this.preferences.goalReminders,
        achievement_alerts: this.preferences.achievements,
        weekly_reports: this.preferences.weeklyReports,
        quiet_hours_enabled: this.preferences.quietHoursEnabled,
        quiet_hours_start: this.preferences.quietHoursStart,
        quiet_hours_end: this.preferences.quietHoursEnd,
        breakfast_reminder_time: this.preferences.mealReminderConfigs.find(c => c.mealType === 'breakfast')?.time,
        lunch_reminder_time: this.preferences.mealReminderConfigs.find(c => c.mealType === 'lunch')?.time,
        dinner_reminder_time: this.preferences.mealReminderConfigs.find(c => c.mealType === 'dinner')?.time,
        snack_reminder_time: this.preferences.mealReminderConfigs.find(c => c.mealType === 'snack')?.time,
      });
      console.log("✅ Notification preferences synced with server");
    } catch (error: any) {
      // Don't fail silently but also don't crash
      if (error?.response?.status === 401) {
        console.log("⚠️ Not authenticated, preferences will sync after login");
      } else {
        console.error("Failed to sync preferences with server:", error?.message || error);
      }
    }
  }

  async getDeviceToken(): Promise<string | null> {
    return this.deviceToken;
  }

  // ==================== REGISTER FOR PUSH (backward compatibility) ====================

  async registerForPushNotifications(): Promise<string | null> {
    try {
      await this.initialize();
      return this.deviceToken;
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return null;
    }
  }

  // ==================== NOTIFICATION HANDLING ====================

  private handleNotification(notification: any): void {
    const { data, userInteraction } = notification;

    // If user tapped the notification
    if (userInteraction) {
      this.handleNotificationTap(data);
    }

    // Call external callback if set
    if (this.onNotificationCallback) {
      this.onNotificationCallback(notification);
    }
  }

  private handleNotificationTap(data: any): void {
    if (!data) return;

    // Store navigation data for app to handle
    AsyncStorage.setItem(
      "pending_notification_navigation",
      JSON.stringify({
        type: data.type,
        screen: data.screen,
        params: data.params,
        timestamp: Date.now(),
      })
    ).catch(console.error);
  }

  private handleNotificationAction(notification: any): void {
    const { action, data } = notification;

    switch (action) {
      case "log_meal":
        AsyncStorage.setItem(
          "pending_notification_navigation",
          JSON.stringify({ screen: "log-meal", type: data?.mealType })
        );
        break;
      case "view_goals":
        AsyncStorage.setItem(
          "pending_notification_navigation",
          JSON.stringify({ screen: "goals" })
        );
        break;
      case "dismiss":
        // Just dismiss the notification
        break;
      default:
        break;
    }
  }

  async checkPendingNotifications(): Promise<any | null> {
    try {
      const pending = await AsyncStorage.getItem("pending_notification_navigation");
      if (pending) {
        await AsyncStorage.removeItem("pending_notification_navigation");
        return JSON.parse(pending);
      }
      return null;
    } catch (error) {
      console.error("Error checking pending notifications:", error);
      return null;
    }
  }

  // ==================== SEND NOTIFICATIONS ====================

  sendLocalNotification(payload: NotificationPayload): void {
    if (!this.preferences.enabled) {
      console.log("📵 Notifications disabled, skipping...");
      return;
    }

    if (this.isQuietHours()) {
      console.log("🌙 Quiet hours active, skipping notification...");
      return;
    }

    const notificationConfig: any = {
      channelId: payload.channelId || NOTIFICATION_CHANNELS.DEFAULT.channelId,
      title: payload.title,
      message: payload.message,
      playSound: payload.sound ?? this.preferences.sound,
      vibrate: payload.vibrate ?? this.preferences.vibration,
      priority: payload.priority || "high",
      data: payload.data || {},
    };

    if (payload.id) {
      notificationConfig.id = payload.id;
    }

    if (Platform.OS === "android") {
      notificationConfig.smallIcon = payload.smallIcon || "ic_notification";
      notificationConfig.largeIcon = payload.largeIcon || "ic_launcher";

      if (payload.bigPictureUrl) {
        notificationConfig.bigPictureUrl = payload.bigPictureUrl;
      }
    }

    if (this.preferences.badge && payload.badge !== undefined) {
      notificationConfig.number = payload.badge;
    }

    PushNotification.localNotification(notificationConfig);
    console.log("🔔 Local notification sent:", payload.title);
  }

  scheduleNotification(scheduled: ScheduledNotification): void {
    if (!this.preferences.enabled) {
      console.log("📵 Notifications disabled, skipping schedule...");
      return;
    }

    const scheduleConfig: PushNotificationScheduleObject = {
      channelId: scheduled.channelId || NOTIFICATION_CHANNELS.DEFAULT.channelId,
      title: scheduled.title,
      message: scheduled.message,
      date: scheduled.date,
      playSound: scheduled.sound ?? this.preferences.sound,
      vibrate: scheduled.vibrate ?? this.preferences.vibration,
      userInfo: scheduled.data || {}, // Use userInfo instead of data for scheduled notifications
      allowWhileIdle: true,
    };

    if (scheduled.id) {
      // Generate a stable numeric ID from string ID using hash
      const numericId = this.stringToNumericId(scheduled.id);
      scheduleConfig.id = numericId;
    }

    if (scheduled.repeatType) {
      scheduleConfig.repeatType = scheduled.repeatType;
      if (scheduled.repeatTime) {
        scheduleConfig.repeatTime = scheduled.repeatTime;
      }
    }

    PushNotification.localNotificationSchedule(scheduleConfig);
    console.log("⏰ Notification scheduled:", scheduled.title, "at", scheduled.date);
  }

  /**
   * Convert string ID to stable numeric ID for react-native-push-notification
   */
  private stringToNumericId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // ==================== MEAL REMINDERS ====================

  async scheduleMealReminders(userQuestionnaire?: any): Promise<void> {
    if (!this.preferences.mealReminders) {
      console.log("📵 Meal reminders disabled");
      return;
    }

    // Cancel existing meal reminders first
    await this.cancelMealReminders();

    // If userQuestionnaire provided, use its meal times
    if (userQuestionnaire?.meal_times) {
      const mealTimes = userQuestionnaire.meal_times
        .split(",")
        .map((time: string) => time.trim());
      const mealNames = ["Breakfast", "Lunch", "Dinner", "Snack", "Late Snack"];

      for (let i = 0; i < mealTimes.length; i++) {
        const timeStr = mealTimes[i];
        const [hours, minutes] = timeStr.split(":").map(Number);

        if (isNaN(hours) || isNaN(minutes)) continue;

        const mealName = mealNames[i] || `Meal ${i + 1}`;
        const now = new Date();
        const scheduledDate = new Date();
        scheduledDate.setHours(hours, minutes, 0, 0);

        if (scheduledDate <= now) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        this.scheduleNotification({
          id: `meal-reminder-${i}`,
          title: `🍽️ ${mealName} Time!`,
          message: `Don't forget to log your ${mealName.toLowerCase()} and track your nutrition!`,
          date: scheduledDate,
          repeatType: "day",
          channelId: NOTIFICATION_CHANNELS.MEAL_REMINDERS.channelId,
          data: {
            type: "meal_reminder",
            mealType: mealName,
            mealIndex: i,
            time: timeStr,
          },
          sound: true,
          vibrate: true,
        });
      }

      console.log(`✅ Scheduled ${mealTimes.length} meal reminders from questionnaire`);
      return;
    }

    // Use preferences-based meal reminders
    const mealEmojis = {
      breakfast: "🍳",
      lunch: "🥗",
      dinner: "🍽️",
      snack: "🍎",
    };

    const mealMessages = {
      breakfast: "Start your day right! Time to log your breakfast.",
      lunch: "Halfway through the day! Don't forget to log your lunch.",
      dinner: "Evening meal time! Log your dinner to stay on track.",
      snack: "Snack time! Remember to log any snacks you've had.",
    };

    for (const config of this.preferences.mealReminderConfigs) {
      if (!config.enabled) continue;

      const [hours, minutes] = config.time.split(":").map(Number);
      const now = new Date();
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);

      if (scheduledDate <= now) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      this.scheduleNotification({
        id: `meal-reminder-${config.mealType}`,
        title: `${mealEmojis[config.mealType]} ${config.mealType.charAt(0).toUpperCase() + config.mealType.slice(1)} Time!`,
        message: mealMessages[config.mealType],
        date: scheduledDate,
        repeatType: "day",
        channelId: NOTIFICATION_CHANNELS.MEAL_REMINDERS.channelId,
        data: {
          type: "meal_reminder",
          mealType: config.mealType,
        },
        sound: true,
        vibrate: true,
      });
    }

    console.log("✅ Meal reminders scheduled");
  }

  async cancelMealReminders(): Promise<void> {
    const mealTypes = ["breakfast", "lunch", "dinner", "snack", "0", "1", "2", "3", "4"];
    for (const type of mealTypes) {
      const notificationId = `meal-reminder-${type}`;
      // Use the same numeric ID conversion as scheduling
      const numericId = this.stringToNumericId(notificationId);
      PushNotification.cancelLocalNotification(String(numericId));
    }
    console.log("🗑️ Meal reminders cancelled");
  }

  // ==================== MENU RATING REMINDERS ====================

  async scheduleMenuRatingReminder(menuId: string, menuName: string): Promise<void> {
    try {
      const userQuestionnaire = await AsyncStorage.getItem("user_questionnaire");
      if (!userQuestionnaire) return;

      const questionnaire = JSON.parse(userQuestionnaire);
      const mealTimes =
        questionnaire.meal_times?.split(",").map((time: string) => time.trim()) || [];

      for (let i = 0; i < mealTimes.length; i++) {
        const timeStr = mealTimes[i];
        const [hours, minutes] = timeStr.split(":").map(Number);

        if (isNaN(hours) || isNaN(minutes)) continue;

        // Schedule rating reminder 1 hour after meal time
        let reminderHours = hours + 1;
        if (reminderHours >= 24) {
          reminderHours -= 24;
        }

        const now = new Date();
        const scheduledDate = new Date();
        scheduledDate.setHours(reminderHours, minutes, 0, 0);

        if (scheduledDate <= now) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        this.scheduleNotification({
          id: `rating-reminder-${menuId}-${i}`,
          title: "⭐ Rate Your Meal Experience",
          message: `How was your meal from ${menuName}? Your feedback helps us improve!`,
          date: scheduledDate,
          repeatType: "day",
          channelId: NOTIFICATION_CHANNELS.DEFAULT.channelId,
          data: {
            type: "menu_rating",
            menuId,
            menuName,
            mealIndex: i,
          },
          sound: true,
        });
      }

      console.log(`✅ Scheduled rating reminders for menu: ${menuName}`);
    } catch (error) {
      console.error("Error scheduling menu rating reminders:", error);
    }
  }

  // ==================== WATER REMINDERS ====================

  async scheduleWaterReminder(): Promise<void> {
    if (!this.preferences.waterReminders) {
      console.log("📵 Water reminders disabled");
      return;
    }

    // Cancel existing water reminders
    await this.cancelWaterReminders();

    // Schedule water reminders every 2 hours from 8 AM to 8 PM
    const startHour = 8;
    const endHour = 20;
    const intervalHours = 2;

    for (let hour = startHour; hour <= endHour; hour += intervalHours) {
      const now = new Date();
      const scheduledDate = new Date();
      scheduledDate.setHours(hour, 0, 0, 0);

      if (scheduledDate <= now) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      this.scheduleNotification({
        id: `water-reminder-${hour}`,
        title: "💧 Stay Hydrated!",
        message: "Time to drink some water. Your body will thank you!",
        date: scheduledDate,
        repeatType: "day",
        channelId: NOTIFICATION_CHANNELS.WATER.channelId,
        data: { type: "water_reminder", hour },
        sound: true,
        vibrate: false,
      });
    }

    console.log("✅ Water reminders scheduled");
  }

  async cancelWaterReminders(): Promise<void> {
    for (let hour = 8; hour <= 20; hour += 2) {
      const notificationId = `water-reminder-${hour}`;
      const numericId = this.stringToNumericId(notificationId);
      PushNotification.cancelLocalNotification(String(numericId));
    }
    console.log("🗑️ Water reminders cancelled");
  }

  // ==================== WEEKLY PROGRESS ====================

  async scheduleWeeklyProgress(): Promise<void> {
    if (!this.preferences.weeklyReports) {
      console.log("📵 Weekly reports disabled");
      return;
    }

    // Schedule for Monday at 9 AM
    const now = new Date();
    const scheduledDate = new Date();

    // Find next Monday
    const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
    scheduledDate.setDate(now.getDate() + daysUntilMonday);
    scheduledDate.setHours(9, 0, 0, 0);

    this.scheduleNotification({
      id: "weekly-progress",
      title: "📊 Weekly Progress",
      message: "Check out your nutrition progress this week!",
      date: scheduledDate,
      repeatType: "week",
      channelId: NOTIFICATION_CHANNELS.DEFAULT.channelId,
      data: { type: "weekly_progress" },
      sound: true,
    });

    console.log("✅ Weekly progress reminder scheduled");
  }

  // ==================== GOAL REMINDERS ====================

  sendGoalReminderNotification(goalType: string, progress: number, target: number): void {
    if (!this.preferences.goalReminders) return;

    const percentage = Math.round((progress / target) * 100);
    let message: string;
    let title: string;

    if (percentage >= 100) {
      title = "🎉 Goal Achieved!";
      message = `Congratulations! You've reached your ${goalType} goal!`;
    } else if (percentage >= 80) {
      title = "💪 Almost There!";
      message = `You're ${percentage}% to your ${goalType} goal. Keep going!`;
    } else if (percentage >= 50) {
      title = "📈 Halfway There!";
      message = `You've reached ${percentage}% of your ${goalType} goal.`;
    } else {
      title = `🎯 ${goalType} Update`;
      message = `You're at ${percentage}% of your daily ${goalType} goal. Log more meals to stay on track!`;
    }

    this.sendLocalNotification({
      title,
      message,
      channelId: NOTIFICATION_CHANNELS.GOALS.channelId,
      data: { type: "goal_reminder", goalType, progress, target },
    });
  }

  sendEndOfDayReminder(unloggedMeals: string[]): void {
    if (!this.preferences.goalReminders) return;

    if (unloggedMeals.length === 0) {
      this.sendLocalNotification({
        title: "🌟 Great Job Today!",
        message: "You've logged all your meals. Keep up the excellent work!",
        channelId: NOTIFICATION_CHANNELS.GOALS.channelId,
        data: { type: "end_of_day", status: "complete" },
      });
    } else {
      this.sendLocalNotification({
        title: "📝 Daily Check-in",
        message: `Don't forget to log your ${unloggedMeals.join(", ")}! Track your nutrition before the day ends.`,
        channelId: NOTIFICATION_CHANNELS.GOALS.channelId,
        data: { type: "end_of_day", status: "incomplete", unloggedMeals },
      });
    }
  }

  // ==================== ACHIEVEMENT NOTIFICATIONS ====================

  sendAchievementNotification(
    achievementName: string,
    description: string,
    xpEarned?: number
  ): void {
    if (!this.preferences.achievements) return;

    this.sendLocalNotification({
      title: "🏆 Achievement Unlocked!",
      message: `${achievementName}: ${description}${xpEarned ? ` (+${xpEarned} XP)` : ""}`,
      channelId: NOTIFICATION_CHANNELS.ACHIEVEMENTS.channelId,
      data: { type: "achievement", name: achievementName, xp: xpEarned },
      sound: true,
      vibrate: true,
    });
  }

  sendStreakNotification(streakDays: number): void {
    if (!this.preferences.achievements) return;

    let message: string;
    if (streakDays === 7) {
      message = "One week strong! You've logged meals for 7 days straight! 🔥";
    } else if (streakDays === 30) {
      message = "A whole month! 30 days of consistent tracking. You're unstoppable! 🌟";
    } else if (streakDays % 10 === 0) {
      message = `${streakDays} days! Your dedication is inspiring. Keep it up! 💪`;
    } else {
      message = `${streakDays} days and counting! Your streak is on fire! 🔥`;
    }

    this.sendLocalNotification({
      title: `🔥 ${streakDays} Day Streak!`,
      message,
      channelId: NOTIFICATION_CHANNELS.ACHIEVEMENTS.channelId,
      data: { type: "streak", days: streakDays },
    });
  }

  // ==================== PREFERENCES MANAGEMENT ====================

  async loadPreferences(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFS);
      if (saved) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
      this.preferences = DEFAULT_PREFERENCES;
    }
  }

  async savePreferences(prefs: Partial<NotificationPreferences>): Promise<void> {
    try {
      this.preferences = { ...this.preferences, ...prefs };
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_PREFS,
        JSON.stringify(this.preferences)
      );

      // Reschedule notifications based on new preferences
      if (prefs.mealReminders !== undefined || prefs.mealReminderConfigs) {
        if (this.preferences.mealReminders) {
          await this.scheduleMealReminders();
        } else {
          await this.cancelMealReminders();
        }
      }

      if (prefs.waterReminders !== undefined) {
        if (this.preferences.waterReminders) {
          await this.scheduleWaterReminder();
        } else {
          await this.cancelWaterReminders();
        }
      }

      console.log("✅ Notification preferences saved");
    } catch (error) {
      console.error("Error saving notification preferences:", error);
    }
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // ==================== INITIALIZE ALL NOTIFICATIONS ====================

  async initializeNotifications(userQuestionnaire?: any): Promise<string | null> {
    try {
      await this.initialize();

      if (userQuestionnaire) {
        await this.scheduleMealReminders(userQuestionnaire);
      } else {
        await this.scheduleMealReminders();
      }

      await this.scheduleWaterReminder();
      await this.scheduleWeeklyProgress();

      return this.deviceToken;
    } catch (error) {
      console.error("Error initializing notifications:", error);
      return null;
    }
  }

  // ==================== UTILITY METHODS ====================

  private isQuietHours(): boolean {
    if (!this.preferences.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = this.preferences.quietHoursStart.split(":").map(Number);
    const [endHour, endMin] = this.preferences.quietHoursEnd.split(":").map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  clearBadgeCount(): void {
    PushNotification.setApplicationIconBadgeNumber(0);
  }

  setBadgeCount(count: number): void {
    if (this.preferences.badge) {
      PushNotification.setApplicationIconBadgeNumber(count);
    }
  }

  cancelAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
    console.log("🗑️ All notifications cancelled");
  }

  getScheduledNotifications(): Promise<any[]> {
    return new Promise((resolve) => {
      PushNotification.getScheduledLocalNotifications((notifications) => {
        resolve(notifications);
      });
    });
  }

  // ==================== CALLBACKS ====================

  setOnNotificationCallback(callback: (notification: any) => void): void {
    this.onNotificationCallback = callback;
  }

  setOnTokenRefreshCallback(callback: (token: string) => void): void {
    this.onTokenRefreshCallback = callback;
  }

  // ==================== CLEANUP ====================

  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.onNotificationCallback = null;
    this.onTokenRefreshCallback = null;
  }

  // ==================== STATUS ====================

  getStatus(): {
    isInitialized: boolean;
    hasDeviceToken: boolean;
    notificationsEnabled: boolean;
    platform: string;
  } {
    return {
      isInitialized: this.isInitialized,
      hasDeviceToken: !!this.deviceToken,
      notificationsEnabled: this.preferences.enabled,
      platform: Platform.OS,
    };
  }
}

// Create singleton instance
const pushNotificationInstance = PushNotificationServiceClass.getInstance();

// Export for backward compatibility with existing code
export class PushNotificationService {
  static async registerForPushNotifications() {
    return pushNotificationInstance.registerForPushNotifications();
  }

  static async scheduleMealReminders(userQuestionnaire: any) {
    return pushNotificationInstance.scheduleMealReminders(userQuestionnaire);
  }

  static async scheduleMenuRatingReminder(menuId: string, menuName: string) {
    return pushNotificationInstance.scheduleMenuRatingReminder(menuId, menuName);
  }

  static async scheduleWaterReminder() {
    return pushNotificationInstance.scheduleWaterReminder();
  }

  static async scheduleWeeklyProgress() {
    return pushNotificationInstance.scheduleWeeklyProgress();
  }

  static async initializeNotifications(userQuestionnaire?: any) {
    return pushNotificationInstance.initializeNotifications(userQuestionnaire);
  }
}

// Export instance for direct access
export const pushNotifications = pushNotificationInstance;
