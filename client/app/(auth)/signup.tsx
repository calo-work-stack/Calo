import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useDispatch, useSelector } from "react-redux";
import { signUp } from "@/src/store/authSlice";
import { RootState, AppDispatch } from "@/src/store";
import { ToastService } from "@/src/services/totastService";
import Toast from "react-native-toast-message";
import { useTheme } from "@/src/context/ThemeContext";

const { width, height } = Dimensions.get("window");

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { colors } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      ToastService.error(t("common.error"), t("auth.errors.required_field"));
      return;
    }

    if (!validateEmail(email)) {
      ToastService.error(t("common.error"), t("auth.email_validation_error"));
      return;
    }

    if (password !== confirmPassword) {
      ToastService.error(
        t("common.error"),
        t("auth.errors.passwords_dont_match")
      );
      return;
    }

    if (!acceptedPrivacyPolicy) {
      ToastService.error(t("common.error"), t("auth.privacy_policy_required"));
      return;
    }

    try {
      const result = await dispatch(
        signUp({
          email,
          password,
          name,
          birth_date: new Date(),
        })
      ).unwrap();

      if (result.success) {
        ToastService.success(
          t("auth.account_created"),
          result.message || t("auth.email_verification.check_email")
        );

        setTimeout(() => {
          router.push({
            pathname: "/(auth)/email-verification",
            params: { email },
          });
        }, 1500);
      } else {
        throw new Error(result.error || t("auth.failed_create_account"));
      }
    } catch (error: any) {
      ToastService.error(
        t("common.error"),
        error.message || error || t("auth.failed_create_account")
      );
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 32,
    },
    logoSection: { alignItems: "center", marginBottom: 40, marginTop: 20 },
    logoContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: "#1C1C1E",
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: { fontSize: 17, color: "#8E8E93", textAlign: "center" },
    formContainer: { gap: 16 },
    inputContainer: {
      backgroundColor: "white",
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: "#E5E5EA",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: "#8E8E93",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    input: { fontSize: 17, color: "#1C1C1E", paddingVertical: 0 },
    passwordContainer: { flexDirection: "row", alignItems: "center" },
    passwordInput: {
      flex: 1,
      fontSize: 17,
      color: "#1C1C1E",
      paddingVertical: 0,
    },
    eyeButton: { padding: 4 },
    privacyContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: "white",
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: "#E5E5EA",
      marginTop: 8,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: "#C7C7CC",
      borderRadius: 4,
      marginRight: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: acceptedPrivacyPolicy ? colors.primary : "transparent",
    },
    privacyText: { fontSize: 15, color: "#8E8E93", flex: 1, lineHeight: 20 },
    privacyLink: { color: colors.primary, fontWeight: "500" },
    signUpButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 24,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    signUpButtonDisabled: { opacity: 0.6 },
    signUpButtonText: {
      fontSize: 17,
      fontWeight: "600",
      color: "white",
      letterSpacing: 0.5,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 24,
    },
    footerText: { fontSize: 15, color: "#8E8E93" },
    linkText: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: "500",
      marginLeft: 4,
    },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    loadingText: { color: "white", fontSize: 17, fontWeight: "600" },
  });

  const isFormValid = () => {
    return (
      name.trim() &&
      email.trim() &&
      password.trim() &&
      confirmPassword.trim() &&
      password === confirmPassword &&
      validateEmail(email) &&
      acceptedPrivacyPolicy
    );
  };

  return (
    <>
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
            <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("auth.sign_up.title")}</Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Ionicons name="nutrition" size={40} color="white" />
              </View>
              <Text style={styles.title}>
                {t("auth.sign_up.create_account")}
              </Text>
              <Text style={styles.subtitle}>{t("auth.sign_up.subtitle")}</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t("auth.sign_up.name_label")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.sign_up.name_placeholder")}
                  placeholderTextColor="#C7C7CC"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {t("auth.sign_up.email_label")}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.sign_up.email_placeholder")}
                  placeholderTextColor="#C7C7CC"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {t("auth.sign_up.password_label")}
                </Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder={t("auth.sign_up.password_placeholder")}
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
                  {t("auth.sign_up.confirm_password_label")}
                </Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder={t("auth.sign_up.confirm_password_placeholder")}
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

              <TouchableOpacity
                style={styles.privacyContainer}
                onPress={() => setAcceptedPrivacyPolicy(!acceptedPrivacyPolicy)}
              >
                <View style={styles.checkbox}>
                  {acceptedPrivacyPolicy && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>
                <Text style={styles.privacyText}>
                  {t("auth.sign_up.agree_text")}{" "}
                  <Text style={styles.privacyLink}>
                    {t("auth.sign_up.terms_of_service")}
                  </Text>{" "}
                  {t("auth.sign_up.and")}{" "}
                  <Text style={styles.privacyLink}>
                    {t("auth.sign_up.privacy_policy")}
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.signUpButton,
                  (!isFormValid() || isLoading) && styles.signUpButtonDisabled,
                ]}
                onPress={handleSignUp}
                disabled={!isFormValid() || isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.loadingText}>
                      {t("auth.sign_up.creating_account")}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.signUpButtonText}>
                    {t("auth.sign_up.create_account")}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {t("auth.sign_up.already_have_account")}
                </Text>
                <Link href="/(auth)/signin" asChild>
                  <TouchableOpacity>
                    <Text style={styles.linkText}>
                      {t("auth.sign_up.sign_in")}
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Toast />
    </>
  );
}
