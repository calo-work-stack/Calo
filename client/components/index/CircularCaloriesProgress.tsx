import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Droplets, Flame, TrendingUp } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 400;

interface NutritionData {
  calories: number;
  targetCalories: number;
  burnedCalories?: number;
  protein: number;
  targetProtein: number;
  carbs: number;
  targetCarbs: number;
  fat: number;
  targetFat: number;
  fiber?: number;
  targetFiber?: number;
  sugar?: number;
  targetSugar?: number;
  sodium?: number;
  targetSodium?: number;
  cholesterol?: number;
  targetCholesterol?: number;
  saturatedFat?: number;
  targetSaturatedFat?: number;
  vitaminA?: number;
  targetVitaminA?: number;
  vitaminC?: number;
  targetVitaminC?: number;
  calcium?: number;
  targetCalcium?: number;
  iron?: number;
  targetIron?: number;
}

interface CircularCaloriesProgressProps {
  nutrition?: NutritionData;
  calories?: number;
  targetCalories?: number;
  burnedCalories?: number;
  dailyGoals?: {
    protein: number;
    carbs: number;
    fat: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
  };
  waterIntake?: {
    current: number;
    target: number;
    onIncrement?: () => void;
    onDecrement?: () => void;
  };
}

interface NutritionCard {
  title: string;
  value: number;
  target: number;
  unit: string;
  color: string;
  gradient: [string, string];
}

const defaultNutrition: NutritionData = {
  calories: 0,
  targetCalories: 2000,
  burnedCalories: 0,
  protein: 0,
  targetProtein: 150,
  carbs: 0,
  targetCarbs: 225,
  fat: 0,
  targetFat: 67,
};

