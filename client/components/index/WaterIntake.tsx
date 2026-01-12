import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 400;

interface WaterIntakeCardProps {
  currentCups: number;
  maxCups?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onAddVolume?: (mlAmount: number) => void;
  disabled?: boolean;
}

// Bottle size options in ml
const BOTTLE_OPTIONS = [
  { ml: 250, label: "250ml", icon: "cup", emoji: "🥤" },
  { ml: 500, label: "500ml", icon: "small_bottle", emoji: "🧃" },
  { ml: 750, label: "750ml", icon: "medium_bottle", emoji: "🍶" },
  { ml: 1000, label: "1L", icon: "large_bottle", emoji: "🫗" },
  { ml: 1500, label: "1.5L", icon: "xl_bottle", emoji: "🍾" },
  { ml: 2000, label: "2L", icon: "xxl_bottle", emoji: "🏺" },
];

const ML_PER_CUP = 250;

const WaterCupIcon: React.FC<{
  size: number;
  filled?: boolean;
  waterLevel?: number;
  colors: any;
}> = ({ size, filled = false, waterLevel = 0, colors }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="waterGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
          <Stop
            offset="100%"
            stopColor={colors.primaryContainer}
            stopOpacity="1"
          />
        </LinearGradient>
      </Defs>
      <Path
        d="M6 22L4 2h16l-2 20H6z"
        stroke={filled ? colors.primary : colors.border}
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

// Bottle icon component
const BottleIcon: React.FC<{
  size: number;
  fillLevel: number;
  colors: any;
  bottleSize: "small" | "medium" | "large" | "xl";
}> = ({ size, fillLevel, colors, bottleSize }) => {
  // Different bottle shapes based on size
  const getBottlePath = () => {
    switch (bottleSize) {
      case "small":
        return "M8 2h8v3l2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7l2-2V2z";
      case "medium":
        return "M9 1h6v2l3 3v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6l3-3V1z";
      case "large":
        return "M9 0h6v3l3 2v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5l3-2V0z";
      case "xl":
        return "M10 0h4v2l4 3v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5l4-3V0z";
      default:
        return "M8 2h8v3l2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7l2-2V2z";
    }
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="bottleWaterGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors.primaryContainer} stopOpacity="0.8" />
        </LinearGradient>
      </Defs>
      <Path
        d={getBottlePath()}
        stroke={colors.primary}
        strokeWidth="1.5"
        fill="none"
      />
      {fillLevel > 0 && (
        <Rect
          x="7"
          y={22 - (fillLevel / 100) * 15}
          width="10"
          height={(fillLevel / 100) * 15}
          rx="1"
          fill="url(#bottleWaterGradient)"
          opacity="0.85"
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
  onAddVolume,
  disabled = false,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [showBottleModal, setShowBottleModal] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState<number | null>(null);

  const progress = Math.min((currentCups / maxCups) * 100, 100);
  const currentMl = currentCups * ML_PER_CUP;
  const targetMl = maxCups * ML_PER_CUP;
  const isComplete = currentCups >= maxCups;

  const progressWidth = useSharedValue(0);
  const badgeOpacity = useSharedValue(0);
  const cupScales = Array.from({ length: maxCups }, () => useSharedValue(0));
  const addButtonScale = useSharedValue(1);

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
    opacity: badgeOpacity.value,
  }));

  const animatedAddButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addButtonScale.value }],
  }));

  const handleCupPress = (index: number) => {
    if (disabled) return;

    if (index < currentCups) {
      onDecrement();
    } else if (currentCups < maxCups) {
      onIncrement();
    }
  };

  const handleBottleSelect = (mlAmount: number) => {
    setSelectedBottle(mlAmount);
    // Animate button press
    addButtonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { damping: 15 })
    );

    // Calculate how many cups this equals
    const cupsToAdd = Math.ceil(mlAmount / ML_PER_CUP);

    if (onAddVolume) {
      onAddVolume(mlAmount);
    } else {
      // Fallback: add cups equivalent
      for (let i = 0; i < cupsToAdd && currentCups + i < maxCups; i++) {
        setTimeout(() => onIncrement(), i * 100);
      }
    }

    // Close modal after short delay
    setTimeout(() => {
      setShowBottleModal(false);
      setSelectedBottle(null);
    }, 300);
  };

  const getBottleSizeType = (ml: number): "small" | "medium" | "large" | "xl" => {
    if (ml <= 500) return "small";
    if (ml <= 750) return "medium";
    if (ml <= 1500) return "large";
    return "xl";
  };

  const styles = StyleSheet.create({
    container: {
      width: "100%",
      paddingHorizontal: isSmallScreen ? 12 : 16,
      paddingBottom: isSmallScreen ? 20 : 32,
      alignSelf: "center",
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: isSmallScreen ? 28 : 32,
      padding: isSmallScreen ? 24 : 32,
      borderWidth: 0.5,
      borderColor: colors.border,
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
      backgroundColor: isDark ? colors.primaryContainer : colors.emerald50,
      alignItems: "center",
      justifyContent: "center",
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      fontSize: isSmallScreen ? 22 : 26,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: isSmallScreen ? 13 : 14,
      color: colors.textSecondary,
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
      backgroundColor: isDark ? colors.primaryContainer : colors.emerald50,
      borderRadius: 100,
    },
    badgeText: {
      fontSize: isSmallScreen ? 13 : 14,
      fontWeight: "800",
      color: colors.primary,
      letterSpacing: 0.2,
    },
    progressSection: {
      marginBottom: isSmallScreen ? 20 : 28,
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
      color: colors.text,
      letterSpacing: -2,
    },
    maxCups: {
      fontSize: isSmallScreen ? 20 : 24,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    cupsLabel: {
      fontSize: isSmallScreen ? 16 : 18,
      fontWeight: "600",
      color: colors.textSecondary,
      letterSpacing: 0.1,
      marginLeft: 4,
    },
    mlText: {
      fontSize: isSmallScreen ? 13 : 14,
      color: colors.textTertiary,
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
      color: colors.primary,
      letterSpacing: -1,
    },
    completeText: {
      fontSize: isSmallScreen ? 11 : 12,
      color: colors.textSecondary,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginTop: 2,
    },
    progressBarContainer: {
      height: isSmallScreen ? 12 : 16,
      backgroundColor: colors.border,
      borderRadius: isSmallScreen ? 6 : 8,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: isSmallScreen ? 6 : 8,
    },
    cupsVisual: {
      flexDirection: "row",
      justifyContent: "center",
      gap: isSmallScreen ? 8 : 12,
      marginBottom: isSmallScreen ? 20 : 28,
      flexWrap: "wrap",
    },
    cupContainer: {
      alignItems: "center",
    },
    // Quick add section
    quickAddSection: {
      marginBottom: isSmallScreen ? 20 : 28,
    },
    quickAddLabel: {
      fontSize: isSmallScreen ? 14 : 15,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
      letterSpacing: 0.2,
    },
    quickAddButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    quickAddButton: {
      flex: 1,
      backgroundColor: isDark ? colors.primaryContainer : colors.emerald50,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickAddButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    quickAddEmoji: {
      fontSize: 20,
      marginBottom: 4,
    },
    quickAddText: {
      fontSize: isSmallScreen ? 11 : 12,
      fontWeight: "700",
      color: colors.text,
    },
    quickAddTextActive: {
      color: "#ffffff",
    },
    // Add bottle button
    addBottleButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginBottom: isSmallScreen ? 20 : 28,
      gap: 10,
    },
    addBottleButtonText: {
      fontSize: isSmallScreen ? 15 : 16,
      fontWeight: "700",
      color: "#ffffff",
    },
    addBottleEmoji: {
      fontSize: 20,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      paddingBottom: 40,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
    },
    bottleGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
    },
    bottleOption: {
      width: "31%",
      backgroundColor: isDark ? colors.card : colors.emerald50,
      borderRadius: 20,
      padding: 16,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
    bottleOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "15",
    },
    bottleOptionEmoji: {
      fontSize: 32,
      marginBottom: 8,
    },
    bottleOptionLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    bottleOptionCups: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    modalCloseButton: {
      marginTop: 20,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.border,
      borderRadius: 14,
    },
    modalCloseText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    // Tips section
    tipsSection: {
      marginTop: isSmallScreen ? 16 : 20,
      paddingTop: isSmallScreen ? 16 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    tipsContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 14,
      backgroundColor: isDark ? colors.primaryContainer : colors.emerald50,
      padding: isSmallScreen ? 16 : 20,
      borderRadius: isSmallScreen ? 18 : 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipIcon: {
      width: isSmallScreen ? 40 : 44,
      height: isSmallScreen ? 40 : 44,
      borderRadius: isSmallScreen ? 12 : 14,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipEmoji: {
      fontSize: isSmallScreen ? 18 : 20,
    },
    tipTextContainer: {
      flex: 1,
    },
    tipText: {
      fontSize: isSmallScreen ? 13 : 14,
      color: colors.text,
      lineHeight: isSmallScreen ? 20 : 22,
      letterSpacing: 0.1,
    },
    tipBold: {
      fontWeight: "800",
      color: colors.primary,
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
                colors={colors}
              />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t("water.title")}</Text>
              <Text style={styles.subtitle}>{t("water.subtitle")}</Text>
            </View>
          </View>

          {isComplete && (
            <Animated.View style={[styles.badge, animatedBadgeStyle]}>
              <Text style={styles.badgeText}>{t("water.goalReached")}</Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <View>
              <View style={styles.cupsRow}>
                <Text style={styles.currentCups}>{currentCups}</Text>
                <Text style={styles.maxCups}> / {maxCups}</Text>
                <Text style={styles.cupsLabel}>{t("water.cups")}</Text>
              </View>
              <Text style={styles.mlText}>
                {currentMl.toLocaleString()} ml / {targetMl.toLocaleString()} ml
              </Text>
            </View>
            <View style={styles.percentageContainer}>
              <Text style={styles.percentage}>{Math.round(progress)}%</Text>
              <Text style={styles.completeText}>{t("water.complete")}</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[styles.progressBarFill, animatedProgressStyle]}
            />
          </View>
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.quickAddSection}>
          <Text style={styles.quickAddLabel}>{t("water.quickAdd")}</Text>
          <View style={styles.quickAddButtons}>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={onIncrement}
              disabled={disabled || currentCups >= maxCups}
              activeOpacity={0.7}
            >
              <Text style={styles.quickAddEmoji}>🥤</Text>
              <Text style={styles.quickAddText}>1 {t("water.cup")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={() => handleBottleSelect(500)}
              disabled={disabled || currentCups >= maxCups}
              activeOpacity={0.7}
            >
              <Text style={styles.quickAddEmoji}>🧃</Text>
              <Text style={styles.quickAddText}>500ml</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={() => handleBottleSelect(750)}
              disabled={disabled || currentCups >= maxCups}
              activeOpacity={0.7}
            >
              <Text style={styles.quickAddEmoji}>🍶</Text>
              <Text style={styles.quickAddText}>750ml</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add Custom Bottle Button */}
        <Animated.View style={animatedAddButtonStyle}>
          <TouchableOpacity
            style={styles.addBottleButton}
            onPress={() => setShowBottleModal(true)}
            disabled={disabled || currentCups >= maxCups}
            activeOpacity={0.8}
          >
            <Text style={styles.addBottleEmoji}>🫗</Text>
            <Text style={styles.addBottleButtonText}>{t("water.addBottle")}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Cups Visual */}
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
                    size={isSmallScreen ? 32 : 38}
                    filled={index < currentCups}
                    waterLevel={index < currentCups ? 100 : 0}
                    colors={colors}
                  />
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <View style={styles.tipsContainer}>
            <View style={styles.tipIcon}>
              <Text style={styles.tipEmoji}>💡</Text>
            </View>
            <View style={styles.tipTextContainer}>
              <Text style={styles.tipText}>
                {t("water.tip")}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottle Selection Modal */}
      <Modal
        visible={showBottleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBottleModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBottleModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{t("water.selectBottle")}</Text>
              <Text style={styles.modalSubtitle}>{t("water.selectBottleDesc")}</Text>

              <View style={styles.bottleGrid}>
                {BOTTLE_OPTIONS.map((bottle) => (
                  <TouchableOpacity
                    key={bottle.ml}
                    style={[
                      styles.bottleOption,
                      selectedBottle === bottle.ml && styles.bottleOptionSelected,
                    ]}
                    onPress={() => handleBottleSelect(bottle.ml)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.bottleOptionEmoji}>{bottle.emoji}</Text>
                    <Text style={styles.bottleOptionLabel}>{bottle.label}</Text>
                    <Text style={styles.bottleOptionCups}>
                      = {Math.ceil(bottle.ml / ML_PER_CUP)} {t("water.cups")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowBottleModal(false)}
              >
                <Text style={styles.modalCloseText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default WaterIntakeCard;
