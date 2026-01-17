import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
  Keyboard,
} from "react-native";
import { X, RotateCcw, Sparkles } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

const { width, height } = Dimensions.get("window");

interface SelectedImageProps {
  imageUri: string;
  userComment: string;
  isAnalyzing: boolean;
  hasBeenAnalyzed: boolean;
  onRemoveImage: () => void;
  onRetakePhoto: () => void;
  onAnalyze: () => void;
  onCommentChange: (text: string) => void;
}

export const SelectedImage: React.FC<SelectedImageProps> = ({
  imageUri,
  userComment,
  isAnalyzing,
  hasBeenAnalyzed,
  onRemoveImage,
  onRetakePhoto,
  onAnalyze,
  onCommentChange,
}) => {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const scannerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const [showDetailsInput, setShowDetailsInput] = useState(false);
  const [inputHeight, setInputHeight] = useState(110);
  const inputHeightAnim = useRef(new Animated.Value(110)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 45,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: e.endCoordinates.height,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    if (isAnalyzing) {
      // Smooth vertical scanner
      Animated.loop(
        Animated.timing(scannerAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        })
      ).start();

      // Gentle pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Elegant rotation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      ).start();

      // Glow breathing
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Ripple effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(rippleAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isAnalyzing]);

  const scannerTranslateY = scannerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, height * 0.65],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 0.2, 0],
  });

  const handleStartAnalysis = () => {
    setShowDetailsInput(false);
    onAnalyze();
  };

  const handleContentSizeChange = (event: any) => {
    const newHeight = Math.min(
      Math.max(event.nativeEvent.contentSize.height, 110),
      220
    );
    setInputHeight(newHeight);
    Animated.spring(inputHeightAnim, {
      toValue: newHeight,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.imageContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image source={{ uri: imageUri }} style={styles.image} />

        <LinearGradient
          colors={[
            "rgba(0,0,0,0.4)",
            "rgba(0,0,0,0.05)",
            "rgba(0,0,0,0.05)",
            "rgba(0,0,0,0.7)",
          ]}
          locations={[0, 0.2, 0.7, 1]}
          style={styles.gradient}
        />

        {/* Minimalist Top Actions */}
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRemoveImage}
            activeOpacity={0.7}
          >
            <BlurView intensity={40} tint="dark" style={styles.iconButtonBlur}>
              <X size={20} color="#FFF" strokeWidth={2.5} />
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRetakePhoto}
            activeOpacity={0.7}
          >
            <BlurView intensity={40} tint="dark" style={styles.iconButtonBlur}>
              <RotateCcw size={20} color="#FFF" strokeWidth={2.5} />
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Refined Scanning Animation */}
        {isAnalyzing && (
          <View style={styles.scanOverlay}>
            {/* Outer Ripple */}
            <Animated.View
              style={[
                styles.rippleRing,
                {
                  opacity: rippleOpacity,
                  transform: [{ scale: rippleScale }],
                },
              ]}
            >
              <View style={styles.rippleBorder} />
            </Animated.View>

            {/* Rotating Outer Ring */}
            <Animated.View
              style={[
                styles.outerRing,
                {
                  transform: [{ rotate }, { scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.ringBorder} />
            </Animated.View>

            {/* Inner Ring */}
            <Animated.View
              style={[
                styles.innerRing,
                {
                  opacity: glowAnim,
                },
              ]}
            >
              <View style={styles.innerRingBorder} />
            </Animated.View>

            {/* Center Orb */}
            <Animated.View
              style={[
                styles.centerOrb,
                {
                  opacity: glowAnim,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <BlurView intensity={60} tint="dark" style={styles.orbBlur}>
                <LinearGradient
                  colors={["#14B8A6", "#0D9488"]}
                  style={styles.orbGradient}
                >
                  <Sparkles size={28} color="#FFF" strokeWidth={2} />
                </LinearGradient>
              </BlurView>
            </Animated.View>

            {/* Smooth Scan Line */}
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scannerTranslateY }] },
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(20,184,166,0)",
                  "rgba(20,184,166,0.6)",
                  "rgba(20,184,166,0.8)",
                  "rgba(20,184,166,0.6)",
                  "rgba(20,184,166,0)",
                ]}
                style={styles.scanGradient}
              />
            </Animated.View>
          </View>
        )}
      </Animated.View>

      {/* Clean Bottom UI - Initial */}
      {!isAnalyzing && !hasBeenAnalyzed && !showDetailsInput && (
        <Animated.View
          style={[
            styles.bottomSheet,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <BlurView intensity={80} tint="dark" style={styles.sheet}>
            <TouchableOpacity
              style={styles.mainButton}
              onPress={() => setShowDetailsInput(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#14B8A6", "#0D9488"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {t("camera.getNutritionInfo")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.hint}>
              {t("camera.imagePreview.tapToAnalyze")}
            </Text>
          </BlurView>
        </Animated.View>
      )}

      {/* Details Input */}
      {!isAnalyzing && !hasBeenAnalyzed && showDetailsInput && (
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: Animated.multiply(keyboardOffset, -1) },
              ],
            },
          ]}
        >
          <BlurView intensity={80} tint="dark" style={styles.inputSheet}>
            <Text style={styles.inputLabel}>{t("camera.addDetails")}</Text>

            <View style={styles.inputContainer}>
              <Animated.View
                style={[styles.inputWrapper, { height: inputHeightAnim }]}
              >
                <TextInput
                  style={styles.input}
                  value={userComment}
                  onChangeText={onCommentChange}
                  onContentSizeChange={handleContentSizeChange}
                  placeholder={t("camera.detailsPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  maxLength={200}
                  autoFocus
                  scrollEnabled={false}
                />
              </Animated.View>
              <View style={styles.inputFooter}>
                <Text style={styles.inputHint}>
                  {t("camera.imagePreview.improveAccuracy")}
                </Text>
                <Text
                  style={[
                    styles.charCount,
                    userComment.length > 180 && styles.charCountWarning,
                  ]}
                >
                  {userComment.length}/200
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleStartAnalysis}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryText}>{t("common.skip")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleStartAnalysis}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#14B8A6", "#0D9488"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryGradient}
                >
                  <Text style={styles.primaryText}>
                    {t("camera.analyzeMeal")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      )}

      {/* Analyzing State */}
      {isAnalyzing && (
        <Animated.View
          style={[
            styles.bottomSheet,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <BlurView intensity={80} tint="dark" style={styles.sheet}>
            <View style={styles.analyzingContent}>
              <ActivityIndicator size="small" color="#14B8A6" />
              <Text style={styles.analyzingText}>{t("camera.analyzing")}</Text>
            </View>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  imageContainer: {
    flex: 1,
    borderRadius: 0,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topActions: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  iconButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  iconButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  rippleRing: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  rippleBorder: {
    flex: 1,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: "#14B8A6",
  },
  outerRing: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  ringBorder: {
    flex: 1,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: "rgba(20,184,166,0.4)",
  },
  innerRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  innerRingBorder: {
    flex: 1,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.6)",
  },
  centerOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
  },
  orbBlur: {
    flex: 1,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  orbGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 80,
  },
  scanGradient: {
    flex: 1,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 28,
    paddingBottom: 44,
    paddingHorizontal: 24,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inputSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 28,
    paddingBottom: 44,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  mainButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#14B8A6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "400",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  input: {
    padding: 16,
    fontSize: 15,
    color: "#FFF",
    fontWeight: "400",
    textAlignVertical: "top",
    height: "100%",
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  inputHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "400",
    flex: 1,
    marginRight: 12,
  },
  charCount: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "500",
  },
  charCountWarning: {
    color: "#F59E0B",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  secondaryText: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
    fontSize: 15,
  },
  primaryButton: {
    flex: 2,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#14B8A6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  analyzingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  analyzingText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
  },
});
