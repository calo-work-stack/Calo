import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { Check, Clock } from "lucide-react-native";
import { api } from "@/src/services/api";
import { useActiveMealTime } from "@/hooks/menu/useActiveMealTime";
import { NutritionPills } from "@/components/menu/shared/NutritionPills";
import { MealTypeIcon, useMealTypeConfig } from "@/components/menu/shared/MealTypeIcon";
import { MealCompletionFlow } from "@/components/menu/MealCompletionFlow";

interface ActiveMealData {
  meal_id: string;
  name: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients?: any[];
  day_number?: number;
}

const ActiveMealCard = React.memo(() => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { getMealTypeConfig } = useMealTypeConfig();

  const [menuId, setMenuId] = useState<string | null>(null);
  const [todayMeals, setTodayMeals] = useState<ActiveMealData[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [showCompletion, setShowCompletion] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<ActiveMealData | null>(null);

  const { currentMeal, currentMealType, nextMeal, minutesUntilNext } = useActiveMealTime(todayMeals, completedIds);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get("/meal-plans/current");
      if (!res.data.success || !res.data.hasActivePlan) {
        setMenuId(null);
        setTodayMeals([]);
        return;
      }

      const planId = res.data.planId || res.data.menuId;
      setMenuId(planId);

      const todayRes = await api.get(`/recommended-menus/${planId}/today-meals`);
      if (todayRes.data.success) {
        const meals = todayRes.data.meals || [];
        setTodayMeals(
          meals.map((m: any) => ({
            meal_id: m.meal_id,
            name: m.name,
            meal_type: m.meal_type,
            calories: m.calories,
            protein: m.protein_g || m.protein,
            carbs: m.carbs_g || m.carbs,
            fat: m.fat_g || m.fat,
            ingredients: m.ingredients,
            day_number: m.day_number,
          }))
        );
        const completed = new Set<string>(
          meals.filter((m: any) => m.is_completed).map((m: any) => m.meal_id)
        );
        setCompletedIds(completed);
      }
    } catch {
      // silently fail
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleMarkDone = (meal: ActiveMealData) => {
    setSelectedMeal(meal);
    setShowCompletion(true);
  };

  const handleComplete = (mealId: string) => {
    setCompletedIds((prev) => new Set([...prev, mealId]));
  };

  const mealToShow = currentMeal || nextMeal;

  if (!menuId || !mealToShow) {
    return <></>;
  }

  const config = getMealTypeConfig(mealToShow.meal_type);
  const isCurrent = !!currentMeal && mealToShow.meal_id === currentMeal.meal_id;

  return (
    <>
      <View style={styles.container}>
        <Pressable
          onPress={() => handleMarkDone(mealToShow)}
          style={[styles.card, { backgroundColor: colors.warmSurface, borderColor: colors.warmBorder }]}
        >
          <View style={styles.topRow}>
            <View style={[styles.typeBadge, { backgroundColor: config.color + "18" }]}>
              <MealTypeIcon mealType={mealToShow.meal_type} size={18} />
              <Text style={[styles.typeLabel, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
            {isCurrent ? (
              <View style={[styles.timeBadge, { backgroundColor: colors.warmOrange + "18" }]}>
                <Text style={[styles.timeText, { color: colors.warmOrange }]}>
                  {t("active_meal.its_time", "It's {{type}} time!", { type: config.label.toLowerCase() })}
                </Text>
              </View>
            ) : minutesUntilNext != null && minutesUntilNext > 0 ? (
              <View style={[styles.timeBadge, { backgroundColor: colors.textSecondary + "15" }]}>
                <Clock size={12} color={colors.textSecondary} />
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                  {t("active_meal.starts_in", "Starts in {{mins}}m", { mins: minutesUntilNext })}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={1}>
            {mealToShow.name}
          </Text>

          <View style={styles.nutritionRow}>
            <NutritionPills
              calories={mealToShow.calories}
              protein={mealToShow.protein}
              carbs={mealToShow.carbs}
              fat={mealToShow.fat}
              compact
            />
          </View>

          <Pressable
            onPress={() => handleMarkDone(mealToShow)}
            style={styles.doneButtonWrapper}
          >
            <LinearGradient
              colors={[colors.warmOrange, "#D97706"]}
              style={styles.doneButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.doneButtonText}>
                {t("active_meal.mark_done", "Mark as Done")}
              </Text>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </View>

      <MealCompletionFlow
        visible={showCompletion}
        meal={selectedMeal ? { ...selectedMeal, menu_id: menuId } : null}
        menuId={menuId}
        onClose={() => {
          setShowCompletion(false);
          setSelectedMeal(null);
        }}
        onComplete={handleComplete}
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  mealName: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  nutritionRow: {
    marginBottom: 14,
  },
  doneButtonWrapper: {
    overflow: "hidden",
    borderRadius: 14,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});

export default ActiveMealCard;
