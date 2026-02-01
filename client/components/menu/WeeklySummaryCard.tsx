import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Flame,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react-native";
import type { DayProgress } from "./DayProgressRow";

interface WeeklySummaryCardProps {
  days: DayProgress[];
  streak: number;
  onViewJourney?: () => void;
}

interface DayStat {
  day: number;
  date: string;
  variance: number;
  goalMet: boolean;
  status: "completed" | "in_progress" | "pending";
}

export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({
  days,
  streak,
  onViewJourney,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const completedDays = days.filter((d) => d.status === "completed");
    const daysOnTarget = completedDays.filter((d) => d.goalMet).length;
    const totalCompletedDays = completedDays.length;

    // Calculate average variance
    const totalVariance = completedDays.reduce((sum, day) => {
      return sum + ((day.caloriesActual || 0) - (day.caloriesTarget || 2000));
    }, 0);
    const avgVariance = totalCompletedDays > 0
      ? Math.round(totalVariance / totalCompletedDays)
      : 0;

    // Find best and worst days
    let bestDay: DayStat | null = null;
    let worstDay: DayStat | null = null;

    completedDays.forEach((day) => {
      const variance = Math.abs((day.caloriesActual || 0) - (day.caloriesTarget || 2000));
      const dayStat: DayStat = {
        day: day.day,
        date: day.date || "",
        variance: (day.caloriesActual || 0) - (day.caloriesTarget || 2000),
        goalMet: day.goalMet || false,
        status: day.status,
      };

      if (day.goalMet) {
        if (!bestDay || variance < Math.abs(bestDay.variance)) {
          bestDay = dayStat;
        }
      }
      if (!day.goalMet) {
        if (!worstDay || variance > Math.abs(worstDay.variance)) {
          worstDay = dayStat;
        }
      }
    });

    // Calculate success rate
    const successRate = totalCompletedDays > 0
      ? Math.round((daysOnTarget / totalCompletedDays) * 100)
      : 0;

    return {
      daysOnTarget,
      totalCompletedDays,
      avgVariance,
      successRate,
      bestDay,
      worstDay,
    };
  }, [days]);

  const getDayName = (date: string | undefined): string => {
    if (!date) return "";
    const dayDate = new Date(date);
    return dayDate.toLocaleDateString("en-US", { weekday: "long" });
  };

  const getSuccessRateColor = () => {
    if (stats.successRate >= 80) return colors.emerald500;
    if (stats.successRate >= 60) return colors.warning || "#f59e0b";
    return colors.error || "#ef4444";
  };

  const getVarianceColor = () => {
    if (Math.abs(stats.avgVariance) <= 50) return colors.emerald500;
    if (stats.avgVariance < 0) return colors.warning || "#f59e0b";
    return colors.error || "#ef4444";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: "#6366f1" + "20" }]}>
            <BarChart3 size={18} color="#6366f1" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("menu.weekly_summary", "Weekly Summary")}
          </Text>
        </View>
        {onViewJourney && (
          <Pressable onPress={onViewJourney} style={styles.journeyButton}>
            <Text style={[styles.journeyButtonText, { color: colors.emerald500 }]}>
              {t("menu.view_journey", "View Journey")}
            </Text>
            <ChevronRight size={14} color={colors.emerald500} />
          </Pressable>
        )}
      </View>

      {/* Main Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Days on Target */}
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statHeader}>
            <Target size={16} color={colors.emerald500} />
            <Text style={[styles.statLabel, { color: colors.icon }]}>
              {t("menu.days_on_target", "Days on Target")}
            </Text>
          </View>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValueLarge, { color: colors.text }]}>
              {stats.daysOnTarget}
            </Text>
            <Text style={[styles.statValueSmall, { color: colors.icon }]}>
              / {stats.totalCompletedDays}
            </Text>
          </View>
          <View style={[styles.successRateBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.successRateFill,
                {
                  backgroundColor: getSuccessRateColor(),
                  width: `${stats.successRate}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.successRateText, { color: getSuccessRateColor() }]}>
            {stats.successRate}%
          </Text>
        </View>

        {/* Average Variance */}
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statHeader}>
            {stats.avgVariance >= 0 ? (
              <TrendingUp size={16} color={getVarianceColor()} />
            ) : (
              <TrendingDown size={16} color={getVarianceColor()} />
            )}
            <Text style={[styles.statLabel, { color: colors.icon }]}>
              {t("menu.avg_variance", "Avg Variance")}
            </Text>
          </View>
          <Text style={[styles.statValueLarge, { color: getVarianceColor() }]}>
            {stats.avgVariance > 0 ? "+" : ""}{stats.avgVariance}
          </Text>
          <Text style={[styles.statUnit, { color: colors.icon }]}>
            {t("menu.kcal_day", "kcal/day")}
          </Text>
        </View>
      </View>

      {/* Streak and Best/Worst Day Row */}
      <View style={styles.detailsRow}>
        {/* Streak Badge */}
        {streak > 0 && (
          <View style={[styles.detailCard, { backgroundColor: "#f59e0b" + "15" }]}>
            <View style={styles.detailCardContent}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <View>
                <Text style={[styles.detailValue, { color: "#f59e0b" }]}>
                  {streak} {t("menu.days", "days")}
                </Text>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>
                  {t("menu.current_streak", "Current Streak")}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Best Day */}
        {stats.bestDay && (
          <View style={[styles.detailCard, { backgroundColor: colors.emerald500 + "15" }]}>
            <View style={styles.detailCardContent}>
              <CheckCircle2 size={20} color={colors.emerald500} />
              <View>
                <Text style={[styles.detailValue, { color: colors.emerald500 }]}>
                  {getDayName(stats.bestDay.date) || `Day ${stats.bestDay.day}`}
                </Text>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>
                  {t("menu.best_day", "Best Day")} ({stats.bestDay.variance > 0 ? "+" : ""}{stats.bestDay.variance})
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Needs Improvement (only if no streak and best day shown) */}
        {stats.worstDay && streak === 0 && !stats.bestDay && (
          <View style={[styles.detailCard, { backgroundColor: (colors.warning || "#f59e0b") + "15" }]}>
            <View style={styles.detailCardContent}>
              <XCircle size={20} color={colors.warning || "#f59e0b"} />
              <View>
                <Text style={[styles.detailValue, { color: colors.warning || "#f59e0b" }]}>
                  {getDayName(stats.worstDay.date) || `Day ${stats.worstDay.day}`}
                </Text>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>
                  {t("menu.needs_work", "Needs Work")}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Mini Day Progress Indicators */}
      <View style={styles.miniProgressRow}>
        {days.slice(0, 7).map((day, index) => (
          <View
            key={day.day}
            style={[
              styles.miniDayIndicator,
              {
                backgroundColor:
                  day.status === "pending"
                    ? colors.border
                    : day.goalMet
                    ? colors.emerald500
                    : day.status === "in_progress"
                    ? colors.emerald500 + "40"
                    : (colors.error || "#ef4444") + "60",
              },
            ]}
          >
            {day.status === "completed" && day.goalMet && (
              <CheckCircle2 size={10} color="#ffffff" />
            )}
            {day.status === "completed" && !day.goalMet && (
              <XCircle size={10} color="#ffffff" />
            )}
            {day.status === "in_progress" && (
              <View style={[styles.inProgressDot, { backgroundColor: colors.emerald500 }]} />
            )}
          </View>
        ))}
        {days.length > 7 && (
          <Text style={[styles.moreDays, { color: colors.icon }]}>+{days.length - 7}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  journeyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  journeyButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    gap: 6,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  statValueLarge: {
    fontSize: 26,
    fontWeight: "800",
  },
  statValueSmall: {
    fontSize: 16,
    fontWeight: "600",
  },
  statUnit: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: -2,
  },
  successRateBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  successRateFill: {
    height: "100%",
    borderRadius: 2,
  },
  successRateText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  detailsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  detailCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  detailCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  streakEmoji: {
    fontSize: 20,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
  miniProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "transparent",
  },
  miniDayIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  inProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moreDays: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
});

export default WeeklySummaryCard;
