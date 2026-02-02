import { useState } from "react";
import { Alert, Platform } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/store";
import {
  updateSingleIngredient,
  addIngredientToPendingMeal,
  removeIngredientFromPendingMeal,
} from "@/src/store/mealSlice";
import { Ingredient } from "@/src/types/camera";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

export function useIngredientEditor() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { pendingMeal } = useSelector((state: RootState) => state.meal);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null
  );
  const [editingIndex, setEditingIndex] = useState<number>(-1);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const startEdit = (ingredient: Ingredient, index: number) => {
    setEditingIngredient({ ...ingredient });
    setEditingIndex(index);
    setShowEditModal(true);
    triggerHaptic();
  };

  const startAdd = () => {
    const newIngredient: Ingredient = {
      name: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium_mg: 0,
    };
    setEditingIngredient(newIngredient);
    setEditingIndex(-1);
    setShowEditModal(true);
    triggerHaptic();
  };

  const updateField = (field: keyof Ingredient, value: string | number) => {
    setEditingIngredient((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  const save = (ingredientToSave?: Ingredient) => {
    // Use passed ingredient or fall back to editingIngredient (for legacy support)
    const ingredient = ingredientToSave || editingIngredient;

    if (!ingredient || !ingredient.name.trim()) {
      Alert.alert(t("common.error"), t("ingredients.name_required"));
      return false;
    }

    // Check for duplicate ingredient when adding new (not editing)
    if (editingIndex === -1) {
      const existingIngredients = pendingMeal?.analysis?.ingredients || [];
      const ingredientName = ingredient.name.toLowerCase().trim();

      const isDuplicate = existingIngredients.some(
        (existing: Ingredient) =>
          existing.name.toLowerCase().trim() === ingredientName
      );

      if (isDuplicate) {
        Alert.alert(
          t("ingredients.duplicate_title"),
          t("ingredients.duplicate_message", { name: ingredient.name })
        );
        return false;
      }
    }

    if (editingIndex >= 0) {
      dispatch(
        updateSingleIngredient({
          index: editingIndex,
          ingredient: ingredient,
        })
      );
    } else {
      dispatch(addIngredientToPendingMeal(ingredient));
    }

    triggerHaptic();
    cancel();
    return true;
  };

  const remove = (index: number) => {
    dispatch(removeIngredientFromPendingMeal(index));
    triggerHaptic();
  };

  const cancel = () => {
    setShowEditModal(false);
    setEditingIngredient(null);
    setEditingIndex(-1);
  };

  return {
    showEditModal,
    editingIngredient,
    editingIndex,
    startEdit,
    startAdd,
    updateField,
    save,
    remove,
    cancel,
  };
}
