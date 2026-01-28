import { useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/src/store";
import { useMemo } from "react";

// Create stable selectors that won't cause unnecessary re-renders
export const selectUser = createSelector(
  [(state: RootState) => state.auth.user],
  (user) => user
);

export const selectAuthStatus = createSelector(
  [(state: RootState) => state.auth.isAuthenticated],
  (isAuthenticated) => isAuthenticated
);

export const selectMealState = createSelector(
  [(state: RootState) => state.meal],
  (meal) => ({
    meals: meal.meals,
    isLoading: meal.isLoading,
    error: meal.error,
  })
);

// Optimized hook that uses memoized selectors
export const useOptimizedSelector = <T>(
  selector: (state: RootState) => T,
  equalityFn: (left: T, right: T) => boolean = shallowEqual
) => {
  const memoizedSelector = useMemo(() => selector, []);
  return useSelector(memoizedSelector, equalityFn);
};

// User-specific selectors with proper memoization
export const useUserSelector = () => {
  return useSelector(selectUser, (left, right) => {
    if (!left && !right) return true;
    if (!left || !right) return false;
    return (
      left.user_id === right.user_id &&
      left.email_verified === right.email_verified &&
      left.subscription_type === right.subscription_type &&
      left.is_questionnaire_completed === right.is_questionnaire_completed
    );
  });
};

export const useAuthStatusSelector = () => {
  return useSelector(selectAuthStatus);
};

export const useMealSelector = () => {
  return useSelector(selectMealState, shallowEqual);
};

// Recent meals selector with proper memoization
export const useRecentMealsSelector = (limit: number = 5) => {
  const selector = useMemo(
    () =>
      createSelector([(state: RootState) => state.meal.meals], (meals) => {
        if (!meals || meals.length === 0) return [];
        return meals
          .slice()
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, limit);
      }),
    [limit]
  );

  return useSelector(selector, shallowEqual);
};

// Today's meals selector with proper memoization
export const useTodayMealsSelector = () => {
  const selector = useMemo(
    () =>
      createSelector([(state: RootState) => state.meal.meals], (meals) => {
        if (!meals || meals.length === 0) return [];
        const today = new Date().toISOString().split("T")[0];
        return meals.filter((meal) => meal.created_at.startsWith(today));
      }),
    []
  );

  return useSelector(selector, shallowEqual);
};

// Meal stats selector with proper memoization
export const useMealStatsSelector = () => {
  const selector = useMemo(
    () =>
      createSelector([(state: RootState) => state.meal.meals], (meals) => {
        if (!meals || meals.length === 0) {
          return { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 };
        }

        const today = new Date().toISOString().split("T")[0];
        const todayMeals = meals.filter((meal) =>
          meal.created_at.startsWith(today)
        );

        // FIX: Check _g fields FIRST since API returns protein_g, carbs_g, fats_g
        return todayMeals.reduce(
          (acc, meal) => ({
            calories: acc.calories + (Number(meal.calories) || 0),
            protein: acc.protein + (Number(meal.protein_g) || Number(meal.protein) || 0),
            carbs: acc.carbs + (Number(meal.carbs_g) || Number(meal.carbs) || 0),
            fat: acc.fat + (Number(meal.fats_g) || Number(meal.fat) || 0),
            mealCount: acc.mealCount + 1,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 }
        );
      }),
    []
  );

  return useSelector(selector, shallowEqual);
};
