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
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import { signIn } from "@/src/store/authSlice";
import { RootState, AppDispatch } from "@/src/store";

const { width, height } = Dimensions.get("window");

export default function SignInScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { colors } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert(t("common.error"), t("auth.errors.required_field"));
      return;
    }

    try {
      const result = await dispatch(signIn({ email, password })).unwrap();
      if (result.success) {
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error || t("auth.sign_in.failed"));
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
    content: { flex: 1, paddingHorizontal: 24 },
    logoSection: { alignItems: "center", marginBottom: 48, marginTop: 20 },
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
    forgotPassword: { alignSelf: "flex-end", marginTop: 12 },
    forgotPasswordText: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: "500",
    },
    signInButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 32,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    signInButtonDisabled: { opacity: 0.6 },
    signInButtonText: {
      fontSize: 17,
      fontWeight: "600",
      color: "white",
      letterSpacing: 0.5,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 32,
      paddingBottom: 32,
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
          onPress={() => router.push("/(auth)/welcome")}
        >
          <Ionicons name="chevron-back" size={20} color={colors.emerald500} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("auth.sign_in.title")}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="nutrition" size={40} color="white" />
            </View>
            <Text style={styles.title}>{t("auth.sign_in.welcome_back")}</Text>
            <Text style={styles.subtitle}>{t("auth.sign_in.subtitle")}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("auth.sign_in.email_label")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("auth.sign_in.email_placeholder")}
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
                {t("auth.sign_in.password_label")}
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t("auth.sign_in.password_placeholder")}
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

            <TouchableOpacity style={styles.forgotPassword}>
              <Link href="/(auth)/forgotPassword" asChild>
                <TouchableOpacity>
                  <Text style={styles.forgotPasswordText}>
                    {t("auth.sign_in.forgot_password")}
                  </Text>
                </TouchableOpacity>
              </Link>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.signInButton,
                (!email || !password || isLoading) &&
                  styles.signInButtonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={!email || !password || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.loadingText}>
                    {t("auth.sign_in.signing_in")}
                  </Text>
                </View>
              ) : (
                <Text style={styles.signInButtonText}>
                  {t("auth.sign_in.title")}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {t("auth.sign_in.no_account")}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>{t("auth.sign_in.sign_up")}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
