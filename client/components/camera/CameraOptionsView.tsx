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
      <LinearGradient colors={["#10B981", "#059669"]} style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capture {selectedMealType.label}</Text>
        <View style={styles.headerButton} />
      </LinearGradient>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onTakePhoto}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#10B981", "#059669"]}
            style={styles.primaryButtonGradient}
          >
            <Camera size={32} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Take Photo</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onSelectFromGallery}
          activeOpacity={0.8}
        >
          <ImageIcon size={24} color="#10B981" />
          <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>
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
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: "#10B981",
    borderRadius: 16,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#10B981",
  },
});
