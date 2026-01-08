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
} from "react-native";
import { X, RotateCcw, Sparkles, Zap } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { t } from "i18next";

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const scannerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [showDetailsInput, setShowDetailsInput] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isAnalyzing) {
      // Scanner wave
      Animated.loop(
        Animated.timing(scannerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();

      // Subtle pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Rotate animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      ).start();

      // Shimmer effect
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isAnalyzing]);

  const scannerTranslateY = scannerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height * 0.6],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const handleStartAnalysis = () => {
    setShowDetailsInput(false);
    onAnalyze();
  };

  return (
    <View style={styles.container}>
      {/* Ultra Clean Image Display */}
      <Animated.View
        style={[
          styles.imageContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image source={{ uri: imageUri }} style={styles.image} blurRadius={2} />

        {/* Enhanced Gradient Overlay */}
        <LinearGradient
          colors={[
            "rgba(0,0,0,0.75)",
            "rgba(0,0,0,0.15)",
            "rgba(0,0,0,0.15)",
            "rgba(0,0,0,0.9)",
          ]}
          locations={[0, 0.25, 0.65, 1]}
          style={styles.gradient}
        />

        {/* Frosted Glass Effect */}
        <View style={styles.frostOverlay} />

        {/* Minimalist Top Actions */}
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRemoveImage}
            activeOpacity={0.6}
          >
            <BlurView intensity={60} tint="dark" style={styles.iconButtonBlur}>
              <X size={20} color="#FFF" strokeWidth={2} />
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRetakePhoto}
            activeOpacity={0.6}
          >
            <BlurView intensity={60} tint="dark" style={styles.iconButtonBlur}>
              <RotateCcw size={20} color="#FFF" strokeWidth={2} />
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Ultra Sleek Scanning */}
        {isAnalyzing && (
          <View style={styles.scanOverlay}>
            {/* Rotating Rings */}
            <Animated.View
              style={[
                styles.outerRing,
                {
                  transform: [{ rotate }, { scale: pulseAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={["#10B981", "rgba(16,185,129,0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ringGradient}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.innerRing,
                {
                  transform: [{ rotate: rotate }, { scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.ringBorder} />
            </Animated.View>

            {/* Center Glow */}
            <View style={styles.centerGlow}>
              <BlurView intensity={80} tint="dark" style={styles.glowBlur}>
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.glowInner}
                >
                  <Sparkles size={32} color="#FFF" strokeWidth={2} />
                </LinearGradient>
              </BlurView>
            </View>

            {/* Scanning Wave */}
            <Animated.View
              style={[
                styles.scanWave,
                { transform: [{ translateY: scannerTranslateY }] },
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(16,185,129,0)",
                  "rgba(16,185,129,0.4)",
                  "rgba(16,185,129,0)",
                ]}
                style={styles.waveGradient}
              />
            </Animated.View>

            {/* Shimmer Effect */}
            <Animated.View
              style={[
                styles.shimmer,
                { transform: [{ translateX: shimmerTranslateX }] },
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(255,255,255,0)",
                  "rgba(255,255,255,0.1)",
                  "rgba(255,255,255,0)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          </View>
        )}
      </Animated.View>

      {/* Ultra Minimal Bottom UI - Initial */}
      {!isAnalyzing && !hasBeenAnalyzed && !showDetailsInput && (
        <Animated.View
          style={[
            styles.bottomSheet,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <BlurView intensity={90} tint="dark" style={styles.sheet}>
            <TouchableOpacity
              style={styles.mainButton}
              onPress={() => setShowDetailsInput(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Zap size={20} color="#FFF" strokeWidth={2.5} fill="#FFF" />
                <Text style={styles.buttonText}>
                  {t("camera.getNutritionInfo")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.hint}>Tap to analyze instantly</Text>
          </BlurView>
        </Animated.View>
      )}

      {/* Details Input - Sleek */}
      {!isAnalyzing && !hasBeenAnalyzed && showDetailsInput && (
        <Animated.View
          style={[
            styles.bottomSheet,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <BlurView intensity={90} tint="dark" style={styles.inputSheet}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={userComment}
                onChangeText={onCommentChange}
                placeholder="Add details about your meal..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                maxLength={200}
                autoFocus
              />
              <Text style={styles.charCount}>{userComment.length}/200</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleStartAnalysis}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleStartAnalysis}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryGradient}
                >
                  <Text style={styles.primaryText}>Analyze</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      )}

      {/* Analyzing State - Minimal */}
      {isAnalyzing && (
        <Animated.View
          style={[
            styles.bottomSheet,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <BlurView intensity={90} tint="dark" style={styles.sheet}>
            <View style={styles.analyzingContent}>
              <ActivityIndicator size="small" color="#10B981" />
              <Text style={styles.analyzingText}>Analyzing your meal</Text>
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
  frostOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  topActions: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  iconButton: {
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iconButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  outerRing: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    overflow: "hidden",
  },
  ringGradient: {
    flex: 1,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: "rgba(16,185,129,0.3)",
  },
  innerRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  ringBorder: {
    flex: 1,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "rgba(16,185,129,0.5)",
  },
  centerGlow: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: "hidden",
  },
  glowBlur: {
    flex: 1,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  glowInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  scanWave: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  waveGradient: {
    flex: 1,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    width: width * 0.5,
    height: "100%",
  },
  shimmerGradient: {
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
    paddingTop: 28,
    paddingBottom: 44,
    paddingHorizontal: 24,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  inputSheet: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 28,
    paddingBottom: 44,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  mainButton: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 12,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "500",
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 18,
    fontSize: 15,
    color: "#FFF",
    minHeight: 110,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    fontWeight: "400",
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    textAlign: "right",
    marginTop: 6,
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 17,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  secondaryText: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
    fontSize: 15,
  },
  primaryButton: {
    flex: 2,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryGradient: {
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.4,
  },
  analyzingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  analyzingText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
});
