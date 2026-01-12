import { SplashScreen, Stack } from "expo-router";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/src/store";
import { StatusBar } from "expo-status-bar";
import {
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { queryClient } from "@/src/services/queryClient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "@/src/i18n"; // Initialize i18n
import { LanguageProvider } from "@/src/i18n/context/LanguageContext";
import { useFonts } from "expo-font";
import "react-native-reanimated";
import { I18nextProvider } from "react-i18next";
import i18n from "@/src/i18n";
import LanguageToolbar from "@/components/ToolBar";
import { NotificationService } from "@/src/services/notifications";
import React from "react";
import { I18nManager } from "react-native";
import { useOptimizedAuthSelector } from "@/hooks/useOptimizedSelector";
import { ErrorHandler } from "@/src/utils/errorHandler";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import ToastWrapper from "@/components/ToastWrapper";
import { StorageCleanupService } from "@/src/utils/storageCleanup";

// Initialize storage cleanup on app start
const initializeStorageCleanup = async () => {
  try {
    console.log("🚀 Starting critical storage initialization...");

    // First check if database is full
    const isDatabaseFull = await StorageCleanupService.isDatabaseFull();
    if (isDatabaseFull) {
      console.log(
        "🚨 Database is full - running emergency cleanup immediately"
      );
      await StorageCleanupService.emergencyCleanup();
    }

    // Now run normal cleanup
    const success = await StorageCleanupService.checkAndCleanupIfNeeded();
    if (success) {
      console.log("✅ Storage cleanup initialized successfully");
    } else {
      console.warn(
        "⚠️ Storage cleanup completed with warnings - running emergency cleanup"
      );
      await StorageCleanupService.emergencyCleanup();
    }
  } catch (error) {
    console.error("💥 Storage cleanup initialization failed:", error);
    // Emergency cleanup as last resort
    try {
      console.log("🆘 Running emergency cleanup as last resort...");
      await StorageCleanupService.emergencyCleanup();
    } catch (emergencyError) {
      console.error("💥 Emergency cleanup also failed:", emergencyError);
    }
  }
};

// Run cleanup on app initialization - CRITICAL
initializeStorageCleanup();

// Enable RTL support globally
if (Platform.OS !== "web") {
  I18nManager.allowRTL(true);
}

SplashScreen.preventAutoHideAsync();

const LoadingScreen = React.memo(() => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#10b981" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
));

const StackScreens = React.memo(() => (
  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="(auth)" />
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="payment-plan" />
    <Stack.Screen name="payment" />
    <Stack.Screen name="questionnaire" />
    <Stack.Screen name="privacy-policy" />
    <Stack.Screen name="menu/[id]" />
    <Stack.Screen name="+not-found" />
  </Stack>
));

