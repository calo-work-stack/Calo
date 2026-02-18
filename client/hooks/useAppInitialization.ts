import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/src/store";
import { NotificationService as ExpoNotifications } from "@/src/services/notifications";
import NotificationService from "@/src/services/notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { StorageCleanupService } from "@/src/utils/storageCleanup";
import { StorageRecoveryService } from "@/src/utils/storageRecovery";
import { loadStoredAuth } from "../src/store/authSlice";

interface AppInitializationState {
  isLoading: boolean;
  isAuthenticated: boolean;
  userProfile: any;
  error: string | null;
}

export const useAppInitialization = (): AppInitializationState => {
  const dispatch = useDispatch<AppDispatch>();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useSelector((state: RootState) => state.auth);
  const isInitialized = useRef(false);

  // Initialize app settings
  const { data: appSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["appInitialization"],
    queryFn: async () => {
      try {
        // Load saved language
        const savedLanguage = await AsyncStorage.getItem("@userLanguage");
        if (savedLanguage && savedLanguage !== i18n.language) {
          await i18n.changeLanguage(savedLanguage);
        }

        // Load authentication state
        const authToken = await AsyncStorage.getItem("authToken");
        const isAuthenticated = !!authToken;

        return {
          language: savedLanguage,
          isAuthenticated,
          authToken,
        };
      } catch (error) {
        throw new Error("Failed to initialize app");
      }
    },
    staleTime: Infinity, // App initialization only happens once
    retry: 3,
  });

  // Load user profile if authenticated
  const {
    data: userProfile,
    isLoading: profileLoading,
    error,
  } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const { userAPI } = await import("../src/services/api");
      return userAPI.getUserProfile();
    },
    enabled: !!appSettings?.isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const initializeApp = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      try {
        console.log("🚀 Initializing app...");

        // 0. Run storage recovery first (fixes CursorWindow errors)
        console.log("🔧 Running storage recovery...");
        await StorageRecoveryService.performFullRecovery();

        // 1. Check and cleanup storage
        const storageHealthy =
          await StorageCleanupService.checkAndCleanupIfNeeded();
        if (!storageHealthy) {
          console.warn(
            "⚠️ Storage issues detected, some features may be limited"
          );
        }

        // 2. Load stored authentication
        await dispatch(loadStoredAuth());

        // Show user online notification if app is properly initialized
        if (appSettings?.isAuthenticated || user) {
          NotificationService.showUserOnline();
        }

        // Initialize Expo-compatible notification system
        try {
          await ExpoNotifications.initialize();

          if (user) {
            // Fetch questionnaire data to schedule meal-time reminders
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_API_URL}/api/questionnaire/user`,
              {
                headers: {
                  Authorization: `Bearer ${appSettings?.authToken}`,
                },
              }
            );

            if (response.ok) {
              const questionnaire = await response.json();
              await ExpoNotifications.initializeNotifications(
                questionnaire.data
              );
            } else {
              // No questionnaire yet — still schedule water & weekly reminders
              await ExpoNotifications.initializeNotifications();
            }
          }
        } catch (error) {
          console.error("Error setting up notifications:", error);
        }
        console.log("✅ App initialization completed");
      } catch (error) {
        console.error("❌ App initialization error:", error);

        // Try emergency cleanup if initialization fails
        try {
          await StorageCleanupService.emergencyCleanup();
          // Retry auth load after cleanup
          await dispatch(loadStoredAuth());
        } catch (emergencyError) {
          console.error("❌ Emergency recovery failed:", emergencyError);
        }
      }
    };

    // Initialize storage monitoring
    const initStorageMonitoring = async () => {
      try {
        // Run initial cleanup check
        await StorageCleanupService.checkAndCleanupIfNeeded();

        // Set up periodic cleanup (every 2 hours for more proactive cleanup)
        const cleanupInterval = setInterval(async () => {
          console.log("🧹 [Storage] Running periodic cleanup check...");
          await StorageCleanupService.checkAndCleanupIfNeeded();
        }, 2 * 60 * 60 * 1000); // 2 hours (was 24 hours)

        return () => clearInterval(cleanupInterval);
      } catch (error) {
        console.error("Failed to initialize storage monitoring:", error);
        // Even if monitoring fails, try emergency cleanup
        try {
          await StorageCleanupService.emergencyCleanup();
        } catch (e) {
          console.error("Emergency cleanup also failed:", e);
        }
      }
    };

    if (!isInitialized.current) {
      initializeApp();
      initStorageMonitoring();
    }
  }, [dispatch, user, appSettings, settingsLoading]);

  return {
    isLoading: settingsLoading || profileLoading,
    isAuthenticated: appSettings?.isAuthenticated || false,
    userProfile,
    error: error?.message || null,
  };
};

export default useAppInitialization;