const CircularCaloriesProgress: React.FC<CircularCaloriesProgressProps> = ({
  nutrition: nutritionProp,
  calories: caloriesProp,
  targetCalories: targetCaloriesProp,
  burnedCalories: burnedCaloriesProp,
  dailyGoals,
  waterIntake,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const nutrition: NutritionData = nutritionProp || {
    calories: caloriesProp ?? defaultNutrition.calories,
    targetCalories: targetCaloriesProp ?? defaultNutrition.targetCalories,
    burnedCalories: burnedCaloriesProp ?? defaultNutrition.burnedCalories,
    protein: dailyGoals?.protein ?? defaultNutrition.protein,
    targetProtein: dailyGoals?.targetProtein ?? defaultNutrition.targetProtein,
    carbs: dailyGoals?.carbs ?? defaultNutrition.carbs,
    targetCarbs: dailyGoals?.targetCarbs ?? defaultNutrition.targetCarbs,
    fat: dailyGoals?.fat ?? defaultNutrition.fat,
    targetFat: dailyGoals?.targetFat ?? defaultNutrition.targetFat,
  };

  const size = isSmallScreen ? 220 : 240;
  const center = size / 2;
  const radius = isSmallScreen ? 85 : 100;
  const strokeWidth = isSmallScreen ? 18 : 20;

  const remainingCalories = Math.max(
    nutrition.targetCalories -
      nutrition.calories +
      (nutrition.burnedCalories || 0),
    0,
  );

  const nutritionCards: NutritionCard[] = [
    {
      title: t("home.nutrition.calories"),
      value: nutrition.calories,
      target: nutrition.targetCalories,
      unit: t("home.nutrition.units.kcal"),
      color: colors.success,
      gradient: [colors.success, colors.primaryContainer],
    },
  ];

  if (waterIntake) {
    nutritionCards.push({
      title: t("home.nutrition.water"),
      value: waterIntake.current,
      target: waterIntake.target,
      unit: t("home.nutrition.units.cups"),
      color: colors.primary,
      gradient: [colors.primary, colors.primaryContainer],
    });
  }

  nutritionCards.push(
    {
      title: t("home.nutrition.protein"),
      value: nutrition.protein,
      target: nutrition.targetProtein,
      unit: t("home.nutrition.units.grams"),
      color: "#8B5CF6",
      gradient: ["#A78BFA", "#8B5CF6"],
    },
    {
      title: t("home.nutrition.carbs"),
      value: nutrition.carbs,
      target: nutrition.targetCarbs,
      unit: t("home.nutrition.units.grams"),
      color: "#3B82F6",
      gradient: ["#60A5FA", "#3B82F6"],
    },
    {
      title: t("home.nutrition.fat"),
      value: nutrition.fat,
      target: nutrition.targetFat,
      unit: t("home.nutrition.units.grams"),
      color: colors.warning,
      gradient: ["#FBBF24", colors.warning],
    },
  );

  if (nutrition.fiber !== undefined && nutrition.targetFiber !== undefined) {
    nutritionCards.push({
      title: t("home.nutrition.fiber"),
      value: nutrition.fiber,
      target: nutrition.targetFiber,
      unit: t("home.nutrition.units.grams"),
      color: "#14B8A6",
      gradient: ["#5EEAD4", "#14B8A6"],
    });
  }

  if (nutrition.sugar !== undefined && nutrition.targetSugar !== undefined) {
    nutritionCards.push({
      title: t("home.nutrition.sugar"),
      value: nutrition.sugar,
      target: nutrition.targetSugar,
      unit: t("home.nutrition.units.grams"),
      color: "#EC4899",
      gradient: ["#F9A8D4", "#EC4899"],
    });
  }

  if (nutrition.sodium !== undefined && nutrition.targetSodium !== undefined) {
    nutritionCards.push({
      title: t("home.nutrition.sodium"),
      value: nutrition.sodium,
      target: nutrition.targetSodium,
      unit: t("home.nutrition.units.mg"),
      color: colors.error,
      gradient: [colors.error, colors.destructive],
    });
  }

  if (
    nutrition.saturatedFat !== undefined &&
    nutrition.targetSaturatedFat !== undefined
  ) {
    nutritionCards.push({
      title: t("home.nutrition.saturatedFat"),
      value: nutrition.saturatedFat,
      target: nutrition.targetSaturatedFat,
      unit: t("home.nutrition.units.grams"),
      color: "#F97316",
      gradient: ["#FB923C", "#F97316"],
    });
  }

  if (
    nutrition.cholesterol !== undefined &&
    nutrition.targetCholesterol !== undefined
  ) {
    nutritionCards.push({
      title: t("home.nutrition.cholesterol"),
      value: nutrition.cholesterol,
      target: nutrition.targetCholesterol,
      unit: t("home.nutrition.units.mg"),
      color: "#6366F1",
      gradient: ["#818CF8", "#6366F1"],
    });
  }

  if (
    nutrition.vitaminA !== undefined &&
    nutrition.targetVitaminA !== undefined
  ) {
    nutritionCards.push({
      title: t("home.nutrition.vitaminA"),
      value: nutrition.vitaminA,
      target: nutrition.targetVitaminA,
      unit: "%",
      color: colors.warning,
      gradient: ["#FBBF24", colors.warning],
    });
  }

  if (
    nutrition.vitaminC !== undefined &&
    nutrition.targetVitaminC !== undefined
  ) {
    nutritionCards.push({
      title: t("home.nutrition.vitaminC"),
      value: nutrition.vitaminC,
      target: nutrition.targetVitaminC,
      unit: "%",
      color: colors.success,
      gradient: [colors.success, colors.primaryContainer],
    });
  }

  if (
    nutrition.calcium !== undefined &&
    nutrition.targetCalcium !== undefined
  ) {
    nutritionCards.push({
      title: t("home.nutrition.calcium"),
      value: nutrition.calcium,
      target: nutrition.targetCalcium,
      unit: "%",
      color: "#0EA5E9",
      gradient: ["#38BDF8", "#0EA5E9"],
    });
  }

  if (nutrition.iron !== undefined && nutrition.targetIron !== undefined) {
    nutritionCards.push({
      title: t("home.nutrition.iron"),
      value: nutrition.iron,
      target: nutrition.targetIron,
      unit: "%",
      color: colors.textSecondary,
      gradient: [colors.textSecondary, colors.textTertiary],
    });
  }

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
    setActiveIndex(index);
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: isDark ? colors.border + "40" : colors.border + "60",
    },
    pagination: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 20,
      gap: 8,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? colors.muted + "60" : colors.muted,
      opacity: 0.5,
    },
    paginationDotActive: {
      width: 32,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      opacity: 1,
    },
    additionalNutrition: {
      paddingHorizontal: 24,
      paddingBottom: 28,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
      letterSpacing: -0.3,
    },
    nutritionList: {
      gap: 16,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="center"
      >
        {nutritionCards.map((card, index) => (
          <NutritionCardView
            key={card.title}
            card={card}
            size={size}
            center={center}
            radius={radius}
            strokeWidth={strokeWidth}
            isCalories={index === 0}
            isWater={card.title === t("home.nutrition.water")}
            burnedCalories={nutrition.burnedCalories || 0}
            remainingCalories={remainingCalories}
            colors={colors}
            isDark={isDark}
            t={t}
          />
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {nutritionCards.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => scrollToIndex(index)}
            style={[
              styles.paginationDot,
              activeIndex === index && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>

      {nutritionCards.length > 4 && (
        <View style={styles.additionalNutrition}>
          <Text style={styles.sectionTitle}>
            {t("home.nutrition.additionalNutrition")}
          </Text>
          <View style={styles.nutritionList}>
            {nutritionCards.slice(4).map((card) => (
              <NutritionRow
                key={card.title}
                card={card}
                colors={colors}
                isDark={isDark}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const NutritionCardView: React.FC<{
  card: NutritionCard;
  size: number;
  center: number;
  radius: number;
  strokeWidth: number;
  isCalories: boolean;
  isWater: boolean;
  burnedCalories: number;
  remainingCalories: number;
  colors: any;
  isDark: boolean;
  t: any;
}> = ({
  card,
  size,
  center,
  radius,
  strokeWidth,
  isCalories,
  isWater,
  burnedCalories,
  remainingCalories,
  colors,
  isDark,
  t,
}) => {
  const progress = Math.min((card.value / card.target) * 100, 100);
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (circumference * progress) / 100;
  const remaining = Math.max(card.target - card.value, 0);
  const currentMl = card.value * 250;
  const targetMl = card.target * 250;

  const styles = StyleSheet.create({
    cardContainer: {
      width,
      paddingBottom: 32,
      paddingTop: 20,
    },
    circleSection: {
      marginBottom: 0,
      paddingHorizontal: 24,
    },
    caloriesWrapper: { alignItems: "center" },
    statsRowBottom: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "center",
      marginTop: 24,
      gap: 32,
      paddingHorizontal: 20,
    },
    statColumnBottom: {
      alignItems: "center",
    },
    iconBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    statDivider: {
      width: 1,
      height: 60,
      backgroundColor: isDark ? colors.border + "40" : colors.border + "60",
      marginTop: 8,
    },
    statNumberBottom: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
      letterSpacing: -0.5,
    },
    statLabelBottom: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: "500",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    circleContainer: {
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    centerTextContainer: {
      position: "absolute",
      alignItems: "center",
    },
    centerNumber: {
      fontSize: 40,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
      letterSpacing: -1,
    },
    unitText: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    centerLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "500",
      letterSpacing: 0,
      textAlign: "center",
      maxWidth: 140,
    },
    remainingText: {
      fontSize: 13,
      fontWeight: "600",
      marginTop: 6,
      letterSpacing: 0.2,
    },
    singleCircleContainer: { alignItems: "center" },
    cardTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 24,
      letterSpacing: -0.5,
    },
    progressPercentage: { marginTop: 24 },
    percentageText: {
      fontSize: 18,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    waterHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
      marginBottom: 24,
    },
    waterIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: isDark ? colors.primaryContainer + "40" : "#E3F2FD",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: isDark ? colors.primary + "20" : colors.primary + "15",
    },
    waterSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "600",
      marginTop: 4,
      letterSpacing: 0.2,
    },
  });

  return (
    <View style={styles.cardContainer}>
      <View style={styles.circleSection}>
        {isCalories && (
          <View style={styles.caloriesWrapper}>
            <View style={styles.circleContainer}>
              <Svg width={size} height={size}>
                <Defs>
                  <LinearGradient
                    id={`gradient-${card.title}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor={card.gradient[0]} />
                    <Stop offset="100%" stopColor={card.gradient[1]} />
                  </LinearGradient>
                </Defs>
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={isDark ? colors.border + "30" : colors.border + "50"}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={`url(#gradient-${card.title})`}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${center}, ${center}`}
                />
              </Svg>
              <View style={styles.centerTextContainer}>
                <Text style={styles.centerNumber}>
                  {remainingCalories.toLocaleString()}
                </Text>
                <Text style={styles.centerLabel}>
                  {t("home.nutrition.remaining")}
                </Text>
              </View>
            </View>

            <View style={styles.statsRowBottom}>
              <View style={styles.statColumnBottom}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: colors.emerald500 },
                  ]}
                >
                  <TrendingUp size={12} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <Text style={styles.statNumberBottom}>
                  {card.value.toLocaleString()}
                </Text>
                <Text style={styles.statLabelBottom}>
                  {t("home.nutrition.eaten")}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statColumnBottom}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: colors.warning },
                  ]}
                >
                  <Flame size={12} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <Text style={styles.statNumberBottom}>{burnedCalories}</Text>
                <Text style={styles.statLabelBottom}>
                  {t("home.nutrition.burned")}
                </Text>
              </View>
            </View>
          </View>
        )}

        {isWater && (
          <View style={styles.singleCircleContainer}>
            <View style={styles.waterHeader}>
              <View style={styles.waterIconContainer}>
                <Droplets size={36} color={colors.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.cardTitle}>
                  {t("home.nutrition.waterIntake")}
                </Text>
                <Text style={styles.waterSubtitle}>
                  {currentMl}
                  {t("statistics.ml")} / {targetMl}
                  {t("statistics.ml")}
                </Text>
              </View>
            </View>

            <View style={styles.circleContainer}>
              <Svg width={size} height={size}>
                <Defs>
                  <LinearGradient
                    id={`gradient-${card.title}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor={card.gradient[0]} />
                    <Stop offset="100%" stopColor={card.gradient[1]} />
                  </LinearGradient>
                </Defs>
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={isDark ? colors.border + "30" : colors.border + "50"}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={`url(#gradient-${card.title})`}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${center}, ${center}`}
                />
              </Svg>
              <View style={styles.centerTextContainer}>
                <Text style={styles.centerNumber}>
                  {card.value}
                  <Text style={styles.unitText}>{card.unit}</Text>
                </Text>
                <Text style={styles.centerLabel}>
                  {t("home.nutrition.of")} {card.target} {card.unit}
                </Text>
              </View>
            </View>
          </View>
        )}

        {!isCalories && !isWater && (
          <View style={styles.singleCircleContainer}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <View style={styles.circleContainer}>
              <Svg width={size} height={size}>
                <Defs>
                  <LinearGradient
                    id={`gradient-${card.title}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor={card.gradient[0]} />
                    <Stop offset="100%" stopColor={card.gradient[1]} />
                  </LinearGradient>
                </Defs>
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={isDark ? colors.border + "30" : colors.border + "50"}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={`url(#gradient-${card.title})`}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${center}, ${center}`}
                />
              </Svg>
              <View style={styles.centerTextContainer}>
                <Text style={styles.centerNumber}>
                  {card.value}
                  <Text style={styles.unitText}>{card.unit}</Text>
                </Text>
                <Text style={styles.centerLabel}>
                  {t("home.nutrition.of")} {card.target}
                  {card.unit}
                </Text>
                {remaining > 0 && (
                  <Text style={[styles.remainingText, { color: card.color }]}>
                    {remaining}
                    {card.unit} {t("home.nutrition.left")}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.progressPercentage}>
              <Text style={[styles.percentageText, { color: card.color }]}>
                {progress.toFixed(0)}% {t("home.nutrition.complete")}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const NutritionRow: React.FC<{
  card: NutritionCard;
  colors: any;
  isDark: boolean;
}> = ({ card, colors, isDark }) => {
  const progress = Math.min((card.value / card.target) * 100, 100);

  const styles = StyleSheet.create({
    nutritionRow: { gap: 10 },
    nutritionRowHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    nutritionDot: { width: 8, height: 8, borderRadius: 4 },
    nutritionRowTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
      letterSpacing: 0.1,
    },
    nutritionRowValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      letterSpacing: 0.1,
    },
    nutritionProgressBar: {
      height: 8,
      backgroundColor: isDark ? colors.border + "30" : colors.border + "50",
      borderRadius: 100,
      overflow: "hidden",
    },
    nutritionProgressFill: { height: "100%", borderRadius: 100 },
  });

  return (
    <View style={styles.nutritionRow}>
      <View style={styles.nutritionRowHeader}>
        <View style={[styles.nutritionDot, { backgroundColor: card.color }]} />
        <Text style={styles.nutritionRowTitle}>{card.title}</Text>
        <Text style={styles.nutritionRowValue}>
          {card.value}/{card.target}
          {card.unit}
        </Text>
      </View>
      <View style={styles.nutritionProgressBar}>
        <View
          style={[
            styles.nutritionProgressFill,
            { width: `${progress}%`, backgroundColor: card.color },
          ]}
        />
      </View>
    </View>
  );
};

export default CircularCaloriesProgress;
