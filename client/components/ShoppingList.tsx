import React, { useState, useCallback, useMemo, useRef } from "react";
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
  Sparkles,
  Edit3,
  CheckCheck,
  Beef,
  Fish,
  Egg,
  Milk,
  Wheat,
  Apple,
  Carrot,
  Droplets,
  Coffee,
  Leaf,
  Cookie,
  Salad,
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

// Lucide icon resolution for ingredient names
const INGREDIENT_ICON_MAP: {
  keywords: string[];
  Icon: React.ComponentType<any>;
  color: string;
}[] = [
  { keywords: ["beef", "steak", "meat", "veal", "lamb", "pork", "burger", "mince", "brisket", "ribs", "chicken", "turkey", "duck", "breast", "thigh", "wing"], Icon: Beef, color: "#C2410C" },
  { keywords: ["fish", "salmon", "tuna", "cod", "tilapia", "shrimp", "prawn", "seafood", "crab", "lobster", "anchovy", "sardine", "trout"], Icon: Fish, color: "#0284C7" },
  { keywords: ["egg", "eggs", "omelette", "omelet"], Icon: Egg, color: "#D97706" },
  { keywords: ["milk", "cream", "cheese", "yogurt", "dairy", "butter", "ricotta", "mozzarella", "cheddar", "parmesan", "feta", "brie", "cottage", "whey"], Icon: Milk, color: "#93C5FD" },
  { keywords: ["bread", "rice", "pasta", "wheat", "oat", "cereal", "flour", "noodle", "grain", "barley", "quinoa", "bagel", "wrap", "tortilla", "pita", "rye"], Icon: Wheat, color: "#A16207" },
  { keywords: ["apple", "banana", "orange", "grape", "strawberry", "berry", "mango", "peach", "pear", "cherry", "melon", "kiwi", "pineapple", "lemon", "avocado", "fig", "blueberry", "raspberry"], Icon: Apple, color: "#EF4444" },
  { keywords: ["carrot", "broccoli", "lettuce", "spinach", "kale", "onion", "garlic", "pepper", "tomato", "cucumber", "celery", "cabbage", "cauliflower", "beet", "mushroom", "zucchini", "eggplant", "corn", "pea", "bean", "lentil", "chickpea", "pumpkin"], Icon: Carrot, color: "#F97316" },
  { keywords: ["oil", "olive", "coconut", "dressing", "sauce", "mayo", "vinegar", "soy", "ketchup", "mustard", "tahini", "hummus"], Icon: Droplets, color: "#10B981" },
  { keywords: ["coffee", "tea", "juice", "water", "drink", "soda", "shake", "smoothie", "latte", "espresso", "cappuccino", "matcha"], Icon: Coffee, color: "#92400E" },
  { keywords: ["herb", "spice", "salt", "cumin", "turmeric", "cinnamon", "basil", "oregano", "thyme", "rosemary", "mint", "parsley", "ginger", "paprika", "curry"], Icon: Leaf, color: "#16A34A" },
  { keywords: ["salad", "bowl", "mix", "plate", "soup", "stew"], Icon: Salad, color: "#4ADE80" },
  { keywords: ["cookie", "cake", "chocolate", "candy", "sweet", "dessert", "pie", "brownie", "muffin", "donut", "sugar", "honey", "nut", "almond", "walnut", "cashew", "peanut", "pistachio", "chip", "snack"], Icon: Cookie, color: "#F472B6" },
];

const getIngredientIconEntry = (name: string) => {
  const lower = name.toLowerCase();
  for (const entry of INGREDIENT_ICON_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry;
  }
  return null;
};

const getIngredientColor = (name: string, metadata?: any): string => {
  if (metadata?.ing_color) return metadata.ing_color;
  const entry = getIngredientIconEntry(name);
  if (entry) return entry.color;
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#6C5CE7"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getIngredientEmoji = (name: string, metadata?: any): string => {
  if (metadata?.ing_emoji) return metadata.ing_emoji;
  const lower = name.toLowerCase();
  const map: { [k: string]: string } = {
    chicken: "🍗", beef: "🥩", fish: "🐟", salmon: "🍣", egg: "🥚", turkey: "🦃",
    milk: "🥛", cheese: "🧀", yogurt: "🥛", butter: "🧈",
    bread: "🍞", rice: "🍚", pasta: "🍝", oats: "🌾", noodle: "🍜",
    apple: "🍎", banana: "🍌", orange: "🍊", tomato: "🍅", lemon: "🍋",
    carrot: "🥕", broccoli: "🥦", lettuce: "🥬", onion: "🧅", potato: "🥔",
    garlic: "🧄", pepper: "🌶️", cucumber: "🥒", avocado: "🥑",
    salt: "🧂", sugar: "🍬", honey: "🍯", oil: "🫒", olive: "🫒",
    coffee: "☕", tea: "🍵", juice: "🧃", water: "💧",
    chocolate: "🍫", cookie: "🍪", cake: "🎂",
    almond: "🌰", walnut: "🌰", peanut: "🥜",
  };
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v;
  }
  return "🛒";
};

