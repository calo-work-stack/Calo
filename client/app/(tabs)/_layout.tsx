import { Tabs } from "expo-router";
import React, { useMemo, useEffect } from "react";
import { View, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { ProtectedRoute } from "@/components/ProtectedRoutes";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { ScrollableTabBar } from "@/components/ScrollableTabBar";
import { useTheme } from "@/src/context/ThemeContext";
import { MessageSquare } from "lucide-react-native";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { useOptimizedAuthSelector } from "@/hooks/useOptimizedAuthSelector";
import { useRouter } from "expo-router";
import { useColorScheme } from "react-native";

// Enable RTL support
I18nManager.allowRTL(true);

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useOptimizedAuthSelector();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // Since your tab bar is floating, calculate the space it occupies
  const TAB_BAR_HEIGHT = 30;
  const FLOATING_MARGIN = 16;
  const SAFE_AREA_PADDING = 10;

  const totalBottomSpace =
    TAB_BAR_HEIGHT + FLOATING_MARGIN * 2 + SAFE_AREA_PADDING;

  // Determine which tabs should be shown based on user permissions
  const shouldShowAiChat = useMemo(() => {
    return (
      user?.subscription_type === "GOLD" ||
      user?.subscription_type === "PLATINUM"
    );
  }, [user?.subscription_type]);

  const shouldShowDevices = useMemo(() => {
    return (
      user?.subscription_type === "GOLD" ||
      user?.subscription_type === "PLATINUM"
    );
  }, [user?.subscription_type]);

  const shouldShowDashboard = useMemo(() => {
    return user?.is_admin || user?.is_super_admin;
  }, [user?.is_admin, user?.is_super_admin]);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/welcome");
    }
  }, [user]);

  console.log(shouldShowAiChat, shouldShowDashboard, shouldShowDevices);

  return (
    <ProtectedRoute>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: true,
            sceneStyle: {
              paddingBottom: totalBottomSpace,
              backgroundColor: colors.background,
            },
          }}
          tabBar={(props) => <ScrollableTabBar {...props} />}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t("tabs.home"),
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="house.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: t("tabs.history"),
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="clock.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="questionnaire"
            options={{
              title: t("tabs.questionnaire"),
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="doc.text.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="recommended-menus"
            options={{
              title: t("tabs.recommended_menus"),
              headerShown: false,
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon
                  name={focused ? "restaurant" : "restaurant-outline"}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="camera"
            options={{
              title: t("tabs.camera"),
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="camera.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="food-scanner"
            options={{
              title: t("tabs.food_scanner"),
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="barcode.viewfinder" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="calendar"
            options={{
              title: t("tabs.calendar"),
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="calendar" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="statistics"
            options={{
              title: t("tabs.statistics"),
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="chart.bar.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="ai-chat"
            options={{
              title: t("tabs.ai_chat"),
              tabBarIcon: ({ color }) => (
                <MessageSquare size={28} color={color} />
              ),
              // Hide from tab bar for users without access
              href: shouldShowAiChat ? undefined : null,
            }}
          />
          <Tabs.Screen
            name="devices"
            options={{
              title: t("tabs.devices"),
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="watch.digital" color={color} />
              ),
              // Hide from tab bar for users without access
              href: shouldShowDevices ? undefined : null,
            }}
          />
          <Tabs.Screen
            name="dashboard"
            options={{
              title: t("tabs.dashboard"),
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="shield.fill" color={color} />
              ),
              // Hide from tab bar for non-admin users
              href: shouldShowDashboard ? undefined : null,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t("tabs.profile"),
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="person.fill" color={color} />
              ),
            }}
          />
        </Tabs>

        {/* Optional: Add a background fill for the bottom area if needed */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: totalBottomSpace,
            backgroundColor: colors.background,
            zIndex: -1,
          }}
        />
      </View>
    </ProtectedRoute>
  );
}
