// src/Features/theme/authTheme.ts - MATCHING WELCOME SCREEN STYLE
import { StyleSheet, Platform, Dimensions } from "react-native";

const { height } = Dimensions.get("window");

// Auth Styles Generator - DARK GRADIENT STYLE like Welcome Screen
export const createAuthStyles = (primaryColor: string) => {
  return StyleSheet.create({
    // ============= CONTAINER (Dark background like Welcome) =============
    container: {
      flex: 1,
      backgroundColor: "#000",
    },

    // Gradient background (like Welcome screen)
    gradientBackground: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: height,
    },

    // Mesh gradients (floating color blobs)
    meshGradient1: {
      position: "absolute",
      width: 400,
      height: 400,
      borderRadius: 200,
      backgroundColor: primaryColor,
      opacity: 0.4,
      top: -100,
      left: -100,
    },

    meshGradient2: {
      position: "absolute",
      width: 350,
      height: 350,
      borderRadius: 175,
      backgroundColor: primaryColor,
      opacity: 0.3,
      top: 100,
      right: -80,
    },

    meshGradient3: {
      position: "absolute",
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: primaryColor,
      opacity: 0.25,
      bottom: 200,
      left: 50,
    },

    overlayGradient: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: height,
      opacity: 0.6,
    },

    // ============= HEADER (Glassmorphic style) =============
    header: {
      paddingTop: Platform.OS === "ios" ? 50 : 30,
      paddingHorizontal: 24,
      paddingBottom: 20,
      flexDirection: "row",
      alignItems: "center",
    },

    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.15)",
    },

    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: "600",
      color: "white",
      textAlign: "center",
      marginRight: 40,
    },

    // ============= CONTENT AREA =============
    content: {
      flex: 1,
      paddingHorizontal: 32,
      justifyContent: "center",
    },

    scrollContent: {
      paddingHorizontal: 32,
      paddingBottom: 40,
      paddingTop: 20,
    },

    // ============= LOGO SECTION (Like Welcome screen) =============
    logoSection: {
      alignItems: "center",
      marginBottom: 48,
    },

    logoContainer: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.2)",
      shadowColor: primaryColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 8,
    },

    title: {
      fontSize: 32,
      fontWeight: "800",
      color: "white",
      textAlign: "center",
      marginBottom: 12,
      letterSpacing: -0.5,
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 4 },
      textShadowRadius: 12,
    },

    subtitle: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.75)",
      textAlign: "center",
      lineHeight: 24,
      paddingHorizontal: 20,
      letterSpacing: 0.3,
    },

    // ============= FORM CONTAINER (Glassmorphic card) =============
    formContainer: {
      gap: 16,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.12)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },

    formContainerCard: {
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: 24,
      padding: 28,
      marginTop: 32,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.12)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },

    // ============= INPUT STYLES (Glassmorphic) =============
    inputContainer: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.15)",
    },

    inputFocused: {
      borderColor: primaryColor,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
    },

    label: {
      fontSize: 12,
      fontWeight: "700",
      color: "rgba(255, 255, 255, 0.7)",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 1,
    },

    input: {
      fontSize: 16,
      color: "white",
      paddingVertical: 0,
    },

    // ============= PASSWORD CONTAINER =============
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
    },

    passwordInput: {
      flex: 1,
      fontSize: 16,
      color: "white",
      paddingVertical: 0,
    },

    eyeButton: {
      padding: 4,
    },

    // ============= BUTTONS (Matching Welcome screen style) =============
    primaryButton: {
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
      marginTop: 24,
    },

    primaryButtonGradient: {
      paddingVertical: 18,
      alignItems: "center",
    },

    primaryButtonDisabled: {
      opacity: 0.5,
    },

    primaryButtonText: {
      fontSize: 17,
      fontWeight: "800",
      color: primaryColor,
      letterSpacing: 1,
      textTransform: "uppercase",
    },

    // Secondary button (glass style)
    secondaryButton: {
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.25)",
      marginTop: 12,
    },

    secondaryButtonText: {
      fontSize: 17,
      fontWeight: "700",
      color: "white",
      letterSpacing: 0.8,
    },

    // ============= LOADING CONTAINER =============
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },

    loadingText: {
      color: primaryColor,
      fontSize: 17,
      fontWeight: "700",
    },

    // ============= LINKS (Bright white) =============
    link: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.9)",
      fontWeight: "600",
    },

    linkContainer: {
      alignSelf: "flex-end",
      marginTop: 12,
      marginBottom: 8,
    },

    // ============= FOOTER =============
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 32,
      paddingBottom: 20,
    },

    footerSmall: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 24,
    },

    footerText: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.6)",
    },

    linkText: {
      fontSize: 14,
      color: "white",
      fontWeight: "700",
      marginLeft: 4,
    },

    // ============= CHECKBOX / PRIVACY =============
    privacyContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.12)",
      marginTop: 8,
    },

    checkbox: {
      width: 22,
      height: 22,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.5)",
      borderRadius: 6,
      marginRight: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },

    checkboxChecked: {
      backgroundColor: primaryColor,
      borderColor: primaryColor,
    },

    privacyText: {
      fontSize: 13,
      color: "rgba(255, 255, 255, 0.75)",
      flex: 1,
      lineHeight: 19,
    },

    privacyLink: {
      color: "white",
      fontWeight: "700",
    },

    // ============= CODE INPUT (Glassmorphic style) =============
    codeContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 32,
      gap: 8,
    },

    codeInput: {
      width: 48,
      height: 62,
      borderRadius: 14,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.2)",
      fontSize: 28,
      fontWeight: "700",
      color: "white",
      textAlign: "center",
    },

    codeInputFilled: {
      borderColor: primaryColor,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      shadowColor: primaryColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    },

    codeInputFocused: {
      borderColor: primaryColor,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      shadowColor: primaryColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 6,
      transform: [{ scale: 1.05 }],
    },

    codeLabel: {
      fontSize: 18,
      fontWeight: "700",
      color: "white",
      textAlign: "center",
      marginBottom: 28,
      letterSpacing: 0.5,
    },

    // ============= RESEND SECTION =============
    resendContainer: {
      alignItems: "center",
      marginTop: 16,
    },

    resendText: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.65)",
      marginBottom: 12,
      textAlign: "center",
    },

    resendButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
    },

    resendButtonText: {
      fontSize: 15,
      color: "white",
      fontWeight: "700",
    },

    resendDisabledText: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.4)",
      fontWeight: "600",
    },

    // ============= EMAIL HIGHLIGHT =============
    emailText: {
      fontWeight: "700",
      color: "white",
    },
  });
};
