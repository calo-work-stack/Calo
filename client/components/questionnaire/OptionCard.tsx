import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Check } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";

interface OptionCardProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const OptionCard: React.FC<OptionCardProps> = ({
  label,
  description,
  icon,
  isSelected,
  onPress,
  disabled = false,
}) => {
  const { colors, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === "he";

  const scale = useSharedValue(1);
  const progress = useSharedValue(isSelected ? 1 : 0);

  React.useEffect(() => {
    progress.value = withSpring(isSelected ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedBorderStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        [isDark ? "#374151" : "#E5E7EB", colors.primary]
      ),
      borderWidth: withSpring(isSelected ? 2 : 1.5),
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedTouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      style={[animatedStyle]}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: isSelected
              ? isDark
                ? `${colors.primary}15`
                : `${colors.primary}08`
              : colors.card,
          },
          animatedBorderStyle,
          disabled && styles.disabled,
        ]}
      >
        <View style={[styles.content, isRTL && styles.contentRTL]}>
          {/* Icon */}
          {icon && (
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isSelected
                    ? `${colors.primary}20`
                    : isDark
                    ? "#374151"
                    : "#F3F4F6",
                },
              ]}
            >
              {icon}
            </View>
          )}

          {/* Text */}
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.label,
                {
                  color: isSelected ? colors.primary : colors.text,
                },
                isRTL && styles.textRTL,
              ]}
            >
              {label}
            </Text>
            {description && (
              <Text
                style={[
                  styles.description,
                  {
                    color: isSelected
                      ? `${colors.primary}CC`
                      : colors.textSecondary,
                  },
                  isRTL && styles.textRTL,
                ]}
                numberOfLines={2}
              >
                {description}
              </Text>
            )}
          </View>

          {/* Checkmark */}
          {isSelected && (
            <LinearGradient
              colors={[colors.primary, colors.emerald600 || colors.primary]}
              style={styles.checkmark}
            >
              <Check size={14} color="white" strokeWidth={3} />
            </LinearGradient>
          )}
        </View>
      </Animated.View>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  contentRTL: {
    flexDirection: "row-reverse",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkmark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  textRTL: {
    textAlign: "right",
  },
});

export default OptionCard;
