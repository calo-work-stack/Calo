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
        <View style={styles.indicator}>
          <View
            style={[styles.dot, { backgroundColor: colors.textTertiary }]}
          />
          <Text style={[styles.text, { color: colors.text }]}>
            {t("foodScanner.standardProduct")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {nutritionIndicators.map(
        (indicator: NutritionIndicator, index: number) => (
          <View key={index} style={styles.indicator}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    indicator.color === "success"
                      ? colors.success
                      : colors.warning,
                },
              ]}
            />
            <Text style={[styles.text, { color: colors.text }]}>
              {t(`foodScanner.${indicator.label}`)}
            </Text>
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  indicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  text: {
    fontSize: 14,
  },
});
