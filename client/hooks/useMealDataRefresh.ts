import React, { useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/src/store";
import { fetchMeals } from "@/src/store/mealSlice";
import { queryClient } from "@/src/services/queryClient";

// Debounce delay for refresh operations (prevent rapid-fire API calls)
const REFRESH_DEBOUNCE_MS = 500;

// Track if a refresh is already pending globally
let pendingRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
let isRefreshing = false;

export const useMealDataRefresh = () => {
  const dispatch = useDispatch<AppDispatch>();
  const lastRefreshTime = useRef<number>(0);

  // Debounced refresh to prevent excessive API calls
  const debouncedRefresh = useCallback((refreshFn: () => Promise<void>) => {
    // Clear any pending refresh
    if (pendingRefreshTimeout) {
      clearTimeout(pendingRefreshTimeout);
      pendingRefreshTimeout = null;
    }

    // If already refreshing, skip
    if (isRefreshing) {
      console.log("🔄 Refresh already in progress, skipping...");
      return;
    }

    // Debounce: wait before actually refreshing
    pendingRefreshTimeout = setTimeout(async () => {
      // Check if we refreshed very recently
      const now = Date.now();
      if (now - lastRefreshTime.current < REFRESH_DEBOUNCE_MS) {
        console.log("🔄 Skipping refresh - too recent");
        return;
      }

      isRefreshing = true;
      lastRefreshTime.current = now;

      try {
        await refreshFn();
      } finally {
        isRefreshing = false;
        pendingRefreshTimeout = null;
      }
    }, REFRESH_DEBOUNCE_MS);
  }, []);

  // NOTE: Removed automatic mutation success handler - let individual mutations
  // handle their own cache invalidation to avoid excessive API calls

  const invalidateAllMealQueries = useCallback(async () => {
    console.log("🔄 Invalidating all meal-related queries...");

    // Just invalidate - don't remove. React Query will refetch on next access
    // This is much more efficient than removing + refetching
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["meals"] }),
      queryClient.invalidateQueries({ queryKey: ["dailyStats"] }),
      queryClient.invalidateQueries({ queryKey: ["statistics"] }),
      queryClient.invalidateQueries({ queryKey: ["recent-meals"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar"] }),
      queryClient.invalidateQueries({ queryKey: ["globalStats"] }),
    ]);

    console.log("✅ All meal queries invalidated");
  }, []);

  const refreshAllMealData = useCallback(async () => {
    debouncedRefresh(async () => {
      try {
        console.log("🔄 Starting comprehensive data refresh...");

        // First invalidate all queries
        await invalidateAllMealQueries();

        // Refresh Redux store (this is the main API call)
        await dispatch(fetchMeals()).unwrap();

        // Only refetch ACTIVE queries (ones currently being observed by components)
        // This prevents unnecessary API calls for data not currently visible
        await queryClient.refetchQueries({
          queryKey: ["meals"],
          type: "active",
        });

        console.log("✅ Meal data refreshed successfully");
      } catch (error) {
        console.error("❌ Error refreshing meal data:", error);
        // Don't throw - let the app continue
      }
    });
  }, [dispatch, invalidateAllMealQueries, debouncedRefresh]);

  const refreshMealData = useCallback(async () => {
    debouncedRefresh(async () => {
      try {
        console.log("🔄 Refreshing meal data...");

        // Invalidate meal queries (will refetch on next access)
        await queryClient.invalidateQueries({ queryKey: ["meals"] });
        await queryClient.invalidateQueries({ queryKey: ["dailyStats"] });

        // Refresh Redux store (single API call)
        await dispatch(fetchMeals()).unwrap();

        // Only refetch active queries
        await queryClient.refetchQueries({
          queryKey: ["meals"],
          type: "active",
        });

        console.log("✅ Meal data refreshed successfully");
      } catch (error) {
        console.error("❌ Error refreshing meal data:", error);
        // Don't throw - let the app continue
      }
    });
  }, [dispatch, debouncedRefresh]);

  // Immediate refresh function for post-operation updates
  // Now debounced to prevent excessive API calls
  const immediateRefresh = useCallback(async () => {
    debouncedRefresh(async () => {
      try {
        console.log("⚡ Immediate meal data refresh...");

        // Only invalidate - React Query will refetch when needed (on next access)
        // This prevents unnecessary API calls for data not currently visible
        await queryClient.invalidateQueries({ queryKey: ["meals"] });
        await queryClient.invalidateQueries({ queryKey: ["dailyStats"] });

        // Dispatch Redux update for meals (single API call)
        await dispatch(fetchMeals()).unwrap();

        // Only refetch meals (most critical data) - others will refetch on demand
        await queryClient.refetchQueries({
          queryKey: ["meals"],
          type: "active" // Only refetch if there's an active observer
        });

        console.log("⚡ Immediate refresh completed successfully");
      } catch (error) {
        console.error("❌ Error in immediate refresh:", error);
        // Don't throw - let the app continue
      }
    });
  }, [dispatch, debouncedRefresh]);

  return {
    refreshAllMealData,
    refreshMealData,
    immediateRefresh,
    invalidateAllMealQueries,
  };
};
