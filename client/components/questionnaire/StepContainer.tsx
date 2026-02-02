import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import Animated, { FadeInUp } from "react-native-reanimated";

interface StepContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const StepContainer: React.FC<StepContainerProps> = ({
  title,
  description,
  children,
}) => {
  const { colors, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === "he";

  return (
    <Animated.View
      entering={FadeInUp.duration(400).springify()}
      style={styles.container}
    >
      {/* Subtitle only - title is now in ProgressIndicator */}
      <View style={styles.header}>
        <Text
          style={[
            styles.description,
            { color: colors.textSecondary },
            isRTL && styles.textRTL,
          ]}
        >
          {description}
        </Text>
      </View>
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 8,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.85,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    gap: 20,
  },
  textRTL: {
    textAlign: "right",
  },
});

export default StepContainer;
