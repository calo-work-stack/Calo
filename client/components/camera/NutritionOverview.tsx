import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { Flame, Award } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

interface NutritionOverviewProps {
  nutrition: NutritionData;
  mealName: string;
}

export const NutritionOverview: React.FC<NutritionOverviewProps> = ({
  nutrition,
  mealName,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const totalMacros = nutrition.protein + nutrition.carbs + nutrition.fat;
  const proteinPercent =
    totalMacros > 0 ? Math.round((nutrition.protein / totalMacros) * 100) : 0;
  const carbsPercent =
    totalMacros > 0 ? Math.round((nutrition.carbs / totalMacros) * 100) : 0;
  const fatPercent =
    totalMacros > 0 ? Math.round((nutrition.fat / totalMacros) * 100) : 0;

  const proteinColor = colors.info || colors.primary;
  const carbsColor = colors.warning;
  const fatColor = colors.error;

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <View style={styles.mealInfo}>
            <Text style={[styles.mealName, { color: colors.text }]}>{mealName}</Text>
            <Text style={[styles.analysisLabel, { color: colors.textSecondary }]}>
              {t("camera.nutritionalAnalysis")}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.success + "15" }]}>
            <Award size={16} color={colors.success} />
          </View>
        </View>

        <View style={styles.calorieSection}>
          <LinearGradient
            colors={[colors.success, colors.success]}
            style={styles.calorieCard}
          >
            <Flame size={32} color={colors.onPrimary} />
            <View style={styles.calorieInfo}>
              <Text style={[styles.calorieValue, { color: colors.onPrimary }]}>
                {nutrition.calories}
              </Text>
              <Text style={[styles.calorieLabel, { color: colors.onPrimary + "CC" }]}>
                {t("statistics.calories")}
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.macrosGrid}>
          <View style={[styles.macroCard, { backgroundColor: proteinColor + "15" }]}>
            <View style={[styles.macroIndicator, { backgroundColor: proteinColor }]} />
            <View style={styles.macroContent}>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {nutrition.protein}g
              </Text>
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                {t("statistics.protein")}
              </Text>
            </View>
            <View style={[styles.percentBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.percentText, { color: proteinColor }]}>
                {proteinPercent}%
              </Text>
            </View>
          </View>

          <View style={[styles.macroCard, { backgroundColor: carbsColor + "15" }]}>
            <View style={[styles.macroIndicator, { backgroundColor: carbsColor }]} />
            <View style={styles.macroContent}>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {nutrition.carbs}g
              </Text>
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                {t("foodScanner.carbs")}
              </Text>
            </View>
            <View style={[styles.percentBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.percentText, { color: carbsColor }]}>
                {carbsPercent}%
              </Text>
            </View>
          </View>

          <View style={[styles.macroCard, { backgroundColor: fatColor + "15" }]}>
            <View style={[styles.macroIndicator, { backgroundColor: fatColor }]} />
            <View style={styles.macroContent}>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {nutrition.fat}g
              </Text>
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                {t("foodScanner.fat")}
              </Text>
            </View>
            <View style={[styles.percentBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.percentText, { color: fatColor }]}>
                {fatPercent}%
              </Text>
            </View>
          </View>
        </View>

        {(nutrition.fiber > 0 ||
          nutrition.sugar > 0 ||
          nutrition.sodium > 0) && (
          <View style={styles.micronutrientsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("camera.additionalInfo")}
            </Text>
            <View style={styles.microGrid}>
              {nutrition.fiber > 0 && (
                <View style={[styles.microItem, { backgroundColor: colors.background }]}>
                  <Text style={[styles.microValue, { color: colors.text }]}>
                    {nutrition.fiber}g
                  </Text>
                  <Text style={[styles.microLabel, { color: colors.textSecondary }]}>
                    {t("foodScanner.fibers")}
                  </Text>
                </View>
              )}
              {nutrition.sugar > 0 && (
                <View style={[styles.microItem, { backgroundColor: colors.background }]}>
                  <Text style={[styles.microValue, { color: colors.text }]}>
                    {nutrition.sugar}g
                  </Text>
                  <Text style={[styles.microLabel, { color: colors.textSecondary }]}>
                    {t("foodScanner.sugar")}
                  </Text>
                </View>
              )}
              {nutrition.sodium > 0 && (
                <View style={[styles.microItem, { backgroundColor: colors.background }]}>
                  <Text style={[styles.microValue, { color: colors.text }]}>
                    {nutrition.sodium}mg
                  </Text>
                  <Text style={[styles.microLabel, { color: colors.textSecondary }]}>
                    {t("foodScanner.sodium")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  card: {
    borderRadius: 28,
    padding: 28,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 6,
    letterSpacing: -0.8,
  },
  analysisLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  calorieSection: {
    marginBottom: 20,
  },
  calorieCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 20,
    gap: 16,
  },
  calorieInfo: {
    flex: 1,
  },
  calorieValue: {
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  calorieLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
  },
  macrosGrid: {
    gap: 12,
    marginBottom: 20,
  },
  macroCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 16,
  },
  macroIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  macroContent: {
    flex: 1,
  },
  macroValue: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  percentBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  percentText: {
    fontSize: 13,
    fontWeight: "700",
  },
  micronutrientsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  microGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  microItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: "30%",
  },
  microValue: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  microLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
});
