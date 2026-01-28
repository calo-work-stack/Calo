import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Trophy,
  Star,
  Crown,
  Medal,
  Award,
  X,
  Flame,
  Target,
  Sparkles,
  Droplets,
  Calendar,
  Zap,
  ChevronRight,
  Lock,
  TrendingUp,
  Gift,
  CheckCircle2,
  Gem,
  Shield,
} from "lucide-react-native";
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import { t } from "i18next";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

interface LocalizedString {
  en: string;
  he: string;
}

interface Achievement {
  id: string;
  title: string | LocalizedString;
  description: string | LocalizedString;
  icon: string;
  rarity: string;
  category: string;
  unlocked: boolean;
  progress: number;
  maxProgress?: number;
  xpReward: number;
  unlockedDate?: string;
  verified?: boolean; // New field for verification status
}

const getLocalizedText = (
  text: string | LocalizedString,
  locale: string = "en",
): string => {
  if (typeof text === "string") return text;
  return text[locale as keyof LocalizedString] || text.en;
};

interface AchievementsSectionProps {
  achievements: Achievement[];
  period?: "today" | "week" | "month";
  locale?: string;
}

const getAchievementIcon = (
  iconName: string,
  size: number = 24,
  color: string = "#10B981",
) => {
  const iconProps = { size, color, strokeWidth: 2.5 };

  switch (iconName) {
    case "target":
      return <Target {...iconProps} />;
    case "sparkles":
      return <Sparkles {...iconProps} />;
    case "star":
      return <Star {...iconProps} />;
    case "medal":
      return <Medal {...iconProps} />;
    case "trophy":
      return <Trophy {...iconProps} />;
    case "crown":
      return <Crown {...iconProps} />;
    case "droplets":
      return <Droplets {...iconProps} />;
    case "flame":
      return <Flame {...iconProps} />;
    case "calendar":
      return <Calendar {...iconProps} />;
    case "zap":
      return <Zap {...iconProps} />;
    case "gem":
      return <Gem {...iconProps} />;
    case "shield":
      return <Shield {...iconProps} />;
    default:
      return <Award {...iconProps} />;
  }
};

