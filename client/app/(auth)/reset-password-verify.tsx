import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { userAPI } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function ResetPasswordVerifyScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  // Refs for input fields
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCodeChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "");

    if (digit.length <= 1) {
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      if (newCode.every((c) => c !== "")) {
        setTimeout(() => {
          handleVerifyCode(newCode.join(""));
        }, 100);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = "";
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join("");

    if (!codeToVerify || codeToVerify.length !== 6) {
      Alert.alert(
        t("common.error"),
        t("auth.reset_password_verify.invalid_code")
      );
      return;
    }

    if (!/^\d{6}$/.test(codeToVerify)) {
      Alert.alert(
        t("common.error"),
        t("auth.reset_password_verify.invalid_code")
      );
      return;
    }

    try {
      setIsLoading(true);

      const response = await userAPI.verifyResetCode(
        email as string,
        codeToVerify
      );

      if (response.success && response.resetToken) {
        router.push({
          pathname: "/(auth)/resetPassword",
          params: {
            resetToken: response.resetToken,
          },
        });
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error.message || t("auth.reset_password_verify.invalid_code")
      );

      setCode(["", "", "", "", "", ""]);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    try {
      setResendLoading(true);

      const response = await userAPI.forgotPassword(email as string);

      if (response.success) {
        Alert.alert(
          t("common.success"),
          t("auth.forgot_password_page.reset_code_sent")
        );

        setTimeLeft(300);
        setCanResend(false);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();

        const timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              setCanResend(true);
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error.message || t("auth.reset_password.resend_failed")
      );
    } finally {
      setResendLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: Platform.OS === "ios" ? 50 : 30,
      paddingHorizontal: 24,
      paddingBottom: 20,
      flexDirection: "row",
      alignItems: "center",
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(0, 0, 0, 0.05)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: "600",
      color: "#1C1C1E",
      textAlign: "center",
      marginRight: 36,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: "center",
    },
    logoSection: {
      alignItems: "center",
      marginBottom: 48,
    },
    logoContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: "#1C1C1E",
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 17,
      color: "#8E8E93",
      textAlign: "center",
      lineHeight: 24,
      paddingHorizontal: 20,
    },
    emailText: {
      fontWeight: "600",
      color: colors.primary,
    },
    formContainer: {
      backgroundColor: "white",
      borderRadius: 16,
      padding: 24,
      marginTop: 32,
    },
    codeLabel: {
      fontSize: 17,
      fontWeight: "600",
      color: "#1C1C1E",
      textAlign: "center",
      marginBottom: 24,
    },
    codeContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 32,
    },
    codeInput: {
      width: 45,
      height: 55,
      borderRadius: 12,
      backgroundColor: "#F8F9FA",
      borderWidth: 2,
      borderColor: "#E5E5EA",
      fontSize: 24,
      fontWeight: "700",
      color: "#1C1C1E",
      textAlign: "center",
    },
    codeInputFilled: {
      borderColor: colors.primary,
      backgroundColor: "white",
    },
    verifyButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 24,
    },
    verifyButtonDisabled: {
      opacity: 0.6,
    },
    verifyButtonText: {
      fontSize: 17,
      fontWeight: "600",
      color: "white",
    },
    resendContainer: {
      alignItems: "center",
    },
    resendText: {
      fontSize: 15,
      color: "#8E8E93",
      marginBottom: 12,
      textAlign: "center",
    },
    resendButtonText: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: "500",
    },
    resendDisabledText: {
      fontSize: 15,
      color: "#C7C7CC",
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" translucent />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("auth.reset_password_verify.title")}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="shield-checkmark" size={40} color="white" />
            </View>
            <Text style={styles.title}>
              {t("auth.reset_password_verify.title")}
            </Text>
            <Text style={styles.subtitle}>
              {t("auth.reset_password_verify.subtitle")}
              {"\n"}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.codeLabel}>
              {t("auth.reset_password_verify.enter_code")}
            </Text>

            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref!)}
                  style={[styles.codeInput, digit && styles.codeInputFilled]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index)
                  }
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  editable={!isLoading}
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!code.every((c) => c !== "") || isLoading) &&
                  styles.verifyButtonDisabled,
              ]}
              onPress={() => handleVerifyCode(code.join(""))}
              disabled={!code.every((c) => c !== "") || isLoading}
            >
              <Text style={styles.verifyButtonText}>
                {isLoading
                  ? t("auth.loading.verifying")
                  : t("auth.reset_password_verify.verify_and_continue")}
              </Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>
                {t("auth.reset_password_verify.resend_code")}
              </Text>

              {canResend ? (
                <TouchableOpacity onPress={handleResendCode}>
                  <Text style={styles.resendButtonText}>
                    {resendLoading
                      ? t("auth.loading.sending_reset")
                      : t("auth.reset_password_verify.resend_code")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendDisabledText}>
                  {t("auth.reset_password_verify.code_expires_in")}{" "}
                  {formatTime(timeLeft)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
