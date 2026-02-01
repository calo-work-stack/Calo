import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import Svg, { Circle } from "react-native-svg";

interface GoalProgressRingProps {
  actual: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  showVariance?: boolean;
  label?: string;
  unit?: string;
}

type GoalStatus = "met" | "over" | "under";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function getGoalStatus(actual: number, target: number): GoalStatus {
  const variance = actual - target;
  const tolerance = target * 0.1; // 10% tolerance

  if (Math.abs(variance) <= tolerance) return "met";
  if (variance > 0) return "over";
  return "under";
}

export function getStatusColor(status: GoalStatus, colors: any): string {
  switch (status) {
    case "met":
      return colors.emerald500 || "#10b981";
    case "over":
      return colors.error || "#ef4444";
    case "under":
      return colors.warning || "#f59e0b";
  }
}

export const GoalProgressRing: React.FC<GoalProgressRingProps> = ({
  actual,
  target,
  size = 100,
  strokeWidth = 8,
  showVariance = true,
  label,
  unit = "kcal",
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const status = getGoalStatus(actual, target);
  const statusColor = getStatusColor(status, colors);
  const variance = actual - target;
  const percentage = target > 0 ? Math.min((actual / target) * 100, 100) : 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const formatVariance = (value: number): string => {
    if (value > 0) return `+${value}`;
    return `${value}`;
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={statusColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <Text style={[styles.percentage, { color: statusColor }]}>
          {Math.round(percentage)}%
        </Text>
        {showVariance && (
          <Text style={[styles.variance, { color: statusColor }]}>
            {formatVariance(variance)} {unit}
          </Text>
        )}
        {label && (
          <Text style={[styles.label, { color: colors.icon }]}>{label}</Text>
        )}
      </View>
    </View>
  );
};

export const GoalProgressRingCompact: React.FC<{
  actual: number;
  target: number;
  size?: number;
}> = ({ actual, target, size = 44 }) => {
  const { colors } = useTheme();
  const status = getGoalStatus(actual, target);
  const statusColor = getStatusColor(status, colors);
  const percentage = target > 0 ? Math.min((actual / target) * 100, 100) : 0;

  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.compactContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={statusColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.compactCenter}>
        <Text style={[styles.compactPercentage, { color: statusColor }]}>
          {Math.round(percentage)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  percentage: {
    fontSize: 22,
    fontWeight: "800",
  },
  variance: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  compactContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  compactCenter: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  compactPercentage: {
    fontSize: 11,
    fontWeight: "700",
  },
});

export default GoalProgressRing;
