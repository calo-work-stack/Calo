import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import {
  TrendingUp,
  Flame,
  Heart,
  Star,
  Utensils,
  Sparkles,
} from "lucide-react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 100;
const CARD_SPACING = 12;

interface InsightsData {
  totalMeals: number;
  avgCalories: number;
  favoriteMeals: number;
  avgRating: number;
  totalCalories: number;
}

interface InsightsCardProps {
  insights: InsightsData | null;
}

export default function InsightsCard({ insights }: InsightsCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const scrollX = useRef(new Animated.Value(0)).current;

  if (!insights) return null;

  const stats = [
    {
      icon: Utensils,
      value: insights.totalMeals,
      label: t("history.insights.totalMeals"),
      color: "#009EAD",
      gradient: ["#009EAD", "#00C4D4"] as [string, string],
    },
    {
      icon: Flame,
      value: insights.avgCalories,
      label: t("history.insights.avgCalories"),
      color: "#FF9F0A",
      gradient: ["#FF9F0A", "#FFB340"] as [string, string],
      suffix: "kcal",
    },
    {
      icon: Heart,
      value: insights.favoriteMeals,
      label: t("history.insights.favorites"),
      color: "#FF2D55",
      gradient: ["#FF2D55", "#FF5C7C"] as [string, string],
    },
    {
      icon: Star,
      value: insights.avgRating > 0 ? insights.avgRating.toFixed(1) : "-",
      label: t("history.insights.avgRating"),
      color: "#FFB800",
      gradient: ["#FFB800", "#FFCF4D"] as [string, string],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={
            isDark ? ["#009EAD30", "#009EAD10"] : ["#009EAD20", "#009EAD08"]
          }
          style={styles.headerIconBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Sparkles size={20} color={colors.primary} />
        </LinearGradient>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("history.insights.title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t("history.insights.subtitle")}
          </Text>
        </View>
        <View
          style={[
            styles.trendBadge,
            { backgroundColor: isDark ? "#10B98120" : "#10B98110" },
          ]}
        >
          <TrendingUp size={14} color="#10B981" />
        </View>
      </View>

      {/* Carousel */}
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          const inputRange = [
            (index - 1) * (CARD_WIDTH + CARD_SPACING),
            index * (CARD_WIDTH + CARD_SPACING),
            (index + 1) * (CARD_WIDTH + CARD_SPACING),
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.92, 1, 0.92],
            extrapolate: "clamp",
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            >
              <LinearGradient
                colors={stat.gradient}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <View style={styles.statIconContainer}>
                    <View
                      style={[
                        styles.statIconBg,
                        { backgroundColor: "rgba(255, 255, 255, 0.25)" },
                      ]}
                    >
                      <IconComponent size={28} color="#FFF" />
                    </View>
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={styles.statValue}>
                      {stat.value}
                      {stat.suffix && (
                        <Text style={styles.statSuffix}> {stat.suffix}</Text>
                      )}
                    </Text>
                    <Text style={styles.statLabel} numberOfLines={2}>
                      {stat.label}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {stats.map((_, index) => {
          const inputRange = [
            (index - 1) * (CARD_WIDTH + CARD_SPACING),
            index * (CARD_WIDTH + CARD_SPACING),
            (index + 1) * (CARD_WIDTH + CARD_SPACING),
          ];

          const dotScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1.4, 0.8],
            extrapolate: "clamp",
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: colors.primary,
                  transform: [{ scale: dotScale }],
                  opacity: dotOpacity,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  headerIconBg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  trendBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: CARD_SPACING,
  },
  statCard: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  statCardGradient: {
    flex: 1,
    padding: 20,
  },
  statCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statIconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  statIconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statInfo: {
    flex: 1,
    justifyContent: "center",
  },
  statValue: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 4,
    color: "#FFFFFF",
  },
  statSuffix: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.95)",
    lineHeight: 18,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
