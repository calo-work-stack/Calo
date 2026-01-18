import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { TimePeriod } from "@/hooks/useStatistics";

interface PeriodSelectorProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}

const PERIODS: { key: TimePeriod; labelKey: string }[] = [
  { key: "today", labelKey: "statistics.today" },
  { key: "week", labelKey: "statistics.this_week" },
  { key: "month", labelKey: "statistics.this_month" },
];

export default function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
}: PeriodSelectorProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#1F2937" : "#F1F5F9" }]}>
      {PERIODS.map((period) => {
        const isSelected = selectedPeriod === period.key;
        return (
          <TouchableOpacity
            key={period.key}
            onPress={() => onPeriodChange(period.key)}
            style={styles.tabWrapper}
            activeOpacity={0.8}
          >
            {isSelected ? (
              <LinearGradient
                colors={["#10B981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.selectedTab}
              >
                <Text style={styles.selectedText}>
                  {t(period.labelKey) || period.key}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.tab}>
                <Text style={[styles.tabText, { color: colors.muted }]}>
                  {t(period.labelKey) || period.key}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  tabWrapper: {
    flex: 1,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  selectedTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
