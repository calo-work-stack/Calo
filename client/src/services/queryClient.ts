import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";

// Error handler for queries
const queryErrorHandler = (error: unknown, query: any) => {
  console.warn("Query error:", {
    queryKey: query.queryKey,
    error: error instanceof Error ? error.message : "Unknown error",
  });
};

// Error handler for mutations
const mutationErrorHandler = (
  error: unknown,
  variables: any,
  context: any,
  mutation: any
) => {
  console.warn("Mutation error:", {
    mutationKey: mutation.options.mutationKey,
    error: error instanceof Error ? error.message : "Unknown error",
  });
};

// Create query cache with error handling
const queryCache = new QueryCache({
  onError: queryErrorHandler,
});

// Create mutation cache with error handling
const mutationCache = new MutationCache({
  onError: mutationErrorHandler,
});

// Create QueryClient instance
const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // ✅ FIXED: Balanced cache configuration for performance
      // Data stays "fresh" for 2 minutes - prevents unnecessary refetches
      staleTime: 2 * 60 * 1000, // 2 minutes (was 0 - causing constant refetches!)

      // Keep unused data in cache for 5 minutes before garbage collection
      gcTime: 5 * 60 * 1000, // 5 minutes (was 2 minutes)

      // ✅ FIXED: Smart refetch behavior
      // Only refetch on window focus if data is actually stale
      refetchOnWindowFocus: true, // Will respect staleTime

      // Only refetch on mount if data is stale (not "always")
      refetchOnMount: true, // Was "always" - caused refetch even with fresh data!

      // Refetch when connection is restored
      refetchOnReconnect: true, // Was "always"

      // No automatic background polling
      refetchInterval: false,

      // Performance optimizations
      structuralSharing: true,

      // Network mode - handle offline scenarios
      networkMode: "online",
    },
    mutations: {
      retry: 1,
      networkMode: "online",

      // ✅ REMOVED: Global mutation onSuccess handler
      // This was causing massive over-invalidation on EVERY mutation
      // Individual mutations should handle their own invalidations
      // for better control and performance
    },
  },
});

// Function to clear all queries - needed for auth signout
export const clearAllQueries = () => {
  console.log("🗑️ Clearing all TanStack Query cache...");
  queryClient.clear();
  console.log("✅ TanStack Query cache cleared");
};

// Additional utility functions for cache management
export const invalidateAllQueries = () => {
  console.log("♻️ Invalidating all queries...");
  return queryClient.invalidateQueries();
};

export const removeAllQueries = () => {
  console.log("🗑️ Removing all queries...");
  queryClient.removeQueries();
};

export const resetQueryClient = () => {
  console.log("🔄 Resetting query client...");
  queryClient.clear();
  queryClient.resetQueries();
};

export { queryClient };
export default queryClient;
