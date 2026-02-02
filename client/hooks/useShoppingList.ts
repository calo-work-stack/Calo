import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { Alert } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";

interface ShoppingListItem {
  is_purchased: any;
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  added_from?: string;
  product_barcode?: string;
  estimated_cost?: number;
  // Metadata can include ingredient image
  metadata?: {
    ing_img?: string;
    [key: string]: any;
  };
}

export const useShoppingList = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);

  // Get shopping list - only fetch when authenticated
  const {
    data: shoppingList = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["shoppingList"],
    queryFn: async () => {
      // Don't fetch if not authenticated
      if (!isAuthenticated || !token) {
        console.log("📦 [ShoppingList Hook] Skipping fetch - not authenticated");
        return [];
      }

      try {
        console.log("📦 [ShoppingList Hook] Fetching shopping list...");
        const response = await api.get("/shopping-lists");
        console.log("✅ [ShoppingList Hook] Received response:", response.data);

        if (!response.data.success) {
          console.error(
            "❌ [ShoppingList Hook] API returned error:",
            response.data.error
          );
          throw new Error(
            response.data.error || "Failed to fetch shopping list"
          );
        }

        return response.data.data || [];
      } catch (error: any) {
        // Silently handle 401 errors (user logged out)
        if (error.response?.status === 401) {
          console.log("📦 [ShoppingList Hook] 401 - User not authenticated, returning empty list");
          return [];
        }
        console.error(
          "❌ [ShoppingList Hook] Error fetching shopping list:",
          error
        );
        console.error("❌ [ShoppingList Hook] Error details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        throw error;
      }
    },
    enabled: isAuthenticated && !!token, // Only run query when authenticated
    staleTime: 0, // Always consider data stale for immediate updates
    gcTime: 2 * 60 * 1000, // 2 minutes cache time
  });

  // Add single item
  const addItemMutation = useMutation({
    mutationFn: async (item: ShoppingListItem) => {
      console.log("🛒 [ShoppingList Hook] Adding item to shopping list:", item);
      const response = await api.post("/shopping-lists", item);
      console.log("✅ [ShoppingList Hook] Add item response:", response.data);

      if (!response.data.success) {
        console.error(
          "❌ [ShoppingList Hook] Add item failed:",
          response.data.error
        );
        throw new Error(response.data.error || "Failed to add item");
      }

      return response.data;
    },
    onMutate: async (newItem) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["shoppingList"] });

      // Snapshot previous value
      const previousList = queryClient.getQueryData<ShoppingListItem[]>([
        "shoppingList",
      ]);

      // Optimistically update the cache
      queryClient.setQueryData<ShoppingListItem[]>(
        ["shoppingList"],
        (old = []) => [
          ...old,
          { ...newItem, id: `temp-${Date.now()}`, is_purchased: false },
        ]
      );

      return { previousList };
    },
    onSuccess: (data) => {
      console.log("✅ [ShoppingList Hook] Item added successfully:", data);

      // Invalidate and refetch to get the latest data
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] });
      queryClient.refetchQueries({ queryKey: ["shoppingList"] });

      Alert.alert("Success", "Item added to shopping list!");
    },
    onError: (error: any, variables, context) => {
      console.error("❌ [ShoppingList Hook] Error adding item:", error);
      console.error("❌ [ShoppingList Hook] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Rollback optimistic update
      if (context?.previousList) {
        queryClient.setQueryData(["shoppingList"], context.previousList);
      }

      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to add item to shopping list";
      Alert.alert("Error", errorMessage);
    },
  });

  // Bulk add items
  const bulkAddMutation = useMutation({
    mutationFn: async (items: ShoppingListItem[]) => {
      console.log(
        "🛒 [ShoppingList Hook] Bulk adding items to shopping list:",
        items.length
      );
      const response = await api.post("/shopping-lists/bulk-add", { items });
      console.log("✅ [ShoppingList Hook] Bulk add response:", response.data);

      if (!response.data.success) {
        console.error(
          "❌ [ShoppingList Hook] Bulk add failed:",
          response.data.error
        );
        throw new Error(response.data.error || "Failed to bulk add items");
      }

      return response.data;
    },
    onMutate: async (newItems) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["shoppingList"] });

      // Snapshot previous value
      const previousList = queryClient.getQueryData<ShoppingListItem[]>([
        "shoppingList",
      ]);

      // Optimistically update the cache
      queryClient.setQueryData<ShoppingListItem[]>(
        ["shoppingList"],
        (old = []) => [
          ...old,
          ...newItems.map((item, index) => ({
            ...item,
            id: `temp-bulk-${Date.now()}-${index}`,
            is_purchased: false,
          })),
        ]
      );

      return { previousList };
    },
    onSuccess: (data) => {
      console.log("✅ [ShoppingList Hook] Bulk add completed:", data);

      // Invalidate and refetch to get the latest data
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] });
      queryClient.refetchQueries({ queryKey: ["shoppingList"] });

      Alert.alert(
        "Success",
        `${data.data?.total || 0} items added to shopping list!`
      );
    },
    onError: (error: any, variables, context) => {
      console.error("❌ [ShoppingList Hook] Error bulk adding items:", error);
      console.error("❌ [ShoppingList Hook] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Rollback optimistic update
      if (context?.previousList) {
        queryClient.setQueryData(["shoppingList"], context.previousList);
      }

      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to add items to shopping list";
      Alert.alert("Error", errorMessage);
    },
  });

  // Update item
  const updateItemMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<ShoppingListItem> & { id: string }) => {
      const response = await api.put(`/shopping-lists/${id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] });
      queryClient.refetchQueries({ queryKey: ["shoppingList"] });
    },
    onError: (error) => {
      console.error("❌ Error updating item:", error);
      Alert.alert("Error", "Failed to update item");
    },
  });

  // Delete item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/shopping-lists/${id}`);
      return response.data;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["shoppingList"] });

      const previousList = queryClient.getQueryData<ShoppingListItem[]>([
        "shoppingList",
      ]);

      queryClient.setQueryData<ShoppingListItem[]>(
        ["shoppingList"],
        (old = []) => old.filter((item) => item.id !== deletedId)
      );

      return { previousList };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] });
      Alert.alert("Success", "Item deleted from shopping list");
    },
    onError: (error, variables, context) => {
      console.error("❌ Error deleting item:", error);

      if (context?.previousList) {
        queryClient.setQueryData(["shoppingList"], context.previousList);
      }

      Alert.alert("Error", "Failed to delete item");
    },
  });

  // Toggle purchased status
  const togglePurchasedMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.put(`/shopping-lists/${id}/toggle`);
      return response.data;
    },
    onMutate: async (toggledId) => {
      await queryClient.cancelQueries({ queryKey: ["shoppingList"] });

      const previousList = queryClient.getQueryData<ShoppingListItem[]>([
        "shoppingList",
      ]);

      queryClient.setQueryData<ShoppingListItem[]>(
        ["shoppingList"],
        (old = []) =>
          old.map((item) =>
            item.id === toggledId
              ? { ...item, is_purchased: !item.is_purchased }
              : item
          )
      );

      return { previousList };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] });
    },
    onError: (error, variables, context) => {
      console.error("❌ Error toggling item:", error);

      if (context?.previousList) {
        queryClient.setQueryData(["shoppingList"], context.previousList);
      }

      Alert.alert("Error", "Failed to update item status");
    },
  });

  // Force refresh function
  const forceRefresh = async () => {
    try {
      console.log("🔄 Force refreshing shopping list...");
      await queryClient.cancelQueries({ queryKey: ["shoppingList"] });
      queryClient.removeQueries({ queryKey: ["shoppingList"] });
      await queryClient.refetchQueries({ queryKey: ["shoppingList"] });
      console.log("✅ Shopping list refreshed");
    } catch (error) {
      console.error("❌ Error refreshing shopping list:", error);
    }
  };

  return {
    shoppingList,
    isLoading,
    error,
    refetch,
    forceRefresh,
    addItem: addItemMutation.mutate,
    bulkAddItems: bulkAddMutation.mutate,
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    togglePurchased: togglePurchasedMutation.mutate,
    isAddingItem: addItemMutation.isPending,
    isBulkAdding: bulkAddMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
    isToggling: togglePurchasedMutation.isPending,
  };
};
