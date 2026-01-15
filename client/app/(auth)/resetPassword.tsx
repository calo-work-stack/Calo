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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { userAPI } from "@/src/services/api";

const { width, height } = Dimensions.get("window");

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const { resetToken } = useLocalSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return t("auth.reset_password.password_too_short");
    }
    return null;
  };

  const handleResetPassword = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert(t("common.error"), t("auth.errors.required_field"));
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert(t("common.error"), passwordError);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        t("common.error"),
        t("auth.reset_password.passwords_dont_match")
      );
      return;
    }

    try {
      setIsLoading(true);
      const response = await userAPI.resetPassword(
        resetToken as string,
        password
      );

      if (response.success) {
        Alert.alert(
          t("common.success"),
          t("auth.reset_password.reset_successful"),
          [
            {
              text: t("common.ok"),
              onPress: () => router.replace("/(auth)/signin"),
            },
          ]
        );
      } else {
        throw new Error(response.error || "Failed to reset password");
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

  const isFormValid = () => {
    return (
      password.trim() &&
      confirmPassword.trim() &&
      password === confirmPassword &&
      validatePassword(password) === null
    );
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
      gap: 16,
    },
    inputContainer: {
      backgroundColor: "#F8F9FA",
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: "#E5E5EA",
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: "#8E8E93",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    passwordInput: {
      flex: 1,
      fontSize: 17,
      color: "#1C1C1E",
      paddingVertical: 0,
    },
    eyeButton: {
      padding: 4,
    },
    resetButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
    },
    resetButtonDisabled: {
      opacity: 0.6,
    },
    resetButtonText: {
      fontSize: 17,
      fontWeight: "600",
      color: "white",
    },
    requirements: {
      backgroundColor: "#F8F9FA",
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    requirementsTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: "#1C1C1E",
      marginBottom: 8,
    },
    requirementText: {
      fontSize: 14,
      color: "#8E8E93",
      lineHeight: 20,
    },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("auth.reset_password.reset_password_title")}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="key" size={40} color="white" />
            </View>
            <Text style={styles.title}>{t("auth.reset_password.title")}</Text>
            <Text style={styles.subtitle}>
              {t("auth.reset_password.subtitle")}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {t("auth.reset_password.new_password")}
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t("auth.reset_password.enter_new_password")}
                  placeholderTextColor="#C7C7CC"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#C7C7CC"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {t("auth.reset_password.confirm_new_password")}
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t("auth.reset_password.confirm_new_password")}
                  placeholderTextColor="#C7C7CC"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#C7C7CC"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.requirements}>
              <Text style={styles.requirementsTitle}>
                {t("auth.reset_password.password_requirements")}
              </Text>
              <Text style={styles.requirementText}>
                • {t("auth.reset_password.password_requirement_length")}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.resetButton,
                (!isFormValid() || isLoading) && styles.resetButtonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={!isFormValid() || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.loadingText}>
                    {t("auth.loading.resetting_password")}
                  </Text>
                </View>
              ) : (
                <Text style={styles.resetButtonText}>
                  {t("auth.reset_password.title")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
