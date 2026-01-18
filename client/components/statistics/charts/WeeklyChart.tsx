import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, {
  Circle,
  Path,
  Text as SvgText,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { ChartBar as BarChart3 } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { ProgressData } from "@/src/types/statistics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface WeeklyChartProps {
  data: ProgressData[];
  width?: number;
  height?: number;
}

export default function WeeklyChart({
  data,
  width = SCREEN_WIDTH - 40,
  height = 220,
}: WeeklyChartProps) {
  const { colors, isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceVariant }]}>
        <BarChart3 size={48} color={colors.muted} />
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          No weekly data available
        </Text>
      </View>
    );
  }

  const maxCalories = Math.max(...data.map(d => d.calories || 0)) || 1;
  const maxProtein = Math.max(...data.map(d => d.protein || 0)) || 1;
  const padding = { top: 30, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xStep = chartWidth / Math.max(data.length - 1, 1);

  // Generate smooth curve paths
  const generateSmoothPath = (points: { x: number; y: number }[]): string => {
    if (points.length < 2) return "";

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const cpx = (current.x + next.x) / 2;
      path += ` Q ${cpx} ${current.y} ${cpx} ${(current.y + next.y) / 2}`;
      path += ` Q ${cpx} ${next.y} ${next.x} ${next.y}`;
    }

    return path;
  };

  const caloriesPoints = data.map((item, index) => ({
    x: padding.left + index * xStep,
    y: padding.top + chartHeight - ((item.calories || 0) / maxCalories) * chartHeight,
  }));

  const proteinPoints = data.map((item, index) => ({
    x: padding.left + index * xStep,
    y: padding.top + chartHeight - ((item.protein || 0) / maxProtein) * chartHeight * 0.8,
  }));

  const caloriesPath = caloriesPoints.map((p, i) =>
    `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
  ).join(" ");

  const proteinPath = proteinPoints.map((p, i) =>
    `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
  ).join(" ");

  // Area fill path for calories
  const areaPath = `${caloriesPath} L ${caloriesPoints[caloriesPoints.length - 1].x} ${padding.top + chartHeight} L ${caloriesPoints[0].x} ${padding.top + chartHeight} Z`;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Calories</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#8B5CF6" }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Protein (g)</Text>
        </View>
      </View>

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="caloriesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity={isDark ? "0.3" : "0.2"} />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="caloriesLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="1" />
            <Stop offset="100%" stopColor="#34D399" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="proteinLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
            <Stop offset="100%" stopColor="#A78BFA" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding.top + chartHeight * ratio;
          return (
            <Line
              key={`grid-${index}`}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke={isDark ? "#374151" : "#F1F5F9"}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Calories area fill */}
        <Path d={areaPath} fill="url(#caloriesGradient)" />

        {/* Calories line */}
        <Path
          d={caloriesPath}
          stroke="url(#caloriesLineGradient)"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Protein line */}
        <Path
          d={proteinPath}
          stroke="url(#proteinLineGradient)"
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {caloriesPoints.map((point, index) => (
          <Circle
            key={`cal-point-${index}`}
            cx={point.x}
            cy={point.y}
            r={5}
            fill="#10B981"
            stroke={colors.card}
            strokeWidth={2}
          />
        ))}

        {proteinPoints.map((point, index) => (
          <Circle
            key={`protein-point-${index}`}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="#8B5CF6"
            stroke={colors.card}
            strokeWidth={2}
          />
        ))}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio, index) => {
          const value = Math.round(maxCalories * (1 - ratio));
          const y = padding.top + chartHeight * ratio;
          return (
            <SvgText
              key={`y-label-${index}`}
              x={padding.left - 8}
              y={y + 4}
              fontSize="11"
              fill={colors.muted}
              textAnchor="end"
              fontWeight="500"
            >
              {value}
            </SvgText>
          );
        })}

        {/* X-axis labels */}
        {data.map((item, index) => {
          const x = padding.left + index * xStep;
          return (
            <SvgText
              key={`x-label-${index}`}
              x={x}
              y={height - 10}
              fontSize="11"
              fill={colors.muted}
              textAnchor="middle"
              fontWeight="500"
            >
              {new Date(item.date).toLocaleDateString("en", { weekday: "short" })}
            </SvgText>
          );
        })}
      </Svg>
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
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
