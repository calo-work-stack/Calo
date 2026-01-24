import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Brain,
  Lightbulb,
  Target,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  X,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Sparkles,
  Zap,
  Award,
  Activity,
} from "lucide-react-native";
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import { t } from "i18next";

const { width } = Dimensions.get("window");

interface AIRecommendation {
  id: string;
  date: string;
  recommendations: any;
  priority_level: "low" | "medium" | "high";
  confidence_score: number;
  is_read: boolean;
  created_at: string;
  based_on?: any;
  user_id?: string;
}

interface AIRecommendationsSectionProps {
  recommendations?: AIRecommendation[];
  period?: "today" | "week" | "month";
}

interface ExtractedRecommendations {
  nutrition_tips: string[];
  meal_suggestions: string[];
  goal_adjustments: string[];
  behavioral_insights: string[];
}

// Utility functions
const getPriorityConfig = (priority: string, colors: any) => {
  switch (priority) {
    case "high":
      return {
        colors: [colors.error, "#EE5A6F"],
        accentColor: colors.error,
        icon: AlertCircle,
        label: "High Priority",
        bgColor: `${colors.error}14`,
      };
    case "medium":
      return {
        colors: [colors.warning, "#FFA726"],
        accentColor: colors.warning,
        icon: Info,
        label: "Medium Priority",
        bgColor: `${colors.warning}14`,
      };
    case "low":
      return {
        colors: [colors.success, "#40C057"],
        accentColor: colors.success,
        icon: CheckCircle,
        label: "Low Priority",
        bgColor: `${colors.success}14`,
      };
    default:
      return {
        colors: [colors.textSecondary, colors.muted],
        accentColor: colors.textSecondary,
        icon: Info,
        label: "Normal",
        bgColor: `${colors.textSecondary}14`,
      };
  }
};

const getCategoryConfig = (type: string, colors: any) => {
  const configs: Record<string, any> = {
    nutrition_tips: {
      icon: Lightbulb,
      gradient: [colors.primary, colors.emerald600],
      title: "Nutrition Tips",
      color: colors.primary,
    },
    meal_suggestions: {
      icon: Target,
      gradient: ["#8B5CF6", "#7C3AED"],
      title: "Meal Suggestions",
      color: "#8B5CF6",
    },
    goal_adjustments: {
      icon: TrendingUp,
      gradient: [colors.info, "#2563EB"],
      title: "Goal Adjustments",
      color: colors.info,
    },
    behavioral_insights: {
      icon: Brain,
      gradient: ["#EC4899", "#DB2777"],
      title: "Behavioral Insights",
      color: "#EC4899",
    },
  };
  return configs[type] || configs.nutrition_tips;
};

const extractRecommendationsData = (recData: any): ExtractedRecommendations => {
  if (!recData) {
    return {
      nutrition_tips: [],
      meal_suggestions: [],
      goal_adjustments: [],
      behavioral_insights: [],
    };
  }

  let extractedData: ExtractedRecommendations = {
    nutrition_tips: [],
    meal_suggestions: [],
    goal_adjustments: [],
    behavioral_insights: [],
  };

  if (
    recData.nutrition_tips ||
    recData.meal_suggestions ||
    recData.goal_adjustments ||
    recData.behavioral_insights
  ) {
    extractedData = {
      nutrition_tips: Array.isArray(recData.nutrition_tips)
        ? recData.nutrition_tips
        : [],
      meal_suggestions: Array.isArray(recData.meal_suggestions)
        ? recData.meal_suggestions
        : [],
      goal_adjustments: Array.isArray(recData.goal_adjustments)
        ? recData.goal_adjustments
        : [],
      behavioral_insights: Array.isArray(recData.behavioral_insights)
        ? recData.behavioral_insights
        : [],
    };
    return extractedData;
  }

  if (recData.data && typeof recData.data === "object") {
    return extractRecommendationsData(recData.data);
  }

  if (Array.isArray(recData) && recData.length > 0) {
    const stringItems = recData.filter(
      (item) => typeof item === "string" && item.trim().length > 5,
    );
    if (stringItems.length > 0) {
      const quarter = Math.ceil(stringItems.length / 4);
      extractedData = {
        nutrition_tips: stringItems.slice(0, quarter),
        meal_suggestions: stringItems.slice(quarter, quarter * 2),
        goal_adjustments: stringItems.slice(quarter * 2, quarter * 3),
        behavioral_insights: stringItems.slice(quarter * 3),
      };
      return extractedData;
    }
  }

  if (typeof recData === "object" && !Array.isArray(recData)) {
    Object.entries(recData).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        const stringValues = value.filter(
          (item) => typeof item === "string" && item.trim().length > 5,
        );
        if (stringValues.length > 0) {
          const lowerKey = key.toLowerCase();

          if (
            lowerKey.includes("nutrition") ||
            lowerKey.includes("food") ||
            lowerKey.includes("diet")
          ) {
            extractedData.nutrition_tips.push(...stringValues);
          } else if (lowerKey.includes("meal") || lowerKey.includes("recipe")) {
            extractedData.meal_suggestions.push(...stringValues);
          } else if (lowerKey.includes("goal") || lowerKey.includes("target")) {
            extractedData.goal_adjustments.push(...stringValues);
          } else if (
            lowerKey.includes("behavior") ||
            lowerKey.includes("insight")
          ) {
            extractedData.behavioral_insights.push(...stringValues);
          } else {
            const contentCheck = stringValues[0]?.toLowerCase() || "";
            if (
              contentCheck.includes("eat") ||
              contentCheck.includes("protein")
            ) {
              extractedData.nutrition_tips.push(...stringValues);
            } else if (contentCheck.includes("meal")) {
              extractedData.meal_suggestions.push(...stringValues);
            } else if (contentCheck.includes("goal")) {
              extractedData.goal_adjustments.push(...stringValues);
            } else {
              extractedData.behavioral_insights.push(...stringValues);
            }
          }
        }
      }
    });
  }

  return extractedData;
};

