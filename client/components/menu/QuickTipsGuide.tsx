import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import {
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  Hand,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  Lightbulb,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TIPS_DISMISSED_KEY = "@menu_quick_tips_dismissed";

interface TipItem {
  id: string;
  icon: any;
  iconColor: string;
  title: string;
  description: string;
}

interface QuickTipsGuideProps {
  onDismiss?: () => void;
  forceShow?: boolean;
}

export const QuickTipsGuide: React.FC<QuickTipsGuideProps> = ({
  onDismiss,
  forceShow = false,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(!forceShow);
  const [isLoading, setIsLoading] = useState(true);

  const expandAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkDismissedStatus();

    // Pulse animation for help icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const checkDismissedStatus = async () => {
    try {
      if (forceShow) {
        setIsDismissed(false);
        setIsLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
        return;
      }

      const dismissed = await AsyncStorage.getItem(TIPS_DISMISSED_KEY);
      const wasDismissed = dismissed === "true";
      setIsDismissed(wasDismissed);
      setIsLoading(false);

      if (!wasDismissed) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      setIsDismissed(false);
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      try {
        await AsyncStorage.setItem(TIPS_DISMISSED_KEY, "true");
      } catch (error) {
        console.error("Error saving tips dismissed status:", error);
      }
      setIsDismissed(true);
      onDismiss?.();
    });
  };

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(expandAnim, {
      toValue,
      useNativeDriver: false,
      tension: 50,
      friction: 10,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const tips: TipItem[] = [
    {
      id: "tap_meal",
      icon: Hand,
      iconColor: colors.emerald500,
      title: t("active_menu.quick_tips.tap_meal", "Tap any meal to see ingredients"),
      description: t("active_menu.quick_tips.tap_meal", "Tap any meal to see ingredients and instructions"),
    },
    {
      id: "check_ingredients",
      icon: CheckCircle2,
      iconColor: "#10B981",
      title: t("active_menu.quick_tips.check_ingredients", "Check off ingredients"),
      description: t("active_menu.quick_tips.check_ingredients", "Check off ingredients as you prepare them"),
    },
    {
      id: "swap_meal",
      icon: RefreshCw,
      iconColor: "#6366F1",
      title: t("active_menu.quick_tips.swap_meal", "Swap meals"),
      description: t("active_menu.quick_tips.swap_meal", "Tap the swap icon to replace a meal with alternatives"),
    },
    {
      id: "track_progress",
      icon: BarChart3,
      iconColor: "#F59E0B",
      title: t("active_menu.quick_tips.track_progress", "Track your progress"),
      description: t("active_menu.quick_tips.track_progress", "Your progress is saved automatically"),
    },
  ];

  const contentHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tips.length * 56 + 16], // Approximate height per tip + padding
  });

  if (isLoading || isDismissed) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim },
      ]}
    >
      {/* Header */}
      <Pressable onPress={toggleExpanded} style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={[styles.iconContainer, { backgroundColor: colors.emerald500 + "20" }]}>
              <HelpCircle size={18} color={colors.emerald500} />
            </View>
          </Animated.View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("active_menu.quick_tips.title", "Quick Tips")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              {t("menu.how_to_use", "How to use your menu")}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={handleDismiss}
            style={[styles.dismissButton, { backgroundColor: colors.surface }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={colors.icon} />
          </Pressable>
          <View style={[styles.expandButton, { backgroundColor: colors.surface }]}>
            {isExpanded ? (
              <ChevronUp size={18} color={colors.icon} />
            ) : (
              <ChevronDown size={18} color={colors.icon} />
            )}
          </View>
        </View>
      </Pressable>

      {/* Collapsible Content */}
      <Animated.View style={[styles.content, { height: contentHeight, overflow: "hidden" }]}>
        <View style={styles.tipsList}>
          {tips.map((tip, index) => {
            const IconComponent = tip.icon;
            return (
              <View
                key={tip.id}
                style={[
                  styles.tipItem,
                  index < tips.length - 1 && styles.tipItemBorder,
                  index < tips.length - 1 && { borderBottomColor: colors.border },
                ]}
              >
                <View style={[styles.tipIconContainer, { backgroundColor: tip.iconColor + "15" }]}>
                  <IconComponent size={16} color={tip.iconColor} />
                </View>
                <Text style={[styles.tipText, { color: colors.text }]} numberOfLines={2}>
                  {tip.description}
                </Text>
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* Got it button when collapsed */}
      {!isExpanded && (
        <Pressable
          onPress={handleDismiss}
          style={[styles.gotItButton, { backgroundColor: colors.emerald500 + "15" }]}
        >
          <Text style={[styles.gotItText, { color: colors.emerald500 }]}>
            {t("common.got_it", "Got it!")}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  expandButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: 14,
  },
  tipsList: {
    gap: 0,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  tipItemBorder: {
    borderBottomWidth: 1,
  },
  tipIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  gotItButton: {
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  gotItText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default QuickTipsGuide;
