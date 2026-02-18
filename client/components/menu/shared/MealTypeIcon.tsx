import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

export interface MealTypeConfig {
  emoji: string;
  color: string;
  label: string;
  icon: string;
  timeLabel: string;
}

export function useMealTypeConfig() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const getMealTypeConfig = (type: string): MealTypeConfig => {
    const configs: Record<string, MealTypeConfig> = {
      breakfast: {
        emoji: "🍳",
        color: colors.mealBreakfast,
        label: t("active_menu.meal_types.breakfast", "Breakfast"),
        icon: "sunrise",
        timeLabel: t("timeline.breakfast_time", "Breakfast Time"),
      },
      morning_snack: {
        emoji: "🥤",
        color: colors.mealSnack,
        label: t("active_menu.meal_types.morning_snack", "Morning Snack"),
        icon: "coffee",
        timeLabel: t("timeline.snack_time", "Snack Time"),
      },
      lunch: {
        emoji: "🥗",
        color: colors.mealLunch,
        label: t("active_menu.meal_types.lunch", "Lunch"),
        icon: "sun",
        timeLabel: t("timeline.lunch_time", "Lunch Time"),
      },
      afternoon_snack: {
        emoji: "🍎",
        color: colors.mealSnack,
        label: t("active_menu.meal_types.afternoon_snack", "Afternoon Snack"),
        icon: "apple",
        timeLabel: t("timeline.snack_time", "Snack Time"),
      },
      dinner: {
        emoji: "🍲",
        color: colors.mealDinner,
        label: t("active_menu.meal_types.dinner", "Dinner"),
        icon: "moon",
        timeLabel: t("timeline.dinner_time", "Dinner Time"),
      },
      snack: {
        emoji: "🍎",
        color: colors.mealSnack,
        label: t("active_menu.meal_types.snack", "Snack"),
        icon: "cookie",
        timeLabel: t("timeline.snack_time", "Snack Time"),
      },
    };
    return (
      configs[type.toLowerCase()] || {
        emoji: "🍽️",
        color: "#6B7280",
        label: type,
        icon: "utensils",
        timeLabel: type,
      }
    );
  };

  return { getMealTypeConfig };
}

interface MealTypeIconProps {
  mealType: string;
  size?: number;
  showLabel?: boolean;
}

export const MealTypeIcon = React.memo(
  ({ mealType, size = 40, showLabel = false }: MealTypeIconProps) => {
    const { getMealTypeConfig } = useMealTypeConfig();
    const config = getMealTypeConfig(mealType);

    return (
      <View style={styles.container}>
        <View
          style={[
            styles.iconContainer,
            {
              width: size,
              height: size,
              borderRadius: size * 0.4,
              backgroundColor: config.color + "20",
            },
          ]}
        >
          <Text style={{ fontSize: size * 0.5 }}>{config.emoji}</Text>
        </View>
        {showLabel && (
          <Text style={[styles.label, { color: config.color }]}>
            {config.label}
          </Text>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 4,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
