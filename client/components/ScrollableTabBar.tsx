import React, {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState,
} from "react";
import { ViewStyle, TextStyle, AppState, AppStateStatus } from "react-native";
import { Tabs } from "expo-router";
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  Text,
  ScrollView,
  I18nManager,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  // Original icons
  Home,
  History,
  Camera,
  TrendingUp,
  User,
  Calendar,
  Watch,
  UtensilsCrossed,
  Bot,
  ScanLine,
  ClipboardList,
  // New alternative icons - add these
  House,
  Clock,
  Video,
  BarChart3,
  CalendarDays,
  Smartphone,
  ChefHat,
  MessageCircle,
  QrCode,
  FileText,
  UserCircle,
  Activity,
  Settings,
  Heart,
  Sparkles,
  Menu,
  MenuIcon,
  SquareMenuIcon,
  ChartAreaIcon,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolateColor,
  interpolate,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useLanguage } from "../src/i18n/context/LanguageContext";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { useOptimizedAuthSelector } from "@/hooks/useOptimizedAuthSelector";

const SCREEN_WIDTH = Dimensions.get("window").width;

// Instagram-style design constants
const TAB_CONFIG = {
  labelFontSize: 10,
  iconSize: 24,
  cameraIconSize: 26,
  tabHeight: 50,
  cameraSize: 32,
  barHeight: 50,
  tabPadding: 8,
  borderRadius: 0, // No border radius for bottom stick
  cameraBorderRadius: 16,
  indicatorHeight: 2,
} as const;

// Smooth animations like Instagram
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 0.8,
} as const;

const MICRO_SPRING = {
  damping: 25,
  stiffness: 400,
  mass: 0.5,
} as const;

