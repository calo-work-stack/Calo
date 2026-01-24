import { useState, useEffect, useCallback } from "react";
import { nutritionAPI } from "@/src/services/api";

export interface MealsRemainingData {
  remaining: number;
  limit: number;
  used: number;
  canLogMandatory: boolean;
}

export function useMealsRemaining() {
  const [mealsRemaining, setMealsRemaining] = useState<MealsRemainingData>({
    remaining: 3,
    limit: 3,
    used: 0,
    canLogMandatory: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMealsRemaining = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await nutritionAPI.getMealsRemaining();
      setMealsRemaining(data);
    } catch (err) {
      console.error("Error fetching meals remaining:", err);
      setError("Failed to fetch meals remaining");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh the data
  const refresh = useCallback(() => {
    nutritionAPI.invalidateMealsRemainingCache();
    fetchMealsRemaining();
  }, [fetchMealsRemaining]);

  // Initial fetch
  useEffect(() => {
    fetchMealsRemaining();
  }, [fetchMealsRemaining]);

  return {
    ...mealsRemaining,
    isLoading,
    error,
    refresh,
  };
}
