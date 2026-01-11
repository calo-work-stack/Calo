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
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

// Wheel menu configuration
const WHEEL_SIZE = 220;
const CENTER_BUTTON_SIZE = 56;
const ICON_RADIUS = 78;
const INNER_RADIUS = 38;
const OUTER_RADIUS = 100;

interface WheelMenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  onPress: () => void;
}

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 180,
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
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
    language: language === "he" ? "שפה" : "Language",
    theme: language === "he" ? "ערכת נושא" : "Theme",
    premium: language === "he" ? "פרימיום" : "Premium",
  };

  // Animation values
  const expandProgress = useSharedValue(0);
  const centerScale = useSharedValue(1);

  const isFreeUser = user?.subscription_type === "FREE";

  const handleToggleMenu = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    setSelectedIndex(null);

    centerScale.value = withSpring(newExpanded ? 0.9 : 1, SPRING_CONFIG);
    expandProgress.value = withSpring(newExpanded ? 1 : 0, {
      ...SPRING_CONFIG,
      damping: 20,
    });
  }, [isExpanded, expandProgress, centerScale]);

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
      ToastService.success(
        t.themeChanged,
        !isDark ? t.switchedToDark : t.switchedToLight
      );
    } catch (error) {
      console.error("Error toggling theme:", error);
      ToastService.error(t.error, t.failedToChangeTheme);
    }
  }, [toggleTheme, handleToggleMenu, onThemeChange, isDark, t]);

  const handleHelpPress = useCallback(() => {
    setShowHelp(true);
    handleToggleMenu();
  }, [handleToggleMenu]);

  const handleSubscriptionComparisonPress = useCallback(() => {
    setShowSubscriptionComparison(true);
    handleToggleMenu();
  }, [handleToggleMenu]);

  // Menu items configuration
  const menuItems: WheelMenuItem[] = useMemo(() => {
    const items: WheelMenuItem[] = [
      {
        id: "language",
        icon: <Globe size={22} color="#FFFFFF" strokeWidth={2} />,
        label: t.language,
        color: "#6366F1",
        onPress: handleLanguageToggle,
      },
      {
        id: "theme",
        icon: isDark ? (
          <Sun size={22} color="#FFFFFF" strokeWidth={2} />
        ) : (
          <Moon size={22} color="#FFFFFF" strokeWidth={2} />
        ),
        label: t.theme,
        color: isDark ? "#F59E0B" : "#1E293B",
        onPress: handleThemeToggle,
      },
      {
        id: "help",
        icon: <HelpCircle size={22} color="#FFFFFF" strokeWidth={2} />,
        label: t.help,
        color: "#14B8A6",
        onPress: handleHelpPress,
      },
    ];

    if (isFreeUser) {
      items.push({
        id: "premium",
        icon: <Sparkles size={22} color="#FFFFFF" strokeWidth={2} />,
        label: t.premium,
        color: "#EC4899",
        onPress: handleSubscriptionComparisonPress,
      });
    }

    return items;
  }, [
    t,
    isDark,
    isFreeUser,
    handleLanguageToggle,
    handleThemeToggle,
    handleHelpPress,
    handleSubscriptionComparisonPress,
  ]);

  const handleItemPress = useCallback((index: number) => {
    setSelectedIndex(index);
    // Small delay before executing action for visual feedback
    setTimeout(() => {
      menuItems[index]?.onPress();
    }, 150);
  }, [menuItems]);

  // Create pie segment path with rounded edges
  const createPieSegment = (
    index: number,
    total: number,
    innerRadius: number,
    outerRadius: number
  ) => {
    const center = WHEEL_SIZE / 2;
    const anglePerSegment = (2 * Math.PI) / total;
    const startAngle = index * anglePerSegment - Math.PI / 2;
    const endAngle = startAngle + anglePerSegment;
    const gap = 0.04; // Gap between segments for visual separation

    const x1 = Math.cos(startAngle + gap) * outerRadius + center;
    const y1 = Math.sin(startAngle + gap) * outerRadius + center;
    const x2 = Math.cos(endAngle - gap) * outerRadius + center;
    const y2 = Math.sin(endAngle - gap) * outerRadius + center;
    const x3 = Math.cos(endAngle - gap) * innerRadius + center;
    const y3 = Math.sin(endAngle - gap) * innerRadius + center;
    const x4 = Math.cos(startAngle + gap) * innerRadius + center;
    const y4 = Math.sin(startAngle + gap) * innerRadius + center;

    const largeArc = anglePerSegment > Math.PI ? 1 : 0;

    return `
      M ${x1} ${y1}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;
  };

  // Get icon position for each segment
  const getIconPosition = (index: number, total: number) => {
    const anglePerSegment = (2 * Math.PI) / total;
    const midAngle = index * anglePerSegment + anglePerSegment / 2 - Math.PI / 2;
    const x = Math.cos(midAngle) * ICON_RADIUS + WHEEL_SIZE / 2;
    const y = Math.sin(midAngle) * ICON_RADIUS + WHEEL_SIZE / 2;
    return { x, y };
  };

  // Animated styles
  const wheelContainerStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      expandProgress.value,
      [0, 1],
      [0.3, 1],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      expandProgress.value,
      [0, 0.5, 1],
      [0, 0.5, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const centerButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: centerScale.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      expandProgress.value,
      [0, 1],
      [0, 0.5],
      Extrapolation.CLAMP
    ),
  }));

  const toolbarPosition = useMemo(
    () => ({
      bottom: insets.bottom + 90,
      [isRTL ? "left" : "right"]: 20,
    }),
    [insets.bottom, isRTL]
  );

  const wheelPosition = useMemo(
    () => ({
      bottom: insets.bottom + 90 - WHEEL_SIZE / 2 + CENTER_BUTTON_SIZE / 2,
      [isRTL ? "left" : "right"]: 20 - WHEEL_SIZE / 2 + CENTER_BUTTON_SIZE / 2,
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

      {/* Wheel Menu */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.wheelContainer,
            wheelPosition,
            wheelContainerStyle,
          ]}
        >
          <View style={styles.wheelWrapper}>
            {/* Outer ring decoration */}
            <View style={[
              styles.outerRing,
              { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]} />

            {/* SVG Pie Segments */}
            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} style={styles.svgContainer}>
              {menuItems.map((item, index) => {
                const isSelected = selectedIndex === index;
                return (
                  <Path
                    key={item.id}
                    d={createPieSegment(index, menuItems.length, 35, 95)}
                    fill={isSelected ? item.color : (isDark ? '#374151' : '#E5E7EB')}
                    opacity={isSelected ? 1 : 0.9}
                  />
                );
              })}
              {/* Center circle background */}
              <SvgCircle
                cx={WHEEL_SIZE / 2}
                cy={WHEEL_SIZE / 2}
                r={32}
                fill={isDark ? '#1F2937' : '#FFFFFF'}
              />
            </Svg>

            {/* Icon buttons overlay */}
            {menuItems.map((item, index) => {
              const pos = getIconPosition(index, menuItems.length);
              const isSelected = selectedIndex === index;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.iconButton,
                    {
                      left: pos.x - 22,
                      top: pos.y - 22,
                      backgroundColor: isSelected ? item.color : 'transparent',
                    },
                  ]}
                  onPress={() => handleItemPress(index)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.iconWrapper,
                    { backgroundColor: isSelected ? 'transparent' : item.color }
                  ]}>
                    {item.icon}
                  </View>
                  {isSelected && (
                    <Text style={styles.selectedLabel}>{item.label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* Center FAB Button */}
      <View style={[styles.fabContainer, toolbarPosition]}>
        <Animated.View style={centerButtonStyle}>
          <TouchableOpacity
            style={[
              styles.fab,
              {
                backgroundColor: isExpanded
                  ? (isDark ? '#374151' : '#E5E7EB')
                  : '#10B981',
              },
            ]}
            onPress={handleToggleMenu}
            activeOpacity={0.9}
          >
            {isExpanded ? (
              <X size={24} color={isDark ? '#FFFFFF' : '#374151'} strokeWidth={2.5} />
            ) : (
              <Settings size={24} color="#FFFFFF" strokeWidth={2} />
            )}
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 998,
  },
  fabContainer: {
    position: "absolute",
    zIndex: 1001,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  wheelContainer: {
    position: "absolute",
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    zIndex: 1000,
  },
  wheelWrapper: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  outerRing: {
    position: "absolute",
    width: WHEEL_SIZE - 4,
    height: WHEEL_SIZE - 4,
    borderRadius: WHEEL_SIZE / 2,
    borderWidth: 2,
  },
  svgContainer: {
    position: "absolute",
  },
  iconButton: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedLabel: {
    position: "absolute",
    top: -20,
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
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
