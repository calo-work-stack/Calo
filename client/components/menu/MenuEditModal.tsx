import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { X, Trash2 } from "lucide-react-native";
import { api } from "@/src/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MenuEditModalProps {
  visible: boolean;
  menuId: string;
  initialTitle: string;
  initialDescription: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export const MenuEditModal = React.memo(
  ({
    visible,
    menuId,
    initialTitle,
    initialDescription,
    onClose,
    onSaved,
    onDeleted,
  }: MenuEditModalProps) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
      if (visible) {
        setTitle(initialTitle);
        setDescription(initialDescription);
      }
    }, [visible, initialTitle, initialDescription]);

    const handleSave = async () => {
      if (!title.trim()) return;
      setIsSaving(true);
      try {
        await api.put(`/recommended-menus/${menuId}`, {
          title: title.trim(),
          description: description.trim(),
        });
        onSaved();
        onClose();
      } catch (error) {
        console.error("Error updating menu:", error);
      } finally {
        setIsSaving(false);
      }
    };

    const handleDelete = () => {
      Alert.alert(
        t("menu_crud.delete_menu"),
        t("menu_crud.delete_confirm"),
        [
          { text: t("menu_crud.cancel"), style: "cancel" },
          {
            text: t("menu_crud.delete_menu"),
            style: "destructive",
            onPress: async () => {
              setIsDeleting(true);
              try {
                await api.delete(`/recommended-menus/${menuId}`);
                onDeleted();
                onClose();
              } catch (error) {
                console.error("Error deleting menu:", error);
              } finally {
                setIsDeleting(false);
              }
            },
          },
        ]
      );
    };

    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.content, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {t("menu_crud.edit_menu")}
              </Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t("menu_crud.menu_title")}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={title}
                onChangeText={setTitle}
                placeholder={t("menu_crud.menu_title")}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.label, { color: colors.text }]}>
                {t("menu_crud.menu_description")}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={description}
                onChangeText={setDescription}
                placeholder={t("menu_crud.menu_description")}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.actions}>
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
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <>
                    <Trash2 size={18} color={colors.error} />
                    <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                      {t("menu_crud.delete_menu")}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
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
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
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
  form: {
    gap: 8,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
  },
  actions: {
    gap: 12,
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
