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
} from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";

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
}

const getLocalizedText = (
  text: string | LocalizedString,
  locale: string = "en"
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
  color: string = "#10B981"
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
        glow: "rgba(255, 215, 0, 0.3)",
        label: "Legendary",
      };
    case "EPIC":
      return {
        color: "#9333EA",
        gradient: ["#C084FC", "#9333EA", "#7E22CE"],
        bgGradient: ["#FAF5FF", "#F3E8FF"],
        glow: "rgba(147, 51, 234, 0.3)",
        label: "Epic",
      };
    case "RARE":
      return {
        color: "#3B82F6",
        gradient: ["#60A5FA", "#3B82F6", "#2563EB"],
        bgGradient: ["#EFF6FF", "#DBEAFE"],
        glow: "rgba(59, 130, 246, 0.3)",
        label: "Rare",
      };
    case "UNCOMMON":
      return {
        color: "#10B981",
        gradient: ["#34D399", "#10B981", "#059669"],
        bgGradient: ["#ECFDF5", "#D1FAE5"],
        glow: "rgba(16, 185, 129, 0.3)",
        label: "Uncommon",
      };
    case "COMMON":
    default:
      return {
        color: "#6B7280",
        gradient: ["#9CA3AF", "#6B7280", "#4B5563"],
        bgGradient: ["#F9FAFB", "#F3F4F6"],
        glow: "rgba(107, 114, 128, 0.3)",
        label: "Common",
      };
  }
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const AchievementPreviewCard: React.FC<{
  achievement: Achievement;
  index: number;
  onPress: () => void;
  locale?: string;
}> = ({ achievement, index, onPress, locale = "en" }) => {
  const scale = useSharedValue(1);
  const rarityConfig = getRarityConfig(achievement.rarity);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
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
          colors={rarityConfig.bgGradient as any}
          style={styles.previewGradient}
        >
          {/* Glow effect for unlocked */}
          <View
            style={[styles.glowEffect, { backgroundColor: rarityConfig.glow }]}
          />

          {/* Icon */}
          <View
            style={[
              styles.previewIconContainer,
              { backgroundColor: rarityConfig.color + "20" },
            ]}
          >
            {getAchievementIcon(achievement.icon, 28, rarityConfig.color)}
          </View>

          {/* Checkmark badge */}
          <Animated.View
            entering={ZoomIn.delay(index * 60 + 200)}
            style={styles.checkmarkBadge}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.checkmarkCircle}
            >
              <Text style={styles.checkmarkText}>✓</Text>
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Text style={styles.previewTitle} numberOfLines={2}>
            {getLocalizedText(achievement.title, locale)}
          </Text>

          {/* Rarity indicator */}
          <View style={styles.rarityIndicator}>
            <View
              style={[
                styles.rarityDot,
                { backgroundColor: rarityConfig.color },
              ]}
            />
            <View
              style={[
                styles.rarityDot,
                { backgroundColor: rarityConfig.color },
              ]}
            />
            <View
              style={[
                styles.rarityDot,
                { backgroundColor: rarityConfig.color },
              ]}
            />
          </View>
        </LinearGradient>
      ) : (
        <LinearGradient
          colors={["#FAFAFA", "#F5F5F5"]}
          style={styles.previewGradient}
        >
          {/* Locked icon */}
          <View
            style={[
              styles.previewIconContainer,
              { backgroundColor: "#E5E5EA" },
            ]}
          >
            <Lock size={26} color="#9CA3AF" strokeWidth={2.5} />
          </View>

          {/* Title */}
          <Text
            style={[styles.previewTitle, { color: "#9CA3AF" }]}
            numberOfLines={2}
          >
            {achievement.progress}/{achievement.maxProgress || "?"}
          </Text>

          {/* Progress hint */}
          <Text style={styles.lockedHint}>Keep going!</Text>
        </LinearGradient>
      )}
    </AnimatedTouchable>
  );
};

