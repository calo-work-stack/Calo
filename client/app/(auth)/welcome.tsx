import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
// Lucide icons used via IconSymbol component
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");

const FloatingElement = ({ style, delay = 0, duration = 4000 }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -30,
            duration: duration,
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
            useNativeDriver: true,
            delay,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: duration,
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: 15,
            duration: duration * 0.7,
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
            useNativeDriver: true,
            delay,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: duration * 0.7,
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotate, {
            toValue: 1,
            duration: duration * 2,
            easing: Easing.linear,
            useNativeDriver: true,
            delay,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.1,
            duration: duration * 0.6,
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
            useNativeDriver: true,
            delay,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: duration * 0.6,
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: duration * 0.5,
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
            useNativeDriver: true,
            delay,
          }),
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: duration * 0.5,
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]);

    animation.start();
    return () => animation.stop();
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotateInterpolate },
            { scale },
          ],
        },
      ]}
    />
  );
};

const ParticleEffect = ({ index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const moveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 100;
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(moveAnim, {
            toValue: -100,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, []);

  const randomLeft = Math.random() * width;
  const randomSize = 2 + Math.random() * 3;

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: randomSize,
        height: randomSize,
        borderRadius: randomSize / 2,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        bottom: 0,
        left: randomLeft,
        opacity: fadeAnim,
        transform: [{ translateY: moveAnim }],
      }}
    />
  );
};

