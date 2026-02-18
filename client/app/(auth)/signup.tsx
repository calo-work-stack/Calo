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
import { ChevronLeft, ChevronRight, User, Mail, Lock, ShieldCheck, Eye, EyeOff, Globe, CheckCircle, Check, UserPlus, Info, X } from "lucide-react-native";
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
  { key: "he", label: "עברית" },
  { key: "en", label: "English" },
];

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
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

  // Info tooltip states
  const [showNameInfo, setShowNameInfo] = useState(false);
  const [showEmailInfo, setShowEmailInfo] = useState(false);
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);

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

  // Password validation rules matching server
  const passwordChecks = [
    { key: "min", check: (p: string) => p.length >= 8, label: t("auth.sign_up.requirements.password_min") },
    { key: "upper", check: (p: string) => /[A-Z]/.test(p), label: t("auth.sign_up.requirements.password_uppercase") },
    { key: "lower", check: (p: string) => /[a-z]/.test(p), label: t("auth.sign_up.requirements.password_lowercase") },
    { key: "number", check: (p: string) => /\d/.test(p), label: t("auth.sign_up.requirements.password_number") },
  ];

  const isPasswordValid = passwordChecks.every((rule) => rule.check(password));

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

    if (!isPasswordValid) {
      shake();
      ToastService.error(
        t("common.error"),
        t("auth.reset_password.password_too_short"),
      );
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
      isPasswordValid &&
      acceptedPrivacyPolicy
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
            onPress={() => router.push("/(auth)/welcome")}
            activeOpacity={0.7}
          >
            {isRTL ? (
              <ChevronRight size={22} color={colors.primary} />
            ) : (
              <ChevronLeft size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("auth.sign_up.title")}
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
                    {
                      shadowColor: colors.primary,
                    },
                  ]}
                >
                  <UserPlus
                    size={36}
                    color={colors.onPrimary}
                  />
                </LinearGradient>
                <Text style={[styles.title, { color: colors.text }]}>
                  {t("auth.sign_up.create_account")}
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                >
                  {t("auth.sign_up.subtitle")}
                </Text>
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
                    {
                      backgroundColor: colors.card,
                      borderColor: nameFocused ? colors.primary : colors.border,
                      shadowColor: nameFocused ? colors.primary : colors.shadow,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.inputIconContainer,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                  >
                    <User
                      size={20}
                      color={nameFocused ? colors.primary : colors.icon}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <View style={styles.labelRow}>
                      <Text
                        style={[
                          styles.inputLabel,
                          {
                            color: nameFocused
                              ? colors.primary
                              : colors.textTertiary,
                          },
                        ]}
                      >
                        {t("auth.sign_up.name_label")}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowNameInfo(!showNameInfo)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Info size={14} color={showNameInfo ? colors.primary : colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[
                        styles.input,
                        { color: colors.text },
                        isRTL && styles.inputRTL,
                      ]}
                      placeholder={t("auth.sign_up.name_placeholder")}
                      placeholderTextColor={colors.textTertiary}
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

                {/* Name Requirements Tooltip */}
                {showNameInfo && (
                  <View style={[styles.tooltipContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.tooltipTitle, { color: colors.text }]}>
                      {t("auth.sign_up.requirements.title")}
                    </Text>
                    <View style={styles.tooltipRow}>
                      {name.length >= 2 ? (
                        <Check size={14} color={colors.primary} />
                      ) : (
                        <X size={14} color={colors.error || "#EF4444"} />
                      )}
                      <Text style={[styles.tooltipText, { color: name.length >= 2 ? colors.primary : colors.textSecondary }]}>
                        {t("auth.sign_up.requirements.name_min")}
                      </Text>
                    </View>
                    <View style={styles.tooltipRow}>
                      {name.length <= 50 ? (
                        <Check size={14} color={colors.primary} />
                      ) : (
                        <X size={14} color={colors.error || "#EF4444"} />
                      )}
                      <Text style={[styles.tooltipText, { color: name.length <= 50 ? colors.primary : colors.textSecondary }]}>
                        {t("auth.sign_up.requirements.name_max")}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Email Input */}
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: emailFocused
                        ? colors.primary
                        : colors.border,
                      shadowColor: emailFocused
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
                    <Mail
                      size={20}
                      color={emailFocused ? colors.primary : colors.icon}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <View style={styles.labelRow}>
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
                        {t("auth.sign_up.email_label")}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowEmailInfo(!showEmailInfo)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Info size={14} color={showEmailInfo ? colors.primary : colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      ref={emailRef}
                      style={[
                        styles.input,
                        { color: colors.text },
                        isRTL && styles.inputRTL,
                      ]}
                      placeholder={t("auth.sign_up.email_placeholder")}
                      placeholderTextColor={colors.textTertiary}
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

                {/* Email Requirements Tooltip */}
                {showEmailInfo && (
                  <View style={[styles.tooltipContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.tooltipTitle, { color: colors.text }]}>
                      {t("auth.sign_up.requirements.title")}
                    </Text>
                    <View style={styles.tooltipRow}>
                      {validateEmail(email) ? (
                        <Check size={14} color={colors.primary} />
                      ) : (
                        <X size={14} color={colors.error || "#EF4444"} />
                      )}
                      <Text style={[styles.tooltipText, { color: validateEmail(email) ? colors.primary : colors.textSecondary }]}>
                        {t("auth.sign_up.requirements.email_valid")}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Password Input */}
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: passwordFocused
                        ? colors.primary
                        : colors.border,
                      shadowColor: passwordFocused
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
                    <Lock
                      size={20}
                      color={passwordFocused ? colors.primary : colors.icon}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <View style={styles.labelRow}>
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
                        {t("auth.sign_up.password_label")}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowPasswordInfo(!showPasswordInfo)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Info size={14} color={showPasswordInfo ? colors.primary : colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.passwordRow}>
                      <TextInput
                        ref={passwordRef}
                        style={[
                          styles.input,
                          styles.passwordInput,
                          { color: colors.text },
                          isRTL && styles.inputRTL,
                        ]}
                        placeholder={t("auth.sign_up.password_placeholder")}
                        placeholderTextColor={colors.textTertiary}
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
                        onSubmitEditing={() =>
                          confirmPasswordRef.current?.focus()
                        }
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
                {(showPasswordInfo || (password.length > 0 && !isPasswordValid)) && (
                  <View style={[styles.tooltipContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.tooltipTitle, { color: colors.text }]}>
                      {t("auth.sign_up.requirements.title")}
                    </Text>
                    {passwordChecks.map((rule) => {
                      const passed = rule.check(password);
                      return (
                        <View key={rule.key} style={styles.tooltipRow}>
                          {passed ? (
                            <Check size={14} color={colors.primary} />
                          ) : (
                            <X size={14} color={colors.error || "#EF4444"} />
                          )}
                          <Text
                            style={[
                              styles.tooltipText,
                              { color: passed ? colors.primary : colors.textSecondary },
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
                      color={
                        confirmPasswordFocused ? colors.primary : colors.icon
                      }
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
                      {t("auth.sign_up.confirm_password_label")}
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
                        placeholder={t(
                          "auth.sign_up.confirm_password_placeholder",
                        )}
                        placeholderTextColor={colors.textTertiary}
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
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
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

                {/* Language Selection */}
                <View style={styles.langSection}>
                  <Text
                    style={[styles.langTitle, { color: colors.textSecondary }]}
                  >
                    {t("auth.sign_up.lang_preferance")}
                  </Text>
                  <View style={styles.langOptions}>
                    {langOptions.map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.langOption,
                          {
                            backgroundColor:
                              lang === option.key
                                ? colors.primaryContainer
                                : colors.card,
                            borderColor:
                              lang === option.key
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                        onPress={() => setLang(option.key)}
                        activeOpacity={0.7}
                      >
                        <Globe
                          size={20}
                          color={
                            lang === option.key ? colors.primary : colors.icon
                          }
                        />
                        <Text
                          style={[
                            styles.langOptionText,
                            {
                              color:
                                lang === option.key
                                  ? colors.primary
                                  : colors.textSecondary,
                              fontWeight: lang === option.key ? "600" : "400",
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        {lang === option.key && (
                          <CheckCircle
                            size={20}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Privacy Policy */}
                <TouchableOpacity
                  style={[
                    styles.privacyContainer,
                    {
                      backgroundColor: acceptedPrivacyPolicy
                        ? colors.primaryContainer
                        : colors.card,
                      borderColor: acceptedPrivacyPolicy
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                  onPress={() =>
                    setAcceptedPrivacyPolicy(!acceptedPrivacyPolicy)
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: acceptedPrivacyPolicy
                          ? colors.primary
                          : "transparent",
                        borderColor: acceptedPrivacyPolicy
                          ? colors.primary
                          : colors.muted,
                      },
                    ]}
                  >
                    {acceptedPrivacyPolicy && (
                      <Check
                        size={14}
                        color={colors.onPrimary}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.privacyText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("auth.sign_up.agree_text")}{" "}
                    <Text
                      style={[styles.privacyLink, { color: colors.primary }]}
                    >
                      {t("auth.sign_up.terms_of_service")}
                    </Text>{" "}
                    {t("auth.sign_up.and")}{" "}
                    <Text
                      style={[styles.privacyLink, { color: colors.primary }]}
                    >
                      {t("auth.sign_up.privacy_policy")}
                    </Text>
                  </Text>
                </TouchableOpacity>

                {/* Sign Up Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.signUpButton,
                      {
                        backgroundColor: colors.primary,
                        shadowColor: colors.primary,
                      },
                      (!isFormValid() || isSubmitting) &&
                        styles.signUpButtonDisabled,
                    ]}
                    onPress={handleSignUp}
                    onPressIn={() => animateButton(true)}
                    onPressOut={() => animateButton(false)}
                    disabled={!isFormValid() || isSubmitting}
                    activeOpacity={0.9}
                  >
                    {isSubmitting ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator
                          size="small"
                          color={colors.onPrimary}
                        />
                        <Text
                          style={[
                            styles.loadingText,
                            { color: colors.onPrimary },
                          ]}
                        >
                          {t("auth.sign_up.creating_account")}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.signUpButtonText,
                          { color: colors.onPrimary },
                        ]}
                      >
                        {t("auth.sign_up.create_account")}
                      </Text>
                    )}

                    {/* Progress bar during loading */}
                    {isSubmitting && (
                      <Animated.View
                        style={[styles.progressBar, { width: progressWidth }]}
                      />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text
                  style={[styles.footerText, { color: colors.textSecondary }]}
                >
                  {t("auth.sign_up.already_have_account")}
                </Text>
                <Link href="/(auth)/signin" asChild>
                  <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                  >
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
    marginBottom: 28,
  },
  logoContainer: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
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
  langSection: {
    marginTop: 4,
  },
  langTitle: {
    fontSize: 12,
    fontWeight: "600",
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
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
  },
  langOptionText: {
    fontSize: 14,
  },
  privacyContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 6,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyText: {
    fontSize: 13,
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
    marginTop: 24,
    gap: 4,
  },
  footerText: {
    fontSize: 15,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
  },
  tooltipContainer: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 6,
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  tooltipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tooltipText: {
    fontSize: 12,
  },
});
