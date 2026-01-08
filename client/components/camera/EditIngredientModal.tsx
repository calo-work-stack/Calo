import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { X } from "lucide-react-native";
import { Ingredient } from "@/src/types/camera";

const { width: screenWidth } = Dimensions.get("window");

interface EditIngredientModalProps {
  visible: boolean;
  ingredient: Ingredient | null;
  isEditing: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpdateField: (field: keyof Ingredient, value: string | number) => void;
}

export function EditIngredientModal({
  visible,
  ingredient,
  isEditing,
  onClose,
  onSave,
  onUpdateField,
}: EditIngredientModalProps) {
  if (!ingredient) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Edit" : "Add"} Ingredient
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={ingredient.name}
                onChangeText={(text) => onUpdateField("name", text)}
                placeholder="Enter ingredient name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Calories</Text>
                <TextInput
                  style={styles.modalInput}
                  value={ingredient.calories?.toString() || "0"}
                  onChangeText={(text) =>
                    onUpdateField("calories", parseFloat(text) || 0)
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={ingredient.protein?.toString() || "0"}
                  onChangeText={(text) =>
                    onUpdateField("protein", parseFloat(text) || 0)
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={ingredient.carbs?.toString() || "0"}
                  onChangeText={(text) =>
                    onUpdateField("carbs", parseFloat(text) || 0)
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Fat (g)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={ingredient.fat?.toString() || "0"}
                  onChangeText={(text) =>
                    onUpdateField("fat", parseFloat(text) || 0)
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Fiber (g)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={ingredient.fiber?.toString() || "0"}
                  onChangeText={(text) =>
                    onUpdateField("fiber", parseFloat(text) || 0)
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Sugar (g)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={ingredient.sugar?.toString() || "0"}
                  onChangeText={(text) =>
                    onUpdateField("sugar", parseFloat(text) || 0)
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sodium (mg)</Text>
              <TextInput
                style={styles.modalInput}
                value={ingredient.sodium_mg?.toString() || "0"}
                onChangeText={(text) =>
                  onUpdateField("sodium_mg", parseFloat(text) || 0)
                }
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalSaveButton} onPress={onSave}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: screenWidth - 40,
    maxHeight: "80%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    gap: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 16,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
