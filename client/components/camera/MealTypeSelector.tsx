import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  FadeIn,
  FadeOut,
  withSequence,
} from "react-native-reanimated";
import {
  Coffee,
  UtensilsCrossed,
  ChefHat,
  Apple,
  MoonStar,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next"; // Add this import

const { width } = Dimensions.get("window");

export interface MealType {
  id: string;
  labelKey: string; // Changed to key for translation
  period: string;
  icon: React.ReactNode;
  colors: string[];
  lightColor: string;
  darkColor: string;
}

interface MealsRemainingInfo {
  remaining: number;
  limit: number;
  used: number;
  canLogMandatory: boolean;
}

interface MealTypeSelectorProps {
  onSelect: (mealType: MealType) => void;
  selectedType?: MealType;
  mealsRemaining?: MealsRemainingInfo;
}

const getMealTypesWithTheme = (
  colors: any,
  emeraldSpectrum: any
): MealType[] => [
  {
    id: "breakfast",
    labelKey: "camera.mealType.breakfast", // Translation key
    period: "breakfast",
    icon: <Coffee size={24} color="#ffffff" />,
    colors: ["#FEF3C7", "#F59E0B", "#D97706"],
    lightColor: "#FFFBEB",
    darkColor: "#D97706",
  },
  {
    id: "lunch",
    labelKey: "camera.mealType.lunch",
    period: "lunch",
    icon: <UtensilsCrossed size={24} color="#ffffff" />,
    colors: ["#DBEAFE", "#3B82F6", "#1E40AF"],
    lightColor: "#EFF6FF",
    darkColor: "#1E40AF",
  },
  {
    id: "dinner",
    labelKey: "camera.mealType.dinner",
    period: "dinner",
    icon: <ChefHat size={24} color="#ffffff" />,
    colors: ["#EDE9FE", "#8B5CF6", "#6D28D9"],
    lightColor: "#F5F3FF",
    darkColor: "#6D28D9",
  },
  {
    id: "snack",
    labelKey: "camera.mealType.snack",
    period: "snack",
    icon: <Apple size={24} color="#ffffff" />,
    colors: [
      emeraldSpectrum.emerald100,
      emeraldSpectrum.emerald500,
      emeraldSpectrum.emerald700,
    ],
    lightColor: emeraldSpectrum.emerald50,
    darkColor: emeraldSpectrum.emerald700,
  },
  {
    id: "late_night",
    labelKey: "camera.mealType.lateNight",
    period: "late_night",
    icon: <MoonStar size={24} color="#ffffff" />,
    colors: [
      emeraldSpectrum.emerald100,
      emeraldSpectrum.emerald600,
      emeraldSpectrum.emerald800,
    ],
    lightColor: emeraldSpectrum.emerald50,
    darkColor: emeraldSpectrum.emerald800,
  },
  {
    id: "other",
    labelKey: "camera.mealType.other",
    period: "other",
    icon: <Sparkles size={24} color="#ffffff" />,
    colors: ["#F3F4F6", "#6B7280", "#374151"],
    lightColor: "#F9FAFB",
    darkColor: "#374151",
  },
];

const TIME_RESTRICTIONS = {
  breakfast: { start: 5, end: 11.59 },
  lunch: { start: 12, end: 17.59 },
  dinner: { start: 18, end: 21.59 },
  late_night: { start: 22, end: 4.59 },
  snack: { start: 0, end: 23.59 },
  other: { start: 0, end: 23.59 },
};

const formatTimeString = (hour: number, t: any): string => {
  const wholeHour = Math.floor(hour);
  const minutes = Math.floor((hour - wholeHour) * 60);
  const am = t("camera.mealType.am");
  const pm = t("camera.mealType.pm");

  if (wholeHour === 0)
    return minutes > 0
      ? `12:${minutes.toString().padStart(2, "0")} ${am}`
      : `12:00 ${am}`;
  if (wholeHour < 12)
    return minutes > 0
      ? `${wholeHour}:${minutes.toString().padStart(2, "0")} ${am}`
      : `${wholeHour}:00 ${am}`;
  if (wholeHour === 12)
    return minutes > 0
      ? `12:${minutes.toString().padStart(2, "0")} ${pm}`
      : `12:00 ${pm}`;
  return minutes > 0
    ? `${wholeHour - 12}:${minutes.toString().padStart(2, "0")} ${pm}`
    : `${wholeHour - 12}:00 ${pm}`;
};

const getCurrentHour = (): number => {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
};

// Snacks are always available, mandatory meals are limited
const isMealTypeMandatory = (mealTypeId: string): boolean => {
  return mealTypeId !== "snack";
};

const isMealTypeAvailable = (mealTypeId: string, mealsRemaining?: MealsRemainingInfo): boolean => {
  // Snacks are always available (not mandatory)
  if (mealTypeId === "snack") return true;

  // Check if mandatory meal limit is reached
  if (mealsRemaining && !mealsRemaining.canLogMandatory) {
    return false;
  }

  // Check time restrictions
  const currentHour = getCurrentHour();
  const restriction =
    TIME_RESTRICTIONS[mealTypeId as keyof typeof TIME_RESTRICTIONS];

  if (!restriction) return true;

  // Other is always available time-wise
  if (mealTypeId === "other") return true;

  if (restriction.start > restriction.end) {
    return currentHour >= restriction.start || currentHour <= restriction.end;
  }

  return currentHour >= restriction.start && currentHour <= restriction.end;
};

const getTimeRangeString = (mealTypeId: string, t: any): string => {
  const restriction =
    TIME_RESTRICTIONS[mealTypeId as keyof typeof TIME_RESTRICTIONS];
  if (!restriction || mealTypeId === "snack" || mealTypeId === "other")
    return t("camera.mealType.availableAnytime");

  const startTime = formatTimeString(restriction.start, t);
  const endTime = formatTimeString(restriction.end, t);

  return `${startTime} - ${endTime}`;
};

const getNextAvailableTime = (mealTypeId: string, t: any): string => {
  const restriction =
    TIME_RESTRICTIONS[mealTypeId as keyof typeof TIME_RESTRICTIONS];
  if (!restriction) return "";

  return formatTimeString(restriction.start, t);
};

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const MealCard: React.FC<{
  mealType: MealType;
  isSelected: boolean;
  isAvailable: boolean;
  onPress: () => void;
  index: number;
  colors: any;
  mealsRemaining?: MealsRemainingInfo;
}> = ({ mealType, isSelected, isAvailable, onPress, index, colors, mealsRemaining }) => {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const borderWidth = useSharedValue(isSelected ? 2.5 : 1.5);
  const shadowOpacity = useSharedValue(isSelected ? 0.2 : 0.06);
  const checkScale = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    borderWidth.value = withSpring(isSelected ? 2.5 : 1.5, {
      damping: 15,
      stiffness: 150,
    });
    shadowOpacity.value = withTiming(isSelected ? 0.2 : 0.06, {
      duration: 300,
    });
    checkScale.value = withSpring(isSelected ? 1 : 0, {
      damping: 12,
      stiffness: 200,
    });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderWidth: borderWidth.value,
    shadowOpacity: shadowOpacity.value,
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scale.value, [1, 0.95], [1, 1.15]) },
      { rotateZ: `${interpolate(scale.value, [1, 0.95], [0, -5])}deg` },
    ],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: checkScale.value },
      { rotateZ: `${interpolate(checkScale.value, [0, 1], [180, 0])}deg` },
    ],
    opacity: checkScale.value,
  }));

  const handlePress = () => {
    if (!isAvailable) {
      scale.value = withSequence(
        withTiming(1.02, { duration: 80 }),
        withSpring(0.98, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );

      if (Platform.OS !== "web") {
        runOnJS(Haptics.notificationAsync)(
          Haptics.NotificationFeedbackType.Warning
        );
      }
      return;
    }

    scale.value = withSequence(
      withSpring(0.96, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );

    if (Platform.OS !== "web") {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress();
  };

  const cardStyle = [
    styles.mealTypeCard,
    {
      backgroundColor: isSelected
        ? `${mealType.darkColor}15`
        : colors.surface || "#FFFFFF",
      borderColor: isSelected
        ? mealType.darkColor
        : isAvailable
        ? `${colors.border || "#E5E7EB"}40`
        : `${colors.outline || "#D1D5DB"}30`,
    },
    !isAvailable && styles.unavailableCard,
  ];

  return (
    <AnimatedTouchableOpacity
      entering={FadeIn.delay(index * 80)
        .duration(400)
        .springify()}
      style={[animatedStyle, cardStyle]}
      onPress={handlePress}
      activeOpacity={1}
    >
      <View style={styles.cardContent}>
        <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
          <View
            style={[
              styles.iconGradient,
              {
                backgroundColor: isAvailable
                  ? `${mealType.darkColor}12`
                  : "#F3F4F610",
              },
            ]}
          >
            {React.cloneElement(
              mealType.icon as React.ReactElement<{
                color?: string;
                size?: number;
              }>,
              {
                color: isAvailable ? mealType.darkColor : "#9CA3AF",
                size: 26,
              }
            )}
          </View>
        </Animated.View>

        <View style={styles.textContainer}>
          <Text
            style={[
              styles.label,
              {
                color: isAvailable
                  ? mealType.darkColor
                  : colors.textTertiary || "#9CA3AF",
                fontWeight: isSelected ? "700" : "600",
              },
            ]}
          >
            {t(mealType.labelKey)}
          </Text>

          <Text
            style={[
              styles.timeRange,
              {
                color: isAvailable
                  ? mealType.colors[1]
                  : colors.textTertiary || "#9CA3AF",
              },
            ]}
          >
            {getTimeRangeString(mealType.id, t)}
          </Text>

          {!isAvailable && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.unavailableContainer}
            >
              <AlertCircle size={12} color={colors.error || "#EF4444"} />
              <Text
                style={[
                  styles.unavailableText,
                  { color: colors.error || "#EF4444" },
                ]}
              >
                {mealsRemaining && !mealsRemaining.canLogMandatory && isMealTypeMandatory(mealType.id)
                  ? t("camera.mealType.limitReached", { used: mealsRemaining.used, limit: mealsRemaining.limit })
                  : t("camera.mealType.opens", { time: getNextAvailableTime(mealType.id, t) })}
              </Text>
            </Animated.View>
          )}
        </View>
      </View>

      {isSelected && (
        <Animated.View
          style={[
            styles.selectedIndicator,
            { backgroundColor: mealType.darkColor },
            checkAnimatedStyle,
          ]}
        >
          <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.5} />
        </Animated.View>
      )}
    </AnimatedTouchableOpacity>
  );
};

