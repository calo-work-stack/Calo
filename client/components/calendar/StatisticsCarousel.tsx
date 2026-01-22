import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
  Pressable,
} from "react-native";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Trophy,
  Target,
  Award,
  Activity,
  Droplet,
  Calendar,
  BarChart3,
  Sparkles,
  Zap,
  Star,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/context/ThemeContext";
import {
  EnhancedCalendarStats,
  StatisticsCarouselProps,
} from "@/src/types/calendar";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.7;
const CARD_SPACING = 10;

// Animated Card wrapper for press effects
const AnimatedCard = ({ children, style, gradientColors, onPress }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  if (gradientColors) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
        >
          <LinearGradient
            colors={gradientColors}
            style={[styles.card, style]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {children}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[styles.card, style]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

const StatisticsCarousel: React.FC<StatisticsCarouselProps> = ({
  statistics,
  isLoading,
  language = "en",
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.loadingCard,
            { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB" },
          ]}
        >
          <View style={styles.loadingPulse} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t("statistics.loading")}
          </Text>
        </View>
      </View>
    );
  }

  if (!statistics) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB" },
          ]}
        >
          <Sparkles size={32} color={isDark ? "#6B7280" : "#9CA3AF"} />
          <Text
            style={[
              styles.emptyText,
              { color: isDark ? "#9CA3AF" : "#6B7280" },
            ]}
          >
            {t("statistics.noData")}
          </Text>
          <Text
            style={[
              styles.emptySubtext,
              { color: isDark ? "#6B7280" : "#9CA3AF" },
            ]}
          >
            {t("statistics.startTracking")}
          </Text>
        </View>
      </View>
    );
  }

  const getTrendIcon = (trend: string, color: string, size: number = 16) => {
    switch (trend) {
      case "increasing":
      case "improving":
        return <TrendingUp size={size} color={color} />;
      case "decreasing":
      case "declining":
        return <TrendingDown size={size} color={color} />;
      default:
        return <Activity size={size} color={color} />;
    }
  };

  const formatDiff = (value: number) => {
    if (value === 0) return "";
    const sign = value > 0 ? "+" : "";
    return `${sign}${Math.round(value)}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="center"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Progress Card - Enhanced */}
        <AnimatedCard gradientColors={["#10B981", "#059669", "#047857"]}>
          <View style={styles.cardGlow} />
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Trophy size={14} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>
              {t("statistics.monthlyProgress")}
            </Text>
          </View>
          <View style={styles.mainValueContainer}>
            <Text style={styles.mainValue}>{statistics.monthlyProgress}</Text>
            <Text style={styles.mainValueUnit}>%</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconBg}>
                <Target size={12} color="#10B981" />
              </View>
              <Text style={styles.statLabel}>{t("statistics.goalsMet")}</Text>
              <Text style={styles.statValue}>
                {statistics.totalGoalDays}/{statistics.totalDays}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconBg}>
                <Star size={12} color="#10B981" fill="#10B981" />
              </View>
              <Text style={styles.statLabel}>
                {t("statistics.perfectDays")}
              </Text>
              <Text style={styles.statValue}>{statistics.perfectDays}</Text>
            </View>
          </View>
          {statistics.comparison.progressDiff !== 0 && (
            <View style={styles.comparisonBadge}>
              {getTrendIcon(
                statistics.comparison.progressDiff > 0
                  ? "increasing"
                  : "decreasing",
                "#FFF",
                14,
              )}
              <Text style={styles.comparisonText}>
                {formatDiff(statistics.comparison.progressDiff)}%{" "}
                {t("statistics.vsLastMonth")}
              </Text>
            </View>
          )}
        </AnimatedCard>

        {/* Streak Card - Enhanced */}
        <AnimatedCard gradientColors={["#F97316", "#EA580C", "#DC2626"]}>
          <View style={styles.cardGlow} />
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Flame size={14} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>
              {t("statistics.currentStreak")}
            </Text>
          </View>
          <View style={styles.mainValueContainer}>
            <Text style={styles.mainValue}>{statistics.streakDays}</Text>
            <Zap size={20} color="#FEE2E2" style={{ marginLeft: 6 }} />
          </View>
          <Text style={styles.streakLabel}>{t("statistics.daysInRow")}</Text>
          {statistics.comparison.streakDiff !== 0 && (
            <View style={styles.comparisonBadge}>
              {getTrendIcon(
                statistics.comparison.streakDiff > 0
                  ? "increasing"
                  : "decreasing",
                "#FFF",
                14,
              )}
              <Text style={styles.comparisonText}>
                {formatDiff(statistics.comparison.streakDiff)}{" "}
                {t("statistics.vsLastMonth")}
              </Text>
            </View>
          )}
          {statistics.motivationalMessage && (
            <View style={styles.motivationContainer}>
              <Text style={styles.motivationText}>
                "{statistics.motivationalMessage}"
              </Text>
            </View>
          )}
        </AnimatedCard>

        {/* Calories Card - Enhanced */}
        <AnimatedCard
          style={[
            styles.lightCard,
            { backgroundColor: isDark ? "#1F2937" : "#FFFFFF" },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(245, 158, 11, 0.2)"
                    : "#FEF3C7",
                },
              ]}
            >
              <Activity size={16} color="#F59E0B" />
            </View>
            <Text
              style={[
                styles.cardTitle,
                { color: isDark ? "#F9FAFB" : "#1F2937" },
              ]}
            >
              {t("statistics.calories")}
            </Text>
          </View>
          <View style={styles.mainValueContainer}>
            <Text
              style={[
                styles.mainValue,
                { color: isDark ? "#F9FAFB" : "#1F2937" },
              ]}
            >
              {statistics.averageCalories}
            </Text>
          </View>
          <Text
            style={[styles.subLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}
          >
            {t("statistics.kcalDay")}
          </Text>

          <View style={styles.breakdown}>
            <View
              style={[
                styles.breakdownCard,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "#F9FAFB",
                },
              ]}
            >
              <Text
                style={[
                  styles.breakdownLabel,
                  { color: isDark ? "#9CA3AF" : "#6B7280" },
                ]}
              >
                {t("statistics.min")}
              </Text>
              <Text
                style={[
                  styles.breakdownValue,
                  { color: isDark ? "#F9FAFB" : "#1F2937" },
                ]}
              >
                {statistics.nutritionBreakdown.calories.min}
              </Text>
            </View>
            <View
              style={[
                styles.breakdownCard,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "#F9FAFB",
                },
              ]}
            >
              <Text
                style={[
                  styles.breakdownLabel,
                  { color: isDark ? "#9CA3AF" : "#6B7280" },
                ]}
              >
                {t("statistics.max")}
              </Text>
              <Text
                style={[
                  styles.breakdownValue,
                  { color: isDark ? "#F9FAFB" : "#1F2937" },
                ]}
              >
                {statistics.nutritionBreakdown.calories.max}
              </Text>
            </View>
            <View
              style={[
                styles.breakdownCard,
                {
                  backgroundColor: isDark
                    ? "rgba(16, 185, 129, 0.15)"
                    : "#D1FAE5",
                },
              ]}
            >
              <Text style={[styles.breakdownLabel, { color: "#10B981" }]}>
                {t("statistics.adherence")}
              </Text>
              <Text style={[styles.breakdownValue, { color: "#10B981" }]}>
                {statistics.nutritionBreakdown.calories.adherencePercent}%
              </Text>
            </View>
          </View>

          {statistics.comparison.caloriesDiff !== 0 && (
            <View
              style={[
                styles.comparisonBadge,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6",
                },
              ]}
            >
              {getTrendIcon(
                statistics.comparison.caloriesDiff > 0
                  ? "increasing"
                  : "decreasing",
                isDark ? "#9CA3AF" : "#6B7280",
                14,
              )}
              <Text
                style={[
                  styles.comparisonText,
                  { color: isDark ? "#9CA3AF" : "#6B7280" },
                ]}
              >
                {formatDiff(statistics.comparison.caloriesDiff)}{" "}
                {t("statistics.vsLastMonth")}
              </Text>
            </View>
          )}
        </AnimatedCard>

        {/* Protein Card - Enhanced */}
        <AnimatedCard
          style={[
            styles.lightCard,
            { backgroundColor: isDark ? "#1F2937" : "#FFFFFF" },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(59, 130, 246, 0.2)"
                    : "#DBEAFE",
                },
              ]}
            >
              <BarChart3 size={16} color="#3B82F6" />
            </View>
            <Text
              style={[
                styles.cardTitle,
                { color: isDark ? "#F9FAFB" : "#1F2937" },
              ]}
            >
              {t("statistics.protein")}
            </Text>
          </View>
          <View style={styles.mainValueContainer}>
            <Text
              style={[
                styles.mainValue,
                { color: isDark ? "#F9FAFB" : "#1F2937" },
              ]}
            >
              {statistics.averageProtein}
            </Text>
            <Text
              style={[
                styles.mainValueUnit,
                { color: isDark ? "#9CA3AF" : "#6B7280" },
              ]}
            >
              g
            </Text>
          </View>
          <Text
            style={[styles.subLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}
          >
            {t("statistics.dailyAvg")}
          </Text>

          <View style={styles.breakdown}>
            <View
              style={[
                styles.breakdownCard,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "#F9FAFB",
                },
              ]}
            >
              <Text
                style={[
                  styles.breakdownLabel,
                  { color: isDark ? "#9CA3AF" : "#6B7280" },
                ]}
              >
                {t("statistics.min")}
              </Text>
              <Text
                style={[
                  styles.breakdownValue,
                  { color: isDark ? "#F9FAFB" : "#1F2937" },
                ]}
              >
                {statistics.nutritionBreakdown.protein.min}g
              </Text>
            </View>
            <View
              style={[
                styles.breakdownCard,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "#F9FAFB",
                },
              ]}
            >
              <Text
                style={[
                  styles.breakdownLabel,
                  { color: isDark ? "#9CA3AF" : "#6B7280" },
                ]}
              >
                {t("statistics.max")}
              </Text>
              <Text
                style={[
                  styles.breakdownValue,
                  { color: isDark ? "#F9FAFB" : "#1F2937" },
                ]}
              >
                {statistics.nutritionBreakdown.protein.max}g
              </Text>
            </View>
            <View
              style={[
                styles.breakdownCard,
                {
                  backgroundColor: isDark
                    ? "rgba(59, 130, 246, 0.15)"
                    : "#DBEAFE",
                },
              ]}
            >
              <Text style={[styles.breakdownLabel, { color: "#3B82F6" }]}>
                {t("statistics.goal")}
              </Text>
              <Text style={[styles.breakdownValue, { color: "#3B82F6" }]}>
                {statistics.nutritionBreakdown.protein.goalAverage}g
              </Text>
            </View>
          </View>

          {statistics.comparison.proteinDiff !== 0 && (
            <View
              style={[
                styles.comparisonBadge,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6",
                },
              ]}
            >
              {getTrendIcon(
                statistics.comparison.proteinDiff > 0
                  ? "increasing"
                  : "decreasing",
                isDark ? "#9CA3AF" : "#6B7280",
                14,
              )}
              <Text
                style={[
                  styles.comparisonText,
                  { color: isDark ? "#9CA3AF" : "#6B7280" },
                ]}
              >
                {formatDiff(statistics.comparison.proteinDiff)}g{" "}
                {t("statistics.vsLastMonth")}
              </Text>
            </View>
          )}
        </AnimatedCard>

        {/* Water Card - Enhanced */}
        <AnimatedCard gradientColors={["#0EA5E9", "#3B82F6", "#2563EB"]}>
          <View style={styles.cardGlow} />
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Droplet size={14} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>{t("statistics.hydration")}</Text>
          </View>
          <View style={styles.mainValueContainer}>
            <Text style={styles.mainValue}>{statistics.averageWater}</Text>
            <Text style={styles.mainValueUnitWhite}>{t("statistics.ml")}</Text>
          </View>
          <Text style={[styles.subLabel, { color: "#BFDBFE" }]}>
            {t("statistics.dailyAvg")}
          </Text>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]}
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      (statistics.averageWater / 2000) * 100,
                      100,
                    )}%`,
                  },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.progressLabel}>
              {Math.round((statistics.averageWater / 2000) * 100)}%{" "}
              {t("statistics.ofDailyGoal")}
            </Text>
          </View>

          {statistics.comparison.waterDiff !== 0 && (
            <View style={styles.comparisonBadge}>
              {getTrendIcon(
                statistics.comparison.waterDiff > 0
                  ? "increasing"
                  : "decreasing",
                "#FFF",
                14,
              )}
              <Text style={styles.comparisonText}>
                {formatDiff(statistics.comparison.waterDiff)}
                {t("statistcs.ml")} {t("statistics.vsLastMonth")}
              </Text>
            </View>
          )}
        </AnimatedCard>

        {/* Nutrition Summary Card - Enhanced */}
        <AnimatedCard
          style={[
            styles.lightCard,
            { backgroundColor: isDark ? "#1F2937" : "#FFFFFF" },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(139, 92, 246, 0.2)"
                    : "#F3E8FF",
                },
              ]}
            >
              <Sparkles size={16} color="#8B5CF6" />
            </View>
            <Text
              style={[
                styles.cardTitle,
                { color: isDark ? "#F9FAFB" : "#1F2937" },
              ]}
            >
              {t("statistics.nutritionSummary")}
            </Text>
          </View>

          <View style={styles.macroGrid}>
            <View
              style={[
                styles.macroItem,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "#F9FAFB",
                },
              ]}
            >
              <Text
                style={[
                  styles.macroLabel,
                  { color: isDark ? "#9CA3AF" : "#6B7280" },
                ]}
              >
                {t("statistics.carbs")}
              </Text>
              <Text
                style={[
                  styles.macroValue,
                  { color: isDark ? "#F9FAFB" : "#1F2937" },
                ]}
              >
                {statistics.averageCarbs}g
              </Text>
              <View style={styles.macroBadge}>
                {getTrendIcon(
                  statistics.macroTrends.carbsTrend,
                  isDark ? "#9CA3AF" : "#6B7280",
                  14,
                )}
              </View>
            </View>
            <View
              style={[
                styles.macroItem,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "#F9FAFB",
                },
              ]}
            >
              <Text
                style={[
                  styles.macroLabel,
                  { color: isDark ? "#9CA3AF" : "#6B7280" },
                ]}
              >
                {t("statistics.fat")}
              </Text>
              <Text
                style={[
                  styles.macroValue,
                  { color: isDark ? "#F9FAFB" : "#1F2937" },
                ]}
              >
                {statistics.averageFat}g
              </Text>
              <View style={styles.macroBadge}>
                {getTrendIcon(
                  statistics.macroTrends.fatTrend,
                  isDark ? "#9CA3AF" : "#6B7280",
                  14,
                )}
              </View>
            </View>
          </View>

          <View
            style={[
              styles.qualitySection,
              {
                backgroundColor: isDark ? "rgba(139, 92, 246, 0.1)" : "#F5F3FF",
              },
            ]}
          >
            <Text
              style={[
                styles.qualityLabel,
                { color: isDark ? "#A78BFA" : "#7C3AED" },
              ]}
            >
              {t("statistics.qualityScore")}
            </Text>
            <View style={styles.qualityScore}>
              <Text style={styles.qualityValue}>
                {statistics.averageQualityScore}
              </Text>
              <Text
                style={[
                  styles.qualityMax,
                  { color: isDark ? "#6B7280" : "#9CA3AF" },
                ]}
              >
                /10
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.mealCountSection,
              { borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB" },
            ]}
          >
            <Calendar size={12} color={isDark ? "#9CA3AF" : "#6B7280"} />
            <Text
              style={[
                styles.mealCountText,
                { color: isDark ? "#9CA3AF" : "#6B7280" },
              ]}
            >
              {statistics.averageMealCount.toFixed(1)}{" "}
              {t("statistics.mealsPerDay")}
            </Text>
          </View>
        </AnimatedCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    alignItems: "center",
    maxHeight: 220,
  },
  scrollContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
    gap: CARD_SPACING,
    alignItems: "center",
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    overflow: "hidden",
    maxHeight: 200,
  },
  cardGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  lightCard: {
    backgroundColor: "#FFF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  mainValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  mainValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -1,
  },
  mainValueUnit: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    marginLeft: 4,
  },
  mainValueUnitWhite: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginLeft: 4,
  },
  streakLabel: {
    fontSize: 12,
    color: "#FEE2E2",
    marginTop: 2,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 10,
    marginTop: -2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 16,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statIconBg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFF",
  },
  comparisonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  comparisonText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFF",
  },
  motivationContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  motivationText: {
    fontSize: 11,
    color: "#FEE2E2",
    fontStyle: "italic",
    lineHeight: 15,
  },
  breakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  breakdownCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  breakdownLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    marginBottom: 2,
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
  },
  progressBarContainer: {
    marginTop: 6,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
    textAlign: "center",
    fontWeight: "500",
  },
  macroGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  macroItem: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  macroLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 2,
    fontWeight: "500",
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  macroBadge: {
    marginTop: 4,
  },
  qualitySection: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  qualityLabel: {
    fontSize: 10,
    color: "#7C3AED",
    marginBottom: 4,
    fontWeight: "600",
  },
  qualityScore: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  qualityValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#8B5CF6",
  },
  qualityMax: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
    marginLeft: 2,
  },
  mealCountSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  mealCountText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  loadingCard: {
    marginHorizontal: 20,
    padding: 30,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    width: CARD_WIDTH,
    maxHeight: 180,
  },
  loadingPulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    marginBottom: 12,
  },
  loadingText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyCard: {
    marginHorizontal: 20,
    padding: 30,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    width: CARD_WIDTH,
    maxHeight: 180,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySubtext: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
});

export default React.memo(StatisticsCarousel);