function useHelpContent(): { title: string; description: string } | undefined {
  const segments = useSegments();
  const { t } = useTranslation();

  return useMemo(() => {
    const route = "/" + segments.join("/");

    // Ensure we have valid translations
    const safeT = (key: string, fallback: string = key) => {
      try {
        const translation = t(key);
        return translation && translation !== key ? translation : fallback;
      } catch {
        return fallback;
      }
    };

    const helpContentMap: Record<
      string,
      { title: string; description: string }
    > = {
      "/questionnaire": {
        title: safeT("questionnaire.title", "Health Questionnaire"),
        description: safeT(
          "tabs.questionnaire_description",
          "Complete your health profile to receive personalized nutrition recommendations. This questionnaire helps us understand your goals, lifestyle, and dietary needs."
        ),
      },
      "/(tabs)": {
        title: safeT("tabs.home", "Home"),
        description: safeT(
          "tabs.home_description",
          "Welcome to your nutrition dashboard! Here you can view your daily progress, recent meals, and quick access to all features."
        ),
      },
      "/(tabs)/index": {
        title: safeT("tabs.home", "Home"),
        description: safeT(
          "tabs.home_description",
          "Welcome to your nutrition dashboard! Here you can view your daily progress, recent meals, and quick access to all features."
        ),
      },
      "/(tabs)/calendar": {
        title: safeT("tabs.calendar", "Calendar"),
        description: safeT(
          "tabs.calendar_description",
          "Plan your meals for the week ahead. View scheduled meals, track your nutrition goals, and see your eating patterns over time."
        ),
      },
      "/(tabs)/statistics": {
        title: safeT("tabs.statistics", "Statistics"),
        description: safeT(
          "tabs.statistics_description",
          "Track your nutritional progress with detailed charts and metrics. Monitor your intake and view trends."
        ),
      },
      "/(tabs)/camera": {
        title: safeT("tabs.camera", "Camera"),
        description: safeT(
          "tabs.camera_description",
          "Take photos of your meals to automatically log nutrition information. The AI will analyze your food and provide detailed nutritional breakdown."
        ),
      },
      "/(tabs)/food-scanner": {
        title: safeT("tabs.food_scanner", "Food Scanner"),
        description: safeT(
          "tabs.food_scanner_description",
          "Scan barcodes or upload food images to get instant nutrition information. Perfect for packaged foods and restaurant meals."
        ),
      },
      "/(tabs)/ai-chat": {
        title: safeT("tabs.ai_chat", "AI Chat"),
        description: safeT(
          "tabs.ai_chat_description",
          "Chat with your personal AI nutrition assistant. Ask questions about food, get meal recommendations, and receive personalized advice."
        ),
      },
      "/(tabs)/recommended-menus": {
        title: safeT("tabs.recommended_menus", "Recommended Menus"),
        description: safeT(
          "tabs.recommended_menus_description",
          "Discover personalized meal plans created just for you. Based on your dietary preferences, goals, and restrictions."
        ),
      },
      "/(tabs)/history": {
        title: safeT("tabs.history", "History"),
        description: safeT(
          "tabs.history_description",
          "Review your past meals and track your eating patterns. Rate your meals, add notes, and learn from your nutrition journey."
        ),
      },
      "/(tabs)/profile": {
        title: safeT("tabs.profile", "Profile"),
        description: safeT(
          "tabs.profile_description",
          "Manage your personal information, dietary preferences, and app settings. Update your goals and notification preferences."
        ),
      },
      "/(tabs)/devices": {
        title: safeT("tabs.devices", "Devices"),
        description: safeT(
          "tabs.devices_description",
          "Connect your fitness trackers and health apps to get a complete picture of your wellness. Sync data from various devices."
        ),
      },
      "/(tabs)/questionnaire": {
        title: safeT("questionnaire.title", "Health Questionnaire"),
        description: safeT(
          "tabs.questionnaire_description",
          "Complete your health profile to receive personalized nutrition recommendations."
        ),
      },
      "/welcome": {
        title: safeT("tabs.welcome", "Welcome"),
        description: safeT(
          "tabs.welcome_description",
          "Welcome to Calo Health! Your personal nutrition companion that helps you track meals, monitor your health goals, and get personalized nutrition recommendations. Start your journey to a healthier lifestyle today."
        ),
      },
    };

    return (
      helpContentMap[route] || {
        title: safeT("common.help", "Help"),
        description: safeT(
          "tabs.home_description",
          "Welcome to your nutrition tracking app! Use the features to monitor your health and nutrition goals."
        ),
      }
    );
  }, [segments, t]);
}

