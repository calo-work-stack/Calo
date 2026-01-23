import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";

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
  ...props
}) => {
  const { colors } = useTheme();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === "he";

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.label,
          { color: colors.text },
          isRTL && styles.labelRTL,
        ]}
      >
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.card,
            borderColor: error ? "#EF4444" : colors.border,
          },
          isRTL && styles.inputWrapperRTL,
        ]}
      >
        {prefix && (
          <Text
            style={[
              styles.prefix,
              { color: colors.text },
              isRTL && styles.prefixRTL,
            ]}
          >
            {prefix}
          </Text>
        )}
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            isRTL && styles.inputRTL,
            (suffix || prefix) && styles.inputWithSuffix,
            style,
          ]}
          placeholderTextColor={colors.textSecondary || colors.border}
          {...props}
        />
        {suffix && (
          <Text
            style={[
              styles.suffix,
              { color: colors.textSecondary || colors.border },
              isRTL && styles.suffixRTL,
            ]}
          >
            {suffix}
          </Text>
        )}
      </View>

      {error && (
        <Text style={[styles.errorText, isRTL && styles.errorTextRTL]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  labelRTL: {
    textAlign: "right",
  },
  required: {
    color: "#EF4444",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  inputWrapperRTL: {
    flexDirection: "row-reverse",
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  inputRTL: {
    textAlign: "right",
  },
  inputWithSuffix: {
    paddingRight: 8,
  },
  suffix: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  suffixRTL: {
    marginLeft: 0,
    marginRight: 8,
  },
  prefix: {
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
  prefixRTL: {
    marginRight: 0,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    marginTop: 6,
    fontWeight: "500",
  },
  errorTextRTL: {
    textAlign: "right",
  },
});

export default CustomTextInput;