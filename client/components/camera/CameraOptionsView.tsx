import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  Camera,
  Image as ImageIcon,
  ArrowLeft,
  Sparkles,
} from "lucide-react-native";
import { MealType } from "./MealTypeSelector";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";

interface CameraOptionsViewProps {
  selectedMealType: MealType;
  onBack: () => void;
  onTakePhoto: () => void;
  onSelectFromGallery: () => void;
}

export function CameraOptionsView({
  selectedMealType,
  onBack,
  onTakePhoto,
  onSelectFromGallery,
}: CameraOptionsViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={onBack}
          activeOpacity={0.6}
        >
          <ArrowLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>

        <View style={[styles.mealTypeBadge, { backgroundColor: colors.surface }]}>
          <Text style={styles.mealTypeIcon}>{selectedMealType.icon}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {selectedMealType.label}
          </Text>
        </View>

        <View style={styles.backButton} />
      </View>

      {/* AI Features Banner */}
      <View style={[styles.aiBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.aiIconBox, { backgroundColor: colors.primary + "15" }]}>
          <Sparkles size={20} color={colors.primary} strokeWidth={2.5} />
        </View>
        <View style={styles.aiBannerText}>
          <Text style={[styles.aiBannerTitle, { color: colors.text }]}>
            {t("camera.aiAnalysis", "AI-Powered Analysis")}
          </Text>
          <Text style={[styles.aiBannerSubtitle, { color: colors.textSecondary }]}>
            {t("camera.getNutritionInfo")}
          </Text>
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {t("camera.title")}
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.primary }]} />
        </View>

        {/* Primary Action - Take Photo */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={onTakePhoto}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.onPrimary + "30" }]}>
            <Camera size={28} color={colors.onPrimary} strokeWidth={2} />
          </View>
          <Text style={[styles.primaryText, { color: colors.onPrimary }]}>
            {t("camera.takePhoto")}
          </Text>
        </TouchableOpacity>

        {/* Divider with text */}
        <View style={styles.orDividerContainer}>
          <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.orText, { color: colors.textSecondary }]}>
            {t("common.or")}
          </Text>
          <View style={[styles.orLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Secondary Action - Gallery */}
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={onSelectFromGallery}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircleOutline, { borderColor: colors.primary + "50" }]}>
            <ImageIcon size={24} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={[styles.secondaryText, { color: colors.primary }]}>
            {t("camera.chooseFromGallery")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer hint */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {t("camera.getNutritionInfo")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  mealTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mealTypeIcon: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  aiBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  aiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  aiBannerText: {
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  aiBannerSubtitle: {
    fontSize: 13,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "300",
    marginBottom: 16,
  },
  divider: {
    width: 60,
    height: 2,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: 18,
    fontWeight: "600",
  },
  orDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 13,
    fontWeight: "500",
    marginHorizontal: 16,
    textTransform: "uppercase",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconCircleOutline: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
  },
});
