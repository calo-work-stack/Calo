import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Animated,
  Keyboard,
} from "react-native";
import { ChevronLeft, ChevronRight, Mail, Lock } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { userAPI } from "@/src/services/api";
import { LinearGradient } from "expo-linear-gradient";
import { ToastService } from "@/src/services/totastService";
import Toast from "react-native-toast-message";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const animateButton = (pressed: boolean) => {
    Animated.spring(buttonScale, {
      toValue: pressed ? 0.97 : 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const startProgressAnimation = () => {
    progressAnim.setValue(0);
    Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }),
    ).start();
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleForgotPassword = async () => {
    Keyboard.dismiss();

    if (!email.trim()) {
      shake();
      ToastService.error(t("common.error"), t("auth.errors.required_field"));
      return;
    }

    if (!validateEmail(email)) {
      shake();
      ToastService.error(t("common.error"), t("auth.email_validation_error"));
      return;
    }

    try {
      setIsLoading(true);
      startProgressAnimation();
      const response = await userAPI.forgotPassword(email);

      if (response.success) {
        ToastService.success(
          t("common.success"),
          t("auth.forgot_password_page.reset_code_sent"),
        );
        setTimeout(() => {
          router.push({
            pathname: "/(auth)/reset-password-verify",
            params: { email },
          });
        }, 1500);
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      shake();
      ToastService.error(
        t("common.error"),
        error.message || t("auth.reset_password.reset_failed"),
      );
    } finally {
      setIsLoading(false);
      progressAnim.stopAnimation();
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
              },
            ]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            {isRTL ? (
              <ChevronRight size={22} color={colors.primary} />
            ) : (
              <ChevronLeft size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("auth.reset_password.title")}
          </Text>
          <View style={styles.backButton} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <LinearGradient
                colors={[colors.primary, colors.emerald600]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.logoContainer,
                  { shadowColor: colors.primary },
                ]}
              >
                <Lock size={38} color={colors.onPrimary} />
              </LinearGradient>
              <Text style={[styles.title, { color: colors.text }]}>
                {t("auth.forgot_password_page.title")}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t("auth.forgot_password_page.subtitle")}
              </Text>
            </View>

            {/* Form */}
            <Animated.View
              style={[
                styles.formContainer,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              {/* Email Input */}
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.card,
                    borderColor: emailFocused ? colors.primary : colors.border,
                    shadowColor: emailFocused ? colors.primary : colors.shadow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.inputIconContainer,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                >
                  <Mail
                    size={20}
                    color={emailFocused ? colors.primary : colors.icon}
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Text
                    style={[
                      styles.inputLabel,
                      {
                        color: emailFocused
                          ? colors.primary
                          : colors.textTertiary,
                      },
                    ]}
                  >
                    {t("auth.email")}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.text },
                      isRTL && styles.inputRTL,
                    ]}
                    placeholder={t("auth.forgot_password_page.email_placeholder")}
                    placeholderTextColor={colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    editable={!isLoading}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    returnKeyType="done"
                    onSubmitEditing={handleForgotPassword}
                    textAlign={isRTL ? "right" : "left"}
                  />
                </View>
              </View>

              {/* Send Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                    },
                    (!email.trim() || !validateEmail(email) || isLoading) &&
                      styles.sendButtonDisabled,
                  ]}
                  onPress={handleForgotPassword}
                  onPressIn={() => animateButton(true)}
                  onPressOut={() => animateButton(false)}
                  disabled={!email.trim() || !validateEmail(email) || isLoading}
                  activeOpacity={0.9}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                      <Text
                        style={[styles.loadingText, { color: colors.onPrimary }]}
                      >
                        {t("auth.loading.sending_reset")}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.sendButtonText,
                        { color: colors.onPrimary },
                      ]}
                    >
                      {t("auth.forgot_password_page.send_reset_code")}
                    </Text>
                  )}

                  {isLoading && (
                    <Animated.View
                      style={[styles.progressBar, { width: progressWidth }]}
                    />
                  )}
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                {t("auth.forgot_password_page.back_to_signin")}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/signin")}
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
              >
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  {t("auth.sign_in.title")}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  formContainer: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    paddingVertical: 2,
  },
  inputRTL: {
    textAlign: "right",
  },
  sendButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
  },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 15,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
