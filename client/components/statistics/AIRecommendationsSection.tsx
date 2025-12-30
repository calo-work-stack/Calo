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
  SlideInRight,
  BounceIn,
} from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";

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
  period?: "today" | "week" | "month"; // Made optional with default fallback
  colors: {
    primary: string;
    surface: string;
    background: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    card: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    emerald400: string;
    emerald500: string;
    emerald600: string;
    emerald700: string;
    muted: string;
  };
}

interface ExtractedRecommendations {
  nutrition_tips: string[];
  meal_suggestions: string[];
  goal_adjustments: string[];
  behavioral_insights: string[];
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const getPriorityConfig = (priority: string, colors: any) => {
  switch (priority) {
    case "high":
      return {
        colors: ["#FF6B6B", "#EE5A6F", "#C92A2A"],
        accentColor: "#FF6B6B",
        icon: AlertCircle,
        label: "High Priority",
        glow: "rgba(255, 107, 107, 0.25)",
      };
    case "medium":
      return {
        colors: ["#FFB84D", "#FFA726", "#F57C00"],
        accentColor: "#FFB84D",
        icon: Info,
        label: "Medium Priority",
        glow: "rgba(255, 184, 77, 0.25)",
      };
    case "low":
      return {
        colors: ["#51CF66", "#40C057", "#2F9E44"],
        accentColor: "#51CF66",
        icon: CheckCircle,
        label: "Low Priority",
        glow: "rgba(81, 207, 102, 0.25)",
      };
    default:
      return {
        colors: [colors.textSecondary, colors.muted, colors.textTertiary],
        accentColor: colors.textSecondary,
        icon: Info,
        label: "Normal",
        glow: "rgba(128, 128, 128, 0.25)",
      };
  }
};

const getCategoryConfig = (type: string, colors: any) => {
  const configs: Record<string, any> = {
    nutrition_tips: {
      icon: Lightbulb,
      gradient: ["#10B981", "#059669"],
      title: "Nutrition Tips",
      color: "#10B981",
    },
    meal_suggestions: {
      icon: Target,
      gradient: ["#8B5CF6", "#7C3AED"],
      title: "Meal Suggestions",
      color: "#8B5CF6",
    },
    goal_adjustments: {
      icon: TrendingUp,
      gradient: ["#3B82F6", "#2563EB"],
      title: "Goal Adjustments",
      color: "#3B82F6",
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
  console.log("Extracting recommendations from:", recData);

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

  // Handle if recData is already in the correct format
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
    console.log("Direct format found:", extractedData);
    return extractedData;
  }

  // Check for nested data property
  if (recData.data && typeof recData.data === "object") {
    console.log("Found nested data property, recursing...");
    return extractRecommendationsData(recData.data);
  }

  // If recData is an array of strings
  if (Array.isArray(recData) && recData.length > 0) {
    console.log("Array format detected with", recData.length, "items");
    const stringItems = recData.filter(
      (item) => typeof item === "string" && item.trim().length > 5
    );
    if (stringItems.length > 0) {
      const quarter = Math.ceil(stringItems.length / 4);
      extractedData = {
        nutrition_tips: stringItems.slice(0, quarter),
        meal_suggestions: stringItems.slice(quarter, quarter * 2),
        goal_adjustments: stringItems.slice(quarter * 2, quarter * 3),
        behavioral_insights: stringItems.slice(quarter * 3),
      };
      console.log("Array distributed:", extractedData);
      return extractedData;
    }
  }

  // Scan all object keys and categorize arrays
  if (typeof recData === "object" && !Array.isArray(recData)) {
    console.log("Scanning object keys:", Object.keys(recData));

    Object.entries(recData).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        const stringValues = value.filter(
          (item) => typeof item === "string" && item.trim().length > 5
        );
        if (stringValues.length > 0) {
          const lowerKey = key.toLowerCase();
          console.log(
            `Found array in key "${key}" with ${stringValues.length} items`
          );

          if (
            lowerKey.includes("nutrition") ||
            lowerKey.includes("food") ||
            lowerKey.includes("diet") ||
            lowerKey.includes("vitamin") ||
            lowerKey.includes("nutrient")
          ) {
            extractedData.nutrition_tips.push(...stringValues);
          } else if (
            lowerKey.includes("meal") ||
            lowerKey.includes("recipe") ||
            lowerKey.includes("dish") ||
            lowerKey.includes("breakfast") ||
            lowerKey.includes("lunch") ||
            lowerKey.includes("dinner")
          ) {
            extractedData.meal_suggestions.push(...stringValues);
          } else if (
            lowerKey.includes("goal") ||
            lowerKey.includes("target") ||
            lowerKey.includes("objective") ||
            lowerKey.includes("adjust") ||
            lowerKey.includes("change")
          ) {
            extractedData.goal_adjustments.push(...stringValues);
          } else if (
            lowerKey.includes("behavior") ||
            lowerKey.includes("insight") ||
            lowerKey.includes("analysis") ||
            lowerKey.includes("pattern") ||
            lowerKey.includes("trend")
          ) {
            extractedData.behavioral_insights.push(...stringValues);
          } else {
            // For generic keys, try to infer from content
            const contentCheck = stringValues[0]?.toLowerCase() || "";
            if (
              contentCheck.includes("eat") ||
              contentCheck.includes("protein") ||
              contentCheck.includes("calorie") ||
              contentCheck.includes("vitamin")
            ) {
              extractedData.nutrition_tips.push(...stringValues);
            } else if (
              contentCheck.includes("meal") ||
              contentCheck.includes("breakfast") ||
              contentCheck.includes("try")
            ) {
              extractedData.meal_suggestions.push(...stringValues);
            } else if (
              contentCheck.includes("goal") ||
              contentCheck.includes("increase") ||
              contentCheck.includes("decrease") ||
              contentCheck.includes("adjust")
            ) {
              extractedData.goal_adjustments.push(...stringValues);
            } else {
              extractedData.behavioral_insights.push(...stringValues);
            }
          }
        }
      }
    });
  }

  // Last resort: deep string extraction
  const totalItems =
    extractedData.nutrition_tips.length +
    extractedData.meal_suggestions.length +
    extractedData.goal_adjustments.length +
    extractedData.behavioral_insights.length;

  if (totalItems === 0 && recData && typeof recData === "object") {
    console.log(
      "No categorized data found, performing deep string extraction..."
    );
    const allStrings: string[] = [];

    const extractStrings = (obj: any, depth = 0) => {
      if (depth > 10) return; // Prevent infinite recursion

      if (typeof obj === "string" && obj.trim().length > 10) {
        allStrings.push(obj.trim());
      } else if (Array.isArray(obj)) {
        obj.forEach((item) => extractStrings(item, depth + 1));
      } else if (typeof obj === "object" && obj !== null) {
        Object.values(obj).forEach((value) => extractStrings(value, depth + 1));
      }
    };

    extractStrings(recData);
    console.log("Extracted", allStrings.length, "strings from deep search");

    if (allStrings.length > 0) {
      const quarter = Math.ceil(allStrings.length / 4);
      extractedData = {
        nutrition_tips: allStrings.slice(0, quarter),
        meal_suggestions: allStrings.slice(quarter, quarter * 2),
        goal_adjustments: allStrings.slice(quarter * 2, quarter * 3),
        behavioral_insights: allStrings.slice(quarter * 3),
      };
    }
  }

  console.log("Final extracted data:", {
    nutrition_tips: extractedData.nutrition_tips.length,
    meal_suggestions: extractedData.meal_suggestions.length,
    goal_adjustments: extractedData.goal_adjustments.length,
    behavioral_insights: extractedData.behavioral_insights.length,
  });

  return extractedData;
};

