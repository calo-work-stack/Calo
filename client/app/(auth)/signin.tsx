import React, { useState, useRef, useEffect } from "react";
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
  Animated,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import { signIn } from "@/src/store/authSlice";
import { RootState, AppDispatch } from "@/src/store";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

export default function SignInScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Input refs
  const passwordRef = useRef<TextInput>(null);

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

  const handleSignIn = async () => {
    Keyboard.dismiss();

    if (!email || !password) {
      shake();
      Alert.alert(t("common.error"), t("auth.errors.required_field"));
      return;
    }

    setIsSubmitting(true);
    startProgressAnimation();

    try {
      const result = await dispatch(signIn({ email, password })).unwrap();
      if (result.success) {
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      shake();
      Alert.alert(t("common.error"), error || t("auth.sign_in.failed"));
    } finally {
      setIsSubmitting(false);
      progressAnim.stopAnimation();
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
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
          <Ionicons
            name={isRTL ? "chevron-forward" : "chevron-back"}
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("auth.sign_in.title")}
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
                {
                  shadowColor: colors.primary,
                },
              ]}
            >
              <Ionicons name="nutrition" size={38} color={colors.onPrimary} />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("auth.sign_in.welcome_back")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t("auth.sign_in.subtitle")}
            </Text>
          </View>

          {/* Form */}
          <Animated.View
            style={[
              styles.formContainer,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {/* Email Input */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: emailFocused ? colors.primary : colors.border,
                  shadowColor: emailFocused ? colors.primary : colors.shadow,
                },
              ]}
            >
              <View
                style={[
                  styles.inputIconContainer,
                  { backgroundColor: colors.surfaceVariant },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={emailFocused ? colors.primary : colors.icon}
                />
              </View>
              <View style={styles.inputWrapper}>
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
                  {t("auth.sign_in.email_label")}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text },
                    isRTL && styles.inputRTL,
                  ]}
                  placeholder={t("auth.sign_in.email_placeholder")}
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
                <Ionicons
                  name="lock-closed-outline"
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
                  {t("auth.sign_in.password_label")}
                </Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    ref={passwordRef}
                    style={[
                      styles.input,
                      styles.passwordInput,
                      { color: colors.text },
                      isRTL && styles.inputRTL,
                    ]}
                    placeholder={t("auth.sign_in.password_placeholder")}
                    placeholderTextColor={colors.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    editable={!isSubmitting}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
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
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Forgot Password */}
            <Link href="/(auth)/forgotPassword" asChild>
              <TouchableOpacity style={styles.forgotPassword}>
                <Text
                  style={[styles.forgotPasswordText, { color: colors.primary }]}
                >
                  {t("auth.sign_in.forgot_password")}
                </Text>
              </TouchableOpacity>
            </Link>

            {/* Sign In Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.signInButton,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                  (!email || !password || isSubmitting) &&
                    styles.signInButtonDisabled,
                ]}
                onPress={handleSignIn}
                onPressIn={() => animateButton(true)}
                onPressOut={() => animateButton(false)}
                disabled={!email || !password || isSubmitting}
                activeOpacity={0.9}
              >
                {isSubmitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                    <Text
                      style={[styles.loadingText, { color: colors.onPrimary }]}
                    >
                      {t("auth.sign_in.signing_in")}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.signInButtonText,
                      { color: colors.onPrimary },
                    ]}
                  >
                    {t("auth.sign_in.title")}
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
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t("auth.sign_in.no_account")}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
              >
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  {t("auth.sign_in.sign_up")}
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  },
  formContainer: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
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
  forgotPassword: {
    alignSelf: "flex-end",
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
  },
  signInButton: {
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
  signInButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  signInButtonText: {
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
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 15,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
