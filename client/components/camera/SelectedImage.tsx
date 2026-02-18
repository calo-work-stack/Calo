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
  Platform,
  Keyboard,
} from "react-native";
import { X, RotateCcw, Sparkles, MessageSquare, Wand2, Zap } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { AnalysisLoadingOverlay } from "./AnalysisLoadingOverlay";
import { AnalysisPhase } from "@/hooks/camera/useMealAnalysis";

const { width, height } = Dimensions.get("window");

interface SelectedImageProps {
  imageUri: string;
  userComment: string;
  isAnalyzing: boolean;
  hasBeenAnalyzed: boolean;
  analysisPhase?: AnalysisPhase;
  analysisProgress?: number;
  analysisStatusMessage?: string;
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
  analysisPhase,
  analysisProgress,
  analysisStatusMessage,
  onRemoveImage,
  onRetakePhoto,
  onAnalyze,
  onCommentChange,
}) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const scannerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
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
      },
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      },
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
        }),
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
        ]),
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
        ]),
      ).start();
    }
  }, [isAnalyzing]);

  const scannerTranslateY = scannerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, height * 0.65],
  });

  const handleStartAnalysis = () => {
    setShowDetailsInput(false);
    onAnalyze();
  };

  const handleContentSizeChange = (event: any) => {
    const newHeight = Math.min(
      Math.max(event.nativeEvent.contentSize.height, 110),
      220,
    );
    setInputHeight(newHeight);
    Animated.spring(inputHeightAnim, {
      toValue: newHeight,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000",
    },
    imageContainer: {
      flex: 1,
      overflow: "hidden",
      backgroundColor: "#000",
    },
    imageWrapper: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    image: {
      width: "100%",
      height: "100%",
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    topActions: {
      position: "absolute",
      top: Platform.OS === "ios" ? 60 : 20,
      left: 24,
      right: 24,
      flexDirection: "row",
      justifyContent: "space-between",
      zIndex: 10,
    },
    iconButton: {
      borderRadius: 26,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
    iconButtonBlur: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.2)",
      backgroundColor: "rgba(0,0,0,0.2)",
    },
    scanOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.3)",
    },
    innerRing: {
      position: "absolute",
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: colors.primary + "15",
    },
    innerRingBorder: {
      flex: 1,
      borderRadius: 100,
      borderWidth: 2,
      borderColor: colors.primary + "80",
    },
    centerOrb: {
      width: 110,
      height: 110,
      borderRadius: 55,
      overflow: "hidden",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.7,
      shadowRadius: 24,
      elevation: 15,
      borderWidth: 3,
      borderColor: "rgba(255,255,255,0.3)",
    },
    orbBlur: {
      flex: 1,
      borderRadius: 55,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.3)",
    },
    orbGradient: {
      width: 88,
      height: 88,
      borderRadius: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    scanLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 120,
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
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      paddingTop: 36,
      paddingBottom: Platform.OS === "ios" ? 52 : 48,
      paddingHorizontal: 32,
      alignItems: "center",
      borderTopWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 15,
      backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.5)",
    },
    inputSheet: {
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      paddingTop: 36,
      paddingBottom: Platform.OS === "ios" ? 52 : 48,
      paddingHorizontal: 32,
      borderTopWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 15,
      backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.5)",
    },
    inputHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 24,
    },
    inputHeaderIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
    },
    inputHeaderText: {
      flex: 1,
    },
    inputLabel: {
      fontSize: 18,
      fontWeight: "800",
      color: "#FFF",
      letterSpacing: -0.3,
    },
    inputSubtitle: {
      fontSize: 13,
      fontWeight: "500",
      color: "rgba(255,255,255,0.5)",
      marginTop: 4,
    },
    mainButton: {
      width: "100%",
      borderRadius: 24,
      overflow: "hidden",
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 12,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
    },
    buttonGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 22,
    },
    buttonText: {
      fontSize: 19,
      fontWeight: "800",
      color: "#FFF",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    hint: {
      fontSize: 14,
      color: "rgba(255,255,255,0.5)",
      fontWeight: "600",
      letterSpacing: 0.3,
    },
    addDetailsButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      marginTop: 4,
    },
    addDetailsText: {
      fontSize: 15,
      fontWeight: "700",
      color: "rgba(255,255,255,0.65)",
      letterSpacing: 0.3,
    },
    inputContainer: {
      marginBottom: 28,
    },
    inputWrapper: {
      backgroundColor: "rgba(255,255,255,0.12)",
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.2)",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    input: {
      padding: 20,
      fontSize: 17,
      color: "#FFF",
      fontWeight: "600",
      textAlignVertical: "top",
      height: "100%",
      letterSpacing: 0.3,
    },
    inputFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      paddingHorizontal: 8,
    },
    inputHint: {
      fontSize: 13,
      color: "rgba(255,255,255,0.45)",
      fontWeight: "600",
      flex: 1,
      marginRight: 12,
      letterSpacing: 0.2,
    },
    charCount: {
      fontSize: 13,
      color: "rgba(255,255,255,0.5)",
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    charCountWarning: {
      color: "#FBBF24",
      fontWeight: "800",
    },
    exampleTags: {
      flexDirection: "row",
      gap: 8,
      flex: 1,
    },
    exampleTag: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
    },
    exampleTagText: {
      fontSize: 12,
      fontWeight: "600",
      color: "rgba(255,255,255,0.6)",
    },
    buttonRow: {
      flexDirection: "row",
      gap: 16,
    },
    secondaryButton: {
      flex: 1,
      paddingVertical: 20,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.12)",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.2)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    secondaryText: {
      color: "rgba(255,255,255,0.75)",
      fontWeight: "800",
      fontSize: 17,
      letterSpacing: 0.4,
    },
    primaryButton: {
      flex: 2,
      borderRadius: 20,
      overflow: "hidden",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 10,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
    },
    primaryGradient: {
      flexDirection: "row",
      paddingVertical: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryText: {
      color: "#FFF",
      fontWeight: "800",
      fontSize: 18,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    analyzingContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingVertical: 4,
    },
    analyzingText: {
      fontSize: 18,
      fontWeight: "700",
      color: "rgba(255,255,255,0.95)",
      letterSpacing: 0.3,
    },
  });

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
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

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
            <BlurView intensity={50} tint="dark" style={styles.iconButtonBlur}>
              <X size={24} color="#FFF" strokeWidth={3} />
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRetakePhoto}
            activeOpacity={0.7}
          >
            <BlurView intensity={50} tint="dark" style={styles.iconButtonBlur}>
              <RotateCcw size={24} color="#FFF" strokeWidth={3} />
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Analysis Loading Overlay */}
        <AnalysisLoadingOverlay
          visible={isAnalyzing}
          currentPhase={analysisPhase}
          progress={analysisProgress}
          statusMessage={analysisStatusMessage}
        />
      </Animated.View>

      {/* Clean Bottom UI - Two-Button Initial */}
      {!isAnalyzing && !hasBeenAnalyzed && !showDetailsInput && (
        <Animated.View
          style={[
            styles.bottomSheet,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <BlurView intensity={90} tint="dark" style={styles.sheet}>
            {/* Quick Analyze - primary gradient button */}
            <TouchableOpacity
              style={styles.mainButton}
              onPress={() => onAnalyze()}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Zap size={20} color="#FFF" strokeWidth={2.5} style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>
                  {t("camera.quickAnalyze")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Add Details - secondary button */}
            <TouchableOpacity
              style={styles.addDetailsButton}
              onPress={() => setShowDetailsInput(true)}
              activeOpacity={0.7}
            >
              <MessageSquare size={16} color="rgba(255,255,255,0.75)" strokeWidth={2} style={{ marginRight: 8 }} />
              <Text style={styles.addDetailsText}>
                {t("camera.addDetailsFirst")}
              </Text>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      )}

      {/* Enhanced Details Input */}
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
          <BlurView intensity={90} tint="dark" style={styles.inputSheet}>
            {/* Header with icon */}
            <View style={styles.inputHeader}>
              <View style={styles.inputHeaderIcon}>
                <MessageSquare size={20} color={colors.primary} strokeWidth={2.5} />
              </View>
              <View style={styles.inputHeaderText}>
                <Text style={styles.inputLabel}>{t("camera.addDetails")}</Text>
                <Text style={styles.inputSubtitle}>
                  {t("camera.imagePreview.improveAccuracy")}
                </Text>
              </View>
            </View>

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
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  multiline
                  maxLength={200}
                  autoFocus
                  scrollEnabled={false}
                />
              </Animated.View>
              <View style={styles.inputFooter}>
                <View style={styles.exampleTags}>
                  <View style={styles.exampleTag}>
                    <Text style={styles.exampleTagText}>{t("camera.imagePreview.exampleTags.grilled")}</Text>
                  </View>
                  <View style={styles.exampleTag}>
                    <Text style={styles.exampleTagText}>{t("camera.imagePreview.exampleTags.noOil")}</Text>
                  </View>
                  <View style={styles.exampleTag}>
                    <Text style={styles.exampleTagText}>{t("camera.imagePreview.exampleTags.homemade")}</Text>
                  </View>
                </View>
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
                  colors={[colors.primary, colors.primaryContainer || colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryGradient}
                >
                  <Wand2 size={20} color="#FFF" strokeWidth={2.5} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryText}>
                    {t("camera.analyzeMeal")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
};
