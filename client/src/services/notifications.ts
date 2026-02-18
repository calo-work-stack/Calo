import { Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import Constants from "expo-constants";

export interface NotificationSettings {
  systemNotifications: boolean;
  mealReminders: boolean;
  waterReminders: boolean;
  goalAchievements: boolean;
  weeklyReports: boolean;
  soundEnabled: boolean;
  badgeEnabled: boolean;
  vibrationEnabled: boolean;
  reminderTimes: string[];
  notificationFrequency: "DAILY" | "WEEKLY" | "NONE";
}

const defaultSettings: NotificationSettings = {
  systemNotifications: true,
  mealReminders: true,
  waterReminders: true,
  goalAchievements: true,
  weeklyReports: true,
  soundEnabled: true,
  badgeEnabled: true,
  vibrationEnabled: true,
  reminderTimes: ["08:00", "12:30", "18:00"],
  notificationFrequency: "DAILY",
};

// Check if we're in Expo Go before loading notifications
const isExpoGoDirect = __DEV__ && Constants.appOwnership === "expo";

// Mock notifications object for Expo Go
const mockNotifications = {
  setNotificationHandler: () => {},
  getPermissionsAsync: async () => ({ status: "granted" }),
  requestPermissionsAsync: async () => ({ status: "granted" }),
  getExpoPushTokenAsync: async () => ({ data: null }),
  setNotificationChannelAsync: async () => {},
  scheduleNotificationAsync: async () => {},
  cancelAllScheduledNotificationsAsync: async () => {},
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  addNotificationReceivedListener: () => {},
  addNotificationResponseReceivedListener: () => {},
  AndroidImportance: { MAX: 5, HIGH: 4 },
  AndroidNotificationPriority: { HIGH: 1 },
  SchedulableTriggerInputTypes: { CALENDAR: "calendar" },
};

// Load notifications only if not in Expo Go
let Notifications: any = isExpoGoDirect ? mockNotifications : null;

async function getNotifications() {
  if (isExpoGoDirect) {
    return mockNotifications;
  }

  if (Notifications) return Notifications;

  try {
    Notifications = await import("expo-notifications");
    return Notifications;
  } catch (error) {
    console.error("Failed to load expo-notifications:", error);
    return mockNotifications;
  }
}

export class NotificationService {
  private static isInitialized = false;
  private static expoPushToken: string | null = null;
  private static isExpoGo = isExpoGoDirect;
  private static notificationsAvailable = !isExpoGoDirect;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log("🚀 Initializing notification system...");

      if (this.isExpoGo) {
        console.log(
          "⚠️ Running in Expo Go - remote push notifications unavailable (SDK 53+). Use a development build for push notifications."
        );
        this.isInitialized = true;
        this.notificationsAvailable = false;
        return;
      }

      // Load notifications module
      const notif = await getNotifications();
      if (!notif || notif === mockNotifications) {
        console.warn("⚠️ Notifications module not available");
        this.isInitialized = true;
        this.notificationsAvailable = false;
        return;
      }

      this.notificationsAvailable = true;

      // Configure how notifications are handled when app is in foreground
      notif.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.warn("❌ Notification permissions denied");
        this.isInitialized = true;
        return;
      }

      // Register for push notifications only in production builds
      if (!__DEV__ && Device.isDevice) {
        const token = await this.registerForPushNotifications();
        if (token) {
          this.expoPushToken = token;
          console.log(
            "✅ Push token obtained:",
            token.substring(0, 20) + "..."
          );
          await AsyncStorage.setItem("expo_push_token", token);
        }
      }

      // Set up notification handlers
      this.setupNotificationHandlers();

      this.isInitialized = true;
      console.log("✅ Notification system initialized successfully");
    } catch (error) {
      console.error("❌ Notification initialization failed:", error);
      this.isInitialized = true;
    }
  }

  static async requestPermissions(): Promise<boolean> {
    try {
      if (this.isExpoGo) return false;

      if (!Device.isDevice) {
        console.warn("Notifications only work on physical devices");
        return false;
      }

      const notif = await getNotifications();
      if (!notif || notif === mockNotifications) return false;

      const { status: existingStatus } =
        await notif.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await notif.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Failed to get notification permissions");
        return false;
      }

      return true;
    } catch (error) {
      console.error("💥 Error requesting permissions:", error);
      return false;
    }
  }

  private static async registerForPushNotifications(): Promise<string | null> {
    try {
      if (this.isExpoGo || !Device.isDevice) {
        return null;
      }

      const notif = await getNotifications();
      if (!notif || notif === mockNotifications) return null;

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.warn(
          "⚠️ No projectId found, skipping push notification registration"
        );
        return null;
      }

      const token = await notif.getExpoPushTokenAsync({ projectId });

      // Configure channels for Android
      if (Platform.OS === "android") {
        await notif.setNotificationChannelAsync("default", {
          name: "Default",
          importance: notif.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#10b981",
        });

        await notif.setNotificationChannelAsync("meal-reminders", {
          name: "Meal Reminders",
          importance: notif.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#10b981",
          sound: "default",
        });
      }

      return token.data;
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }
  }

  private static setupNotificationHandlers(): void {
    if (this.isExpoGo) return;

    getNotifications().then((notif) => {
      if (!notif || notif === mockNotifications) return;

      // Handle notification received while app is in foreground
      notif.addNotificationReceivedListener((notification: any) => {
        console.log("🔔 Notification received");
      });

      // Handle notification tapped
      notif.addNotificationResponseReceivedListener((response: any) => {
        console.log("👆 Notification tapped");
        const data = response.notification.request.content.data;

        // Store navigation data
        if (data && typeof data === "object") {
          AsyncStorage.setItem("pending_navigation", JSON.stringify(data)).catch(
            console.error
          );
        }
      });
    });
  }

  static async sendLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      const notif = await getNotifications();
      if (!notif || notif === mockNotifications) {
        console.warn("Notifications not available");
        return;
      }

      await notif.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          priority: notif.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error("Error sending local notification:", error);
    }
  }

  static async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      if (!expoPushToken) {
        console.error("No push token provided");
        return;
      }

      const message = {
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data: data || {},
      };

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error("❌ Push notification error:", result.errors);
      } else {
        console.log("✅ Push notification sent successfully");
      }
    } catch (error) {
      console.error("💥 Error sending push notification:", error);
    }
  }

  static async sendWelcomeNotification(
    userName: string,
    userEmail: string
  ): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const title = `🎉 Welcome ${userName}!`;
      const body = `Welcome to Calo - your nutrition tracking app!\n\nStart tracking your meals and reach your health goals!`;

      await this.sendLocalNotification(title, body, {
        type: "welcome",
        userName,
        userEmail,
        screen: "home",
      });

      console.log(`✅ Welcome notification sent to ${userName}`);
    } catch (error) {
      console.error("💥 Error sending welcome notification:", error);
    }
  }

  static async sendInstantNotification(
    title: string,
    message: string,
    data: any = {}
  ): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await this.sendLocalNotification(title, message, data);
    } catch (error) {
      console.error("💥 Error sending instant notification:", error);
    }
  }

  static async sendGoalAchievement(
    title: string,
    message: string
  ): Promise<void> {
    try {
      await this.sendLocalNotification(`🎉 ${title}`, message, {
        type: "achievement",
        category: "goal",
      });
    } catch (error) {
      console.error("💥 Error sending achievement notification:", error);
    }
  }

  static async scheduleMealReminder(
    mealName: string,
    time: string
  ): Promise<void> {
    try {
      if (this.isExpoGo) {
        console.log(`📱 [Mock Reminder] ${mealName} at ${time}`);
        return;
      }

      if (!this.isInitialized) {
        await this.initialize();
      }

      const notif = await getNotifications();
      if (!notif || notif === mockNotifications) return;

      const [hours, minutes] = time.split(":").map(Number);

      await notif.scheduleNotificationAsync({
        content: {
          title: `🍽️ ${mealName} Time!`,
          body: `Don't forget to log your ${mealName.toLowerCase()} and track your nutrition!`,
          data: {
            type: "meal_reminder",
            mealName,
            time,
          },
          sound: true,
          priority: notif.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: notif.SchedulableTriggerInputTypes.CALENDAR,
          repeats: true,
          hour: hours,
          minute: minutes,
        },
      });

      console.log(`✅ Meal reminder scheduled for ${mealName} at ${time}`);
    } catch (error) {
      console.error("💥 Error scheduling meal reminder:", error);
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    try {
      if (this.isExpoGo) return;

      const notif = await getNotifications();
      if (!notif || notif === mockNotifications) return;

      await notif.cancelAllScheduledNotificationsAsync();
      console.log("✅ All notifications cancelled");
    } catch (error) {
      console.error("💥 Error cancelling notifications:", error);
    }
  }

  static async cancelMealReminders(): Promise<void> {
    try {
      if (this.isExpoGo) return;

      const notif = await getNotifications();
      if (!notif || notif === mockNotifications) return;

      const scheduled = await notif.getAllScheduledNotificationsAsync();

      for (const notification of scheduled) {
        if (notification.content.data?.type === "meal_reminder") {
          await notif.cancelScheduledNotificationAsync(
            notification.identifier
          );
        }
      }

      console.log("✅ Meal reminders cancelled");
    } catch (error) {
      console.error("💥 Error cancelling meal reminders:", error);
    }
  }

  static async showTestNotification(): Promise<void> {
    try {
      await this.sendInstantNotification(
        "🧪 Test Notification",
        "Your notification system is working perfectly!",
        { type: "test", timestamp: Date.now() }
      );
    } catch (error) {
      console.error("💥 Error showing test notification:", error);
    }
  }

  static async getSettings(): Promise<NotificationSettings> {
    try {
      const settings = await AsyncStorage.getItem("notification_settings");
      const parsed = settings ? JSON.parse(settings) : {};
      return { ...defaultSettings, ...parsed };
    } catch (error) {
      console.error("Error loading notification settings:", error);
      return defaultSettings;
    }
  }

  static async updateSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "notification_settings",
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error("Error saving notification settings:", error);
    }
  }

  static async initializeNotifications(userQuestionnaire?: any): Promise<void> {
    try {
      await this.initialize();

      if (userQuestionnaire?.meal_times) {
        // Cancel old meal reminders first
        await this.cancelMealReminders();

        const mealTimes = userQuestionnaire.meal_times
          .split(",")
          .map((t: string) => t.trim());
        const mealNames = ["Breakfast", "Lunch", "Dinner", "Snack", "Late Snack"];

        for (let i = 0; i < Math.min(mealTimes.length, mealNames.length); i++) {
          await this.scheduleMealReminder(mealNames[i], mealTimes[i]);
        }
      }

      // Schedule water and weekly progress reminders
      await this.scheduleWaterReminders();
      await this.scheduleWeeklyProgress();
      await this.scheduleEndOfDayMealCheck();

      console.log("Notification system fully initialized");
    } catch (error) {
      console.error("Error initializing notification system:", error);
    }
  }

  static getStatus(): {
    initialized: boolean;
    hasPushToken: boolean;
    pushToken: string | null;
    isExpoGo: boolean;
    notificationsAvailable: boolean;
  } {
    return {
      initialized: this.isInitialized,
      hasPushToken: !!this.expoPushToken,
      pushToken: this.expoPushToken,
      isExpoGo: this.isExpoGo,
      notificationsAvailable: this.notificationsAvailable,
    };
  }

  static async scheduleMealReminders(
    settings: NotificationSettings
  ): Promise<void> {
    if (!settings.mealReminders) {
      console.log("⏭️ Meal reminders disabled, skipping...");
      return;
    }

    if (this.isExpoGo) return;

    await this.cancelMealReminders();

    const notif = await getNotifications();
    if (!notif || notif === mockNotifications) return;

    for (const time of settings.reminderTimes) {
      const [hours, minutes] = time.split(":").map(Number);

      await notif.scheduleNotificationAsync({
        content: {
          title: "Meal Reminder 🍽️",
          body: "Don't forget to log your meal!",
          data: { type: "meal_reminder", time },
          sound: true,
        },
        trigger: {
          type: notif.SchedulableTriggerInputTypes.CALENDAR,
          repeats: true,
          hour: hours,
          minute: minutes,
        },
      });
    }

    console.log(`✅ Scheduled ${settings.reminderTimes.length} meal reminders`);
  }

  static async scheduleWaterReminders(): Promise<void> {
    try {
      if (this.isExpoGo) return;

      const notif = await getNotifications();
      if (!notif || notif === mockNotifications) return;

      // Cancel existing water reminders first
      const scheduled = await notif.getAllScheduledNotificationsAsync();
      for (const n of scheduled) {
        if (n.content.data?.type === "water_reminder") {
          await notif.cancelScheduledNotificationAsync(n.identifier);
        }
      }

      // Schedule water reminders every 2 hours from 8 AM to 8 PM
      const startHour = 8;
      const endHour = 20;
      const intervalHours = 2;

      for (let hour = startHour; hour <= endHour; hour += intervalHours) {
        await notif.scheduleNotificationAsync({
          content: {
            title: "Stay Hydrated!",
            body: "Time to drink some water. Your body will thank you!",
            data: { type: "water_reminder", hour },
            sound: true,
          },
          trigger: {
            type: notif.SchedulableTriggerInputTypes.CALENDAR,
            repeats: true,
            hour,
            minute: 0,
          },
        });
      }

      console.log("Scheduled water reminders (8AM-8PM every 2h)");
    } catch (error) {
      console.error("Error scheduling water reminders:", error);
    }
  }

  static async scheduleWeeklyProgress(): Promise<void> {
    try {
      if (this.isExpoGo) return;

      const notif = await getNotifications();
      if (!notif || notif === mockNotifications) return;

      // Cancel existing weekly progress reminders
      const scheduled = await notif.getAllScheduledNotificationsAsync();
      for (const n of scheduled) {
        if (n.content.data?.type === "weekly_progress") {
          await notif.cancelScheduledNotificationAsync(n.identifier);
        }
      }

      // Schedule for Monday at 9 AM (weekday 2 = Monday in expo-notifications)
      await notif.scheduleNotificationAsync({
        content: {
          title: "Weekly Progress",
          body: "Check out your nutrition progress this week!",
          data: { type: "weekly_progress" },
          sound: true,
        },
        trigger: {
          type: notif.SchedulableTriggerInputTypes.CALENDAR,
          repeats: true,
          weekday: 2, // Monday
          hour: 9,
          minute: 0,
        },
      });

      console.log("Weekly progress reminder scheduled for Monday 9AM");
    } catch (error) {
      console.error("Error scheduling weekly progress:", error);
    }
  }

  static async scheduleEndOfDayMealCheck(): Promise<void> {
    try {
      if (this.isExpoGo) return;

      const notif = await getNotifications();
      if (!notif || notif === mockNotifications) return;

      await notif.scheduleNotificationAsync({
        content: {
          title: "Daily Check-in ⏰",
          body: "Have you logged all your meals today? Track your nutrition before the day ends!",
          data: { type: "end_of_day_check" },
          sound: true,
        },
        trigger: {
          type: notif.SchedulableTriggerInputTypes.CALENDAR,
          repeats: true,
          hour: 21,
          minute: 0,
        },
      });

      console.log("✅ End of day check scheduled for 9:00 PM");
    } catch (error) {
      console.error("Error scheduling end of day check:", error);
    }
  }

  static getPushToken(): string | null {
    return this.expoPushToken;
  }
}