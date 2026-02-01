import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import {
  Lightbulb,
  ChevronRight,
  Target,
  Droplets,
  TrendingUp,
  Award,
  Sparkles,
  AlertCircle,
} from "lucide-react-native";

interface DayProgress {
  caloriesActual: number;
  caloriesTarget: number;
  proteinActual?: number;
  proteinTarget?: number;
  waterActual?: number;
  waterTarget?: number;
}

interface TipData {
  id: string;
  icon: any;
  iconColor: string;
  title: string;
  description: string;
  type: "suggestion" | "achievement" | "warning" | "insight";
}

interface DailyTipsCardProps {
  dayProgress?: DayProgress;
  streak?: number;
  completionRate?: number;
  onSeeAllTips?: () => void;
  compact?: boolean;
}

const TipItem: React.FC<{
  tip: TipData;
  colors: any;
  isLast: boolean;
}> = ({ tip, colors, isLast }) => {
  const IconComponent = tip.icon;

  const getBackgroundColor = () => {
    switch (tip.type) {
      case "achievement":
        return colors.emerald500 + "10";
      case "warning":
        return (colors.warning || "#f59e0b") + "10";
      case "insight":
        return "#6366f1" + "10";
      default:
        return colors.surface;
    }
  };

  return (
    <View
      style={[
        styles.tipItem,
        { backgroundColor: getBackgroundColor() },
        !isLast && styles.tipItemBorder,
        !isLast && { borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.tipIconContainer, { backgroundColor: tip.iconColor + "20" }]}>
        <IconComponent size={16} color={tip.iconColor} />
      </View>
      <View style={styles.tipContent}>
        <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title}</Text>
        <Text style={[styles.tipDescription, { color: colors.icon }]}>{tip.description}</Text>
      </View>
    </View>
  );
};

