import { useState } from "react";
import { Alert, Platform } from "react-native";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/src/store";
import {
  updateSingleIngredient,
  addIngredientToPendingMeal,
  removeIngredientFromPendingMeal,
} from "@/src/store/mealSlice";
import { Ingredient } from "@/src/types/camera";
import * as Haptics from "expo-haptics";

export function useIngredientEditor() {
  const dispatch = useDispatch<AppDispatch>();

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

  const save = () => {
    if (!editingIngredient || !editingIngredient.name.trim()) {
      Alert.alert("Error", "Ingredient name is required");
      return false;
    }

    if (editingIndex >= 0) {
      dispatch(
        updateSingleIngredient({
          index: editingIndex,
          ingredient: editingIngredient,
        })
      );
    } else {
      dispatch(addIngredientToPendingMeal(editingIngredient));
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
