import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
  FadeInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Check } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";

interface CheckboxGroupProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  required?: boolean;
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  options,
  selectedValues,
  onToggle,
  required = false,
}) => {
  const { colors, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === "he";

  const CheckboxItem: React.FC<{
    option: string;
    isSelected: boolean;
    index: number;
  }> = ({
    option,
    isSelected,
    index,
  }) => {
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
      <Animated.View
        entering={FadeInUp.delay(index * 50).duration(300).springify()}
      >
        <AnimatedTouchableOpacity
          style={[animatedStyle]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => onToggle(option)}
          activeOpacity={1}
        >
          <Animated.View
            style={[
              styles.checkboxItem,
              {
                backgroundColor: isSelected
                  ? isDark
                    ? `${colors.primary}15`
                    : `${colors.primary}08`
                  : colors.card,
              },
              animatedBorderStyle,
              isRTL && styles.checkboxItemRTL,
            ]}
          >
            {/* Checkbox indicator */}
            {isSelected ? (
              <LinearGradient
                colors={[colors.primary, colors.emerald600 || colors.primary]}
                style={styles.checkboxSelected}
              >
                <Check size={14} color="white" strokeWidth={3} />
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.checkboxUnselected,
                  {
                    borderColor: isDark ? "#4B5563" : "#D1D5DB",
                    backgroundColor: isDark ? "#1F2937" : "#FAFAFA",
                  },
                ]}
              />
            )}

            {/* Label */}
            <Text
              style={[
                styles.checkboxLabel,
                {
                  color: isSelected ? colors.primary : colors.text,
                },
                isRTL && styles.textRTL,
              ]}
            >
              {option}
            </Text>
          </Animated.View>
        </AnimatedTouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.labelContainer, isRTL && styles.labelContainerRTL]}>
        <Text
          style={[styles.label, { color: colors.text }, isRTL && styles.textRTL]}
        >
          {label}
        </Text>
        {required && (
          <View style={[styles.requiredBadge, { backgroundColor: `${colors.error}15` }]}>
            <Text style={[styles.requiredText, { color: colors.error }]}>Required</Text>
          </View>
        )}
      </View>

      <View style={styles.checkboxGroup}>
        {options.map((option, index) => (
          <CheckboxItem
            key={option}
            option={option}
            isSelected={selectedValues.includes(option)}
            index={index}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },
  labelContainerRTL: {
    flexDirection: "row-reverse",
  },
  label: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  checkboxGroup: {
    gap: 0,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    gap: 14,
  },
  checkboxItemRTL: {
    flexDirection: "row-reverse",
  },
  checkboxSelected: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxUnselected: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderRadius: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    letterSpacing: -0.2,
  },
  textRTL: {
    textAlign: "right",
  },
});

export default CheckboxGroup;