export const DailyTipsCard: React.FC<DailyTipsCardProps> = ({
  dayProgress,
  streak = 0,
  completionRate = 0,
  onSeeAllTips,
  compact = false,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [tips, setTips] = useState<TipData[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Generate contextual tips based on progress
    const generatedTips = generateTips();
    setTips(generatedTips);

    // Pulse animation for the lightbulb
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [dayProgress, streak, completionRate]);

  const generateTips = (): TipData[] => {
    const generatedTips: TipData[] = [];

    if (!dayProgress) {
      // Default tips when no progress data
      generatedTips.push({
        id: "start",
        icon: Sparkles,
        iconColor: colors.emerald500,
        title: t("menu.tip_start_day", "Start your day right"),
        description: t("menu.tip_start_day_desc", "Log your breakfast to kickstart your nutrition tracking."),
        type: "suggestion",
      });
      return generatedTips;
    }

    const caloriePercentage = dayProgress.caloriesTarget > 0
      ? (dayProgress.caloriesActual / dayProgress.caloriesTarget) * 100
      : 0;
    const calorieGap = dayProgress.caloriesTarget - dayProgress.caloriesActual;

    // Protein-related tips
    if (dayProgress.proteinActual !== undefined && dayProgress.proteinTarget !== undefined) {
      const proteinGap = dayProgress.proteinTarget - dayProgress.proteinActual;
      if (proteinGap > 15) {
        generatedTips.push({
          id: "protein",
          icon: Target,
          iconColor: colors.emerald500,
          title: t("menu.tip_protein_short", "Boost your protein"),
          description: t("menu.tip_protein_short_desc", "You're {{gap}}g short on protein. Try adding eggs or Greek yogurt.", { gap: Math.round(proteinGap) }),
          type: "suggestion",
        });
      }
    }

    // Calorie-related tips
    if (caloriePercentage < 50 && new Date().getHours() >= 14) {
      generatedTips.push({
        id: "calories_low",
        icon: AlertCircle,
        iconColor: colors.warning || "#f59e0b",
        title: t("menu.tip_calories_low", "Time to fuel up"),
        description: t("menu.tip_calories_low_desc", "You've only reached {{percent}}% of your daily goal. Don't skip meals!", { percent: Math.round(caloriePercentage) }),
        type: "warning",
      });
    } else if (caloriePercentage >= 90 && caloriePercentage <= 110) {
      generatedTips.push({
        id: "calories_perfect",
        icon: Award,
        iconColor: colors.emerald500,
        title: t("menu.tip_on_track", "Perfect balance!"),
        description: t("menu.tip_on_track_desc", "You're right on target with your calories. Great job!"),
        type: "achievement",
      });
    } else if (caloriePercentage > 110) {
      generatedTips.push({
        id: "calories_over",
        icon: TrendingUp,
        iconColor: colors.error || "#ef4444",
        title: t("menu.tip_over_target", "Over your target"),
        description: t("menu.tip_over_target_desc", "You've exceeded your calorie goal by {{amount}} kcal. Consider a lighter dinner.", { amount: Math.round(dayProgress.caloriesActual - dayProgress.caloriesTarget) }),
        type: "warning",
      });
    }

    // Water-related tips
    if (dayProgress.waterActual !== undefined && dayProgress.waterTarget !== undefined) {
      const waterPercentage = (dayProgress.waterActual / dayProgress.waterTarget) * 100;
      if (waterPercentage < 50 && new Date().getHours() >= 12) {
        generatedTips.push({
          id: "water",
          icon: Droplets,
          iconColor: "#3b82f6",
          title: t("menu.tip_hydration", "Stay hydrated"),
          description: t("menu.tip_hydration_desc", "You've only had {{percent}}% of your water goal. Drink up!", { percent: Math.round(waterPercentage) }),
          type: "suggestion",
        });
      }
    }

    // Streak-related tips
    if (streak >= 3) {
      generatedTips.push({
        id: "streak",
        icon: Award,
        iconColor: "#f59e0b",
        title: t("menu.tip_streak", "{{count}} day streak!", { count: streak }),
        description: t("menu.tip_streak_desc", "You're on fire! Keep it up to unlock achievements."),
        type: "achievement",
      });
    }

    // Completion rate tips
    if (completionRate >= 80) {
      generatedTips.push({
        id: "completion",
        icon: Sparkles,
        iconColor: "#6366f1",
        title: t("menu.tip_great_progress", "Great progress!"),
        description: t("menu.tip_great_progress_desc", "You've completed {{percent}}% of your menu. Almost there!", { percent: Math.round(completionRate) }),
        type: "insight",
      });
    }

    // If no specific tips, add a general one
    if (generatedTips.length === 0) {
      generatedTips.push({
        id: "general",
        icon: Lightbulb,
        iconColor: colors.emerald500,
        title: t("menu.tip_keep_going", "Keep it up!"),
        description: t("menu.tip_keep_going_desc", "You're doing great. Stay consistent with your meals."),
        type: "suggestion",
      });
    }

    // Limit to 2-3 tips
    return generatedTips.slice(0, compact ? 2 : 3);
  };

  if (tips.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={[styles.iconContainer, { backgroundColor: "#f59e0b" + "20" }]}>
              <Lightbulb size={18} color="#f59e0b" />
            </View>
          </Animated.View>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("menu.todays_tips", "Today's Tips")}
          </Text>
        </View>
        {onSeeAllTips && (
          <Pressable onPress={onSeeAllTips} style={styles.seeAllButton}>
            <Text style={[styles.seeAllText, { color: colors.emerald500 }]}>
              {t("menu.see_all_tips", "See All")}
            </Text>
            <ChevronRight size={14} color={colors.emerald500} />
          </Pressable>
        )}
      </View>

      {/* Tips List */}
      <View style={styles.tipsList}>
        {tips.map((tip, index) => (
          <TipItem
            key={tip.id}
            tip={tip}
            colors={colors}
            isLast={index === tips.length - 1}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tipsList: {
    gap: 0,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  tipItemBorder: {
    marginBottom: 8,
  },
  tipIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  tipContent: {
    flex: 1,
    gap: 4,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  tipDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default DailyTipsCard;
