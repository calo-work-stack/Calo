import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import {
  Plus,
  Edit3,
  Trash2,
  ShoppingCart,
  ChefHat,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { useShoppingList } from "@/hooks/useShoppingList";

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
  const { addItem, bulkAddItems, isAddingItem, isBulkAdding } =
    useShoppingList();
  const [addingToShoppingList, setAddingToShoppingList] = useState<
    string | null
  >(null);

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

  if (ingredients.length === 0) return null;

  const styles = StyleSheet.create({
    container: {
      marginBottom: 20,
      padding: 10,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
      paddingHorizontal: 4,
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
    ingredientsList: {
      gap: 12,
      padding: 10,
    },
    ingredientCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ingredientLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      gap: 14,
    },
    ingredientDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.tint,
    },
    ingredientInfo: {
      flex: 1,
      gap: 8,
    },
    ingredientName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.3,
    },
    nutritionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    nutritionChip: {
      paddingVertical: 4,
      paddingHorizontal: 0,
    },
    nutritionDivider: {
      width: 1,
      height: 12,
      backgroundColor: colors.border,
    },
    nutritionText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      letterSpacing: -0.1,
    },
    ingredientActions: {
      flexDirection: "row",
      gap: 8,
      marginLeft: 12,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
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
  });

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

      {/* Ingredients List */}
      <View style={styles.ingredientsList}>
        {ingredients.map((ingredient, index) => (
          <View key={index} style={styles.ingredientCard}>
            <View style={styles.ingredientLeft}>
              <View style={styles.ingredientDot} />
              <View style={styles.ingredientInfo}>
                <Text style={styles.ingredientName} numberOfLines={1}>
                  {typeof ingredient === "string"
                    ? ingredient
                    : ingredient.name}
                </Text>
                {typeof ingredient !== "string" && (
                  <View style={styles.nutritionRow}>
                    <View style={styles.nutritionChip}>
                      <Text style={styles.nutritionText}>
                        {getNutritionValue(ingredient, "calories")}{" "}
                        {t("statistics.kcal")}
                      </Text>
                    </View>
                    <View style={styles.nutritionDivider} />
                    <View style={styles.nutritionChip}>
                      <Text style={styles.nutritionText}>
                        {getNutritionValue(ingredient, "protein")}
                        {t("statistics.g")} {t("statistics.protein")}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.ingredientActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cartButton]}
                onPress={() => handleAddToShoppingList(ingredient, index)}
                disabled={isAddingItem || addingToShoppingList === `${index}`}
                activeOpacity={0.7}
              >
                <ShoppingCart
                  size={15}
                  color={colors.primary}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => onEditIngredient(ingredient, index)}
                activeOpacity={0.7}
              >
                <Edit3 size={15} color={colors.warning} strokeWidth={2.5} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => onRemoveIngredient(index)}
                activeOpacity={0.7}
              >
                <Trash2 size={15} color={colors.error} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
