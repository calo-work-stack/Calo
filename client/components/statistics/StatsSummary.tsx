import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Flame,
  Zap,
  Wheat,
  Droplets,
  Fish,
  Target,
  CheckCircle,
  Award,
  Trophy,
  TrendingUp,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");

interface StatsSummaryProps {
  progressStats: {
    totalDays: number;
    successfulDays: number;
    averageCompletion: number;
    bestStreak: number;
    currentStreak: number;
    averages: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      water: number;
    };
  };
}

const STAT_CARDS = [
  { key: "successfulDays", icon: CheckCircle, color: "#22C55E", bg: "#D1FAE5" },
  { key: "averageCompletion", icon: Target, color: "#3B82F6", bg: "#DBEAFE", suffix: "%" },
  { key: "bestStreak", icon: Award, color: "#F59E0B", bg: "#FEF3C7" },
  { key: "currentStreak", icon: Trophy, color: "#EF4444", bg: "#FEE2E2" },
];

const NUTRITION_CARDS = [
  { key: "calories", icon: Flame, color: "#EF4444", bg: "#FEE2E2", unit: "kcal" },
  { key: "protein", icon: Zap, color: "#8B5CF6", bg: "#EDE9FE", unit: "g" },
  { key: "carbs", icon: Wheat, color: "#F59E0B", bg: "#FEF3C7", unit: "g" },
  { key: "fats", icon: Fish, color: "#10B981", bg: "#D1FAE5", unit: "g" },
  { key: "water", icon: Droplets, color: "#3B82F6", bg: "#DBEAFE", unit: "ml" },
];

export default function StatsSummary({ progressStats }: StatsSummaryProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const getStatValue = (key: string) => {
    switch (key) {
      case "successfulDays":
        return `${progressStats.successfulDays}/${progressStats.totalDays}`;
      case "averageCompletion":
        return progressStats.averageCompletion;
      case "bestStreak":
        return progressStats.bestStreak;
      case "currentStreak":
        return progressStats.currentStreak;
      default:
        return 0;
    }
  };

  const getStatLabel = (key: string) => {
    const labels: Record<string, string> = {
      successfulDays: t("statistics.successful_days") || "Goal Days",
      averageCompletion: t("statistics.average_completion") || "Completion",
      bestStreak: t("statistics.best_streak") || "Best Streak",
      currentStreak: t("statistics.current_streak") || "Current Streak",
    };
    return labels[key] || key;
  };

  return (
    <View style={styles.container}>
      {/* Progress Stats */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <TrendingUp size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("statistics.progress_summary") || "Progress Summary"}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          {STAT_CARDS.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <View
                key={stat.key}
                style={[
                  styles.statCard,
                  { backgroundColor: isDark ? `${stat.color}15` : `${stat.color}08` },
                ]}
              >
                <View style={[styles.statIconBg, { backgroundColor: isDark ? `${stat.color}25` : stat.bg }]}>
                  <IconComponent size={20} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {getStatValue(stat.key)}{stat.suffix || ""}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]} numberOfLines={1}>
                  {getStatLabel(stat.key)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Nutrition Averages */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Flame size={20} color="#FF6B6B" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("statistics.nutrition_averages") || "Nutrition Averages"}
          </Text>
        </View>

        <View style={styles.nutritionGrid}>
          {NUTRITION_CARDS.map((item) => {
            const IconComponent = item.icon;
            const value = progressStats.averages[item.key as keyof typeof progressStats.averages];
            return (
              <View
                key={item.key}
                style={[
                  styles.nutritionCard,
                  { backgroundColor: isDark ? `${item.color}12` : `${item.color}08` },
                ]}
              >
                <LinearGradient
                  colors={[`${item.color}`, `${item.color}CC`]}
                  style={styles.nutritionIconBg}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconComponent size={16} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.nutritionValue, { color: colors.text }]}>
                  {value}
                </Text>
                <Text style={[styles.nutritionUnit, { color: colors.muted }]}>
                  {item.unit}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    borderRadius: 20,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: (width - 64) / 2 - 5,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nutritionCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    marginHorizontal: 3,
  },
  nutritionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  nutritionUnit: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
});