// Light haptic feedback
const triggerHaptic = () => {
  if (Platform.OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

// Updated Icon mapping - Choose one of these options:

// Option 1: Modern/Clean icons
const getIconComponent = (routeName: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    index: House,
    history: SquareMenuIcon,
    camera: Camera,
    statistics: BarChart3,
    calendar: CalendarDays,
    devices: Smartphone,
    "recommended-menus": ChefHat,
    "ai-chat": MessageCircle,
    "food-scanner": QrCode,
    questionnaire: FileText,
    profile: UserCircle,
    dashboard: ChartAreaIcon,
  };
  return iconMap[routeName] || House;
};

// Label mapping
const getTabLabel = (routeName: string, t: (key: string) => string): string => {
  const labelMap: { [key: string]: string } = {
    index: t("tabs.home"),
    history: t("tabs.history"),
    camera: t("tabs.camera"),
    statistics: t("tabs.statistics"),
    calendar: t("tabs.calendar"),
    devices: t("tabs.devices"),
    "recommended-menus": t("tabs.recommended_menus"),
    "ai-chat": t("tabs.ai_chat"),
    "food-scanner": t("tabs.food_scanner"),
    questionnaire: t("tabs.questionnaire"),
    profile: t("tabs.profile"),
    dashboard: t("tabs.dashboard"),
  };
  return labelMap[routeName] || routeName;
};

interface RouteInfo {
  key: string;
  name: string;
}

interface TabState {
  routes: RouteInfo[];
  index: number;
}

interface CustomTabBarProps {
  state: TabState;
  descriptors: { [key: string]: any };
  navigation: any;
}

// Helper function to check if a route should be shown based on user permissions
const shouldShowRoute = (routeName: string, user: any): boolean => {
  // Define permission requirements for each route
  const permissionMap: { [key: string]: () => boolean } = {
    "ai-chat": () => {
      return (
        user?.subscription_type === "GOLD" ||
        user?.subscription_type === "PLATINUM"
      );
    },
    devices: () => {
      return (
        user?.subscription_type === "GOLD" ||
        user?.subscription_type === "PLATINUM"
      );
    },
    dashboard: () => {
      return user?.is_admin === true || user?.is_super_admin === true;
    },
  };

  // If route has permission requirements, check them
  if (permissionMap[routeName]) {
    return permissionMap[routeName]();
  }

  // All other routes are visible by default
  return true;
};

// Instagram-style camera tab
const CameraTab = React.memo(
  ({
    route,
    isFocused,
    onPress,
    onLongPress,
  }: {
    route: RouteInfo;
    isFocused: boolean;
    onPress: () => void;
    onLongPress: () => void;
    colors: any;
  }) => {
    const scale = useSharedValue(1);
    const borderScale = useSharedValue(1);
    const { colors } = useTheme();

    useEffect(() => {
      scale.value = withSpring(isFocused ? 1.1 : 1, SPRING_CONFIG);
      borderScale.value = withSpring(isFocused ? 1.15 : 1, SPRING_CONFIG);
    }, [isFocused]);

    const handlePress = () => {
      runOnJS(triggerHaptic)();
      scale.value = withSequence(
        withTiming(0.9, { duration: 100, easing: Easing.out(Easing.quad) }),
        withSpring(isFocused ? 1.1 : 1, MICRO_SPRING),
      );
      setTimeout(onPress, 80);
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const borderStyle = useAnimatedStyle(() => ({
      transform: [{ scale: borderScale.value }],
      opacity: isFocused ? 1 : 0,
    }));

    const CameraIcon = getIconComponent("camera");

    return (
      <View style={styles.cameraContainer}>
        {/* Instagram-style border ring */}
        <Animated.View
          style={[
            styles.cameraBorder,
            {
              borderColor: colors.primary,
            },
            borderStyle,
          ]}
        />

        <Animated.View style={[animatedStyle]}>
          <TouchableOpacity
            onPress={handlePress}
            onLongPress={onLongPress}
            style={[
              styles.cameraTab,
              {
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.8}
          >
            <CameraIcon
              size={TAB_CONFIG.cameraIconSize}
              color={isFocused ? "#ffffff" : colors.icon}
              strokeWidth={1.5}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  },
);

CameraTab.displayName = "CameraTab";

// Instagram-style regular tab
const RegularTab = React.memo(
  ({
    route,
    isFocused,
    onPress,
    onLongPress,
    colors,
    t,
  }: {
    route: RouteInfo;
    isFocused: boolean;
    onPress: () => void;
    onLongPress: () => void;
    colors: any;
    t: (key: string) => string;
  }) => {
    const scale = useSharedValue(1);
    const iconScale = useSharedValue(1);
    const labelOpacity = useSharedValue(isFocused ? 1 : 0.6);
    const dotScale = useSharedValue(isFocused ? 1 : 0);

    const IconComponent = getIconComponent(route.name);
    const label = getTabLabel(route.name, t);

    useEffect(() => {
      iconScale.value = withSpring(isFocused ? 1.1 : 1, SPRING_CONFIG);
      labelOpacity.value = withTiming(isFocused ? 1 : 0.6, {
        duration: 200,
        easing: Easing.out(Easing.quad),
      });
      dotScale.value = withSpring(isFocused ? 1 : 0, SPRING_CONFIG);
    }, [isFocused]);

    const handlePress = () => {
      runOnJS(triggerHaptic)();
      scale.value = withSequence(
        withTiming(0.9, { duration: 80, easing: Easing.out(Easing.quad) }),
        withSpring(1, MICRO_SPRING),
      );
      iconScale.value = withSequence(
        withTiming(0.85, { duration: 80 }),
        withSpring(isFocused ? 1.1 : 1, MICRO_SPRING),
      );
      setTimeout(onPress, 60);
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const iconAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: iconScale.value }],
    }));

    const labelAnimatedStyle = useAnimatedStyle(() => ({
      opacity: labelOpacity.value,
    }));

    const dotStyle = useAnimatedStyle(() => ({
      transform: [{ scale: dotScale.value }],
      opacity: dotScale.value,
    }));

    return (
      <Animated.View style={[styles.regularTab, animatedStyle]}>
        <TouchableOpacity
          onPress={handlePress}
          onLongPress={onLongPress}
          style={styles.tabButton}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            {/* Instagram-style icon */}
            <Animated.View style={iconAnimatedStyle}>
              <IconComponent
                size={TAB_CONFIG.iconSize}
                color={isFocused ? colors.text : colors.icon}
                strokeWidth={isFocused ? 2 : 1.5}
                fill={isFocused ? colors.text : "none"}
              />
            </Animated.View>

            {/* Instagram-style label */}
            <Animated.View style={labelAnimatedStyle}>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? colors.text : colors.icon,
                    fontWeight: isFocused ? "600" : "400",
                    fontSize: TAB_CONFIG.labelFontSize,
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Animated.View>

            {/* Instagram-style active dot */}
            <Animated.View
              style={[
                styles.activeDot,
                {
                  backgroundColor: colors.primary,
                },
                dotStyle,
              ]}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  },
);

RegularTab.displayName = "RegularTab";

export function ScrollableTabBar({
  state,
  descriptors,
  navigation,
}: CustomTabBarProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const [layoutKey, setLayoutKey] = useState(0);

  // Get user from auth selector to check permissions
  const { user } = useOptimizedAuthSelector();

  // Simple entrance animation
  const containerOpacity = useSharedValue(0);

  useEffect(() => {
    containerOpacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        setTimeout(() => {
          setLayoutKey((prev) => prev + 1);
        }, 100);
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, []);

  // Separate tabs - FILTER BASED ON USER PERMISSIONS
  const { regularTabs, cameraTab } = useMemo(() => {
    if (!state?.routes) return { regularTabs: [], cameraTab: null };

    // Filter routes based on user permissions
    const validRoutes = state.routes.filter((route): route is RouteInfo => {
      if (
        !route ||
        typeof route.name !== "string" ||
        typeof route.key !== "string"
      ) {
        return false;
      }

      // Check if user has permission to see this route
      const hasPermission = shouldShowRoute(route.name, user);

      // Debug logging (optional - remove in production)
      if (!hasPermission) {
        console.log(`Hiding tab: ${route.name}`);
      }

      return hasPermission;
    });

    const camera = validRoutes.find((route) => route.name === "camera") || null;
    const regular = validRoutes.filter((route) => route.name !== "camera");

    return { regularTabs: regular, cameraTab: camera };
  }, [state?.routes, user]); // Re-run when user changes

  // Navigation handlers
  const createTabPressHandler = useCallback(
    (route: RouteInfo) => () => {
      try {
        navigation.navigate(route.name);
      } catch (error) {
        console.warn("Navigation error:", error);
      }
    },
    [navigation],
  );

  const createTabLongPressHandler = useCallback(
    (route: RouteInfo) => () => {
      try {
        if (Platform.OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        navigation.emit({ type: "tabLongPress", target: route.key });
      } catch (error) {
        console.warn("Long press error:", error);
      }
    },
    [navigation],
  );

  if (!state?.routes) {
    return null;
  }

  // Check camera focus
  const cameraIndex = cameraTab
    ? state.routes.findIndex((r) => r?.key === cameraTab.key)
    : -1;
  const isCameraFocused = cameraIndex !== -1 && state.index === cameraIndex;

  const bottomPadding = Math.max(insets.bottom || 0, 0);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* Instagram-style background */}
      <View
        style={[
          styles.background,
          {
            backgroundColor: colors.background,
          },
        ]}
      />

      <View style={styles.content} key={layoutKey}>
        {/* Regular tabs */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          decelerationRate="fast"
        >
          {regularTabs.map((route, index) => {
            if (!descriptors[route.key]) return null;

            const routeIndex = state.routes.findIndex(
              (r) => r?.key === route.key,
            );
            const isFocused = routeIndex !== -1 && state.index === routeIndex;

            return (
              <RegularTab
                key={route.key}
                route={route}
                isFocused={isFocused}
                onPress={createTabPressHandler(route)}
                onLongPress={createTabLongPressHandler(route)}
                colors={colors}
                t={t}
              />
            );
          })}
        </ScrollView>

        {/* Instagram-style Camera Tab */}
        {cameraTab && (
          <View style={styles.cameraWrapper}>
            <CameraTab
              route={cameraTab}
              isFocused={isCameraFocused}
              onPress={createTabPressHandler(cameraTab)}
              onLongPress={createTabLongPressHandler(cameraTab)}
              colors={colors}
            />
          </View>
        )}
      </View>

      {/* Bottom safe area */}
      <View style={{ height: bottomPadding }} />
    </Animated.View>
  );
}

// Instagram-style bottom-stuck tab bar
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    backgroundColor: "transparent", // ← fix the typo here
  },
  background: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0)",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: TAB_CONFIG.barHeight,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    alignItems: "center",
    justifyContent: "space-around",
    flexGrow: 1,
    paddingHorizontal: 8,
  },

  regularTab: {
    flex: 1,
    alignItems: "center",
    minWidth: 60,
  },

  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: TAB_CONFIG.tabPadding,
    minHeight: 42,
    width: "100%",
  },

  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  tabLabel: {
    fontSize: TAB_CONFIG.labelFontSize,
    textAlign: "center",
    marginTop: 2,
    letterSpacing: -0.2,
  },

  activeDot: {
    position: "absolute",
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  cameraContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  cameraBorder: {
    position: "absolute",
    width: TAB_CONFIG.cameraSize + 6,
    height: TAB_CONFIG.cameraSize + 6,
    borderRadius: (TAB_CONFIG.cameraSize + 6) / 2,
    borderWidth: 2,
    borderStyle: "solid",
  },

  cameraWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },

  cameraTab: {
    width: TAB_CONFIG.cameraSize,
    height: TAB_CONFIG.cameraSize,
    borderRadius: TAB_CONFIG.cameraBorderRadius,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <ScrollableTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
