import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from "react-native";
import { AlertTriangle, X, RefreshCw, Info } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { LinearGradient } from "expo-linear-gradient";
import { getErrorMessage, errorMessageIncludes, errorMessageIncludesAny } from "@/src/utils/errorHandler";

interface EnhancedErrorDisplayProps {
  visible: boolean;
  error: any;
  onClose: () => void;
  onRetry?: () => void;
  context?: string;
}

export const EnhancedErrorDisplay: React.FC<EnhancedErrorDisplayProps> = ({
  visible,
  error,
  onClose,
  onRetry,
  context,
}) => {
  const { colors, isDark, emeraldSpectrum } = useTheme();
  const { language } = useLanguage();
  const isHebrew = language === "he";

  const scaleAnim = React.useRef(new Animated.Value(0.3)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const getErrorInfo = () => {
    let title = isHebrew ? "שגיאה" : "Error";
    let message = isHebrew
      ? "אירעה שגיאה בלתי צפויה"
      : "An unexpected error occurred";
    let suggestion = isHebrew
      ? "אנא נסה שוב מאוחר יותר"
      : "Please try again later";

    // Use safe error message extraction
    const safeErrorMessage = getErrorMessage(error);

    // Network errors - check first for better error handling
    if (
      errorMessageIncludesAny(error, ["Network", "network", "ECONNREFUSED", "ETIMEDOUT"]) ||
      error?.code === "ERR_NETWORK"
    ) {
      title = isHebrew ? "שגיאת חיבור" : "Connection Error";
      message = isHebrew
        ? "לא ניתן להתחבר לשרת. אנא בדוק את חיבור האינטרנט שלך."
        : "Unable to connect to server. Please check your internet connection.";
      suggestion = isHebrew
        ? "וודא שהשרת פועל ושחיבור האינטרנט שלך פעיל, ולאחר מכן נסה שוב."
        : "Ensure the server is running and your internet connection is active, then try again.";
      return { title, message, suggestion };
    }

    // Check for Hebrew error message in the error object
    const errorMessage = safeErrorMessage || error?.response?.data?.error || "";
    const hasHebrewError = /[\u0590-\u05FF]/.test(errorMessage);

    // If error message contains Hebrew, use it directly
    if (hasHebrewError && isHebrew) {
      message = errorMessage;
    } else if (!hasHebrewError && !isHebrew && errorMessage) {
      message = errorMessage;
    }

    // API errors
    else if (error?.response?.data?.error) {
      message = error.response.data.error;
      if (isHebrew && error.response.data.error_he) {
        message = error.response.data.error_he;
      }
    }

    // Timeout errors
    else if (
      error?.code === "ECONNABORTED" ||
      errorMessageIncludes(error, "timeout")
    ) {
      title = isHebrew ? "תם הזמן" : "Request Timeout";
      message = isHebrew
        ? "הבקשה לקחה יותר מדי זמן"
        : "The request took too long";
      suggestion = isHebrew
        ? "נסה שוב עם תמונה בהירה יותר או פשט את הבקשה"
        : "Try again with a clearer image or simplify your request";
    }

    // Server errors
    else if (error?.response?.status >= 500) {
      title = isHebrew ? "שגיאת שרת" : "Server Error";
      message = isHebrew
        ? "השרת נתקל בבעיה"
        : "The server encountered a problem";
      suggestion = isHebrew
        ? "אנא נסה שוב בעוד מספר דקות"
        : "Please try again in a few minutes";
    }

    // Authentication errors
    else if (error?.response?.status === 401) {
      title = isHebrew ? "שגיאת אימות" : "Authentication Error";
      message = isHebrew
        ? "נדרש להתחבר מחדש"
        : "Please sign in again to continue";
      suggestion = isHebrew
        ? "התחבר שוב כדי להמשיך"
        : "Sign in again to continue";
    }

    // Validation errors
    else if (error?.response?.status === 400) {
      title = isHebrew ? "שגיאת אימות נתונים" : "Validation Error";
      message = error?.response?.data?.error || safeErrorMessage || message;
      suggestion = isHebrew
        ? "בדוק את הנתונים שהזנת ונסה שוב"
        : "Check your input and try again";
    }

    // AI/Menu generation specific errors
    else if (
      errorMessageIncludesAny(error, ["ingredients", "רכיבים", "menu", "תפריט"])
    ) {
      title = isHebrew ? "שגיאה ביצירת תפריט" : "Menu Generation Failed";
      message = safeErrorMessage || message;
      suggestion = isHebrew
        ? "נסה עם רכיבים שונים או תיאור פשוט יותר. וודא שהרכיבים מתאימים להעדפות התזונה שלך (לדוגמה: טונה אינה צמחונית)."
        : "Try with different ingredients or simpler descriptions. Ensure ingredients match your dietary preferences (e.g., tuna is not vegetarian).";
    }

    // Dietary restriction conflicts
    else if (
      errorMessageIncludesAny(error, ["vegetarian", "dietary", "צמחוני", "תזונתי"])
    ) {
      title = isHebrew ? "סתירה בהעדפות תזונה" : "Dietary Preference Conflict";
      message = safeErrorMessage || message;
      suggestion = isHebrew
        ? "בדוק שהרכיבים שבחרת מתאימים להעדפות התזונה שלך. לדוגמה: דגים וטונה אינם מתאימים לתזונה צמחונית."
        : "Check that your selected ingredients match your dietary preferences. For example: fish and tuna are not suitable for vegetarian diets.";
    }

    // Add context if provided
    if (context) {
      title = isHebrew ? `${context} - שגיאה` : `${context} Error`;
    }

    return { title, message, suggestion };
  };

  const { title, message, suggestion } = getErrorInfo();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header with gradient */}
          <LinearGradient
            colors={
              isDark
                ? [emeraldSpectrum.emerald700, emeraldSpectrum.emerald800]
                : [emeraldSpectrum.emerald500, emeraldSpectrum.emerald600]
            }
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <AlertTriangle size={28} color="#ffffff" />
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            <Text
              style={[
                styles.message,
                { color: colors.text, textAlign: isHebrew ? "right" : "left" },
              ]}
            >
              {message}
            </Text>

            {suggestion && (
              <View
                style={[
                  styles.suggestionBox,
                  { backgroundColor: colors.primaryContainer },
                ]}
              >
                <Info size={20} color={colors.primary} />
                <Text
                  style={[
                    styles.suggestion,
                    {
                      color: colors.primary,
                      textAlign: isHebrew ? "right" : "left",
                    },
                  ]}
                >
                  {suggestion}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              {onRetry && (
                <TouchableOpacity
                  style={[
                    styles.retryButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    onClose();
                    onRetry();
                  }}
                >
                  <RefreshCw size={20} color="#ffffff" />
                  <Text style={styles.retryButtonText}>
                    {isHebrew ? "נסה שוב" : "Try Again"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.closeButtonBottom,
                  {
                    backgroundColor: colors.border,
                    marginRight: onRetry && !isHebrew ? 12 : 0,
                    marginLeft: onRetry && isHebrew ? 12 : 0,
                  },
                ]}
                onPress={onClose}
              >
                <Text style={[styles.closeButtonText, { color: colors.text }]}>
                  {isHebrew ? "סגור" : "Close"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: "85%",
    maxWidth: 400,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 20,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  suggestionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  suggestion: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  retryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  closeButtonBottom: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
