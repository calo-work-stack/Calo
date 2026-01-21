import React from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
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
  Activity,
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

export default function StatsSummary({ progressStats }: StatsSummaryProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const completionPercentage = progressStats.averageCompletion;
  const streakPercentage =
    (progressStats.currentStreak / progressStats.bestStreak) * 100;

  return (
    <View style={styles.container}>
      {/* Hero Stats Card */}
      <LinearGradient
        colors={isDark ? ["#6366F1", "#4F46E5"] : ["#818CF8", "#6366F1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroHeader}>
          <View style={styles.heroIconContainer}>
            <Activity size={28} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.heroTitle}>Your Journey</Text>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>
              {progressStats.successfulDays}
            </Text>
            <Text style={styles.heroStatLabel}>Days Completed</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>
              {progressStats.currentStreak}
            </Text>
            <Text style={styles.heroStatLabel}>Day Streak 🔥</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{completionPercentage}%</Text>
            <Text style={styles.heroStatLabel}>Avg Complete</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${completionPercentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>Overall Progress</Text>
        </View>
      </LinearGradient>

      {/* Nutrition Overview */}
      <View style={styles.nutritionSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Daily Averages
        </Text>

        <View style={styles.nutritionGrid}>
          {/* Calories - Large Card */}
          <LinearGradient
            colors={isDark ? ["#DC2626", "#B91C1C"] : ["#FCA5A5", "#EF4444"]}
            style={[styles.nutritionCardLarge]}
          >
            <Flame size={32} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.nutritionLargeValue}>
              {progressStats.averages.calories}
            </Text>
            <Text style={styles.nutritionLargeLabel}>kcal</Text>
          </LinearGradient>

          {/* Water - Large Card */}
          <LinearGradient
            colors={isDark ? ["#2563EB", "#1D4ED8"] : ["#93C5FD", "#3B82F6"]}
            style={[styles.nutritionCardLarge]}
          >
            <Droplets size={32} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.nutritionLargeValue}>
              {progressStats.averages.water}
            </Text>
            <Text style={styles.nutritionLargeLabel}>ml</Text>
          </LinearGradient>
        </View>

        <View style={styles.macroRow}>
          {/* Protein */}
          <View
            style={[
              styles.macroCard,
              { backgroundColor: isDark ? "#1F2937" : "#F3F4F6" },
            ]}
          >
            <View style={styles.macroHeader}>
              <View style={[styles.macroIcon, { backgroundColor: "#DDD6FE" }]}>
                <Zap size={18} color="#8B5CF6" strokeWidth={2.5} />
              </View>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {progressStats.averages.protein}g
              </Text>
            </View>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
              Protein
            </Text>
          </View>

          {/* Carbs */}
          <View
            style={[
              styles.macroCard,
              { backgroundColor: isDark ? "#1F2937" : "#F3F4F6" },
            ]}
          >
            <View style={styles.macroHeader}>
              <View style={[styles.macroIcon, { backgroundColor: "#FEF3C7" }]}>
                <Wheat size={18} color="#F59E0B" strokeWidth={2.5} />
              </View>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {progressStats.averages.carbs}g
              </Text>
            </View>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
              Carbs
            </Text>
          </View>

          {/* Fats */}
          <View
            style={[
              styles.macroCard,
              { backgroundColor: isDark ? "#1F2937" : "#F3F4F6" },
            ]}
          >
            <View style={styles.macroHeader}>
              <View style={[styles.macroIcon, { backgroundColor: "#D1FAE5" }]}>
                <Fish size={18} color="#10B981" strokeWidth={2.5} />
              </View>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {progressStats.averages.fats}g
              </Text>
            </View>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
              Fats
            </Text>
          </View>
        </View>
      </View>

      {/* Achievement Pills */}
      <View style={styles.achievementSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View
            style={[
              styles.achievementPill,
              { backgroundColor: isDark ? "#1F2937" : "#FEF3C7" },
            ]}
          >
            <Award size={20} color="#F59E0B" strokeWidth={2.5} />
            <Text
              style={[
                styles.achievementText,
                { color: isDark ? "#FCD34D" : "#B45309" },
              ]}
            >
              Best Streak: {progressStats.bestStreak} days
            </Text>
          </View>

          <View
            style={[
              styles.achievementPill,
              { backgroundColor: isDark ? "#1F2937" : "#DBEAFE" },
            ]}
          >
            <Target size={20} color="#3B82F6" strokeWidth={2.5} />
            <Text
              style={[
                styles.achievementText,
                { color: isDark ? "#60A5FA" : "#1E40AF" },
              ]}
            >
              {progressStats.totalDays} Total Days
            </Text>
          </View>

          <View
            style={[
              styles.achievementPill,
              { backgroundColor: isDark ? "#1F2937" : "#D1FAE5" },
            ]}
          >
            <Trophy size={20} color="#10B981" strokeWidth={2.5} />
            <Text
              style={[
                styles.achievementText,
                { color: isDark ? "#34D399" : "#065F46" },
              ]}
            >
              {Math.round(
                (progressStats.successfulDays / progressStats.totalDays) * 100,
              )}
              % Success Rate
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 8,
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  heroIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  heroStat: {
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressBarContainer: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },
  nutritionSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  nutritionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  nutritionCardLarge: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
  },
  nutritionLargeValue: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 12,
    letterSpacing: -1,
  },
  nutritionLargeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  macroRow: {
    flexDirection: "row",
    gap: 12,
  },
  macroCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  macroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  macroIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  achievementSection: {
    paddingLeft: 16,
  },
  achievementPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
  },
  achievementText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
// not used 