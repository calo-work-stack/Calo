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
  Rect,
  G,
} from "react-native-svg";
import { ChartBar as BarChart3, TrendingUp, TrendingDown } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { ProgressData } from "@/src/types/statistics";
import { LinearGradient as ExpoGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface WeeklyChartProps {
  data: ProgressData[];
  width?: number;
  height?: number;
}

export default function WeeklyChart({
  data,
  width = SCREEN_WIDTH - 40,
  height = 280,
}: WeeklyChartProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: isDark ? "#1F2937" : "#F8FAFC" }]}>
        <View style={[styles.emptyIcon, { backgroundColor: isDark ? "#374151" : "#E2E8F0" }]}>
          <BarChart3 size={32} color={colors.muted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t("statistics.no_data") || "No Data Yet"}
        </Text>
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          {t("statistics.start_tracking") || "Start tracking your nutrition to see insights"}
        </Text>
      </View>
    );
  }

  const maxCalories = Math.max(...data.map(d => d.calories || 0)) * 1.1 || 1;
  const maxProtein = Math.max(...data.map(d => d.protein || 0)) * 1.1 || 1;
  const avgCalories = data.reduce((sum, d) => sum + (d.calories || 0), 0) / data.length;
  const avgProtein = data.reduce((sum, d) => sum + (d.protein || 0), 0) / data.length;

  // Calculate trends
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  const firstAvg = firstHalf.reduce((s, d) => s + (d.calories || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, d) => s + (d.calories || 0), 0) / secondHalf.length;
  const caloriesTrend = secondAvg > firstAvg * 1.05 ? "up" : secondAvg < firstAvg * 0.95 ? "down" : "stable";

  const padding = { top: 40, right: 20, bottom: 50, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xStep = chartWidth / Math.max(data.length - 1, 1);

  // Generate smooth bezier curve path
  const generateSmoothPath = (points: { x: number; y: number }[]): string => {
    if (points.length < 2) return "";

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const prev = points[i - 1] || current;
      const nextNext = points[i + 2] || next;

      // Calculate control points for smoother curves
      const cp1x = current.x + (next.x - prev.x) / 4;
      const cp1y = current.y + (next.y - prev.y) / 4;
      const cp2x = next.x - (nextNext.x - current.x) / 4;
      const cp2y = next.y - (nextNext.y - current.y) / 4;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }

    return path;
  };

  const caloriesPoints = data.map((item, index) => ({
    x: padding.left + index * xStep,
    y: padding.top + chartHeight - ((item.calories || 0) / maxCalories) * chartHeight,
  }));

  const proteinPoints = data.map((item, index) => ({
    x: padding.left + index * xStep,
    y: padding.top + chartHeight - ((item.protein || 0) / maxProtein) * chartHeight,
  }));

  const caloriesPath = generateSmoothPath(caloriesPoints);
  const proteinPath = generateSmoothPath(proteinPoints);

  // Area fill path for calories
  const areaPath = `${caloriesPath} L ${caloriesPoints[caloriesPoints.length - 1].x} ${padding.top + chartHeight} L ${caloriesPoints[0].x} ${padding.top + chartHeight} Z`;

  // Average line Y positions
  const avgCaloriesY = padding.top + chartHeight - (avgCalories / maxCalories) * chartHeight;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("statistics.weekly_progress") || "Weekly Progress"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t("statistics.last_7_days") || "Last 7 days overview"}
          </Text>
        </View>
        <View style={[
          styles.trendBadge,
          { backgroundColor: caloriesTrend === "up" ? "#10B98120" : caloriesTrend === "down" ? "#EF444420" : "#6B728020" }
        ]}>
          {caloriesTrend === "up" ? (
            <TrendingUp size={16} color="#10B981" />
          ) : caloriesTrend === "down" ? (
            <TrendingDown size={16} color="#EF4444" />
          ) : null}
          <Text style={[
            styles.trendText,
            { color: caloriesTrend === "up" ? "#10B981" : caloriesTrend === "down" ? "#EF4444" : "#6B7280" }
          ]}>
            {caloriesTrend === "up" ? "+5%" : caloriesTrend === "down" ? "-5%" : "Stable"}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <ExpoGradient
            colors={["#10B981", "#34D399"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.legendLine}
          />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Calories
          </Text>
          <Text style={[styles.legendValue, { color: "#10B981" }]}>
            {Math.round(avgCalories)} avg
          </Text>
        </View>
        <View style={styles.legendItem}>
          <ExpoGradient
            colors={["#8B5CF6", "#A78BFA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.legendLine}
          />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Protein
          </Text>
          <Text style={[styles.legendValue, { color: "#8B5CF6" }]}>
            {Math.round(avgProtein)}g avg
          </Text>
        </View>
      </View>

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="caloriesAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity={isDark ? "0.4" : "0.25"} />
            <Stop offset="50%" stopColor="#10B981" stopOpacity={isDark ? "0.15" : "0.1"} />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="caloriesLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="1" />
            <Stop offset="50%" stopColor="#34D399" stopOpacity="1" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="proteinLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
            <Stop offset="50%" stopColor="#A78BFA" stopOpacity="1" />
            <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding.top + chartHeight * ratio;
          return (
            <G key={`grid-${index}`}>
              <Line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={isDark ? "#374151" : "#E2E8F0"}
                strokeWidth={1}
              />
            </G>
          );
        })}

        {/* Average line */}
        <Line
          x1={padding.left}
          y1={avgCaloriesY}
          x2={width - padding.right}
          y2={avgCaloriesY}
          stroke="#10B981"
          strokeWidth={1}
          strokeDasharray="6,4"
          opacity={0.5}
        />

        {/* Calories area fill */}
        <Path d={areaPath} fill="url(#caloriesAreaGradient)" />

        {/* Calories line with glow effect */}
        <Path
          d={caloriesPath}
          stroke="#10B981"
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.2}
        />
        <Path
          d={caloriesPath}
          stroke="url(#caloriesLineGradient)"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Protein line with glow effect */}
        <Path
          d={proteinPath}
          stroke="#8B5CF6"
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.15}
        />
        <Path
          d={proteinPath}
          stroke="url(#proteinLineGradient)"
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points - Calories */}
        {caloriesPoints.map((point, index) => (
          <G key={`cal-point-${index}`}>
            {/* Outer glow */}
            <Circle
              cx={point.x}
              cy={point.y}
              r={10}
              fill="#10B981"
              opacity={0.15}
            />
            {/* Point */}
            <Circle
              cx={point.x}
              cy={point.y}
              r={5}
              fill="#10B981"
              stroke={colors.card}
              strokeWidth={2}
            />
          </G>
        ))}

        {/* Data points - Protein */}
        {proteinPoints.map((point, index) => (
          <G key={`protein-point-${index}`}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={8}
              fill="#8B5CF6"
              opacity={0.15}
            />
            <Circle
              cx={point.x}
              cy={point.y}
              r={4}
              fill="#8B5CF6"
              stroke={colors.card}
              strokeWidth={2}
            />
          </G>
        ))}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio, index) => {
          const value = Math.round(maxCalories * (1 - ratio));
          const y = padding.top + chartHeight * ratio;
          return (
            <SvgText
              key={`y-label-${index}`}
              x={padding.left - 10}
              y={y + 4}
              fontSize="11"
              fill={colors.muted}
              textAnchor="end"
              fontWeight="600"
            >
              {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
            </SvgText>
          );
        })}

        {/* X-axis labels */}
        {data.map((item, index) => {
          const x = padding.left + index * xStep;
          const date = new Date(item.date);
          const dayName = date.toLocaleDateString("en", { weekday: "short" });
          const isToday = new Date().toDateString() === date.toDateString();
          return (
            <G key={`x-label-${index}`}>
              {isToday && (
                <Rect
                  x={x - 18}
                  y={height - 28}
                  width={36}
                  height={20}
                  rx={10}
                  fill={isDark ? "#374151" : "#E2E8F0"}
                />
              )}
              <SvgText
                x={x}
                y={height - 14}
                fontSize="11"
                fill={isToday ? colors.primary : colors.muted}
                textAnchor="middle"
                fontWeight={isToday ? "700" : "500"}
              >
                {dayName}
              </SvgText>
            </G>
          );
        })}
      </Svg>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "700",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendLine: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
  },
  legendValue: {
    fontSize: 11,
    fontWeight: "700",
  },
});
