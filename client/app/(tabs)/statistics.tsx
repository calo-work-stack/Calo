import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Svg, {
  Circle,
  Path,
  Text as SvgText,
  Line,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import {
  ChartBar as BarChart3,
  TrendingUp,
  TrendingDown,
  TriangleAlert as AlertTriangle,
  CircleCheck as CheckCircle,
  Clock,
  Droplets,
  Zap,
  Shield,
  Leaf,
  Calendar,
  Target,
  Flame,
  Apple,
  Wheat,
  Fish,
  Sparkles,
  Scale,
  Award,
  Trophy,
  Star,
  Crown,
  X,
  Medal,
  Waves,
  Mountain,
  Sunrise,
  Moon,
  Dumbbell,
  Gem,
  Activity,
  ChartPie as PieChart,
  Download,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { api, userAPI } from "@/src/services/api";
import LoadingScreen from "@/components/LoadingScreen";
import { StatisticsData } from "@/src/store/calendarSlice";
import {
  UserQuestionnaire,
  NutritionMetric,
  ProgressData,
  Achievement,
  TimeFilterOption,
} from "@/src/types/statistics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { getStatusColor } from "@/src/utils/statisticsHelper";
import { AIRecommendationsSection } from "@/components/statistics/AIRecommendationsSection";
import Animated, { FadeInDown } from "react-native-reanimated";
import useOptimizedAuthSelector from "@/hooks/useOptimizedAuthSelector";
import { useTheme } from "@/src/context/ThemeContext";
import { AchievementsSection } from "@/components/statistics/AchievementsSection";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const { width, height } = Dimensions.get("window");
const CHART_WIDTH = width - 40;
const CHART_HEIGHT = 200;

type ChartType = "weekly" | "macros" | "progress" | "hydration";
interface ChartNavigationProps {
  charts: { key: ChartType; title: string; available: boolean }[];
  activeChart: ChartType;
  onChartChange: (chart: ChartType) => void;
}

const CircularProgress = ({
  percentage,
  size = 120,
  strokeWidth = 12,
  color = "#16A085",
  backgroundColor = "#F1F5F9",
  children,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  children: React.ReactNode;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient
            id="progressGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </SvgLinearGradient>
        </Defs>
        <Circle
          stroke={backgroundColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke="url(#progressGradient)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        {children}
      </View>
    </View>
  );
};

const ChartNavigation = ({
  charts,
  activeChart,
  onChartChange,
}: ChartNavigationProps) => {
  return (
    <View style={styles.chartNavigation}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartNavButtons}>
          {charts.map((chart) => (
            <TouchableOpacity
              key={chart.key}
              style={[
                styles.chartNavButton,
                activeChart === chart.key && styles.chartNavButtonActive,
                !chart.available && styles.chartNavButtonDisabled,
              ]}
              onPress={() => chart.available && onChartChange(chart.key)}
              disabled={!chart.available}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chartNavButtonText,
                  activeChart === chart.key && styles.chartNavButtonTextActive,
                  !chart.available && styles.chartNavButtonTextDisabled,
                ]}
              >
                {chart.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const WeeklyProgressChart = ({
  data,
  width = CHART_WIDTH,
  height = CHART_HEIGHT,
}: {
  data: ProgressData[];
  width?: number;
  height?: number;
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.chartContainer, { height: 200 }]}>
        <View style={styles.noChartDataContainer}>
          <BarChart3 size={48} color="#BDC3C7" />
          <Text style={styles.noChartDataText}>No weekly data available</Text>
        </View>
      </View>
    );
  }

  const maxCalories = Math.max(...data.map((d) => d.calories || 0)) || 1;
  const maxProtein = Math.max(...data.map((d) => d.protein || 0)) || 1;
  const padding = 50;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const xStep = chartWidth / Math.max(data.length - 1, 1);

  const caloriesPath = data
    .map((item, index) => {
      const x = padding + index * xStep;
      const y =
        padding +
        chartHeight -
        ((item.calories || 0) / maxCalories) * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const proteinPath = data
    .map((item, index) => {
      const x = padding + index * xStep;
      const y =
        padding +
        chartHeight -
        ((item.protein || 0) / maxProtein) * chartHeight * 0.5;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
          <Text style={styles.legendText}>Calories</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
          <Text style={styles.legendText}>Protein (g)</Text>
        </View>
      </View>

      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient
            id="caloriesGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </SvgLinearGradient>
          <SvgLinearGradient
            id="proteinGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding + chartHeight * ratio;
          return (
            <Line
              key={`grid-${index}`}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#F1F5F9"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          );
        })}

        {caloriesPath && (
          <>
            <Path
              d={`${caloriesPath} L ${padding + (data.length - 1) * xStep} ${
                padding + chartHeight
              } L ${padding} ${padding + chartHeight} Z`}
              fill="url(#caloriesGradient)"
            />
            <Path
              d={caloriesPath}
              stroke="#10B981"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {proteinPath && (
          <Path
            d={proteinPath}
            stroke="#3B82F6"
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {data.map((item, index) => {
          const x = padding + index * xStep;
          const yCalories =
            padding +
            chartHeight -
            ((item.calories || 0) / maxCalories) * chartHeight;
          const yProtein =
            padding +
            chartHeight -
            ((item.protein || 0) / maxProtein) * chartHeight * 0.5;

          return (
            <React.Fragment key={`points-${index}`}>
              <Circle
                cx={x}
                cy={yCalories}
                r={5}
                fill="#10B981"
                stroke="#FFFFFF"
                strokeWidth={3}
              />
              <Circle
                cx={x}
                cy={yProtein}
                r={4}
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            </React.Fragment>
          );
        })}

        {[0, 0.5, 1].map((ratio, index) => {
          const value = Math.round(maxCalories * (1 - ratio));
          const y = padding + chartHeight * ratio;
          return (
            <SvgText
              key={`y-label-${index}`}
              x={padding - 10}
              y={y + 4}
              fontSize="11"
              fill="#94A3B8"
              textAnchor="end"
              fontWeight="600"
            >
              {value}
            </SvgText>
          );
        })}
      </Svg>

      <View style={styles.chartXLabels}>
        {data.map((item, index) => (
          <Text key={`x-label-${index}`} style={styles.chartXLabel}>
            {new Date(item.date).toLocaleDateString("en", {
              weekday: "short",
            })}
          </Text>
        ))}
      </View>
    </View>
  );
};

const MacronutrientChart = ({
  metrics,
  width = CHART_WIDTH,
}: {
  metrics: NutritionMetric[];
  width?: number;
}) => {
  const macros = metrics.filter((m) => m.category === "macros");

  if (macros.length === 0) {
    return (
      <View style={[styles.chartContainer, { height: 200 }]}>
        <View style={styles.noChartDataContainer}>
          <PieChart size={48} color="#BDC3C7" />
          <Text style={styles.noChartDataText}>
            No macronutrient data available
          </Text>
        </View>
      </View>
    );
  }

  const total = macros.reduce((sum, macro) => sum + (macro.value || 0), 0) || 1;
  let currentAngle = 0;
  const radius = 90;
  const centerX = width / 2;
  const centerY = 130;

  return (
    <View style={styles.chartContainer}>
      <Svg width={width} height={260}>
        <Defs>
          {macros.map((macro, index) => (
            <SvgLinearGradient
              key={`gradient-${index}`}
              id={`macroGradient-${index}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor={macro.color} stopOpacity="1" />
              <Stop offset="100%" stopColor={macro.color} stopOpacity="0.7" />
            </SvgLinearGradient>
          ))}
        </Defs>

        {macros.map((macro, index) => {
          const percentage = ((macro.value || 0) / total) * 100;
          const angle = (percentage / 100) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;

          const startAngleRad = (startAngle * Math.PI) / 180;
          const endAngleRad = (endAngle * Math.PI) / 180;

          const x1 = centerX + radius * Math.cos(startAngleRad);
          const y1 = centerY + radius * Math.sin(startAngleRad);
          const x2 = centerX + radius * Math.cos(endAngleRad);
          const y2 = centerY + radius * Math.sin(endAngleRad);

          const largeArcFlag = angle > 180 ? 1 : 0;

          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            "Z",
          ].join(" ");

          currentAngle += angle;

          return (
            <Path
              key={`macro-${index}`}
              d={pathData}
              fill={`url(#macroGradient-${index})`}
            />
          );
        })}

        <Circle cx={centerX} cy={centerY} r={65} fill="#FFFFFF" />
      </Svg>

      <View style={styles.macroLegend}>
        {macros.map((macro, index) => (
          <View key={`legend-${index}`} style={styles.macroLegendItem}>
            <View
              style={[
                styles.macroLegendColor,
                { backgroundColor: macro.color },
              ]}
            />
            <Text style={styles.macroLegendText}>
              {macro.nameEn}: {(macro.value || 0).toFixed(1)}g
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const ProgressBarChart = ({
  metrics,
  width = CHART_WIDTH,
}: {
  metrics: NutritionMetric[];
  width?: number;
}) => {
  const displayMetrics = metrics.slice(0, 6);

  if (displayMetrics.length === 0) {
    return (
      <View style={[styles.chartContainer, { height: 200 }]}>
        <View style={styles.noChartDataContainer}>
          <BarChart3 size={48} color="#BDC3C7" />
          <Text style={styles.noChartDataText}>No progress data available</Text>
        </View>
      </View>
    );
  }

  const barHeight = 28;
  const barSpacing = 48;
  const chartHeight = displayMetrics.length * barSpacing + 40;

  return (
    <View style={styles.chartContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={Math.max(width, 300)} height={chartHeight}>
          <Defs>
            {displayMetrics.map((metric, index) => (
              <SvgLinearGradient
                key={`barGradient-${index}`}
                id={`barGradient-${index}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <Stop offset="0%" stopColor={metric.color} stopOpacity="0.8" />
                <Stop offset="100%" stopColor={metric.color} stopOpacity="1" />
              </SvgLinearGradient>
            ))}
          </Defs>

          {displayMetrics.map((metric, index) => {
            const y = 20 + index * barSpacing;
            const barWidth = Math.min(width - 120, 200);
            const fillWidth = ((metric.percentage || 0) / 100) * barWidth;

            return (
              <React.Fragment key={`progress-bar-${index}`}>
                <Rect
                  x={100}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="#F1F5F9"
                  rx={14}
                />

                <Rect
                  x={100}
                  y={y}
                  width={fillWidth}
                  height={barHeight}
                  fill={`url(#barGradient-${index})`}
                  rx={14}
                />

                <SvgText
                  x={95}
                  y={y + barHeight / 2 + 5}
                  fontSize="13"
                  fill="#64748B"
                  textAnchor="end"
                  fontWeight="600"
                >
                  {(metric.nameEn || "").length > 8
                    ? (metric.nameEn || "").substring(0, 8) + "..."
                    : metric.nameEn}
                </SvgText>

                <SvgText
                  x={100 + barWidth + 10}
                  y={y + barHeight / 2 + 5}
                  fontSize="13"
                  fill="#0F172A"
                  fontWeight="700"
                >
                  {metric.percentage || 0}%
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </ScrollView>
    </View>
  );
};

const HydrationChart = ({
  data,
  target,
  width = CHART_WIDTH,
  height = CHART_HEIGHT,
}: {
  data: ProgressData[];
  target: number;
  width?: number;
  height?: number;
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.chartContainer, { height: 200 }]}>
        <View style={styles.noChartDataContainer}>
          <Droplets size={48} color="#BDC3C7" />
          <Text style={styles.noChartDataText}>
            No hydration data available
          </Text>
        </View>
      </View>
    );
  }

  const maxValue = Math.max(target, ...data.map((d) => d.water || 0)) || 1;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = (chartWidth / data.length) * 0.7;

  return (
    <View style={styles.chartContainer}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient
            id="hydrationAbove"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#3B82F6" stopOpacity="1" />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
          </SvgLinearGradient>
          <SvgLinearGradient
            id="hydrationBelow"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#94A3B8" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#94A3B8" stopOpacity="0.4" />
          </SvgLinearGradient>
        </Defs>

        <Line
          x1={padding}
          y1={padding + chartHeight - (target / maxValue) * chartHeight}
          x2={width - padding}
          y2={padding + chartHeight - (target / maxValue) * chartHeight}
          stroke="#F59E0B"
          strokeWidth={2}
          strokeDasharray="6,4"
        />

        {data.map((item, index) => {
          const x =
            padding +
            (index * chartWidth) / data.length +
            (chartWidth / data.length - barWidth) / 2;
          const barHeightCalc = ((item.water || 0) / maxValue) * chartHeight;
          const y = padding + chartHeight - barHeightCalc;
          const isAboveTarget = (item.water || 0) >= target;

          return (
            <Rect
              key={`hydration-bar-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={barHeightCalc}
              fill={
                isAboveTarget ? "url(#hydrationAbove)" : "url(#hydrationBelow)"
              }
              rx={8}
            />
          );
        })}

        {[0, 0.5, 1].map((ratio, index) => {
          const value = Math.round(maxValue * (1 - ratio));
          const y = padding + chartHeight * ratio;
          return (
            <SvgText
              key={`hydration-y-label-${index}`}
              x={padding - 10}
              y={y + 4}
              fontSize="11"
              fill="#94A3B8"
              textAnchor="end"
              fontWeight="600"
            >
              {value}ml
            </SvgText>
          );
        })}
      </Svg>

      <View style={styles.chartXLabels}>
        {data.map((item, index) => (
          <Text key={`hydration-x-label-${index}`} style={styles.chartXLabel}>
            {new Date(item.date).toLocaleDateString("en", {
              weekday: "short",
            })}
          </Text>
        ))}
      </View>
    </View>
  );
};

const getAchievementIcon = (
  iconName: string,
  size: number = 20,
  color: string = "#16A085"
) => {
  const iconProps = { size, color };

  switch (iconName) {
    case "target":
      return <Target {...iconProps} />;
    case "sparkles":
      return <Sparkles {...iconProps} />;
    case "star":
      return <Star {...iconProps} />;
    case "medal":
      return <Medal {...iconProps} />;
    case "trophy":
      return <Trophy {...iconProps} />;
    case "crown":
      return <Crown {...iconProps} />;
    case "droplets":
      return <Droplets {...iconProps} />;
    case "waves":
      return <Waves {...iconProps} />;
    case "mountain-snow":
      return <Mountain {...iconProps} />;
    case "flame":
      return <Flame {...iconProps} />;
    case "calendar":
      return <Calendar {...iconProps} />;
    case "sunrise":
      return <Sunrise {...iconProps} />;
    case "moon":
      return <Moon {...iconProps} />;
    case "bar-chart-3":
      return <BarChart3 {...iconProps} />;
    case "apple":
      return <Apple {...iconProps} />;
    case "dumbbell":
      return <Dumbbell {...iconProps} />;
    case "scale":
      return <Scale {...iconProps} />;
    case "wheat":
      return <Wheat {...iconProps} />;
    case "gem":
      return <Gem {...iconProps} />;
    case "zap":
      return <Zap {...iconProps} />;
    case "award":
    default:
      return <Award {...iconProps} />;
  }
};

const getAchievementBackgroundColor = (rarity: string, unlocked: boolean) => {
  if (!unlocked) return "#FFFFFF";

  switch (rarity.toUpperCase()) {
    case "LEGENDARY":
      return "#FFFBEB";
    case "EPIC":
      return "#F9F5FF";
    case "RARE":
      return "#F0F9FF";
    case "UNCOMMON":
      return "#FFF7ED";
    case "COMMON":
    default:
      return "#F0FDF4";
  }
};

const getRarityColor = (rarity: string) => {
  switch (rarity.toUpperCase()) {
    case "LEGENDARY":
      return "#F59E0B";
    case "EPIC":
      return "#8B5CF6";
    case "RARE":
      return "#3B82F6";
    case "UNCOMMON":
      return "#F97316";
    case "COMMON":
    default:
      return "#10B981";
  }
};

export default function StatisticsScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === "he";
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month"
  >("week");
  const [activeChart, setActiveChart] = useState<ChartType>("weekly");
  const [showAchievements, setShowAchievements] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(
    null
  );
  const [userQuestionnaire, setUserQuestionnaire] =
    useState<UserQuestionnaire | null>(null);
  const [metrics, setMetrics] = useState<NutritionMetric[]>([]);
  const [weeklyData, setWeeklyData] = useState<ProgressData[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const { user } = useSelector((state: RootState) => state.auth);

  const fetchAchievements = async () => {
    try {
      const response = await api.get("/statistics/achievements");
      if (response.data.success && response.data.data) {
        setAchievements(
          response.data.data.map((achievement: any) => ({
            id: achievement.id,
            title: achievement.title || { en: "Achievement", he: "הישג" },
            description: achievement.description || {
              en: "Description",
              he: "תיאור",
            },
            icon: achievement.icon || "trophy",
            color: getRarityColor(achievement.rarity || "COMMON"),
            progress: achievement.progress || 0,
            maxProgress: achievement.max_progress || 1,
            unlocked: achievement.unlocked || false,
            category: achievement.category || "MILESTONE",
            xpReward: achievement.xpReward || 0,
            rarity: achievement.rarity || "COMMON",
            unlockedDate: achievement.unlockedDate,
          }))
        );
      }
      console.log(achievements);
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
    }
  };

  const fetchAIRecommendations = async () => {
    setIsLoadingRecommendations(true);
    try {
      console.log("🤖 Fetching AI recommendations...");
      const response = await api.get("/recommendations");
      console.log("📊 AI Recommendations Response:", response.data);

      if (response.data.success && Array.isArray(response.data.data)) {
        const transformedRecommendations = response.data.data.map(
          (rec: any) => ({
            id: rec.id,
            date: rec.date,
            created_at: rec.created_at,
            is_read: rec.is_read,
            recommendations: rec.recommendations,
            priority_level: rec.priority_level,
            confidence_score: rec.confidence_score,
            based_on: rec.based_on,
            user_id: rec.user_id,
          })
        );
        console.log(response.data)
        console.log(
          "✅ Transformed AI recommendations:",
          transformedRecommendations
        );
        setAiRecommendations(transformedRecommendations);
      } else {
        console.log("⚠️ No AI recommendations data found");
        setAiRecommendations([]);
      }
    } catch (error) {
      console.error("Failed to fetch AI recommendations:", error);
      setAiRecommendations([]);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const fetchStatistics = async (period: "today" | "week" | "month") => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`📊 Fetching statistics for period: ${period}`);
      const [statisticsResponse, questionnaireResponse] = await Promise.all([
        api.get(`/statistics?period=${period}`),
        api.get("/questionnaire"),
      ]);
      fetchAIRecommendations();
      if (statisticsResponse.data.success && statisticsResponse.data.data) {
        setStatisticsData(statisticsResponse.data.data);
      } else {
        setError(
          statisticsResponse.data.message || "No statistics data available"
        );
      }

      if (
        questionnaireResponse.data.success &&
        questionnaireResponse.data.data
      ) {
        const qData = questionnaireResponse.data.data;
        let mealsPerDay = 3;
        if (qData.meals_per_day) {
          const cleanedMeals = qData.meals_per_day
            .toString()
            .replace(/[^0-9]/g, "");
          mealsPerDay = parseInt(cleanedMeals) || 3;
        }

        setUserQuestionnaire({
          mealsPerDay,
          dailyCalories: qData.daily_calories || 2000,
          dailyProtein: qData.daily_protein || 120,
          dailyCarbs: qData.daily_carbs || 250,
          dailyFats: qData.daily_fats || 70,
          dailyFiber: qData.daily_fiber || 25,
          dailyWater: qData.daily_water || 2500,
        });
      }
    } catch (err: any) {
      console.error("❌ Error fetching statistics:", err);
      setError(err.response?.data?.message || "Failed to load statistics data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics(selectedPeriod);
  }, [selectedPeriod]);

  const generateNutritionMetrics = (): NutritionMetric[] => {
    if (!statisticsData || !userQuestionnaire) {
      return [];
    }

    const calculateTrend = (
      current: number,
      target: number
    ): "up" | "down" | "stable" => {
      const ratio = current / target;
      if (ratio > 1.1) return "up";
      if (ratio < 0.9) return "down";
      return "stable";
    };

    const calculateWeeklyChange = (
      current: number,
      previous: number
    ): number => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    const baseData = [
      {
        id: "calories",
        name: t("statistics.total_calories") || "Total Calories",
        nameEn: "Total Calories",
        value: statisticsData.averageCalories || 0,
        target: userQuestionnaire.dailyCalories,
        unit: t("statistics.kcal") || "kcal",
        icon: <Flame size={20} color="#EF4444" />,
        color: "#EF4444",
        category: "macros" as const,
        description:
          language === "he"
            ? "צריכת קלוריות יומית כוללת"
            : "Total daily calorie intake",
        trend: calculateTrend(
          statisticsData.averageCalories || 0,
          userQuestionnaire.dailyCalories
        ),
        weeklyAverage: statisticsData.averageCalories || 0,
        lastWeekChange: calculateWeeklyChange(
          statisticsData.averageCalories || 0,
          statisticsData.averageCalories || 0
        ),
      },
      {
        id: "protein",
        name: t("statistics.protein") || "Protein",
        nameEn: "Protein",
        value: statisticsData.averageProtein || 0,
        target: userQuestionnaire.dailyProtein,
        unit: t("statistics.g") || "g",
        icon: <Zap size={20} color="#8B5CF6" />,
        color: "#8B5CF6",
        category: "macros" as const,
        description:
          language === "he"
            ? "חלבון לבניית שרירים ותיקון רקמות"
            : "Protein for muscle building and tissue repair",
        trend: calculateTrend(
          statisticsData.averageProtein || 0,
          userQuestionnaire.dailyProtein
        ),
        weeklyAverage: statisticsData.averageProtein || 0,
        lastWeekChange: calculateWeeklyChange(
          statisticsData.averageProtein || 0,
          statisticsData.averageProtein || 0
        ),
      },
      {
        id: "carbs",
        name: t("statistics.carbohydrates") || "Carbohydrates",
        nameEn: "Carbohydrates",
        value: statisticsData.averageCarbs || 0,
        target: userQuestionnaire.dailyCarbs,
        unit: t("statistics.g") || "g",
        icon: <Wheat size={20} color="#F59E0B" />,
        color: "#F59E0B",
        category: "macros" as const,
        description:
          language === "he"
            ? "פחמימות לאנרגיה ותפקוד המוח"
            : "Carbohydrates for energy and brain function",
        trend: calculateTrend(
          statisticsData.averageCarbs || 0,
          userQuestionnaire.dailyCarbs
        ),
        weeklyAverage: statisticsData.averageCarbs || 0,
        lastWeekChange: calculateWeeklyChange(
          statisticsData.averageCarbs || 0,
          statisticsData.averageCarbs || 0
        ),
      },
      {
        id: "fats",
        name: t("statistics.fats") || "Fats",
        nameEn: "Fats",
        value: statisticsData.averageFats || 0,
        target: userQuestionnaire.dailyFats,
        unit: t("statistics.g") || "g",
        icon: <Fish size={20} color="#10B981" />,
        color: "#10B981",
        category: "macros" as const,
        description:
          language === "he"
            ? "שומנים בריאים לתפקוד הורמונלי"
            : "Healthy fats for hormonal function",
        trend: calculateTrend(
          statisticsData.averageFats || 0,
          userQuestionnaire.dailyFats
        ),
        weeklyAverage: statisticsData.averageFats || 0,
        lastWeekChange: calculateWeeklyChange(
          statisticsData.averageFats || 0,
          statisticsData.averageFats || 0
        ),
      },
      {
        id: "fiber",
        name: t("statistics.fiber") || "Fiber",
        nameEn: "Fiber",
        value: statisticsData.averageFiber || 0,
        target: userQuestionnaire.dailyFiber,
        unit: t("statistics.g") || "g",
        icon: <Leaf size={20} color="#22C55E" />,
        color: "#22C55E",
        category: "micros" as const,
        description:
          language === "he"
            ? "סיבים תזונתיים לבריאות העיכול"
            : "Dietary fiber for digestive health",
        recommendation: t("statistics.increaseIntake") || "Increase intake",
        trend: calculateTrend(
          statisticsData.averageFiber || 0,
          userQuestionnaire.dailyFiber
        ),
        weeklyAverage: statisticsData.averageFiber || 0,
        lastWeekChange: calculateWeeklyChange(
          statisticsData.averageFiber || 0,
          statisticsData.averageFiber || 0
        ),
      },
      {
        id: "sugars",
        name: t("statistics.sugars") || "Sugars",
        nameEn: "Sugars",
        value: statisticsData.averageSugar || 0,
        target: 50,
        maxTarget: 50,
        unit: t("statistics.g") || "g",
        icon: <Apple size={20} color="#F97316" />,
        color: "#F97316",
        category: "micros" as const,
        description:
          language === "he"
            ? "סוכרים פשוטים - מומלץ להגביל"
            : "Simple sugars - recommended to limit",
        recommendation: t("statistics.decreaseIntake") || "Decrease intake",
        trend: calculateTrend(statisticsData.averageSugar || 0, 50),
        weeklyAverage: statisticsData.averageSugar || 0,
        lastWeekChange: calculateWeeklyChange(
          statisticsData.averageSugar || 0,
          statisticsData.averageSugar || 0
        ),
      },
      {
        id: "sodium",
        name: t("statistics.sodium") || "Sodium",
        nameEn: "Sodium",
        value: statisticsData.averageSodium || 0,
        target: 2300,
        maxTarget: 2300,
        unit: t("statistics.mg") || "mg",
        icon: <Shield size={20} color="#EF4444" />,
        color: "#EF4444",
        category: "micros" as const,
        description:
          language === "he"
            ? "נתרן - חשוב להגביל למניעת יתר לחץ דם"
            : "Sodium - important to limit to prevent hypertension",
        recommendation: t("statistics.decreaseIntake") || "Decrease intake",
        trend: calculateTrend(statisticsData.averageSodium || 0, 2300),
        weeklyAverage: statisticsData.averageSodium || 0,
        lastWeekChange: calculateWeeklyChange(
          statisticsData.averageSodium || 0,
          statisticsData.averageSodium || 0
        ),
      },
      {
        id: "hydration",
        name: t("statistics.hydration") || "Hydration",
        nameEn: "Hydration",
        value: statisticsData.averageFluids || 0,
        target: userQuestionnaire.dailyWater,
        unit: t("statistics.ml") || "ml",
        icon: <Droplets size={20} color="#3B82F6" />,
        color: "#3B82F6",
        category: "lifestyle" as const,
        description:
          language === "he" ? "רמת הידרציה יומית" : "Daily hydration level",
        recommendation: t("statistics.increaseIntake") || "Increase intake",
        trend: calculateTrend(
          statisticsData.averageFluids || 0,
          userQuestionnaire.dailyWater
        ),
        weeklyAverage: statisticsData.averageFluids || 0,
        lastWeekChange: calculateWeeklyChange(
          statisticsData.averageFluids || 0,
          statisticsData.averageFluids || 0
        ),
      },
    ];

    return baseData.map((metric) => {
      const percentage = metric.maxTarget
        ? Math.min((metric.target / Math.max(metric.value, 1)) * 100, 100)
        : Math.min((metric.value / Math.max(metric.target, 1)) * 100, 100);

      let status: "excellent" | "good" | "warning" | "danger";

      if (metric.maxTarget) {
        if (metric.value <= metric.target * 0.8) status = "excellent";
        else if (metric.value <= metric.target) status = "good";
        else if (metric.value <= metric.target * 1.2) status = "warning";
        else status = "danger";
      } else {
        if (percentage >= 100) status = "excellent";
        else if (percentage >= 80) status = "good";
        else if (percentage >= 60) status = "warning";
        else status = "danger";
      }

      return {
        ...metric,
        percentage: Math.round(percentage),
        status,
      };
    });
  };

  const generateWeeklyData = (): ProgressData[] => {
    if (
      !statisticsData?.dailyBreakdown ||
      statisticsData.dailyBreakdown.length === 0 ||
      !userQuestionnaire
    ) {
      return [];
    }

    return statisticsData.dailyBreakdown.map((day: any) => ({
      date: day.date,
      calories: day.calories || 0,
      protein: day.protein_g || 0,
      carbs: day.carbs_g || 0,
      fats: day.fats_g || 0,
      water: day.liquids_ml || 0,
      weight: day.weight_kg,
      mood: (day.mood as "happy" | "neutral" | "sad") || "neutral",
      energy: (day.energy as "high" | "medium" | "low") || "medium",
      satiety:
        (day.satiety as "very_full" | "satisfied" | "hungry") || "satisfied",
      mealQuality: day.meal_quality || 3,
      mealsCount: day.meals_count || 0,
      requiredMeals: userQuestionnaire.mealsPerDay,
    }));
  };

  const generateAchievements = (): Achievement[] => {
    if (!statisticsData?.achievements && achievements.length === 0) {
      fetchAchievements();
      return [];
    }

    if (statisticsData?.achievements) {
      return statisticsData.achievements.map((achievement: any) => ({
        id: achievement.id,
        title: achievement.title || { en: "Achievement", he: "הישג" },
        description: achievement.description || {
          en: "Description",
          he: "תיאור",
        },
        icon: achievement.icon || "trophy",
        color: getRarityColor(achievement.rarity || "COMMON"),
        progress: achievement.progress || 0,
        maxProgress: achievement.max_progress || 1,
        unlocked: achievement.unlocked || false,
        category: achievement.category || "MILESTONE",
        xpReward: achievement.xpReward || 0,
        rarity: achievement.rarity || "COMMON",
        unlockedDate: achievement.unlockedDate,
      }));
    }

    return achievements;
  };

  useEffect(() => {
    if (statisticsData && userQuestionnaire) {
      setMetrics(generateNutritionMetrics());
      setWeeklyData(generateWeeklyData());
      setAchievements(generateAchievements());
    }
  }, [statisticsData, userQuestionnaire, t]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchStatistics(selectedPeriod);
    } finally {
      setRefreshing(false);
    }
  };

  const timeFilters: TimeFilterOption[] = [
    { key: "today", label: t("statistics.today") || "Today" },
    { key: "week", label: t("statistics.week") || "Week" },
    { key: "month", label: t("statistics.month") || "Month" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "#22C55E";
      case "good":
        return "#F59E0B";
      case "warning":
        return "#F97316";
      case "danger":
        return "#EF4444";
      default:
        return "#94A3B8";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "excellent":
        return <CheckCircle size={16} color="#22C55E" />;
      case "good":
        return <CheckCircle size={16} color="#F59E0B" />;
      case "warning":
        return <AlertTriangle size={16} color="#F97316" />;
      case "danger":
        return <AlertTriangle size={16} color="#EF4444" />;
      default:
        return <CheckCircle size={16} color="#94A3B8" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp size={14} color="#22C55E" />;
      case "down":
        return <TrendingDown size={14} color="#EF4444" />;
      default:
        return <Target size={14} color="#94A3B8" />;
    }
  };

  const calculateProgressStats = () => {
    if (!statisticsData) {
      return {
        totalDays: 0,
        successfulDays: 0,
        averageCompletion: 0,
        bestStreak: 0,
        currentStreak: 0,
        averages: { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0 },
      };
    }

    const averages = {
      calories: Math.round(statisticsData.averageCalories || 0),
      protein: Math.round(statisticsData.averageProtein || 0),
      carbs: Math.round(statisticsData.averageCarbs || 0),
      fats: Math.round(statisticsData.averageFats || 0),
      water: Math.round(statisticsData.averageFluids || 0),
    };

    return {
      totalDays: statisticsData.totalDays || 0,
      successfulDays: statisticsData.successfulDays || 0,
      averageCompletion: Math.round(statisticsData.averageCompletion || 0),
      bestStreak: statisticsData.bestStreak || 0,
      currentStreak: statisticsData.currentStreak || 0,
      averages,
    };
  };

  const calculateGamificationStats = () => {
    if (!statisticsData) {
      return {
        level: 1,
        currentXP: 0,
        nextLevelXP: 1000,
        totalPoints: 0,
        dailyStreak: 0,
        weeklyStreak: 0,
        perfectDays: 0,
        xpToNext: 1000,
        xpProgress: 0,
      };
    }

    const totalPoints = statisticsData.totalPoints || 0;
    const level = Math.max(1, Math.floor(totalPoints / 1000) + 1);
    const currentXP = totalPoints % 1000;
    const nextLevelXP = 1000;

    return {
      level,
      currentXP,
      nextLevelXP,
      totalPoints,
      dailyStreak: statisticsData.currentStreak || 0,
      weeklyStreak: statisticsData.weeklyStreak || 0,
      perfectDays: statisticsData.perfectDays || 0,
      xpToNext: nextLevelXP - currentXP,
      xpProgress: (currentXP / nextLevelXP) * 100,
    };
  };

  const shouldShowWarnings = (): boolean => {
    if (!userQuestionnaire) return false;
    const today = new Date().toISOString().split("T")[0];
    const todayData = weeklyData.find((day) => day.date === today);
    return todayData ? todayData.mealsCount >= todayData.requiredMeals : false;
  };

  const categorizedMetrics = {
    macros: metrics.filter((m) => m.category === "macros"),
    micros: metrics.filter((m) => m.category === "micros"),
    lifestyle: metrics.filter((m) => m.category === "lifestyle"),
  };

  const progressStats = calculateProgressStats();
  const gamificationStats = calculateGamificationStats();

  const availableCharts = [
    {
      key: "weekly" as ChartType,
      title: "Weekly Progress",
      available: weeklyData.length > 0,
    },
    {
      key: "macros" as ChartType,
      title: "Macronutrients",
      available: categorizedMetrics.macros.length > 0,
    },
    {
      key: "progress" as ChartType,
      title: "Goal Progress",
      available: metrics.length > 0,
    },
    {
      key: "hydration" as ChartType,
      title: "Hydration",
      available: weeklyData.length > 0 && userQuestionnaire !== null,
    },
  ];

  const renderActiveChart = () => {
    switch (activeChart) {
      case "weekly":
        return <WeeklyProgressChart data={weeklyData} />;
      case "macros":
        return <MacronutrientChart metrics={categorizedMetrics.macros} />;
      case "progress":
        return <ProgressBarChart metrics={metrics} />;
      case "hydration":
        return (
          <HydrationChart
            data={weeklyData}
            target={userQuestionnaire?.dailyWater || 2500}
          />
        );
      default:
        return <WeeklyProgressChart data={weeklyData} />;
    }
  };

  const renderMetricCard = (metric: NutritionMetric) => (
    <TouchableOpacity
      key={metric.id}
      style={styles.metricCard}
      onPress={() => Alert.alert(metric.name, metric.description)}
      activeOpacity={0.7}
    >
      <View style={styles.metricCardContent}>
        <View style={styles.metricHeader}>
          <View
            style={[
              styles.metricIconContainer,
              { backgroundColor: `${metric.color}15` },
            ]}
          >
            {metric.icon}
          </View>
          <View style={styles.metricInfo}>
            <Text style={styles.metricName} numberOfLines={1}>
              {metric.name}
            </Text>
            <View style={styles.metricStatus}>
              {getStatusIcon(metric.status)}
              <Text
                style={[
                  styles.metricStatusText,
                  { color: getStatusColor(metric.status) },
                ]}
              >
                {metric.status}
              </Text>
            </View>
          </View>
          <View style={styles.metricTrend}>
            {getTrendIcon(metric.trend)}
            <Text style={styles.metricTrendText}>
              {metric.lastWeekChange > 0 ? "+" : ""}
              {metric.lastWeekChange.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricValues}>
          <View style={styles.metricCurrentValue}>
            <Text style={styles.metricValueText} numberOfLines={1}>
              {(metric.value || 0).toLocaleString()} {metric.unit}
            </Text>
            <Text style={styles.metricTargetText} numberOfLines={1}>
              {language === "he" ? "יעד" : "Target"}:{" "}
              {(metric.target || 0).toLocaleString()} {metric.unit}
            </Text>
          </View>
          <View style={styles.metricPercentage}>
            <Text
              style={[styles.metricPercentageText, { color: metric.color }]}
            >
              {metric.percentage || 0}%
            </Text>
          </View>
        </View>

        <View style={styles.metricProgress}>
          <View style={styles.metricProgressBg}>
            <LinearGradient
              colors={[metric.color, `${metric.color}CC`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.metricProgressFill,
                {
                  width: `${Math.min(metric.percentage || 0, 100)}%`,
                },
              ]}
            />
          </View>
        </View>

        {metric.recommendation && shouldShowWarnings() && (
          <View
            style={[
              styles.metricRecommendation,
              { backgroundColor: `${metric.color}10` },
            ]}
          >
            <Sparkles size={12} color={metric.color} />
            <Text style={styles.metricRecommendationText} numberOfLines={2}>
              {metric.recommendation}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMealCompletionStatus = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayData = weeklyData.find((day) => day.date === today);

    if (!todayData || !userQuestionnaire) return null;

    const isCompleted = todayData.mealsCount >= userQuestionnaire.mealsPerDay;
    const completionPercentage =
      (todayData.mealsCount / userQuestionnaire.mealsPerDay) * 100;

    return (
      <View style={styles.mealCompletionCard}>
        <View style={styles.mealCompletionHeader}>
          <View style={styles.mealCompletionIcon}>
            {isCompleted ? (
              <CheckCircle size={24} color="#22C55E" />
            ) : (
              <Clock size={24} color="#F97316" />
            )}
          </View>
          <Text style={styles.mealCompletionTitle}>
            {t("statistics.meals_completed") || "Meals Completed"}
          </Text>
        </View>

        <View style={styles.mealCompletionContent}>
          <CircularProgress
            percentage={Math.min(completionPercentage, 100)}
            size={100}
            strokeWidth={8}
            color={isCompleted ? "#22C55E" : "#F97316"}
          >
            <Text style={styles.mealCompletionText}>
              {todayData.mealsCount}
            </Text>
            <Text style={styles.mealCompletionSubtext}>
              {t("statistics.of") || "of"} {userQuestionnaire.mealsPerDay}
            </Text>
          </CircularProgress>

          {!isCompleted && (
            <Text style={styles.mealCompletionMessage}>
              {t("statistics.complete_meals_first") ||
                "Complete your meals first"}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const generatePdf = async () => {
    if (!statisticsData) {
      Alert.alert("No Data", "There is no data to generate a PDF from.");
      return;
    }

    Alert.alert(
      "Generating PDF",
      "Please wait while we generate your report..."
    );

    const htmlContent = `
    <html>
      <head>
        <meta charset="utf-8">
        <title>Statistics Report</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            padding: 20px;
            color: #333;
            line-height: 1.4;
          }
          h1 {
            color: #10B981;
            text-align: center;
            margin-bottom: 30px;
          }
          h2 {
            color: #0F172A;
            border-bottom: 2px solid #EEE;
            padding-bottom: 10px;
            margin-top: 25px;
            margin-bottom: 15px;
            font-size: 20px;
          }
          .section {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          .metric-card {
            background-color: #F8FAFC;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            border: 1px solid #E5E7EB;
          }
          .progress-bar {
            height: 8px;
            background-color: #F1F5F9;
            border-radius: 4px;
            overflow: hidden;
            margin: 8px 0;
          }
          .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
          }
        </style>
      </head>
      <body>
        <h1>Statistics Report</h1>

        <div class="section">
          <h2>Progress Overview</h2>
          <p>Average Completion: ${progressStats?.averageCompletion || 0}%</p>
          <p>Best Streak: ${progressStats?.bestStreak || 0} days</p>
          <p>Current Streak: ${progressStats?.currentStreak || 0} days</p>
        </div>

        <div class="section">
          <h2>Nutrition Averages</h2>
          <p>Calories: ${progressStats?.averages?.calories || 0} kcal</p>
          <p>Protein: ${progressStats?.averages?.protein || 0} g</p>
          <p>Carbohydrates: ${progressStats?.averages?.carbs || 0} g</p>
          <p>Fats: ${progressStats?.averages?.fats || 0} g</p>
          <p>Water: ${progressStats?.averages?.water || 0} ml</p>
        </div>

        ${
          metrics
            ?.map(
              (metric, index) => `
          <div class="section">
            <h2>${metric.name || `Metric ${index + 1}`}</h2>
            <div class="metric-card">
              <p><strong>Value:</strong> ${(
                metric.value || 0
              ).toLocaleString()} ${metric.unit || ""}</p>
              <p><strong>Target:</strong> ${(
                metric.target || 0
              ).toLocaleString()} ${metric.unit || ""}</p>
              <p><strong>Status:</strong> ${metric.status || "N/A"}</p>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(
                  metric.percentage || 0,
                  100
                )}%; background-color: ${metric.color || "#ccc"};"></div>
              </div>
              ${
                metric.recommendation
                  ? `<p><em>💡 ${metric.recommendation}</em></p>`
                  : ""
              }
            </div>
          </div>
        `
            )
            .join("") || ""
        }
      </body>
    </html>
    `;

    try {
      if (!Print || !Print.printToFileAsync) {
        throw new Error("Print module is not available");
      }

      const fileName = `Calo Stats ${user?.name || "User"}.pdf`;
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      if (uri) {
        if (!Sharing || !Sharing.shareAsync) {
          throw new Error("Sharing module is not available");
        }

        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share your statistics report",
          UTI: "com.adobe.pdf",
        });
      }
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      Alert.alert("Error", "Failed to generate PDF: " + error.message);
    }
  };

  if (isLoading) {
    return <LoadingScreen text={t("loading.statistics")} />;
  }

  const { colors } = useTheme();

  if (error) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <AlertTriangle size={64} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          {t("common.error_occurred")}
        </Text>
        <Text style={[styles.errorText, { color: colors.subtext }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setError(null);
            fetchStatistics(selectedPeriod);
          }}
          activeOpacity={0.7}
        >
          <RotateCcw size={20} color={colors.onPrimary} />
          <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>
            {t("common.try_again")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#10B981"]}
              tintColor="#10B981"
              progressBackgroundColor={colors.card}
            />
          }
        >
          <View style={styles.timeFilterContainer}>
            <View style={styles.timeFilter}>
              {timeFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.timeFilterButton,
                    selectedPeriod === filter.key &&
                      styles.timeFilterButtonActive,
                  ]}
                  onPress={() => setSelectedPeriod(filter.key)}
                  activeOpacity={0.7}
                >
                  {selectedPeriod === filter.key ? (
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      style={styles.timeFilterGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.timeFilterTextActive}>
                        {filter.label}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.timeFilterText}>{filter.label}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {!statisticsData && !isLoading && (
            <View style={styles.noDataContainer}>
              <BarChart3 size={64} color="#BDC3C7" />
              <Text style={styles.noDataText}>
                {t("statistics.noDataMessage") || "No data available"}
              </Text>
            </View>
          )}

          {statisticsData && (
            <>
              {renderMealCompletionStatus()}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("statistics.data_visualization") || "Data Visualization"}
                </Text>

                <ChartNavigation
                  charts={availableCharts}
                  activeChart={activeChart}
                  onChartChange={setActiveChart}
                />

                {renderActiveChart()}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("statistics.gamification") || "Gamification"}
                </Text>
                <View style={styles.gamificationContainer}>
                  <View style={styles.levelContainer}>
                    <View style={styles.levelInfo}>
                      <LinearGradient
                        colors={["#FEF3C7", "#FCD34D"]}
                        style={styles.levelIcon}
                      >
                        <Crown size={36} color="#F59E0B" />
                      </LinearGradient>
                      <View style={styles.levelDetails}>
                        <Text style={styles.levelText}>
                          {t("statistics.level") || "Level"}{" "}
                          {user?.level}
                        </Text>
                        <Text style={styles.xpText}>
                          {user?.total_points?.toString()} /{" "}
                          {gamificationStats.nextLevelXP}{" "}
                          {t("statistics.xp") || "XP"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.xpProgress}>
                      <View style={styles.xpProgressBg}>
                        <LinearGradient
                          colors={["#F59E0B", "#FBBF24"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.xpProgressFill,
                            { width: `${gamificationStats.xpProgress}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.xpToNext}>
                        {gamificationStats.xpToNext}{" "}
                        {t("statistics.next_level") || "XP to next level"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.gamificationStats}>
                    <View style={styles.gamificationStatItem}>
                      <View
                        style={[
                          styles.gamificationStatIconBg,
                          { backgroundColor: "#FEE2E2" },
                        ]}
                      >
                        <Flame size={22} color="#EF4444" />
                      </View>
                      <Text style={styles.gamificationStatValue}>
                        {gamificationStats.dailyStreak}
                      </Text>
                      <Text
                        style={styles.gamificationStatLabel}
                        numberOfLines={2}
                      >
                        {t("statistics.daily_streak") || "Daily Streak"}
                      </Text>
                    </View>
                    <View style={styles.gamificationStatItem}>
                      <View
                        style={[
                          styles.gamificationStatIconBg,
                          { backgroundColor: "#DBEAFE" },
                        ]}
                      >
                        <Calendar size={22} color="#3B82F6" />
                      </View>
                      <Text style={styles.gamificationStatValue}>
                        {gamificationStats.weeklyStreak}
                      </Text>
                      <Text
                        style={styles.gamificationStatLabel}
                        numberOfLines={2}
                      >
                        {t("statistics.weekly_streak") || "Weekly Streak"}
                      </Text>
                    </View>
                    <View style={styles.gamificationStatItem}>
                      <View
                        style={[
                          styles.gamificationStatIconBg,
                          { backgroundColor: "#FEF3C7" },
                        ]}
                      >
                        <Star size={22} color="#F59E0B" />
                      </View>
                      <Text style={styles.gamificationStatValue}>
                        {gamificationStats.perfectDays}
                      </Text>
                      <Text
                        style={styles.gamificationStatLabel}
                        numberOfLines={2}
                      >
                        {t("statistics.perfect_days") || "Perfect Days"}
                      </Text>
                    </View>
                    <View style={styles.gamificationStatItem}>
                      <View
                        style={[
                          styles.gamificationStatIconBg,
                          { backgroundColor: "#D1FAE5" },
                        ]}
                      >
                        <Trophy size={22} color="#10B981" />
                      </View>
                      <Text style={styles.gamificationStatValue}>
                        {gamificationStats.totalPoints.toLocaleString()}
                      </Text>
                      <Text
                        style={styles.gamificationStatLabel}
                        numberOfLines={2}
                      >
                        {t("statistics.total_points") || "Total Points"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <Animated.View
                entering={FadeInDown.delay(700)}
                style={styles.section}
              >
                <AchievementsSection
                  achievements={achievements}
                  period={"today"}
                />
              </Animated.View>
              <Animated.View
                entering={FadeInDown.delay(700)}
                style={styles.section}
              >
                {/* AI Recommendations Section - Only for GOLD/PLATINUM users */}
                {user?.subscription_type !== "FREE" && (
                  <AIRecommendationsSection
                    recommendations={aiRecommendations}
                    isLoading={isLoadingRecommendations}
                    onRefresh={fetchAIRecommendations}
                    language={language}
                  />
                )}
              </Animated.View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("statistics.progress_overview") || "Progress Overview"}
                </Text>
                <View style={styles.progressOverviewContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.progressStatsGrid}>
                      <View style={styles.progressStatItem}>
                        <View
                          style={[
                            styles.progressStatIcon,
                            { backgroundColor: "#D1FAE5" },
                          ]}
                        >
                          <CheckCircle size={24} color="#22C55E" />
                        </View>
                        <Text style={styles.progressStatValue}>
                          {progressStats.successfulDays}/
                          {progressStats.totalDays}
                        </Text>
                        <Text
                          style={styles.progressStatLabel}
                          numberOfLines={2}
                        >
                          {t("statistics.successful_days") || "Successful Days"}
                        </Text>
                      </View>

                      <View style={styles.progressStatItem}>
                        <View
                          style={[
                            styles.progressStatIcon,
                            { backgroundColor: "#DBEAFE" },
                          ]}
                        >
                          <Target size={24} color="#3B82F6" />
                        </View>
                        <Text style={styles.progressStatValue}>
                          {progressStats.averageCompletion}%
                        </Text>
                        <Text
                          style={styles.progressStatLabel}
                          numberOfLines={2}
                        >
                          {t("statistics.average_completion") ||
                            "Average Completion"}
                        </Text>
                      </View>

                      <View style={styles.progressStatItem}>
                        <View
                          style={[
                            styles.progressStatIcon,
                            { backgroundColor: "#FEF3C7" },
                          ]}
                        >
                          <Award size={24} color="#F59E0B" />
                        </View>
                        <Text style={styles.progressStatValue}>
                          {progressStats.bestStreak}
                        </Text>
                        <Text
                          style={styles.progressStatLabel}
                          numberOfLines={2}
                        >
                          {t("statistics.best_streak") || "Best Streak"}
                        </Text>
                      </View>

                      <View style={styles.progressStatItem}>
                        <View
                          style={[
                            styles.progressStatIcon,
                            { backgroundColor: "#FEE2E2" },
                          ]}
                        >
                          <Trophy size={24} color="#EF4444" />
                        </View>
                        <Text style={styles.progressStatValue}>
                          {progressStats.currentStreak}
                        </Text>
                        <Text
                          style={styles.progressStatLabel}
                          numberOfLines={2}
                        >
                          {t("statistics.current_streak") || "Current Streak"}
                        </Text>
                      </View>
                    </View>
                  </ScrollView>

                  <View style={styles.nutritionAverages}>
                    <Text style={styles.nutritionAveragesTitle}>
                      {language === "he"
                        ? "ממוצעים תזונתיים"
                        : "Nutrition Averages"}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <View style={styles.nutritionAveragesGrid}>
                        <View style={styles.nutritionAverage}>
                          <View
                            style={[
                              styles.nutritionAverageIconBg,
                              { backgroundColor: "#FEE2E2" },
                            ]}
                          >
                            <Flame size={18} color="#EF4444" />
                          </View>
                          <Text style={styles.nutritionAverageValue}>
                            {progressStats.averages.calories}
                          </Text>
                          <Text style={styles.nutritionAverageLabel}>
                            {t("statistics.kcal") || "kcal"}
                          </Text>
                        </View>
                        <View style={styles.nutritionAverage}>
                          <View
                            style={[
                              styles.nutritionAverageIconBg,
                              { backgroundColor: "#EDE9FE" },
                            ]}
                          >
                            <Zap size={18} color="#8B5CF6" />
                          </View>
                          <Text style={styles.nutritionAverageValue}>
                            {progressStats.averages.protein}
                          </Text>
                          <Text style={styles.nutritionAverageLabel}>
                            {t("statistics.g") || "g"}
                          </Text>
                        </View>
                        <View style={styles.nutritionAverage}>
                          <View
                            style={[
                              styles.nutritionAverageIconBg,
                              { backgroundColor: "#FEF3C7" },
                            ]}
                          >
                            <Wheat size={18} color="#F59E0B" />
                          </View>
                          <Text style={styles.nutritionAverageValue}>
                            {progressStats.averages.carbs}
                          </Text>
                          <Text style={styles.nutritionAverageLabel}>
                            {t("statistics.g") || "g"}
                          </Text>
                        </View>
                        <View style={styles.nutritionAverage}>
                          <View
                            style={[
                              styles.nutritionAverageIconBg,
                              { backgroundColor: "#D1FAE5" },
                            ]}
                          >
                            <Fish size={18} color="#10B981" />
                          </View>
                          <Text style={styles.nutritionAverageValue}>
                            {progressStats.averages.fats}
                          </Text>
                          <Text style={styles.nutritionAverageLabel}>
                            {t("statistics.g") || "g"}
                          </Text>
                        </View>
                        <View style={styles.nutritionAverage}>
                          <View
                            style={[
                              styles.nutritionAverageIconBg,
                              { backgroundColor: "#DBEAFE" },
                            ]}
                          >
                            <Droplets size={18} color="#3B82F6" />
                          </View>
                          <Text style={styles.nutritionAverageValue}>
                            {progressStats.averages.water}
                          </Text>
                          <Text style={styles.nutritionAverageLabel}>
                            {t("statistics.ml") || "ml"}
                          </Text>
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </View>

              {categorizedMetrics.macros.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {t("statistics.macronutrients") || "Macronutrients"}
                  </Text>
                  <View style={styles.metricsGrid}>
                    {categorizedMetrics.macros.map(renderMetricCard)}
                  </View>
                </View>
              )}

              {categorizedMetrics.micros.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {t("statistics.micronutrients") || "Micronutrients"}
                  </Text>
                  <View style={styles.metricsGrid}>
                    {categorizedMetrics.micros.map(renderMetricCard)}
                  </View>
                </View>
              )}

              {categorizedMetrics.lifestyle.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {t("statistics.lifestyle") || "Lifestyle"}
                  </Text>
                  <View style={styles.metricsGrid}>
                    {categorizedMetrics.lifestyle.map(renderMetricCard)}
                  </View>
                </View>
              )}
            </>
          )}

          <Modal
            visible={showAchievements}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setShowAchievements(false)}
                  style={styles.modalCloseButton}
                  activeOpacity={0.7}
                >
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {t("statistics.achievements") || "Achievements"}
                </Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView style={styles.modalContent}>
                {achievements.map((achievement) => (
                  <View
                    key={achievement.id}
                    style={[
                      styles.achievementCard,
                      { marginBottom: 16, width: "100%" },
                      {
                        backgroundColor: getAchievementBackgroundColor(
                          achievement.rarity,
                          achievement.unlocked
                        ),
                        borderWidth: 1.5,
                        borderColor: achievement.unlocked
                          ? `${achievement.color}40`
                          : "#E5E7EB",
                      },
                    ]}
                  >
                    <View style={styles.achievementContent}>
                      <View
                        style={[
                          styles.achievementIconContainer,
                          {
                            backgroundColor: achievement.unlocked
                              ? `${achievement.color}20`
                              : "#F3F4F6",
                          },
                        ]}
                      >
                        {getAchievementIcon(
                          achievement.icon,
                          32,
                          achievement.unlocked ? achievement.color : "#9CA3AF"
                        )}
                      </View>

                      <View style={styles.achievementDetails}>
                        <View style={styles.achievementHeader}>
                          <Text
                            style={[
                              styles.achievementTitle,
                              {
                                color: achievement.unlocked
                                  ? "#111827"
                                  : "#6B7280",
                              },
                            ]}
                            numberOfLines={2}
                          >
                            {typeof achievement.title === "object"
                              ? achievement.title.en
                              : achievement.title}
                          </Text>
                          <View
                            style={[
                              styles.rarityBadge,
                              {
                                backgroundColor: achievement.unlocked
                                  ? `${achievement.color}20`
                                  : "#F3F4F6",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.rarityText,
                                {
                                  color: achievement.unlocked
                                    ? achievement.color
                                    : "#6B7280",
                                },
                              ]}
                            >
                              {achievement.rarity}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.achievementDescription,
                            {
                              color: achievement.unlocked
                                ? "#374151"
                                : "#9CA3AF",
                            },
                          ]}
                          numberOfLines={3}
                        >
                          {typeof achievement.description === "object"
                            ? achievement.description.en
                            : achievement.description}
                        </Text>

                        <View style={styles.achievementProgress}>
                          <View style={styles.progressBarContainer}>
                            <View style={styles.progressBarBg}>
                              <LinearGradient
                                colors={
                                  achievement.unlocked
                                    ? [
                                        achievement.color,
                                        `${achievement.color}CC`,
                                      ]
                                    : ["#D1D5DB", "#E5E7EB"]
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[
                                  styles.progressBarFill,
                                  {
                                    width: `${
                                      (achievement.progress /
                                        (achievement.maxProgress || 1)) *
                                      100
                                    }%`,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.progressText}>
                              {achievement.progress}/
                              {achievement.maxProgress || 1}
                            </Text>
                          </View>

                          <View style={styles.xpRewardContainer}>
                            <Sparkles
                              size={16}
                              color={
                                achievement.unlocked
                                  ? achievement.color
                                  : "#9CA3AF"
                              }
                            />
                            <Text
                              style={[
                                styles.xpRewardText,
                                {
                                  color: achievement.unlocked
                                    ? achievement.color
                                    : "#9CA3AF",
                                },
                              ]}
                            >
                              +{achievement.xpReward} XP
                            </Text>
                          </View>
                        </View>
                      </View>

                      {achievement.unlocked && (
                        <View style={styles.unlockedBadge}>
                          <CheckCircle size={24} color={achievement.color} />
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </SafeAreaView>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  modernHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#FFFFFF",
    margin: 20,
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  errorText: {
    fontSize: 17,
    color: "#64748B",
    textAlign: "center",
    marginVertical: 10,
    fontWeight: "600",
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  retryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    backgroundColor: "#FFFFFF",
    margin: 20,
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#1E293B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  noDataText: {
    marginTop: 24,
    fontSize: 18,
    color: "#64748B",
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 26,
    letterSpacing: -0.2,
  },

  noChartDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noChartDataText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  timeFilterContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 24,
  },
  timeFilter: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#1E293B",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  timeFilterButton: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  timeFilterButtonActive: {},
  timeFilterGradient: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 20,
  },
  timeFilterText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    paddingVertical: 14,
    letterSpacing: -0.2,
  },
  timeFilterTextActive: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },

  mealCompletionCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#1E293B",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  mealCompletionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  mealCompletionIcon: {
    marginRight: 12,
  },
  mealCompletionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  mealCompletionContent: {
    alignItems: "center",
    gap: 20,
  },
  mealCompletionText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  mealCompletionSubtext: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  mealCompletionMessage: {
    fontSize: 15,
    color: "#64748B",
    fontStyle: "italic",
    textAlign: "center",
    fontWeight: "500",
    letterSpacing: -0.2,
  },

  chartNavigation: {
    marginBottom: 20,
  },
  chartNavButtons: {
    flexDirection: "row",
    gap: 12,
  },
  chartNavButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    minWidth: 110,
  },
  chartNavButtonActive: {
    backgroundColor: "#10B981",
    ...Platform.select({
      ios: {
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  chartNavButtonDisabled: {
    opacity: 0.5,
  },
  chartNavButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  chartNavButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  chartNavButtonTextDisabled: {
    color: "#9CA3AF",
  },

  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 24,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  chartXLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 40,
    marginTop: 12,
  },
  chartXLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  macroLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 20,
    gap: 12,
  },
  macroLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
  },
  macroLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  macroLegendText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  section: {
    paddingHorizontal: 5,
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 20,
    letterSpacing: -0.5,
  },

  gamificationContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#1E293B",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  levelContainer: {
    marginBottom: 28,
  },
  levelInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  levelIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  levelDetails: {
    flex: 1,
  },
  levelText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    letterSpacing: -0.7,
  },
  xpText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: -0.2,
  },
  xpProgress: {
    gap: 12,
  },
  xpProgressBg: {
    height: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    overflow: "hidden",
  },
  xpProgressFill: {
    height: "100%",
    borderRadius: 6,
  },
  xpToNext: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.2,
  },

  gamificationStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  gamificationStatItem: {
    alignItems: "center",
    paddingHorizontal: 8,
    flex: 1,
  },
  gamificationStatIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  gamificationStatValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  gamificationStatLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.2,
  },

  achievementsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  viewAllButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#D1FAE5",
    borderRadius: 16,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#10B981",
    letterSpacing: -0.2,
  },

  achievementsContainer: {
    flexDirection: "row",
    gap: 16,
  },
  achievementCard: {
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
    width: width * 0.8,
    minWidth: 300,
    maxWidth: 400,
  },
  achievementContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  achievementIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  achievementDetails: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  achievementTitle: {
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 12,
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  achievementDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  achievementProgress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressBarContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: -0.2,
  },
  xpRewardContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  xpRewardText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  unlockedBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  progressOverviewContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#1E293B",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  progressStatsGrid: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 28,
  },
  progressStatItem: {
    alignItems: "center",
    paddingHorizontal: 16,
    minWidth: 110,
  },
  progressStatIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  progressStatValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  progressStatLabel: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  nutritionAverages: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 28,
  },
  nutritionAveragesTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  nutritionAveragesGrid: {
    flexDirection: "row",
    gap: 16,
  },
  nutritionAverage: {
    alignItems: "center",
    paddingHorizontal: 16,
    minWidth: 90,
  },
  nutritionAverageIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  nutritionAverageValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  nutritionAverageLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  metricsGrid: {
    gap: 16,
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  metricCardContent: {
    padding: 24,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  metricIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  metricInfo: {
    flex: 1,
  },
  metricName: {
    fontSize: 19,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  metricStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricStatusText: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize",
    letterSpacing: -0.2,
  },
  metricTrend: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: 65,
  },
  metricTrendText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 4,
    letterSpacing: -0.2,
  },
  metricValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  metricCurrentValue: {
    flex: 1,
  },
  metricValueText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    letterSpacing: -0.7,
  },
  metricTargetText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  metricPercentage: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
    minWidth: 90,
  },
  metricPercentageText: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  metricProgress: {
    marginBottom: 16,
  },
  metricProgressBg: {
    height: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    overflow: "hidden",
  },
  metricProgressFill: {
    height: "100%",
    borderRadius: 6,
  },
  metricRecommendation: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
  },
  metricRecommendationText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginLeft: 12,
    flex: 1,
    letterSpacing: -0.2,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#1E293B",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
});
