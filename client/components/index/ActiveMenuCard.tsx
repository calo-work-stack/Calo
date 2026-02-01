import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
  ChefHat,
  ChevronRight,
  Calendar,
  Flame,
  Clock,
} from "lucide-react-native";
import { api } from "@/src/services/api";

const { width } = Dimensions.get("window");

interface ActivePlanData {
  plan_id: string;
  name: string;
  days_count: number;
  start_date: string;
  end_date: string;
  daily_calorie_target?: number;
}

const ActiveMenuCard = React.memo(() => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [activePlan, setActivePlan] = useState<ActivePlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadActivePlan = useCallback(async () => {
    try {
      const response = await api.get("/meal-plans/current");
      if (
        response.data.success &&
        response.data.hasActivePlan &&
        response.data.data
      ) {
        setActivePlan({
          plan_id: response.data.planId,
          name: response.data.planName || t("menus.active_plan"),
          days_count: response.data.data.days_count || 7,
          start_date: response.data.data.start_date,
          end_date: response.data.data.end_date,
          daily_calorie_target: response.data.data.daily_calorie_target,
        });
      } else {
        setActivePlan(null);
      }
    } catch (error) {
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

  // Calculate days remaining and current day
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

  // Return empty fragment instead of null to avoid hooks issues
  if (isLoading || !activePlan) {
    return <></>;
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
          colors={[colors.emerald500, colors.emerald600 || "#059669"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
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
  progressContainer: {
    marginTop: 14,
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
