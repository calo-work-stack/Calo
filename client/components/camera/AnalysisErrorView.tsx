import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export type AnalysisErrorType = "not_food" | "technical_failure";

interface AnalysisErrorViewProps {
  errorType: AnalysisErrorType;
  imageUri?: string;
  notFoodReason?: string;
  onRetakePhoto: () => void;
  onManualEntry: () => void;
  onCancel: () => void;
}

export function AnalysisErrorView({
  errorType,
  imageUri,
  notFoodReason,
  onRetakePhoto,
  onManualEntry,
  onCancel,
}: AnalysisErrorViewProps) {
  const { t } = useTranslation();

  const isNotFood = errorType === "not_food";

  return (
    <View style={styles.container}>
      {/* Image Preview */}
      {imageUri && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} />
          <View style={styles.imageOverlay}>
            <Ionicons
              name={isNotFood ? "warning" : "alert-circle"}
              size={48}
              color="#FFFFFF"
            />
          </View>
        </View>
      )}

      {/* Error Content */}
      <View style={styles.contentContainer}>
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            isNotFood ? styles.warningIcon : styles.errorIcon,
          ]}
        >
          <Ionicons
            name={isNotFood ? "restaurant-outline" : "cloud-offline-outline"}
            size={40}
            color={isNotFood ? "#F59E0B" : "#EF4444"}
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isNotFood
            ? t("camera.notFoodTitle", "This doesn't look like food")
            : t("camera.analysisFailedTitle", "Analysis Failed")}
        </Text>

        {/* Message */}
        <Text style={styles.message}>
          {isNotFood
            ? notFoodReason ||
              t(
                "camera.notFoodMessage",
                "Please note, it seems this is not a photo of food. Try taking a photo of your meal."
              )
            : t(
                "camera.analysisFailedMessage",
                "We couldn't analyze this image. This might be due to image quality or a temporary issue."
              )}
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          {/* Retake Photo Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onRetakePhoto}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {t("camera.retakePhoto", "Take New Photo")}
            </Text>
          </TouchableOpacity>

          {/* Manual Entry Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onManualEntry}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={20} color="#10B981" />
            <Text style={styles.secondaryButtonText}>
              {t("camera.manualEntry", "Enter Manually")}
            </Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>
              {t("common.cancel", "Cancel")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  imageContainer: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  warningIcon: {
    backgroundColor: "#FEF3C7",
  },
  errorIcon: {
    backgroundColor: "#FEE2E2",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  buttonsContainer: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#10B981",
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6B7280",
  },
});
