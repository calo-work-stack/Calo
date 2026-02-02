import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
} from "react-native";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  X,
  Flame,
  Dumbbell,
  Package,
  Sparkles,
  TrendingUp,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useShoppingList } from "@/hooks/useShoppingList";
import { SmartShoppingItemModal } from "@/components/shopping/SmartShoppingItemModal";

const { width: screenWidth } = Dimensions.get("window");

interface ShoppingListItemData {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  is_purchased: boolean;
  added_from?: string;
  estimated_cost?: number;
  metadata?: {
    ing_img?: string;
    ing_emoji?: string;
    ing_color?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    [key: string]: any;
  };
}

interface ShoppingListProps {
  visible: boolean;
  onClose: () => void;
  initialItems?: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    metadata?: any;
  }>;
}

// Emoji mapping for quick ingredient visualization
const getIngredientEmoji = (name: string, metadata?: any): string => {
  if (metadata?.ing_emoji) return metadata.ing_emoji;

  const lowerName = name.toLowerCase();
  const emojiMap: { [key: string]: string } = {
    chicken: "🍗", beef: "🥩", fish: "🐟", salmon: "🍣", egg: "🥚", turkey: "🦃",
    milk: "🥛", cheese: "🧀", yogurt: "🥛", butter: "🧈", cream: "🥛",
    bread: "🍞", rice: "🍚", pasta: "🍝", oats: "🌾", flour: "🌾", noodle: "🍜",
    apple: "🍎", banana: "🍌", orange: "🍊", tomato: "🍅", lemon: "🍋", grape: "🍇",
    carrot: "🥕", broccoli: "🥦", lettuce: "🥬", onion: "🧅", spinach: "🥬",
    potato: "🥔", garlic: "🧄", pepper: "🌶️", cucumber: "🥒", avocado: "🥑",
    salt: "🧂", sugar: "🍬", honey: "🍯", oil: "🫒", olive: "🫒",
    coffee: "☕", tea: "🍵", juice: "🧃", water: "💧", wine: "🍷",
    chocolate: "🍫", nuts: "🥜", peanut: "🥜", almond: "🥜", walnut: "🥜",
    shrimp: "🦐", crab: "🦀", lobster: "🦞", meat: "🥩", pork: "🥓",
    corn: "🌽", mushroom: "🍄", eggplant: "🍆", bean: "🫘", pea: "🫛",
  };

  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lowerName.includes(key)) return emoji;
  }
  return "🛒";
};

