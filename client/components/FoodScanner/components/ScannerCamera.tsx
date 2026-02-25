import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Text,
} from "react-native";
import { CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { Zap } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");
const FRAME_SIZE = width * 0.72;
const CORNER_SIZE = 32;
const CORNER_THICK = 3.5;
const CORNER_RADIUS = 10;

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
  scanLineAnimation,
  pulseAnimation,
}: ScannerCameraProps) {
  const { colors } = useTheme();

  // Corner bracket pulse
  const cornerAnim = useRef(new Animated.Value(0.7)).current;
  // Outer ring scale for "radar" pulse effect
  const ringAnim = useRef(new Animated.Value(0.88)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  // Inner glow
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Corner brackets breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(cornerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cornerAnim, {
          toValue: 0.5,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Outer ring radar pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringAnim, {
            toValue: 1.08,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringAnim, {
            toValue: 0.88,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Inner glow slow breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleBarcodeScan = useCallback(
    (result: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onBarcodeScan(result);
    },
    [onBarcodeScan]
  );

  const scanLineTranslateY = scanLineAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-FRAME_SIZE / 2 + 14, FRAME_SIZE / 2 - 14],
  });

  const renderCorner = (pos: "tl" | "tr" | "bl" | "br") => {
    const borders: Record<string, object> = {
      tl: {
        top: 0,
        left: 0,
        borderTopWidth: CORNER_THICK,
        borderLeftWidth: CORNER_THICK,
        borderTopLeftRadius: CORNER_RADIUS,
      },
      tr: {
        top: 0,
        right: 0,
        borderTopWidth: CORNER_THICK,
        borderRightWidth: CORNER_THICK,
        borderTopRightRadius: CORNER_RADIUS,
      },
      bl: {
        bottom: 0,
        left: 0,
        borderBottomWidth: CORNER_THICK,
        borderLeftWidth: CORNER_THICK,
        borderBottomLeftRadius: CORNER_RADIUS,
      },
      br: {
        bottom: 0,
        right: 0,
        borderBottomWidth: CORNER_THICK,
        borderRightWidth: CORNER_THICK,
        borderBottomRightRadius: CORNER_RADIUS,
      },
    };
    return (
      <Animated.View
        key={pos}
        style={[
          {
            position: "absolute",
            width: CORNER_SIZE,
            height: CORNER_SIZE,
            borderColor: colors.primary,
          },
          borders[pos],
          { opacity: cornerAnim },
        ]}
      />
    );
  };

  return (
    <CameraView
      style={StyleSheet.absoluteFillObject}
      onBarcodeScanned={handleBarcodeScan}
      barcodeScannerSettings={{
        barcodeTypes: ["ean13", "ean8", "upc_a", "code128", "code39"],
      }}
    >
      {/* Dark vignette overlay — darkens edges, leaves centre clear */}
      <View style={styles.vignetteWrapper} pointerEvents="none">
        {/* Top dark band */}
        <LinearGradient
          colors={["rgba(0,0,0,0.72)", "rgba(0,0,0,0)"]}
          style={styles.vignetteTop}
        />
        {/* Bottom dark band */}
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.72)"]}
          style={styles.vignetteBottom}
        />
        {/* Left dark band */}
        <LinearGradient
          colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.vignetteLeft}
        />
        {/* Right dark band */}
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.vignetteRight}
        />
      </View>

      {/* Centred scan frame */}
      <View style={styles.frameWrapper} pointerEvents="none">
        {/* Outer radar ring */}
        <Animated.View
          style={[
            styles.radarRing,
            {
              borderColor: colors.primary + "60",
              transform: [{ scale: ringAnim }],
              opacity: ringOpacity,
            },
          ]}
        />

        {/* Frame box */}
        <View style={styles.frame}>
          {/* Inner glow fill */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: colors.primary + "09",
                opacity: glowAnim,
                borderRadius: 4,
              },
            ]}
          />

          {/* Corner brackets */}
          {(["tl", "tr", "bl", "br"] as const).map(renderCorner)}

          {/* Scan line with gradient glow */}
          <Animated.View
            style={[
              styles.scanLineWrap,
              { transform: [{ translateY: scanLineTranslateY }] },
            ]}
          >
            <LinearGradient
              colors={[
                "transparent",
                colors.primary + "CC",
                colors.primary,
                colors.primary + "CC",
                "transparent",
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.scanLine}
            />
          </Animated.View>

          {/* Centre AI badge */}
          <Animated.View
            style={[
              styles.aiBadgeWrap,
              { transform: [{ scale: pulseAnimation }] },
            ]}
          >
          </Animated.View>
        </View>

        {/* Hint label below frame */}
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>Point at barcode to scan</Text>
        </View>
      </View>
    </CameraView>
  );
}

const styles = StyleSheet.create({
  // ── Vignette overlay ──────────────────────────────────────────────────────
  vignetteWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  vignetteTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "25%",
  },
  vignetteBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "25%",
  },
  vignetteLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: "18%",
  },
  vignetteRight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "18%",
  },

  // ── Frame layout ──────────────────────────────────────────────────────────
  frameWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  radarRing: {
    position: "absolute",
    width: FRAME_SIZE + 48,
    height: FRAME_SIZE + 48,
    borderRadius: (FRAME_SIZE + 48) / 2,
    borderWidth: 1.5,
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Scan line ─────────────────────────────────────────────────────────────
  scanLineWrap: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 3,
  },
  scanLine: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },

  // ── AI badge ──────────────────────────────────────────────────────────────
  aiBadgeWrap: {
    position: "absolute",
    bottom: 14,
    right: 14,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // ── Hint ──────────────────────────────────────────────────────────────────
  hintRow: {
    marginTop: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  hintText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
});
