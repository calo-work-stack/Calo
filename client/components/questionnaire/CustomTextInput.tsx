import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { AlertCircle } from "lucide-react-native";

interface CustomTextInputProps extends TextInputProps {
  label: string;
  required?: boolean;
  suffix?: string;
  prefix?: string;
  error?: string;
}

const CustomTextInput: React.FC<CustomTextInputProps> = ({
  label,
  required = false,
  suffix,
  prefix,
  error,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const { colors, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === "he";
  const [isFocused, setIsFocused] = useState(false);

  const focusProgress = useSharedValue(0);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    focusProgress.value = withSpring(1, { damping: 15 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusProgress.value = withSpring(0, { damping: 15 });
    onBlur?.(e);
  };

  const animatedBorderStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(
        focusProgress.value,
        [0, 1],
        [error ? "#EF4444" : (isDark ? "#374151" : "#E5E7EB"), colors.primary]
      ),
      borderWidth: withSpring(isFocused ? 2 : 1.5),
    };
  });

  return (
    <View style={styles.container}>
      <View style={[styles.labelRow, isRTL && styles.labelRowRTL]}>
        <Text
          style={[
            styles.label,
            { color: isFocused ? colors.primary : colors.text },
            isRTL && styles.labelRTL,
          ]}
        >
          {label}
        </Text>
        {required && (
          <View style={[styles.requiredDot, { backgroundColor: colors.error }]} />
        )}
      </View>

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isDark ? "#1F2937" : "#FAFAFA",
          },
          animatedBorderStyle,
          isRTL && styles.inputWrapperRTL,
        ]}
      >
        {prefix && (
          <View style={[styles.affixContainer, { backgroundColor: isDark ? "#374151" : "#F3F4F6" }]}>
            <Text
              style={[
                styles.prefix,
                { color: colors.primary },
              ]}
            >
              {prefix}
            </Text>
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            isRTL && styles.inputRTL,
            prefix && styles.inputWithPrefix,
            suffix && styles.inputWithSuffix,
            style,
          ]}
          placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {suffix && (
          <Text
            style={[
              styles.suffix,
              { color: colors.textSecondary },
              isRTL && styles.suffixRTL,
            ]}
          >
            {suffix}
          </Text>
        )}
      </Animated.View>

      {error && (
        <Animated.View style={[styles.errorContainer, isRTL && styles.errorContainerRTL]}>
          <AlertCircle size={14} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  labelRowRTL: {
    flexDirection: "row-reverse",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  labelRTL: {
    textAlign: "right",
  },
  requiredDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    overflow: "hidden",
  },
  inputWrapperRTL: {
    flexDirection: "row-reverse",
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontWeight: "500",
  },
  inputRTL: {
    textAlign: "right",
  },
  inputWithPrefix: {
    paddingLeft: 12,
  },
  inputWithSuffix: {
    paddingRight: 12,
  },
  affixContainer: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginRight: -1,
  },
  prefix: {
    fontSize: 18,
    fontWeight: "700",
  },
  suffix: {
    fontSize: 15,
    fontWeight: "600",
    paddingRight: 16,
  },
  suffixRTL: {
    paddingRight: 0,
    paddingLeft: 16,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorContainerRTL: {
    flexDirection: "row-reverse",
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
  },
});

export default CustomTextInput;
