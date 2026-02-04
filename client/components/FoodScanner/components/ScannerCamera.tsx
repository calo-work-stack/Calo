import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { CameraView } from "expo-camera";
import { QrCode, Camera as CameraIcon, Sparkles } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

const { width, height } = Dimensions.get("window");
const SCANNER_SIZE = Math.min(width - 48, height * 0.45);
const FRAME_SIZE = Math.min(220, SCANNER_SIZE - 80);

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
  const { t } = useTranslation();

  const scanLineTranslateY = scanLineAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-FRAME_SIZE / 2 + 20, FRAME_SIZE / 2 - 20],
  });

  const renderCorner = (position: "tl" | "tr" | "bl" | "br") => {
    const cornerStyles: Record<string, object> = {
      tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
      tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
      bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
      br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
    };
    return (
      <View
        style={[
          styles.cornerBracket,
          cornerStyles[position],
          { borderColor: colors.primary },
        ]}
      />
    );
  };

  const renderOverlay = () => (
    <View style={styles.cameraOverlay}>
      {/* Top overlay */}
      <View
        style={[styles.overlayTop, { backgroundColor: "rgba(0,0,0,0.6)" }]}
      />

      {/* Middle row */}
      <View style={styles.overlayMiddle}>
        <View
          style={[styles.overlaySide, { backgroundColor: "rgba(0,0,0,0.6)" }]}
        />

        {/* Scan frame */}
        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            {renderCorner("tl")}
            {renderCorner("tr")}
            {renderCorner("bl")}
            {renderCorner("br")}

            {/* Scan line */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  backgroundColor: colors.primary,
                  transform: [{ translateY: scanLineTranslateY }],
                },
              ]}
            />

            {/* Center icon */}
            <Animated.View
              style={[
                styles.centerGlow,
                { transform: [{ scale: pulseAnimation }] },
              ]}
            >
              <View
                style={[
                  styles.glowCircle,
                  {
                    backgroundColor: colors.primary + "20",
                    borderColor: colors.primary + "40",
                  },
                ]}
              >
                {scanMode === "barcode" ? (
                  <QrCode size={28} color={colors.primary} strokeWidth={2} />
                ) : (
                  <CameraIcon
                    size={28}
                    color={colors.primary}
                    strokeWidth={2}
                  />
                )}
              </View>
            </Animated.View>
          </View>
        </View>

        <View
          style={[styles.overlaySide, { backgroundColor: "rgba(0,0,0,0.6)" }]}
        />
      </View>

      {/* Bottom overlay with instructions */}
      <View
        style={[styles.overlayBottom, { backgroundColor: "rgba(0,0,0,0.6)" }]}
      >
      </View>
    </View>
  );

  return (
    <View style={[styles.cameraWrapper, { backgroundColor: colors.surface }]}>
      {scanMode === "image" ? (
        <TouchableOpacity
          style={styles.cameraView}
          onPress={onImageScan}
          activeOpacity={0.9}
        >
          <View
            style={[
              styles.placeholderCamera,
              { backgroundColor: colors.border },
            ]}
          >
            {renderOverlay()}
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
          {renderOverlay()}
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cameraWrapper: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    borderRadius: 24,
    overflow: "hidden",
  },
  cameraView: {
    flex: 1,
  },
  placeholderCamera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
  },
  overlayTop: {
    height: (SCANNER_SIZE - FRAME_SIZE) / 2,
  },
  overlayMiddle: {
    flexDirection: "row",
    height: FRAME_SIZE,
  },
  overlaySide: {
    width: (SCANNER_SIZE - FRAME_SIZE) / 2,
  },
  scanFrameContainer: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: "relative",
  },
  cornerBracket: {
    position: "absolute",
    width: 28,
    height: 28,
  },
  scanLine: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 2,
    borderRadius: 1,
  },
  centerGlow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -28,
    marginLeft: -28,
  },
  glowCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayBottom: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 20,
  },
  instructionContainer: {
    alignItems: "center",
    gap: 8,
  },
  aiIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aiIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  instructionText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
