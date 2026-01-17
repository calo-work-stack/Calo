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
import {
  Droplets,
  CheckCircle2,
  Plus,
  X,
  Lightbulb,
  GlassWater,
} from "lucide-react-native";
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
  { ml: 250, label: "250ml", size: "xs" },
  { ml: 500, label: "500ml", size: "sm" },
  { ml: 750, label: "750ml", size: "md" },
  { ml: 1000, label: "1L", size: "lg" },
  { ml: 1500, label: "1.5L", size: "xl" },
  { ml: 2000, label: "2L", size: "xxl" },
];

const ML_PER_CUP = 250;

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
    addButtonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { damping: 15 })
    );

    const cupsToAdd = Math.ceil(mlAmount / ML_PER_CUP);

    if (onAddVolume) {
      onAddVolume(mlAmount);
    } else {
      for (let i = 0; i < cupsToAdd && currentCups + i < maxCups; i++) {
        setTimeout(() => onIncrement(), i * 100);
      }
    }

    setTimeout(() => {
      setShowBottleModal(false);
      setSelectedBottle(null);
    }, 300);
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
      backgroundColor: isDark ? colors.primaryContainer : "#E0F7FA",
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
      gap: 6,
      paddingHorizontal: isSmallScreen ? 14 : 18,
      paddingVertical: isSmallScreen ? 10 : 12,
      backgroundColor: isDark ? colors.primaryContainer : "#E8F5E9",
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
      width: isSmallScreen ? 34 : 40,
      height: isSmallScreen ? 34 : 40,
      borderRadius: isSmallScreen ? 10 : 12,
      backgroundColor: colors.border,
      justifyContent: "center",
    },
    cupContainerFilled: {
      backgroundColor: isDark ? colors.primaryContainer : "#B2EBF2",
    },
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
      backgroundColor: isDark ? colors.card : "#F1F8FB",
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    quickAddButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    quickAddText: {
      fontSize: isSmallScreen ? 11 : 12,
      fontWeight: "700",
      color: colors.text,
    },
    quickAddTextActive: {
      color: "#ffffff",
    },
    addBottleButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginBottom: isSmallScreen ? 20 : 28,
      gap: 8,
    },
    addBottleButtonText: {
      fontSize: isSmallScreen ? 15 : 16,
      fontWeight: "700",
      color: "#ffffff",
    },
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
      backgroundColor: isDark ? colors.card : "#F1F8FB",
      borderRadius: 20,
      padding: 16,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "transparent",
      gap: 8,
    },
    bottleOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "15",
    },
    bottleOptionIcon: {
      marginBottom: 4,
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.border,
      borderRadius: 14,
      gap: 8,
    },
    modalCloseText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
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
      backgroundColor: isDark ? colors.primaryContainer : "#FFF8E1",
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

  const getBottleIcon = (size: string) => {
    const iconSize =
      size === "xs"
        ? 32
        : size === "sm"
        ? 36
        : size === "md"
        ? 40
        : size === "lg"
        ? 44
        : 48;
    return (
      <GlassWater size={iconSize} color={colors.primary} strokeWidth={2} />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Droplets
                size={isSmallScreen ? 36 : 42}
                color={colors.primary}
                strokeWidth={2}
              />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t("water.title")}</Text>
              <Text style={styles.subtitle}>{t("water.subtitle")}</Text>
            </View>
          </View>

          {isComplete && (
            <Animated.View style={[styles.badge, animatedBadgeStyle]}>
              <CheckCircle2
                size={18}
                color={colors.primary}
                strokeWidth={2.5}
              />
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
              <GlassWater size={22} color={colors.text} strokeWidth={2} />
              <Text style={styles.quickAddText}>1 {t("water.cup")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={() => handleBottleSelect(500)}
              disabled={disabled || currentCups >= maxCups}
              activeOpacity={0.7}
            >
              <GlassWater size={26} color={colors.text} strokeWidth={2} />
              <Text style={styles.quickAddText}>500ml</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={() => handleBottleSelect(750)}
              disabled={disabled || currentCups >= maxCups}
              activeOpacity={0.7}
            >
              <GlassWater size={30} color={colors.text} strokeWidth={2} />
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
            <Plus size={20} color="#ffffff" strokeWidth={3} />
            <Text style={styles.addBottleButtonText}>
              {t("water.addBottle")}
            </Text>
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
                <Animated.View
                  style={[
                    styles.cupContainer,
                    index < currentCups && styles.cupContainerFilled,
                    animatedCupStyle,
                  ]}
                >
                  <Droplets
                    size={isSmallScreen ? 20 : 24}
                    color={
                      index < currentCups ? colors.primary : colors.textTertiary
                    }
                    strokeWidth={2}
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
              <Lightbulb
                size={isSmallScreen ? 22 : 24}
                color={colors.primary}
                strokeWidth={2}
              />
            </View>
            <View style={styles.tipTextContainer}>
              <Text style={styles.tipText}>{t("water.tip")}</Text>
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
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{t("water.selectBottle")}</Text>
              <Text style={styles.modalSubtitle}>
                {t("water.selectBottleDesc")}
              </Text>

              <View style={styles.bottleGrid}>
                {BOTTLE_OPTIONS.map((bottle) => (
                  <TouchableOpacity
                    key={bottle.ml}
                    style={[
                      styles.bottleOption,
                      selectedBottle === bottle.ml &&
                        styles.bottleOptionSelected,
                    ]}
                    onPress={() => handleBottleSelect(bottle.ml)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.bottleOptionIcon}>
                      {getBottleIcon(bottle.size)}
                    </View>
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
                <X size={18} color={colors.text} />
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
