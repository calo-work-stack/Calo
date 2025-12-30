import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
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
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { EnhancedCalendarStats } from "@/src/types/calendarStats";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_SPACING = 15;

interface StatisticsCarouselProps {
  statistics: EnhancedCalendarStats | null;
  isLoading?: boolean;
  language?: string;
}

const StatisticsCarousel: React.FC<StatisticsCarouselProps> = ({
  statistics,
  isLoading,
  language = "en",
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>
          {language === "he" ? "טוען סטטיסטיקות..." : "Loading statistics..."}
        </Text>
      </View>
    );
  }

  if (!statistics) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>
          {language === "he"
            ? "אין נתונים סטטיסטיים"
            : "No statistics available"}
        </Text>
      </View>
    );
  }

  const getTrendIcon = (trend: string, color: string) => {
    switch (trend) {
      case "increasing":
      case "improving":
        return <TrendingUp size={16} color={color} />;
      case "decreasing":
      case "declining":
        return <TrendingDown size={16} color={color} />;
      default:
        return <Activity size={16} color={color} />;
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
        {/* Progress Card */}
        <LinearGradient
          colors={["#10B981", "#059669"]}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeader}>
            <Trophy size={24} color="#FFF" />
            <Text style={styles.cardTitle}>Monthly Progress</Text>
          </View>
          <Text style={styles.mainValue}>{statistics.monthlyProgress}%</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Target size={16} color="#D1FAE5" />
              <Text style={styles.statLabel}>Goals Met</Text>
              <Text style={styles.statValue}>
                {statistics.totalGoalDays}/{statistics.totalDays}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Award size={16} color="#D1FAE5" />
              <Text style={styles.statLabel}>Perfect Days</Text>
              <Text style={styles.statValue}>{statistics.perfectDays}</Text>
            </View>
          </View>
          {statistics.comparison.progressDiff !== 0 && (
            <View style={styles.comparisonBadge}>
              {getTrendIcon(
                statistics.comparison.progressDiff > 0
                  ? "increasing"
                  : "decreasing",
                "#FFF"
              )}
              <Text style={styles.comparisonText}>
                {formatDiff(statistics.comparison.progressDiff)}% vs last month
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Streak Card */}
        <LinearGradient
          colors={["#EF4444", "#DC2626"]}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeader}>
            <Flame size={24} color="#FFF" />
            <Text style={styles.cardTitle}>Current Streak</Text>
          </View>
          <Text style={styles.mainValue}>{statistics.streakDays}</Text>
          <Text style={styles.streakLabel}>days in a row</Text>
          {statistics.comparison.streakDiff !== 0 && (
            <View style={styles.comparisonBadge}>
              {getTrendIcon(
                statistics.comparison.streakDiff > 0
                  ? "increasing"
                  : "decreasing",
                "#FFF"
              )}
              <Text style={styles.comparisonText}>
                {formatDiff(statistics.comparison.streakDiff)} vs last month
              </Text>
            </View>
          )}
          <Text style={styles.motivationText}>
            {statistics.motivationalMessage}
          </Text>
        </LinearGradient>

        {/* Calories Card */}
        <View style={[styles.card, styles.lightCard]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: "#FEF3C7" }]}>
              <Activity size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.cardTitle, styles.darkText]}>Calories</Text>
          </View>
          <Text style={[styles.mainValue, styles.darkText]}>
            {statistics.averageCalories}
          </Text>
          <Text style={styles.subLabel}>kcal/day average</Text>

          <View style={styles.breakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Min</Text>
              <Text style={styles.breakdownValue}>
                {statistics.nutritionBreakdown.calories.min}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Max</Text>
              <Text style={styles.breakdownValue}>
                {statistics.nutritionBreakdown.calories.max}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Adherence</Text>
              <Text style={styles.breakdownValue}>
                {statistics.nutritionBreakdown.calories.adherencePercent}%
              </Text>
            </View>
          </View>

          {statistics.comparison.caloriesDiff !== 0 && (
            <View style={[styles.comparisonBadge, styles.darkComparisonBadge]}>
              {getTrendIcon(
                statistics.comparison.caloriesDiff > 0
                  ? "increasing"
                  : "decreasing",
                "#6B7280"
              )}
              <Text style={[styles.comparisonText, styles.darkComparisonText]}>
                {formatDiff(statistics.comparison.caloriesDiff)} vs last month
              </Text>
            </View>
          )}
        </View>

        {/* Protein Card */}
        <View style={[styles.card, styles.lightCard]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: "#DBEAFE" }]}>
              <BarChart3 size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.cardTitle, styles.darkText]}>Protein</Text>
          </View>
          <Text style={[styles.mainValue, styles.darkText]}>
            {statistics.averageProtein}g
          </Text>
          <Text style={styles.subLabel}>daily average</Text>

          <View style={styles.breakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Min</Text>
              <Text style={styles.breakdownValue}>
                {statistics.nutritionBreakdown.protein.min}g
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Max</Text>
              <Text style={styles.breakdownValue}>
                {statistics.nutritionBreakdown.protein.max}g
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Goal</Text>
              <Text style={styles.breakdownValue}>
                {statistics.nutritionBreakdown.protein.goalAverage}g
              </Text>
            </View>
          </View>

          {statistics.comparison.proteinDiff !== 0 && (
            <View style={[styles.comparisonBadge, styles.darkComparisonBadge]}>
              {getTrendIcon(
                statistics.comparison.proteinDiff > 0
                  ? "increasing"
                  : "decreasing",
                "#6B7280"
              )}
              <Text style={[styles.comparisonText, styles.darkComparisonText]}>
                {formatDiff(statistics.comparison.proteinDiff)}g vs last month
              </Text>
            </View>
          )}
        </View>

        {/* Water Card */}
        <LinearGradient
          colors={["#3B82F6", "#2563EB"]}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeader}>
            <Droplet size={24} color="#FFF" />
            <Text style={styles.cardTitle}>Hydration</Text>
          </View>
          <Text style={styles.mainValue}>{statistics.averageWater}ml</Text>
          <Text style={styles.subLabel}>daily average</Text>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    (statistics.averageWater / 2000) * 100,
                    100
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {Math.round((statistics.averageWater / 2000) * 100)}% of daily goal
          </Text>

          {statistics.comparison.waterDiff !== 0 && (
            <View style={styles.comparisonBadge}>
              {getTrendIcon(
                statistics.comparison.waterDiff > 0
                  ? "increasing"
                  : "decreasing",
                "#FFF"
              )}
              <Text style={styles.comparisonText}>
                {formatDiff(statistics.comparison.waterDiff)}ml vs last month
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Nutrition Summary Card */}
        <View style={[styles.card, styles.lightCard]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: "#F3E8FF" }]}>
              <Activity size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.cardTitle, styles.darkText]}>
              Nutrition Summary
            </Text>
          </View>

          <View style={styles.macroGrid}>
            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{statistics.averageCarbs}g</Text>
              <View style={styles.macroBadge}>
                {getTrendIcon(statistics.macroTrends.carbsTrend, "#6B7280")}
              </View>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>{statistics.averageFat}g</Text>
              <View style={styles.macroBadge}>
                {getTrendIcon(statistics.macroTrends.fatTrend, "#6B7280")}
              </View>
            </View>
          </View>

          <View style={styles.qualitySection}>
            <Text style={styles.qualityLabel}>Quality Score</Text>
            <View style={styles.qualityScore}>
              <Text style={styles.qualityValue}>
                {statistics.averageQualityScore}
              </Text>
              <Text style={styles.qualityMax}>/10</Text>
            </View>
          </View>

          <View style={styles.mealCountSection}>
            <Calendar size={16} color="#6B7280" />
            <Text style={styles.mealCountText}>
              {statistics.averageMealCount.toFixed(1)} meals per day average
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  scrollContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
    gap: CARD_SPACING,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  lightCard: {
    backgroundColor: "#FFF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  darkText: {
    color: "#1F2937",
  },
  mainValue: {
    fontSize: 48,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 8,
  },
  streakLabel: {
    fontSize: 16,
    color: "#FEE2E2",
    marginBottom: 16,
  },
  subLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#D1FAE5",
    marginTop: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  comparisonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  darkComparisonBadge: {
    backgroundColor: "#F3F4F6",
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF",
  },
  darkComparisonText: {
    color: "#6B7280",
  },
  motivationText: {
    fontSize: 14,
    color: "#FEE2E2",
    marginTop: 16,
    fontStyle: "italic",
  },
  breakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  breakdownItem: {
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: "#DBEAFE",
    marginTop: 8,
    textAlign: "center",
  },
  macroGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  macroItem: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  macroLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  macroBadge: {
    marginTop: 8,
  },
  qualitySection: {
    alignItems: "center",
    marginBottom: 16,
  },
  qualityLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  qualityScore: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  qualityValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#8B5CF6",
  },
  qualityMax: {
    fontSize: 20,
    fontWeight: "600",
    color: "#9CA3AF",
    marginLeft: 4,
  },
  mealCountSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  mealCountText: {
    fontSize: 14,
    color: "#6B7280",
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    color: "#6B7280",
    padding: 32,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#9CA3AF",
    padding: 32,
  },
});

export default React.memo(StatisticsCarousel);
