import React, { useState, useMemo } from "react";
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
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withSequence,
  withTiming,
  interpolateColor,
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
        color: "#F59E0B",
        gradient: ["#FCD34D", "#F59E0B", "#D97706"] as const,
        bgGradient: ["#FFFBEB", "#FEF3C7"] as const,
        darkBgGradient: ["#422006", "#371C02"] as const,
        glow: "rgba(245, 158, 11, 0.3)",
        shadowColor: "#F59E0B",
        label: "Legendary",
        emoji: "👑",
      };
    case "EPIC":
      return {
        color: "#8B5CF6",
        gradient: ["#A78BFA", "#8B5CF6", "#7C3AED"] as const,
        bgGradient: ["#F5F3FF", "#EDE9FE"] as const,
        darkBgGradient: ["#2E1065", "#1E1040"] as const,
        glow: "rgba(139, 92, 246, 0.3)",
        shadowColor: "#8B5CF6",
        label: "Epic",
        emoji: "💎",
      };
    case "RARE":
      return {
        color: "#3B82F6",
        gradient: ["#60A5FA", "#3B82F6", "#2563EB"] as const,
        bgGradient: ["#EFF6FF", "#DBEAFE"] as const,
        darkBgGradient: ["#1E3A8A", "#1E2B52"] as const,
        glow: "rgba(59, 130, 246, 0.3)",
        shadowColor: "#3B82F6",
        label: "Rare",
        emoji: "⭐",
      };
    case "UNCOMMON":
      return {
        color: "#10B981",
        gradient: ["#34D399", "#10B981", "#059669"] as const,
        bgGradient: ["#ECFDF5", "#D1FAE5"] as const,
        darkBgGradient: ["#064E3B", "#022C22"] as const,
        glow: "rgba(16, 185, 129, 0.3)",
        shadowColor: "#10B981",
        label: "Uncommon",
        emoji: "✨",
      };
    case "COMMON":
    default:
      return {
        color: "#6B7280",
        gradient: ["#9CA3AF", "#6B7280", "#4B5563"] as const,
        bgGradient: ["#F9FAFB", "#F3F4F6"] as const,
        darkBgGradient: ["#374151", "#1F2937"] as const,
        glow: "rgba(107, 114, 128, 0.2)",
        shadowColor: "#6B7280",
        label: "Common",
        emoji: "🏅",
      };
  }
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Modern Preview Card with clean design
const AchievementPreviewCard: React.FC<{
  achievement: Achievement;
  index: number;
  onPress: () => void;
  locale?: string;
  isDark?: boolean;
}> = ({ achievement, index, onPress, locale = "en", isDark = false }) => {
  const scale = useSharedValue(1);
  const rarityConfig = getRarityConfig(achievement.rarity);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const progressPercentage = achievement.maxProgress
    ? Math.round((achievement.progress / achievement.maxProgress) * 100)
    : 0;

  return (
    <AnimatedTouchable
      entering={FadeInUp.delay(index * 40).duration(400).springify()}
      style={[styles.previewCard, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={1}
    >
      <LinearGradient
        colors={
          achievement.unlocked
            ? isDark
              ? rarityConfig.darkBgGradient
              : rarityConfig.bgGradient
            : isDark
              ? ["#1F2937", "#111827"]
              : ["#FAFAFA", "#F3F4F6"]
        }
        style={[
          styles.previewGradient,
          achievement.unlocked && {
            borderWidth: 1.5,
            borderColor: rarityConfig.color + "40",
          },
        ]}
      >
        {/* Top accent line for unlocked */}
        {achievement.unlocked && (
          <LinearGradient
            colors={rarityConfig.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.previewAccent}
          />
        )}

        {/* Icon */}
        <View
          style={[
            styles.previewIconContainer,
            {
              backgroundColor: achievement.unlocked
                ? rarityConfig.color + "20"
                : isDark
                  ? "#374151"
                  : "#E5E7EB",
            },
          ]}
        >
          {achievement.unlocked ? (
            getAchievementIcon(achievement.icon, 26, rarityConfig.color)
          ) : (
            <Lock
              size={22}
              color={isDark ? "#6B7280" : "#9CA3AF"}
              strokeWidth={2.5}
            />
          )}
        </View>

        {/* Title or Progress */}
        {achievement.unlocked ? (
          <>
            <Text
              style={[
                styles.previewTitle,
                { color: isDark ? "#FFFFFF" : "#111827" },
              ]}
              numberOfLines={2}
            >
              {getLocalizedText(achievement.title, locale)}
            </Text>

            {/* XP Badge */}
            <View
              style={[
                styles.previewXpBadge,
                { backgroundColor: rarityConfig.color + "20" },
              ]}
            >
              <Text style={[styles.previewXpText, { color: rarityConfig.color }]}>
                +{achievement.xpReward} XP
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Progress Ring Visual */}
            <View style={styles.previewProgressContainer}>
              <Text
                style={[
                  styles.previewProgressText,
                  { color: isDark ? "#9CA3AF" : "#6B7280" },
                ]}
              >
                {progressPercentage}%
              </Text>
            </View>

            {/* Progress bar */}
            <View
              style={[
                styles.lockedProgressBar,
                { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
              ]}
            >
              <LinearGradient
                colors={rarityConfig.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.lockedProgressFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
          </>
        )}
      </LinearGradient>
    </AnimatedTouchable>
  );
};

// Modern Full Card with clean design
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
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const progressPercentage = achievement.maxProgress
    ? Math.round((achievement.progress / achievement.maxProgress) * 100)
    : 0;

  return (
    <AnimatedTouchable
      entering={FadeInUp.delay(index * 40).duration(400).springify()}
      style={[styles.fullCard, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <View
        style={[
          styles.fullCardContainer,
          {
            backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
            borderWidth: achievement.unlocked ? 1.5 : 1,
            borderColor: achievement.unlocked
              ? rarityConfig.color + "30"
              : isDark
                ? "#374151"
                : "#E5E7EB",
          },
        ]}
      >
        {/* Accent line */}
        {achievement.unlocked && (
          <LinearGradient
            colors={rarityConfig.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fullCardAccent}
          />
        )}

        <View style={styles.fullCardContent}>
          {/* Icon section */}
          <View style={styles.fullCardLeft}>
            <View
              style={[
                styles.fullIconContainer,
                {
                  backgroundColor: achievement.unlocked
                    ? rarityConfig.color + "15"
                    : isDark
                      ? "#374151"
                      : "#F3F4F6",
                },
              ]}
            >
              {achievement.unlocked ? (
                getAchievementIcon(achievement.icon, 32, rarityConfig.color)
              ) : (
                <Lock
                  size={28}
                  color={isDark ? "#6B7280" : "#9CA3AF"}
                  strokeWidth={2.5}
                />
              )}
            </View>
          </View>

          {/* Info section */}
          <View style={styles.fullCardInfo}>
            {/* Title row */}
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <Text
                  style={[
                    styles.fullCardTitle,
                    {
                      color: achievement.unlocked
                        ? isDark
                          ? "#FFFFFF"
                          : "#111827"
                        : isDark
                          ? "#9CA3AF"
                          : "#6B7280",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {getLocalizedText(achievement.title, locale)}
                </Text>

                {/* Rarity badge inline */}
                {achievement.unlocked && (
                  <View
                    style={[
                      styles.rarityBadgeInline,
                      { backgroundColor: rarityConfig.color + "15" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rarityTextInline,
                        { color: rarityConfig.color },
                      ]}
                    >
                      {rarityConfig.emoji} {rarityConfig.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* XP Badge */}
              {achievement.unlocked && (
                <Animated.View entering={ZoomIn.delay(index * 40 + 150)}>
                  <LinearGradient
                    colors={rarityConfig.gradient}
                    style={styles.xpBadge}
                  >
                    <Text style={styles.xpText}>+{achievement.xpReward}</Text>
                  </LinearGradient>
                </Animated.View>
              )}
            </View>

            {/* Description */}
            <Text
              style={[
                styles.fullCardDescription,
                {
                  color: achievement.unlocked
                    ? isDark
                      ? "#9CA3AF"
                      : "#6B7280"
                    : isDark
                      ? "#4B5563"
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
                    <Calendar
                      size={12}
                      color={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                    <Text
                      style={[
                        styles.dateText,
                        { color: isDark ? "#9CA3AF" : "#6B7280" },
                      ]}
                    >
                      {new Date(achievement.unlockedDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </Text>
                  </View>
                )}

                {achievement.verified && (
                  <View style={styles.verificationRow}>
                    <CheckCircle2 size={12} color="#10B981" strokeWidth={2.5} />
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
                      { color: isDark ? "#9CA3AF" : "#6B7280" },
                    ]}
                  >
                    {achievement.progress}/{achievement.maxProgress || "?"}
                  </Text>
                  <Text
                    style={[
                      styles.progressValue,
                      { color: rarityConfig.color },
                    ]}
                  >
                    {progressPercentage}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressBarContainer,
                    {
                      backgroundColor: isDark ? "#374151" : "#E5E7EB",
                    },
                  ]}
                >
                  <LinearGradient
                    colors={rarityConfig.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercentage}%` },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
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
  const completionPercentage = achievements.length > 0
    ? Math.round((totalUnlocked / achievements.length) * 100)
    : 0;

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

  // Get recent unlocked achievements for preview
  const recentAchievements = useMemo(() => {
    const unlocked = achievements.filter((a) => a.unlocked);
    const locked = achievements.filter((a) => !a.unlocked);
    // Show unlocked first, then locked
    return [...unlocked.slice(0, 5), ...locked.slice(0, 5)];
  }, [achievements]);

  return (
    <>
      {/* Main Section */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[styles.section, { backgroundColor: colors.card }]}
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setShowModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <LinearGradient
              colors={["#F59E0B", "#D97706"]}
              style={styles.sectionIcon}
            >
              <Trophy size={22} color="white" strokeWidth={2.5} />
            </LinearGradient>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Achievements
              </Text>
              <View style={styles.statsRow}>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {totalUnlocked}/{achievements.length} unlocked
                </Text>
                <View style={styles.statsDot} />
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: "#F59E0B" },
                  ]}
                >
                  {totalXP} XP
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.viewAllButton,
              { backgroundColor: isDark ? "#374151" : "#F3F4F6" },
            ]}
          >
            <ChevronRight
              size={18}
              color={colors.textSecondary}
              strokeWidth={2.5}
            />
          </View>
        </TouchableOpacity>

        {/* Progress bar */}
        <View style={styles.overallProgress}>
          <View
            style={[
              styles.progressBarContainer,
              { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
            ]}
          >
            <LinearGradient
              colors={["#F59E0B", "#D97706"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressBarFill,
                { width: `${completionPercentage}%` },
              ]}
            />
          </View>
          <Text
            style={[
              styles.progressPercentageText,
              { color: colors.textSecondary },
            ]}
          >
            {completionPercentage}% complete
          </Text>
        </View>

        {/* Scrollable preview cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewScrollContent}
          decelerationRate="fast"
          snapToInterval={116}
        >
          {recentAchievements.map((achievement, index) => (
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

      {/* Modern Modal */}
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
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: colors.background,
                borderBottomColor: isDark ? "#374151" : "#E5E7EB",
              },
            ]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderContent}>
              <View style={styles.modalTitleContainer}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Achievements
                </Text>
                <View style={styles.modalStatsInline}>
                  <View
                    style={[
                      styles.modalStatBadge,
                      { backgroundColor: "#F59E0B15" },
                    ]}
                  >
                    <Trophy size={14} color="#F59E0B" strokeWidth={2.5} />
                    <Text style={[styles.modalStatText, { color: "#F59E0B" }]}>
                      {totalUnlocked}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.modalStatBadge,
                      { backgroundColor: "#8B5CF615" },
                    ]}
                  >
                    <Sparkles size={14} color="#8B5CF6" strokeWidth={2.5} />
                    <Text style={[styles.modalStatText, { color: "#8B5CF6" }]}>
                      {totalXP} XP
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: isDark ? "#374151" : "#F3F4F6" },
                ]}
                onPress={() => setShowModal(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContentContainer}
          >
            {/* Progress Overview */}
            <View style={styles.progressOverview}>
              <View
                style={[
                  styles.progressCard,
                  { backgroundColor: isDark ? "#1F2937" : "#FFFFFF" },
                ]}
              >
                <View style={styles.progressCardHeader}>
                  <Text
                    style={[
                      styles.progressCardTitle,
                      { color: colors.text },
                    ]}
                  >
                    Overall Progress
                  </Text>
                  <Text
                    style={[
                      styles.progressCardPercent,
                      { color: "#F59E0B" },
                    ]}
                  >
                    {completionPercentage}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressBarLarge,
                    { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
                  ]}
                >
                  <LinearGradient
                    colors={["#F59E0B", "#D97706"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFillLarge,
                      { width: `${completionPercentage}%` },
                    ]}
                  />
                </View>

                {/* Rarity breakdown inline */}
                {(rarityStats.LEGENDARY > 0 ||
                  rarityStats.EPIC > 0 ||
                  rarityStats.RARE > 0) && (
                  <View style={styles.rarityInline}>
                    {rarityStats.LEGENDARY > 0 && (
                      <View
                        style={[
                          styles.rarityPill,
                          { backgroundColor: "#F59E0B15" },
                        ]}
                      >
                        <Text style={styles.rarityEmoji}>👑</Text>
                        <Text style={[styles.rarityCount, { color: "#F59E0B" }]}>
                          {rarityStats.LEGENDARY}
                        </Text>
                      </View>
                    )}
                    {rarityStats.EPIC > 0 && (
                      <View
                        style={[
                          styles.rarityPill,
                          { backgroundColor: "#8B5CF615" },
                        ]}
                      >
                        <Text style={styles.rarityEmoji}>💎</Text>
                        <Text style={[styles.rarityCount, { color: "#8B5CF6" }]}>
                          {rarityStats.EPIC}
                        </Text>
                      </View>
                    )}
                    {rarityStats.RARE > 0 && (
                      <View
                        style={[
                          styles.rarityPill,
                          { backgroundColor: "#3B82F615" },
                        ]}
                      >
                        <Text style={styles.rarityEmoji}>⭐</Text>
                        <Text style={[styles.rarityCount, { color: "#3B82F6" }]}>
                          {rarityStats.RARE}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
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
                      {
                        backgroundColor: isActive
                          ? "#F59E0B"
                          : isDark
                            ? "#374151"
                            : "#F3F4F6",
                      },
                    ]}
                    onPress={() => setSelectedCategory(category.key)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      size={16}
                      color={isActive ? "white" : colors.textSecondary}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          color: isActive ? "white" : colors.text,
                        },
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
                  <View
                    style={[
                      styles.sectionTitleIcon,
                      { backgroundColor: "#10B98115" },
                    ]}
                  >
                    <CheckCircle2 size={18} color="#10B981" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.categoryTitle, { color: colors.text }]}>
                    Unlocked
                  </Text>
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: isDark ? "#374151" : "#F3F4F6" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {unlockedAchievements.length}
                    </Text>
                  </View>
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
                      { backgroundColor: isDark ? "#374151" : "#F3F4F6" },
                    ]}
                  >
                    <Lock
                      size={18}
                      color={colors.textSecondary}
                      strokeWidth={2.5}
                    />
                  </View>
                  <Text style={[styles.categoryTitle, { color: colors.text }]}>
                    In Progress
                  </Text>
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: isDark ? "#374151" : "#F3F4F6" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {lockedAchievements.length}
                    </Text>
                  </View>
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

            {/* Empty state */}
            {filteredAchievements.length === 0 && (
              <View style={styles.emptyState}>
                <Trophy
                  size={48}
                  color={colors.textSecondary}
                  strokeWidth={1.5}
                />
                <Text
                  style={[styles.emptyStateText, { color: colors.textSecondary }]}
                >
                  No achievements in this category
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Main Section
  section: {
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  viewAllButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  overallProgress: {
    marginBottom: 16,
  },
  progressPercentageText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },

  // Preview Cards
  previewScrollContent: {
    gap: 10,
  },
  previewCard: {
    width: 106,
    height: 130,
  },
  previewGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  previewAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  previewIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15,
  },
  previewXpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  previewXpText: {
    fontSize: 10,
    fontWeight: "700",
  },
  previewProgressContainer: {
    marginBottom: 6,
  },
  previewProgressText: {
    fontSize: 18,
    fontWeight: "800",
  },
  lockedProgressBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  lockedProgressFill: {
    height: "100%",
    borderRadius: 2,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: Platform.OS === "ios" ? 12 : 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  modalStatsInline: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  modalStatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  modalStatText: {
    fontSize: 13,
    fontWeight: "700",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    paddingBottom: 40,
  },

  // Progress Overview
  progressOverview: {
    padding: 16,
  },
  progressCard: {
    borderRadius: 16,
    padding: 16,
  },
  progressCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressCardTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  progressCardPercent: {
    fontSize: 20,
    fontWeight: "800",
  },
  progressBarLarge: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFillLarge: {
    height: "100%",
    borderRadius: 5,
  },
  rarityInline: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  rarityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  rarityEmoji: {
    fontSize: 12,
  },
  rarityCount: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Categories
  categoryScroll: {
    marginBottom: 20,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Achievements sections
  achievementsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  sectionTitleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  achievementGrid: {
    gap: 10,
  },

  // Full card
  fullCard: {
    width: "100%",
  },
  fullCardContainer: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  fullCardAccent: {
    height: 3,
  },
  fullCardContent: {
    flexDirection: "row",
    padding: 14,
    gap: 14,
  },
  fullCardLeft: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  fullCardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 8,
  },
  titleContainer: {
    flex: 1,
    gap: 4,
  },
  fullCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  rarityBadgeInline: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rarityTextInline: {
    fontSize: 10,
    fontWeight: "700",
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpText: {
    fontSize: 12,
    fontWeight: "800",
    color: "white",
  },
  fullCardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    fontWeight: "500",
  },
  unlockedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  unlockedDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "600",
  },
  verificationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "700",
  },
  progressSection: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
