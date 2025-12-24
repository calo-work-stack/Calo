import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 400;

interface WaterIntakeCardProps {
  currentCups: number;
  maxCups?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

const WaterCupIcon: React.FC<{
  size: number;
  filled?: boolean;
  waterLevel?: number;
}> = ({ size, filled = false, waterLevel = 0 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="waterGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
          <Stop offset="100%" stopColor="#0891b2" stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Path
        d="M6 22L4 2h16l-2 20H6z"
        stroke={filled ? "#0891b2" : "#e2e8f0"}
        strokeWidth="1.5"
        fill="none"
      />
      {filled && waterLevel > 0 && (
        <Path
          d={`M4.5 ${2 + (waterLevel / 100) * 20}h15l-0.5 ${
            20 - (waterLevel / 100) * 20
          }H4.5z`}
          fill="url(#waterGradient)"
          opacity="0.9"
        />
      )}
    </Svg>
  );
};

const WaterIntakeCard: React.FC<WaterIntakeCardProps> = ({
  currentCups,
  maxCups = 10,
  onIncrement,
  onDecrement,
  disabled = false,
}) => {
  const progress = Math.min((currentCups / maxCups) * 100, 100);
  const currentMl = currentCups * 250;
  const targetMl = maxCups * 250;
  const isComplete = currentCups >= maxCups;

  const progressWidth = useSharedValue(0);
  const badgeScale = useSharedValue(0);
  const badgeOpacity = useSharedValue(0);
  const cupScales = Array.from({ length: maxCups }, () => useSharedValue(0));

  useEffect(() => {
    progressWidth.value = withSpring(progress, {
      damping: 20,
      stiffness: 90,
    });
  }, [progress]);

  useEffect(() => {
    if (isComplete) {
      badgeOpacity.value = withTiming(1, { duration: 300 });
    } else {
      badgeOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isComplete]);

  useEffect(() => {
    cupScales.forEach((scale, index) => {
      if (index < currentCups) {
        scale.value = withSpring(1, {
          damping: 15,
          stiffness: 150,
        });
      } else {
        scale.value = withSpring(0.85, {
          damping: 15,
          stiffness: 150,
        });
      }
    });
  }, [currentCups]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeOpacity.value,
  }));

  const handleCupPress = (index: number) => {
    if (disabled) return;

    if (index < currentCups) {
      onDecrement();
    } else if (currentCups < maxCups) {
      onIncrement();
    }
  };