export default function WelcomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const isRTL = i18n.language === "he";

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonFade, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000",
    },
    gradientBackground: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: height,
    },
    meshGradient1: {
      position: "absolute",
      width: 400,
      height: 400,
      borderRadius: 200,
      backgroundColor: colors.primary,
      opacity: 0.4,
      top: -100,
      left: -100,
      filter: "blur(80px)",
    },
    meshGradient2: {
      position: "absolute",
      width: 350,
      height: 350,
      borderRadius: 175,
      backgroundColor: colors.emerald600 || "#059669",
      opacity: 0.3,
      top: 100,
      right: -80,
      filter: "blur(70px)",
    },
    meshGradient3: {
      position: "absolute",
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: colors.emerald700 || "#047857",
      opacity: 0.25,
      bottom: 200,
      left: 50,
      filter: "blur(60px)",
    },
    overlayGradient: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: height,
      opacity: 0.6,
    },
    floatingElementsContainer: {
      position: "absolute",
      width: "100%",
      height: "75%",
      top: 0,
    },
    floatingElement: {
      position: "absolute",
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      backdropFilter: "blur(20px)",
      shadowColor: "#fff",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
    },
    element1: {
      width: 120,
      height: 120,
      top: "10%",
      left: "5%",
      borderRadius: 30,
      transform: [{ rotate: "15deg" }],
    },
    element2: {
      width: 80,
      height: 80,
      top: "5%",
      right: "10%",
      borderRadius: 40,
    },
    element3: {
      width: 140,
      height: 50,
      top: "25%",
      right: "3%",
      borderRadius: 25,
      transform: [{ rotate: "18deg" }],
    },
    element4: {
      width: 95,
      height: 95,
      top: "18%",
      left: "10%",
      borderRadius: 47,
      backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    element5: {
      width: 130,
      height: 60,
      top: "38%",
      right: "15%",
      borderRadius: 30,
      transform: [{ rotate: "-12deg" }],
    },
    element6: {
      width: 75,
      height: 75,
      top: "32%",
      left: "3%",
      borderRadius: 37,
      backgroundColor: "rgba(255, 255, 255, 0.07)",
    },
    element7: {
      width: 110,
      height: 45,
      top: "45%",
      left: "22%",
      borderRadius: 22,
      transform: [{ rotate: "10deg" }],
      backgroundColor: "rgba(255, 255, 255, 0.065)",
    },
    element8: {
      width: 90,
      height: 90,
      top: "12%",
      left: "42%",
      borderRadius: 45,
      backgroundColor: "rgba(255, 255, 255, 0.055)",
    },
    element9: {
      width: 105,
      height: 40,
      top: "50%",
      right: "8%",
      borderRadius: 20,
      transform: [{ rotate: "-15deg" }],
      backgroundColor: "rgba(255, 255, 255, 0.07)",
    },
    particlesContainer: {
      position: "absolute",
      width: "100%",
      height: "100%",
    },
    content: {
      flex: 1,
      paddingHorizontal: 32,
      justifyContent: "flex-end",
      paddingBottom: 56,
    },
    textSection: {
      alignItems: "center",
      marginBottom: 64,
    },
    welcomeLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.65)",
      letterSpacing: 4,
      textTransform: "uppercase",
      marginBottom: 16,
      textAlign: "center",
    },
    appName: {
      fontSize: 64,
      fontWeight: "900",
      color: "white",
      letterSpacing: -3,
      textAlign: "center",
      marginBottom: 20,
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 8 },
      textShadowRadius: 24,
      ...(isRTL && {
        writingDirection: "rtl",
        textAlign: "center",
      }),
    },
    tagline: {
      fontSize: 18,
      fontWeight: "400",
      color: "rgba(255, 255, 255, 0.85)",
      textAlign: "center",
      lineHeight: 28,
      paddingHorizontal: 40,
      letterSpacing: 0.5,
      ...(isRTL && {
        writingDirection: "rtl",
        textAlign: "center",
      }),
    },
    buttonSection: {
      gap: 18,
    },
    signUpButton: {
      borderRadius: 18,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 12,
    },
    signUpButtonGradient: {
      paddingVertical: 20,
      alignItems: "center",
    },
    signUpButtonText: {
      fontSize: 19,
      fontWeight: "800",
      color: colors.primary,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    signInButton: {
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      borderRadius: 18,
      paddingVertical: 20,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.25)",
      backdropFilter: "blur(20px)",
      shadowColor: "#fff",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    signInButtonText: {
      fontSize: 19,
      fontWeight: "700",
      color: "white",
      letterSpacing: 0.8,
    },
    footerText: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.55)",
      textAlign: "center",
      marginTop: 28,
      lineHeight: 19,
      paddingHorizontal: 20,
      letterSpacing: 0.3,
      ...(isRTL && {
        writingDirection: "rtl",
        textAlign: "center",
      }),
    },
    privacyLink: {
      color: "rgba(255, 255, 255, 0.9)",
      fontWeight: "700",
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <LinearGradient
        colors={[
          "#0a0a0a",
          colors.primary + "40",
          colors.emerald700 + "50" || "#04785750",
          colors.emerald600 + "60" || "#05966960",
        ]}
        locations={[0, 0.3, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      <View style={styles.meshGradient1} />
      <View style={styles.meshGradient2} />
      <View style={styles.meshGradient3} />

      <LinearGradient
        colors={[
          "rgba(0, 0, 0, 0.2)",
          "rgba(0, 0, 0, 0.3)",
          "rgba(0, 0, 0, 0.5)",
        ]}
        style={styles.overlayGradient}
      />

      <View style={styles.particlesContainer}>
        {[...Array(15)].map((_, i) => (
          <ParticleEffect key={i} index={i} />
        ))}
      </View>

      <View style={styles.floatingElementsContainer}>
        <FloatingElement
          style={[styles.floatingElement, styles.element1]}
          delay={0}
          duration={4500}
        />
        <FloatingElement
          style={[styles.floatingElement, styles.element2]}
          delay={500}
          duration={5000}
        />
        <FloatingElement
          style={[styles.floatingElement, styles.element3]}
          delay={1000}
          duration={4200}
        />
        <FloatingElement
          style={[styles.floatingElement, styles.element4]}
          delay={1500}
          duration={4800}
        />
        <FloatingElement
          style={[styles.floatingElement, styles.element5]}
          delay={300}
          duration={5200}
        />
        <FloatingElement
          style={[styles.floatingElement, styles.element6]}
          delay={800}
          duration={4600}
        />
        <FloatingElement
          style={[styles.floatingElement, styles.element7]}
          delay={1200}
          duration={4400}
        />
        <FloatingElement
          style={[styles.floatingElement, styles.element8]}
          delay={600}
          duration={5100}
        />
        <FloatingElement
          style={[styles.floatingElement, styles.element9]}
          delay={400}
          duration={4700}
        />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.textSection,
            {
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.welcomeLabel}>
            {t("auth.welcome") || "WELCOME TO"}
          </Text>
          <Text style={styles.appName}>{t("welcome.appName")}</Text>
          <Text style={styles.tagline}>{t("welcome.tagline")}</Text>
        </Animated.View>

        <Animated.View style={[styles.buttonSection, { opacity: buttonFade }]}>
          <View style={styles.signUpButton}>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity activeOpacity={0.9}>
                <LinearGradient
                  colors={["#ffffff", "#f5f5f5"]}
                  style={styles.signUpButtonGradient}
                >
                  <Text style={styles.signUpButtonText}>
                    {t("welcome.buttons.getStarted")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Link>
          </View>

          <Link href="/(auth)/signin" asChild>
            <TouchableOpacity style={styles.signInButton} activeOpacity={0.8}>
              <Text style={styles.signInButtonText}>
                {t("welcome.buttons.signIn")}
              </Text>
            </TouchableOpacity>
          </Link>

          <Text style={styles.footerText}>
            {t("welcome.footer.agreementText")}
            {isRTL ? " " : "\n"}
            <Text
              style={styles.privacyLink}
              onPress={() => router.push("/terms-of-service")}
            >
              {t("welcome.footer.termsOfService")}
            </Text>{" "}
            {t("welcome.footer.and")}{" "}
            <Text
              style={styles.privacyLink}
              onPress={() => router.push("/privacy-policy")}
            >
              {t("welcome.footer.privacyPolicy")}
            </Text>
          </Text>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}
