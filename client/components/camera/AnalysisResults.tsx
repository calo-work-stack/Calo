import React, { useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Dimensions, 
  Animated,
  ScrollView 
} from "react-native";
import { Flame, Zap, Droplets, Wheat, Sparkles } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { t } from "i18next";

const { width } = Dimensions.get("window");

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
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  imageUri,
  mealName,
  nutrition,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const totalMacros = nutrition.protein + nutrition.carbs + nutrition.fat;
  const proteinPercent = totalMacros > 0 ? Math.round((nutrition.protein / totalMacros) * 100) : 0;
  const carbsPercent = totalMacros > 0 ? Math.round((nutrition.carbs / totalMacros) * 100) : 0;
  const fatPercent = totalMacros > 0 ? Math.round((nutrition.fat / totalMacros) * 100) : 0;

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Hero Image Section */}
      <Animated.View
        style={[
          styles.heroSection,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} blurRadius={1.5} />
          
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.8)",
              "rgba(0,0,0,0.3)",
              "rgba(0,0,0,0.6)",
              "rgba(0,0,0,0.95)",
            ]}
            locations={[0, 0.3, 0.6, 1]}
            style={styles.imageGradient}
          />

          {/* Floating Success Badge */}
          <View style={styles.successBadge}>
            <BlurView intensity={80} tint="dark" style={styles.badgeBlur}>
              <Sparkles size={16} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.badgeText}>Analysis Complete</Text>
            </BlurView>
          </View>

          {/* Meal Name */}
          <View style={styles.mealNameContainer}>
            <Text style={styles.mealName}>{mealName}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Calorie Hero Card */}
      <Animated.View
        style={[
          styles.calorieHero,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <BlurView intensity={100} tint="dark" style={styles.calorieCard}>
          <LinearGradient
            colors={["rgba(16,185,129,0.2)", "rgba(5,150,105,0.1)"]}
            style={styles.calorieGradient}
          />
          
          <View style={styles.calorieIconWrapper}>
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.calorieIcon}
            >
              <Flame size={36} color="#FFF" strokeWidth={2} fill="#FFF" />
            </LinearGradient>
          </View>

          <View style={styles.calorieContent}>
            <Text style={styles.calorieValue}>{nutrition.calories}</Text>
            <Text style={styles.calorieLabel}>Total Calories</Text>
          </View>
        </BlurView>
      </Animated.View>

      {/* Macro Distribution */}
      <Animated.View
        style={[
          styles.macroSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Macronutrients</Text>
          <View style={styles.macroBar}>
            <View style={[styles.macroSegment, { 
              width: `${proteinPercent}%`,
              backgroundColor: "#3B82F6" 
            }]} />
            <View style={[styles.macroSegment, { 
              width: `${carbsPercent}%`,
              backgroundColor: "#F59E0B" 
            }]} />
            <View style={[styles.macroSegment, { 
              width: `${fatPercent}%`,
              backgroundColor: "#EF4444" 
            }]} />
          </View>
        </View>

        <View style={styles.macroGrid}>
          {/* Protein */}
          <View style={styles.macroItem}>
            <View style={[styles.macroIconBg, { backgroundColor: "#EFF6FF" }]}>
              <Zap size={24} color="#3B82F6" strokeWidth={2.5} />
            </View>
            <View style={styles.macroInfo}>
              <Text style={styles.macroValue}>{nutrition.protein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={[styles.percentBadge, { backgroundColor: "#EFF6FF" }]}>
              <Text style={[styles.percentText, { color: "#3B82F6" }]}>
                {proteinPercent}%
              </Text>
            </View>
          </View>

          {/* Carbs */}
          <View style={styles.macroItem}>
            <View style={[styles.macroIconBg, { backgroundColor: "#FFFBEB" }]}>
              <Wheat size={24} color="#F59E0B" strokeWidth={2.5} />
            </View>
            <View style={styles.macroInfo}>
              <Text style={styles.macroValue}>{nutrition.carbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={[styles.percentBadge, { backgroundColor: "#FFFBEB" }]}>
              <Text style={[styles.percentText, { color: "#F59E0B" }]}>
                {carbsPercent}%
              </Text>
            </View>
          </View>

          {/* Fat */}
          <View style={styles.macroItem}>
            <View style={[styles.macroIconBg, { backgroundColor: "#FEF2F2" }]}>
              <Droplets size={24} color="#EF4444" strokeWidth={2.5} />
            </View>
            <View style={styles.macroInfo}>
              <Text style={styles.macroValue}>{nutrition.fat}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
            <View style={[styles.percentBadge, { backgroundColor: "#FEF2F2" }]}>
              <Text style={[styles.percentText, { color: "#EF4444" }]}>
                {fatPercent}%
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Additional Details */}
      {(nutrition.fiber > 0 || nutrition.sugar > 0 || nutrition.sodium > 0) && (
        <Animated.View
          style={[
            styles.detailsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Additional Info</Text>
          
          <View style={styles.detailsGrid}>
            {nutrition.fiber > 0 && (
              <View style={styles.detailCard}>
                <Text style={styles.detailValue}>{nutrition.fiber}g</Text>
                <Text style={styles.detailLabel}>Fiber</Text>
              </View>
            )}
            
            {nutrition.sugar > 0 && (
              <View style={styles.detailCard}>
                <Text style={styles.detailValue}>{nutrition.sugar}g</Text>
                <Text style={styles.detailLabel}>Sugar</Text>
              </View>
            )}
            
            {nutrition.sodium > 0 && (
              <View style={styles.detailCard}>
                <Text style={styles.detailValue}>{nutrition.sodium}mg</Text>
                <Text style={styles.detailLabel}>Sodium</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: -60,
  },
  imageContainer: {
    width: "100%",
    height: 400,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  successBadge: {
    position: "absolute",
    top: 60,
    right: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  badgeBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
  },
  mealNameContainer: {
    position: "absolute",
    bottom: 30,
    left: 24,
    right: 24,
  },
  mealName: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -1,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  calorieHero: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 28,
    overflow: "hidden",
  },
  calorieCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  calorieGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  calorieIconWrapper: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 16,
  },
  calorieIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  calorieContent: {
    alignItems: "center",
    paddingBottom: 32,
  },
  calorieValue: {
    fontSize: 56,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -2,
    marginBottom: 4,
  },
  calorieLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  macroSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  macroBar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  macroSegment: {
    height: "100%",
  },
  macroGrid: {
    gap: 12,
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  macroIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  macroInfo: {
    flex: 1,
  },
  macroValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
  },
  percentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  detailsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    minWidth: "30%",
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  detailValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
  },
});