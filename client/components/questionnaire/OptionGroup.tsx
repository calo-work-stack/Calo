import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import OptionCard from "./OptionCard";

interface OptionGroupProps {
  label: string;
  options: {
    key: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
  }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  required?: boolean;
  multiSelect?: boolean;
  selectedValues?: string[];
}

const OptionGroup: React.FC<OptionGroupProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
  required = false,
  multiSelect = false,
  selectedValues = [],
}) => {
  const { colors, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === "he";

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

      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = multiSelect
            ? selectedValues.includes(option.key)
            : selectedValue === option.key;

          return (
            <Animated.View
              key={option.key}
              entering={FadeInUp.delay(index * 50).duration(300).springify()}
            >
              <OptionCard
                label={option.label}
                description={option.description}
                icon={option.icon}
                isSelected={isSelected}
                onPress={() => onSelect(option.key)}
              />
            </Animated.View>
          );
        })}
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
  optionsContainer: {
    gap: 0,
  },
  textRTL: {
    textAlign: "right",
  },
});

export default OptionGroup;
