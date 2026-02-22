import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Flame,
  TrendingUp,
  Zap,
  Droplets,
  Target,
  CheckCircle,
  AlertCircle,
  TrendingDown,
} from "lucide-react-native";
import { api } from "@/src/services/api";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

interface DayData {
  day: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  meals: {
    meal_id: string;
    name: string;
    meal_type: string;
    calories: number;
    is_completed: boolean;
  }[];
}

interface GoalAlignment {
  target: number;
  average: number;
  deviation_pct: number;
  status: "on_track" | "over" | "under";
}

interface BreakdownData {
  menu_id: string;
  days_count: number;
  days: DayData[];
  avg_calories_per_day: number;
  goal_alignment: GoalAlignment | null;
}

interface DailyBreakdownCardProps {
  menuId: string;
}

const GOAL_STATUS_CONFIG = {
  on_track: { color: "#10b981", bg: "#10b98120", icon: CheckCircle, label: "On Track" },
  over: { color: "#ef4444", bg: "#ef444420", icon: AlertCircle, label: "Over Goal" },
  under: { color: "#f59e0b", bg: "#f59e0b20", icon: TrendingDown, label: "Under Goal" },
};

const MacroPill = ({
  icon: Icon,
  value,
  label,
  color,
  bg,
}: {
  icon: any;
  value: string;
  label: string;
  color: string;
  bg: string;
}) => (
  <View style={[pillStyles.pill, { backgroundColor: bg }]}>
    <Icon size={12} color={color} />
    <Text style={[pillStyles.value, { color }]}>{value}</Text>
    <Text style={[pillStyles.label, { color }]}>{label}</Text>
  </View>
);

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    marginRight: 6,
  },
  value: { fontSize: 12, fontWeight: "700" },
  label: { fontSize: 11, fontWeight: "500", opacity: 0.8 },
});

export const DailyBreakdownCard: React.FC<DailyBreakdownCardProps> = ({ menuId }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [data, setData] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);

  const fetchBreakdown = useCallback(async () => {
    try {
      const response = await api.get(`/recommended-menus/${menuId}/daily-breakdown`);
      if (response.data.success) {
        setData(response.data.data);
        setSelectedDay(1);
      }
    } catch {
      // Silently fail — this is an enhancement, not critical
    } finally {
      setLoading(false);
    }
  }, [menuId]);

  useEffect(() => {
    fetchBreakdown();
  }, [fetchBreakdown]);

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="small" color={colors.warmOrange} />
      </View>
    );
  }

  if (!data || data.days.length === 0) return null;

  const activeDay = data.days.find((d) => d.day === selectedDay) ?? data.days[0];
  const goalConfig = data.goal_alignment
    ? GOAL_STATUS_CONFIG[data.goal_alignment.status]
    : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Flame size={18} color={colors.warmOrange} />
          <Text style={[styles.title, { color: colors.text }]}>
            {t("menus.daily_breakdown", "Daily Breakdown")}
          </Text>
        </View>

        {/* Goal alignment badge */}
        {goalConfig && data.goal_alignment && (
          <View style={[styles.goalBadge, { backgroundColor: goalConfig.bg }]}>
            <goalConfig.icon size={13} color={goalConfig.color} />
            <Text style={[styles.goalBadgeText, { color: goalConfig.color }]}>
              {goalConfig.label}
            </Text>
          </View>
        )}
      </View>

      {/* Average calories row */}
      {data.goal_alignment && (
        <View style={[styles.avgRow, { backgroundColor: colors.surface }]}>
          <Target size={14} color={colors.icon} />
          <Text style={[styles.avgText, { color: colors.icon }]}>
            {t("menus.avg_daily", "Avg daily")}:{" "}
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {data.avg_calories_per_day} kcal
            </Text>
            {" "}/ target:{" "}
            <Text style={{ color: colors.warmOrange, fontWeight: "700" }}>
              {data.goal_alignment.target} kcal
            </Text>
          </Text>
        </View>
      )}

      {/* Day selector strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayScroll}
        contentContainerStyle={styles.dayScrollContent}
      >
        {data.days.map((day) => {
          const isSelected = day.day === selectedDay;
          const completedCount = day.meals.filter((m) => m.is_completed).length;
          const allDone = completedCount === day.meals.length && day.meals.length > 0;

          return (
            <TouchableOpacity
              key={day.day}
              onPress={() => setSelectedDay(day.day)}
              activeOpacity={0.7}
            >
              {isSelected ? (
                <LinearGradient
                  colors={[colors.warmOrange, "#D97706"]}
                  style={styles.dayChipSelected}
                >
                  <Text style={styles.dayChipLabelSelected}>
                    {t("menus.day_short", "D")}{day.day}
                  </Text>
                  <Text style={styles.dayChipCalSelected}>
                    {Math.round(day.calories)}
                  </Text>
                  {allDone && <CheckCircle size={12} color="#ffffff" />}
                </LinearGradient>
              ) : (
                <View style={[styles.dayChip, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.dayChipLabel, { color: colors.text }]}>
                    {t("menus.day_short", "D")}{day.day}
                  </Text>
                  <Text style={[styles.dayChipCal, { color: colors.icon }]}>
                    {Math.round(day.calories)}
                  </Text>
                  {allDone && <CheckCircle size={12} color="#10b981" />}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected day macros */}
      <View style={styles.macroRow}>
        <MacroPill
          icon={Flame}
          value={`${Math.round(activeDay.calories)}`}
          label="kcal"
          color="#f59e0b"
          bg="#fef3c7"
        />
        <MacroPill
          icon={TrendingUp}
          value={`${Math.round(activeDay.protein)}g`}
          label={t("nutrition.protein", "prot")}
          color="#10b981"
          bg="#dcfce7"
        />
        <MacroPill
          icon={Zap}
          value={`${Math.round(activeDay.carbs)}g`}
          label={t("nutrition.carbs", "carbs")}
          color="#6366f1"
          bg="#e0e7ff"
        />
        <MacroPill
          icon={Droplets}
          value={`${Math.round(activeDay.fat)}g`}
          label={t("nutrition.fat", "fat")}
          color="#ec4899"
          bg="#fce7f3"
        />
      </View>

      {/* Meals for selected day */}
      <View style={styles.mealsSection}>
        {activeDay.meals.map((meal) => (
          <View
            key={meal.meal_id}
            style={[styles.mealRow, { borderBottomColor: colors.border }]}
          >
            <View
              style={[
                styles.mealDot,
                {
                  backgroundColor: meal.is_completed ? "#10b981" : colors.border,
                },
              ]}
            />
            <View style={styles.mealInfo}>
              <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={1}>
                {meal.name}
              </Text>
              <Text style={[styles.mealType, { color: colors.icon }]}>
                {meal.meal_type} · {meal.calories} kcal
              </Text>
            </View>
            {meal.is_completed && <CheckCircle size={16} color="#10b981" />}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  goalBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  goalBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  avgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
  },
  avgText: {
    fontSize: 13,
    fontWeight: "500",
  },
  dayScroll: {
    marginBottom: 14,
  },
  dayScrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  dayChip: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    minWidth: 56,
    gap: 2,
  },
  dayChipSelected: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    minWidth: 56,
    gap: 2,
  },
  dayChipLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  dayChipLabelSelected: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },
  dayChipCal: {
    fontSize: 13,
    fontWeight: "800",
  },
  dayChipCalSelected: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  macroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  mealsSection: {
    gap: 2,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 14,
    fontWeight: "600",
  },
  mealType: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 1,
    textTransform: "capitalize",
  },
});

export default DailyBreakdownCard;