  const styles = StyleSheet.create({
    container: {
      width: "100%",
      paddingHorizontal: isSmallScreen ? 12 : 16,
      paddingBottom: isSmallScreen ? 20 : 32,
      alignSelf: "center",
    },
    card: {
      backgroundColor: "#ffffff",
      borderRadius: isSmallScreen ? 28 : 32,
      padding: isSmallScreen ? 24 : 32,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: isSmallScreen ? 24 : 32,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: isSmallScreen ? 14 : 18,
      flex: 1,
    },
    iconContainer: {
      width: isSmallScreen ? 64 : 72,
      height: isSmallScreen ? 64 : 72,
      borderRadius: isSmallScreen ? 20 : 24,
      backgroundColor: "#f0fdff",
      alignItems: "center",
      justifyContent: "center",
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      fontSize: isSmallScreen ? 22 : 26,
      fontWeight: "800",
      color: "#0f172a",
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: isSmallScreen ? 13 : 14,
      color: "#64748b",
      fontWeight: "600",
      marginTop: 4,
      letterSpacing: 0.1,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: isSmallScreen ? 16 : 20,
      paddingVertical: isSmallScreen ? 10 : 12,
      backgroundColor: "#ecfeff",
      borderRadius: 100,
    },
    trophy: {
      fontSize: isSmallScreen ? 18 : 20,
    },
    badgeText: {
      fontSize: isSmallScreen ? 13 : 14,
      fontWeight: "800",
      color: "#0e7490",
      letterSpacing: 0.2,
    },
    progressSection: {
      marginBottom: isSmallScreen ? 28 : 36,
    },
    progressHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    cupsRow: {
      flexDirection: "row",
      alignItems: "baseline",
    },
    currentCups: {
      fontSize: isSmallScreen ? 40 : 48,
      fontWeight: "800",
      color: "#0f172a",
      letterSpacing: -2,
    },
    maxCups: {
      fontSize: isSmallScreen ? 20 : 24,
      fontWeight: "700",
      color: "#94a3b8",
    },
    cupsLabel: {
      fontSize: isSmallScreen ? 16 : 18,
      fontWeight: "600",
      color: "#64748b",
      letterSpacing: 0.1,
      marginLeft: 4,
    },
    mlText: {
      fontSize: isSmallScreen ? 13 : 14,
      color: "#94a3b8",
      fontWeight: "600",
      marginTop: 6,
      letterSpacing: 0.1,
    },
    percentageContainer: {
      alignItems: "flex-end",
    },
    percentage: {
      fontSize: isSmallScreen ? 28 : 36,
      fontWeight: "800",
      color: "#06b6d4",
      letterSpacing: -1,
    },
    completeText: {
      fontSize: isSmallScreen ? 11 : 12,
      color: "#64748b",
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginTop: 2,
    },
    progressBarContainer: {
      height: isSmallScreen ? 12 : 16,
      backgroundColor: "#f1f5f9",
      borderRadius: isSmallScreen ? 6 : 8,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: "#06b6d4",
      borderRadius: isSmallScreen ? 6 : 8,
    },
    cupsVisual: {
      flexDirection: "row",
      justifyContent: "center",
      gap: isSmallScreen ? 8 : 12,
      marginBottom: isSmallScreen ? 28 : 36,
      flexWrap: "wrap",
    },
    cupContainer: {
      alignItems: "center",
    },
    controls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: isSmallScreen ? 20 : 28,
    },
    button: {
      width: isSmallScreen ? 64 : 72,
      height: isSmallScreen ? 64 : 72,
      borderRadius: isSmallScreen ? 20 : 24,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonActive: {
      backgroundColor: "#ecfeff",
    },
    buttonDisabled: {
      backgroundColor: "#f1f5f9",
    },
    controlsCenter: {
      minWidth: isSmallScreen ? 120 : 140,
      alignItems: "center",
    },
    controlsCups: {
      fontSize: isSmallScreen ? 28 : 32,
      fontWeight: "800",
      color: "#0f172a",
      letterSpacing: -1,
    },
    controlsMl: {
      fontSize: isSmallScreen ? 13 : 14,
      color: "#64748b",
      fontWeight: "600",
      marginTop: 4,
      letterSpacing: 0.1,
    },
    tipsSection: {
      marginTop: isSmallScreen ? 24 : 28,
      paddingTop: isSmallScreen ? 24 : 28,
      borderTopWidth: 1,
      borderTopColor: "#e2e8f0",
    },
    tipsContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 14,
      backgroundColor: "#f0fdff",
      padding: isSmallScreen ? 16 : 20,
      borderRadius: isSmallScreen ? 18 : 20,
      borderWidth: 1,
      borderColor: "#cffafe",
    },
    tipIcon: {
      width: isSmallScreen ? 40 : 44,
      height: isSmallScreen ? 40 : 44,
      borderRadius: isSmallScreen ? 12 : 14,
      backgroundColor: "#ffffff",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#a5f3fc",
    },
    tipEmoji: {
      fontSize: isSmallScreen ? 18 : 20,
    },
    tipTextContainer: {
      flex: 1,
    },
    tipText: {
      fontSize: isSmallScreen ? 13 : 14,
      color: "#164e63",
      lineHeight: isSmallScreen ? 20 : 22,
      letterSpacing: 0.1,
    },
    tipBold: {
      fontWeight: "800",
      color: "#0e7490",
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <WaterCupIcon
                size={isSmallScreen ? 36 : 42}
                filled={true}
                waterLevel={progress}
              />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Water Intake</Text>
              <Text style={styles.subtitle}>Stay hydrated today</Text>
            </View>
          </View>

          {isComplete && (
            <Animated.View style={[styles.badge, animatedBadgeStyle]}>
              <Text style={styles.badgeText}>Goal Reached!</Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <View>
              <View style={styles.cupsRow}>
                <Text style={styles.currentCups}>{currentCups}</Text>
                <Text style={styles.maxCups}> / {maxCups}</Text>
                <Text style={styles.cupsLabel}>cups</Text>
              </View>
              <Text style={styles.mlText}>
                {currentMl.toLocaleString()} ml / {targetMl.toLocaleString()} ml
              </Text>
            </View>
            <View style={styles.percentageContainer}>
              <Text style={styles.percentage}>{Math.round(progress)}%</Text>
              <Text style={styles.completeText}>complete</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[styles.progressBarFill, animatedProgressStyle]}
            />
          </View>
        </View>

        <View style={styles.cupsVisual}>
          {Array.from({ length: maxCups }).map((_, index) => {
            const animatedCupStyle = useAnimatedStyle(() => ({
              transform: [{ scale: cupScales[index].value }],
            }));

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleCupPress(index)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Animated.View style={[styles.cupContainer, animatedCupStyle]}>
                  <WaterCupIcon
                    size={isSmallScreen ? 36 : 44}
                    filled={index < currentCups}
                    waterLevel={index < currentCups ? 100 : 0}
                  />
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default WaterIntakeCard;