// Carousel Card Component
const CarouselCard = ({
  recommendation,
  onPress,
  colors,
}: {
  recommendation: AIRecommendation;
  onPress: () => void;
  colors: any;
}) => {
  const priorityConfig = getPriorityConfig(
    recommendation.priority_level,
    colors,
  );
  const extractedRecs = extractRecommendationsData(
    recommendation.recommendations,
  );
  const allInsights = [
    ...extractedRecs.nutrition_tips,
    ...extractedRecs.meal_suggestions,
    ...extractedRecs.goal_adjustments,
    ...extractedRecs.behavioral_insights,
  ].filter(Boolean);

  const recDate = new Date(recommendation.date);
  const confidence = Math.round((recommendation.confidence_score || 0) * 100);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={styles.carouselCard}
    >
      <LinearGradient
        colors={[colors.card, colors.surface]}
        style={styles.carouselCardGradient}
      >
        {/* Top Accent Line */}
        <View style={styles.accentLine} />

        {/* Header with Avatar */}
        <View style={styles.carouselHeader}>
          <View style={styles.avatarSection}>
            <LinearGradient
              colors={[colors.primary, colors.emerald600]}
              style={styles.avatarCircle}
            >
              <Brain size={24} color={colors.onPrimary} />
            </LinearGradient>
            <View style={styles.avatarInfo}>
              <Text style={[styles.avatarTitle, { color: colors.text }]}>
                AI Assistant
              </Text>
              <Text
                style={[styles.avatarSubtitle, { color: colors.textSecondary }]}
              >
                Personal Insights
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: priorityConfig.bgColor },
            ]}
          >
            <priorityConfig.icon size={12} color={priorityConfig.accentColor} />
            <Text
              style={[
                styles.priorityBadgeText,
                { color: priorityConfig.accentColor },
              ]}
            >
              {recommendation.priority_level.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Quote Section */}
        <View style={styles.quoteSection}>
          <Text style={[styles.quoteMarks, { color: colors.primary }]}>"</Text>
          <Text
            style={[styles.quoteText, { color: colors.text }]}
            numberOfLines={3}
          >
            {allInsights[0] || "Getting to know your patterns..."}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {allInsights.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Insights
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: colors.border }]}
          />

          <View style={styles.statItem}>
            <Star size={14} color={colors.warning} fill={colors.warning} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {confidence}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Confidence
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: colors.border }]}
          />

          <View style={styles.statItem}>
            <Clock size={14} color={colors.textTertiary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {recDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Date
            </Text>
          </View>
        </View>

        {/* View Details Button */}
        <TouchableOpacity
          style={[
            styles.viewDetailsButton,
            { backgroundColor: `${colors.primary}1A` },
          ]}
          onPress={onPress}
        >
          <Text style={[styles.viewDetailsText, { color: colors.primary }]}>
            View Full Analysis
          </Text>
          <ChevronRight size={16} color={colors.primary} />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Empty State Component
const EmptyState = ({ colors }: { colors: any }) => (
  <Animated.View entering={FadeIn} style={styles.emptyContainer}>
    <LinearGradient
      colors={[`${colors.primary}0D`, `${colors.primary}05`]}
      style={styles.emptyGradient}
    >
      <View style={styles.emptyIconWrapper}>
        <LinearGradient
          colors={[colors.primary, colors.emerald600]}
          style={styles.emptyIcon}
        >
          <Brain size={40} color={colors.onPrimary} />
        </LinearGradient>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        AI Learning Your Patterns
      </Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Keep logging your meals and activities.{"\n"}
        Personalized insights coming soon!
      </Text>
      <View style={styles.emptyProgressDots}>
        <View
          style={[
            styles.progressDot,
            styles.progressDotActive,
            { backgroundColor: colors.primary },
          ]}
        />
        <View
          style={[
            styles.progressDot,
            styles.progressDotActive,
            { backgroundColor: colors.primary },
          ]}
        />
        <View
          style={[styles.progressDot, { backgroundColor: colors.border }]}
        />
        <View
          style={[styles.progressDot, { backgroundColor: colors.border }]}
        />
      </View>
    </LinearGradient>
  </Animated.View>
);

// Detail Modal Component
const DetailModal = ({
  visible,
  recommendation,
  onClose,
  colors,
}: {
  visible: boolean;
  recommendation: AIRecommendation | null;
  onClose: () => void;
  colors: any;
}) => {
  if (!recommendation) return null;

  const extractedRecs = extractRecommendationsData(
    recommendation.recommendations,
  );
  const priorityConfig = getPriorityConfig(
    recommendation.priority_level,
    colors,
  );
  const recDate = new Date(recommendation.date);
  const confidence = Math.round((recommendation.confidence_score || 0) * 100);

  const categories = [
    {
      key: "nutrition_tips",
      items: extractedRecs.nutrition_tips,
      config: getCategoryConfig("nutrition_tips", colors),
    },
    {
      key: "meal_suggestions",
      items: extractedRecs.meal_suggestions,
      config: getCategoryConfig("meal_suggestions", colors),
    },
    {
      key: "goal_adjustments",
      items: extractedRecs.goal_adjustments,
      config: getCategoryConfig("goal_adjustments", colors),
    },
    {
      key: "behavioral_insights",
      items: extractedRecs.behavioral_insights,
      config: getCategoryConfig("behavioral_insights", colors),
    },
  ].filter((cat) => cat.items.length > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View
              style={[
                styles.closeButtonInner,
                { backgroundColor: colors.card },
              ]}
            >
              <X size={20} color={colors.text} />
            </View>
          </TouchableOpacity>

          <View style={styles.modalHeaderContent}>
            <View style={styles.modalDateBadge}>
              <Text style={[styles.modalDateDay, { color: colors.text }]}>
                {recDate.getDate()}
              </Text>

              <Text style={[styles.modalDateMonth, { color: colors.text }]}>
                {t("common.date.monthShort", {
                  month: recDate.getMonth(),
                })}
              </Text>
            </View>

            <View style={styles.modalMetricsRow}>
              <View style={styles.modalMetric}>
                <Award size={18} color={colors.text} />
                <Text style={[styles.modalMetricLabel, { color: colors.text }]}>
                  {t("common.metrics.priority.label")}
                </Text>
                <Text style={[styles.modalMetricValue, { color: colors.text }]}>
                  {t(`common.metrics.priority.level.${recommendation.priority_level}`)}
                </Text>
              </View>

              <View style={styles.modalMetricDivider} />

              <View style={styles.modalMetric}>
                <Activity size={18} color={colors.text} />
                <Text style={[styles.modalMetricLabel, { color: colors.text }]}>
                  {t("common.metrics.confidence.label")}
                </Text>
                <Text style={[styles.modalMetricValue, { color: colors.text }]}>
                  {t("common.metrics.confidence.value", {
                    value: confidence,
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>
        {/* Categories */}
        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          {categories.map((category, index) => (
            <Animated.View
              key={category.key}
              entering={FadeInUp.delay(index * 100)}
              style={[styles.categoryCard, { backgroundColor: colors.card }]}
            >
              <View
                style={[
                  styles.categoryHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <LinearGradient
                  colors={category.config.gradient}
                  style={styles.categoryIconContainer}
                >
                  <category.config.icon size={20} color="white" />
                </LinearGradient>
                <View style={styles.categoryTitleContainer}>
                  <Text style={[styles.categoryTitle, { color: colors.text }]}>
                    {category.config.title}
                  </Text>
                  <Text
                    style={[
                      styles.categoryCount,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {category.items.length}{" "}
                    {category.items.length === 1 ? "insight" : "insights"}
                  </Text>
                </View>
              </View>

              <View style={styles.categoryItems}>
                {category.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.categoryItem}>
                    <View
                      style={[
                        styles.itemNumber,
                        { backgroundColor: `${category.config.color}15` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.itemNumberText,
                          { color: category.config.color },
                        ]}
                      >
                        {itemIndex + 1}
                      </Text>
                    </View>
                    <Text style={[styles.itemText, { color: colors.text }]}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Main Component
export const AIRecommendationsSection: React.FC<
  AIRecommendationsSectionProps
> = ({ recommendations = [], period = "month" }) => {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<AIRecommendation | null>(null);

  const filteredRecommendations = useMemo(() => {
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return [];
    }

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const filterDate = new Date();

    switch (period) {
      case "today":
        filterDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        filterDate.setDate(now.getDate() - 7);
        filterDate.setHours(0, 0, 0, 0);
        break;
      case "month":
      default:
        filterDate.setDate(now.getDate() - 30);
        filterDate.setHours(0, 0, 0, 0);
        break;
    }

    const filtered = recommendations
      .filter((rec) => {
        if (!rec || !rec.date) return false;
        const recDate = new Date(rec.date);
        recDate.setHours(0, 0, 0, 0);
        return recDate >= filterDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filtered;
  }, [recommendations, period]);

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev < filteredRecommendations.length - 1 ? prev + 1 : prev,
    );
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  if (filteredRecommendations.length === 0) {
    return <EmptyState colors={colors} />;
  }

  const currentRecommendation = filteredRecommendations[currentIndex];

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <Animated.View entering={FadeInUp} style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={[colors.primary, colors.emerald600]}
            style={styles.headerIcon}
          >
            <Sparkles size={20} color={colors.onPrimary} />
          </LinearGradient>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              AI Insights
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
            >
              {filteredRecommendations.length} personalized recommendations
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Carousel */}
      <View style={styles.carouselContainer}>
        <CarouselCard
          recommendation={currentRecommendation}
          onPress={() => setSelectedRecommendation(currentRecommendation)}
          colors={colors}
        />

        {/* Navigation */}
        {filteredRecommendations.length > 1 && (
          <View style={styles.navigation}>
            <TouchableOpacity
              onPress={handlePrev}
              disabled={currentIndex === 0}
              style={[
                styles.navButton,
                { backgroundColor: colors.card },
                currentIndex === 0 && styles.navButtonDisabled,
              ]}
            >
              <ChevronLeft
                size={20}
                color={currentIndex === 0 ? colors.muted : colors.primary}
              />
            </TouchableOpacity>

            <View style={styles.pagination}>
              {filteredRecommendations.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    { backgroundColor: colors.muted },
                    index === currentIndex && [
                      styles.paginationDotActive,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleNext}
              disabled={currentIndex === filteredRecommendations.length - 1}
              style={[
                styles.navButton,
                { backgroundColor: colors.card },
                currentIndex === filteredRecommendations.length - 1 &&
                  styles.navButtonDisabled,
              ]}
            >
              <ChevronRight
                size={20}
                color={
                  currentIndex === filteredRecommendations.length - 1
                    ? colors.muted
                    : colors.primary
                }
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Detail Modal */}
      <DetailModal
        visible={!!selectedRecommendation}
        recommendation={selectedRecommendation}
        onClose={() => setSelectedRecommendation(null)}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  carouselContainer: {},
  carouselCard: {
    borderRadius: 24,
    overflow: "hidden",
  },
  carouselCardGradient: {
    padding: 24,
  },
  accentLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  carouselHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInfo: {
    gap: 2,
  },
  avatarTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  avatarSubtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  quoteSection: {
    marginBottom: 24,
    paddingLeft: 4,
  },
  quoteMarks: {
    fontSize: 48,
    fontWeight: "700",
    lineHeight: 48,
    marginBottom: -8,
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "700",
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  pagination: {
    flexDirection: "row",
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paginationDotActive: {
    width: 20,
  },
  emptyContainer: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: "hidden",
  },
  emptyGradient: {
    padding: 48,
    alignItems: "center",
  },
  emptyIconWrapper: {
    marginBottom: 24,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyProgressDots: {
    flexDirection: "row",
    gap: 8,
  },
  progressDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  progressDotActive: {},
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderContent: {
    alignItems: "center",
    gap: 20,
  },
  modalDateBadge: {
    alignItems: "center",
  },
  modalDateDay: {
    fontSize: 48,
    fontWeight: "700",
    color: "white",
    lineHeight: 52,
  },
  modalDateMonth: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 1,
  },
  modalMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  modalMetric: {
    alignItems: "center",
    gap: 6,
  },
  modalMetricLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalMetricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  modalMetricDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  modalContent: {
    flex: 1,
  },

  // Category Cards
  categoryCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 20,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitleContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  categoryItems: {
    gap: 16,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  itemNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  itemNumberText: {
    fontSize: 13,
    fontWeight: "700",
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
    fontWeight: "500",
  },
});
