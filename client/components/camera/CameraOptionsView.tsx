import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, Image as ImageIcon, ArrowLeft } from "lucide-react-native";
import { MealType } from "./MealTypeSelector";

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
  return (
    <View style={styles.container}>
      {/* Minimal Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.6}
        >
          <ArrowLeft size={24} color="#14B8A6" strokeWidth={2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{selectedMealType.label}</Text>

        <View style={styles.backButton} />
      </View>

      {/* Clean Content Area */}
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Capture Your Meal</Text>
          <View style={styles.divider} />
        </View>

        {/* Primary Action - Take Photo */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onTakePhoto}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#14B8A6", "#0D9488"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryGradient}
          >
            <View style={styles.iconCircle}>
              <Camera size={28} color="#FFFFFF" strokeWidth={2} />
            </View>
            <Text style={styles.primaryText}>Take Photo</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider with text */}
        <View style={styles.orDividerContainer}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.orLine} />
        </View>

        {/* Secondary Action - Gallery */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onSelectFromGallery}
          activeOpacity={0.7}
        >
          <View style={styles.iconCircleOutline}>
            <ImageIcon size={24} color="#14B8A6" strokeWidth={2} />
          </View>
          <Text style={styles.secondaryText}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Subtle footer hint */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Get instant nutritional analysis</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "500",
    color: "#64748B",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 56,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: "300",
    color: "#1E293B",
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: "#14B8A6",
  },
  primaryButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#14B8A6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  orDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 32,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  orText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "400",
    marginHorizontal: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: "#F8FAFB",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  iconCircleOutline: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#14B8A6",
    letterSpacing: 0.2,
  },
  footer: {
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "400",
    letterSpacing: 0.3,
  },
});
