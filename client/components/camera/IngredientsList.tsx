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
  ImageOff,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useLanguage } from "@/src/i18n/context/LanguageContext";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.75;
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
        // Include ingredient visual data and nutrition
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
        // Include ingredient visual data and nutrition
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

  const styles = StyleSheet.create({
    container: {
      marginBottom: 20,
      paddingVertical: 10,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      flex: 1,
    },
    iconWrapper: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.6,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "600",
      marginTop: 3,
      letterSpacing: -0.1,
    },
    headerActions: {
      flexDirection: "row",
      gap: 10,
    },
    addAllButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.success,
      justifyContent: "center",
      alignItems: "center",
    },
    carouselContainer: {
      position: "relative",
    },
    flatList: {
      paddingHorizontal: (screenWidth - CARD_WIDTH) / 2 - CARD_SPACING,
    },
    cardContainer: {
      width: CARD_WIDTH,
      marginHorizontal: CARD_SPACING / 2,
    },
    ingredientCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    imageContainer: {
      width: "100%",
      height: 160,
      backgroundColor: isDark ? colors.surfaceVariant : "#F5F5F5",
      justifyContent: "center",
      alignItems: "center",
    },
    ingredientImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    noImagePlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    noImageText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    emojiContainer: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
    },
    ingredientEmoji: {
      fontSize: 64,
    },
    cardContent: {
      padding: 16,
    },
    ingredientName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.3,
      marginBottom: 12,
    },
    nutritionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    nutritionChip: {
      backgroundColor: isDark ? colors.surfaceVariant : "#F0F9FF",
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    nutritionText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      letterSpacing: -0.1,
    },
    ingredientActions: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
    },
    actionButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    cartButton: {
      backgroundColor: colors.emerald50,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    editButton: {
      backgroundColor: isDark ? colors.surfaceVariant : "#FFFBEB",
      borderWidth: 1,
      borderColor: colors.warning,
    },
    deleteButton: {
      backgroundColor: isDark ? colors.surfaceVariant : "#FEF2F2",
      borderWidth: 1,
      borderColor: colors.error,
    },
    navigationContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 16,
      gap: 16,
    },
    navButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    navButtonDisabled: {
      opacity: 0.4,
    },
    paginationContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    paginationDotActive: {
      backgroundColor: colors.primary,
      width: 20,
    },
    counterText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      minWidth: 50,
      textAlign: "center",
    },
  });

  // Get emoji for ingredient - fallback if not provided by API
  const getIngredientEmoji = (ingredient: Ingredient): string => {
    if (ingredient.ing_emoji) return ingredient.ing_emoji;

    const name = ingredient.name.toLowerCase();
    const emojiMap: { [key: string]: string } = {
      chicken: "🍗", beef: "🥩", fish: "🐟", salmon: "🍣", egg: "🥚",
      milk: "🥛", cheese: "🧀", yogurt: "🥛", butter: "🧈",
      bread: "🍞", rice: "🍚", pasta: "🍝", oats: "🌾",
      apple: "🍎", banana: "🍌", orange: "🍊", tomato: "🍅",
      carrot: "🥕", broccoli: "🥦", lettuce: "🥬", onion: "🧅",
      potato: "🥔", garlic: "🧄", pepper: "🌶️", cucumber: "🥒",
      salt: "🧂", sugar: "🍬", honey: "🍯", oil: "🫒",
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (name.includes(key)) return emoji;
    }
    return "🍽️";
  };

  // Get color for ingredient - fallback if not provided by API
  const getIngredientColor = (ingredient: Ingredient): string => {
    if (ingredient.ing_color) return ingredient.ing_color;

    const colors_list = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"];
    let hash = 0;
    for (let i = 0; i < ingredient.name.length; i++) {
      hash = ingredient.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors_list[Math.abs(hash) % colors_list.length];
  };

  const renderIngredientCard = ({
    item: ingredient,
    index,
  }: {
    item: Ingredient;
    index: number;
  }) => {
    const emoji = getIngredientEmoji(ingredient);
    const bgColor = getIngredientColor(ingredient);

    return (
      <View style={styles.cardContainer}>
        <View style={styles.ingredientCard}>
          {/* Ingredient Visual - Emoji with colored background (INSTANT) */}
          <View style={[styles.imageContainer, { backgroundColor: bgColor + "20" }]}>
            {ingredient.ing_img ? (
              <Image
                source={{ uri: ingredient.ing_img }}
                style={styles.ingredientImage}
              />
            ) : (
              <View style={styles.emojiContainer}>
                <Text style={styles.ingredientEmoji}>{emoji}</Text>
              </View>
            )}
          </View>

          {/* Card Content */}
          <View style={styles.cardContent}>
            <Text style={styles.ingredientName} numberOfLines={2}>
              {typeof ingredient === "string" ? ingredient : ingredient.name}
            </Text>

            {typeof ingredient !== "string" && (
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionChip}>
                  <Text style={styles.nutritionText}>
                    {getNutritionValue(ingredient, "calories")} {t("statistics.kcal")}
                  </Text>
                </View>
                <View style={styles.nutritionChip}>
                  <Text style={styles.nutritionText}>
                    {getNutritionValue(ingredient, "protein")}
                    {t("statistics.g")} {t("statistics.protein")}
                  </Text>
                </View>
                <View style={styles.nutritionChip}>
                  <Text style={styles.nutritionText}>
                    {getNutritionValue(ingredient, "carbs")}
                    {t("statistics.g")} {t("statistics.carbs")}
                  </Text>
                </View>
                <View style={styles.nutritionChip}>
                  <Text style={styles.nutritionText}>
                    {getNutritionValue(ingredient, "fat")}
                    {t("statistics.g")} {t("statistics.fat")}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.ingredientActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cartButton]}
                onPress={() => handleAddToShoppingList(ingredient, index)}
                disabled={isAddingItem || addingToShoppingList === `${index}`}
                activeOpacity={0.7}
              >
                <ShoppingCart
                  size={18}
                  color={colors.primary}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => onEditIngredient(ingredient, index)}
                activeOpacity={0.7}
              >
                <Edit3 size={18} color={colors.warning} strokeWidth={2.5} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => onRemoveIngredient(index)}
                activeOpacity={0.7}
              >
                <Trash2 size={18} color={colors.error} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrapper}>
            <ChefHat size={22} color={colors.tint} strokeWidth={2.5} />
          </View>
          <View>
            <Text style={styles.title}>{t("history.ingredients")}</Text>
            <Text style={styles.subtitle}>
              {ingredients.length}{" "}
              {t("statistics.items_detected", { count: ingredients.length })}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {ingredients.length > 0 && (
            <TouchableOpacity
              style={styles.addAllButton}
              onPress={handleAddAllToShoppingList}
              disabled={isBulkAdding || addingToShoppingList === "all"}
              activeOpacity={0.7}
            >
              <ShoppingCart
                size={18}
                color={colors.onPrimary}
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddIngredient}
            activeOpacity={0.7}
          >
            <Plus size={20} color={colors.onPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Carousel */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={ingredients}
          renderItem={renderIngredientCard}
          keyExtractor={(item, index) => `ingredient-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_SPACING}
          decelerationRate="fast"
          contentContainerStyle={styles.flatList}
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
      </View>

      {/* Navigation */}
      {ingredients.length > 1 && (
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.navButton,
              currentIndex === 0 && styles.navButtonDisabled,
            ]}
            onPress={() => scrollToIndex(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.paginationContainer}>
            {ingredients.length <= 5 ? (
              ingredients.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => scrollToIndex(index)}
                >
                  <View
                    style={[
                      styles.paginationDot,
                      index === currentIndex && styles.paginationDotActive,
                    ]}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.counterText}>
                {currentIndex + 1} / {ingredients.length}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentIndex === ingredients.length - 1 &&
                styles.navButtonDisabled,
            ]}
            onPress={() => scrollToIndex(currentIndex + 1)}
            disabled={currentIndex === ingredients.length - 1}
          >
            <ChevronRight size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
