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

      {/* 2x2 Grid */}
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>
          {stats.slice(0, 2).map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <View
                key={index}
                style={[
                  styles.gridCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <LinearGradient
                  colors={stat.gradient}
                  style={styles.gridCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View
                    style={[
                      styles.gridIconBg,
                      { backgroundColor: "rgba(255,255,255,0.25)" },
                    ]}
                  >
                    <IconComponent size={22} color="#FFF" />
                  </View>
                  <Text style={styles.gridValue}>
                    {stat.value}
                    {stat.suffix && (
                      <Text style={styles.gridSuffix}> {stat.suffix}</Text>
                    )}
                  </Text>
                  <Text style={styles.gridLabel} numberOfLines={1}>
                    {stat.label}
                  </Text>
                </LinearGradient>
              </View>
            );
          })}
        </View>
        <View style={styles.gridRow}>
          {stats.slice(2, 4).map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <View
                key={index + 2}
                style={[
                  styles.gridCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <LinearGradient
                  colors={stat.gradient}
                  style={styles.gridCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View
                    style={[
                      styles.gridIconBg,
                      { backgroundColor: "rgba(255,255,255,0.25)" },
                    ]}
                  >
                    <IconComponent size={22} color="#FFF" />
                  </View>
                  <Text style={styles.gridValue}>
                    {stat.value}
                    {stat.suffix && (
                      <Text style={styles.gridSuffix}> {stat.suffix}</Text>
                    )}
                  </Text>
                  <Text style={styles.gridLabel} numberOfLines={1}>
                    {stat.label}
                  </Text>
                </LinearGradient>
              </View>
            );
          })}
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
    paddingHorizontal: 20,
  },
  headerIconBg: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#009EAD",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
  },
  trendBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  gridContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  gridRow: {
    flexDirection: "row",
    gap: 10,
  },
  gridCard: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  gridCardGradient: {
    padding: 16,
    gap: 8,
  },
  gridIconBg: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  gridValue: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
    color: "#FFF",
  },
  gridSuffix: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },
});