const getRarityConfig = (rarity: string) => {
  switch (rarity.toUpperCase()) {
    case "LEGENDARY":
      return {
        color: "#FFD700",
        gradient: ["#FFD700", "#FFA500", "#FF8C00"],
        bgGradient: ["#FFF9E5", "#FFEFC7"],
        darkBgGradient: ["#4A3B00", "#3D3000"],
        glow: "rgba(255, 215, 0, 0.4)",
        shadowColor: "#FFD700",
        label: "Legendary",
        particles: ["#FFED4E", "#FFD700", "#FFA500"],
      };
    case "EPIC":
      return {
        color: "#9333EA",
        gradient: ["#C084FC", "#9333EA", "#7E22CE"],
        bgGradient: ["#FAF5FF", "#F3E8FF"],
        darkBgGradient: ["#3D1E5C", "#2D1545"],
        glow: "rgba(147, 51, 234, 0.4)",
        shadowColor: "#9333EA",
        label: "Epic",
        particles: ["#C084FC", "#9333EA", "#7E22CE"],
      };
    case "RARE":
      return {
        color: "#3B82F6",
        gradient: ["#60A5FA", "#3B82F6", "#2563EB"],
        bgGradient: ["#EFF6FF", "#DBEAFE"],
        darkBgGradient: ["#1E3A5F", "#152C4A"],
        glow: "rgba(59, 130, 246, 0.4)",
        shadowColor: "#3B82F6",
        label: "Rare",
        particles: ["#60A5FA", "#3B82F6", "#2563EB"],
      };
    case "UNCOMMON":
      return {
        color: "#10B981",
        gradient: ["#34D399", "#10B981", "#059669"],
        bgGradient: ["#ECFDF5", "#D1FAE5"],
        darkBgGradient: ["#1E4B3D", "#163B2F"],
        glow: "rgba(16, 185, 129, 0.4)",
        shadowColor: "#10B981",
        label: "Uncommon",
        particles: ["#34D399", "#10B981", "#059669"],
      };
    case "COMMON":
    default:
      return {
        color: "#6B7280",
        gradient: ["#9CA3AF", "#6B7280", "#4B5563"],
        bgGradient: ["#F9FAFB", "#F3F4F6"],
        darkBgGradient: ["#374151", "#1F2937"],
        glow: "rgba(107, 114, 128, 0.4)",
        shadowColor: "#6B7280",
        label: "Common",
        particles: ["#9CA3AF", "#6B7280", "#4B5563"],
      };
  }
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Enhanced Preview Card with better visuals
const AchievementPreviewCard: React.FC<{
  achievement: Achievement;
  index: number;
  onPress: () => void;
  locale?: string;
  isDark?: boolean;
}> = ({ achievement, index, onPress, locale = "en", isDark = false }) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const rarityConfig = getRarityConfig(achievement.rarity);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotateZ: `${rotation.value}deg` }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
    if (achievement.unlocked) {
      rotation.value = withSequence(
        withTiming(-2, { duration: 100 }),
        withTiming(2, { duration: 100 }),
        withTiming(0, { duration: 100 }),
      );
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <AnimatedTouchable
      entering={FadeInUp.delay(index * 60).springify()}
      style={[styles.previewCard, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {achievement.unlocked ? (
        <LinearGradient
          colors={
            isDark
              ? (rarityConfig.darkBgGradient as any)
              : (rarityConfig.bgGradient as any)
          }
          style={styles.previewGradient}
        >
          {/* Enhanced glow effect */}
          <View
            style={[
              styles.glowEffect,
              {
                backgroundColor: rarityConfig.glow,
                shadowColor: rarityConfig.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.8,
                shadowRadius: 8,
              },
            ]}
          />

          {/* Shimmer overlay for legendary */}
          {achievement.rarity === "LEGENDARY" && (
            <Animated.View
              style={styles.shimmerOverlay}
              entering={FadeIn.delay(index * 60 + 300)}
            />
          )}

          {/* Icon with enhanced shadow */}
          <View
            style={[
              styles.previewIconContainer,
              {
                backgroundColor: rarityConfig.color + "20",
                shadowColor: rarityConfig.shadowColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              },
            ]}
          >
            {getAchievementIcon(achievement.icon, 30, rarityConfig.color)}
          </View>

          {/* Verification badge for unlocked achievements */}
          {achievement.verified && (
            <Animated.View
              entering={ZoomIn.delay(index * 60 + 250)}
              style={styles.verifiedBadge}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.verifiedCircle}
              >
                <CheckCircle2 size={14} color="white" strokeWidth={3} />
              </LinearGradient>
            </Animated.View>
          )}

          {/* Title */}
          <Text
            style={[styles.previewTitle, isDark && { color: "#FFFFFF" }]}
            numberOfLines={2}
          >
            {getLocalizedText(achievement.title, locale)}
          </Text>

          {/* Enhanced rarity indicator */}
          <View style={styles.rarityIndicator}>
            {[
              ...Array(
                achievement.rarity === "LEGENDARY"
                  ? 5
                  : achievement.rarity === "EPIC"
                    ? 4
                    : achievement.rarity === "RARE"
                      ? 3
                      : 2,
              ),
            ].map((_, i) => (
              <Animated.View
                key={i}
                entering={FadeIn.delay(index * 60 + 400 + i * 50)}
              >
                <View
                  style={[
                    styles.rarityDot,
                    {
                      backgroundColor: rarityConfig.color,
                      shadowColor: rarityConfig.shadowColor,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.5,
                      shadowRadius: 2,
                    },
                  ]}
                />
              </Animated.View>
            ))}
          </View>
        </LinearGradient>
      ) : (
        <LinearGradient
          colors={isDark ? ["#1F2937", "#111827"] : ["#FAFAFA", "#F5F5F5"]}
          style={styles.previewGradient}
        >
          {/* Locked icon */}
          <View
            style={[
              styles.previewIconContainer,
              { backgroundColor: isDark ? "#374151" : "#E5E5EA" },
            ]}
          >
            <Lock
              size={28}
              color={isDark ? "#6B7280" : "#9CA3AF"}
              strokeWidth={2.5}
            />
          </View>

          {/* Progress text */}
          <Text
            style={[
              styles.previewTitle,
              { color: isDark ? "#9CA3AF" : "#6B7280" },
            ]}
            numberOfLines={2}
          >
            {achievement.progress}/{achievement.maxProgress || "?"}
          </Text>

          {/* Progress bar */}
          <View style={styles.lockedProgressBar}>
            <View
              style={[
                styles.lockedProgressFill,
                {
                  width: `${Math.min(
                    100,
                    (achievement.progress / (achievement.maxProgress || 1)) *
                      100,
                  )}%`,
                  backgroundColor: rarityConfig.color,
                },
              ]}
            />
          </View>

          {/* Progress hint */}
          <Text style={[styles.lockedHint, isDark && { color: "#6B7280" }]}>
            {Math.round(
              (achievement.progress / (achievement.maxProgress || 1)) * 100,
            )}
            %
          </Text>
        </LinearGradient>
      )}
    </AnimatedTouchable>
  );
};

