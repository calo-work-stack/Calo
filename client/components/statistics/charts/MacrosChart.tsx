import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
  G,
} from "react-native-svg";
import { ChartPie as PieChart, Zap, Wheat, Fish } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { NutritionMetric } from "@/src/types/statistics";
import { LinearGradient as ExpoGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MacrosChartProps {
  metrics: NutritionMetric[];
  width?: number;
}

const MACRO_ICONS: Record<string, any> = {
  protein: Zap,
  carbs: Wheat,
  fats: Fish,
};

export default function MacrosChart({
  metrics,
  width = SCREEN_WIDTH - 40,
}: MacrosChartProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const macros = metrics.filter(
    (m) => m.category === "macros" && m.id !== "calories",
  );

  if (macros.length === 0) {
    return (
      <View
        style={[
          styles.emptyContainer,
          { backgroundColor: isDark ? "#1F2937" : "#F8FAFC" },
        ]}
      >
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: isDark ? "#374151" : "#E2E8F0" },
          ]}
        >
          <PieChart size={32} color={colors.muted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t("statistics.no_macros") || "No Macros Data"}
        </Text>
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          {t("statistics.log_meals") ||
            "Log your meals to see macro distribution"}
        </Text>
      </View>
    );
  }

  const total = macros.reduce((sum, macro) => sum + (macro.value || 0), 0) || 1;
  const radius = 75;
  const innerRadius = 50;
  const centerX = width / 2;
  const centerY = 100;

  // Calculate total calories (4 cal/g protein, 4 cal/g carbs, 9 cal/g fat)
  const proteinMacro = macros.find((m) => m.id === "protein");
  const carbsMacro = macros.find((m) => m.id === "carbs");
  const fatsMacro = macros.find((m) => m.id === "fats");

  const proteinCals = (proteinMacro?.value || 0) * 4;
  const carbsCals = (carbsMacro?.value || 0) * 4;
  const fatsCals = (fatsMacro?.value || 0) * 9;
  const totalCalories = proteinCals + carbsCals + fatsCals;

  let currentAngle = -90; // Start from top

  const segments = macros.map((macro, index) => {
    const percentage = ((macro.value || 0) / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    // Outer arc
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    // Inner arc
    const ix1 = centerX + innerRadius * Math.cos(startAngleRad);
    const iy1 = centerY + innerRadius * Math.sin(startAngleRad);
    const ix2 = centerX + innerRadius * Math.cos(endAngleRad);
    const iy2 = centerY + innerRadius * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    // Donut segment path
    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}`,
      "Z",
    ].join(" ");

    currentAngle += angle;

    return {
      pathData,
      color: macro.color,
      percentage,
      macro,
      index,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}

      {/* Chart and Legend Side by Side */}
      <View style={styles.chartRow}>
        {/* Donut Chart */}
        <View style={styles.chartWrapper}>
          <Svg width={width * 0.5} height={200}>
            <Defs>
              {segments.map((seg) => (
                <LinearGradient
                  key={`gradient-${seg.index}`}
                  id={`macroGradient-${seg.index}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor={seg.color} stopOpacity="1" />
                  <Stop offset="100%" stopColor={seg.color} stopOpacity="0.7" />
                </LinearGradient>
              ))}
            </Defs>

            {/* Shadow/Glow effect */}
            <Circle
              cx={width * 0.25}
              cy={100}
              r={radius + 5}
              fill="none"
              stroke={isDark ? "#00000020" : "#00000008"}
              strokeWidth={12}
            />

            {/* Segments */}
            <G x={width * 0.25 - centerX} y={0}>
              {segments.map((seg) => (
                <Path
                  key={`segment-${seg.index}`}
                  d={seg.pathData}
                  fill={`url(#macroGradient-${seg.index})`}
                  stroke={colors.card}
                  strokeWidth={3}
                />
              ))}

              {/* Center circle */}
              <Circle
                cx={centerX}
                cy={centerY}
                r={innerRadius - 3}
                fill={colors.card}
              />
            </G>
          </Svg>

          {/* Center content */}
          <View style={styles.centerContent}>
            <Text style={[styles.centerValue, { color: colors.text }]}>
              {Math.round(totalCalories)}
            </Text>
            <Text style={[styles.centerLabel, { color: colors.muted }]}>
              {t("statistics.kcal")}
            </Text>
          </View>
        </View>

        {/* Legend on the right */}
        <View style={styles.legendContainer}>
          {macros.map((macro, index) => {
            const IconComponent = MACRO_ICONS[macro.id] || Zap;
            const percentage = Math.round(((macro.value || 0) / total) * 100);

            return (
              <Animated.View
                key={`legend-${index}`}
                entering={FadeIn.delay(100 * index)}
                style={[
                  styles.legendItem,
                  {
                    backgroundColor: isDark
                      ? `${macro.color}15`
                      : `${macro.color}10`,
                  },
                ]}
              >
                <ExpoGradient
                  colors={[macro.color, `${macro.color}CC`]}
                  style={styles.legendIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconComponent size={14} color="#FFF" />
                </ExpoGradient>

                <View style={styles.legendText}>
                  <View style={styles.legendHeader}>
                    <Text style={[styles.legendName, { color: colors.text }]}>
                      {macro.nameEn}
                    </Text>
                    <Text
                      style={[styles.legendPercentage, { color: macro.color }]}
                    >
                      {percentage}%
                    </Text>
                  </View>
                  <View style={styles.legendValueRow}>
                    <Text
                      style={[
                        styles.legendValue,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {Math.round(macro.value || 0)}
                      {macro.unit}
                    </Text>
                    <Text
                      style={[styles.legendTarget, { color: colors.muted }]}
                    >
                      / {macro.target}
                      {macro.unit}
                    </Text>
                  </View>
                  {/* Mini progress bar */}
                  <View
                    style={[
                      styles.miniProgress,
                      { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
                    ]}
                  >
                    <View
                      style={[
                        styles.miniProgressFill,
                        {
                          backgroundColor: macro.color,
                          width: `${Math.min(((macro.value || 0) / macro.target) * 100, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Calorie Breakdown Footer */}
      <View
        style={[
          styles.calorieBreakdown,
          { backgroundColor: isDark ? "#1F2937" : "#F8FAFC" },
        ]}
      >
        <View style={styles.calorieItem}>
          <View
            style={[
              styles.calorieDot,
              { backgroundColor: proteinMacro?.color || "#8B5CF6" },
            ]}
          />
          <Text style={[styles.calorieLabel, { color: colors.textSecondary }]}>
            Protein
          </Text>
          <Text style={[styles.calorieValue, { color: colors.text }]}>
            {Math.round(proteinCals)} kcal
          </Text>
        </View>
        <View style={styles.calorieDivider} />
        <View style={styles.calorieItem}>
          <View
            style={[
              styles.calorieDot,
              { backgroundColor: carbsMacro?.color || "#F59E0B" },
            ]}
          />
          <Text style={[styles.calorieLabel, { color: colors.textSecondary }]}>
            Carbs
          </Text>
          <Text style={[styles.calorieValue, { color: colors.text }]}>
            {Math.round(carbsCals)} kcal
          </Text>
        </View>
        <View style={styles.calorieDivider} />
        <View style={styles.calorieItem}>
          <View
            style={[
              styles.calorieDot,
              { backgroundColor: fatsMacro?.color || "#10B981" },
            ]}
          />
          <Text style={[styles.calorieLabel, { color: colors.textSecondary }]}>
            Fats
          </Text>
          <Text style={[styles.calorieValue, { color: colors.text }]}>
            {Math.round(fatsCals)} kcal
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 8,
  },
  emptyContainer: {
    height: 240,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 20,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 200,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chartWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
  },
  centerValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  centerLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: -2,
  },
  legendContainer: {
    flex: 1,
    gap: 10,
    paddingLeft: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    gap: 10,
  },
  legendIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  legendText: {
    flex: 1,
  },
  legendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendName: {
    fontSize: 13,
    fontWeight: "700",
  },
  legendPercentage: {
    fontSize: 12,
    fontWeight: "800",
  },
  legendValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  legendTarget: {
    fontSize: 11,
    fontWeight: "500",
  },
  miniProgress: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  calorieBreakdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
  },
  calorieItem: {
    alignItems: "center",
    gap: 4,
  },
  calorieDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calorieLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  calorieValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  calorieDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
  },
});
