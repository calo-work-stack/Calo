import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { useDispatch } from "react-redux";
import { verifyEmail } from "@/src/store/authSlice";
import { AppDispatch } from "@/src/store";

const { width, height } = Dimensions.get("window");

// Responsive sizing helpers
const isTablet = width >= 768;
const isSmallPhone = width < 375;

export default function EmailVerificationScreen() {
  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const router = useRouter();
  const { email } = useLocalSearchParams();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Auto-focus first input on mount
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

  const shakeInputs = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join("");

    if (!code.trim()) {
      Alert.alert(t("common.error"), t("auth.errors.required_field"));
      shakeInputs();
      return;
    }

    if (code.length !== 6) {
      Alert.alert(t("common.error"), t("auth.email_verification.invalid_code"));
      shakeInputs();
      return;
    }

    setLoading(true);
    try {
      const userEmail = Array.isArray(email) ? email[0] : email || "";

      if (!userEmail) {
        throw new Error("Email parameter missing");
      }

      console.log("🔄 Dispatching email verification...");
      const result = await dispatch(
        verifyEmail({
          email: userEmail,
          code: code,
        })
      ).unwrap();

      console.log("✅ Email verification successful:", result);
      setLoading(false);

      Alert.alert(
        t("common.success"),
        t("auth.email_verification.verification_successful"),
        [
          {
            text: t("common.ok"),
            onPress: () => {
              router.replace("/");
            },
          },
        ]
      );
    } catch (error: any) {
      setLoading(false);
      console.error("Email verification error:", error);
      shakeInputs();
      Alert.alert(
        t("common.error"),
        error.message || t("auth.email_verification.verification_failed")
      );
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    setResendLoading(true);
    try {
      const userEmail = Array.isArray(email) ? email[0] : email || "";

      if (!userEmail) {
        throw new Error("Email parameter missing");
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/auth/resend-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userEmail,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setResendLoading(false);
        setCanResend(false);
        setCountdown(60);
        setVerificationCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        Alert.alert(
          t("common.success"),
          t("auth.email_verification.resend_successful")
        );
      } else {
        throw new Error(result.error || "Resend failed");
      }
    } catch (error: any) {
      setResendLoading(false);
      console.error("Resend verification error:", error);
      Alert.alert(
        t("common.error"),
        error.message || t("auth.email_verification.resend_failed")
      );
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    // Only accept numbers
    if (text && !/^\d+$/.test(text)) return;

    const newCode = [...verificationCode];
    newCode[index] = text;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Don't auto-verify - let user click the button to avoid premature errors
    // User can click "Verify Email" when ready
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (
      e.nativeEvent.key === "Backspace" &&
      !verificationCode[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: Platform.OS === "ios" ? 50 : 30,
      paddingHorizontal: isTablet ? 40 : 24,
      paddingBottom: 20,
      flexDirection: "row",
      alignItems: "center",
    },
    backButton: {
      width: isTablet ? 48 : 40,
      height: isTablet ? 48 : 40,
      borderRadius: isTablet ? 24 : 20,
      backgroundColor: "rgba(0, 0, 0, 0.05)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: isTablet ? 22 : 18,
      fontWeight: "600",
      color: "#1C1C1E",
      textAlign: "center",
      marginRight: isTablet ? 48 : 40,
    },
    content: {
      flex: 1,
      paddingHorizontal: isTablet ? 60 : 24,
      justifyContent: "center",
      maxWidth: isTablet ? 600 : "100%",
      alignSelf: "center",
      width: "100%",
    },
    logoSection: {
      alignItems: "center",
      marginBottom: isTablet ? 60 : 48,
    },
    logoContainer: {
      width: isTablet ? 110 : 90,
      height: isTablet ? 110 : 90,
      borderRadius: isTablet ? 55 : 45,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: isTablet ? 28 : 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    title: {
      fontSize: isTablet ? 40 : isSmallPhone ? 28 : 32,
      fontWeight: "700",
      color: "#1C1C1E",
      textAlign: "center",
      marginBottom: isTablet ? 16 : 12,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: isTablet ? 18 : 16,
      color: "#8E8E93",
      textAlign: "center",
      lineHeight: isTablet ? 28 : 24,
      paddingHorizontal: 20,
    },
    emailText: {
      fontWeight: "600",
      color: colors.primary,
    },
    formContainer: {
      backgroundColor: "white",
      borderRadius: isTablet ? 24 : 20,
      padding: isTablet ? 40 : 28,
      marginTop: isTablet ? 40 : 32,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 6,
    },
    codeLabel: {
      fontSize: isTablet ? 20 : 16,
      fontWeight: "600",
      color: "#1C1C1E",
      textAlign: "center",
      marginBottom: isTablet ? 36 : 28,
      letterSpacing: 0.3,
    },
    codeContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: isTablet ? 40 : 32,
      gap: isTablet ? 16 : isSmallPhone ? 6 : 12,
    },
    codeInput: {
      width: isTablet ? 64 : isSmallPhone ? 42 : 52,
      height: isTablet ? 76 : isSmallPhone ? 54 : 64,
      borderRadius: isTablet ? 18 : 14,
      backgroundColor: "#F8F9FA",
      borderWidth: 2,
      borderColor: "#E5E5EA",
      fontSize: isTablet ? 36 : isSmallPhone ? 22 : 28,
      fontWeight: "700",
      color: "#1C1C1E",
      textAlign: "center",
    },
    codeInputFocused: {
      borderColor: colors.primary,
      backgroundColor: "white",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
      transform: [{ scale: 1.05 }],
    },
    codeInputFilled: {
      borderColor: colors.primary,
      backgroundColor: "white",
    },
    verifyButton: {
      backgroundColor: colors.primary,
      borderRadius: isTablet ? 16 : 14,
      paddingVertical: isTablet ? 20 : 18,
      alignItems: "center",
      marginBottom: isTablet ? 28 : 24,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 6,
    },
    verifyButtonDisabled: {
      opacity: 0.5,
    },
    verifyButtonText: {
      fontSize: isTablet ? 19 : 17,
      fontWeight: "600",
      color: "white",
      letterSpacing: 0.5,
    },
    resendContainer: {
      alignItems: "center",
    },
    resendText: {
      fontSize: isTablet ? 17 : 15,
      color: "#8E8E93",
      marginBottom: isTablet ? 16 : 12,
      textAlign: "center",
    },
    resendButton: {
      paddingVertical: isTablet ? 14 : 10,
      paddingHorizontal: isTablet ? 28 : 20,
      backgroundColor: `${colors.primary}15`,
      borderRadius: isTablet ? 12 : 10,
    },
    resendButtonText: {
      fontSize: isTablet ? 17 : 15,
      color: colors.primary,
      fontWeight: "600",
    },
    resendDisabledText: {
      fontSize: isTablet ? 17 : 15,
      color: "#C7C7CC",
      fontWeight: "500",
    },
  });

  const renderOTPInputs = () => {
    return verificationCode.map((digit, index) => (
      <Animated.View
        key={index}
        style={{ transform: [{ translateX: shakeAnimation }] }}
      >
        <TextInput
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          style={[
            styles.codeInput,
            digit && styles.codeInputFilled,
            focusedIndex === index && styles.codeInputFocused,
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
      </Animated.View>
    ));
  };

  const isCodeComplete = verificationCode.every((digit) => digit !== "");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={isTablet ? 26 : 22}
            color="#1C1C1E"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("auth.email_verification.title")}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="mail" size={isTablet ? 56 : 44} color="white" />
            </View>
            <Text style={styles.title}>
              {t("auth.email_verification.title")}
            </Text>
            <Text style={styles.subtitle}>
              {t("auth.email_verification.subtitle")}
              {"\n"}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.codeLabel}>
              {t("auth.email_verification.enter_code")}
            </Text>

            <View style={styles.codeContainer}>{renderOTPInputs()}</View>

            <TouchableOpacity
              style={[
                styles.verifyButton,
                (loading || !isCodeComplete) && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerifyCode}
              disabled={loading || !isCodeComplete}
            >
              <Text style={styles.verifyButtonText}>
                {loading
                  ? t("common.loading")
                  : t("auth.email_verification.verify")}
              </Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              {canResend ? (
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendCode}
                  disabled={resendLoading}
                >
                  <Text style={styles.resendButtonText}>
                    {resendLoading
                      ? t("common.loading")
                      : t("auth.email_verification.resend_code")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendDisabledText}>
                  Resend in {countdown}s
                </Text>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
