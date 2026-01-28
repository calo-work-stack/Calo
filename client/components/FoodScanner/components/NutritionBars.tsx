import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";

interface NutritionBarsProps {
  nutrition: any;
  quantity: number;
}

export default function NutritionBars({
  nutrition,
  quantity,
}: NutritionBarsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const nutrients = [
    {
      key: "protein",
      label: t("common.protein"),
      value: nutrition.protein || 0,
      reference: 30,
      highThreshold: 10,
      midThreshold: 5,
      unit: t("home.nutrition.units.grams"),
    },
    {
      key: "carbs",
      label: t("foodScanner.carbs"),
      value: nutrition.carbs || 0,
      reference: 50,
      highThreshold: 30,
      unit: t("home.nutrition.units.grams"),
    },
    {
      key: "fat",
      label: t("foodScanner.fat"),
      value: nutrition.fat || 0,
      reference: 30,
      highThreshold: 20,
      unit: t("home.nutrition.units.grams"),
    },
    {
      key: "fiber",
      label: t("foodScanner.fibers"),
      value: nutrition.fiber || 0,
      reference: 10,
      highThreshold: 5,
      midThreshold: 2,
      unit: t("home.nutrition.units.grams"),
    },
    {
      key: "sugar",
      label: t("foodScanner.sugar"),
      value: nutrition.sugar || 0,
      reference: 25,
      highThreshold: 15,
      midThreshold: 10,
      unit: t("home.nutrition.units.grams"),
      isWarning: true,
    },
    {
      key: "sodium",
      label: t("foodScanner.sodium"),
      value: nutrition.sodium || 0,
      reference: 1000,
      highThreshold: 500,
      midThreshold: 300,
      unit: "mg",
      isWarning: true,
    },
  ];

  const calculateColor = (
    value: number,
    highThreshold: number,
    midThreshold?: number,
    isWarning?: boolean,
  ) => {
    if (isWarning) {
      if (value >= highThreshold) return colors.error;
      if (midThreshold && value >= midThreshold) return colors.warning;
      return colors.success;
    } else {
      if (midThreshold !== undefined) {
        if (value >= highThreshold) return colors.success;
        if (value >= midThreshold) return colors.warning;
        return colors.textTertiary;
      }
      return value >= highThreshold ? colors.warning : colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t("foodScanner.nutritionValues")}
      </Text>
      <View style={styles.nutrientsList}>
        {nutrients.map((nutrient) => {
          const actualValue = Math.round((nutrient.value * quantity) / 100);
          const percent = Math.min(
            (nutrient.value / nutrient.reference) * 100,
            100,
          );
          const barColor = calculateColor(
            nutrient.value,
            nutrient.highThreshold,
            nutrient.midThreshold,
            nutrient.isWarning,
          );

          return (
            <View key={nutrient.key} style={styles.row}>
              <Text style={[styles.label, { color: colors.text }]}>
                {nutrient.label}
              </Text>
              <View
                style={[
                  styles.barContainer,
                  { backgroundColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.bar,
                    { width: `${percent}%`, backgroundColor: barColor },
                  ]}
                />
              </View>
              <Text style={[styles.value, { color: colors.text }]}>
                {actualValue} {nutrient.unit}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  nutrientsList: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    width: 70,
    fontSize: 13,
  },
  barContainer: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  bar: {
    height: "100%",
    borderRadius: 8,
  },
  value: {
    width: 50,
    textAlign: "right",
    fontWeight: "600",
    fontSize: 12,
  },
});
