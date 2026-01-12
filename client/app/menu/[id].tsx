import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Modal,
  Dimensions,
  Share,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  ArrowLeft,
  ChefHat,
  Calendar,
  Clock,
  Star,
  Flame,
  Target,
  Heart,
  Share2,
  ChevronDown,
  ChevronUp,
  Utensils,
  Award,
  DollarSign,
  Info,
  Check,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/src/services/api";
import { DietaryIcons } from "@/components/menu/DietaryIcons";
import { NutritionHabits } from "@/components/menu/NutritionHabits";

const { width: screenWidth } = Dimensions.get("window");

interface Ingredient {
  ingredient_id: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  estimated_cost?: number;
}

interface Meal {
  meal_id: string;
  name: string;
  meal_type: string;
  day_number: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  prep_time_minutes?: number;
  cooking_method?: string;
  instructions?: string;
  ingredients: Ingredient[];
  image_url?: string;
  dietary_tags?: string[];
}

interface MenuDetails {
  menu_id: string;
  title: string;
  description?: string;
  total_calories: number;
  total_protein?: number;
  total_carbs?: number;
  total_fat?: number;
  days_count: number;
  dietary_category?: string;
  estimated_cost?: number;
  prep_time_minutes?: number;
  difficulty_level?: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  meals: Meal[];
}

