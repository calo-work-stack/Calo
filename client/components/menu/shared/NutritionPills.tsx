import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

interface NutritionPillsProps {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  compact?: boolean;
}

export const NutritionPills = React.memo(
  ({ calories, protein, carbs, fat, compact = false }: NutritionPillsProps) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    const pills = [
      {
        value: calories,
        unit: t("menu.kcal", "kcal"),
        color: colors.warmOrange,
        bg: colors.warmOrange + "15",
      },
      {
        value: protein,
        unit: "P",
        suffix: "g",
        color: colors.mealLunch,
        bg: colors.mealLunch + "15",
      },
      {
        value: carbs,
        unit: "C",
        suffix: "g",
        color: "#3B82F6",
        bg: "#3B82F615",
      },
      {
        value: fat,
        unit: "F",
        suffix: "g",
        color: colors.mealDinner,
        bg: colors.mealDinner + "15",
      },
    ].filter((p) => p.value !== undefined && p.value !== null);

    return (
      <View style={styles.container}>
        {pills.map((pill, index) => (
          <View
            key={index}
            style={[
              compact ? styles.pillCompact : styles.pill,
              { backgroundColor: pill.bg },
            ]}
          >
            <Text
              style={[
                compact ? styles.pillTextCompact : styles.pillText,
                { color: pill.color },
              ]}
            >
              {Math.round(pill.value!)}
              {pill.suffix || ""} {pill.unit}
            </Text>
          </View>
        ))}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pillCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  pillTextCompact: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});