export const AIRecommendationsSection: React.FC<
  AIRecommendationsSectionProps
> = ({
  recommendations = [],
  period = "month", // Default to month if not provided
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<AIRecommendation | null>(null);
  const { colors } = useTheme();

  const filteredRecommendations = useMemo(() => {
    console.log("=== AIRecommendationsSection: Processing Recommendations ===");
    console.log("Input recommendations:", recommendations);
    console.log("Period:", period);

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      console.log("Recommendations is not an array or empty, returning empty");
      return [];
    }

    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today
    const filterDate = new Date();

    // Set filter date based on period
    switch (period) {
      case "today":
        filterDate.setHours(0, 0, 0, 0);
        console.log("Filtering for today since:", filterDate.toISOString());
        break;
      case "week":
        filterDate.setDate(now.getDate() - 7);
        filterDate.setHours(0, 0, 0, 0);
        console.log(
          "Filtering for last 7 days since:",
          filterDate.toISOString()
        );
        break;
      case "month":
      default:
        filterDate.setDate(now.getDate() - 30);
        filterDate.setHours(0, 0, 0, 0);
        console.log(
          "Filtering for last 30 days since:",
          filterDate.toISOString()
        );
        break;
    }

    const filtered = recommendations
      .filter((rec) => {
        if (!rec || !rec.date) {
          console.log("Invalid recommendation, skipping:", rec);
          return false;
        }
        const recDate = new Date(rec.date);
        recDate.setHours(0, 0, 0, 0); // Normalize to start of day
        const passes = recDate >= filterDate;
        console.log(
          `Recommendation ${rec.id}: date=${
            rec.date
          } (${recDate.toISOString()}), filterDate=${filterDate.toISOString()}, passes=${passes}`
        );
        return passes;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(
      `Filtered ${filtered.length} recommendations out of ${recommendations.length}`
    );
    if (filtered.length > 0) {
      console.log("First recommendation structure:", filtered[0]);
      console.log(
        "First recommendation.recommendations:",
        filtered[0].recommendations
      );
    }

    return filtered;
  }, [recommendations, period]);

  const latestRecommendation = filteredRecommendations[0];

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={["rgba(16, 185, 129, 0.1)", "rgba(16, 185, 129, 0.05)"]}
        style={styles.emptyGradient}
      >
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={["#10B981", "#059669"]}
            style={styles.emptyIconGradient}
          >
            <Brain size={32} color="white" />
          </LinearGradient>
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          AI Learning Your Patterns
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Keep logging your meals and activities.{"\n"}
          Personalized insights coming soon!
        </Text>
      </LinearGradient>
    </View>
  );

  const renderPreviewCard = () => {
    console.log("=== renderPreviewCard ===");
    console.log("latestRecommendation:", latestRecommendation);

    if (!latestRecommendation) {
      return renderEmptyState();
    }

    const priorityConfig = getPriorityConfig(
      latestRecommendation.priority_level,
      colors
    );

    console.log(
      "Calling extractRecommendationsData with:",
      latestRecommendation.recommendations
    );
    const extractedRecs = extractRecommendationsData(
      latestRecommendation.recommendations
    );
    console.log("Extracted recommendations:", extractedRecs);

    const allInsights = [
      ...extractedRecs.nutrition_tips,
      ...extractedRecs.meal_suggestions,
      ...extractedRecs.goal_adjustments,
      ...extractedRecs.behavioral_insights,
    ].filter(Boolean);

    console.log("All insights combined:", allInsights);
    console.log("Total insights count:", allInsights.length);

    const recDate = new Date(latestRecommendation.date);
    const confidence = Math.round(
      (latestRecommendation.confidence_score || 0) * 100
    );

    return (
      <AnimatedTouchableOpacity
        entering={FadeInUp.delay(100)}
        onPress={() => setShowModal(true)}
        activeOpacity={0.92}
      >
        <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
          {/* Glow effect */}
          <View
            style={[
              styles.previewGlow,
              { backgroundColor: priorityConfig.glow },
            ]}
          />

          {/* Header */}
          <View style={styles.previewHeader}>
            <View style={styles.previewHeaderLeft}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.previewAiIcon}
              >
                <Sparkles size={16} color="white" />
              </LinearGradient>
              <View>
                <Text style={[styles.previewTitle, { color: colors.text }]}>
                  AI Insights
                </Text>
                <Text
                  style={[
                    styles.previewSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {recDate.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.previewMetrics}>
              <View
                style={[
                  styles.priorityPill,
                  { backgroundColor: priorityConfig.accentColor + "20" },
                ]}
              >
                <priorityConfig.icon
                  size={12}
                  color={priorityConfig.accentColor}
                />
                <Text
                  style={[
                    styles.priorityText,
                    { color: priorityConfig.accentColor },
                  ]}
                >
                  {priorityConfig.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Confidence Bar */}
          <View style={styles.confidenceSection}>
            <View style={styles.confidenceBar}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.confidenceFill, { width: `${confidence}%` }]}
              />
            </View>
            <View style={styles.confidenceLabel}>
              <Star size={12} color="#10B981" fill="#10B981" />
              <Text
                style={[styles.confidenceText, { color: colors.textSecondary }]}
              >
                {confidence}% Confidence
              </Text>
            </View>
          </View>

          {/* Insights Preview */}
          <View style={styles.insightsPreview}>
            {allInsights.slice(0, 2).map((insight, index) => (
              <View key={index} style={styles.insightRow}>
                <View style={styles.insightDot}>
                  <View
                    style={[
                      styles.insightDotInner,
                      { backgroundColor: "#10B981" },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.insightText, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {insight}
                </Text>
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.previewFooter}>
            <View style={styles.insightCount}>
              <Text style={[styles.insightCountNumber, { color: "#10B981" }]}>
                {allInsights.length}
              </Text>
              <Text
                style={[
                  styles.insightCountLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Total Insights
              </Text>
            </View>

            <View style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color="white" />
            </View>
          </View>
        </View>
      </AnimatedTouchableOpacity>
    );
  };

  const renderRecommendationsList = () => (
    <ScrollView
      style={styles.listContainer}
      showsVerticalScrollIndicator={false}
    >
      {filteredRecommendations.map((recommendation, index) => {
        const priorityConfig = getPriorityConfig(
          recommendation.priority_level,
          colors
        );
        const extractedRecs = extractRecommendationsData(
          recommendation.recommendations
        );
        const allInsights = [
          ...extractedRecs.nutrition_tips,
          ...extractedRecs.meal_suggestions,
          ...extractedRecs.goal_adjustments,
          ...extractedRecs.behavioral_insights,
        ].filter(Boolean);

        const recDate = new Date(recommendation.date);
        const confidence = Math.round(
          (recommendation.confidence_score || 0) * 100
        );

        return (
          <AnimatedTouchableOpacity
            key={recommendation.id}
            entering={FadeInDown.delay(index * 100)}
            onPress={() => setSelectedRecommendation(recommendation)}
            activeOpacity={0.92}
          >
            <View style={[styles.listCard, { backgroundColor: colors.card }]}>
              {/* Card Header */}
              <View style={styles.listCardHeader}>
                <View style={styles.listCardDate}>
                  <Text style={[styles.listCardDay, { color: colors.text }]}>
                    {recDate.getDate()}
                  </Text>
                  <Text
                    style={[
                      styles.listCardMonth,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {recDate
                      .toLocaleDateString(undefined, { month: "short" })
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.listCardMeta}>
                  <View
                    style={[
                      styles.listPriorityBadge,
                      { backgroundColor: priorityConfig.accentColor + "20" },
                    ]}
                  >
                    <priorityConfig.icon
                      size={14}
                      color={priorityConfig.accentColor}
                    />
                    <Text
                      style={[
                        styles.listPriorityText,
                        { color: priorityConfig.accentColor },
                      ]}
                    >
                      {recommendation.priority_level.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.listConfidenceBadge}>
                    <Star size={12} color="#10B981" fill="#10B981" />
                    <Text
                      style={[
                        styles.listConfidenceText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {confidence}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Insights Count */}
              <View style={styles.listInsightsHeader}>
                <Zap size={16} color="#10B981" />
                <Text
                  style={[styles.listInsightsTitle, { color: colors.text }]}
                >
                  {allInsights.length} Insights Generated
                </Text>
              </View>

              {/* Quick Preview */}
              {allInsights.slice(0, 1).map((insight, idx) => (
                <View key={idx} style={styles.listQuickPreview}>
                  <Text
                    style={[
                      styles.listQuickPreviewText,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {insight}
                  </Text>
                </View>
              ))}

              {/* Footer */}
              <View style={styles.listCardFooter}>
                <View style={styles.listTimeInfo}>
                  <Clock size={12} color={colors.textTertiary} />
                  <Text
                    style={[
                      styles.listTimeText,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {recDate.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <View style={styles.listViewButton}>
                  <Text style={[styles.listViewText, { color: "#10B981" }]}>
                    View Details
                  </Text>
                  <ChevronRight size={14} color="#10B981" />
                </View>
              </View>
            </View>
          </AnimatedTouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderDetailView = (recommendation: AIRecommendation) => {
    const extractedRecs = extractRecommendationsData(
      recommendation.recommendations
    );
    const priorityConfig = getPriorityConfig(
      recommendation.priority_level,
      colors
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
      <ScrollView
        style={styles.detailContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Detail Header */}
        <LinearGradient
          colors={priorityConfig.colors}
          style={styles.detailHeader}
        >
          <View style={styles.detailHeaderContent}>
            <View style={styles.detailDateSection}>
              <Text style={styles.detailDateDay}>{recDate.getDate()}</Text>
              <Text style={styles.detailDateMonth}>
                {recDate.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>

            <View style={styles.detailMetrics}>
              <View style={styles.detailMetricItem}>
                <Award size={20} color="white" />
                <Text style={styles.detailMetricLabel}>Priority</Text>
                <Text style={styles.detailMetricValue}>
                  {recommendation.priority_level.toUpperCase()}
                </Text>
              </View>

              <View style={styles.detailMetricDivider} />

              <View style={styles.detailMetricItem}>
                <Activity size={20} color="white" />
                <Text style={styles.detailMetricLabel}>Confidence</Text>
                <Text style={styles.detailMetricValue}>{confidence}%</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          {categories.map((category, index) => (
            <Animated.View
              key={category.key}
              entering={FadeInUp.delay(index * 100)}
              style={[styles.categoryCard, { backgroundColor: colors.card }]}
            >
              {/* Category Header */}
              <View style={styles.categoryHeader}>
                <LinearGradient
                  colors={category.config.gradient}
                  style={styles.categoryIcon}
                >
                  <category.config.icon size={20} color="white" />
                </LinearGradient>
                <View style={styles.categoryTitleSection}>
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

              {/* Category Items */}
              <View style={styles.categoryItems}>
                {category.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.categoryItem}>
                    <View style={styles.categoryItemNumber}>
                      <Text
                        style={[
                          styles.categoryItemNumberText,
                          { color: category.config.color },
                        ]}
                      >
                        {itemIndex + 1}
                      </Text>
                    </View>
                    <Text
                      style={[styles.categoryItemText, { color: colors.text }]}
                    >
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <LinearGradient
            colors={["#10B981", "#059669"]}
            style={styles.sectionIcon}
          >
            <Brain size={24} color="white" />
          </LinearGradient>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              AI Recommendations
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
            >
              {filteredRecommendations.length}{" "}
              {filteredRecommendations.length === 1 ? "insight" : "insights"}{" "}
              available
            </Text>
          </View>
        </View>
      </View>

      {/* Preview Card */}
      {renderPreviewCard()}

      {/* List Modal */}
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
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                All Recommendations
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[
                  styles.modalCloseButton,
                  { backgroundColor: colors.card },
                ]}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {renderRecommendationsList()}
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={!!selectedRecommendation}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedRecommendation(null)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Close Button */}
          <View style={styles.detailCloseContainer}>
            <TouchableOpacity
              onPress={() => setSelectedRecommendation(null)}
              style={[
                styles.detailCloseButton,
                { backgroundColor: colors.card },
              ]}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {selectedRecommendation && renderDetailView(selectedRecommendation)}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    borderRadius: 24,
    overflow: "hidden",
  },
  emptyGradient: {
    padding: 40,
    alignItems: "center",
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  // Preview Card
  previewCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    position: "relative",
    overflow: "hidden",
  },
  previewGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  previewHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  previewAiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  previewSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  previewMetrics: {
    alignItems: "flex-end",
  },
  priorityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  confidenceSection: {
    marginBottom: 20,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 3,
  },
  confidenceLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "600",
  },
  insightsPreview: {
    gap: 12,
    marginBottom: 20,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  insightDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  insightDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  insightText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  previewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  insightCount: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  insightCountNumber: {
    fontSize: 28,
    fontWeight: "700",
  },
  insightCountLabel: {
    fontSize: 13,
    fontWeight: "500",
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

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // List
  listContainer: {
    flex: 1,
  },
  listCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  listCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  listCardDate: {
    alignItems: "center",
    minWidth: 50,
  },
  listCardDay: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 36,
  },
  listCardMonth: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  listCardMeta: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  listPriorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  listPriorityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  listConfidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  listConfidenceText: {
    fontSize: 11,
    fontWeight: "600",
  },
  listInsightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  listInsightsTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  listQuickPreview: {
    marginBottom: 16,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  listQuickPreviewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  listCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  listTimeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listTimeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  listViewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  listViewText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Detail View
  detailContainer: {
    flex: 1,
  },
  detailCloseContainer: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  detailCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailHeader: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  detailHeaderContent: {
    alignItems: "center",
  },
  detailDateSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  detailDateDay: {
    fontSize: 56,
    fontWeight: "700",
    color: "white",
    lineHeight: 60,
  },
  detailDateMonth: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  detailMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  detailMetricItem: {
    alignItems: "center",
    gap: 8,
  },
  detailMetricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailMetricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  detailMetricDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  // Categories
  categoriesContainer: {
    padding: 16,
    paddingTop: 24,
    gap: 16,
  },
  categoryCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitleSection: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: "500",
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
  categoryItemNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  categoryItemNumberText: {
    fontSize: 13,
    fontWeight: "700",
  },
  categoryItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
});