// Color palette for ingredients
const getIngredientColor = (name: string, metadata?: any): string => {
  if (metadata?.ing_color) return metadata.ing_color;

  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
    "#FFEAA7", "#DDA0DD", "#98D8C8", "#F8B500",
    "#6C5CE7", "#FF7675", "#74B9FF", "#55EFC4"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Memoized Item Component for better performance
const ShoppingItem = React.memo(({
  item,
  colors,
  onToggle,
  onEdit,
  onDelete,
  isToggling
}: {
  item: ShoppingListItemData;
  colors: any;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isToggling: boolean;
}) => {
  const emoji = getIngredientEmoji(item.name, item.metadata);
  const bgColor = getIngredientColor(item.name, item.metadata);
  const hasNutrition = item.metadata?.calories || item.metadata?.protein;

  return (
    <Animated.View
      style={[
        styles.itemCard,
        {
          backgroundColor: colors.card,
          borderColor: item.is_purchased ? colors.success + "40" : colors.border,
          opacity: item.is_purchased ? 0.75 : 1,
        },
      ]}
    >
      {/* Checkbox */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          {
            borderColor: item.is_purchased ? colors.success : colors.border,
            backgroundColor: item.is_purchased ? colors.success : "transparent",
          },
        ]}
        onPress={onToggle}
        disabled={isToggling}
        activeOpacity={0.7}
      >
        {item.is_purchased && <Check size={14} color="#FFF" strokeWidth={3} />}
      </TouchableOpacity>

      {/* Emoji Badge */}
      <View style={[styles.emojiBadge, { backgroundColor: bgColor + "20" }]}>
        <Text style={styles.emojiText}>{emoji}</Text>
      </View>

      {/* Content */}
      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemName,
            {
              color: colors.text,
              textDecorationLine: item.is_purchased ? "line-through" : "none",
            },
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={[styles.itemQuantity, { color: colors.textSecondary }]}>
            {item.quantity} {item.unit}
          </Text>
          {hasNutrition && (
            <View style={styles.nutritionChips}>
              {item.metadata?.calories && (
                <View style={[styles.chip, { backgroundColor: "#FF6B6B15" }]}>
                  <Flame size={10} color="#FF6B6B" />
                  <Text style={[styles.chipText, { color: "#FF6B6B" }]}>
                    {Math.round(item.metadata.calories)}
                  </Text>
                </View>
              )}
              {item.metadata?.protein && (
                <View style={[styles.chip, { backgroundColor: "#6366F115" }]}>
                  <Dumbbell size={10} color="#6366F1" />
                  <Text style={[styles.chipText, { color: "#6366F1" }]}>
                    {Math.round(item.metadata.protein)}g
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.error + "12" }]}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

export default function ShoppingList({
  visible,
  onClose,
  initialItems = [],
}: ShoppingListProps) {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

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

  const [showSmartModal, setShowSmartModal] = useState(false);
  const [smartModalEditItem, setSmartModalEditItem] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Process initial items when opening
  useEffect(() => {
    if (visible && initialItems.length > 0) {
      const itemsToAdd = initialItems.map((item) => ({
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || "pieces",
        category: item.category || "From Meal",
        added_from: "meal",
        estimated_cost: 0,
        is_purchased: false,
        metadata: item.metadata,
      }));

      if (itemsToAdd.length === 1) {
        addItem(itemsToAdd[0]);
      } else {
        bulkAddItems(itemsToAdd);
      }
    }
  }, [visible, initialItems]);

  // Memoized lists for performance
  const { unpurchasedItems, purchasedItems, totalNutrition } = useMemo(() => {
    const unpurchased = shoppingList.filter((item: any) => !item.is_purchased);
    const purchased = shoppingList.filter((item: any) => item.is_purchased);

    // Calculate total nutrition for unpurchased items
    const nutrition = unpurchased.reduce((acc: any, item: any) => ({
      calories: acc.calories + (item.metadata?.calories || 0),
      protein: acc.protein + (item.metadata?.protein || 0),
    }), { calories: 0, protein: 0 });

    return { unpurchasedItems: unpurchased, purchasedItems: purchased, totalNutrition: nutrition };
  }, [shoppingList]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await forceRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [forceRefresh]);

  const handleSmartModalSave = useCallback((item: any) => {
    if (smartModalEditItem) {
      updateItem({
        id: smartModalEditItem.id,
        name: item.name.trim(),
        quantity: item.quantity,
        unit: item.unit,
        category: item.category || smartModalEditItem.category,
        estimated_cost: item.estimated_cost || 0,
        metadata: item.metadata,
      });
    } else {
      addItem({
        name: item.name.trim(),
        quantity: item.quantity,
        unit: item.unit,
        category: item.category || "Manual",
        added_from: "manual",
        estimated_cost: item.estimated_cost || 0,
        is_purchased: undefined,
        metadata: item.metadata,
      });
    }
    setSmartModalEditItem(null);
    setShowSmartModal(false);
  }, [smartModalEditItem, updateItem, addItem]);

  const handleOpenSmartModal = useCallback((item?: ShoppingListItemData) => {
    setSmartModalEditItem(item || null);
    setShowSmartModal(true);
  }, []);

  const handleTogglePurchased = useCallback((id: string) => {
    togglePurchased(id);
  }, [togglePurchased]);

  const handleDeleteItem = useCallback((id: string, name: string) => {
    Alert.alert(
      t("shopping.delete_confirm_title") || "Delete Item",
      `${t("shopping.delete_confirm_message") || "Remove"} "${name}"?`,
      [
        { text: t("common.cancel") || "Cancel", style: "cancel" },
        {
          text: t("common.delete") || "Delete",
          style: "destructive",
          onPress: () => deleteItem(id),
        },
      ]
    );
  }, [deleteItem, t]);

  const renderItem = useCallback((item: ShoppingListItemData) => (
    <ShoppingItem
      key={item.id}
      item={item}
      colors={colors}
      onToggle={() => handleTogglePurchased(item.id)}
      onEdit={() => handleOpenSmartModal(item)}
      onDelete={() => handleDeleteItem(item.id, item.name)}
      isToggling={isToggling}
    />
  ), [colors, handleTogglePurchased, handleOpenSmartModal, handleDeleteItem, isToggling]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {/* Header with Gradient */}
          <LinearGradient
            colors={isDark ? ["#1F2937", "#111827"] : ["#10B981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconBg}>
                  <ShoppingCart size={24} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>
                    {t("shopping.title") || "Shopping List"}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {unpurchasedItems.length} {t("shopping.items_remaining") || "items to buy"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                activeOpacity={0.8}
              >
                <X size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Quick Stats */}
            {totalNutrition.calories > 0 && (
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Flame size={14} color="#FFF" />
                  <Text style={styles.statValue}>{Math.round(totalNutrition.calories)}</Text>
                  <Text style={styles.statLabel}>cal</Text>
                </View>
                <View style={styles.statCard}>
                  <Dumbbell size={14} color="#FFF" />
                  <Text style={styles.statValue}>{Math.round(totalNutrition.protein)}g</Text>
                  <Text style={styles.statLabel}>protein</Text>
                </View>
                <View style={styles.statCard}>
                  <Package size={14} color="#FFF" />
                  <Text style={styles.statValue}>{unpurchasedItems.length}</Text>
                  <Text style={styles.statLabel}>items</Text>
                </View>
              </View>
            )}
          </LinearGradient>

          {/* Content */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  {t("common.loading") || "Loading..."}
                </Text>
              </View>
            ) : shoppingList.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + "15" }]}>
                  <Sparkles size={48} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t("shopping.empty_title") || "Your list is empty"}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {t("shopping.empty_subtitle") || "Tap + to add your first item"}
                </Text>
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleOpenSmartModal()}
                  activeOpacity={0.8}
                >
                  <Plus size={20} color="#FFF" />
                  <Text style={styles.emptyBtnText}>
                    {t("shopping.add_item") || "Add Item"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* To Buy Section */}
                {unpurchasedItems.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        {t("shopping.to_buy") || "To Buy"}
                      </Text>
                      <View style={[styles.sectionBadge, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.sectionBadgeText, { color: colors.primary }]}>
                          {unpurchasedItems.length}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.itemsList}>
                      {unpurchasedItems.map(renderItem)}
                    </View>
                  </View>
                )}

                {/* Purchased Section */}
                {purchasedItems.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionDot, { backgroundColor: colors.success }]} />
                      <Text style={[styles.sectionTitle, { color: colors.success }]}>
                        {t("shopping.purchased") || "Purchased"}
                      </Text>
                      <View style={[styles.sectionBadge, { backgroundColor: colors.success + "20" }]}>
                        <Text style={[styles.sectionBadgeText, { color: colors.success }]}>
                          {purchasedItems.length}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.itemsList}>
                      {purchasedItems.map(renderItem)}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Floating Add Button */}
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={() => handleOpenSmartModal()}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Plus size={28} color="#FFF" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Smart Add Modal */}
      <SmartShoppingItemModal
        visible={showSmartModal}
        editingItem={smartModalEditItem}
        onClose={() => {
          setShowSmartModal(false);
          setSmartModalEditItem(null);
        }}
        onSave={handleSmartModalSave}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingState: {
    paddingVertical: 80,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 260,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  emptyBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiText: {
    fontSize: 22,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 10,
  },
  itemQuantity: {
    fontSize: 13,
    fontWeight: "500",
  },
  nutritionChips: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  itemActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
