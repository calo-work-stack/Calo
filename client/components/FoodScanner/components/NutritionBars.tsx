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
      label: t("statistics.protein"),
      value: nutrition.protein || 0,
      reference: 30,
      highThreshold: 10,
      midThreshold: 5,
      unit: t("home.nutrition.units.grams"),
      icon: "💪",
    },
    {
      key: "carbs",
      label: t("foodScanner.carbs"),
      value: nutrition.carbs || 0,
      reference: 50,
      highThreshold: 30,
      unit: t("home.nutrition.units.grams"),
      icon: "🌾",
    },
    {
      key: "fat",
      label: t("foodScanner.fat"),
      value: nutrition.fat || 0,
      reference: 30,
      highThreshold: 20,
      unit: t("home.nutrition.units.grams"),
      icon: "🥑",
    },
    {
      key: "fiber",
      label: t("foodScanner.fibers"),
      value: nutrition.fiber || 0,
      reference: 10,
      highThreshold: 5,
      midThreshold: 2,
      unit: t("home.nutrition.units.grams"),
      icon: "🌿",
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
      icon: "🍬",
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
      icon: "🧂",
    },
  ];

  const calculateColor = (
    value: number,
    highThreshold: number,
    midThreshold?: number,
    isWarning?: boolean,
  ) => {
    if (isWarning) {
      if (value >= highThreshold) return "#EF4444";
      if (midThreshold && value >= midThreshold) return "#F59E0B";
      return "#10B981";
    } else {
      if (midThreshold !== undefined) {
        if (value >= highThreshold) return "#10B981";
        if (value >= midThreshold) return "#3B82F6";
        return colors.textTertiary;
      }
      return value >= highThreshold ? "#3B82F6" : "#8B5CF6";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("foodScanner.nutritionValues")}
        </Text>
        <View
          style={[styles.badge, { backgroundColor: colors.primary + "15" }]}
        >
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            per {quantity}g
          </Text>
        </View>
      </View>

      <View style={styles.nutrientsList}>
        {nutrients.map((nutrient, index) => {
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
            <View key={nutrient.key} style={styles.nutrientRow}>
              <View style={styles.labelSection}>
                <Text style={styles.iconText}>{nutrient.icon}</Text>
                <Text style={[styles.label, { color: colors.text }]}>
                  {nutrient.label}
                </Text>
              </View>

              <View style={styles.barSection}>
                <View
                  style={[
                    styles.barTrack,
                    { backgroundColor: colors.border + "40" },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${percent}%`,
                        backgroundColor: barColor + "25",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.barGradient,
                        {
                          backgroundColor: barColor,
                          width: `${Math.min(percent * 1.2, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.valueContainer}>
                  <Text style={[styles.value, { color: barColor }]}>
                    {actualValue}
                  </Text>
                  <Text style={[styles.unit, { color: colors.textSecondary }]}>
                    {nutrient.unit}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border + "30" }]}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          Values based on a {quantity}g serving
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  nutrientsList: {
    gap: 20,
  },
  nutrientRow: {
    gap: 12,
  },
  labelSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconText: {
    fontSize: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  barSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 10,
    position: "relative",
  },
  barGradient: {
    height: "100%",
    borderRadius: 10,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    minWidth: 60,
    justifyContent: "flex-end",
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  unit: {
    fontSize: 11,
    fontWeight: "500",
    marginLeft: 2,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
});
