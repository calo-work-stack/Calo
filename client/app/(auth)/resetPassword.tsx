import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Animated,
  Keyboard,
} from "react-native";
import { ChevronLeft, ChevronRight, Key, Eye, EyeOff, Lock, ShieldCheck, Check, X } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { userAPI } from "@/src/services/api";
import { LinearGradient } from "expo-linear-gradient";
import { ToastService } from "@/src/services/totastService";
import Toast from "react-native-toast-message";

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { resetToken } = useLocalSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const confirmPasswordRef = useRef<TextInput>(null);

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

  // Password validation rules matching server
  const passwordChecks = [
    { key: "min", check: (p: string) => p.length >= 8, label: t("auth.sign_up.requirements.password_min") },
    { key: "upper", check: (p: string) => /[A-Z]/.test(p), label: t("auth.sign_up.requirements.password_uppercase") },
    { key: "lower", check: (p: string) => /[a-z]/.test(p), label: t("auth.sign_up.requirements.password_lowercase") },
    { key: "number", check: (p: string) => /\d/.test(p), label: t("auth.sign_up.requirements.password_number") },
  ];

  const isPasswordValid = passwordChecks.every((rule) => rule.check(password));

  const handleResetPassword = async () => {
    Keyboard.dismiss();

    if (!password.trim() || !confirmPassword.trim()) {
      shake();
      ToastService.error(t("common.error"), t("auth.errors.required_field"));
      return;
    }

    if (!isPasswordValid) {
      shake();
      ToastService.error(t("common.error"), t("auth.reset_password.password_too_short"));
      return;
    }

    if (password !== confirmPassword) {
      shake();
      ToastService.error(
        t("common.error"),
        t("auth.reset_password.passwords_dont_match"),
      );
      return;
    }

    try {
      setIsLoading(true);
      startProgressAnimation();
      const response = await userAPI.resetPassword(
        resetToken as string,
        password,
      );

      if (response.success) {
        ToastService.success(
          t("common.success"),
          t("auth.reset_password.reset_successful"),
        );
        setTimeout(() => {
          router.replace("/(auth)/signin");
        }, 1500);
      } else {
        throw new Error(response.error || "Failed to reset password");
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

  const isFormValid = () => {
    return (
      password.trim() &&
      confirmPassword.trim() &&
      password === confirmPassword &&
      isPasswordValid
    );
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
            {t("auth.reset_password.reset_password_title")}
          </Text>
          <View style={styles.backButton} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
                  <Key size={38} color={colors.onPrimary} />
                </LinearGradient>
                <Text style={[styles.title, { color: colors.text }]}>
                  {t("auth.reset_password.title")}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {t("auth.reset_password.subtitle")}
                </Text>
              </View>

              {/* Form */}
              <Animated.View
                style={[
                  styles.formContainer,
                  { transform: [{ translateX: shakeAnim }] },
                ]}
              >
                {/* Password Input */}
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: passwordFocused ? colors.primary : colors.border,
                      shadowColor: passwordFocused ? colors.primary : colors.shadow,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.inputIconContainer,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                  >
                    <Lock
                      size={20}
                      color={passwordFocused ? colors.primary : colors.icon}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text
                      style={[
                        styles.inputLabel,
                        {
                          color: passwordFocused
                            ? colors.primary
                            : colors.textTertiary,
                        },
                      ]}
                    >
                      {t("auth.reset_password.new_password")}
                    </Text>
                    <View style={styles.passwordRow}>
                      <TextInput
                        style={[
                          styles.input,
                          styles.passwordInput,
                          { color: colors.text },
                          isRTL && styles.inputRTL,
                        ]}
                        placeholder={t("auth.reset_password.enter_new_password")}
                        placeholderTextColor={colors.textTertiary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        returnKeyType="next"
                        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                        textAlign={isRTL ? "right" : "left"}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowPassword(!showPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {showPassword ? (
                          <EyeOff size={20} color={colors.icon} />
                        ) : (
                          <Eye size={20} color={colors.icon} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Password Requirements Checklist */}
                {password.length > 0 && (
                  <View
                    style={[
                      styles.requirementsContainer,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.requirementsTitle,
                        { color: colors.text },
                      ]}
                    >
                      {t("auth.reset_password.password_requirements")}
                    </Text>
                    {passwordChecks.map((rule) => {
                      const passed = rule.check(password);
                      return (
                        <View key={rule.key} style={styles.requirementRow}>
                          {passed ? (
                            <Check size={16} color={colors.primary} />
                          ) : (
                            <X size={16} color={colors.error || "#EF4444"} />
                          )}
                          <Text
                            style={[
                              styles.requirementText,
                              {
                                color: passed
                                  ? colors.primary
                                  : colors.textSecondary,
                              },
                            ]}
                          >
                            {rule.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Confirm Password Input */}
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: confirmPasswordFocused
                        ? colors.primary
                        : colors.border,
                      shadowColor: confirmPasswordFocused
                        ? colors.primary
                        : colors.shadow,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.inputIconContainer,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                  >
                    <ShieldCheck
                      size={20}
                      color={confirmPasswordFocused ? colors.primary : colors.icon}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text
                      style={[
                        styles.inputLabel,
                        {
                          color: confirmPasswordFocused
                            ? colors.primary
                            : colors.textTertiary,
                        },
                      ]}
                    >
                      {t("auth.reset_password.confirm_new_password")}
                    </Text>
                    <View style={styles.passwordRow}>
                      <TextInput
                        ref={confirmPasswordRef}
                        style={[
                          styles.input,
                          styles.passwordInput,
                          { color: colors.text },
                          isRTL && styles.inputRTL,
                        ]}
                        placeholder={t("auth.reset_password.confirm_new_password")}
                        placeholderTextColor={colors.textTertiary}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                        onFocus={() => setConfirmPasswordFocused(true)}
                        onBlur={() => setConfirmPasswordFocused(false)}
                        returnKeyType="done"
                        onSubmitEditing={handleResetPassword}
                        textAlign={isRTL ? "right" : "left"}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={20} color={colors.icon} />
                        ) : (
                          <Eye size={20} color={colors.icon} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Passwords match indicator */}
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <View style={styles.mismatchRow}>
                    <X size={16} color={colors.error || "#EF4444"} />
                    <Text style={[styles.mismatchText, { color: colors.error || "#EF4444" }]}>
                      {t("auth.reset_password.passwords_dont_match")}
                    </Text>
                  </View>
                )}

                {/* Reset Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.resetButton,
                      {
                        backgroundColor: colors.primary,
                        shadowColor: colors.primary,
                      },
                      (!isFormValid() || isLoading) && styles.resetButtonDisabled,
                    ]}
                    onPress={handleResetPassword}
                    onPressIn={() => animateButton(true)}
                    onPressOut={() => animateButton(false)}
                    disabled={!isFormValid() || isLoading}
                    activeOpacity={0.9}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                        <Text
                          style={[styles.loadingText, { color: colors.onPrimary }]}
                        >
                          {t("auth.loading.resetting_password")}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.resetButtonText,
                          { color: colors.onPrimary },
                        ]}
                      >
                        {t("auth.reset_password.title")}
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
            </Animated.View>
          </ScrollView>
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
  scrollContent: {
    paddingBottom: 32,
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
    gap: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 15,
    paddingVertical: 2,
  },
  inputRTL: {
    textAlign: "right",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    padding: 4,
  },
  requirementsContainer: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requirementText: {
    fontSize: 13,
  },
  mismatchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  mismatchText: {
    fontSize: 13,
    fontWeight: "500",
  },
  resetButton: {
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
  resetButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  resetButtonText: {
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
});