const AppContent = React.memo(() => {
  const authState = useOptimizedAuthSelector();
  const { isAuthenticated = false, user = null } = authState || {};
  const segments = useSegments() as string[];
  const router = useRouter();

  const authInitialized = true;

  useEffect(() => {
    const handleRouting = () => {
      if (!authInitialized) return;

      const currentPath = segments?.join("/") || "";
      console.log("🚦 Root Layout - Current Path:", currentPath);
      console.log("🚦 Root Layout - Auth State:", {
        isAuthenticated,
        user: user
          ? {
              email_verified: user.email_verified,
              is_questionnaire_completed: user.is_questionnaire_completed,
              subscription_type: user.subscription_type,
            }
          : null,
      });

      // 🔧 FIX: Allow access to privacy policy and other public routes without authentication
      const publicRoutes = [
        "privacy-policy",
        "terms-of-service",
        "about",
        "contact",
      ];

      const isPublicRoute = publicRoutes.some((route) =>
        currentPath.includes(route)
      );

      // Skip routing logic for public routes
      if (isPublicRoute) {
        console.log("🚦 Accessing public route - no authentication required");
        return;
      }

      // If not authenticated, redirect to welcome page first (except if already in auth routes)
      if (!isAuthenticated) {
        const authRoutes = [
          "welcome",
          "signin",
          "signup",
          "email-verification",
          "forgotPassword",
          "resetPassword",
          "reset-password-verify",
        ];

        // If not in any auth route, redirect to welcome
        if (!authRoutes.some((route) => currentPath.includes(route))) {
          console.log("🚦 Not authenticated - redirecting to welcome page");
          router.replace("/(auth)/welcome");
        }
        return;
      }

      // If authenticated but no user data, wait for it
      if (!user) {
        console.log("🚦 Waiting for user data...");
        return;
      }

      // Step-by-Step Progress Check (only for authenticated users)

      // Step 1: Check Email Verification
      if (!user.email_verified) {
        if (!currentPath.includes("email-verification")) {
          console.log("🚦 Step 1 Failed: Email not verified - redirecting");
          router.replace("/(auth)/email-verification");
        }
        return;
      }

      // Step 2: Check Questionnaire Completion
      // Users MUST complete questionnaire before accessing the app
      if (!user.is_questionnaire_completed) {
        const isInQuestionnaire = currentPath.includes("questionnaire");

        // Always redirect to questionnaire if not completed (except if already there)
        if (!isInQuestionnaire) {
          console.log(
            "🚦 Step 2: Questionnaire not completed - redirecting to questionnaire"
          );
          router.replace("/questionnaire");
        }
        return;
      }

      // Step 3: Check Plan Selection
      if (!user.subscription_type || user.subscription_type === null) {
        if (!currentPath.includes("payment-plan")) {
          console.log("🚦 Step 3 Failed: No plan selected - redirecting");
          router.replace("/payment-plan");
        }
        return;
      }

      // Step 4: All checks passed - determine where user should be
      // Define routes that are allowed outside of tabs
      const allowedRoutes = [
        "payment",
        "privacy-policy",
        "menu/",
        "activeMenu",
        "(tabs)",
      ];

      const isAllowedRoute = allowedRoutes.some((route) =>
        currentPath.includes(route)
      );

      console.log("🚦 Route analysis:", {
        currentPath,
        isAllowedRoute,
        isInTabs: currentPath.includes("(tabs)"),
        isInMenu: currentPath.includes("menu/"),
      });

      // If user is in an allowed route, let them stay
      if (isAllowedRoute) {
        console.log("✅ User is in allowed route - staying");
        return;
      }

      // If user is in an auth route but fully authenticated, redirect to main app
      const authRoutes = [
        "welcome",
        "signin",
        "signup",
        "email-verification",
        "forgotPassword",
        "resetPassword",
        "reset-password-verify",
      ];
      const isInAuthRoute = authRoutes.some((route) =>
        currentPath.includes(route)
      );

      if (isInAuthRoute) {
        console.log(
          "🚦 Fully authenticated user in auth route - redirecting to main app"
        );
        router.replace("/(tabs)");
        return;
      }

      // If path is empty or root, redirect to tabs
      if (currentPath === "" || currentPath === "/") {
        console.log("🚦 At root - redirecting to main app");
        router.replace("/(tabs)");
        return;
      }

      console.log("✅ Root Layout - User in correct location");
    };

    handleRouting();
  }, [
    authInitialized,
    isAuthenticated,
    user?.email_verified,
    user?.is_questionnaire_completed,
    user?.subscription_type,
    segments?.join("/") || "",
    router,
  ]);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🚀 Starting ENHANCED app initialization...");

        // STEP 1: Critical storage check and cleanup
        try {
          const { StorageCleanupService } = await import(
            "@/src/utils/storageCleanup"
          );

          // Check if storage is working at all
          const storageWorking =
            await StorageCleanupService.checkStorageBeforeOperation();
          if (!storageWorking) {
            console.log(
              "🚨 Storage is not working - running emergency cleanup"
            );
            await StorageCleanupService.emergencyCleanup();
          }

          console.log("✅ Storage check completed");
        } catch (storageError) {
          console.error("💥 Critical storage error:", storageError);
        }

        // STEP 2: Initialize REAL notifications
        try {
          console.log("🔔 Initializing REAL notification service...");
          await NotificationService.initialize();
          console.log("✅ REAL notifications initialized successfully");

          // Send welcome notification if user is available
          // FIX: Check that both name and email are defined (not just truthy)
          if (user?.name && user?.email) {
            const userName = user.name; // Capture in const for type narrowing
            const userEmail = user.email;

            setTimeout(async () => {
              try {
                await NotificationService.sendWelcomeNotification(
                  userName,
                  userEmail
                );
              } catch (welcomeError) {
                console.warn("⚠️ Welcome notification failed:", welcomeError);
              }
            }, 2000); // Wait 2 seconds for app to fully load
          }
        } catch (notificationError) {
          console.warn(
            "⚠️ REAL notification initialization failed:",
            notificationError
          );
        }

        console.log("✅ ENHANCED app initialization completed successfully");
      } catch (error) {
        console.error("❌ ENHANCED app initialization error:", error);

        // Last resort emergency cleanup
        try {
          const { StorageCleanupService } = await import(
            "@/src/utils/storageCleanup"
          );
          await StorageCleanupService.emergencyCleanup();
          console.log(
            "✅ Emergency cleanup completed after initialization failure"
          );
        } catch (cleanupError) {
          console.error("💥 Emergency cleanup also failed:", cleanupError);
        }
      }
    };

    initializeApp();
  }, [user?.name, user?.email]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();

      // Initialize storage monitoring
      StorageCleanupService.checkAndCleanupIfNeeded().catch((error) => {
        console.warn("Initial storage cleanup failed:", error);
      });

      // Set up periodic storage monitoring (every 30 minutes)
      const storageMonitorInterval = setInterval(() => {
        StorageCleanupService.monitorStorageUsage().catch((error) => {
          console.warn("Storage monitoring failed:", error);
        });
      }, 30 * 60 * 1000); // 30 minutes

      // Only initialize notifications in production builds to avoid Expo Go warnings
      if (!__DEV__) {
        // The new notification service handles permissions internally on initialization.
        // No explicit call to requestPermissions is needed here.
      }

      return () => {
        clearInterval(storageMonitorInterval);
      };
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <StackScreens />;
});

const MainApp = React.memo(() => {
  const helpContent = useHelpContent();
  const authState = useOptimizedAuthSelector();

  return (
    <View style={styles.container}>
      <AppContent />
      <LanguageToolbar helpContent={helpContent} />
      <ToastWrapper />
    </View>
  );
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <GestureHandlerRootView style={styles.root}>
          <Provider store={store}>
            <PersistGate loading={<LoadingScreen />} persistor={persistor}>
              <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                  <LanguageProvider>
                    <MainApp />
                    <StatusBar style="auto" />
                  </LanguageProvider>
                </ThemeProvider>
              </QueryClientProvider>
            </PersistGate>
          </Provider>
        </GestureHandlerRootView>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    overflow: "visible",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
});
