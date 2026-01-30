import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Trash2,
  RefreshCw,
  CircleCheck as CheckCircle2,
  X,
  MessageSquare,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";

interface ActionButtonsProps {
  onDelete: () => void;
  onReAnalyze: (additionalMessage: string) => void;
  onSave: () => void;
  isUpdating: boolean;
  isPosting: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onDelete,
  onReAnalyze,
  onSave,
  isUpdating,
  isPosting,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showReanalyzeModal, setShowReanalyzeModal] = useState(false);
  const [reanalyzeMessage, setReanalyzeMessage] = useState("");

  const handleReanalyzePress = () => {
    setShowReanalyzeModal(true);
  };

  const handleConfirmReanalyze = () => {
    setShowReanalyzeModal(false);
    onReAnalyze(reanalyzeMessage);
    setReanalyzeMessage("");
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onSave}
          disabled={isPosting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.success, colors.success]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryGradient}
          >
            {isPosting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <>
                <CheckCircle2 size={24} color={colors.onPrimary} />
                <Text style={[styles.primaryText, { color: colors.onPrimary }]}>
                  {t("camera.saveMeal")}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.secondaryButtons}>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.reanalyzeButton, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
            onPress={handleReanalyzePress}
            disabled={isUpdating}
            activeOpacity={0.7}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <RefreshCw size={20} color={colors.primary} />
            )}
            <Text style={[styles.secondaryText, { color: colors.primary }]}>
              {isUpdating ? t("common.updating") : t("camera.reanalyze")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, styles.deleteButton, { backgroundColor: colors.error + "15", borderColor: colors.error + "30" }]}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={20} color={colors.error} />
            <Text style={[styles.secondaryText, { color: colors.error }]}>
              {t("common.delete")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showReanalyzeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReanalyzeModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("camera.reanalyzeMeal")}
              </Text>
              <TouchableOpacity onPress={() => setShowReanalyzeModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputHeader}>
                <MessageSquare size={18} color={colors.success} />
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {t("camera.additionalInfoOptional")}
                </Text>
              </View>
              <TextInput
                style={[styles.messageInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={reanalyzeMessage}
                onChangeText={setReanalyzeMessage}
                placeholder={t("camera.addDetailsPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { backgroundColor: colors.border }]}
                onPress={() => setShowReanalyzeModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirmReanalyze}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalConfirmGradient}
                >
                  <RefreshCw size={20} color={colors.onPrimary} />
                  <Text style={[styles.modalConfirmText, { color: colors.onPrimary }]}>
                    {t("camera.reanalyze")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  primaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  primaryText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryButtons: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
  },
  reanalyzeButton: {},
  deleteButton: {},
  secondaryText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 24,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalBody: {
    padding: 20,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalConfirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