// Enhanced Full Card with better details
const AchievementFullCard: React.FC<{
  achievement: Achievement;
  index: number;
  locale?: string;
  isDark?: boolean;
}> = ({ achievement, index, locale = "en", isDark = false }) => {
  const scale = useSharedValue(1);
  const rarityConfig = getRarityConfig(achievement.rarity);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const progressPercentage = achievement.maxProgress
    ? (achievement.progress / achievement.maxProgress) * 100
    : 0;

  return (
    <AnimatedTouchable
      entering={FadeInUp.delay(index * 50).springify()}
      style={[styles.fullCard, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.95}
    >
      <LinearGradient
        colors={
          achievement.unlocked
            ? isDark
              ? (rarityConfig.darkBgGradient as any)
              : (rarityConfig.bgGradient as any)
            : isDark
              ? (["#1F2937", "#111827"] as any)
              : (["#FFFFFF", "#FAFAFA"] as any)
        }
        style={styles.fullCardGradient}
      >
        {achievement.unlocked && (
          <>
            <View
              style={[
                styles.fullCardGlow,
                {
                  backgroundColor: rarityConfig.glow,
                  shadowColor: rarityConfig.shadowColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                },
              ]}
            />

            {/* Particle effects for legendary */}
            {achievement.rarity === "LEGENDARY" && (
              <View style={styles.particleContainer}>
                {[...Array(5)].map((_, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.particle,
                      {
                        backgroundColor: rarityConfig.particles[i % 3],
                        left: `${20 + i * 15}%`,
                      },
                    ]}
                    entering={FadeInUp.delay(index * 50 + 300 + i * 100)
                      .springify()
                      .damping(15)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.fullCardContent}>
          {/* Icon section */}
          <View style={styles.fullCardLeft}>
            <View
              style={[
                styles.fullIconContainer,
                {
                  backgroundColor: achievement.unlocked
                    ? rarityConfig.color + "20"
                    : isDark
                      ? "#374151"
                      : "#F3F4F6",
                  shadowColor: achievement.unlocked
                    ? rarityConfig.shadowColor
                    : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                },
              ]}
            >
              {achievement.unlocked ? (
                getAchievementIcon(achievement.icon, 40, rarityConfig.color)
              ) : (
                <Lock
                  size={36}
                  color={isDark ? "#6B7280" : "#9CA3AF"}
                  strokeWidth={2.5}
                />
              )}
            </View>

            {achievement.unlocked && (
              <View
                style={[
                  styles.rarityBadge,
                  {
                    backgroundColor: rarityConfig.color + "20",
                    borderWidth: 1.5,
                    borderColor: rarityConfig.color + "40",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rarityText,
                    {
                      color: rarityConfig.color,
                      fontWeight: "900",
                    },
                  ]}
                >
                  {rarityConfig.label}
                </Text>
              </View>
            )}
          </View>

          {/* Info section */}
          <View style={styles.fullCardInfo}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.fullCardTitle,
                  {
                    color: achievement.unlocked
                      ? isDark
                        ? "#FFFFFF"
                        : "#000000"
                      : isDark
                        ? "#9CA3AF"
                        : "#6B7280",
                  },
                ]}
                numberOfLines={2}
              >
                {getLocalizedText(achievement.title, locale)}
              </Text>

              {achievement.unlocked && (
                <Animated.View entering={ZoomIn.delay(index * 50 + 200)}>
                  <LinearGradient
                    colors={rarityConfig.gradient as any}
                    style={[
                      styles.xpBadge,
                      {
                        shadowColor: rarityConfig.shadowColor,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                      },
                    ]}
                  >
                    <Sparkles size={16} color="white" strokeWidth={2.5} />
                    <Text style={styles.xpText}>+{achievement.xpReward}</Text>
                  </LinearGradient>
                </Animated.View>
              )}
            </View>

            <Text
              style={[
                styles.fullCardDescription,
                {
                  color: achievement.unlocked
                    ? isDark
                      ? "#D1D5DB"
                      : "#4B5563"
                    : isDark
                      ? "#6B7280"
                      : "#9CA3AF",
                },
              ]}
              numberOfLines={2}
            >
              {getLocalizedText(achievement.description, locale)}
            </Text>

            {/* Progress or date */}
            {achievement.unlocked ? (
              <View style={styles.unlockedInfo}>
                {achievement.unlockedDate && (
                  <View style={styles.unlockedDateRow}>
                    <Calendar size={14} color={rarityConfig.color} />
                    <Text
                      style={[styles.dateText, { color: rarityConfig.color }]}
                    >
                      Unlocked{" "}
                      {new Date(achievement.unlockedDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </Text>
                  </View>
                )}

                {/* Verification status */}
                {achievement.verified && (
                  <View style={styles.verificationRow}>
                    <CheckCircle2 size={14} color="#10B981" strokeWidth={2.5} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text
                    style={[
                      styles.progressLabel,
                      isDark && { color: "#9CA3AF" },
                    ]}
                  >
                    Progress
                  </Text>
                  <Text
                    style={[
                      styles.progressValue,
                      isDark && { color: "#D1D5DB" },
                    ]}
                  >
                    {achievement.progress}/{achievement.maxProgress || "?"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressBarContainer,
                    {
                      backgroundColor: isDark
                        ? "#374151"
                        : "rgba(0, 0, 0, 0.08)",
                    },
                  ]}
                >
                  <LinearGradient
                    colors={rarityConfig.gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercentage}%` },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.progressPercentage,
                    isDark && { color: "#9CA3AF" },
                  ]}
                >
                  {Math.round(progressPercentage)}% complete
                </Text>
              </View>
            )}
          </View>
        </View>

        {achievement.unlocked && (
          <View style={styles.fullCardCheckmark}>
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={[
                styles.checkmarkCircle,
                {
                  shadowColor: "#10B981",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.5,
                  shadowRadius: 4,
                },
              ]}
            >
              <Text style={styles.checkmarkText}>✓</Text>
            </LinearGradient>
          </View>
        )}
      </LinearGradient>
    </AnimatedTouchable>
  );
};

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  achievements,
  period = "month",
  locale = "en",
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { colors, isDark } = useTheme();

  const categories = [
    { key: "all", label: "All", icon: Trophy },
    { key: "MILESTONE", label: "Milestones", icon: Target },
    { key: "STREAK", label: "Streaks", icon: Flame },
    { key: "GOAL", label: "Goals", icon: Star },
    { key: "SPECIAL", label: "Special", icon: Gift },
  ];

  const filteredAchievements = useMemo(() => {
    if (selectedCategory === "all") return achievements;
    return achievements.filter(
      (achievement) => achievement.category === selectedCategory,
    );
  }, [achievements, selectedCategory]);

  const unlockedAchievements = useMemo(
    () => filteredAchievements.filter((a) => a.unlocked),
    [filteredAchievements],
  );

  const lockedAchievements = useMemo(
    () => filteredAchievements.filter((a) => !a.unlocked),
    [filteredAchievements],
  );

  const totalUnlocked = achievements.filter((a) => a.unlocked).length;
  const totalXP = achievements.reduce(
    (sum, a) => sum + (a.unlocked ? a.xpReward : 0),
    0,
  );
  const completionPercentage = Math.round(
    (totalUnlocked / achievements.length) * 100,
  );

  // Calculate rarity distribution
  const rarityStats = useMemo(() => {
    const stats = { LEGENDARY: 0, EPIC: 0, RARE: 0, UNCOMMON: 0, COMMON: 0 };
    achievements.forEach((a) => {
      if (a.unlocked && a.rarity) {
        stats[a.rarity.toUpperCase() as keyof typeof stats]++;
      }
    });
    return stats;
  }, [achievements]);

  return (
    <>
      {/* Main Section */}
      <Animated.View
        entering={FadeIn.duration(600)}
        style={[styles.section, { backgroundColor: colors.card }]}
      >
        {/* Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.sectionIcon}
            >
              <Trophy size={24} color="white" strokeWidth={2.5} />
            </LinearGradient>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Achievements
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {totalUnlocked} {t("common.of")} {achievements.length}{" "}
                {t("common.unlocked")}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.viewAllButton]}
            onPress={() => setShowModal(true)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.viewAllGradient}
            >
              <ChevronRight size={16} color="white" strokeWidth={3} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Enhanced progress bar */}
        <View style={styles.overallProgress}>
          <View
            style={[
              styles.progressBarContainer,
              { backgroundColor: isDark ? "#374151" : "rgba(0, 0, 0, 0.08)" },
            ]}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressBarFill,
                { width: `${completionPercentage}%` },
              ]}
            />
          </View>
          <View style={styles.progressTextRow}>
            <Text
              style={[
                styles.progressPercentageText,
                { color: colors.textSecondary },
              ]}
            >
              {completionPercentage}% {t("common.complete")}
            </Text>
            <Text style={[styles.xpTotalText, { color: colors.textSecondary }]}>
              {totalXP} XP earned
            </Text>
          </View>
        </View>

        {/* Scrollable preview cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewScrollContent}
          decelerationRate="fast"
          snapToInterval={126}
        >
          {achievements.slice(0, 10).map((achievement, index) => (
            <AchievementPreviewCard
              key={achievement.id}
              achievement={achievement}
              index={index}
              onPress={() => setShowModal(true)}
              locale={locale}
              isDark={isDark}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* Enhanced Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Modal Header */}
          <BlurView
            intensity={20}
            tint={isDark ? "dark" : "light"}
            style={styles.modalHeader}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderContent}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Achievements
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Track your progress and earn rewards
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.card }]}
                onPress={() => setShowModal(false)}
                activeOpacity={0.7}
              >
                <X size={22} color={colors.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </BlurView>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContentContainer}
          >
            {/* Enhanced Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statsRow}>
                <View
                  style={[styles.statCard, { backgroundColor: colors.card }]}
                >
                  <LinearGradient
                    colors={["#FFD700", "#FFA500"]}
                    style={styles.statIconContainer}
                  >
                    <Trophy size={24} color="white" strokeWidth={2.5} />
                  </LinearGradient>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {totalUnlocked}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Unlocked
                  </Text>
                </View>

                <View
                  style={[styles.statCard, { backgroundColor: colors.card }]}
                >
                  <LinearGradient
                    colors={["#9333EA", "#7E22CE"]}
                    style={styles.statIconContainer}
                  >
                    <Sparkles size={24} color="white" strokeWidth={2.5} />
                  </LinearGradient>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {totalXP}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Total XP
                  </Text>
                </View>

                <View
                  style={[styles.statCard, { backgroundColor: colors.card }]}
                >
                  <LinearGradient
                    colors={["#3B82F6", "#2563EB"]}
                    style={styles.statIconContainer}
                  >
                    <TrendingUp size={24} color="white" strokeWidth={2.5} />
                  </LinearGradient>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {completionPercentage}%
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Progress
                  </Text>
                </View>
              </View>

              {/* Rarity breakdown */}
              {rarityStats.LEGENDARY + rarityStats.EPIC + rarityStats.RARE >
                0 && (
                <View
                  style={[
                    styles.rarityBreakdown,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Text
                    style={[
                      styles.rarityBreakdownTitle,
                      { color: colors.text },
                    ]}
                  >
                    Rare Achievements
                  </Text>
                  <View style={styles.rarityList}>
                    {rarityStats.LEGENDARY > 0 && (
                      <View style={styles.rarityItem}>
                        <Gem size={16} color="#FFD700" />
                        <Text
                          style={[
                            styles.rarityItemText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {rarityStats.LEGENDARY} Legendary
                        </Text>
                      </View>
                    )}
                    {rarityStats.EPIC > 0 && (
                      <View style={styles.rarityItem}>
                        <Star size={16} color="#9333EA" />
                        <Text
                          style={[
                            styles.rarityItemText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {rarityStats.EPIC} Epic
                        </Text>
                      </View>
                    )}
                    {rarityStats.RARE > 0 && (
                      <View style={styles.rarityItem}>
                        <Medal size={16} color="#3B82F6" />
                        <Text
                          style={[
                            styles.rarityItemText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {rarityStats.RARE} Rare
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Category filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContent}
              style={styles.categoryScroll}
            >
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = selectedCategory === category.key;
                return (
                  <TouchableOpacity
                    key={category.key}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: colors.card },
                      isActive && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(category.key)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      size={18}
                      color={isActive ? "white" : colors.textSecondary}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: colors.text },
                        isActive && styles.categoryChipTextActive,
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Unlocked achievements */}
            {unlockedAchievements.length > 0 && (
              <View style={styles.achievementsSection}>
                <View style={styles.sectionTitleContainer}>
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    style={styles.sectionTitleIcon}
                  >
                    <Star size={20} color="white" strokeWidth={2.5} />
                  </LinearGradient>
                  <Text style={[styles.categoryTitle, { color: colors.text }]}>
                    Unlocked ({unlockedAchievements.length})
                  </Text>
                </View>
                <View style={styles.achievementGrid}>
                  {unlockedAchievements.map((achievement, index) => (
                    <AchievementFullCard
                      key={achievement.id}
                      achievement={achievement}
                      index={index}
                      locale={locale}
                      isDark={isDark}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Locked achievements */}
            {lockedAchievements.length > 0 && (
              <View style={styles.achievementsSection}>
                <View style={styles.sectionTitleContainer}>
                  <View
                    style={[
                      styles.sectionTitleIcon,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <Lock
                      size={20}
                      color={colors.textSecondary}
                      strokeWidth={2.5}
                    />
                  </View>
                  <Text style={[styles.categoryTitle, { color: colors.text }]}>
                    Locked ({lockedAchievements.length})
                  </Text>
                </View>
                <View style={styles.achievementGrid}>
                  {lockedAchievements.map((achievement, index) => (
                    <AchievementFullCard
                      key={achievement.id}
                      achievement={achievement}
                      index={index + unlockedAchievements.length}
                      locale={locale}
                      isDark={isDark}
                    />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  viewAllButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  viewAllGradient: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  overallProgress: {
    marginBottom: 20,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  progressPercentageText: {
    fontSize: 12,
    fontWeight: "600",
  },
  xpTotalText: {
    fontSize: 12,
    fontWeight: "600",
  },
  previewScrollContent: {
    paddingRight: 20,
    gap: 14,
  },
  previewCard: {
    width: 112,
    height: 140,
  },
  previewGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowEffect: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
  },
  previewIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  verifiedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  verifiedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "white",
    fontSize: 14,
    fontWeight: "800",
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
    color: "#000000",
  },
  rarityIndicator: {
    flexDirection: "row",
    gap: 3,
    marginTop: 8,
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  lockedProgressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  lockedProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  lockedHint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    fontWeight: "600",
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: Platform.OS === "ios" ? 12 : 8,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: "500",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    paddingBottom: 40,
  },

  // Stats
  statsContainer: {
    padding: 20,
    gap: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  rarityBreakdown: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  rarityBreakdownTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  rarityList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  rarityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rarityItemText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Categories
  categoryScroll: {
    marginBottom: 20,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryChipActive: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOpacity: 0.3,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  categoryChipTextActive: {
    color: "white",
  },

  // Achievements sections
  achievementsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  sectionTitleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  achievementGrid: {
    gap: 12,
  },

  // Full card
  fullCard: {
    width: "100%",
  },
  fullCardGradient: {
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  fullCardGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  particleContainer: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    height: 20,
    flexDirection: "row",
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
  fullCardContent: {
    flexDirection: "row",
    padding: 20,
    gap: 16,
  },
  fullCardLeft: {
    alignItems: "center",
    gap: 10,
  },
  fullIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fullCardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 10,
  },
  fullCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    flex: 1,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  xpText: {
    fontSize: 13,
    fontWeight: "800",
    color: "white",
  },
  fullCardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: "500",
  },
  unlockedInfo: {
    gap: 8,
  },
  unlockedDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
  },
  verificationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 13,
    color: "#000000",
    fontWeight: "700",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    textAlign: "right",
  },
  fullCardCheckmark: {
    position: "absolute",
    top: 12,
    right: 12,
  },
});
