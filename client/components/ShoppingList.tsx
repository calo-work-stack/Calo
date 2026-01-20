import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  X,
  Edit3,
  Save,
  Apple,
  Beef,
  Milk,
  Carrot,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { api, nutritionAPI } from "@/src/services/api";
import { useShoppingList } from "@/hooks/useShoppingList";

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  is_purchased: boolean;
  added_from?: string;
  estimated_cost?: number;
}

interface ShoppingListProps {
  visible: boolean;
  onClose: () => void;
  initialItems?: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
  }>;
}

const categoryIcons: { [key: string]: any } = {
  'Fruits': Apple,
  'Meat': Beef,
  'Dairy': Milk,
  'Vegetables': Carrot,
  'Manual': ShoppingCart,
  'From Meal': ShoppingCart,
};

const categoryColors: { [key: string]: string } = {
  'Fruits': '#EF4444',
  'Meat': '#8B5CF6',
  'Dairy': '#3B82F6',
  'Vegetables': '#10B981',
  'Manual': '#F59E0B',
  'From Meal': '#F59E0B',
};

export default function ShoppingList({
  visible,
  onClose,
  initialItems = [],
}: ShoppingListProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const handleModalClose = useCallback(() => {
    console.log("ShoppingList modal closing");
    onClose();
  }, [onClose]);

  const {
    shoppingList,
    isLoading,
    addItem,
    bulkAddItems,
    updateItem,
    deleteItem,
    togglePurchased,
    forceRefresh,
    isAddingItem,
    isBulkAdding,
    isUpdating,
    isDeleting,
    isToggling,
  } = useShoppingList();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 1,
    unit: "pieces",
    category: "Manual",
    estimated_cost: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible && initialItems.length > 0) {
      const itemsToAdd = initialItems.map((item) => ({
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || "pieces",
        category: item.category || "From Meal",
        added_from: "meal",
        estimated_cost: 0,
      }));

      if (itemsToAdd.length === 1) {
        addItem(itemsToAdd[0]);
      } else {
        bulkAddItems(itemsToAdd);
      }
    }
  }, [visible, initialItems]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await forceRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) {
      Alert.alert("Error", "Item name is required");
      return;
    }

    addItem({
      ...newItem,
      name: newItem.name.trim(),
      added_from: "manual",
      is_purchased: undefined,
    });

    setNewItem({
      name: "",
      quantity: 1,
      unit: "pieces",
      category: "Manual",
      estimated_cost: 0,
    });
    setShowAddModal(false);
  };

  const handleUpdateItem = () => {
    if (!editingItem || !editingItem.name.trim()) {
      Alert.alert("Error", "Item name is required");
      return;
    }

    updateItem({
      id: editingItem.id,
      name: editingItem.name.trim(),
      quantity: editingItem.quantity,
      unit: editingItem.unit,
      category: editingItem.category,
      estimated_cost: editingItem.estimated_cost || 0,
    });

    setEditingItem(null);
  };

  const handleTogglePurchased = (id: string) => {
    togglePurchased(id);
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteItem(id),
      },
    ]);
  };

  const renderItem = (item: ShoppingListItem) => {
    const IconComponent = categoryIcons[item.category || 'Manual'] || ShoppingCart;
    const categoryColor = categoryColors[item.category || 'Manual'] || colors.emerald500;

    return (
      <View
        key={item.id}
        style={[
          styles.listItem,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: item.is_purchased ? 0.6 : 1,
          },
        ]}
      >
        {/* Category Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: categoryColor + '15' }
          ]}
        >
          <IconComponent size={24} color={categoryColor} strokeWidth={2} />
        </View>

        {/* Item Content */}
        <View style={styles.itemContent}>
          {editingItem?.id === item.id ? (
            <View style={styles.editForm}>
              <TextInput
                style={[
                  styles.editInput,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={editingItem.name}
                onChangeText={(text) =>
                  setEditingItem({ ...editingItem, name: text })
                }
                placeholder="Item name"
                placeholderTextColor={colors.icon}
              />
              <View style={styles.quantityRow}>
                <TextInput
                  style={[
                    styles.quantityInput,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={String(editingItem.quantity)}
                  onChangeText={(text) =>
                    setEditingItem({
                      ...editingItem,
                      quantity: parseFloat(text) || 1,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.icon}
                />
                <TextInput
                  style={[
                    styles.unitInput,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={editingItem.unit}
                  onChangeText={(text) =>
                    setEditingItem({ ...editingItem, unit: text })
                  }
                  placeholder="unit"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>
          ) : (
            <View>
              <Text
                style={[
                  styles.itemName,
                  {
                    color: colors.text,
                    textDecorationLine: item.is_purchased
                      ? "line-through"
                      : "none",
                  },
                ]}
              >
                {item.name}
              </Text>
              <Text style={[styles.itemDetails, { color: colors.icon }]}>
                {item.quantity} {item.unit}
              </Text>
            </View>
          )}
        </View>

        {/* Checkbox */}
        {editingItem?.id === item.id ? (
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.emerald500 },
              ]}
              onPress={handleUpdateItem}
            >
              <Save size={16} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => setEditingItem(null)}
            >
              <X size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.checkbox,
              {
                borderColor: item.is_purchased ? colors.emerald500 : colors.border,
                backgroundColor: item.is_purchased
                  ? colors.emerald500
                  : "transparent",
              },
            ]}
            onPress={() => handleTogglePurchased(item.id)}
          >
            {item.is_purchased && <Check size={16} color="#ffffff" strokeWidth={3} />}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const unpurchasedCount = shoppingList.filter((item: { is_purchased: any }) => !item.is_purchased).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleModalClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor: colors.background }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Grocery List
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {unpurchasedCount} items left to buy
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleModalClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <X size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.emerald500]}
                tintColor={colors.emerald500}
              />
            }
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.emerald500} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Loading shopping list...
                </Text>
              </View>
            ) : shoppingList.length === 0 ? (
              <View style={styles.emptyState}>
                <ShoppingCart size={64} color={colors.icon} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Your shopping list is empty
                </Text>
                <Text style={[styles.emptyText, { color: colors.icon }]}>
                  Add ingredients from menus or manually
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {shoppingList.map(renderItem)}
              </View>
            )}

            {/* Add Item Form */}
            {showAddModal && (
              <View
                style={[
                  styles.addForm,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.addFormTitle, { color: colors.text }]}>
                  Add New Item
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={newItem.name}
                  onChangeText={(text) =>
                    setNewItem({ ...newItem, name: text })
                  }
                  placeholder="Item name"
                  placeholderTextColor={colors.icon}
                />
                <View style={styles.quantityRow}>
                  <TextInput
                    style={[
                      styles.quantityInput,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={String(newItem.quantity)}
                    onChangeText={(text) =>
                      setNewItem({
                        ...newItem,
                        quantity: parseFloat(text) || 1,
                      })
                    }
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={colors.icon}
                  />
                  <TextInput
                    style={[
                      styles.unitInput,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={newItem.unit}
                    onChangeText={(text) =>
                      setNewItem({ ...newItem, unit: text })
                    }
                    placeholder="pieces"
                    placeholderTextColor={colors.icon}
                  />
                </View>
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[
                      styles.formButton,
                      { backgroundColor: colors.emerald500 },
                    ]}
                    onPress={handleAddItem}
                    disabled={isAddingItem}
                  >
                    {isAddingItem ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Plus size={16} color="#ffffff" />
                    )}
                    <Text style={styles.formButtonText}>Add Item</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.formButton,
                      { backgroundColor: colors.surface },
                    ]}
                    onPress={() => setShowAddModal(false)}
                  >
                    <Text
                      style={[styles.formButtonText, { color: colors.text }]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Floating Add Button */}
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: colors.emerald500 }]}
            onPress={() => setShowAddModal(!showAddModal)}
            activeOpacity={0.9}
          >
            <Plus size={28} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  itemsList: {
    gap: 12,
    paddingBottom: 100,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 13,
    fontWeight: "500",
  },
  itemActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  editForm: {
    gap: 8,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  quantityRow: {
    flexDirection: "row",
    gap: 8,
  },
  quantityInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  unitInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  addForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    gap: 12,
    marginBottom: 100,
  },
  addFormTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  formButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  formButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  floatingButton: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});