export default function MenuDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();

  const [menu, setMenu] = useState<MenuDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showStartModal, setShowStartModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (id) {
      loadMenuDetails();
    }
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [id]);

  const loadMenuDetails = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/recommended-menus/${id}`);

      if (response.data.success && response.data.data) {
        setMenu(response.data.data);
        setIsFavorite(response.data.data.is_active);
      }
    } catch (error) {
      console.error("Error loading menu:", error);
      Alert.alert("Error", "Failed to load menu details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMenu = async () => {
    try {
      setIsStarting(true);
      const response = await api.post(`/recommended-menus/${id}/activate`);

      if (response.data.success) {
        setShowStartModal(false);
        Alert.alert(
          "Success!",
          "Menu activated! You can now track your progress.",
          [
            {
              text: "View Active Menu",
              onPress: () => router.push(`/menu/activeMenu?planId=${id}`),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error starting menu:", error);
      Alert.alert("Error", "Failed to start menu");
    } finally {
      setIsStarting(false);
    }
  };

  const handleShare = async () => {
    try {
      const mealCount = menu?.meals.length || 0;
      await Share.share({
        message: `Check out this amazing ${menu?.days_count}-day meal plan: ${menu?.title}! 🍽️\n\nIncludes ${mealCount} delicious meals with ${menu?.total_calories} total calories.\n\nEstimated cost: ₪${menu?.estimated_cost || 0}`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const toggleMealExpanded = (mealId: string) => {
    setExpandedMeal(expandedMeal === mealId ? null : mealId);
  };

  const getMealTypeEmoji = (type: string) => {
    const typeMap: Record<string, string> = {
      BREAKFAST: "🌅",
      LUNCH: "☀️",
      DINNER: "🌙",
      SNACK: "🍎",
      MORNING_SNACK: "🥐",
      AFTERNOON_SNACK: "🍪",
    };
    return typeMap[type] || "🍽️";
  };

  const getMealTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      BREAKFAST: colors.amber500,
      LUNCH: colors.emerald500,
      DINNER: colors.indigo500,
      SNACK: colors.pink500,
      MORNING_SNACK: colors.orange500,
      AFTERNOON_SNACK: colors.purple500,
    };
    return colorMap[type] || colors.gray500;
  };

  const getDifficultyLabel = () => {
    if (!menu?.difficulty_level) return "Easy";
    if (menu.difficulty_level <= 2) return language === "he" ? "קל" : "Easy";
    if (menu.difficulty_level <= 3) return language === "he" ? "בינוני" : "Medium";
    return language === "he" ? "קשה" : "Hard";
  };

  const getDifficultyColor = () => {
    if (!menu?.difficulty_level) return colors.emerald500;
    if (menu.difficulty_level <= 2) return colors.emerald500;
    if (menu.difficulty_level <= 3) return colors.amber500;
    return colors.red500;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>
          {language === "he" ? "טוען תפריט..." : "Loading menu..."}
        </Text>
      </View>
    );
  }

  if (!menu) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {language === "he" ? "תפריט לא נמצא" : "Menu not found"}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.errorButton}>
              {language === "he" ? "חזור" : "Go Back"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const mealsForDay = menu.meals.filter((m) => m.day_number === selectedDay);
  const uniqueDays = [...new Set(menu.meals.map((m) => m.day_number))].sort((a, b) => a - b);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Clean Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{menu.title}</Text>
          <View style={styles.headerBadges}>
            <View style={[styles.headerBadge, { backgroundColor: colors.surface }]}>
              <Calendar size={12} color={colors.textSecondary} />
              <Text style={[styles.headerBadgeText, { color: colors.textSecondary }]}>{menu.days_count} Days</Text>
            </View>
            <View style={[styles.headerBadge, { backgroundColor: colors.surface }]}>
              <Utensils size={12} color={colors.textSecondary} />
              <Text style={[styles.headerBadgeText, { color: colors.textSecondary }]}>{menu.meals.length} Meals</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerIconButton}>
            <Share2 size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsFavorite(!isFavorite)}
            style={styles.headerIconButton}
          >
            <Heart size={20} color={isFavorite ? "#EF4444" : colors.textSecondary} fill={isFavorite ? "#EF4444" : "transparent"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContainer}
      >
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.emerald500 + "20" }]}>
            <Flame size={24} color={colors.emerald500} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {Math.round(menu.total_calories / menu.days_count)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Avg Cal/Day
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.indigo500 + "20" }]}>
            <Target size={24} color={colors.indigo500} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {menu.total_protein ? Math.round(menu.total_protein / menu.days_count) : 0}g
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Protein/Day
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.amber500 + "20" }]}>
            <DollarSign size={24} color={colors.amber500} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            ₪{menu.estimated_cost || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Est. Cost
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.pink500 + "20" }]}>
            <Clock size={24} color={colors.pink500} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {menu.prep_time_minutes || 30}m
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Avg Prep
          </Text>
        </View>
      </ScrollView>

      {/* Day Selector */}
      <View style={[styles.daySelectorContainer, { backgroundColor: colors.card }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelector}
        >
          {uniqueDays.map((day) => {
            const isSelected = selectedDay === day;
            const dayMeals = menu.meals.filter((m) => m.day_number === day);
            const totalCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);

            return (
              <TouchableOpacity
                key={day}
                onPress={() => setSelectedDay(day)}
                style={[
                  styles.dayTab,
                  {
                    backgroundColor: isSelected ? colors.emerald500 : colors.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayTabLabel,
                    { color: isSelected ? "#ffffff" : colors.textSecondary },
                  ]}
                >
                  DAY
                </Text>
                <Text
                  style={[
                    styles.dayTabNumber,
                    { color: isSelected ? "#ffffff" : colors.text },
                  ]}
                >
                  {day}
                </Text>
                <Text
                  style={[
                    styles.dayTabCalories,
                    { color: isSelected ? "rgba(255,255,255,0.8)" : colors.textSecondary },
                  ]}
                >
                  {Math.round(totalCalories)} kcal
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Meals List */}
      <Animated.ScrollView
        style={[styles.mealsScrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.mealsContainer}
      >
        {mealsForDay.map((meal) => {
          const isExpanded = expandedMeal === meal.meal_id;
          const mealTypeColor = getMealTypeColor(meal.meal_type);
          const mealTypeEmoji = getMealTypeEmoji(meal.meal_type);

          return (
            <View
              key={meal.meal_id}
              style={[styles.mealCard, { backgroundColor: colors.card }]}
            >
              {/* Meal Header */}
              <TouchableOpacity
                onPress={() => toggleMealExpanded(meal.meal_id)}
                style={styles.mealHeader}
                activeOpacity={0.7}
              >
                {/* Circular Meal Image */}
                <View style={styles.mealImageContainer}>
                  {meal.image_url ? (
                    <Image source={{ uri: meal.image_url }} style={styles.mealImage} />
                  ) : (
                    <View style={[styles.mealImagePlaceholder, { backgroundColor: mealTypeColor + "20" }]}>
                      <Text style={styles.mealImageEmoji}>{mealTypeEmoji}</Text>
                    </View>
                  )}
                </View>

                {/* Meal Info */}
                <View style={styles.mealInfo}>
                  <View style={styles.mealTypeRow}>
                    <View style={[styles.mealTypeBadge, { backgroundColor: mealTypeColor }]}>
                      <Text style={styles.mealTypeText}>{meal.meal_type}</Text>
                    </View>
                    {meal.prep_time_minutes && (
                      <View style={styles.prepTimeBadge}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={[styles.prepTimeText, { color: colors.textSecondary }]}>
                          {meal.prep_time_minutes}min
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={2}>
                    {meal.name}
                  </Text>
                  <View style={styles.mealMetaRow}>
                    <View style={styles.mealMetaItem}>
                      <Flame size={14} color={colors.emerald500} />
                      <Text style={[styles.mealMetaText, { color: colors.textSecondary }]}>
                        {Math.round(meal.calories)} cal
                      </Text>
                    </View>
                    <View style={styles.mealMetaItem}>
                      <Target size={14} color={colors.indigo500} />
                      <Text style={[styles.mealMetaText, { color: colors.textSecondary }]}>
                        {Math.round(meal.protein)}g protein
                      </Text>
                    </View>
                    {meal.dietary_tags && meal.dietary_tags.length > 0 && (
                      <DietaryIcons tags={meal.dietary_tags} size={14} />
                    )}
                  </View>
                </View>

                {/* Expand Icon */}
                <View style={styles.expandIconContainer}>
                  {isExpanded ? (
                    <ChevronUp size={24} color={colors.textSecondary} />
                  ) : (
                    <ChevronDown size={24} color={colors.textSecondary} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Expanded Content */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  {/* Nutrition Grid */}
                  <View style={[styles.nutritionSection, { borderTopColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Nutrition Facts
                    </Text>
                    <View style={styles.nutritionGrid}>
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: colors.emerald500 }]}>
                          {Math.round(meal.calories)}
                        </Text>
                        <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                          Calories
                        </Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: colors.indigo500 }]}>
                          {Math.round(meal.protein)}g
                        </Text>
                        <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                          Protein
                        </Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: colors.amber500 }]}>
                          {Math.round(meal.carbs)}g
                        </Text>
                        <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                          Carbs
                        </Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: colors.pink500 }]}>
                          {Math.round(meal.fat)}g
                        </Text>
                        <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                          Fat
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Ingredients */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Sparkles size={18} color={colors.emerald500} />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Ingredients
                      </Text>
                    </View>
                    <View style={styles.ingredientsList}>
                      {meal.ingredients.map((ingredient) => (
                        <View key={ingredient.ingredient_id} style={styles.ingredientItem}>
                          <View
                            style={[
                              styles.ingredientDot,
                              { backgroundColor: colors.emerald500 },
                            ]}
                          />
                          <Text style={[styles.ingredientText, { color: colors.text }]}>
                            <Text style={styles.ingredientQuantity}>
                              {ingredient.quantity} {ingredient.unit}
                            </Text>{" "}
                            {ingredient.name}
                          </Text>
                          {ingredient.estimated_cost && (
                            <Text style={[styles.ingredientCost, { color: colors.textSecondary }]}>
                              ₪{ingredient.estimated_cost.toFixed(1)}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Cooking Method */}
                  {meal.cooking_method && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <ChefHat size={18} color={colors.indigo500} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                          Cooking Method
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.cookingMethodBadge,
                          { backgroundColor: colors.indigo500 + "15" },
                        ]}
                      >
                        <Text style={[styles.cookingMethodText, { color: colors.indigo500 }]}>
                          {meal.cooking_method}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Instructions */}
                  {meal.instructions && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Info size={18} color={colors.amber500} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                          Instructions
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.instructionsContainer,
                          { backgroundColor: colors.background },
                        ]}
                      >
                        <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
                          {meal.instructions}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Nutrition Habits Section */}
        <View style={styles.habitsSection}>
          <NutritionHabits />
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Floating Action Button */}
      {!menu.is_active && (
        <TouchableOpacity
          onPress={() => setShowStartModal(true)}
          style={[styles.fab, { backgroundColor: colors.emerald500 }]}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[colors.emerald500, colors.emerald600]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Sparkles size={24} color="#ffffff" />
            <Text style={styles.fabText}>
              {language === "he" ? "התחל תפריט" : "Start Menu"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Start Modal */}
      <Modal
        visible={showStartModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.startModal, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconContainer,
                  { backgroundColor: colors.emerald500 + "20" },
                ]}
              >
                <Sparkles size={32} color={colors.emerald500} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === "he" ? "התחל את התפריט?" : "Start This Menu?"}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {language === "he"
                  ? "התפריט יופעל ותוכל לעקוב אחרי ההתקדמות שלך"
                  : "This will activate your menu and you'll be able to track your progress"}
              </Text>
            </View>

            <View style={styles.modalFeatures}>
              <View style={styles.modalFeature}>
                <Check size={20} color={colors.emerald500} />
                <Text style={[styles.modalFeatureText, { color: colors.text }]}>
                  Track ingredient checkmarks
                </Text>
              </View>
              <View style={styles.modalFeature}>
                <Check size={20} color={colors.emerald500} />
                <Text style={[styles.modalFeatureText, { color: colors.text }]}>
                  Daily progress tracking
                </Text>
              </View>
              <View style={styles.modalFeature}>
                <Check size={20} color={colors.emerald500} />
                <Text style={[styles.modalFeatureText, { color: colors.text }]}>
                  Completion rewards
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowStartModal(false)}
                style={[styles.modalButton, { backgroundColor: colors.background }]}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  {language === "he" ? "ביטול" : "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleStartMenu}
                disabled={isStarting}
                style={[styles.modalButton, { backgroundColor: colors.emerald500, flex: 1 }]}
              >
                {isStarting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Sparkles size={18} color="#ffffff" />
                    <Text style={[styles.modalButtonText, { color: "#ffffff" }]}>
                      {language === "he" ? "התחל עכשיו" : "Start Now"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#111827",
  },
  errorButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerBadges: {
    flexDirection: "row",
    gap: 8,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  statsScroll: {
    maxHeight: 130,
    marginTop: 12,
  },
  statsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: 110,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  daySelectorContainer: {
    marginTop: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  daySelector: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dayTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    minWidth: 90,
    gap: 4,
  },
  dayTabLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  dayTabNumber: {
    fontSize: 24,
    fontWeight: "800",
  },
  dayTabCalories: {
    fontSize: 11,
    fontWeight: "500",
  },
  mealsScrollView: {
    flex: 1,
  },
  mealsContainer: {
    padding: 20,
    gap: 16,
  },
  mealCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  mealHeader: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  mealImageContainer: {},
  mealImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  mealImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  mealImageEmoji: {
    fontSize: 32,
  },
  mealInfo: {
    flex: 1,
    gap: 8,
  },
  mealTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mealTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealTypeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  prepTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  prepTimeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  mealName: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
  },
  mealMetaRow: {
    flexDirection: "row",
    gap: 12,
  },
  mealMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mealMetaText: {
    fontSize: 12,
    fontWeight: "500",
  },
  expandIconContainer: {
    justifyContent: "center",
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 20,
  },
  nutritionSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  nutritionItem: {
    alignItems: "center",
    gap: 4,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  nutritionLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ingredientsList: {
    gap: 10,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ingredientText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  ingredientQuantity: {
    fontWeight: "700",
  },
  ingredientCost: {
    fontSize: 12,
    fontWeight: "600",
  },
  cookingMethodBadge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cookingMethodText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  instructionsContainer: {
    padding: 16,
    borderRadius: 12,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  fabText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  startModal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  modalFeatures: {
    gap: 12,
    marginBottom: 24,
  },
  modalFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalFeatureText: {
    fontSize: 15,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    minWidth: 100,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  habitsSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
});
