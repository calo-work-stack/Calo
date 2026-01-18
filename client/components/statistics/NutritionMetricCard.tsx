import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import {
  Flame,
  Zap,
  Wheat,
  Fish,
  Droplets,
  Leaf,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { NutritionMetric } from "@/src/types/statistics";

const { width } = Dimensions.get("window");

interface NutritionMetricCardProps {
  metric: NutritionMetric;
  compact?: boolean;
}

const ICONS: Record<string, any> = {
  calories: Flame,
  protein: Zap,
  carbs: Wheat,
  fats: Fish,
  fiber: Leaf,
  water: Droplets,
};

const getTrendIcon = (trend: "up" | "down" | "stable") => {
  switch (trend) {
    case "up":
      return TrendingUp;
    case "down":
      return TrendingDown;
    default:
      return Minus;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case "excellent":
      return "#10B981";
    case "good":
      return "#22C55E";
    case "warning":
      return "#F59E0B";
    case "danger":
      return "#EF4444";
    default:
      return "#6B7280";
  }
};

export default function NutritionMetricCard({
  metric,
  compact = false,
}: NutritionMetricCardProps) {
  const { colors, isDark } = useTheme();
  const IconComponent = ICONS[metric.id] || Flame;
  const TrendIcon = getTrendIcon(metric.trend || "stable");
  const statusColor = getStatusColor(metric.status || "warning");

  const progress = Math.min(metric.percentage || 0, 100);
  const radius = compact ? 28 : 36;
  const strokeWidth = compact ? 5 : 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (compact) {
    return (
      <View
        style={[
          styles.compactCard,
          { backgroundColor: isDark ? `${metric.color}15` : `${metric.color}08` },
        ]}
      >
        <View style={styles.compactHeader}>
          <LinearGradient
            colors={[metric.color, `${metric.color}CC`]}
            style={styles.compactIconBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <IconComponent size={14} color="#FFF" />
          </LinearGradient>
          <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>
            {metric.nameEn}
          </Text>
        </View>

        <View style={styles.compactProgress}>
          <Text style={[styles.compactValue, { color: colors.text }]}>
            {Math.round(metric.value || 0)}
          </Text>
          <Text style={[styles.compactUnit, { color: colors.muted }]}>
            {metric.unit}
          </Text>
        </View>

        <View style={[styles.compactBar, { backgroundColor: isDark ? "#374151" : "#E5E7EB" }]}>
          <View
            style={[
              styles.compactBarFill,
              { width: `${progress}%`, backgroundColor: metric.color },
            ]}
          />
        </View>

        <Text style={[styles.compactTarget, { color: colors.muted }]}>
          / {metric.target} {metric.unit}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <LinearGradient
          colors={[metric.color, `${metric.color}CC`]}
          style={styles.iconBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <IconComponent size={20} color="#FFF" />
        </LinearGradient>

        <View style={styles.nameSection}>
          <Text style={[styles.name, { color: colors.text }]}>{metric.name}</Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            {metric.description}
          </Text>
        </View>

        <View style={styles.trendBadge}>
          <TrendIcon size={14} color={statusColor} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.progressRing}>
          <Svg width={radius * 2 + strokeWidth * 2} height={radius * 2 + strokeWidth * 2}>
            {/* Background circle */}
            <Circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              stroke={isDark ? "#374151" : "#E5E7EB"}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <Circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              stroke={metric.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${radius + strokeWidth}, ${radius + strokeWidth}`}
            />
          </Svg>
          <View style={styles.progressText}>
            <Text style={[styles.percentageText, { color: colors.text }]}>
              {Math.round(progress)}%
            </Text>
          </View>
        </View>

        <View style={styles.values}>
          <View style={styles.valueRow}>
            <Text style={[styles.valueLabel, { color: colors.muted }]}>Current</Text>
            <Text style={[styles.valueNumber, { color: colors.text }]}>
              {Math.round(metric.value || 0)} {metric.unit}
            </Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={[styles.valueLabel, { color: colors.muted }]}>Target</Text>
            <Text style={[styles.valueNumber, { color: colors.muted }]}>
              {metric.target} {metric.unit}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {metric.status || "tracking"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  nameSection: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  trendBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressRing: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  percentageText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  values: {
    flex: 1,
    marginLeft: 20,
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  valueLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  valueNumber: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  // Compact styles
  compactCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 14,
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  compactIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  compactName: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  compactProgress: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 8,
  },
  compactValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  compactUnit: {
    fontSize: 12,
    fontWeight: "600",
  },
  compactBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  compactBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  compactTarget: {
    fontSize: 11,
    fontWeight: "500",
  },
});
