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

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.78;
const CARD_SPACING = 14;

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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.loadingCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}>
          <View style={styles.loadingPulse} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {language === "he" ? "טוען סטטיסטיקות..." : "Loading statistics..."}
          </Text>
        </View>
      </View>
    );
  }

  if (!statistics) {
    return (
      <View style={styles.container}>
        <View style={[styles.emptyCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}>
          <Sparkles size={32} color={isDark ? '#6B7280' : '#9CA3AF'} />
          <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {language === "he"
              ? "אין נתונים סטטיסטיים"
              : "No statistics available"}
          </Text>
          <Text style={[styles.emptySubtext, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
            {language === "he"
              ? "התחל לעקוב אחר הארוחות שלך"
              : "Start tracking your meals to see stats"}
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

  const t = {
    monthlyProgress: language === "he" ? "התקדמות חודשית" : "Monthly Progress",
    goalsMet: language === "he" ? "יעדים שהושגו" : "Goals Met",
    perfectDays: language === "he" ? "ימים מושלמים" : "Perfect Days",
    currentStreak: language === "he" ? "רצף נוכחי" : "Current Streak",
    daysInRow: language === "he" ? "ימים ברצף" : "days in a row",
    calories: language === "he" ? "קלוריות" : "Calories",
    protein: language === "he" ? "חלבון" : "Protein",
    hydration: language === "he" ? "שתייה" : "Hydration",
    nutritionSummary: language === "he" ? "סיכום תזונה" : "Nutrition Summary",
    vsLastMonth: language === "he" ? "מול חודש קודם" : "vs last month",
    dailyAvg: language === "he" ? "ממוצע יומי" : "daily average",
    kcalDay: language === "he" ? 'קק"ל/יום' : "kcal/day average",
    min: language === "he" ? "מינ'" : "Min",
    max: language === "he" ? "מקס'" : "Max",
    adherence: language === "he" ? "עמידה" : "Adherence",
    goal: language === "he" ? "יעד" : "Goal",
    carbs: language === "he" ? "פחמימות" : "Carbs",
    fat: language === "he" ? "שומן" : "Fat",
    qualityScore: language === "he" ? "ציון איכות" : "Quality Score",
    mealsPerDay: language === "he" ? "ארוחות ביום בממוצע" : "meals per day average",
    ofDailyGoal: language === "he" ? "מהיעד היומי" : "of daily goal",
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
              <Trophy size={18} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>{t.monthlyProgress}</Text>
          </View>
          <View style={styles.mainValueContainer}>
            <Text style={styles.mainValue}>{statistics.monthlyProgress}</Text>
            <Text style={styles.mainValueUnit}>%</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconBg}>
                <Target size={14} color="#10B981" />
              </View>
              <Text style={styles.statLabel}>{t.goalsMet}</Text>
              <Text style={styles.statValue}>
                {statistics.totalGoalDays}/{statistics.totalDays}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconBg}>
                <Star size={14} color="#10B981" fill="#10B981" />
              </View>
              <Text style={styles.statLabel}>{t.perfectDays}</Text>
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
                14
              )}
              <Text style={styles.comparisonText}>
                {formatDiff(statistics.comparison.progressDiff)}% {t.vsLastMonth}
              </Text>
            </View>
          )}
        </AnimatedCard>

        {/* Streak Card - Enhanced */}
        <AnimatedCard gradientColors={["#F97316", "#EA580C", "#DC2626"]}>
          <View style={styles.cardGlow} />
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Flame size={18} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>{t.currentStreak}</Text>
          </View>
          <View style={styles.mainValueContainer}>
            <Text style={styles.mainValue}>{statistics.streakDays}</Text>
            <Zap size={28} color="#FEE2E2" style={{ marginLeft: 8 }} />
          </View>
          <Text style={styles.streakLabel}>{t.daysInRow}</Text>
          {statistics.comparison.streakDiff !== 0 && (
            <View style={styles.comparisonBadge}>
              {getTrendIcon(
                statistics.comparison.streakDiff > 0
                  ? "increasing"
                  : "decreasing",
                "#FFF",
                14
              )}
              <Text style={styles.comparisonText}>
                {formatDiff(statistics.comparison.streakDiff)} {t.vsLastMonth}
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
        <AnimatedCard style={[styles.lightCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : "#FEF3C7" }]}>
              <Activity size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.cardTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>{t.calories}</Text>
          </View>
          <View style={styles.mainValueContainer}>
            <Text style={[styles.mainValue, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
              {statistics.averageCalories}
            </Text>
          </View>
          <Text style={[styles.subLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{t.kcalDay}</Text>

          <View style={styles.breakdown}>
            <View style={[styles.breakdownCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}>
              <Text style={[styles.breakdownLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{t.min}</Text>
              <Text style={[styles.breakdownValue, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                {statistics.nutritionBreakdown.calories.min}
              </Text>
            </View>
            <View style={[styles.breakdownCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}>
              <Text style={[styles.breakdownLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{t.max}</Text>
              <Text style={[styles.breakdownValue, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                {statistics.nutritionBreakdown.calories.max}
              </Text>
            </View>
            <View style={[styles.breakdownCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }]}>
              <Text style={[styles.breakdownLabel, { color: '#10B981' }]}>{t.adherence}</Text>
              <Text style={[styles.breakdownValue, { color: '#10B981' }]}>
                {statistics.nutritionBreakdown.calories.adherencePercent}%
              </Text>
            </View>
          </View>

          {statistics.comparison.caloriesDiff !== 0 && (
            <View style={[styles.comparisonBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
              {getTrendIcon(
                statistics.comparison.caloriesDiff > 0
                  ? "increasing"
                  : "decreasing",
                isDark ? '#9CA3AF' : "#6B7280",
                14
              )}
              <Text style={[styles.comparisonText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {formatDiff(statistics.comparison.caloriesDiff)} {t.vsLastMonth}
              </Text>
            </View>
          )}
        </AnimatedCard>

        {/* Protein Card - Enhanced */}
        <AnimatedCard style={[styles.lightCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : "#DBEAFE" }]}>
              <BarChart3 size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.cardTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>{t.protein}</Text>
          </View>
          <View style={styles.mainValueContainer}>
            <Text style={[styles.mainValue, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
              {statistics.averageProtein}
            </Text>
            <Text style={[styles.mainValueUnit, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>g</Text>
          </View>
          <Text style={[styles.subLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{t.dailyAvg}</Text>

          <View style={styles.breakdown}>
            <View style={[styles.breakdownCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}>
              <Text style={[styles.breakdownLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{t.min}</Text>
              <Text style={[styles.breakdownValue, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                {statistics.nutritionBreakdown.protein.min}g
              </Text>
            </View>
            <View style={[styles.breakdownCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}>
              <Text style={[styles.breakdownLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{t.max}</Text>
              <Text style={[styles.breakdownValue, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                {statistics.nutritionBreakdown.protein.max}g
              </Text>
            </View>
            <View style={[styles.breakdownCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE' }]}>
              <Text style={[styles.breakdownLabel, { color: '#3B82F6' }]}>{t.goal}</Text>
              <Text style={[styles.breakdownValue, { color: '#3B82F6' }]}>
                {statistics.nutritionBreakdown.protein.goalAverage}g
              </Text>
            </View>
          </View>

          {statistics.comparison.proteinDiff !== 0 && (
            <View style={[styles.comparisonBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
              {getTrendIcon(
                statistics.comparison.proteinDiff > 0
                  ? "increasing"
                  : "decreasing",
                isDark ? '#9CA3AF' : "#6B7280",
                14
              )}
              <Text style={[styles.comparisonText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {formatDiff(statistics.comparison.proteinDiff)}g {t.vsLastMonth}
              </Text>
            </View>
          )}
        </AnimatedCard>

        {/* Water Card - Enhanced */}
        <AnimatedCard gradientColors={["#0EA5E9", "#3B82F6", "#2563EB"]}>
          <View style={styles.cardGlow} />
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Droplet size={18} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>{t.hydration}</Text>
          </View>
          <View style={styles.mainValueContainer}>
            <Text style={styles.mainValue}>{statistics.averageWater}</Text>
            <Text style={styles.mainValueUnitWhite}>ml</Text>
          </View>
          <Text style={[styles.subLabel, { color: '#BFDBFE' }]}>{t.dailyAvg}</Text>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      (statistics.averageWater / 2000) * 100,
                      100
                    )}%`,
                  },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.progressLabel}>
              {Math.round((statistics.averageWater / 2000) * 100)}% {t.ofDailyGoal}
            </Text>
          </View>

          {statistics.comparison.waterDiff !== 0 && (
            <View style={styles.comparisonBadge}>
              {getTrendIcon(
                statistics.comparison.waterDiff > 0
                  ? "increasing"
                  : "decreasing",
                "#FFF",
                14
              )}
              <Text style={styles.comparisonText}>
                {formatDiff(statistics.comparison.waterDiff)}ml {t.vsLastMonth}
              </Text>
            </View>
          )}
        </AnimatedCard>

        {/* Nutrition Summary Card - Enhanced */}
        <AnimatedCard style={[styles.lightCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : "#F3E8FF" }]}>
              <Sparkles size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.cardTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
              {t.nutritionSummary}
            </Text>
          </View>

          <View style={styles.macroGrid}>
            <View style={[styles.macroItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}>
              <Text style={[styles.macroLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{t.carbs}</Text>
              <Text style={[styles.macroValue, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>{statistics.averageCarbs}g</Text>
              <View style={styles.macroBadge}>
                {getTrendIcon(statistics.macroTrends.carbsTrend, isDark ? '#9CA3AF' : "#6B7280", 14)}
              </View>
            </View>
            <View style={[styles.macroItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}>
              <Text style={[styles.macroLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{t.fat}</Text>
              <Text style={[styles.macroValue, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>{statistics.averageFat}g</Text>
              <View style={styles.macroBadge}>
                {getTrendIcon(statistics.macroTrends.fatTrend, isDark ? '#9CA3AF' : "#6B7280", 14)}
              </View>
            </View>
          </View>

          <View style={[styles.qualitySection, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : '#F5F3FF' }]}>
            <Text style={[styles.qualityLabel, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>{t.qualityScore}</Text>
            <View style={styles.qualityScore}>
              <Text style={styles.qualityValue}>
                {statistics.averageQualityScore}
              </Text>
              <Text style={[styles.qualityMax, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>/10</Text>
            </View>
          </View>

          <View style={[styles.mealCountSection, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}>
            <Calendar size={16} color={isDark ? '#9CA3AF' : "#6B7280"} />
            <Text style={[styles.mealCountText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {statistics.averageMealCount.toFixed(1)} {t.mealsPerDay}
            </Text>
          </View>
        </AnimatedCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
    gap: CARD_SPACING,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
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
    marginBottom: 12,
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  mainValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  mainValue: {
    fontSize: 38,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -1,
  },
  mainValueUnit: {
    fontSize: 24,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    marginLeft: 4,
  },
  mainValueUnitWhite: {
    fontSize: 20,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginLeft: 4,
  },
  streakLabel: {
    fontSize: 15,
    color: "#FEE2E2",
    marginTop: 4,
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 16,
    marginTop: -4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 20,
  },
  statItem: {
    alignItems: "center",
    gap: 6,
  },
  statIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
  },
  comparisonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  comparisonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFF",
  },
  motivationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  motivationText: {
    fontSize: 13,
    color: "#FEE2E2",
    fontStyle: "italic",
    lineHeight: 18,
  },
  breakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  breakdownCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  breakdownLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 4,
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  macroGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  macroItem: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  macroLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "500",
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  macroBadge: {
    marginTop: 6,
  },
  qualitySection: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  qualityLabel: {
    fontSize: 11,
    color: "#7C3AED",
    marginBottom: 6,
    fontWeight: "600",
  },
  qualityScore: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  qualityValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#8B5CF6",
  },
  qualityMax: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9CA3AF",
    marginLeft: 2,
  },
  mealCountSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  mealCountText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  loadingCard: {
    marginHorizontal: 20,
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingPulse: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    marginBottom: 16,
  },
  loadingText: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
  },
  emptyCard: {
    marginHorizontal: 20,
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    textAlign: "center",
    fontSize: 13,
    marginTop: 8,
  },
});

export default React.memo(StatisticsCarousel);
