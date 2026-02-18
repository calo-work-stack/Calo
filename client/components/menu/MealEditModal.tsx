import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { X, Trash2, Plus, Minus } from "lucide-react-native";
import { api } from "@/src/services/api";

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

interface MealEditModalProps {
  visible: boolean;
  menuId: string;
  mealId: string;
  initialData: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    instructions: string;
    ingredients: Ingredient[];
  };
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export const MealEditModal = React.memo(
  ({
    visible,
    menuId,
    mealId,
    initialData,
    onClose,
    onSaved,
    onDeleted,
  }: MealEditModalProps) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    const [name, setName] = useState(initialData.name);
    const [calories, setCalories] = useState(String(initialData.calories));
    const [protein, setProtein] = useState(String(initialData.protein));
    const [carbs, setCarbs] = useState(String(initialData.carbs));
    const [fat, setFat] = useState(String(initialData.fat));
    const [instructions, setInstructions] = useState(initialData.instructions);
    const [ingredients, setIngredients] = useState<Ingredient[]>(initialData.ingredients);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
      if (visible) {
        setName(initialData.name);
        setCalories(String(initialData.calories));
        setProtein(String(initialData.protein));
        setCarbs(String(initialData.carbs));
        setFat(String(initialData.fat));
        setInstructions(initialData.instructions);
        setIngredients(initialData.ingredients);
      }
    }, [visible, initialData]);

    const handleSave = async () => {
      if (!name.trim()) return;
      setIsSaving(true);
      try {
        await api.put(`/recommended-menus/${menuId}/meals/${mealId}`, {
          name: name.trim(),
          calories: parseFloat(calories) || 0,
          protein: parseFloat(protein) || 0,
          carbs: parseFloat(carbs) || 0,
          fat: parseFloat(fat) || 0,
          instructions: instructions.trim(),
          ingredients: ingredients.filter((i) => i.name.trim()),
        });
        onSaved();
        onClose();
      } catch (error) {
        console.error("Error updating meal:", error);
      } finally {
        setIsSaving(false);
      }
    };

    const handleDelete = () => {
      Alert.alert(
        t("menu_crud.delete_meal"),
        t("menu_crud.delete_meal_confirm"),
        [
          { text: t("menu_crud.cancel"), style: "cancel" },
          {
            text: t("menu_crud.delete_meal"),
            style: "destructive",
            onPress: async () => {
              setIsDeleting(true);
              try {
                await api.delete(`/recommended-menus/${menuId}/meals/${mealId}`);
                onDeleted();
                onClose();
              } catch (error) {
                console.error("Error deleting meal:", error);
              } finally {
                setIsDeleting(false);
              }
            },
          },
        ]
      );
    };

    const addIngredient = () => {
      setIngredients([...ingredients, { name: "", quantity: 1, unit: "piece" }]);
    };

    const removeIngredient = (index: number) => {
      setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
      const updated = [...ingredients];
      updated[index] = { ...updated[index], [field]: value };
      setIngredients(updated);
    };

    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.content, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {t("menu_crud.edit_meal")}
              </Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t("menu_crud.meal_name")}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.label, { color: colors.text }]}>
                {t("menu.macros", "Macros")}
              </Text>
              <View style={styles.macrosRow}>
                {[
                  { label: "Cal", value: calories, setter: setCalories },
                  { label: "P", value: protein, setter: setProtein },
                  { label: "C", value: carbs, setter: setCarbs },
                  { label: "F", value: fat, setter: setFat },
                ].map((macro) => (
                  <View key={macro.label} style={styles.macroInput}>
                    <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                      {macro.label}
                    </Text>
                    <TextInput
                      style={[styles.macroField, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                      value={macro.value}
                      onChangeText={macro.setter}
                      keyboardType="numeric"
                    />
                  </View>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>
                {t("menu_crud.instructions")}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={instructions}
                onChangeText={setInstructions}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.ingredientsHeader}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {t("active_menu.ingredients", "Ingredients")}
                </Text>
                <Pressable onPress={addIngredient} style={[styles.addIngBtn, { backgroundColor: colors.warmOrange + "15" }]}>
                  <Plus size={16} color={colors.warmOrange} />
                  <Text style={[styles.addIngText, { color: colors.warmOrange }]}>
                    {t("menu_crud.add_ingredient")}
                  </Text>
                </Pressable>
              </View>

              {ingredients.map((ing, index) => (
                <View key={index} style={[styles.ingredientRow, { borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.ingNameInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={ing.name}
                    onChangeText={(v) => updateIngredient(index, "name", v)}
                    placeholder={t("menu_crud.ingredient_name")}
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.ingQtyInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={String(ing.quantity)}
                    onChangeText={(v) => updateIngredient(index, "quantity", parseFloat(v) || 0)}
                    keyboardType="numeric"
                  />
                  <Pressable onPress={() => removeIngredient(index)} style={styles.removeIngBtn}>
                    <Minus size={16} color={colors.error} />
                  </Pressable>
                </View>
              ))}

              <View style={styles.bottomActions}>
                <Pressable
                  onPress={handleSave}
                  disabled={isSaving}
                  style={[styles.saveButton, { backgroundColor: colors.warmOrange }]}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t("menu_crud.save_changes")}</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleDelete}
                  disabled={isDeleting}
                  style={[styles.deleteButton, { backgroundColor: colors.error + "15" }]}
                >
                  <Trash2 size={18} color={colors.error} />
                  <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                    {t("menu_crud.delete_meal")}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
  },
  macrosRow: {
    flexDirection: "row",
    gap: 8,
  },
  macroInput: {
    flex: 1,
    gap: 4,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  macroField: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    fontSize: 15,
    textAlign: "center",
  },
  ingredientsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  addIngBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  addIngText: {
    fontSize: 13,
    fontWeight: "600",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  ingNameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  ingQtyInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    textAlign: "center",
  },
  removeIngBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomActions: {
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  deleteButton: {
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
