import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ImageBackground,
} from "react-native";
import { Heart, ArrowLeft, Share2, Flame } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import Svg, { Circle } from "react-native-svg";

const { width, height } = Dimensions.get("window");
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

interface AnalysisResultsProps {
  imageUri: string;
  mealName: string;
  nutrition: NutritionData;
  estimatedPrice?: number;
  onBack?: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  imageUri,
  mealName,
  nutrition,
  estimatedPrice,
  onBack,
}) => {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Progress animations for circular charts
  const proteinProgress = useRef(new Animated.Value(0)).current;
  const carbsProgress = useRef(new Animated.Value(0)).current;
  const fatProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate progress circles with delay
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(proteinProgress, {
          toValue: proteinPercent / 100,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(carbsProgress, {
          toValue: carbsPercent / 100,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(fatProgress, {
          toValue: fatPercent / 100,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);
  }, []);

  const totalMacros = nutrition.protein + nutrition.carbs + nutrition.fat;
  const proteinPercent =
    totalMacros > 0 ? Math.round((nutrition.protein / totalMacros) * 100) : 0;
  const carbsPercent =
    totalMacros > 0 ? Math.round((nutrition.carbs / totalMacros) * 100) : 0;
  const fatPercent =
    totalMacros > 0 ? Math.round((nutrition.fat / totalMacros) * 100) : 0;

  // Macro data for carousel
  const macrosData = [
    {
      id: "protein",
      progress: proteinProgress,
      color: "#6366F1",
      percentage: proteinPercent,
      label: t("camera.analysis.protein"),
      value: `${nutrition.protein}g`,
    },
    {
      id: "carbs",
      progress: carbsProgress,
      color: "#10B981",
      percentage: carbsPercent,
      label: t("camera.analysis.carbs"),
      value: `${nutrition.carbs}g`,
    },
    {
      id: "fat",
      progress: fatProgress,
      color: "#F97316",
      percentage: fatPercent,
      label: t("camera.analysis.fat"),
      value: `${nutrition.fat}g`,
    },
  ];

  const CircularProgress = ({
    progress,
    size = 140,
    strokeWidth = 12,
    color = "#6366F1",
    percentage,
    label,
    value,
  }: any) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [circumference, 0],
    });

    return (
      <View style={styles.circularContainer}>
        <View style={styles.circularWrapper}>
          <Svg width={size} height={size}>
            {/* Background Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress Circle */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          <View style={styles.circularContent}>
            <Text style={styles.circularPercentage}>{percentage}%</Text>
            <Text style={styles.circularValue}>{value}</Text>
          </View>
        </View>
        <Text style={styles.circularLabel}>{label}</Text>
      </View>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background Image with Blur Effect */}
      <ImageBackground
        source={{ uri: imageUri }}
        style={styles.backgroundImage}
        blurRadius={50}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.85)", "rgba(0,0,0,0.95)"]}
          style={styles.backgroundOverlay}
        />
      </ImageBackground>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        {/* Hero Image Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.heroImage} />

            <LinearGradient
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.9)"]}
              locations={[0, 0.5, 1]}
              style={styles.heroGradient}
            />
          </View>

          {/* Top Navigation */}
          <View style={styles.topNav}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <BlurView intensity={40} tint="dark" style={styles.navBlur}>
                <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setIsFavorite(!isFavorite)}
              activeOpacity={0.7}
            >
              <BlurView intensity={40} tint="dark" style={styles.navBlur}>
                <Heart
                  size={24}
                  color={isFavorite ? "#EF4444" : "#FFF"}
                  strokeWidth={2.5}
                  fill={isFavorite ? "#EF4444" : "none"}
                />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Meal Name */}
          <View style={styles.mealNameContainer}>
            <BlurView intensity={50} tint="dark" style={styles.mealNameBlur}>
              <Text style={styles.mealName} numberOfLines={2}>
                {mealName}
              </Text>
            </BlurView>
          </View>
        </Animated.View>

        {/* Main Content Card - Glassmorphic */}
        <Animated.View
          style={[
            styles.contentCardWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <BlurView intensity={70} tint="dark" style={styles.contentCard}>
            {/* Calorie Section */}
            <View style={styles.calorieSection}>
              <View style={styles.calorieLabelContainer}>
                <Text style={styles.calorieLabel}>
                  {t("camera.analysis.totalCalories")}
                </Text>
              </View>

              <View style={styles.calorieDisplay}>
                <View style={styles.calorieLeft}>
                  <Text style={styles.calorieNumber}>{nutrition.calories}</Text>
                  <Text style={styles.calorieUnit}>
                    {t("camera.analysis.kcal")}
                  </Text>
                </View>

                {/* Calorie Circular Progress */}
                <View style={styles.calorieChartContainer}>
                  <Svg width={120} height={120}>
                    {/* Background */}
                    <Circle
                      cx={60}
                      cy={60}
                      r={50}
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth={12}
                      fill="none"
                    />
                    {/* Protein - Blue */}
                    <AnimatedCircle
                      cx={60}
                      cy={60}
                      r={50}
                      stroke="#6366F1"
                      strokeWidth={12}
                      fill="none"
                      strokeDasharray={`${(314 * proteinPercent) / 100} ${314}`}
                      strokeLinecap="round"
                      rotation="-90"
                      origin="60, 60"
                    />
                    {/* Fat - Orange */}
                    <AnimatedCircle
                      cx={60}
                      cy={60}
                      r={50}
                      stroke="#F97316"
                      strokeWidth={12}
                      fill="none"
                      strokeDasharray={`${(314 * fatPercent) / 100} ${314}`}
                      strokeDashoffset={-(314 * proteinPercent) / 100}
                      strokeLinecap="round"
                      rotation="-90"
                      origin="60, 60"
                    />
                    {/* Carbs - Green */}
                    <AnimatedCircle
                      cx={60}
                      cy={60}
                      r={50}
                      stroke="#10B981"
                      strokeWidth={12}
                      fill="none"
                      strokeDasharray={`${(314 * carbsPercent) / 100} ${314}`}
                      strokeDashoffset={
                        -(314 * (proteinPercent + fatPercent)) / 100
                      }
                      strokeLinecap="round"
                      rotation="-90"
                      origin="60, 60"
                    />
                  </Svg>
                  <View style={styles.calorieChartCenter}>
                    <View style={styles.fireIcon}>
                      <Flame
                        size={36}
                        color="#FF6B35"
                        strokeWidth={2.5}
                        fill="#FF6B35"
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Macros Carousel Section */}
            <View style={styles.macrosSection}>
              <View style={styles.macrosHeader}>
                <Text style={styles.macrosTitle}>
                  {t("camera.analysis.macronutrients")}
                </Text>
                <Text style={styles.macrosSubtitle}>
                  {t("camera.analysis.swipeToExplore")}
                </Text>
              </View>

              <View style={styles.carouselContainer}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={width - 104}
                  decelerationRate="fast"
                  contentContainerStyle={styles.carouselScrollContent}
                  onScroll={(event) => {
                    const scrollPosition = event.nativeEvent.contentOffset.x;
                    const index = Math.round(scrollPosition / (width - 104));
                    setActiveIndex(index);
                  }}
                  scrollEventThrottle={16}
                  style={styles.carouselScrollView}
                >
                  {macrosData.map((item, index) => (
                    <View key={item.id} style={styles.carouselSlide}>
                      <View
                        style={[
                          styles.macroCard,
                          { borderColor: item.color + "40" },
                        ]}
                      >
                        <View style={styles.macroCardHeader}>
                          <Text style={styles.macroCardLabel}>
                            {item.label}
                          </Text>
                          <View
                            style={[
                              styles.macroColorIndicator,
                              { backgroundColor: item.color },
                            ]}
                          />
                        </View>

                        <View style={styles.macroCardContent}>
                          <View style={styles.circularWrapper}>
                            <Svg width={120} height={120}>
                              <Circle
                                cx={60}
                                cy={60}
                                r={52}
                                stroke="rgba(255,255,255,0.08)"
                                strokeWidth={10}
                                fill="none"
                              />
                              <AnimatedCircle
                                cx={60}
                                cy={60}
                                r={52}
                                stroke={item.color}
                                strokeWidth={10}
                                fill="none"
                                strokeDasharray={`${327} ${327}`}
                                strokeDashoffset={item.progress.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [327, 0],
                                })}
                                strokeLinecap="round"
                                rotation="-90"
                                origin="60, 60"
                              />
                            </Svg>
                            <View style={styles.circularContent}>
                              <Text style={styles.macroCardPercentage}>
                                {item.percentage}%
                              </Text>
                            </View>
                          </View>

                          <View style={styles.macroCardInfo}>
                            <Text style={styles.macroCardValue}>
                              {item.value}
                            </Text>
                            <Text style={styles.macroCardDescription}>
                              {t("camera.analysis.ofTotalMacros")}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Pagination Dots */}
              <View style={styles.paginationContainer}>
                {macrosData.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      activeIndex === index && styles.paginationDotActive,
                      activeIndex === index && {
                        backgroundColor: macrosData[index].color,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Estimated Price Section */}
            {estimatedPrice !== undefined && estimatedPrice > 0 && (
              <View style={styles.priceSection}>
                <View style={styles.priceLabelContainer}>
                  <Text style={styles.priceLabel}>
                    {t("camera.estimated_cost")}
                  </Text>
                </View>
                <View style={styles.priceDisplay}>
                  <Text style={styles.priceCurrency}>₪</Text>
                  <Text style={styles.priceNumber}>
                    {estimatedPrice.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.priceHint}>{t("camera.price_hint")}</Text>
              </View>
            )}
          </BlurView>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  backgroundOverlay: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    height: height * 0.48,
    position: "relative",
    marginBottom: 20,
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topNav: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  navButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  navBlur: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  mealNameContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  mealNameBlur: {
    borderRadius: 24,
    padding: 24,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  mealName: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -1.2,
    lineHeight: 40,
  },
  contentCardWrapper: {
    marginHorizontal: 20,
    marginTop: 0,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  contentCard: {
    borderRadius: 36,
    padding: 32,
    paddingBottom: 36,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  calorieSection: {
    marginBottom: 36,
    paddingBottom: 36,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  calorieLabelContainer: {
    marginBottom: 20,
  },
  calorieLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  calorieDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calorieLeft: {
    flex: 1,
  },
  calorieNumber: {
    fontSize: 68,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -3,
    lineHeight: 72,
  },
  calorieUnit: {
    fontSize: 19,
    fontWeight: "800",
    color: "rgba(255,255,255,0.55)",
    marginTop: 4,
    letterSpacing: 1.2,
  },
  calorieChartContainer: {
    position: "relative",
    width: 120,
    height: 120,
    marginLeft: 20,
  },
  calorieChartCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  fireIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 53, 0.18)",
    borderWidth: 2,
    borderColor: "rgba(255, 107, 53, 0.35)",
  },
  macrosSection: {
    marginBottom: 32,
  },
  macrosHeader: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  macrosTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  macrosSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.5,
  },
  carouselContainer: {
    marginHorizontal: -32,
    paddingHorizontal: 32,
  },
  carouselScrollView: {
    overflow: "visible",
  },
  carouselScrollContent: {
    paddingHorizontal: 0,
    gap: 12,
  },
  carouselSlide: {
    width: width - 104,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  macroCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
  },
  macroCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  macroCardLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  macroColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  macroCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  macroCardInfo: {
    flex: 1,
    marginLeft: 24,
  },
  macroCardValue: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -1.5,
    marginBottom: 4,
  },
  macroCardPercentage: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -1,
  },
  macroCardDescription: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.3,
  },
  circularContainer: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    width: "85%",
    maxWidth: 280,
  },
  circularWrapper: {
    position: "relative",
    width: 120,
    height: 120,
  },
  circularContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  circularPercentage: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -1.2,
  },
  circularValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  circularLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  paginationDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  priceSection: {
    marginTop: 28,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  priceLabelContainer: {
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  priceDisplay: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  priceCurrency: {
    fontSize: 32,
    fontWeight: "800",
    color: "#10B981",
    marginTop: 10,
  },
  priceNumber: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -2,
  },
  priceHint: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
    marginTop: 12,
    letterSpacing: 0.3,
  },
});
