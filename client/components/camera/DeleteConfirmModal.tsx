import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { TriangleAlert as AlertTriangle } from "lucide-react-native";
import { useTranslation } from "react-i18next";

interface DeleteConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export function DeleteConfirmModal({
  visible,
  onCancel,
  onConfirm,
  title,
  message,
}: DeleteConfirmModalProps) {
  const { t } = useTranslation();

  const resolvedTitle = title ?? t("camera.delete_analysis");
  const resolvedMessage = message ?? t("camera.delete_confirmation");

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalContent}>
          <AlertTriangle size={48} color="#EF4444" />
          <Text style={styles.confirmTitle}>{resolvedTitle}</Text>
          <Text style={styles.confirmMessage}>{resolvedMessage}</Text>

          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={styles.confirmCancelButton}
              onPress={onCancel}
            >
              <Text style={styles.confirmCancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmDeleteButton}
              onPress={onConfirm}
            >
              <Text style={styles.confirmDeleteText}>{t("common.delete")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  confirmModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginHorizontal: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  confirmCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
