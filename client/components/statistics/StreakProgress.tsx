import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, Zap, Trophy, Star, Target, Award } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

interface DuolingoStreakProps {
  dailyStreak: number;
  weeklyStreak: number;
  perfectDays: number;
  totalPoints: number;
  bestStreak?: number;
}

export default function DuolingoStreak({
  dailyStreak,
  weeklyStreak,
  perfectDays,
  totalPoints,
  bestStreak = 0,
}: DuolingoStreakProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  // Animations
  const flameScale = useSharedValue(1);
  const flameRotate = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    // Gentle flame pulse
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200 }),
        withTiming(1, { duration: 1200 }),
      ),
      -1,
      true,
    );

    // Subtle rotation
    flameRotate.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 2000 }),
        withTiming(-3, { duration: 2000 }),
      ),
      -1,
      true,
    );

    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.4, { duration: 1500 }),
      ),
      -1,
      true,
    );

    // Shimmer effect
    shimmer.value = withRepeat(withTiming(1, { duration: 3000 }), -1, false);
  }, []);

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: flameScale.value },
      { rotate: `${flameRotate.value}deg` },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 1, 0]),
  }));

  const getStreakMilestone = (streak: number) => {
    if (streak >= 365)
      return {
        label: t("statistics.streak.legendary"),
        color: "#F59E0B",
        icon: Award,
      };

    if (streak >= 100)
      return {
        label: t("statistics.streak.centuryClub"),
        color: "#8B5CF6",
        icon: Trophy,
      };

    if (streak >= 30)
      return {
        label: t("statistics.streak.onFire"),
        color: "#EF4444",
        icon: Flame,
      };

    if (streak >= 7)
      return {
        label: t("statistics.streak.hotStreak"),
        color: "#F97316",
        icon: Zap,
      };

    return {
      label: t("statistics.streak.gettingStarted"),
      color: "#10B981",
      icon: Target,
    };
  };

  const milestone = getStreakMilestone(dailyStreak);
  const MilestoneIcon = milestone.icon;

  // Week days
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date().getDay();
  const activeDays = Math.min(dailyStreak % 7 || (dailyStreak > 0 ? 7 : 0), 7);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Hero Section - Centered Flame */}
      <View style={styles.heroSection}>
        {/* Animated Glow Rings */}
        <Animated.View
          style={[styles.glowRing, styles.glowRingOuter, glowAnimatedStyle]}
        />
        <Animated.View
          style={[styles.glowRing, styles.glowRingMiddle, glowAnimatedStyle]}
        />
        <Animated.View
          style={[styles.glowRing, styles.glowRingInner, glowAnimatedStyle]}
        />

        {/* Shimmer Effect */}
        <Animated.View style={[styles.shimmerOverlay, shimmerAnimatedStyle]} />

        {/* Main Flame Circle */}
        <View style={styles.flameCircleOuter}>
          <View style={styles.flameCircleInner}>
            <Animated.View style={flameAnimatedStyle}>
              <Flame
                size={64}
                color={dailyStreak > 0 ? "#FF6B35" : "#9CA3AF"}
                fill={dailyStreak > 0 ? "#FF6B35" : "none"}
                strokeWidth={1.5}
              />
            </Animated.View>
          </View>
        </View>

        {/* Streak Number */}
        <View style={styles.streakDisplay}>
          <Text style={[styles.streakNumber, { color: colors.text }]}>
            {dailyStreak}
          </Text>
          <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
            {t("statistics.daily_streak") || "day streak"}
          </Text>
        </View>

        {/* Milestone Badge */}
        <View
          style={[
            styles.milestoneBadge,
            {
              backgroundColor: `${milestone.color}15`,
              borderColor: `${milestone.color}40`,
            },
          ]}
        >
          <MilestoneIcon size={16} color={milestone.color} strokeWidth={2.5} />
          <Text style={[styles.milestoneText, { color: milestone.color }]}>
            {milestone.label}
          </Text>
        </View>
      </View>

      {/* Week Progress */}
      <View style={styles.weekSection}>
        <View style={styles.weekHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t("statistics.this_week") || "THIS WEEK"}
          </Text>
          <View style={styles.weekProgress}>
            <View
              style={[
                styles.weekProgressBar,
                { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
              ]}
            >
              <View
                style={[
                  styles.weekProgressFill,
                  { width: `${(activeDays / 7) * 100}%` },
                ]}
              />
            </View>
            <Text
              style={[styles.weekProgressText, { color: colors.textSecondary }]}
            >
              {activeDays}/7
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekDaysContainer}
        >
          {weekDays.map((day, index) => {
            const isActive = index <= today && today - index < activeDays;
            const isToday = index === today;

            return (
              <View key={index} style={styles.dayWrapper}>
                <View
                  style={[
                    styles.dayCircle,
                    {
                      backgroundColor: isActive
                        ? "#FF6B35"
                        : isDark
                          ? "#374151"
                          : "#F3F4F6",
                      borderWidth: isToday ? 2.5 : 0,
                      borderColor: "#FF6B35",
                      shadowColor: isActive ? "#FF6B35" : "transparent",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isActive ? 0.3 : 0,
                      shadowRadius: 8,
                      elevation: isActive ? 4 : 0,
                    },
                  ]}
                >
                  {isActive && (
                    <Flame size={16} color="#FFFFFF" fill="#FFFFFF" />
                  )}
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: isToday ? "#FF6B35" : colors.textSecondary,
                      fontWeight: isToday ? "700" : "600",
                    },
                  ]}
                >
                  {day}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsSection}>
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.textSecondary, marginBottom: 12 },
          ]}
        >
          {t("loading.statistics").toUpperCase()}
        </Text>
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: isDark ? "#374151" : "#F9FAFB" },
            ]}
          >
            <View
              style={[
                styles.statIconWrapper,
                { backgroundColor: isDark ? "#3B82F620" : "#3B82F615" },
              ]}
            >
              <Zap size={20} color="#3B82F6" strokeWidth={2.5} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {weeklyStreak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t("statistics.weekly_streak") || "WEEKS"}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: isDark ? "#374151" : "#F9FAFB" },
            ]}
          >
            <View
              style={[
                styles.statIconWrapper,
                { backgroundColor: isDark ? "#10B98120" : "#10B98115" },
              ]}
            >
              <Star
                size={20}
                color="#10B981"
                fill="#10B981"
                strokeWidth={2.5}
              />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {perfectDays}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t("statistics.perfect_days") || "PERFECT"}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: isDark ? "#374151" : "#F9FAFB" },
            ]}
          >
            <View
              style={[
                styles.statIconWrapper,
                { backgroundColor: isDark ? "#F59E0B20" : "#F59E0B15" },
              ]}
            >
              <Trophy size={20} color="#F59E0B" strokeWidth={2.5} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {bestStreak || dailyStreak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t("statistics.best_streak") || "RECORD"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    padding: 24,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 32,
    marginBottom: 32,
    position: "relative",
  },
  glowRing: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 2,
  },
  glowRingOuter: {
    width: 200,
    height: 200,
    borderColor: "#FF6B3515",
  },
  glowRingMiddle: {
    width: 160,
    height: 160,
    borderColor: "#FF6B3525",
  },
  glowRingInner: {
    width: 120,
    height: 120,
    borderColor: "#FF6B3535",
  },
  shimmerOverlay: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#FF6B3510",
  },
  flameCircleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  flameCircleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
  },
  streakDisplay: {
    alignItems: "center",
    marginTop: 24,
  },
  streakNumber: {
    fontSize: 72,
    fontWeight: "900",
    letterSpacing: -3,
    lineHeight: 76,
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  milestoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginTop: 16,
    gap: 8,
    borderWidth: 1.5,
  },
  milestoneText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  weekSection: {
    marginBottom: 28,
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  weekProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weekProgressBar: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  weekProgressFill: {
    height: "100%",
    backgroundColor: "#FF6B35",
    borderRadius: 3,
  },
  weekProgressText: {
    fontSize: 11,
    fontWeight: "700",
  },
  weekDaysContainer: {
    paddingHorizontal: 4,
    gap: 12,
  },
  dayWrapper: {
    alignItems: "center",
    gap: 8,
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    margin: 3,
  },
  dayLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
