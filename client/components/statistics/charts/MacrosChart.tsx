import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { ChartPie as PieChart } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { NutritionMetric } from "@/src/types/statistics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MacrosChartProps {
  metrics: NutritionMetric[];
  width?: number;
}

export default function MacrosChart({ metrics, width = SCREEN_WIDTH - 40 }: MacrosChartProps) {
  const { colors, isDark } = useTheme();

  const macros = metrics.filter(m => m.category === "macros");

  if (macros.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceVariant }]}>
        <PieChart size={48} color={colors.muted} />
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          No macronutrient data available
        </Text>
      </View>
    );
  }

  const total = macros.reduce((sum, macro) => sum + (macro.value || 0), 0) || 1;
  const radius = 85;
  const innerRadius = 55;
  const centerX = width / 2;
  const centerY = 110;

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

  // Calculate total calories for center display
  const caloriesMacro = macros.find(m => m.id === "calories");
  const totalCalories = caloriesMacro?.value || total;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Svg width={width} height={220}>
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

        {/* Segments */}
        {segments.map((seg) => (
          <Path
            key={`segment-${seg.index}`}
            d={seg.pathData}
            fill={`url(#macroGradient-${seg.index})`}
            stroke={colors.card}
            strokeWidth={2}
          />
        ))}

        {/* Center circle */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={innerRadius - 5}
          fill={colors.card}
        />
      </Svg>

      {/* Center content */}
      <View style={[styles.centerContent, { top: centerY - 25 }]}>
        <Text style={[styles.centerValue, { color: colors.text }]}>
          {Math.round(totalCalories)}
        </Text>
        <Text style={[styles.centerLabel, { color: colors.muted }]}>avg kcal</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {macros.map((macro, index) => (
          <View key={`legend-${index}`} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: macro.color }]} />
            <View style={styles.legendText}>
              <Text style={[styles.legendName, { color: colors.text }]}>
                {macro.nameEn}
              </Text>
              <Text style={[styles.legendValue, { color: colors.muted }]}>
                {(macro.value || 0).toFixed(0)}{macro.unit}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  emptyContainer: {
    height: 200,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  centerContent: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  centerValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginTop: -20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    alignItems: "flex-start",
  },
  legendName: {
    fontSize: 12,
    fontWeight: "600",
  },
  legendValue: {
    fontSize: 11,
    fontWeight: "500",
  },
});
