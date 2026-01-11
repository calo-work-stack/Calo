import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Settings,
  Globe,
  Sun,
  Moon,
  CircleHelp as HelpCircle,
  X,
  Sparkles,
} from "lucide-react-native";
import { useTheme } from "../src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { ToastService } from "@/src/services/totastService";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import SubscriptionComparison from "./SubscriptionComparison";

interface HelpContent {
  title: string;
  description: string;
  quickTips?: string[];
  additionalSupport?: string;
}

interface ToolBarProps {
  helpContent?: HelpContent;
  onLanguageChange?: (language: string) => void;
  onThemeChange?: (isDark: boolean) => void;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
  mass: 0.8,
};

const TIMING_CONFIG = {
  duration: 300,
};

const ToolBar: React.FC<ToolBarProps> = ({
  helpContent,
  onLanguageChange,
  onThemeChange,
}) => {
  const { language, changeLanguage, isRTL } = useLanguage();
  const { isDark, toggleTheme, colors } = useTheme();
  const [showHelp, setShowHelp] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSubscriptionComparison, setShowSubscriptionComparison] =
    useState(false);
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state: RootState) => state.auth);

  // Translations
  const t = {
    languageChanged: language === "he" ? "השפה שונתה" : "Language Changed",
    switchedTo: language === "he" ? "הוחלף ל" : "Switched to",
    hebrew: language === "he" ? "עברית" : "Hebrew",
    english: language === "he" ? "אנגלית" : "English",
    error: language === "he" ? "שגיאה" : "Error",
    failedToChangeLanguage: language === "he" ? "שינוי השפה נכשל" : "Failed to change language",
    themeChanged: language === "he" ? "ערכת הנושא שונתה" : "Theme Changed",
    switchedToDark: language === "he" ? "הוחלף לערכת נושא כהה" : "Switched to dark theme",
    switchedToLight: language === "he" ? "הוחלף לערכת נושא בהירה" : "Switched to light theme",
    failedToChangeTheme: language === "he" ? "שינוי ערכת הנושא נכשל" : "Failed to change theme",
    help: language === "he" ? "עזרה" : "Help",
    quickTips: language === "he" ? "טיפים מהירים:" : "Quick Tips:",
    additionalSupport: language === "he" ? "תמיכה נוספת:" : "Additional Support:",
    howCanWeHelp: language === "he" ? "איך אפשר לעזור לך?" : "How can we help you?",
  };

  // Animation values
  const fabScale = useSharedValue(1);
  const fabRotation = useSharedValue(0);
  const menuOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Button positions for radial menu (4 buttons)
  const button1Position = useSharedValue({ x: 0, y: 0 });
  const button2Position = useSharedValue({ x: 0, y: 0 });
  const button3Position = useSharedValue({ x: 0, y: 0 });
  const button4Position = useSharedValue({ x: 0, y: 0 });

  // Button scales for staggered animation
  const button1Scale = useSharedValue(0);
  const button2Scale = useSharedValue(0);
  const button3Scale = useSharedValue(0);
  const button4Scale = useSharedValue(0);

  const isFreeUser = user?.subscription_type === "FREE";

  const handleToggleMenu = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    const expandDirection = isRTL ? 1 : -1;

    fabScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, SPRING_CONFIG)
    );

    if (newExpanded) {
      fabRotation.value = withSpring(45, SPRING_CONFIG);
      menuOpacity.value = withTiming(1, TIMING_CONFIG);
      backdropOpacity.value = withTiming(0.4, TIMING_CONFIG);

      const radius = 80;

      const angle1 = (0 * Math.PI) / 180; // 0 degrees (right-top)
      const angle2 = (30 * Math.PI) / 180; // 30 degrees (right)
      const angle3 = (60 * Math.PI) / 180; // 60 degrees (right-bottom)
      const angle4 = (90 * Math.PI) / 180; // -90 degrees (right-bottom)

      // Language button
      button1Position.value = withSpring(
        {
          x: expandDirection * radius * Math.cos(angle1),
          y: -radius * Math.sin(angle1),
        },
        SPRING_CONFIG
      );
      button1Scale.value = withDelay(50, withSpring(1, SPRING_CONFIG));

      // Theme button
      button2Position.value = withSpring(
        {
          x: expandDirection * radius * Math.cos(angle2),
          y: -radius * Math.sin(angle2),
        },
        SPRING_CONFIG
      );
      button2Scale.value = withDelay(100, withSpring(1, SPRING_CONFIG));

      // Help button - ALWAYS visible
      button3Position.value = withSpring(
        {
          x: expandDirection * radius * Math.cos(angle3),
          y: -radius * Math.sin(angle3),
        },
        SPRING_CONFIG
      );
      button3Scale.value = withDelay(150, withSpring(1, SPRING_CONFIG));

      // Sparkles/Subscription button (only for FREE users)
      if (isFreeUser) {
        button4Position.value = withSpring(
          {
            x: expandDirection * radius * Math.cos(angle4),
            y: -radius * Math.sin(angle4),
          },
          SPRING_CONFIG
        );
        button4Scale.value = withDelay(200, withSpring(1, SPRING_CONFIG));
      }
    } else {
      fabRotation.value = withSpring(0, SPRING_CONFIG);
      menuOpacity.value = withTiming(0, { duration: 200 });
      backdropOpacity.value = withTiming(0, { duration: 200 });

      button1Scale.value = withTiming(0, { duration: 150 });
      button2Scale.value = withTiming(0, { duration: 150 });
      button3Scale.value = withTiming(0, { duration: 150 });
      button4Scale.value = withTiming(0, { duration: 150 });

      button1Position.value = withDelay(
        100,
        withSpring({ x: 0, y: 0 }, SPRING_CONFIG)
      );
      button2Position.value = withDelay(
        100,
        withSpring({ x: 0, y: 0 }, SPRING_CONFIG)
      );
      button3Position.value = withDelay(
        100,
        withSpring({ x: 0, y: 0 }, SPRING_CONFIG)
      );
      button4Position.value = withDelay(
        100,
        withSpring({ x: 0, y: 0 }, SPRING_CONFIG)
      );
    }
  }, [
    isExpanded,
    isRTL,
    isFreeUser,
    fabRotation,
    fabScale,
    menuOpacity,
    backdropOpacity,
    button1Position,
    button2Position,
    button3Position,
    button4Position,
    button1Scale,
    button2Scale,
    button3Scale,
    button4Scale,
  ]);

  const handleLanguageToggle = useCallback(async () => {
    const newLanguage = language === "he" ? "en" : "he";
    try {
      await changeLanguage(newLanguage);
      onLanguageChange?.(newLanguage);
      handleToggleMenu();
      ToastService.success(
        t.languageChanged,
        `${t.switchedTo} ${newLanguage === "he" ? t.hebrew : t.english}`
      );
    } catch (error) {
      console.error("Error changing language:", error);
      ToastService.error(t.error, t.failedToChangeLanguage);
    }
  }, [language, changeLanguage, handleToggleMenu, onLanguageChange, t]);

  const handleThemeToggle = useCallback(() => {
    try {
      toggleTheme();
      onThemeChange?.(!isDark);
      handleToggleMenu();

      pulseScale.value = withSequence(
        withTiming(1.1, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );

      ToastService.success(
        t.themeChanged,
        !isDark ? t.switchedToDark : t.switchedToLight
      );
    } catch (error) {
      console.error("Error toggling theme:", error);
      ToastService.error(t.error, t.failedToChangeTheme);
    }
  }, [toggleTheme, handleToggleMenu, onThemeChange, isDark, pulseScale, t]);

  const handleHelpPress = useCallback(() => {
    setShowHelp(true);
    handleToggleMenu();
  }, [handleToggleMenu]);

  const handleSubscriptionComparisonPress = useCallback(() => {
    setShowSubscriptionComparison(true);
    handleToggleMenu();
  }, [handleToggleMenu]);

  const handleCloseHelp = useCallback(() => {
    setShowHelp(false);
  }, []);

  // Animated styles
  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabScale.value * pulseScale.value },
      { rotate: `${fabRotation.value}deg` },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const menuContainerStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
  }));

  const button1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: button1Position.value.x },
      { translateY: button1Position.value.y },
      { scale: button1Scale.value },
    ],
  }));

  const button2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: button2Position.value.x },
      { translateY: button2Position.value.y },
      { scale: button2Scale.value },
    ],
  }));

  const button3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: button3Position.value.x },
      { translateY: button3Position.value.y },
      { scale: button3Scale.value },
    ],
  }));

  const button4Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: button4Position.value.x },
      { translateY: button4Position.value.y },
      { scale: button4Scale.value },
    ],
  }));

  const toolbarPosition = useMemo(
    () => ({
      bottom: insets.bottom + 100,
      [isRTL ? "left" : "right"]: 24,
    }),
    [insets.bottom, isRTL]
  );

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <Animated.View
          style={[styles.backdrop, backdropStyle]}
          pointerEvents="auto"
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={handleToggleMenu}
          />
        </Animated.View>
      )}

      {/* Main Container */}
      <View style={[styles.container, toolbarPosition]}>
        {/* Menu Items */}
        <Animated.View style={[styles.menuContainer, menuContainerStyle]}>
          {/* Language Button */}
          <Animated.View style={[styles.menuButton, button1Style]}>
            <TouchableOpacity
              style={styles.buttonTouchable}
              onPress={handleLanguageToggle}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isDark ? ["#6366F1", "#4F46E5"] : ["#818CF8", "#6366F1"]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Globe size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.buttonLabel}>
                  {language === "he" ? "EN" : "עב"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Theme Button */}
          <Animated.View style={[styles.menuButton, button2Style]}>
            <TouchableOpacity
              style={styles.buttonTouchable}
              onPress={handleThemeToggle}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isDark ? ["#F59E0B", "#D97706"] : ["#1E293B", "#0F172A"]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isDark ? (
                  <Sun size={18} color="#FFFFFF" strokeWidth={2} />
                ) : (
                  <Moon size={18} color="#FFFFFF" strokeWidth={2} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Help Button */}
          <Animated.View style={[styles.menuButton, button3Style]}>
            <TouchableOpacity
              style={styles.buttonTouchable}
              onPress={handleHelpPress}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isDark ? ["#14B8A6", "#0D9488"] : ["#2DD4BF", "#14B8A6"]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <HelpCircle size={18} color="#FFFFFF" strokeWidth={2} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Premium/Subscription Button - ONLY for FREE users */}
          {isFreeUser && (
            <Animated.View style={[styles.menuButton, button4Style]}>
              <TouchableOpacity
                style={styles.buttonTouchable}
                onPress={handleSubscriptionComparisonPress}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#F472B6", "#EC4899", "#DB2777"]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Sparkles size={18} color="#FFFFFF" strokeWidth={2} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* Main FAB */}
        <Animated.View style={fabStyle}>
          <TouchableOpacity
            style={styles.fab}
            onPress={handleToggleMenu}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={
                isExpanded
                  ? ["#EF4444", "#DC2626"]
                  : isDark
                  ? ["#10B981", "#059669"]
                  : ["#10B981", "#047857"]
              }
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isExpanded ? (
                <X size={22} color="#FFFFFF" strokeWidth={2} />
              ) : (
                <Settings size={22} color="#FFFFFF" strokeWidth={2} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Help Modal */}
      <Modal
        visible={showHelp}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelp(false)}
        statusBarTranslucent={true}
        presentationStyle="overFullScreen"
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.shadow + "80" },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowHelp(false)}
          />

          <View style={styles.modalContainer}>
            <BlurView
              intensity={Platform.OS === "ios" ? 100 : 50}
              tint={isDark ? "dark" : "light"}
              style={[
                styles.modalContent,
                {
                  backgroundColor:
                    Platform.OS === "ios"
                      ? colors.surface + "00"
                      : colors.surface + "F0",
                  shadowColor: colors.shadow,
                  borderColor: colors.outline + "20",
                },
              ]}
            >
              {/* Header */}
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.outline + "30" },
                ]}
              >
                <View style={styles.modalTitleContainer}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: colors.primaryContainer },
                    ]}
                  >
                    <HelpCircle size={20} color={colors.primary} />
                  </View>
                  <Text
                    style={[styles.modalTitle, { color: colors.onSurface }]}
                  >
                    {helpContent?.title || t.help}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowHelp(false)}
                  style={[
                    styles.closeButton,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                  activeOpacity={0.7}
                >
                  <X size={20} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <View style={styles.modalBodyContent}>
                  {helpContent ? (
                    <View>
                      <Text
                        style={[styles.modalText, { color: colors.onSurface }]}
                      >
                        {helpContent.description}
                      </Text>

                      {helpContent.quickTips && (
                        <View
                          style={[
                            styles.helpSection,
                            { borderTopColor: colors.outline + "30" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.helpSectionTitle,
                              { color: colors.onSurface },
                            ]}
                          >
                            {t.quickTips}
                          </Text>
                          <View style={styles.tipsContainer}>
                            {helpContent.quickTips.map((tip, index) => (
                              <View key={index} style={styles.tipItem}>
                                <View
                                  style={[
                                    styles.tipBullet,
                                    { backgroundColor: colors.primary },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.tipText,
                                    { color: colors.onSurfaceVariant },
                                  ]}
                                >
                                  {tip}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {helpContent.additionalSupport && (
                        <View
                          style={[
                            styles.helpSection,
                            { borderTopColor: colors.outline + "30" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.helpSectionTitle,
                              { color: colors.onSurface },
                            ]}
                          >
                            {t.additionalSupport}
                          </Text>
                          <Text
                            style={[
                              styles.helpSectionText,
                              { color: colors.onSurfaceVariant },
                            ]}
                          >
                            {helpContent.additionalSupport}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.noHelpContent}>
                      <HelpCircle size={48} color={colors.outline} />
                      <Text
                        style={[
                          styles.modalText,
                          { color: colors.onSurface, textAlign: "center" },
                        ]}
                      >
                        {t.howCanWeHelp}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </BlurView>
          </View>
        </View>
      </Modal>

      {/* Subscription Comparison Modal */}
      <SubscriptionComparison
        visible={showSubscriptionComparison}
        onClose={() => setShowSubscriptionComparison(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    zIndex: 998,
  },
  container: {
    position: "absolute",
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  menuContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  buttonTouchable: {
    width: 46,
    height: 46,
    borderRadius: 23,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    overflow: "hidden",
  },
  buttonGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
  },
  buttonContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  buttonLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
    marginTop: 1,
    color: "#FFFFFF",
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    overflow: "hidden",
  },
  fabGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  modalContent: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    maxHeight: "100%",
    minHeight: 280,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    minHeight: 72,
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    maxHeight: 420,
    minHeight: 180,
  },
  scrollContent: {
    flexGrow: 1,
  },
  modalBodyContent: {
    padding: 24,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 20,
  },
  helpSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  helpSectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  helpSectionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  tipsContainer: {
    gap: 14,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  tipBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    flexShrink: 0,
  },
  tipText: {
    fontSize: 15,
    lineHeight: 24,
    flex: 1,
  },
  noHelpContent: {
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
});

export default ToolBar;
