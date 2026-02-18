import { Link, Stack, useRouter } from "expo-router";
import {
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import React, { useEffect, useRef } from "react";
import { AlertCircle, Home, ArrowLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";

const { height } = Dimensions.get("window");

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations in sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  const handleGoHome = () => {
    // Check if user is authenticated and redirect appropriately
    router.replace("/(tabs)");
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t("notFound.pageTitle"), headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            {/* Background Circles */}
            <Animated.View
              style={[
                styles.backgroundCircle,
                styles.circle1,
                { opacity: fadeAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.backgroundCircle,
                styles.circle2,
                { opacity: fadeAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.backgroundCircle,
                styles.circle3,
                { opacity: fadeAnim },
              ]}
            />

            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.iconContainer,
                  { transform: [{ translateY: bounceAnim }] },
                ]}
              >
                <AlertCircle
                  size={120}
                  color="#10B981"
                  style={styles.icon}
                />
              </Animated.View>

              <ThemedText style={styles.errorCode}>404</ThemedText>
              <ThemedText style={styles.title}>{t("notFound.title")}</ThemedText>
              <ThemedText style={styles.subtitle}>
                {t("notFound.subtitle")} 🌿
              </ThemedText>

              <Animated.View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleGoHome}
                  activeOpacity={0.8}
                >
                  <Home size={20} color="#FFFFFF" />
                  <ThemedText style={styles.primaryButtonText}>
                    {t("notFound.goHome")}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleGoBack}
                  activeOpacity={0.8}
                >
                  <ArrowLeft size={20} color="#10B981" />
                  <ThemedText style={styles.secondaryButtonText}>
                    {t("notFound.goBack")}
                  </ThemedText>
                </TouchableOpacity>
              </Animated.View>

              <Link href="/(tabs)" style={styles.fallbackLink}>
                <ThemedText style={styles.linkText}>
                  {t("notFound.fallbackLink")}
                </ThemedText>
              </Link>
            </Animated.View>

            {/* Particles */}
            <Animated.View
              style={[styles.particle, styles.particle1, { opacity: fadeAnim }]}
            />
            <Animated.View
              style={[styles.particle, styles.particle2, { opacity: fadeAnim }]}
            />
            <Animated.View
              style={[styles.particle, styles.particle3, { opacity: fadeAnim }]}
            />
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ECFDF5",
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#ECFDF5",
    position: "relative",
    overflow: "hidden",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 400,
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    textShadowColor: "rgba(16, 185, 129, 0.44)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  errorCode: {
    fontSize: 72,
    fontWeight: "900",
    color: "#059669",
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    color: "#064E3B",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
    color: "#047857",
    maxWidth: 320,
  },
  buttonContainer: {
    flexDirection: "column",
    gap: 12,
    width: "100%",
    maxWidth: 280,
    marginBottom: 30,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#10B981",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "600",
  },
  fallbackLink: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  linkText: {
    color: "#059669",
    fontSize: 14,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  backgroundCircle: {
    position: "absolute",
    borderRadius: 1000,
    backgroundColor: "rgba(16, 185, 129, 0.06)",
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: -75,
    left: -75,
    backgroundColor: "rgba(5, 150, 105, 0.06)",
  },
  circle3: {
    width: 100,
    height: 100,
    top: height * 0.2,
    left: -50,
    backgroundColor: "rgba(4, 120, 87, 0.06)",
  },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#A7F3D0",
  },
  particle1: {
    top: "20%",
    right: "15%",
  },
  particle2: {
    top: "60%",
    left: "10%",
    backgroundColor: "#6EE7B7",
  },
  particle3: {
    bottom: "25%",
    right: "25%",
    backgroundColor: "#34D399",
  },
});
