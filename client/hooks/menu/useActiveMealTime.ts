import { useState, useEffect, useMemo, useCallback } from "react";

export type MealTimeType =
  | "BREAKFAST"
  | "MORNING_SNACK"
  | "LUNCH"
  | "AFTERNOON_SNACK"
  | "DINNER"
  | "SNACK";

interface MealTimeWindow {
  type: MealTimeType;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

const MEAL_TIME_WINDOWS: MealTimeWindow[] = [
  { type: "BREAKFAST", startHour: 6, startMinute: 0, endHour: 10, endMinute: 30 },
  { type: "MORNING_SNACK", startHour: 10, startMinute: 30, endHour: 12, endMinute: 0 },
  { type: "LUNCH", startHour: 12, startMinute: 0, endHour: 14, endMinute: 30 },
  { type: "AFTERNOON_SNACK", startHour: 14, startMinute: 30, endHour: 17, endMinute: 0 },
  { type: "DINNER", startHour: 17, startMinute: 0, endHour: 21, endMinute: 0 },
  { type: "SNACK", startHour: 21, startMinute: 0, endHour: 6, endMinute: 0 },
];

function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function windowToMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function getCurrentMealTimeType(): MealTimeType {
  const currentMin = getCurrentMinutes();

  for (const window of MEAL_TIME_WINDOWS) {
    const start = windowToMinutes(window.startHour, window.startMinute);
    const end = windowToMinutes(window.endHour, window.endMinute);

    if (window.type === "SNACK") {
      // Night snack wraps around midnight: 21:00-6:00
      if (currentMin >= start || currentMin < end) {
        return window.type;
      }
    } else {
      if (currentMin >= start && currentMin < end) {
        return window.type;
      }
    }
  }

  return "SNACK"; // fallback
}

function getNextMealWindow(currentType: MealTimeType): MealTimeWindow | null {
  const idx = MEAL_TIME_WINDOWS.findIndex((w) => w.type === currentType);
  if (idx === -1) return null;
  const nextIdx = (idx + 1) % MEAL_TIME_WINDOWS.length;
  return MEAL_TIME_WINDOWS[nextIdx];
}

function getMinutesUntilNext(nextWindow: MealTimeWindow): number {
  const currentMin = getCurrentMinutes();
  const nextStart = windowToMinutes(nextWindow.startHour, nextWindow.startMinute);

  if (nextStart > currentMin) {
    return nextStart - currentMin;
  }
  // Wraps around midnight
  return 24 * 60 - currentMin + nextStart;
}

export interface ActiveMealTimeResult {
  currentMealType: MealTimeType;
  currentMeal: any | null;
  nextMeal: any | null;
  nextMealTime: string;
  minutesUntilNext: number;
  completedMealsToday: string[];
}

interface Meal {
  meal_id: string;
  meal_type: string;
  name: string;
  [key: string]: any;
}

export function useActiveMealTime(
  todayMeals: Meal[] = [],
  completedMealIds: string[] = []
) {
  const [currentMealType, setCurrentMealType] = useState<MealTimeType>(
    getCurrentMealTimeType()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMealType(getCurrentMealTimeType());
    }, 60000); // Re-evaluate every minute

    return () => clearInterval(interval);
  }, []);

  const result = useMemo((): ActiveMealTimeResult => {
    // Find the current meal from today's meals
    const currentMeal =
      todayMeals.find(
        (m) =>
          m.meal_type.toUpperCase() === currentMealType &&
          !completedMealIds.includes(m.meal_id)
      ) || null;

    // Find next meal
    const nextWindow = getNextMealWindow(currentMealType);
    const nextMeal = nextWindow
      ? todayMeals.find(
          (m) =>
            m.meal_type.toUpperCase() === nextWindow.type &&
            !completedMealIds.includes(m.meal_id)
        ) || null
      : null;

    const minutesUntilNext = nextWindow
      ? getMinutesUntilNext(nextWindow)
      : 0;

    // Format time until next
    let nextMealTime = "";
    if (minutesUntilNext > 0) {
      const hours = Math.floor(minutesUntilNext / 60);
      const mins = minutesUntilNext % 60;
      if (hours > 0) {
        nextMealTime = `${hours}h ${mins}m`;
      } else {
        nextMealTime = `${mins}m`;
      }
    }

    return {
      currentMealType,
      currentMeal,
      nextMeal,
      nextMealTime,
      minutesUntilNext,
      completedMealsToday: completedMealIds,
    };
  }, [currentMealType, todayMeals, completedMealIds]);

  return result;
}
