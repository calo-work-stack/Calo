import React, { useState, useRef, useEffect } from "react";
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
  Animated,
  Keyboard,
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
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const langOptions = [
  { key: "he", label: "עברית", icon: "globe-outline" },
  { key: "en", label: "English", icon: "globe-outline" },
];

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
  const [lang, setLang] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Input refs
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

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
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
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

  const handleSignUp = async () => {
    Keyboard.dismiss();

    if (!email || !password || !name) {
      shake();
      ToastService.error(t("common.error"), t("auth.errors.required_field"));
      return;
    }

    if (!validateEmail(email)) {
      shake();
      ToastService.error(t("common.error"), t("auth.email_validation_error"));
      return;
    }

    if (password !== confirmPassword) {
      shake();
      ToastService.error(
        t("common.error"),
        t("auth.errors.passwords_dont_match"),
      );
      return;
    }

    if (!acceptedPrivacyPolicy) {
      shake();
      ToastService.error(t("common.error"), t("auth.privacy_policy_required"));
      return;
    }

    setIsSubmitting(true);
    startProgressAnimation();

    try {
      const result = await dispatch(
        signUp({
          email,
          password,
          name,
          birth_date: new Date(),
          preferred_lang: lang,
        }),
      ).unwrap();

      if (result.success) {
        ToastService.success(
          t("auth.account_created"),
          result.message || t("auth.email_verification.check_email"),
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
      shake();
      ToastService.error(
        t("common.error"),
        error.message || error || t("auth.failed_create_account"),
      );
    } finally {
      setIsSubmitting(false);
      progressAnim.stopAnimation();
    }
  };

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

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(auth)/welcome")}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("auth.sign_up.title")}</Text>
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
                  colors={[colors.primary, "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoContainer}
                >
                  <Ionicons name="person-add" size={36} color="white" />
                </LinearGradient>
                <Text style={styles.title}>
                  {t("auth.sign_up.create_account")}
                </Text>
                <Text style={styles.subtitle}>{t("auth.sign_up.subtitle")}</Text>
              </View>

              {/* Form */}
              <Animated.View
                style={[
                  styles.formContainer,
                  { transform: [{ translateX: shakeAnim }] },
                ]}
              >
                {/* Name Input */}
                <View
                  style={[
                    styles.inputContainer,
                    nameFocused && styles.inputContainerFocused,
                  ]}
                >
                  <View style={styles.inputIconContainer}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={nameFocused ? colors.primary : "#9CA3AF"}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text
                      style={[
                        styles.inputLabel,
                        nameFocused && styles.inputLabelFocused,
                      ]}
                    >
                      {t("auth.sign_up.name_label")}
                    </Text>
                    <TextInput
                      style={[styles.input, isRTL && styles.inputRTL]}
                      placeholder={t("auth.sign_up.name_placeholder")}
                      placeholderTextColor="#9CA3AF"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!isSubmitting}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                      textAlign={isRTL ? "right" : "left"}
                    />
                  </View>
                </View>

                {/* Email Input */}
                <View
                  style={[
                    styles.inputContainer,
                    emailFocused && styles.inputContainerFocused,
                  ]}
                >
                  <View style={styles.inputIconContainer}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={emailFocused ? colors.primary : "#9CA3AF"}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text
                      style={[
                        styles.inputLabel,
                        emailFocused && styles.inputLabelFocused,
                      ]}
                    >
                      {t("auth.sign_up.email_label")}
                    </Text>
                    <TextInput
                      ref={emailRef}
                      style={[styles.input, isRTL && styles.inputRTL]}
                      placeholder={t("auth.sign_up.email_placeholder")}
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      editable={!isSubmitting}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                      textAlign={isRTL ? "right" : "left"}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View
                  style={[
                    styles.inputContainer,
                    passwordFocused && styles.inputContainerFocused,
                  ]}
                >
                  <View style={styles.inputIconContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={passwordFocused ? colors.primary : "#9CA3AF"}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text
                      style={[
                        styles.inputLabel,
                        passwordFocused && styles.inputLabelFocused,
                      ]}
                    >
                      {t("auth.sign_up.password_label")}
                    </Text>
                    <View style={styles.passwordRow}>
                      <TextInput
                        ref={passwordRef}
                        style={[styles.input, styles.passwordInput, isRTL && styles.inputRTL]}
                        placeholder={t("auth.sign_up.password_placeholder")}
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="password-new"
                        editable={!isSubmitting}
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
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View
                  style={[
                    styles.inputContainer,
                    confirmPasswordFocused && styles.inputContainerFocused,
                  ]}
                >
                  <View style={styles.inputIconContainer}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={confirmPasswordFocused ? colors.primary : "#9CA3AF"}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text
                      style={[
                        styles.inputLabel,
                        confirmPasswordFocused && styles.inputLabelFocused,
                      ]}
                    >
                      {t("auth.sign_up.confirm_password_label")}
                    </Text>
                    <View style={styles.passwordRow}>
                      <TextInput
                        ref={confirmPasswordRef}
                        style={[styles.input, styles.passwordInput, isRTL && styles.inputRTL]}
                        placeholder={t("auth.sign_up.confirm_password_placeholder")}
                        placeholderTextColor="#9CA3AF"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="password-new"
                        editable={!isSubmitting}
                        onFocus={() => setConfirmPasswordFocused(true)}
                        onBlur={() => setConfirmPasswordFocused(false)}
                        returnKeyType="done"
                        onSubmitEditing={handleSignUp}
                        textAlign={isRTL ? "right" : "left"}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Language Selection */}
                <View style={styles.langSection}>
                  <Text style={styles.langTitle}>
                    {t("auth.sign_up.lang_preferance")}
                  </Text>
                  <View style={styles.langOptions}>
                    {langOptions.map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.langOption,
                          lang === option.key && styles.langOptionSelected,
                          lang === option.key && { borderColor: colors.primary },
                        ]}
                        onPress={() => setLang(option.key)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={option.icon as any}
                          size={20}
                          color={lang === option.key ? colors.primary : "#9CA3AF"}
                        />
                        <Text
                          style={[
                            styles.langOptionText,
                            lang === option.key && { color: colors.primary, fontWeight: "600" },
                          ]}
                        >
                          {option.label}
                        </Text>
                        {lang === option.key && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Privacy Policy */}
                <TouchableOpacity
                  style={[
                    styles.privacyContainer,
                    acceptedPrivacyPolicy && styles.privacyContainerAccepted,
                  ]}
                  onPress={() => setAcceptedPrivacyPolicy(!acceptedPrivacyPolicy)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      acceptedPrivacyPolicy && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    {acceptedPrivacyPolicy && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                  <Text style={styles.privacyText}>
                    {t("auth.sign_up.agree_text")}{" "}
                    <Text style={[styles.privacyLink, { color: colors.primary }]}>
                      {t("auth.sign_up.terms_of_service")}
                    </Text>{" "}
                    {t("auth.sign_up.and")}{" "}
                    <Text style={[styles.privacyLink, { color: colors.primary }]}>
                      {t("auth.sign_up.privacy_policy")}
                    </Text>
                  </Text>
                </TouchableOpacity>

                {/* Sign Up Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.signUpButton,
                      { backgroundColor: colors.primary },
                      (!isFormValid() || isSubmitting) && styles.signUpButtonDisabled,
                    ]}
                    onPress={handleSignUp}
                    onPressIn={() => animateButton(true)}
                    onPressOut={() => animateButton(false)}
                    disabled={!isFormValid() || isSubmitting}
                    activeOpacity={0.9}
                  >
                    {isSubmitting ? (
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

                    {/* Progress bar during loading */}
                    {isSubmitting && (
                      <Animated.View
                        style={[
                          styles.progressBar,
                          { width: progressWidth },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {t("auth.sign_up.already_have_account")}
                </Text>
                <Link href="/(auth)/signin" asChild>
                  <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}>
                    <Text style={[styles.linkText, { color: colors.primary }]}>
                      {t("auth.sign_up.sign_in")}
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>
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
    backgroundColor: "#FAFAFA",
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
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
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
    marginBottom: 28,
  },
  logoContainer: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },
  formContainer: {
    gap: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputContainerFocused: {
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
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
    color: "#9CA3AF",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputLabelFocused: {
    color: "#10B981",
  },
  input: {
    fontSize: 15,
    color: "#1F2937",
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
  langSection: {
    marginTop: 4,
  },
  langTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  langOptions: {
    flexDirection: "row",
    gap: 12,
  },
  langOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  langOptionSelected: {
    backgroundColor: "#F0FDF4",
  },
  langOptionText: {
    fontSize: 14,
    color: "#6B7280",
  },
  privacyContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    marginTop: 4,
  },
  privacyContainerAccepted: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  privacyText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
    lineHeight: 20,
  },
  privacyLink: {
    fontWeight: "600",
  },
  signUpButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signUpButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  signUpButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "white",
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
    marginTop: 24,
    gap: 4,
  },
  footerText: {
    fontSize: 15,
    color: "#6B7280",
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
