import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Dimensions,
  Image,
  Animated,
} from "react-native";
import {
  Plus,
  Edit3,
  Trash2,
  ShoppingCart,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Weight,
  Beef,
  Fish,
  Egg,
  Milk,
  Wheat,
  Apple,
  Carrot,
  Droplets,
  Flame,
  Leaf,
  Cookie,
  Coffee,
  Salad,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useLanguage } from "@/src/i18n/context/LanguageContext";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.72;
const CARD_SPACING = 12;

interface Ingredient {
  name: string;
  calories: number;
  protein_g?: number;
  protein?: number;
  carbs_g?: number;
  carbs?: number;
  fats_g?: number;
  fat?: number;
  fats?: number;
  fiber_g?: number;
  fiber?: number;
  sugar_g?: number;
  sugar?: number;
  sodium_mg?: number;
  sodium?: number;
  estimated_portion_g?: number;
  estimated_cost?: number;
  ing_img?: string;
  ing_emoji?: string;
  ing_color?: string;
}

interface IngredientsListProps {
  ingredients: Ingredient[];
  onEditIngredient: (ingredient: Ingredient, index: number) => void;
  onRemoveIngredient: (index: number) => void;
  onAddIngredient: () => void;
}

// Macro color palette
const MACRO_COLORS = {
  calories: "#FF6B35",
  protein: "#6366F1",
  carbs: "#10B981",
  fat: "#F97316",
  fiber: "#A78BFA",
  sodium: "#60A5FA",
};

// Lucide icon components for common ingredient categories
const INGREDIENT_ICON_MAP: {
  keywords: string[];
  Icon: React.ComponentType<any>;
  color: string;
}[] = [
  { keywords: ["beef", "steak", "meat", "veal", "lamb", "pork", "burger", "mince", "ground", "brisket", "ribs"], Icon: Beef, color: "#C2410C" },
  { keywords: ["chicken", "turkey", "duck", "poultry", "hen", "breast", "thigh", "wing"], Icon: Flame, color: "#D97706" },
  { keywords: ["fish", "salmon", "tuna", "cod", "tilapia", "shrimp", "prawn", "seafood", "crab", "lobster", "anchovy", "sardine", "halibut", "bass", "trout"], Icon: Fish, color: "#0284C7" },
  { keywords: ["egg", "eggs", "omelette", "omelet", "quiche", "frittata"], Icon: Egg, color: "#FDE68A" },
  { keywords: ["milk", "cream", "cheese", "yogurt", "dairy", "butter", "ricotta", "mozzarella", "cheddar", "parmesan", "feta", "brie", "cottage", "whey", "casein"], Icon: Milk, color: "#93C5FD" },
  { keywords: ["bread", "rice", "pasta", "wheat", "oat", "cereal", "flour", "noodle", "grain", "barley", "quinoa", "couscous", "bagel", "wrap", "tortilla", "pita", "rye", "sourdough"], Icon: Wheat, color: "#D97706" },
  { keywords: ["apple", "banana", "orange", "grape", "strawberry", "berry", "mango", "peach", "pear", "plum", "cherry", "melon", "watermelon", "kiwi", "pineapple", "lemon", "lime", "avocado", "fig", "date", "pomegranate", "blueberry", "raspberry", "blackberry", "papaya", "guava"], Icon: Apple, color: "#EF4444" },
  { keywords: ["carrot", "broccoli", "lettuce", "spinach", "kale", "onion", "garlic", "pepper", "tomato", "cucumber", "celery", "cabbage", "cauliflower", "asparagus", "beetroot", "beet", "mushroom", "zucchini", "eggplant", "corn", "pea", "bean", "legume", "lentil", "chickpea", "pumpkin", "squash", "radish", "artichoke", "leek", "fennel", "chard"], Icon: Carrot, color: "#F97316" },
  { keywords: ["oil", "olive", "coconut", "dressing", "sauce", "mayo", "vinegar", "soy", "ketchup", "mustard", "tahini", "hummus", "paste", "spread", "jam", "butter"], Icon: Droplets, color: "#10B981" },
  { keywords: ["coffee", "tea", "juice", "water", "drink", "beverage", "soda", "shake", "smoothie", "milk", "latte", "espresso", "cappuccino", "matcha", "cocoa"], Icon: Coffee, color: "#92400E" },
  { keywords: ["herb", "spice", "salt", "pepper", "cumin", "turmeric", "cinnamon", "basil", "oregano", "thyme", "rosemary", "mint", "parsley", "cilantro", "dill", "ginger", "cardamom", "nutmeg", "paprika", "curry", "chili", "bay"], Icon: Leaf, color: "#16A34A" },
  { keywords: ["salad", "mix", "bowl", "plate", "meal", "dish", "stew", "soup", "curry", "casserole", "stir", "fry", "roast", "bake"], Icon: Salad, color: "#4ADE80" },
  { keywords: ["cookie", "cake", "chocolate", "candy", "sweet", "dessert", "ice cream", "pie", "brownie", "muffin", "waffle", "pancake", "donut", "sugar", "honey", "syrup", "biscuit", "snack", "chip", "cracker", "pretzel", "popcorn", "nut", "almond", "walnut", "cashew", "peanut", "pistachio", "hazelnut", "seed", "flaxseed", "chia"], Icon: Cookie, color: "#F472B6" },
];

