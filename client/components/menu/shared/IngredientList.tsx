import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, ChefHat } from "lucide-react-native";

interface Ingredient {
  ingredient_id: string;
  name: string;
  quantity: number | string;
  unit?: string;
  category?: string;
  estimated_cost?: number;
  checked?: boolean;
}

interface IngredientListProps {
  ingredients: Ingredient[];
  showPrices?: boolean;
  checkable?: boolean;
  checkedIds?: Set<string>;
  onToggle?: (ingredientId: string, mealId: string) => void;
  mealId?: string;
}

export const IngredientList = React.memo(
  ({
    ingredients,
    showPrices = true,
    checkable = false,
    checkedIds,
    onToggle,
    mealId,
  }: IngredientListProps) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    const totalCost = useMemo(() => {
      if (!showPrices) return 0;
      return ingredients.reduce(
        (sum, ing) => sum + (ing.estimated_cost || 0),
        0
      );
    }, [ingredients, showPrices]);

    const hasPrices = showPrices && totalCost > 0;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <ChefHat size={16} color={colors.warmOrange} />
          <Text style={[styles.title, { color: colors.text }]}>
            {t("active_menu.ingredients", "Ingredients")}
          </Text>
          <View
            style={[
              styles.countBadge,
              { backgroundColor: colors.warmOrange + "18" },
            ]}
          >
            <Text style={[styles.countText, { color: colors.warmOrange }]}>
              {checkable && checkedIds
                ? `${ingredients.filter((i) => checkedIds.has(i.ingredient_id)).length}/${ingredients.length}`
                : ingredients.length}
            </Text>
          </View>
        </View>

        <View style={styles.list}>
          {ingredients.map((ingredient) => {
            const isChecked = checkable && checkedIds?.has(ingredient.ingredient_id);
            const quantityText =
              ingredient.unit
                ? `${ingredient.quantity} ${ingredient.unit}`
                : `${ingredient.quantity}`;

            return (
              <Pressable
                key={ingredient.ingredient_id}
                onPress={
                  checkable && onToggle && mealId
                    ? () => onToggle(ingredient.ingredient_id, mealId)
                    : undefined
                }
                disabled={!checkable}
                style={[
                  styles.item,
                  isChecked && { backgroundColor: colors.success + "08" },
                ]}
              >
                {/* Left: check circle or colored dot */}
                {checkable ? (
                  isChecked ? (
                    <CheckCircle2
                      size={20}
                      color={colors.success}
                      fill={colors.success}
                    />
                  ) : (
                    <Circle size={20} color={colors.border} />
                  )
                ) : (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: colors.warmOrange + "60" },
                    ]}
                  />
                )}

                {/* Middle: quantity + name */}
                <View style={styles.textContainer}>
                  <Text
                    style={[
                      styles.ingredientText,
                      { color: colors.text },
                      isChecked && styles.checkedText,
                    ]}
                  >
                    <Text style={styles.quantityText}>{quantityText}</Text>
                    {"  "}
                    {ingredient.name}
                  </Text>
                </View>

                {/* Right: price */}
                {hasPrices && ingredient.estimated_cost != null && ingredient.estimated_cost > 0 && (
                  <Text
                    style={[
                      styles.priceText,
                      { color: colors.textSecondary },
                      isChecked && styles.checkedText,
                    ]}
                  >
                    {"\u20AA"}{ingredient.estimated_cost.toFixed(1)}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Total cost footer */}
        {hasPrices && (
          <View
            style={[
              styles.totalRow,
              { borderTopColor: colors.border },
            ]}
          >
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              {t("ingredients.total_cost", "Total Cost")}
            </Text>
            <Text style={[styles.totalValue, { color: colors.warmOrange }]}>
              {"\u20AA"}{totalCost.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: "auto",
  },
  countText: {
    fontSize: 13,
    fontWeight: "800",
  },
  list: {
    gap: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  textContainer: {
    flex: 1,
  },
  ingredientText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  quantityText: {
    fontWeight: "700",
  },
  checkedText: {
    textDecorationLine: "line-through",
    opacity: 0.5,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "800",
  },
});
