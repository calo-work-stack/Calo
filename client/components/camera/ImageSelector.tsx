import React, { useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Animated,
  Dimensions 
} from "react-native";
import { Camera, Image as ImageIcon, Sparkles, Zap } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");

interface ImageSelectorProps {
  onTakePhoto: () => void;
  onSelectFromGallery: () => void;
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({
  onTakePhoto,
  onSelectFromGallery,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Shimmer animation
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width * 2],
  });

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={["#000000", "#0A0A0A", "#000000"]}
        style={styles.background}
      />

      <View style={styles.contentWrapper}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.titleRow}>
            <Text style={styles.title}>
              {t("camera.title") || "Meal Scanner"}
            </Text>
            <View style={styles.sparkleIcon}>
              <Sparkles size={28} color="#10B981" strokeWidth={2.5} />
            </View>
          </View>
          <Text style={styles.subtitle}>
            {t("camera.subtitle") ||
              "Capture or select a photo to instantly analyze your meal's nutrition"}
          </Text>
        </Animated.View>

        {/* Cards Container */}
        <View style={styles.cardsContainer}>
          {/* Take Photo Card */}
          <Animated.View
            style={[
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.primaryCard}
              onPress={onTakePhoto}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryGradient}
              >
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
                      "rgba(255,255,255,0.2)",
                      "rgba(255,255,255,0)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shimmerGradient}
                  />
                </Animated.View>

                <View style={styles.primaryCardContent}>
                  <View style={styles.primaryIconWrapper}>
                    <Camera size={48} color="#FFF" strokeWidth={2} />
                  </View>
                  
                  <View style={styles.primaryTextContent}>
                    <Text style={styles.primaryTitle}>
                      {t("camera.takePhoto") || "Take Photo"}
                    </Text>
                    <Text style={styles.primaryDescription}>
                      Use your camera to capture
                    </Text>
                  </View>

                  <View style={styles.primaryArrow}>
                    <Zap size={24} color="#FFF" strokeWidth={2.5} fill="#FFF" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Gallery Card */}
          <Animated.View
            style={[
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.secondaryCard}
              onPress={onSelectFromGallery}
              activeOpacity={0.85}
            >
              <BlurView intensity={40} tint="dark" style={styles.secondaryBlur}>
                <View style={styles.secondaryContent}>
                  <View style={styles.secondaryIconWrapper}>
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      style={styles.secondaryIconGradient}
                    >
                      <ImageIcon size={32} color="#FFF" strokeWidth={2} />
                    </LinearGradient>
                  </View>

                  <View style={styles.secondaryTextContent}>
                    <Text style={styles.secondaryTitle}>
                      {t("camera.chooseFromGallery") || "Choose from Gallery"}
                    </Text>
                    <Text style={styles.secondaryDescription}>
                      Select from your photos
                    </Text>
                  </View>

                  <View style={styles.secondaryArrow}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Footer Tips */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <BlurView intensity={30} tint="dark" style={styles.footerBlur}>
            <View style={styles.footerContent}>
              <View style={styles.tipIcon}>
                <Sparkles size={16} color="#10B981" strokeWidth={2} />
              </View>
              <Text style={styles.footerText}>
                Well-lit photos produce the most accurate results
              </Text>
            </View>
          </BlurView>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  header: {
    marginBottom: 40,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -1.5,
  },
  sparkleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(16,185,129,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 24,
    letterSpacing: -0.1,
    maxWidth: "90%",
  },
  cardsContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
  },
  primaryCard: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  primaryGradient: {
    position: "relative",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width * 0.5,
    height: "100%",
  },
  shimmerGradient: {
    flex: 1,
  },
  primaryCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    minHeight: 130,
  },
  primaryIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  primaryTextContent: {
    flex: 1,
  },
  primaryTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  primaryDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  primaryArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  secondaryBlur: {
    borderRadius: 24,
  },
  secondaryContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    minHeight: 110,
  },
  secondaryIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 18,
    overflow: "hidden",
    marginRight: 16,
  },
  secondaryIconGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryTextContent: {
    flex: 1,
  },
  secondaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  secondaryDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  secondaryArrow: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 32,
    fontWeight: "200",
    color: "rgba(255,255,255,0.6)",
  },
  footer: {
    marginTop: 24,
  },
  footerBlur: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(16,185,129,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 18,
    fontWeight: "500",
  },
});