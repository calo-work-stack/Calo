import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  TrendingUp,
  Heart,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Leaf,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

interface HealthInsightsProps {
  recommendations?: string | string[];
  healthNotes?: string | string[];
}

const insightIcons = [
  { Icon: CheckCircle, color: "#10B981" },
  { Icon: Lightbulb, color: "#F59E0B" },
  { Icon: Leaf, color: "#6366F1" },
  { Icon: AlertCircle, color: "#F97316" },
];

export const HealthInsights: React.FC<HealthInsightsProps> = ({
  recommendations,
  healthNotes,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const raw = recommendations || healthNotes;
  if (!raw) return null;

  // Normalize to array
  const insights: string[] = Array.isArray(raw)
    ? raw.filter(Boolean)
    : raw
        .split(/\n|•|–|-(?=\s)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 4);

  if (insights.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.success + "20" },
          ]}
        >
          <Heart size={20} color={colors.success} strokeWidth={2.5} />
        </View>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("camera.healthInsights")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t("camera.aiRecommendations")}
          </Text>
        </View>
      </View>

      {/* Insight Cards */}
      <View style={styles.insightsGrid}>
        {insights.map((insight, index) => {
          const { Icon, color } = insightIcons[index % insightIcons.length];
          return (
            <View
              key={index}
              style={[
                styles.insightCard,
                {
                  backgroundColor: isDark
                    ? color + "18"
                    : color + "12",
                  borderLeftColor: color,
                  borderColor: color + "30",
                },
              ]}
            >
              <View
                style={[
                  styles.insightIconWrapper,
                  { backgroundColor: color + "20" },
                ]}
              >
                <Icon size={16} color={color} strokeWidth={2.5} />
              </View>
              <Text
                style={[styles.insightText, { color: colors.text }]}
                numberOfLines={3}
              >
                {insight}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  insightsGrid: {
    gap: 10,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderLeftWidth: 3,
    borderWidth: 1,
  },
  insightIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
});