export const IngredientsList: React.FC<IngredientsListProps> = ({
  ingredients,
  onEditIngredient,
  onRemoveIngredient,
  onAddIngredient,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { addItem, bulkAddItems, isAddingItem, isBulkAdding } =
    useShoppingList();
  const [addingToShoppingList, setAddingToShoppingList] = useState<
    string | null
  >(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const getNutritionValue = (ingredient: Ingredient, field: string): number => {
    const variations = [
      field,
      field.replace("_g", ""),
      field.replace("_mg", ""),
      field.replace("g", ""),
      field.replace("mg", ""),
    ];

    for (const variation of variations) {
      const value = ingredient[variation as keyof Ingredient];
      if (typeof value === "number" && value > 0) {
        return Math.round(value);
      }
      if (typeof value === "string" && !isNaN(parseFloat(value))) {
        return Math.round(parseFloat(value));
      }
    }
    return 0;
  };

  const handleAddToShoppingList = async (
    ingredient: Ingredient,
    index: number,
  ) => {
    setAddingToShoppingList(`${index}`);
    try {
      addItem({
        name: ingredient.name,
        quantity: ingredient.estimated_portion_g
          ? Math.round(ingredient.estimated_portion_g)
          : 1,
        unit: ingredient.estimated_portion_g
          ? t("units.grams")
          : t("units.pieces"),
        category: t("shopping.from_meal_analysis"),
        added_from: "meal",
        is_purchased: undefined,
        metadata: {
          ing_img: ingredient.ing_img,
          ing_emoji: ingredient.ing_emoji,
          ing_color: ingredient.ing_color,
          calories: getNutritionValue(ingredient, "calories"),
          protein: getNutritionValue(ingredient, "protein"),
          carbs: getNutritionValue(ingredient, "carbs"),
          fat: getNutritionValue(ingredient, "fat"),
        },
      });

      Alert.alert(
        t("common.success"),
        t("shopping.item_added", { name: ingredient.name }),
      );
    } catch (error) {
      Alert.alert(t("common.error"), t("shopping.add_item_failed"));
    } finally {
      setAddingToShoppingList(null);
    }
  };

  const handleAddAllToShoppingList = async () => {
    setAddingToShoppingList("all");
    try {
      const itemsToAdd = ingredients.map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.estimated_portion_g
          ? Math.round(ingredient.estimated_portion_g)
          : 1,
        unit: ingredient.estimated_portion_g
          ? t("units.grams")
          : t("units.pieces"),
        category: t("shopping.from_meal_analysis"),
        added_from: "meal",
        metadata: {
          ing_img: ingredient.ing_img,
          ing_emoji: ingredient.ing_emoji,
          ing_color: ingredient.ing_color,
          calories: getNutritionValue(ingredient, "calories"),
          protein: getNutritionValue(ingredient, "protein"),
          carbs: getNutritionValue(ingredient, "carbs"),
          fat: getNutritionValue(ingredient, "fat"),
        },
      }));

      bulkAddItems(itemsToAdd);

      Alert.alert(
        t("common.success"),
        t("shopping.items_added", { count: ingredients.length }),
      );
    } catch (error) {
      Alert.alert(t("common.error"), t("shopping.add_items_failed"));
    } finally {
      setAddingToShoppingList(null);
    }
  };

  const scrollToIndex = (index: number) => {
    if (index >= 0 && index < ingredients.length) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
      setCurrentIndex(index);
    }
  };

  const handleScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
    setCurrentIndex(Math.max(0, Math.min(newIndex, ingredients.length - 1)));
  };

  if (ingredients.length === 0) return null;

  // Resolve Lucide icon for ingredient
  const getIngredientIcon = (ingredient: Ingredient): { Icon: React.ComponentType<any>; color: string } | null => {
    const name = ingredient.name.toLowerCase();
    for (const entry of INGREDIENT_ICON_MAP) {
      if (entry.keywords.some((kw) => name.includes(kw))) {
        return { Icon: entry.Icon, color: entry.color };
      }
    }
    return null;
  };

  // Get emoji fallback for ingredient
  const getIngredientEmoji = (ingredient: Ingredient): string => {
    if (ingredient.ing_emoji) return ingredient.ing_emoji;
    const name = ingredient.name.toLowerCase();
    const emojiMap: { [key: string]: string } = {
      // Proteins
      chicken: "🍗", beef: "🥩", fish: "🐟", salmon: "🍣", tuna: "🐠",
      shrimp: "🍤", crab: "🦀", lobster: "🦞", egg: "🥚",
      // Dairy
      milk: "🥛", cheese: "🧀", yogurt: "🥛", butter: "🧈", cream: "🥛",
      // Grains
      bread: "🍞", rice: "🍚", pasta: "🍝", oats: "🌾", cereal: "🥣",
      noodle: "🍜", wrap: "🌯", tortilla: "🌮",
      // Fruits
      apple: "🍎", banana: "🍌", orange: "🍊", tomato: "🍅",
      grape: "🍇", strawberry: "🍓", watermelon: "🍉", mango: "🥭",
      peach: "🍑", pear: "🍐", cherry: "🍒", lemon: "🍋",
      pineapple: "🍍", avocado: "🥑", kiwi: "🥝", blueberry: "🫐",
      coconut: "🥥",
      // Vegetables
      carrot: "🥕", broccoli: "🥦", lettuce: "🥬", onion: "🧅",
      potato: "🥔", garlic: "🧄", pepper: "🌶️", cucumber: "🥒",
      corn: "🌽", mushroom: "🍄", eggplant: "🍆", pumpkin: "🎃",
      spinach: "🥬", cabbage: "🥬", salad: "🥗", beet: "🫐",
      // Condiments
      salt: "🧂", sugar: "🍬", honey: "🍯", oil: "🫒",
      sauce: "🥫", dressing: "🫙", ketchup: "🍅", mayo: "🥚",
      // Drinks
      coffee: "☕", tea: "🍵", juice: "🧃", water: "💧",
      // Sweets
      chocolate: "🍫", cookie: "🍪", cake: "🎂", ice: "🍦",
      candy: "🍬", pie: "🥧",
      // Nuts/Seeds
      almond: "🌰", walnut: "🌰", peanut: "🥜", nut: "🌰",
      // Other
      olive: "🫒", herb: "🌿", spice: "🌶️",
    };
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (name.includes(key)) return emoji;
    }
    return "🍽️";
  };

  // Get accent color for ingredient
  const getIngredientColor = (ingredient: Ingredient): string => {
    if (ingredient.ing_color) return ingredient.ing_color;
    // Try to get color from icon map
    const name = ingredient.name.toLowerCase();
    for (const entry of INGREDIENT_ICON_MAP) {
      if (entry.keywords.some((kw) => name.includes(kw))) {
        return entry.color;
      }
    }
    const palette = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];
    let hash = 0;
    for (let i = 0; i < ingredient.name.length; i++) {
      hash = ingredient.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  const MacroBar = ({
    value,
    total,
    color,
    label,
    unit = "g",
  }: {
    value: number;
    total: number;
    color: string;
    label: string;
    unit?: string;
  }) => {
    const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
    return (
      <View style={cardStyles.macroBarItem}>
        <View style={cardStyles.macroBarHeader}>
          <View style={cardStyles.macroLabelRow}>
            <View style={[cardStyles.macroColorDot, { backgroundColor: color }]} />
            <Text style={[cardStyles.macroBarLabel, { color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)" }]}>
              {label}
            </Text>
          </View>
          <Text style={[cardStyles.macroBarValue, { color: isDark ? "#FFF" : "#111" }]}>
            {value}{unit}
          </Text>
        </View>
        <View style={[cardStyles.macroBarBg, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
          <View style={[cardStyles.macroBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  const renderIngredientCard = ({
    item: ingredient,
    index,
  }: {
    item: Ingredient;
    index: number;
  }) => {
    const iconEntry = getIngredientIcon(ingredient);
    const emoji = getIngredientEmoji(ingredient);
    const accentColor = getIngredientColor(ingredient);
    const calories = getNutritionValue(ingredient, "calories");
    const protein = getNutritionValue(ingredient, "protein");
    const carbs = getNutritionValue(ingredient, "carbs");
    const fat = getNutritionValue(ingredient, "fat");
    const fiber = getNutritionValue(ingredient, "fiber");
    const totalMacros = protein + carbs + fat;

    return (
      <View style={[cardStyles.cardContainer, { width: CARD_WIDTH }]}>
        <View style={[
          cardStyles.card,
          {
            backgroundColor: isDark ? colors.card : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            shadowColor: accentColor,
          }
        ]}>
          {/* Top accent bar */}
          <View style={[cardStyles.accentBar, { backgroundColor: accentColor }]} />

          {/* Card Header */}
          <View style={cardStyles.cardHeader}>
            {/* Icon / Image */}
            <View style={[cardStyles.iconCircle, { backgroundColor: accentColor + "20", borderColor: accentColor + "35" }]}>
              {ingredient.ing_img ? (
                <Image source={{ uri: ingredient.ing_img }} style={cardStyles.ingredientImage} />
              ) : iconEntry ? (
                <iconEntry.Icon size={28} color={accentColor} strokeWidth={1.8} />
              ) : (
                <Text style={cardStyles.emoji}>{emoji}</Text>
              )}
            </View>

            {/* Name + badges */}
            <View style={cardStyles.nameBlock}>
              <Text
                style={[cardStyles.ingredientName, { color: isDark ? "#FFF" : "#111" }]}
                numberOfLines={2}
              >
                {ingredient.name}
              </Text>

              <View style={cardStyles.badgeRow}>
                {(ingredient.estimated_portion_g ?? 0) > 0 && (
                  <View style={[cardStyles.badge, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6" }]}>
                    <Weight size={10} color={isDark ? "rgba(255,255,255,0.6)" : "#6B7280"} strokeWidth={2.5} />
                    <Text style={[cardStyles.badgeText, { color: isDark ? "rgba(255,255,255,0.7)" : "#6B7280" }]}>
                      {Math.round(ingredient.estimated_portion_g!)}g
                    </Text>
                  </View>
                )}
                {(ingredient.estimated_cost ?? 0) > 0 && (
                  <View style={[cardStyles.badge, { backgroundColor: "#10B981" + "20" }]}>
                    <Text style={[cardStyles.badgeText, { color: "#10B981", fontWeight: "700" }]}>
                      ₪{ingredient.estimated_cost!.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Calorie pill */}
            <View style={[cardStyles.caloriePill, { backgroundColor: accentColor + "18", borderColor: accentColor + "35" }]}>
              <Text style={[cardStyles.calorieNum, { color: accentColor }]}>{calories}</Text>
              <Text style={[cardStyles.calorieUnit, { color: accentColor + "AA" }]}>{t("units.kcal")}</Text>
            </View>
          </View>

          {/* Macro Bars — always rendered to keep uniform height */}
          <View style={cardStyles.macroBarsSection}>
            <MacroBar value={protein} total={totalMacros} color={MACRO_COLORS.protein} label={t("camera.analysis.protein")} />
            <MacroBar value={carbs} total={totalMacros} color={MACRO_COLORS.carbs} label={t("camera.analysis.carbs")} />
            <MacroBar value={fat} total={totalMacros} color={MACRO_COLORS.fat} label={t("camera.analysis.fat")} />
            <MacroBar value={fiber} total={totalMacros > 0 ? totalMacros : 1} color={MACRO_COLORS.fiber} label={t("camera.analysis.fiber")} />
          </View>

          {/* Spacer to push actions to bottom */}
          <View style={cardStyles.spacer} />

          {/* Divider */}
          <View style={[cardStyles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }]} />

          {/* Action Buttons */}
          <View style={cardStyles.actionsRow}>
            <TouchableOpacity
              style={[cardStyles.actionBtn, { backgroundColor: "#10B981" + "16", borderColor: "#10B981" + "35" }]}
              onPress={() => handleAddToShoppingList(ingredient, index)}
              disabled={isAddingItem || addingToShoppingList === `${index}`}
              activeOpacity={0.7}
            >
              <ShoppingCart size={14} color="#10B981" strokeWidth={2.5} />
              <Text style={[cardStyles.actionBtnText, { color: "#10B981" }]}>{t("camera.ingredients.addToList")}</Text>
            </TouchableOpacity>

            <View style={cardStyles.actionsBtnGroup}>
              <TouchableOpacity
                style={[cardStyles.iconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FFFBEB", borderColor: colors.warning + "45" }]}
                onPress={() => onEditIngredient(ingredient, index)}
                activeOpacity={0.7}
              >
                <Edit3 size={14} color={colors.warning} strokeWidth={2.5} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[cardStyles.iconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FEF2F2", borderColor: colors.error + "45" }]}
                onPress={() => onRemoveIngredient(index)}
                activeOpacity={0.7}
              >
                <Trash2 size={14} color={colors.error} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[listStyles.container, { paddingHorizontal: 0 }]}>
      {/* Header */}
      <View style={listStyles.header}>
        <View style={listStyles.headerLeft}>
          <View style={[listStyles.iconWrapper, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <ChefHat size={20} color={colors.primary} strokeWidth={2.5} />
          </View>
          <View>
            <Text style={[listStyles.title, { color: colors.text }]}>{t("history.ingredients")}</Text>
            <Text style={[listStyles.subtitle, { color: colors.textSecondary }]}>
              {ingredients.length} {t("statistics.items_detected")}
            </Text>
          </View>
        </View>
        <View style={listStyles.headerActions}>
          {ingredients.length > 0 && (
            <TouchableOpacity
              style={[listStyles.headerBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddAllToShoppingList}
              disabled={isBulkAdding || addingToShoppingList === "all"}
              activeOpacity={0.7}
            >
              <ShoppingCart size={16} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[listStyles.headerBtn, { backgroundColor: colors.success }]}
            onPress={onAddIngredient}
            activeOpacity={0.7}
          >
            <Plus size={18} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={ingredients}
        renderItem={renderIngredientCard}
        keyExtractor={(item, index) => `ingredient-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: (screenWidth - CARD_WIDTH) / 2 - CARD_SPACING / 2 }}
        onMomentumScrollEnd={handleScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH + CARD_SPACING,
          offset: (CARD_WIDTH + CARD_SPACING) * index,
          index,
        })}
        inverted={isRTL}
      />

      {/* Navigation */}
      {ingredients.length > 1 && (
        <View style={listStyles.navRow}>
          <TouchableOpacity
            style={[
              listStyles.navBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              currentIndex === 0 && listStyles.navBtnDisabled,
            ]}
            onPress={() => scrollToIndex(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={18} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={listStyles.paginationRow}>
            {ingredients.length <= 6 ? (
              ingredients.map((_, idx) => (
                <TouchableOpacity key={idx} onPress={() => scrollToIndex(idx)}>
                  <View
                    style={[
                      listStyles.dot,
                      { backgroundColor: idx === currentIndex ? colors.primary : colors.border },
                      idx === currentIndex && listStyles.dotActive,
                    ]}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[listStyles.counterText, { color: colors.textSecondary }]}>
                {currentIndex + 1} / {ingredients.length}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              listStyles.navBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              currentIndex === ingredients.length - 1 && listStyles.navBtnDisabled,
            ]}
            onPress={() => scrollToIndex(currentIndex + 1)}
            disabled={currentIndex === ingredients.length - 1}
          >
            <ChevronRight size={18} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const cardStyles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: CARD_SPACING / 2,
  },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    minHeight: 300,
    flexDirection: "column",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  accentBar: {
    height: 4,
    width: "100%",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    paddingBottom: 12,
    gap: 11,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    flexShrink: 0,
    borderWidth: 1,
  },
  ingredientImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  emoji: {
    fontSize: 26,
  },
  nameBlock: {
    flex: 1,
    gap: 6,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 5,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  caloriePill: {
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexShrink: 0,
    minWidth: 52,
  },
  calorieNum: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  calorieUnit: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  macroBarsSection: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  macroBarItem: {
    gap: 4,
  },
  macroBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  macroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  macroColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroBarLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  macroBarValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  macroBarBg: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  macroBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  spacer: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionsBtnGroup: {
    flexDirection: "row",
    gap: 7,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
});

const listStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingVertical: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    gap: 14,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 18,
  },
  counterText: {
    fontSize: 13,
    fontWeight: "600",
    minWidth: 50,
    textAlign: "center",
  },
});
