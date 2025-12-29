import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./useQueries";

/**
 * ✅ FIXED: Optimized background refresh hook
 * 
 * This now only refetches data that is:
 * 1. Currently being used (active)
 * 2. Actually stale (past staleTime)
 * 
 * With staleTime set to 2 minutes in queryClient, this won't cause
 * unnecessary refetches like before when staleTime was 0
 */
export function useBackgroundRefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refetchStaleData = () => {
      const today = new Date().toISOString().split("T")[0];
      
      console.log("🔄 Background refresh: checking for stale data...");

      // ✅ FIXED: Only refetch active queries that are stale
      // type: "active" = only refetch queries currently in use
      // stale: true = only if past staleTime (2 minutes)
      queryClient.refetchQueries({
        queryKey: queryKeys.meals,
        type: "active",
        stale: true,
      });

      queryClient.refetchQueries({
        queryKey: queryKeys.dailyStats(today),
        type: "active", 
        stale: true,
      });

      // ✅ OPTIONAL: Add statistics if needed
      // Only include queries that benefit from background refresh
      queryClient.refetchQueries({
        queryKey: ["statistics"],
        type: "active",
        stale: true,
      });
    };

    // ✅ IMPROVED: Increased interval to 5 minutes
    // This matches well with 2-minute staleTime:
    // - Data becomes stale after 2 minutes
    // - Background check runs every 5 minutes
    // - Provides good balance between freshness and performance
    const intervalId = setInterval(refetchStaleData, 5 * 60 * 1000);

    // Run once on mount to refresh any stale data immediately
    refetchStaleData();

    return () => {
      clearInterval(intervalId);
    };
  }, [queryClient]);
}

/**
 * ✅ HOW IT WORKS NOW:
 * 
 * Before (Slow):
 * - staleTime: 0 = everything always stale
 * - Refetched active queries every 5 minutes regardless
 * - Every refetch triggered mutation handlers
 * - Caused constant network activity
 * 
 * After (Fast):
 * - staleTime: 2 minutes = data stays fresh
 * - Only refetches if data is older than 2 minutes
 * - Only refetches queries currently being used
 * - Much less network activity
 * 
 * Example timeline:
 * 0:00 - User views meals page, data fetched
 * 0:30 - User navigates away
 * 2:00 - Data becomes stale (but not refetched - page not active)
 * 2:30 - User returns to meals page, data refetches automatically
 * 5:00 - Background check runs, refetches if user still on page
 * 
 * This provides fresh data when needed without constant fetching!
 */