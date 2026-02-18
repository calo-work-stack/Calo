import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
  ChefHat,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
  Utensils,
} from "lucide-react-native";
import { api } from "@/src/services/api";

interface ActivePlanData {
  plan_id: string;
  name: string;
  days_count: number;
  start_date: string;
  end_date: string;
  daily_calorie_target?: number;
}

interface TodayMealsData {
  total: number;
  completed: number;
  nextMealName?: string;
}

const ActiveMenuCard = React.memo(() => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [activePlan, setActivePlan] = useState<ActivePlanData | null>(null);
  const [todayMeals, setTodayMeals] = useState<TodayMealsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadActivePlan = useCallback(async () => {
    try {
      const response = await api.get("/meal-plans/current");
      if (response.data.success && response.data.hasActivePlan) {
        const data = response.data.data || {};
        const planId = response.data.planId || response.data.menuId;

        setActivePlan({
          plan_id: planId,
          name: response.data.planName || t("menus.active_plan"),
          days_count: response.data.days_count || data.rotation_frequency_days || 7,
          start_date: response.data.start_date || data.start_date,
          end_date: response.data.end_date || data.end_date,
          daily_calorie_target: response.data.target_calories_daily || data.target_calories_daily,
        });

        // Fetch today's meals progress
        try {
          const todayRes = await api.get(`/recommended-menus/${planId}/today-meals`);
          if (todayRes.data.success && todayRes.data.data) {
            const todayData = todayRes.data.data;
            const meals = todayData.meals || [];
            const completed = todayData.completed_meals_today ?? meals.filter((m: any) => m.is_completed).length;
            const nextMeal = meals.find((m: any) => !m.is_completed);
            setTodayMeals({
              total: todayData.total_meals_today ?? meals.length,
              completed,
              nextMealName: nextMeal?.name,
            });
          }
        } catch {
          // today-meals endpoint may not exist yet, that's fine
        }
      } else {
        setActivePlan(null);
      }
    } catch {
      setActivePlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadActivePlan();
    }, [loadActivePlan])
  );

  const getDayInfo = useCallback(() => {
    if (!activePlan?.start_date || !activePlan?.end_date) {
      return { currentDay: 1, daysRemaining: 0, totalDays: 7 };
    }

    const start = new Date(activePlan.start_date);
    const end = new Date(activePlan.end_date);
    const today = new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const daysPassed = Math.floor(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    const currentDay = Math.max(1, Math.min(daysPassed + 1, totalDays));
    const daysRemaining = Math.max(0, totalDays - currentDay);

    return { currentDay, daysRemaining, totalDays };
  }, [activePlan]);

  const { currentDay, daysRemaining, totalDays } = getDayInfo();

  if (!activePlan && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.warmOrange + '20', borderRadius: 20, padding: 18 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.border, opacity: 0.3 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ width: '40%', height: 12, borderRadius: 6, backgroundColor: colors.border, opacity: 0.3 }} />
              <View style={{ width: '70%', height: 16, borderRadius: 8, backgroundColor: colors.border, opacity: 0.3 }} />
              <View style={{ width: '50%', height: 10, borderRadius: 5, backgroundColor: colors.border, opacity: 0.3 }} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          router.push(`/menu/activeMenu?planId=${activePlan.plan_id}`)
        }
      >
        <LinearGradient
          colors={[colors.warmOrange, "#D97706"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Decorative circles */}
          <View style={styles.decoCircle1} />
          <View style={styles.decoCircle2} />

          <View style={styles.content}>
            <View style={styles.leftSection}>
              <View style={styles.iconContainer}>
                <ChefHat size={24} color="#ffffff" />
              </View>
              <View style={styles.textSection}>
                <Text style={styles.label}>
                  {t("home.active_menu", "Active Menu")}
                </Text>
                <Text style={styles.title} numberOfLines={1}>
                  {activePlan.name}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Calendar size={12} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.metaText}>
                      {t("menu.day_of", "Day {{current}} of {{total}}", {
                        current: currentDay,
                        total: totalDays,
                      })}
                    </Text>
                  </View>
                  {daysRemaining > 0 && (
                    <View style={styles.metaItem}>
                      <Clock size={12} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.metaText}>
                        {t("menu.days_remaining", "{{count}} days left", {
                          count: daysRemaining,
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.arrowContainer}>
              <ChevronRight size={24} color="#ffffff" />
            </View>
          </View>

          {/* Today's meals progress */}
          {todayMeals && (
            <View style={styles.todayProgress}>
              <View style={styles.todayRow}>
                <View style={styles.metaItem}>
                  <CheckCircle2 size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.todayText}>
                    {t("active_meal.meals_done", "{{done}} of {{total}} meals done", {
                      done: todayMeals.completed,
                      total: todayMeals.total,
                    })}
                  </Text>
                </View>
                {todayMeals.nextMealName && (
                  <View style={styles.metaItem}>
                    <Utensils size={12} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.nextMealText} numberOfLines={1}>
                      {t("active_meal.up_next", "Up next")}: {todayMeals.nextMealName}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentDay / totalDays) * 100}%` },
                ]}
              />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    overflow: "hidden",
  },
  decoCircle1: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  decoCircle2: {
    position: "absolute",
    bottom: -30,
    left: -10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textSection: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
  },
  arrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  todayProgress: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  todayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  todayText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
  },
  nextMealText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
    maxWidth: 140,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBg: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 2,
  },
});

export default ActiveMenuCard;
