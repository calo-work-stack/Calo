import React, { useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { useStatistics } from "@/hooks/useStatistics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

// Components
import PeriodSelector from "@/components/statistics/PeriodSelector";
import DuolingoStreak from "@/components/statistics/StreakProgress";
import NutritionCarousel from "@/components/statistics/NutritionCarousel";
import WeeklyChart from "@/components/statistics/charts/WeeklyChart";
import MacrosChart from "@/components/statistics/charts/MacrosChart";
import { AchievementsSection } from "@/components/statistics/AchievementsSection";
import { AIRecommendationsSection } from "@/components/statistics/AIRecommendationsSection";
import LoadingScreen from "@/components/LoadingScreen";
// Icons
import { Award, Droplets, Sparkles } from "lucide-react-native";
import useOptimizedAuthSelector from "@/hooks/useOptimizedAuthSelector";
import { LevelProgress } from "@/components/statistics";

const { width } = Dimensions.get("window");

export default function StatisticsScreen() {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const { colors, isDark } = useTheme();
  const { user } = useOptimizedAuthSelector();

  const {
    statisticsData,
    userQuestionnaire,
    metrics,
    weeklyData,
    achievements,
    aiRecommendations,
    isLoading,
    selectedPeriod,
    refreshing,
    progressStats,
    gamificationStats,
    categorizedMetrics,
    hasData,
    setSelectedPeriod,
    refresh,
    fetchAchievements,
    updateMetrics,
  } = useStatistics("week");

  // Update metrics when data or language changes
  useEffect(() => {
    if (statisticsData && userQuestionnaire) {
      updateMetrics(t, language);
    }
  }, [statisticsData, userQuestionnaire, language, t, updateMetrics]);

  // Fetch achievements on mount
  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const shouldShowAiRecommendations = useMemo(() => {
    return (
      user?.subscription_type === "GOLD" ||
      user?.subscription_type === "PLATINUM"
    );
  }, [user?.subscription_type]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refresh();
    await fetchAchievements();
  }, [refresh, fetchAchievements]);

  // Loading state
  if (isLoading)
    return <LoadingScreen text={t("loading.loading", "loading.statistics")} />;

  // Render nutrition metrics carousel
  const renderNutritionMetrics = () => {
    if (!metrics.length) return null;

    return (
      <Animated.View
        entering={FadeInDown.delay(200).duration(400)}
        style={styles.metricsSection}
      >
        <NutritionCarousel
          metrics={metrics}
          extraMetrics={{
            sugar: statisticsData?.averageSugar,
            sodium: statisticsData?.averageSodium,
          }}
        />
      </Animated.View>
    );
  };

  // Render hydration card
  const renderHydrationCard = () => {
    const waterMetric = categorizedMetrics.hydration[0];
    if (!waterMetric) return null;

    const percentage = Math.min(
      100,
      Math.round((waterMetric.value / waterMetric.target) * 100),
    );

    return (
      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        style={styles.hydrationSection}
      >
        <LinearGradient
          colors={isDark ? ["#1E3A5F", "#1E293B"] : ["#EBF8FF", "#DBEAFE"]}
          style={styles.hydrationCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.hydrationHeader}>
            <View style={styles.hydrationIconContainer}>
              <Droplets size={24} color="#3B82F6" fill="#3B82F620" />
            </View>
            <View style={styles.hydrationInfo}>
              <Text style={[styles.hydrationTitle, { color: colors.text }]}>
                {t("statistics.daily_hydration") || "Daily Hydration"}
              </Text>
              <Text
                style={[
                  styles.hydrationSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t("statistics.stay_hydrated") ||
                  "Stay hydrated for better health"}
              </Text>
            </View>
          </View>
          <View style={styles.hydrationProgress}>
            <View style={styles.hydrationValues}>
              <Text style={[styles.hydrationCurrent, { color: "#3B82F6" }]}>
                {Math.round(waterMetric.value)}
              </Text>
              <Text
                style={[styles.hydrationUnit, { color: colors.textSecondary }]}
              >
                / {waterMetric.target} {t("statistics.ml")}
              </Text>
            </View>

            <View
              style={[
                styles.hydrationBar,
                { backgroundColor: isDark ? "#374151" : "#E2E8F0" },
              ]}
            >
              <LinearGradient
                colors={["#3B82F6", "#60A5FA"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.hydrationBarFill, { width: `${percentage}%` }]}
              />
            </View>

            <Text style={[styles.hydrationPercent, { color: colors.muted }]}>
              {percentage}% {t("statistics.of_goal") || "of goal"}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Render weekly progress chart
  const renderWeeklyProgress = () => {
    if (!weeklyData.length) return null;

    return (
      <Animated.View
        entering={FadeInDown.delay(400).duration(400)}
        style={styles.chartSection}
      >
        <WeeklyChart data={weeklyData} />
      </Animated.View>
    );
  };

  // Render macros breakdown
  const renderMacrosBreakdown = () => {
    if (!statisticsData) return null;

    // Get macros metrics from categorized metrics
    const macrosMetrics = categorizedMetrics.macros.filter(
      (m) => m.id === "protein" || m.id === "carbs" || m.id === "fats",
    );

    if (macrosMetrics.length === 0) return null;

    return (
      <Animated.View
        entering={FadeInDown.delay(500).duration(400)}
        style={styles.macrosSection}
      >
        <MacrosChart metrics={macrosMetrics} />
      </Animated.View>
    );
  };

  // Render AI Recommendations
  const renderAIRecommendations = () => {
    return (
      <Animated.View
        entering={FadeInDown.delay(550).duration(400)}
        style={styles.recommendationsSection}
      >
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIconBg,
              { backgroundColor: isDark ? "#6366F120" : "#EEF2FF" },
            ]}
          >
            <Sparkles size={18} color="#6366F1" />
          </View>
        </View>

        <AIRecommendationsSection
          recommendations={aiRecommendations}
          period={selectedPeriod}
          colors={{
            ...colors,
            textTertiary: colors.textSecondary,
            emerald400: "#34D399",
            emerald500: "#10B981",
            emerald600: "#059669",
            emerald700: "#047857",
          }}
        />
      </Animated.View>
    );
  };

  const renderLevelProgress = () => {
    return (
      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
        style={styles.levelSection}
      >
        <LevelProgress
          level={gamificationStats.level}
          currentXP={gamificationStats.currentXP}
          nextLevelXP={gamificationStats.nextLevelXP}
          xpProgress={gamificationStats.xpProgress}
          xpToNext={gamificationStats.xpToNext}
          dailyStreak={gamificationStats.dailyStreak}
          weeklyStreak={gamificationStats.weeklyStreak}
          perfectDays={gamificationStats.perfectDays}
          totalPoints={gamificationStats.totalPoints}
        />
      </Animated.View>
    );
  };
  // Render achievements section
  const renderAchievements = () => {
    return (
      <Animated.View
        entering={FadeInDown.delay(700).duration(400)}
        style={styles.achievementsSection}
      >
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIconBg,
              { backgroundColor: isDark ? "#F59E0B20" : "#FEF3C7" },
            ]}
          >
            <Award size={18} color="#F59E0B" />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("statistics.achievements") || "Achievements"}
          </Text>
        </View>

        <AchievementsSection
          achievements={achievements}
          period={selectedPeriod}
          locale={language}
        />
      </Animated.View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("statistics.title") || "Statistics"}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {t("statistics.track_progress") || "Track your nutrition progress"}
          </Text>
        </Animated.View>

        {/* Period Selector */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)}>
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </Animated.View>

        {/* Duolingo-style Streak Display */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.levelSection}
        >
          <DuolingoStreak
            dailyStreak={gamificationStats.dailyStreak}
            weeklyStreak={gamificationStats.weeklyStreak}
            perfectDays={gamificationStats.perfectDays}
            totalPoints={gamificationStats.totalPoints}
            bestStreak={progressStats.bestStreak}
          />
        </Animated.View>
        {renderLevelProgress()}
        {/* Nutrition Metrics Grid */}
        {renderNutritionMetrics()}

        {/* Hydration Card */}
        {renderHydrationCard()}

        {/* Weekly Progress Chart */}
        {renderWeeklyProgress()}

        {/* Macros Breakdown */}
        {renderMacrosBreakdown()}

        {/* AI Recommendations */}
        {shouldShowAiRecommendations && renderAIRecommendations()}

        {/* Achievements Section */}
        {renderAchievements()}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "500",
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 4,
  },
  levelSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  metricsSection: {
    marginTop: 24,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  hydrationSection: {
    marginTop: 24,
  },
  hydrationCard: {
    borderRadius: 20,
    padding: 20,
  },
  hydrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  hydrationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  hydrationInfo: {
    flex: 1,
  },
  hydrationTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  hydrationSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  hydrationProgress: {
    gap: 8,
  },
  hydrationValues: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  hydrationCurrent: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  hydrationUnit: {
    fontSize: 15,
    fontWeight: "600",
  },
  hydrationBar: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  hydrationBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  hydrationPercent: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  chartSection: {
    marginTop: 24,
  },
  chartContainer: {
    borderRadius: 20,
    overflow: "hidden",
  },
  macrosSection: {
    marginTop: 24,
  },
  recommendationsSection: {
    marginTop: 24,
  },
  achievementsSection: {
    marginTop: 24,
  },
  summarySection: {
    marginTop: 24,
  },
  bottomSpacer: {
    height: 40,
  },
});
