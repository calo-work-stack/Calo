import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";

interface TimelineLineProps {
  status: "completed" | "current" | "upcoming";
  isLast?: boolean;
  height?: number;
}

export const TimelineLine = React.memo(
  ({ status, isLast = false, height = 60 }: TimelineLineProps) => {
    const { colors } = useTheme();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (status === "current") {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.4,
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
        );
        pulse.start();
        return () => pulse.stop();
      }
    }, [status, pulseAnim]);

    const dotColor =
      status === "completed"
        ? colors.success
        : status === "current"
          ? colors.warmOrange
          : colors.border;

    const lineColor =
      status === "completed" ? colors.success + "40" : colors.border + "40";

    return (
      <View style={[styles.container, { height: height + 16 }]}>
        {/* Dot */}
        <View style={styles.dotContainer}>
          {status === "current" && (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  backgroundColor: colors.warmOrange + "30",
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
          )}
          <View
            style={[
              styles.dot,
              {
                backgroundColor: dotColor,
                width: status === "current" ? 14 : 10,
                height: status === "current" ? 14 : 10,
                borderRadius: status === "current" ? 7 : 5,
              },
            ]}
          />
        </View>

        {/* Line */}
        {!isLast && (
          <View
            style={[
              styles.line,
              {
                backgroundColor: lineColor,
                height: height,
              },
            ]}
          />
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: 24,
  },
  dotContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 24,
    height: 24,
  },
  pulseRing: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  dot: {
    zIndex: 1,
  },
  line: {
    width: 2,
    borderRadius: 1,
  },
});