// Item row component
const ShoppingItem = React.memo(({
  item,
  colors,
  isDark,
  onToggle,
  onEdit,
  onDelete,
  isToggling,
}: {
  item: ShoppingListItemData;
  colors: any;
  isDark: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isToggling: boolean;
}) => {
  const iconEntry = !item.metadata?.ing_img ? getIngredientIconEntry(item.name) : null;
  const emoji = getIngredientEmoji(item.name, item.metadata);
  const accentColor = getIngredientColor(item.name, item.metadata);
  const hasNutrition = item.metadata?.calories || item.metadata?.protein;

  return (
    <View
      style={[
        styles.itemCard,
        {
          backgroundColor: isDark ? colors.card : "#FFFFFF",
          borderColor: item.is_purchased
            ? "#10B981" + "35"
            : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          shadowColor: accentColor,
        },
      ]}
    >
      {/* Left accent strip */}
      <View style={[styles.itemAccentStrip, { backgroundColor: item.is_purchased ? "#10B981" : accentColor }]} />

      {/* Checkbox */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          {
            borderColor: item.is_purchased ? "#10B981" : isDark ? "rgba(255,255,255,0.3)" : "#D1D5DB",
            backgroundColor: item.is_purchased ? "#10B981" : "transparent",
          },
        ]}
        onPress={onToggle}
        disabled={isToggling}
        activeOpacity={0.7}
      >
        {item.is_purchased && <Check size={13} color="#FFF" strokeWidth={3} />}
      </TouchableOpacity>

      {/* Icon badge */}
      <View style={[styles.iconBadge, { backgroundColor: accentColor + "18", borderColor: accentColor + "30" }]}>
        {item.metadata?.ing_img ? null : iconEntry ? (
          <iconEntry.Icon size={20} color={accentColor} strokeWidth={1.8} />
        ) : (
          <Text style={styles.emojiText}>{emoji}</Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemName,
            {
              color: isDark ? "#FFF" : "#111",
              textDecorationLine: item.is_purchased ? "line-through" : "none",
              opacity: item.is_purchased ? 0.55 : 1,
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
              {!!item.metadata?.calories && (
                <View style={styles.chip}>
                  <Flame size={9} color="#FF6B6B" strokeWidth={2.5} />
                  <Text style={[styles.chipText, { color: "#FF6B6B" }]}>
                    {Math.round(item.metadata.calories)}
                  </Text>
                </View>
              )}
              {!!item.metadata?.protein && (
                <View style={[styles.chip, { backgroundColor: "#6366F110" }]}>
                  <Dumbbell size={9} color="#6366F1" strokeWidth={2.5} />
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
          style={[styles.actionBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FFFBEB", borderColor: "#F59E0B30" }]}
          onPress={onEdit}
          activeOpacity={0.7}
        >
          <Edit3 size={14} color="#F59E0B" strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FEF2F2", borderColor: "#EF444430" }]}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={14} color="#EF4444" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
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

  // Memoized lists
  const { unpurchasedItems, purchasedItems, totalNutrition } = useMemo(() => {
    const unpurchased = shoppingList.filter((item: any) => !item.is_purchased);
    const purchased = shoppingList.filter((item: any) => item.is_purchased);
    const nutrition = unpurchased.reduce(
      (acc: any, item: any) => ({
        calories: acc.calories + (item.metadata?.calories || 0),
        protein: acc.protein + (item.metadata?.protein || 0),
      }),
      { calories: 0, protein: 0 }
    );
    return { unpurchasedItems: unpurchased, purchasedItems: purchased, totalNutrition: nutrition };
  }, [shoppingList]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await forceRefresh(); } finally { setRefreshing(false); }
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
        category: item.category || t("shopping.from_meal_analysis"),
        added_from: "manual",
        estimated_cost: item.estimated_cost || 0,
        is_purchased: undefined,
        metadata: item.metadata,
      });
    }
    setSmartModalEditItem(null);
    setShowSmartModal(false);
  }, [smartModalEditItem, updateItem, addItem, t]);

  const handleOpenSmartModal = useCallback((item?: ShoppingListItemData) => {
    setSmartModalEditItem(item || null);
    setShowSmartModal(true);
  }, []);

  const handleDeleteItem = useCallback((id: string, name: string) => {
    Alert.alert(
      t("shopping.delete_confirm_title"),
      `${t("shopping.delete_confirm_message")} "${name}"?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), style: "destructive", onPress: () => deleteItem(id) },
      ]
    );
  }, [deleteItem, t]);

  const handleClearPurchased = useCallback(() => {
    if (purchasedItems.length === 0) return;
    Alert.alert(
      t("shopping.clear_purchased_title") || "Clear Purchased",
      t("shopping.clear_purchased_message") || "Remove all purchased items from the list?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => purchasedItems.forEach((item: any) => deleteItem(item.id)),
        },
      ]
    );
  }, [purchasedItems, deleteItem, t]);

  const renderItem = useCallback((item: ShoppingListItemData) => (
    <ShoppingItem
      key={item.id}
      item={item}
      colors={colors}
      isDark={isDark}
      onToggle={() => togglePurchased(item.id)}
      onEdit={() => handleOpenSmartModal(item)}
      onDelete={() => handleDeleteItem(item.id, item.name)}
      isToggling={isToggling}
    />
  ), [colors, isDark, togglePurchased, handleOpenSmartModal, handleDeleteItem, isToggling]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: isDark ? colors.background : "#F8FAFC" }]}>

          {/* Header */}
          <LinearGradient
            colors={isDark ? ["#1F2937", "#111827"] : ["#10B981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            {/* Handle */}
            <View style={styles.handle} />

            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <ShoppingCart size={22} color="#FFF" strokeWidth={2} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>{t("shopping.title")}</Text>
                  <Text style={styles.headerSub}>
                    {unpurchasedItems.length} {t("shopping.items_remaining")}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                <X size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Stats strip */}
            {totalNutrition.calories > 0 && (
              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Flame size={12} color="#FFF" strokeWidth={2.5} />
                  <Text style={styles.statText}>{Math.round(totalNutrition.calories)} cal</Text>
                </View>
                <View style={styles.statPill}>
                  <Dumbbell size={12} color="#FFF" strokeWidth={2.5} />
                  <Text style={styles.statText}>{Math.round(totalNutrition.protein)}g protein</Text>
                </View>
              </View>
            )}
          </LinearGradient>

          {/* Content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
          >
            {isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : shoppingList.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + "15" }]}>
                  <Sparkles size={44} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t("shopping.empty_title")}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {t("shopping.empty_subtitle")}
                </Text>
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleOpenSmartModal()}
                  activeOpacity={0.85}
                >
                  <Plus size={18} color="#FFF" strokeWidth={2.5} />
                  <Text style={styles.emptyBtnText}>{t("shopping.add_item")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* To Buy */}
                {unpurchasedItems.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        {t("shopping.to_buy")}
                      </Text>
                      <View style={[styles.sectionBadge, { backgroundColor: colors.primary + "18" }]}>
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

                {/* Purchased */}
                {purchasedItems.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionDot, { backgroundColor: "#10B981" }]} />
                      <Text style={[styles.sectionTitle, { color: "#10B981" }]}>
                        {t("shopping.purchased")}
                      </Text>
                      <View style={[styles.sectionBadge, { backgroundColor: "#10B98118" }]}>
                        <Text style={[styles.sectionBadgeText, { color: "#10B981" }]}>
                          {purchasedItems.length}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.clearBtn}
                        onPress={handleClearPurchased}
                        activeOpacity={0.7}
                      >
                        <CheckCheck size={13} color="#10B981" strokeWidth={2.5} />
                        <Text style={styles.clearBtnText}>{t("shopping.clear") || "Clear"}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.itemsList}>
                      {purchasedItems.map(renderItem)}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* FAB */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => handleOpenSmartModal()}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Plus size={26} color="#FFF" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <SmartShoppingItemModal
        visible={showSmartModal}
        editingItem={smartModalEditItem}
        onClose={() => { setShowSmartModal(false); setSmartModalEditItem(null); }}
        onSave={handleSmartModalSave}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    flex: 1,
    marginTop: 48,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  header: {
    paddingTop: 12,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF",
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 110,
  },
  centered: {
    paddingVertical: 80,
    alignItems: "center",
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 240,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 7,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  sectionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#10B98112",
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
  },
  itemsList: {
    gap: 9,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  itemAccentStrip: {
    width: 4,
    alignSelf: "stretch",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    flexShrink: 0,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  emojiText: {
    fontSize: 20,
  },
  itemContent: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 10,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 8,
    flexWrap: "wrap",
  },
  itemQuantity: {
    fontSize: 12,
    fontWeight: "500",
  },
  nutritionChips: {
    flexDirection: "row",
    gap: 5,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#FF6B6B10",
  },
  chipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  itemActions: {
    flexDirection: "row",
    gap: 6,
    paddingRight: 12,
    paddingLeft: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 18,
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
