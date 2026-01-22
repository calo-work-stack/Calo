import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Crown, Flame, Calendar, Star } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");

interface LevelProgressProps {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  xpProgress: number;
  xpToNext: number;
  dailyStreak: number;
  weeklyStreak: number;
  perfectDays: number;
  totalPoints: number;
}

export default function LevelProgress({
  level,
  currentXP,
  nextLevelXP,
  xpProgress,
  xpToNext,
  dailyStreak,
  weeklyStreak,
  perfectDays,
  totalPoints,
}: LevelProgressProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Level Header */}
      <View style={styles.levelHeader}>
        <LinearGradient
          colors={["#FEF3C7", "#FCD34D"]}
          style={styles.levelIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Crown size={32} color="#F59E0B" />
        </LinearGradient>

        <View style={styles.levelInfo}>
          <Text style={[styles.levelLabel, { color: colors.muted }]}>
            {t("statistics.level") || "Level"}
          </Text>
          <Text style={[styles.levelValue, { color: colors.text }]}>
            {level}
          </Text>
        </View>

        <View style={styles.xpBadge}>
          <Star size={14} color="#F59E0B" fill="#F59E0B" />
          <Text style={styles.xpBadgeText}>{totalPoints} XP</Text>
        </View>
      </View>

      {/* XP Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            {t("statistics.progress_to_next") || "Progress to next level"}
          </Text>
          <Text style={[styles.progressValue, { color: colors.primary }]}>
            {currentXP} / {nextLevelXP}
          </Text>
        </View>

        <View
          style={[
            styles.progressBg,
            { backgroundColor: isDark ? "#374151" : "#F1F5F9" },
          ]}
        >
          <LinearGradient
            colors={["#F59E0B", "#FBBF24"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.progressFill,
              { width: `${Math.min(xpProgress, 100)}%` },
            ]}
          />
        </View>

        <Text style={[styles.xpToNext, { color: colors.muted }]}>
          {xpToNext} XP {t("statistics.to_next_level") || "to next level"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  levelIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  levelInfo: {
    marginLeft: 14,
    flex: 1,
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  levelValue: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: -2,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  xpBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F59E0B",
  },
  progressSection: {
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  progressValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressBg: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
  },
  xpToNext: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
  },
  streakGrid: {
    flexDirection: "row",
    gap: 10,
  },
  streakCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
  },
  streakIconBg: {
    marginBottom: 8,
  },
  streakValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  streakLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
});
