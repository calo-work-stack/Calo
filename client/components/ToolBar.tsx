import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Settings,
  Globe,
  Sun,
  Moon,
  CircleHelp as HelpCircle,
  X,
  Star,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get("window");
const FAB_SIZE = 44;
const MENU_BTN_SIZE = 42;
const EDGE_MARGIN = 12;
const MENU_RADIUS = 68;
const SPREAD_ANGLE = (30 * Math.PI) / 180;

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 250,
  mass: 0.7,
};

const SNAP_SPRING = {
  damping: 22,
  stiffness: 300,
  mass: 0.8,
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

  const isFreeUser = user?.subscription_type === "FREE";

  const initX = isRTL ? EDGE_MARGIN : SCREEN_WIDTH - EDGE_MARGIN - FAB_SIZE;
  const initY = SCREEN_HEIGHT - (insets.bottom || 34) - 140;

  // Position shared values
  const translateX = useSharedValue(initX);
  const translateY = useSharedValue(initY);
  const dragStartX = useSharedValue(initX);
  const dragStartY = useSharedValue(initY);

  // FAB animation values
  const fabScale = useSharedValue(1);
  const fabRotation = useSharedValue(0);
  const fabOpacity = useSharedValue(0.72);
  const menuOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const isMenuOpen = useSharedValue(false);

  // Menu button shared values
  const btn1Scale = useSharedValue(0);
  const btn2Scale = useSharedValue(0);
  const btn3Scale = useSharedValue(0);
  const btn4Scale = useSharedValue(0);
  const btn1Pos = useSharedValue({ x: 0, y: 0 });
  const btn2Pos = useSharedValue({ x: 0, y: 0 });
  const btn3Pos = useSharedValue({ x: 0, y: 0 });
  const btn4Pos = useSharedValue({ x: 0, y: 0 });

  const expandMenuButtons = useCallback(
    (buttonCount: number) => {
      const scales = [btn1Scale, btn2Scale, btn3Scale, btn4Scale];
      const positions = [btn1Pos, btn2Pos, btn3Pos, btn4Pos];

      const fabCenterX = translateX.value + FAB_SIZE / 2;
      const fabCenterY = translateY.value + FAB_SIZE / 2;
      const dirX = SCREEN_WIDTH / 2 - fabCenterX;
      const dirY = SCREEN_HEIGHT / 2 - fabCenterY;

      const baseAngle = Math.atan2(-dirY, dirX);

      for (let i = 0; i < buttonCount; i++) {
        const angleOffset = (i - (buttonCount - 1) / 2) * SPREAD_ANGLE;
        const angle = baseAngle + angleOffset;
        positions[i].value = withSpring(
          {
            x: MENU_RADIUS * Math.cos(angle),
            y: -MENU_RADIUS * Math.sin(angle),
          },
          SPRING_CONFIG
        );
        scales[i].value = withDelay(i * 40, withSpring(1, SPRING_CONFIG));
      }
    },
    [
      translateX,
      translateY,
      btn1Pos,
      btn2Pos,
      btn3Pos,
      btn4Pos,
      btn1Scale,
      btn2Scale,
      btn3Scale,
      btn4Scale,
    ]
  );

  const collapseMenuButtons = useCallback(() => {
    const scales = [btn1Scale, btn2Scale, btn3Scale, btn4Scale];
    const positions = [btn1Pos, btn2Pos, btn3Pos, btn4Pos];

    for (let i = 0; i < 4; i++) {
      scales[i].value = withTiming(0, { duration: 120 });
      positions[i].value = withDelay(
        80,
        withSpring({ x: 0, y: 0 }, SPRING_CONFIG)
      );
    }
  }, [
    btn1Scale,
    btn2Scale,
    btn3Scale,
    btn4Scale,
    btn1Pos,
    btn2Pos,
    btn3Pos,
    btn4Pos,
  ]);

  const handleToggleMenu = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    isMenuOpen.value = newExpanded;

    fabScale.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withSpring(1, SPRING_CONFIG)
    );

    if (newExpanded) {
      fabRotation.value = withSpring(135, SPRING_CONFIG);
      menuOpacity.value = withTiming(1, { duration: 250 });
      backdropOpacity.value = withTiming(0.3, { duration: 250 });
      fabOpacity.value = withTiming(1, { duration: 150 });

      const buttonCount = isFreeUser ? 4 : 3;
      expandMenuButtons(buttonCount);
    } else {
      fabRotation.value = withSpring(0, SPRING_CONFIG);
      menuOpacity.value = withTiming(0, { duration: 180 });
      backdropOpacity.value = withTiming(0, { duration: 180 });
      fabOpacity.value = withTiming(0.72, { duration: 400 });

      collapseMenuButtons();
    }
  }, [
    isExpanded,
    isFreeUser,
    isMenuOpen,
    fabScale,
    fabRotation,
    menuOpacity,
    backdropOpacity,
    fabOpacity,
    expandMenuButtons,
    collapseMenuButtons,
  ]);

  const closeMenu = useCallback(() => {
    if (!isExpanded) return;
    setIsExpanded(false);
    isMenuOpen.value = false;

    fabRotation.value = withSpring(0, SPRING_CONFIG);
    menuOpacity.value = withTiming(0, { duration: 180 });
    backdropOpacity.value = withTiming(0, { duration: 180 });
    fabOpacity.value = withTiming(0.72, { duration: 400 });
    fabScale.value = withSpring(1, SPRING_CONFIG);

    collapseMenuButtons();
  }, [
    isExpanded,
    isMenuOpen,
    fabRotation,
    menuOpacity,
    backdropOpacity,
    fabOpacity,
    fabScale,
    collapseMenuButtons,
  ]);

  const handleLanguageToggle = useCallback(async () => {
    const newLanguage = language === "he" ? "en" : "he";
    try {
      await changeLanguage(newLanguage);
      onLanguageChange?.(newLanguage);
      closeMenu();
      ToastService.success(
        "Language Changed",
        `Switched to ${newLanguage === "he" ? "Hebrew" : "English"}`
      );
    } catch (error) {
      console.error("Error changing language:", error);
      ToastService.error("Error", "Failed to change language");
    }
  }, [language, changeLanguage, closeMenu, onLanguageChange]);

  const handleThemeToggle = useCallback(() => {
    try {
      toggleTheme();
      onThemeChange?.(!isDark);
      closeMenu();
      ToastService.success(
        "Theme Changed",
        `Switched to ${!isDark ? "dark" : "light"} theme`
      );
    } catch (error) {
      console.error("Error toggling theme:", error);
      ToastService.error("Error", "Failed to change theme");
    }
  }, [toggleTheme, closeMenu, onThemeChange, isDark]);

  const handleHelpPress = useCallback(() => {
    setShowHelp(true);
    closeMenu();
  }, [closeMenu]);

  const handleSubscriptionComparisonPress = useCallback(() => {
    setShowSubscriptionComparison(true);
    closeMenu();
  }, [closeMenu]);

  // --- Gestures ---

  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .activeOffsetY([-8, 8])
    .onStart(() => {
      "worklet";
      if (isMenuOpen.value) return;
      dragStartX.value = translateX.value;
      dragStartY.value = translateY.value;
      fabScale.value = withSpring(1.12, SPRING_CONFIG);
      fabOpacity.value = withTiming(1, { duration: 100 });
    })
    .onUpdate((event) => {
      "worklet";
      if (isMenuOpen.value) return;
      translateX.value = dragStartX.value + event.translationX;
      translateY.value = dragStartY.value + event.translationY;
    })
    .onEnd(() => {
      "worklet";
      if (isMenuOpen.value) return;

      const snapLeft = translateX.value + FAB_SIZE / 2 < SCREEN_WIDTH / 2;
      const snapX = snapLeft
        ? EDGE_MARGIN
        : SCREEN_WIDTH - EDGE_MARGIN - FAB_SIZE;

      const minY = insets.top + 50;
      const maxY = SCREEN_HEIGHT - (insets.bottom || 34) - FAB_SIZE - 80;
      const snapY = Math.max(minY, Math.min(maxY, translateY.value));

      translateX.value = withSpring(snapX, SNAP_SPRING);
      translateY.value = withSpring(snapY, SNAP_SPRING);
      fabScale.value = withSpring(1, SPRING_CONFIG);
      fabOpacity.value = withTiming(0.72, { duration: 400 });
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    "worklet";
    runOnJS(handleToggleMenu)();
  });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  // --- Animated Styles ---

  const fabContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  // Menu overlay: positioned at FAB center, large enough for all buttons
  const menuOverlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value + FAB_SIZE / 2 - MENU_RADIUS - MENU_BTN_SIZE },
      { translateY: translateY.value + FAB_SIZE / 2 - MENU_RADIUS - MENU_BTN_SIZE },
    ],
    opacity: menuOpacity.value,
  }));

  const fabButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabScale.value },
      { rotate: `${fabRotation.value}deg` },
    ],
    opacity: fabOpacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const btn1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: btn1Pos.value.x },
      { translateY: btn1Pos.value.y },
      { scale: btn1Scale.value },
    ],
  }));

  const btn2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: btn2Pos.value.x },
      { translateY: btn2Pos.value.y },
      { scale: btn2Scale.value },
    ],
  }));

  const btn3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: btn3Pos.value.x },
      { translateY: btn3Pos.value.y },
      { scale: btn3Scale.value },
    ],
  }));

  const btn4Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: btn4Pos.value.x },
      { translateY: btn4Pos.value.y },
      { scale: btn4Scale.value },
    ],
  }));

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
            onPress={closeMenu}
          />
        </Animated.View>
      )}

      {/* Menu Overlay - separate full-size container so buttons can receive touches */}
      {isExpanded && (
        <Animated.View
          style={[styles.menuOverlay, menuOverlayStyle]}
          pointerEvents="box-none"
        >
          {/* Menu buttons centered at MENU_RADIUS + MENU_BTN_SIZE offset */}
          <View style={styles.menuCenter} pointerEvents="box-none">
            {/* Language Button */}
            <Animated.View style={[styles.menuBtnWrapper, btn1Style]}>
              <TouchableOpacity
                style={[
                  styles.menuBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.shadow,
                  },
                ]}
                onPress={handleLanguageToggle}
                activeOpacity={0.8}
              >
                <Globe size={17} color={colors.onPrimary} strokeWidth={2.5} />
                <Text
                  style={[styles.menuBtnLabel, { color: colors.onPrimary }]}
                >
                  {language === "he" ? "EN" : "עב"}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Theme Button */}
            <Animated.View style={[styles.menuBtnWrapper, btn2Style]}>
              <TouchableOpacity
                style={[
                  styles.menuBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.shadow,
                  },
                ]}
                onPress={handleThemeToggle}
                activeOpacity={0.8}
              >
                {isDark ? (
                  <Sun size={17} color={colors.onPrimary} strokeWidth={2.5} />
                ) : (
                  <Moon size={17} color={colors.onPrimary} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Help Button */}
            <Animated.View style={[styles.menuBtnWrapper, btn3Style]}>
              <TouchableOpacity
                style={[
                  styles.menuBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.shadow,
                  },
                ]}
                onPress={handleHelpPress}
                activeOpacity={0.8}
              >
                <HelpCircle
                  size={17}
                  color={colors.onPrimary}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Subscription Button (FREE users only) */}
            {isFreeUser && (
              <Animated.View style={[styles.menuBtnWrapper, btn4Style]}>
                <TouchableOpacity
                  style={[
                    styles.menuBtn,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.shadow,
                    },
                  ]}
                  onPress={handleSubscriptionComparisonPress}
                  activeOpacity={0.8}
                >
                  <Star size={17} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      )}

      {/* FAB Container - small, just for the button + gesture */}
      <Animated.View style={[styles.fabContainer, fabContainerStyle]}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={fabButtonStyle}>
            <View
              style={[
                styles.fab,
                {
                  shadowColor: colors.shadow,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              <LinearGradient
                colors={
                  isDark
                    ? [colors.primary, `${colors.primary}CC`]
                    : [colors.primary, `${colors.primary}EE`]
                }
                style={styles.fabGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isExpanded ? (
                  <X size={18} color={colors.onPrimary} strokeWidth={2.5} />
                ) : (
                  <Settings
                    size={18}
                    color={colors.onPrimary}
                    strokeWidth={2.5}
                  />
                )}
              </LinearGradient>
            </View>
          </Animated.View>
        </GestureDetector>
      </Animated.View>

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
                    {helpContent?.title ||
                      (language === "he" ? "עזרה" : "Help")}
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
                        style={[
                          styles.modalText,
                          { color: colors.onSurface },
                        ]}
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
                            {language === "he"
                              ? "טיפים מהירים:"
                              : "Quick Tips:"}
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
                            {language === "he"
                              ? "תמיכה נוספת:"
                              : "Additional Support:"}
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
                        {language === "he"
                          ? "איך אפשר לעזור לך?"
                          : "How can we help you?"}
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

const MENU_OVERLAY_SIZE = (MENU_RADIUS + MENU_BTN_SIZE) * 2;

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
  menuOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    width: MENU_OVERLAY_SIZE,
    height: MENU_OVERLAY_SIZE,
    zIndex: 1000,
  },
  menuCenter: {
    position: "absolute",
    left: MENU_RADIUS + MENU_BTN_SIZE,
    top: MENU_RADIUS + MENU_BTN_SIZE,
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  menuBtnWrapper: {
    position: "absolute",
  },
  menuBtn: {
    width: MENU_BTN_SIZE,
    height: MENU_BTN_SIZE,
    borderRadius: MENU_BTN_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  menuBtnLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
    marginTop: 1,
  },
  fabContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
  },
  fabGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: FAB_SIZE / 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  modalContent: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    maxHeight: "100%",
    minHeight: 300,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    maxHeight: 450,
    minHeight: 200,
  },
  scrollContent: {
    flexGrow: 1,
  },
  modalBodyContent: {
    padding: 24,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  helpSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  helpSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  helpSectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  tipsContainer: {
    gap: 12,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  tipText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  noHelpContent: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
});

export default ToolBar;
