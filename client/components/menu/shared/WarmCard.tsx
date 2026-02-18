import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/context/ThemeContext";

interface WarmCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradient?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
  elevated?: boolean;
}

export const WarmCard = React.memo(
  ({
    children,
    style,
    gradient = false,
    gradientColors,
    elevated = true,
  }: WarmCardProps) => {
    const { colors, isDark } = useTheme();

    const defaultGradient: readonly [string, string] = isDark
      ? [colors.warmSurface, colors.card]
      : [colors.warmCream, "#FFFFFF"];

    if (gradient) {
      return (
        <LinearGradient
          colors={gradientColors || defaultGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.card,
            elevated && styles.elevated,
            {
              borderColor: colors.warmBorder,
            },
            style,
          ]}
        >
          {children}
        </LinearGradient>
      );
    }

    return (
      <View
        style={[
          styles.card,
          elevated && styles.elevated,
          {
            backgroundColor: isDark ? colors.card : "#FFFFFF",
            borderColor: colors.warmBorder,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  elevated: {
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
});
