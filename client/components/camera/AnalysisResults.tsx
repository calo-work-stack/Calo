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
import { t } from "i18next";
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
  onBack?: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  imageUri,
  mealName,
  nutrition,
  onBack,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [isFavorite, setIsFavorite] = useState(false);

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

  const CircularProgress = ({
    progress,
    size = 100,
    strokeWidth = 10,
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
              stroke="rgba(255,255,255,0.15)"
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background Image with Blur Effect */}
      <ImageBackground
        source={{ uri: imageUri }}
        style={styles.backgroundImage}
        blurRadius={40}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0.85)", "rgba(0,0,0,0.95)"]}
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
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.85)"]}
              locations={[0, 0.6, 1]}
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
              <BlurView intensity={30} tint="dark" style={styles.navBlur}>
                <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setIsFavorite(!isFavorite)}
              activeOpacity={0.7}
            >
              <BlurView intensity={30} tint="dark" style={styles.navBlur}>
                <Heart
                  size={24}
                  color={isFavorite ? "#EF4444" : "#FFF"}
                  strokeWidth={2.5}
                  fill={isFavorite ? "#EF4444" : "none"}
                />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Meal Name - Repositioned with better spacing */}
          <View style={styles.mealNameContainer}>
            <BlurView intensity={40} tint="dark" style={styles.mealNameBlur}>
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
          <BlurView intensity={60} tint="dark" style={styles.contentCard}>
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
                  <Text style={styles.calorieUnit}>{t("camera.analysis.kcal")}</Text>
                </View>

                {/* Calorie Circular Progress */}
                <View style={styles.calorieChartContainer}>
                  <Svg width={110} height={110}>
                    {/* Background */}
                    <Circle
                      cx={55}
                      cy={55}
                      r={46}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth={11}
                      fill="none"
                    />
                    {/* Protein - Blue */}
                    <AnimatedCircle
                      cx={55}
                      cy={55}
                      r={46}
                      stroke="#6366F1"
                      strokeWidth={11}
                      fill="none"
                      strokeDasharray={`${(289 * proteinPercent) / 100} ${289}`}
                      strokeLinecap="round"
                      rotation="-90"
                      origin="55, 55"
                    />
                    {/* Fat - Orange */}
                    <AnimatedCircle
                      cx={55}
                      cy={55}
                      r={46}
                      stroke="#F97316"
                      strokeWidth={11}
                      fill="none"
                      strokeDasharray={`${(289 * fatPercent) / 100} ${289}`}
                      strokeDashoffset={-(289 * proteinPercent) / 100}
                      strokeLinecap="round"
                      rotation="-90"
                      origin="55, 55"
                    />
                    {/* Carbs - Green */}
                    <AnimatedCircle
                      cx={55}
                      cy={55}
                      r={46}
                      stroke="#10B981"
                      strokeWidth={11}
                      fill="none"
                      strokeDasharray={`${(289 * carbsPercent) / 100} ${289}`}
                      strokeDashoffset={
                        -(289 * (proteinPercent + fatPercent)) / 100
                      }
                      strokeLinecap="round"
                      rotation="-90"
                      origin="55, 55"
                    />
                  </Svg>
                  <View style={styles.calorieChartCenter}>
                    <View style={styles.fireIcon}>
                      <Flame
                        size={32}
                        color="#FF6B35"
                        strokeWidth={2.5}
                        fill="#FF6B35"
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Macros Grid */}
            <View style={styles.macrosGrid}>
              <CircularProgress
                progress={proteinProgress}
                size={100}
                strokeWidth={10}
                color="#6366F1"
                percentage={proteinPercent}
                label={t("camera.analysis.protein")}
                value={`${nutrition.protein}g`}
              />

              <CircularProgress
                progress={fatProgress}
                size={100}
                strokeWidth={10}
                color="#F97316"
                percentage={fatPercent}
                label={t("camera.analysis.fat")}
                value={`${nutrition.fat}g`}
              />

              <CircularProgress
                progress={carbsProgress}
                size={100}
                strokeWidth={10}
                color="#10B981"
                percentage={carbsPercent}
                label={t("camera.analysis.carbs")}
                value={`${nutrition.carbs}g`}
              />
            </View>
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
    height: height * 0.5,
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
    borderColor: "rgba(255,255,255,0.15)",
  },
  mealNameContainer: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  mealNameBlur: {
    borderRadius: 20,
    padding: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  mealName: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -1,
    lineHeight: 38,
  },
  contentCardWrapper: {
    marginHorizontal: 20,
    marginTop: 0,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  contentCard: {
    borderRadius: 32,
    padding: 28,
    paddingBottom: 32,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  calorieSection: {
    marginBottom: 32,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  calorieLabelContainer: {
    marginBottom: 18,
  },
  calorieLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.5,
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
    fontSize: 64,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -2.5,
    lineHeight: 68,
  },
  calorieUnit: {
    fontSize: 18,
    fontWeight: "800",
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
    letterSpacing: 1,
  },
  calorieChartContainer: {
    position: "relative",
    width: 110,
    height: 110,
    marginLeft: 16,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 53, 0.15)",
    borderWidth: 2,
    borderColor: "rgba(255, 107, 53, 0.3)",
  },
  macrosGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  circularContainer: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  circularWrapper: {
    position: "relative",
    width: 100,
    height: 100,
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.8,
  },
  circularValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    marginTop: 3,
    letterSpacing: 0.3,
  },
  circularLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "rgba(255,255,255,0.7)",
    marginTop: 14,
    letterSpacing: 0.3,
  },
});
