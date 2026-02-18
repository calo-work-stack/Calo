import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";
import * as Haptics from "expo-haptics";

export function useImagePicker() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const requestCameraPermission = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };
    requestCameraPermission();
  }, []);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const takePhoto = async (): Promise<string | null> => {
    if (hasPermission === null) {
      Alert.alert("Error", "Camera permission is still being checked.");
      return null;
    }
    if (!hasPermission) {
      Alert.alert(
        "Permission Required",
        "Camera permission is required to take photos. Please grant permission in settings."
      );
      return null;
    }

    try {
      triggerHaptic();
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false, // Disabled to preserve full image - no cropping
        quality: 0.85,
        base64: false,
        exif: false, // Reduce data size
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        triggerHaptic();
        return imageUri;
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to take photo");
    }
    return null;
  };

  const selectFromGallery = async (): Promise<string | null> => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Gallery permission is required to select photos"
        );
        return null;
      }

      triggerHaptic();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false, // Disabled to preserve full image - no cropping
        quality: 0.85,
        base64: false,
        exif: false, // Reduce data size
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        triggerHaptic();
        return imageUri;
      }
    } catch (error) {
      console.error("Gallery error:", error);
      Alert.alert("Error", "Failed to select image");
    }
    return null;
  };

  const clearImage = () => {
    setSelectedImage(null);
    triggerHaptic();
  };

  return {
    selectedImage,
    setSelectedImage,
    hasPermission,
    takePhoto,
    selectFromGallery,
    clearImage,
  };
}