const AchievementFullCard: React.FC<{
  achievement: Achievement;
  index: number;
  locale?: string;
}> = ({ achievement, index, locale = "en" }) => {
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
            ? (rarityConfig.bgGradient as any)
            : (["#FFFFFF", "#FAFAFA"] as any)
        }
        style={styles.fullCardGradient}
      >
        {achievement.unlocked && (
          <View
            style={[
              styles.fullCardGlow,
              { backgroundColor: rarityConfig.glow },
            ]}
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
                    ? rarityConfig.color + "20"
                    : "#F3F4F6",
                },
              ]}
            >
              {achievement.unlocked ? (
                getAchievementIcon(achievement.icon, 36, rarityConfig.color)
              ) : (
                <Lock size={32} color="#9CA3AF" strokeWidth={2.5} />
              )}
            </View>

            {achievement.unlocked && (
              <View
                style={[
                  styles.rarityBadge,
                  { backgroundColor: rarityConfig.color + "20" },
                ]}
              >
                <Text
                  style={[styles.rarityText, { color: rarityConfig.color }]}
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
                  { color: achievement.unlocked ? "#000000" : "#6B7280" },
                ]}
                numberOfLines={2}
              >
                {getLocalizedText(achievement.title, locale)}
              </Text>

              {achievement.unlocked && (
                <Animated.View entering={ZoomIn.delay(index * 50 + 200)}>
                  <LinearGradient
                    colors={rarityConfig.gradient as any}
                    style={styles.xpBadge}
                  >
                    <Sparkles size={14} color="white" strokeWidth={2.5} />
                    <Text style={styles.xpText}>+{achievement.xpReward}</Text>
                  </LinearGradient>
                </Animated.View>
              )}
            </View>

            <Text
              style={[
                styles.fullCardDescription,
                { color: achievement.unlocked ? "#4B5563" : "#9CA3AF" },
              ]}
              numberOfLines={2}
            >
              {getLocalizedText(achievement.description, locale)}
            </Text>

            {/* Progress or date */}
            {achievement.unlocked ? (
              achievement.unlockedDate && (
                <View style={styles.unlockedDateRow}>
                  <Calendar size={14} color="#10B981" />
                  <Text style={styles.dateText}>
                    Unlocked{" "}
                    {new Date(achievement.unlockedDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Progress</Text>
                  <Text style={styles.progressValue}>
                    {achievement.progress}/{achievement.maxProgress || "?"}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
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
              </View>
            )}
          </View>
        </View>

        {achievement.unlocked && (
          <View style={styles.fullCardCheckmark}>
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.checkmarkCircle}
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
  const { colors } = useTheme();

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
      (achievement) => achievement.category === selectedCategory
    );
  }, [achievements, selectedCategory]);

  const unlockedAchievements = useMemo(
    () => filteredAchievements.filter((a) => a.unlocked),
    [filteredAchievements]
  );

  const lockedAchievements = useMemo(
    () => filteredAchievements.filter((a) => !a.unlocked),
    [filteredAchievements]
  );

  const totalUnlocked = achievements.filter((a) => a.unlocked).length;
  const totalXP = achievements.reduce(
    (sum, a) => sum + (a.unlocked ? a.xpReward : 0),
    0
  );
  const completionPercentage = Math.round(
    (totalUnlocked / achievements.length) * 100
  );

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
              colors={["#FFD700", "#FFA500"]}
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
                {totalUnlocked} of {achievements.length} unlocked
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => setShowModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={16} color="white" strokeWidth={3} />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.overallProgress}>
          <View style={styles.progressBarContainer}>
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
          <Text
            style={[
              styles.progressPercentageText,
              { color: colors.textSecondary },
            ]}
          >
            {completionPercentage}% Complete
          </Text>
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
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* Modal */}
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
          <BlurView intensity={20} tint="light" style={styles.modalHeader}>
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
            {/* Stats Cards */}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
  overallProgress: {
    marginBottom: 20,
  },
  progressPercentageText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
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
    height: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  previewIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  checkmarkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
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
    width: 5,
    height: 5,
    borderRadius: 2.5,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
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
  },
  fullCardGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
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
  unlockedDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "600",
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
  fullCardCheckmark: {
    position: "absolute",
    top: 12,
    right: 12,
  },
});
