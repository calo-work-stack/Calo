import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TrendingUp, Heart } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

interface HealthInsightsProps {
  recommendations?: string;
  healthNotes?: string;
}

export const HealthInsights: React.FC<HealthInsightsProps> = ({
  recommendations,
  healthNotes,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (!recommendations && !healthNotes) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.success + "15" }]}>
          <Heart size={20} color={colors.success} />
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

      <View style={styles.content}>
        <View style={[styles.insightCard, { backgroundColor: colors.success + "15", borderLeftColor: colors.success }]}>
          <View style={[styles.insightIcon, { backgroundColor: colors.surface }]}>
            <TrendingUp size={18} color={colors.success} />
          </View>
          <Text style={[styles.insightText, { color: colors.text }]}>
            {recommendations || healthNotes}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  content: {},
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderLeftWidth: 4,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  insightText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
  },
});
