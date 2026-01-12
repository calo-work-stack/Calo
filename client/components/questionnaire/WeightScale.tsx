import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, PanResponder } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";

interface WeightScaleProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  label: string;
}

const WeightScale: React.FC<WeightScaleProps> = ({
  value,
  onValueChange,
  min = 30,
  max = 200,
  unit = "kg",
  label,
}) => {
  const { colors, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === "he";

  const [currentValue, setCurrentValue] = useState(value);
  const translateX = useSharedValue(0);
  const dragStartPosition = useRef(0);
  const indicatorPulse = useSharedValue(1);

  const screenWidth = Dimensions.get("window").width;
  const SCALE_WIDTH = screenWidth - 48;
  const MARK_SPACING = 10; // Increased spacing for better visibility
  const CENTER_X = SCALE_WIDTH / 2;

  const totalRange = max - min;

  // Convert a value to its position on the scale
  const valueToPosition = (val: number) => {
    const clampedValue = Math.max(min, Math.min(max, val));
    const offset = (clampedValue - min) * MARK_SPACING;
    return -offset;
  };

  // Convert a position to its corresponding value
  const positionToValue = (position: number) => {
    const offset = -position;
    const valueIndex = Math.round(offset / MARK_SPACING);
    return Math.max(min, Math.min(max, min + valueIndex));
  };

  // Initialize the scale position when component mounts or value changes externally
  useEffect(() => {
    const initialPosition = valueToPosition(value);
    translateX.value = withSpring(initialPosition, {
      damping: 20,
      stiffness: 300,
    });
    setCurrentValue(value);
  }, [value, min, max]);

  const updateCurrentValue = (val: number) => {
    setCurrentValue(val);
  };

  const finalizeValueChange = (val: number) => {
    onValueChange(val);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartPosition.current = translateX.value;
        // Pulse animation on touch
        indicatorPulse.value = withSpring(1.15, { damping: 10 });
      },
      onPanResponderMove: (evt, gestureState) => {
        const newPosition = dragStartPosition.current + gestureState.dx;
        const minPosition = valueToPosition(max);
        const maxPosition = valueToPosition(min);
        const clampedPosition = Math.max(
          minPosition,
          Math.min(maxPosition, newPosition)
        );

        translateX.value = clampedPosition;
        const newValue = positionToValue(clampedPosition);
        runOnJS(updateCurrentValue)(newValue);
      },
      onPanResponderRelease: () => {
        // Reset pulse
        indicatorPulse.value = withSpring(1, { damping: 15 });

        const currentPosition = translateX.value;
        const snapValue = positionToValue(currentPosition);
        const snapPosition = valueToPosition(snapValue);

        translateX.value = withSpring(snapPosition, {
          damping: 20,
          stiffness: 300,
        });

        runOnJS(updateCurrentValue)(snapValue);
        runOnJS(finalizeValueChange)(snapValue);
      },
    })
  ).current;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: indicatorPulse.value }],
  }));

  const renderScaleMarks = () => {
    const marks = [];

    for (let i = 0; i <= totalRange; i++) {
      const markValue = min + i;
      const isMainMark = markValue % 10 === 0;
      const isMiddleMark = markValue % 5 === 0 && !isMainMark;

      // Enhanced mark styling
      const markHeight = isMainMark ? 40 : isMiddleMark ? 28 : 16;
      const markWidth = isMainMark ? 3 : isMiddleMark ? 2 : 1.5;

      marks.push(
        <View
          key={`mark-${i}`}
          style={[
            styles.scaleMark,
            {
              left: i * MARK_SPACING + CENTER_X,
              height: markHeight,
              width: markWidth,
              backgroundColor: isMainMark
                ? colors.primary
                : isMiddleMark
                ? colors.primary + "80"
                : colors.border,
              borderRadius: markWidth / 2,
            },
          ]}
        />
      );

      // Add text label for main marks (every 10 units)
      if (isMainMark) {
        marks.push(
          <Text
            key={`text-${i}`}
            style={[
              styles.scaleText,
              {
                left: i * MARK_SPACING + CENTER_X - 18,
                color: colors.text,
              },
            ]}
          >
            {markValue}
          </Text>
        );
      }
    }

    return marks;
  };

  return (
    <View style={styles.container}>
      <Text
        style={[styles.label, isRTL && styles.textRTL, { color: colors.text }]}
      >
        {label}
      </Text>

      {/* Enhanced Value Display */}
      <View
        style={[
          styles.valueDisplay,
          {
            backgroundColor: isDark ? colors.primary + "20" : colors.primary + "10",
            borderColor: colors.primary + "40",
          },
        ]}
      >
        <View style={styles.valueInner}>
          <Text
            style={[styles.valueText, { color: colors.primary }]}
          >
            {currentValue}
          </Text>
          <Text
            style={[styles.unitText, { color: colors.primary + "CC" }]}
          >
            {unit}
          </Text>
        </View>
      </View>

      {/* Scale Container with improved visuals */}
      <View style={[styles.scaleContainer, { backgroundColor: colors.card }]}>
        {/* Gradient fade on edges */}
        <View
          style={[
            styles.edgeFade,
            styles.edgeFadeLeft,
            { backgroundColor: colors.card }
          ]}
        />
        <View
          style={[
            styles.edgeFade,
            styles.edgeFadeRight,
            { backgroundColor: colors.card }
          ]}
        />

        {/* Center Indicator with glow effect */}
        <View style={styles.centerIndicatorWrapper}>
          <View
            style={[
              styles.centerIndicatorGlow,
              { backgroundColor: colors.primary + "30" },
            ]}
          />
          <Animated.View
            style={[
              styles.centerIndicator,
              { backgroundColor: colors.primary },
              animatedIndicatorStyle,
            ]}
          />
          <View
            style={[
              styles.centerIndicatorArrow,
              { borderBottomColor: colors.primary },
            ]}
          />
        </View>

        {/* Scale Wrapper with Pan Responder */}
        <View style={[styles.scaleWrapper, { width: SCALE_WIDTH }]}>
          <View {...panResponder.panHandlers} style={styles.panArea}>
            <Animated.View style={[styles.scaleTrack, animatedStyle]}>
              {renderScaleMarks()}
            </Animated.View>
          </View>
        </View>

        {/* Instruction text */}
        <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
          ← {isRTL ? "גרור לבחירת ערך" : "Drag to select"} →
        </Text>
      </View>

      {/* Range Labels */}
      <View style={[styles.rangeLabels, isRTL && styles.rangeLabelsRTL]}>
        <View style={[styles.rangeBadge, { backgroundColor: colors.border + "40" }]}>
          <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>
            {min} {unit}
          </Text>
        </View>
        <View style={[styles.rangeBadge, { backgroundColor: colors.border + "40" }]}>
          <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>
            {max} {unit}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  textRTL: {
    textAlign: "right",
  },
  valueDisplay: {
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 2,
    minWidth: 160,
  },
  valueInner: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  valueText: {
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -2,
  },
  unitText: {
    fontSize: 22,
    fontWeight: "600",
    marginLeft: 8,
  },
  scaleContainer: {
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 16,
    position: "relative",
    overflow: "hidden",
  },
  edgeFade: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 40,
    zIndex: 5,
  },
  edgeFadeLeft: {
    left: 0,
  },
  edgeFadeRight: {
    right: 0,
  },
  centerIndicatorWrapper: {
    position: "absolute",
    top: 8,
    alignItems: "center",
    zIndex: 10,
  },
  centerIndicatorGlow: {
    position: "absolute",
    width: 20,
    height: 60,
    borderRadius: 10,
    top: -4,
  },
  centerIndicator: {
    width: 4,
    height: 52,
    borderRadius: 2,
    zIndex: 11,
  },
  centerIndicatorArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -2,
  },
  scaleWrapper: {
    height: 90,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  panArea: {
    flex: 1,
    justifyContent: "center",
  },
  scaleTrack: {
    flexDirection: "row",
    height: "100%",
    position: "relative",
  },
  scaleMark: {
    position: "absolute",
    bottom: 20,
  },
  scaleText: {
    position: "absolute",
    bottom: 66,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    width: 36,
  },
  instructionText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 16,
    paddingHorizontal: 8,
  },
  rangeLabelsRTL: {
    flexDirection: "row-reverse",
  },
  rangeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rangeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});

export default WeightScale;
