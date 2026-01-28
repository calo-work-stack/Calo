import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import {
  analyzeNutrition,
  NutritionIndicator,
} from "../utils/nutritionAnalyzer";

interface HealthIndicatorsProps {
  nutrition: any;
}

export default function HealthIndicators({ nutrition }: HealthIndicatorsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const nutritionIndicators = analyzeNutrition(nutrition);

  if (nutritionIndicators.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Text style={styles.emptyIconText}>✓</Text>
          </View>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {t("foodScanner.standardProduct")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Health Highlights
      </Text>

      <View style={styles.indicatorsGrid}>
        {nutritionIndicators.map(
          (indicator: NutritionIndicator, index: number) => {
            const isPositive = indicator.color === "success";
            const bgColor = isPositive ? "#10B98115" : "#F59E0B15";
            const iconColor = isPositive ? "#10B981" : "#F59E0B";
            const icon = isPositive ? "✓" : "⚠";

            return (
              <View
                key={index}
                style={[
                  styles.indicatorCard,
                  {
                    backgroundColor: bgColor,
                    borderColor: iconColor + "30",
                  },
                ]}
              >
                <View
                  style={[
                    styles.indicatorIcon,
                    { backgroundColor: iconColor + "20" },
                  ]}
                >
                  <Text style={[styles.iconText, { color: iconColor }]}>
                    {icon}
                  </Text>
                </View>
                <Text style={[styles.indicatorText, { color: colors.text }]}>
                  {t(`foodScanner.${indicator.label}`)}
                </Text>
              </View>
            );
          },
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  indicatorsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  indicatorCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
  },
  indicatorIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 14,
    fontWeight: "700",
  },
  indicatorText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIconText: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
