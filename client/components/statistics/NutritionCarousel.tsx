import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Flame,
  Zap,
  Wheat,
  Fish,
  Leaf,
  Droplets,
  Cookie,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  ChevronLeft,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2;
const PAGE_WIDTH = width - 40;

interface NutritionMetric {
  id: string;
  name?: string;
  nameEn?: string;
  value: number;
  target: number;
  unit: string;
  color: string;
  category: string;
  description?: string;
  trend?: "up" | "down" | "stable";
}

interface NutritionCarouselProps {
  metrics: NutritionMetric[];
  extraMetrics?: Record<string, number>;
}

const ICONS: Record<string, any> = {
  calories: Flame,
  protein: Zap,
  carbs: Wheat,
  fats: Fish,
  fiber: Leaf,
  water: Droplets,
  sugar: Cookie,
  sodium: Heart,
  cholesterol: Heart,
  vitaminC: Zap,
  iron: Zap,
  calcium: Zap,
};

const getTrendIcon = (trend?: "up" | "down" | "stable") => {
  switch (trend) {
    case "up":
      return TrendingUp;
    case "down":
      return TrendingDown;
    default:
      return Minus;
  }
};

const getStatusColor = (percentage: number, id: string) => {
  if (id === "calories") {
    if (percentage >= 90 && percentage <= 110) return "#10B981";
    if (percentage >= 80 && percentage <= 120) return "#22C55E";
    if (percentage >= 70 && percentage <= 130) return "#F59E0B";
    return "#EF4444";
  }
  if (id === "sugar" || id === "sodium" || id === "cholesterol") {
    if (percentage <= 80) return "#10B981";
    if (percentage <= 100) return "#22C55E";
    if (percentage <= 120) return "#F59E0B";
    return "#EF4444";
  }
  if (percentage >= 90) return "#10B981";
  if (percentage >= 75) return "#22C55E";
  if (percentage >= 50) return "#F59E0B";
  return "#EF4444";
};

export default function NutritionCarousel({
  metrics,
  extraMetrics = {},
}: NutritionCarouselProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Build all metrics including extra ones
  const allMetrics: NutritionMetric[] = [
    ...metrics,
    ...Object.entries(extraMetrics).map(([key, value]) => ({
      id: key,
      name: t(`statistics.${key}`) || key,
      nameEn: key,
      value,
      target: 100, // default, could pass in extraTargets if available
      unit: key === "sodium" || key === "cholesterol" ? "mg" : "g",
      color: "#F59E0B",
      category: "micros",
    })),
  ];

  // Split into pages of 4 metrics each
  const pages: NutritionMetric[][] = [];
  for (let i = 0; i < allMetrics.length; i += 4) {
    pages.push(allMetrics.slice(i, i + 4));
  }
  const totalPages = pages.length;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / PAGE_WIDTH);
    setCurrentPage(page);
  };

  const scrollToPage = (page: number) => {
    scrollRef.current?.scrollTo({ x: page * PAGE_WIDTH, animated: true });
  };

  const renderMetricCard = (metric: NutritionMetric, index: number) => {
    const IconComponent = ICONS[metric.id] || Flame;
    const percentage =
      metric.target > 0 ? Math.round((metric.value / metric.target) * 100) : 0;
    const statusColor = getStatusColor(percentage, metric.id);
    const TrendIcon = getTrendIcon(metric.trend);

    return (
      <View
        key={`${metric.id}-${index}`}
        style={[
          styles.metricCard,
          {
            backgroundColor: isDark ? `${metric.color}15` : `${metric.color}08`,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={[metric.color, `${metric.color}CC`]}
            style={styles.iconBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <IconComponent size={16} color="#FFF" />
          </LinearGradient>
          <View
            style={[styles.trendBadge, { backgroundColor: `${statusColor}20` }]}
          >
            <TrendIcon size={12} color={statusColor} />
          </View>
        </View>

        <Text
          style={[styles.metricName, { color: colors.text }]}
          numberOfLines={1}
        >
          {metric.name || t(`statistics.${metric.id}`) || metric.id}
        </Text>

        <View style={styles.valueRow}>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {Math.round(metric.value)}
          </Text>
          <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>
            {metric.unit || t(`statistics.${metric.id}_unit`) || ""}
          </Text>
        </View>

        <View
          style={[
            styles.progressBar,
            { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
          ]}
        >
          <LinearGradient
            colors={[metric.color, `${metric.color}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.progressFill,
              { width: `${Math.min(percentage, 100)}%` },
            ]}
          />
        </View>

        <View style={styles.targetRow}>
          <Text style={[styles.targetText, { color: colors.textSecondary }]}>
            / {metric.target} {metric.unit || ""}
          </Text>
          <Text style={[styles.percentageText, { color: statusColor }]}>
            {percentage}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("statistics.nutrition_metrics") || "Nutrition Metrics"}
        </Text>
        <View style={styles.pageIndicatorContainer}>
          <Text style={[styles.pageText, { color: colors.textSecondary }]}>
            {currentPage + 1}/{totalPages}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={PAGE_WIDTH}
        contentContainerStyle={styles.scrollContent}
      >
        {pages.map((page, pageIndex) => (
          <View key={pageIndex} style={styles.page}>
            <View style={styles.metricsGrid}>
              {page.map((metric, index) => renderMetricCard(metric, index))}
              {page.length < 4 &&
                Array(4 - page.length)
                  .fill(null)
                  .map((_, i) => (
                    <View key={`empty-${i}`} style={styles.emptyCard} />
                  ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsContainer}>
        {pages.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => scrollToPage(index)}
            style={[
              styles.dot,
              {
                backgroundColor:
                  index === currentPage
                    ? colors.primary
                    : isDark
                      ? "#374151"
                      : "#E5E7EB",
                width: index === currentPage ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {totalPages > 1 && (
        <>
          {currentPage > 0 && (
            <TouchableOpacity
              style={[
                styles.navArrow,
                styles.navArrowLeft,
                { backgroundColor: colors.card },
              ]}
              onPress={() => scrollToPage(currentPage - 1)}
            >
              <ChevronLeft size={20} color={colors.text} />
            </TouchableOpacity>
          )}
          {currentPage < totalPages - 1 && (
            <TouchableOpacity
              style={[
                styles.navArrow,
                styles.navArrowRight,
                { backgroundColor: colors.card },
              ]}
              onPress={() => scrollToPage(currentPage + 1)}
            >
              <ChevronRight size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  pageIndicatorContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  pageText: { fontSize: 12, fontWeight: "600" },
  scrollContent: { paddingRight: 20 },
  page: { width: PAGE_WIDTH },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: { width: CARD_WIDTH, borderRadius: 18, padding: 14 },
  emptyCard: { width: CARD_WIDTH, height: 140 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  trendBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  metricName: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 10,
  },
  metricValue: { fontSize: 26, fontWeight: "800", letterSpacing: -1 },
  metricUnit: { fontSize: 12, fontWeight: "600" },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 3 },
  targetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  targetText: { fontSize: 11, fontWeight: "500" },
  percentageText: { fontSize: 12, fontWeight: "700" },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  dot: { height: 8, borderRadius: 4 },
  navArrow: {
    position: "absolute",
    top: "50%",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navArrowLeft: { left: -8 },
  navArrowRight: { right: -8 },
});
