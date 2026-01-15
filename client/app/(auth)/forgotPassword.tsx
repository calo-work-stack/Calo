import React, { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { userAPI } from "@/src/services/api";

const { width, height } = Dimensions.get("window");

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(t("common.error"), t("auth.errors.required_field"));
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert(t("common.error"), t("auth.email_validation_error"));
      return;
    }

    try {
      setIsLoading(true);
      const response = await userAPI.forgotPassword(email);

      if (response.success) {
        Alert.alert(
          t("common.success"),
          t("auth.forgot_password_page.reset_code_sent"),
          [
            {
              text: t("common.ok"),
              onPress: () =>
                router.push({
                  pathname: "/(auth)/reset-password-verify",
                  params: { email },
                }),
            },
          ]
        );
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error.message || t("auth.reset_password.reset_failed")
      );
    } finally {
      setIsLoading(false);
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
    formContainer: {
      backgroundColor: "white",
      borderRadius: 16,
      padding: 24,
      marginTop: 32,
    },
    inputContainer: {
      marginBottom: 24,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: "#8E8E93",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: "#F8F9FA",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#E5E5EA",
      padding: 16,
      fontSize: 17,
      color: "#1C1C1E",
    },
    sendButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
    },
    sendButtonDisabled: {
      opacity: 0.6,
    },
    sendButtonText: {
      fontSize: 17,
      fontWeight: "600",
      color: "white",
    },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    loadingText: {
      color: "white",
      fontSize: 17,
      fontWeight: "600",
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={router.back}>
          <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("auth.reset_password.title")}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="lock-closed" size={40} color="white" />
            </View>
            <Text style={styles.title}>
              {t("auth.forgot_password_page.title")}
            </Text>
            <Text style={styles.subtitle}>
              {t("auth.forgot_password_page.subtitle")}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("auth.email")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("auth.forgot_password_page.email_placeholder")}
                placeholderTextColor="#C7C7CC"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!email.trim() || !validateEmail(email) || isLoading) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleForgotPassword}
              disabled={!email.trim() || !validateEmail(email) || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.loadingText}>
                    {t("auth.loading.sending_reset")}
                  </Text>
                </View>
              ) : (
                <Text style={styles.sendButtonText}>
                  {t("auth.forgot_password_page.send_reset_code")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
