import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { CameraView } from "expo-camera";
import { QrCode, Camera as CameraIcon } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";

const { width } = Dimensions.get("window");

interface ScannerCameraProps {
  scanMode: "barcode" | "image";
  onBarcodeScan: (result: any) => void;
  onImageScan: () => void;
  scanLineAnimation: Animated.Value;
  pulseAnimation: Animated.Value;
}

export default function ScannerCamera({
  scanMode,
  onBarcodeScan,
  onImageScan,
  scanLineAnimation,
  pulseAnimation,
}: ScannerCameraProps) {
  const { colors } = useTheme();

  const scanLineTranslateY = scanLineAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <View style={styles.cameraWrapper}>
      {scanMode === "image" ? (
        <TouchableOpacity style={styles.cameraView} onPress={onImageScan}>
          <View style={styles.cameraOverlay}>
            <View style={[styles.scanFrame, { borderColor: colors.glass }]}>
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    backgroundColor: colors.emerald100,
                    transform: [{ translateY: scanLineTranslateY }],
                  },
                ]}
              />
            </View>

            <Animated.View
              style={[
                styles.scanIcon,
                { transform: [{ scale: pulseAnimation }] },
              ]}
            >
              <CameraIcon size={40} color={colors.onPrimary} />
            </Animated.View>
          </View>
        </TouchableOpacity>
      ) : (
        <CameraView
          style={styles.cameraView}
          onBarcodeScanned={onBarcodeScan}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "code128", "code39"],
          }}
        >
          <View style={styles.cameraOverlay}>
            <View style={[styles.scanFrame, { borderColor: colors.glass }]}>
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    backgroundColor: colors.success,
                    transform: [{ translateY: scanLineTranslateY }],
                  },
                ]}
              />
            </View>

            <Animated.View
              style={[
                styles.scanIcon,
                { transform: [{ scale: pulseAnimation }] },
              ]}
            >
              <QrCode size={40} color={colors.onPrimary} />
            </Animated.View>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cameraWrapper: {
    width: width -12 ,
    height: width - 12,
    borderRadius: 28,
    overflow: "hidden",
  },
  cameraView: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderRadius: 24,
    borderWidth: 1,
  },
  scanLine: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 100,
    height: 2,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  scanIcon: {
    marginTop: 28,
  },
});