export const MealTypeSelector: React.FC<MealTypeSelectorProps> = ({
  onSelect,
  selectedType,
  mealsRemaining,
}) => {
  const { t } = useTranslation();
  const { colors, emeraldSpectrum } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  const MEAL_TYPES = useMemo(
    () => getMealTypesWithTheme(colors, emeraldSpectrum),
    [colors, emeraldSpectrum]
  );

  const mealAvailability = useMemo(() => {
    return MEAL_TYPES.reduce((acc, mealType) => {
      acc[mealType.id] = isMealTypeAvailable(mealType.id, mealsRemaining);
      return acc;
    }, {} as Record<string, boolean>);
  }, [currentTime, MEAL_TYPES, mealsRemaining]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const handleMealTypeSelect = (mealType: MealType) => {
    if (mealAvailability[mealType.id]) {
      onSelect(mealType);
    }
  };

  const currentTimeString = useMemo(() => {
    return currentTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, [currentTime]);

  const themedStyles = StyleSheet.create({
    container: {
      minHeight: "100%",
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingVertical: 28,
    },
    header: {
      marginBottom: 32,
      alignItems: "center",
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.text || "#1F2937",
      marginBottom: 10,
      textAlign: "center",
      letterSpacing: -0.6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary || "#6B7280",
      marginBottom: 22,
      textAlign: "center",
      lineHeight: 20,
      fontWeight: "500",
    },
    timeContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface || "#FFFFFF",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: `${colors.border || "#E5E7EB"}50`,
    },
    currentTime: {
      fontSize: 13,
      color: colors.text || "#374151",
      marginLeft: 7,
      fontWeight: "600",
      letterSpacing: -0.1,
    },
  });

  return (
    <ScrollView
      style={themedStyles.container}
      contentContainerStyle={themedStyles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={FadeIn.delay(50).duration(500)}
        style={themedStyles.header}
      >
        <Text style={themedStyles.title}>{t("camera.mealType.title")}</Text>
        <Text style={themedStyles.subtitle}>{t("camera.mealType.subtitle")}</Text>
        <View style={styles.statusRow}>
          <View style={themedStyles.timeContainer}>
            <Clock size={16} color={colors.primary || "#10B981"} />
            <Text style={themedStyles.currentTime}>{currentTimeString}</Text>
          </View>
          {mealsRemaining && (
            <View style={[themedStyles.timeContainer, { marginLeft: 12 }]}>
              <UtensilsCrossed size={16} color={mealsRemaining.canLogMandatory ? colors.primary || "#10B981" : colors.error || "#EF4444"} />
              <Text style={[
                themedStyles.currentTime,
                !mealsRemaining.canLogMandatory && { color: colors.error || "#EF4444" }
              ]}>
                {t("camera.mealType.mealsRemaining", { remaining: mealsRemaining.remaining, limit: mealsRemaining.limit })}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      <View style={styles.cardsContainer}>
        {MEAL_TYPES.map((mealType, index) => (
          <MealCard
            key={mealType.id}
            mealType={mealType}
            isSelected={selectedType?.id === mealType.id}
            isAvailable={mealAvailability[mealType.id]}
            onPress={() => handleMealTypeSelect(mealType)}
            index={index}
            colors={colors}
            mealsRemaining={mealsRemaining}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  cardsContainer: {
    gap: 12,
  },
  mealTypeCard: {
    width: "100%",
    padding: 20,
    borderRadius: 16,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1.5,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 16,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  timeRange: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.1,
    opacity: 0.8,
  },
  unavailableCard: {
    opacity: 0.6,
  },
  unavailableContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
  },
  unavailableText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
    letterSpacing: -0.1,
  },
  selectedIndicator: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
});

export { getMealTypesWithTheme };
