import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
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
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={isDark ? ["#009EAD30", "#009EAD10"] : ["#009EAD20", "#009EAD08"]}
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
        <View style={[styles.trendBadge, { backgroundColor: isDark ? "#10B98120" : "#10B98110" }]}>
          <TrendingUp size={14} color="#10B981" />
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <View
              key={index}
              style={[
                styles.statItem,
                { backgroundColor: isDark ? `${stat.color}12` : `${stat.color}08` },
              ]}
            >
              <LinearGradient
                colors={stat.gradient}
                style={styles.statIconBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <IconComponent size={16} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stat.value}
                {stat.suffix && (
                  <Text style={[styles.statSuffix, { color: colors.textSecondary }]}>
                    {" "}{stat.suffix}
                  </Text>
                )}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {stat.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
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
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statItem: {
    width: (width - 58) / 2,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statSuffix: {
    fontSize: 12,
    fontWeight: "600",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
