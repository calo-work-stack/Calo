import React, { useState, useEffect, useRef } from "react";
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
import { ChevronLeft, ChevronRight, Mail } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import { verifyEmail } from "@/src/store/authSlice";
import { AppDispatch, RootState } from "@/src/store";
import { LinearGradient } from "expo-linear-gradient";
import { ToastService } from "@/src/services/totastService";
import Toast from "react-native-toast-message";

export default function EmailVerificationScreen() {
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [userEmail, setUserEmail] = useState<string>("");

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const { isEmailVerified, isQuestionnaireCompleted } = useSelector(
    (state: RootState) => state.auth,
  );
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const emailParam = Array.isArray(params.email)
      ? params.email[0]
      : params.email;
    if (emailParam) {
      setUserEmail(emailParam);
    }
  }, [params.email]);

  useEffect(() => {
    // Entrance animation
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

    inputRefs.current[0]?.focus();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
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

  const handleBack = async () => {
    if (!isEmailVerified && !isQuestionnaireCompleted) {
      dispatch({ type: "auth/forceSignOut" });
      router.replace("/(auth)/signin");
      return;
    }
  };

  const handleVerifyCode = async () => {
    Keyboard.dismiss();
    const code = verificationCode.join("");

    if (!code.trim()) {
      shake();
      ToastService.error(t("common.error"), t("auth.errors.required_field"));
      return;
    }

    if (code.length !== 6) {
      shake();
      ToastService.error(t("common.error"), t("auth.email_verification.invalid_code"));
      return;
    }

    if (!userEmail) {
      shake();
      ToastService.error(t("common.error"), "Email parameter missing");
      return;
    }

    setLoading(true);
    startProgressAnimation();
    try {
      const result = await dispatch(
        verifyEmail({ email: userEmail, code }),
      ).unwrap();

      setLoading(false);
      progressAnim.stopAnimation();
      ToastService.success(
        t("common.success"),
        t("auth.email_verification.verification_successful"),
      );
      setTimeout(() => {
        router.replace("/");
      }, 1500);
    } catch (error: any) {
      setLoading(false);
      progressAnim.stopAnimation();
      shake();
      ToastService.error(
        t("common.error"),
        error.message || t("auth.email_verification.verification_failed"),
      );
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    if (!userEmail) {
      ToastService.error(t("common.error"), "Email parameter missing");
      return;
    }

    setResendLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/auth/resend-verification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail }),
        },
      );

      const result = await response.json();

      if (result.success) {
        setResendLoading(false);
        setCanResend(false);
        setCountdown(60);
        setVerificationCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        ToastService.success(
          t("common.success"),
          t("auth.email_verification.resend_successful"),
        );
      } else {
        throw new Error(result.error || "Resend failed");
      }
    } catch (error: any) {
      setResendLoading(false);
      ToastService.error(
        t("common.error"),
        error.message || t("auth.email_verification.resend_failed"),
      );
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    if (text && !/^\d+$/.test(text)) return;

    const newCode = [...verificationCode];
    newCode[index] = text;
    setVerificationCode(newCode);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (
      e.nativeEvent.key === "Backspace" &&
      !verificationCode[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const isCodeComplete = verificationCode.every((digit) => digit !== "");

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
            onPress={handleBack}
            activeOpacity={0.7}
          >
            {isRTL ? (
              <ChevronRight size={22} color={colors.primary} />
            ) : (
              <ChevronLeft size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("auth.email_verification.title")}
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
                <Mail size={38} color={colors.onPrimary} />
              </LinearGradient>
              <Text style={[styles.title, { color: colors.text }]}>
                {t("auth.email_verification.title")}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t("auth.email_verification.subtitle")}
                {"\n"}
                <Text style={{ fontWeight: "600", color: colors.primary }}>
                  {userEmail || params.email}
                </Text>
              </Text>
            </View>

            {/* Code Inputs */}
            <Animated.View
              style={[
                styles.formContainer,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              <Text style={[styles.codeLabel, { color: colors.text }]}>
                {t("auth.email_verification.enter_code")}
              </Text>

              <View style={styles.codeContainer}>
                {verificationCode.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    style={[
                      styles.codeInput,
                      {
                        backgroundColor: colors.card,
                        borderColor:
                          focusedIndex === index
                            ? colors.primary
                            : digit
                              ? colors.primary
                              : colors.border,
                        color: colors.text,
                      },
                      focusedIndex === index && {
                        transform: [{ scale: 1.05 }],
                      },
                    ]}
                    value={digit}
                    onChangeText={(text) => handleCodeChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    onFocus={() => setFocusedIndex(index)}
                    onBlur={() => setFocusedIndex(-1)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!loading}
                  />
                ))}
              </View>

              {/* Verify Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                    },
                    (loading || !isCodeComplete) && styles.verifyButtonDisabled,
                  ]}
                  onPress={handleVerifyCode}
                  onPressIn={() => animateButton(true)}
                  onPressOut={() => animateButton(false)}
                  disabled={loading || !isCodeComplete}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                      <Text
                        style={[styles.loadingText, { color: colors.onPrimary }]}
                      >
                        {t("auth.loading.verifying")}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.verifyButtonText,
                        { color: colors.onPrimary },
                      ]}
                    >
                      {t("auth.email_verification.verify")}
                    </Text>
                  )}

                  {loading && (
                    <Animated.View
                      style={[styles.progressBar, { width: progressWidth }]}
                    />
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Resend Section */}
              <View style={styles.resendContainer}>
                <Text
                  style={[styles.resendText, { color: colors.textSecondary }]}
                >
                  {t("auth.sign_up.email.didnt_recive")}
                </Text>
                {canResend ? (
                  <TouchableOpacity
                    style={[
                      styles.resendButton,
                      { backgroundColor: `${colors.primary}15` },
                    ]}
                    onPress={handleResendCode}
                    disabled={resendLoading}
                  >
                    <Text
                      style={[styles.resendButtonText, { color: colors.primary }]}
                    >
                      {resendLoading
                        ? t("common.loading")
                        : t("auth.email_verification.resend_code")}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text
                    style={[
                      styles.resendDisabledText,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {t("auth.sign_up.email.resend_email")} {countdown}{" "}
                    {t("auth.sign_up.email.seconds")}
                  </Text>
                )}
              </View>
            </Animated.View>
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
  codeLabel: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  codeInput: {
    width: 48,
    height: 58,
    borderRadius: 14,
    borderWidth: 2,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  verifyButton: {
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
  verifyButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  verifyButtonText: {
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
  resendContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  resendText: {
    fontSize: 15,
    marginBottom: 12,
    textAlign: "center",
  },
  resendButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  resendButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  resendDisabledText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
