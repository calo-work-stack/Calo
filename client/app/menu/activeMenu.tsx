import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Image,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Star,
  X,
} from "lucide-react-native";
import { api } from "@/src/services/api";

interface Ingredient {
  ingredient_id: string;
  name: string;
  quantity: string;
  checked?: boolean;
}

interface Meal {
  meal_id: string;
  meal_type: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Ingredient[];
  instructions: string;
  image_url?: string;
}

interface DayMeals {
  day: number;
  date: string;
  meals: Meal[];
}

interface MealPlan {
  plan_id: string;
  name: string;
  duration: number;
  start_date: string;
  end_date: string;
  days: DayMeals[];
  status: string;
}

export default function ActiveMenu() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { planId } = useLocalSearchParams();

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewType, setReviewType] = useState<"completed" | "failed">("completed");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    loadMealPlan();
    checkMenuCompletion();
  }, [planId]);

  const loadMealPlan = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/recommended-menus/${planId}/with-progress`);
      const plan = response.data.data;
      setMealPlan(plan);

      // Load checked ingredients from database
      if (plan.ingredient_checks) {
        const checked = new Set(
          plan.ingredient_checks.filter((c: any) => c.checked).map((c: any) => c.ingredient_id)
        );
        setCheckedIngredients(checked);
      }
    } catch (error) {
      console.error("Error loading meal plan:", error);
      Alert.alert("Error", "Failed to load meal plan");
    } finally {
      setIsLoading(false);
    }
  };

  const checkMenuCompletion = () => {
    if (!mealPlan) return;

    const endDate = new Date(mealPlan.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (today > endDate && mealPlan.status === "active") {
      // Menu period has ended - show review modal
      const allMealsCompleted = checkIfAllMealsCompleted();
      setReviewType(allMealsCompleted ? "completed" : "failed");
      setShowReviewModal(true);
    }
  };

  const checkIfAllMealsCompleted = () => {
    if (!mealPlan) return false;

    let totalIngredients = 0;
    let checkedCount = 0;

    mealPlan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        totalIngredients += meal.ingredients.length;
        meal.ingredients.forEach((ing) => {
          if (checkedIngredients.has(ing.ingredient_id)) {
            checkedCount++;
          }
        });
      });
    });

    return checkedCount / totalIngredients >= 0.8; // 80% completion threshold
  };

  const toggleMealExpanded = (mealId: string) => {
    const newExpanded = new Set(expandedMeals);
    if (newExpanded.has(mealId)) {
      newExpanded.delete(mealId);
    } else {
      newExpanded.add(mealId);
    }
    setExpandedMeals(newExpanded);
  };

  const toggleIngredientCheck = async (ingredientId: string, mealId: string) => {
    const newChecked = new Set(checkedIngredients);
    const isChecked = !newChecked.has(ingredientId);

    if (isChecked) {
      newChecked.add(ingredientId);
    } else {
      newChecked.delete(ingredientId);
    }
    setCheckedIngredients(newChecked);

    // Persist to database
    try {
      await api.post(`/recommended-menus/${planId}/ingredients/${ingredientId}/check`, {
        meal_id: mealId,
        checked: isChecked,
      });
    } catch (error) {
      console.error("Error updating ingredient check:", error);
      // Revert on error
      if (isChecked) {
        newChecked.delete(ingredientId);
      } else {
        newChecked.add(ingredientId);
      }
      setCheckedIngredients(new Set(newChecked));
    }
  };

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert("Please rate your experience", "Select a star rating before submitting");
      return;
    }

    try {
      setIsSubmittingReview(true);
      await api.post(`/recommended-menus/${planId}/review`, {
        type: reviewType,
        rating,
        feedback: feedback.trim() || null,
        reason: reviewType === "failed" ? feedback.trim() : null,
      });

      setShowReviewModal(false);
      Alert.alert(
        "Thank you!",
        "Your feedback helps us improve your meal plans",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getMealTypeEmoji = (type: string) => {
    const typeMap: Record<string, string> = {
      breakfast: "🌅",
      lunch: "☀️",
      dinner: "🌙",
      snack: "🍎",
    };
    return typeMap[type.toLowerCase()] || "🍽️";
  };

  const getMealTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      breakfast: colors.amber500,
      lunch: colors.emerald500,
      dinner: colors.indigo500,
      snack: colors.pink500,
    };
    return colorMap[type.toLowerCase()] || colors.gray500;
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.emerald500} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading your menu...</Text>
      </View>
    );
  }

  if (!mealPlan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Menu not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.errorButton, { color: colors.emerald500 }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentDay = mealPlan.days[selectedDay];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{mealPlan.name}</Text>
        <View style={styles.backButton} />
      </View>

      {/* Day Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.dayTabsContainer, { backgroundColor: colors.card }]}
        contentContainerStyle={styles.dayTabsContent}
      >
        {mealPlan.days.map((day, index) => {
          const dayDate = new Date(day.date);
          const dayName = dayDate.toLocaleDateString(language === "he" ? "he-IL" : "en-US", {
            weekday: "short",
          });
          const dateNumber = dayDate.getDate();
          const isSelected = selectedDay === index;

          return (
            <TouchableOpacity
              key={day.day}
              onPress={() => setSelectedDay(index)}
              style={[
                styles.dayTab,
                isSelected && {
                  backgroundColor: colors.emerald500,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayTabName,
                  { color: isSelected ? "#ffffff" : colors.text },
                ]}
              >
                {dayName}
              </Text>
              <Text
                style={[
                  styles.dayTabDate,
                  { color: isSelected ? "#ffffff" : colors.textSecondary },
                ]}
              >
                {dateNumber}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Meals List */}
      <ScrollView style={styles.mealsScrollView} contentContainerStyle={styles.mealsContainer}>
        {currentDay.meals.map((meal) => {
          const isExpanded = expandedMeals.has(meal.meal_id);
          const mealTypeColor = getMealTypeColor(meal.meal_type);
          const mealTypeEmoji = getMealTypeEmoji(meal.meal_type);

          return (
            <View
              key={meal.meal_id}
              style={[styles.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* Meal Header */}
              <TouchableOpacity
                onPress={() => toggleMealExpanded(meal.meal_id)}
                style={styles.mealHeader}
              >
                {/* Meal Image */}
                {meal.image_url ? (
                  <Image source={{ uri: meal.image_url }} style={styles.mealImage} />
                ) : (
                  <View style={[styles.mealImagePlaceholder, { backgroundColor: colors.cardHover }]}>
                    <Text style={styles.mealImageEmoji}>{mealTypeEmoji}</Text>
                  </View>
                )}

                {/* Meal Info */}
                <View style={styles.mealInfo}>
                  <View style={styles.mealTypeContainer}>
                    <View style={[styles.mealTypeBadge, { backgroundColor: mealTypeColor + "20" }]}>
                      <Text style={[styles.mealTypeText, { color: mealTypeColor }]}>
                        {meal.meal_type}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={1}>
                    {meal.name}
                  </Text>
                  <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>
                    {meal.calories} kcal
                  </Text>
                </View>

                {/* Expand Icon */}
                <View style={styles.expandIcon}>
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
                  <View style={[styles.nutritionGrid, { borderTopColor: colors.border }]}>
                    <View style={styles.nutritionItem}>
                      <Text style={[styles.nutritionValue, { color: colors.text }]}>
                        {meal.protein}g
                      </Text>
                      <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                        Protein
                      </Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={[styles.nutritionValue, { color: colors.text }]}>
                        {meal.carbs}g
                      </Text>
                      <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                        Carbs
                      </Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={[styles.nutritionValue, { color: colors.text }]}>
                        {meal.fat}g
                      </Text>
                      <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                        Fat
                      </Text>
                    </View>
                  </View>

                  {/* Ingredients with Checkmarks */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
                    {meal.ingredients.map((ingredient) => {
                      const isChecked = checkedIngredients.has(ingredient.ingredient_id);

                      return (
                        <TouchableOpacity
                          key={ingredient.ingredient_id}
                          onPress={() =>
                            toggleIngredientCheck(ingredient.ingredient_id, meal.meal_id)
                          }
                          style={styles.ingredientItem}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              {
                                backgroundColor: isChecked
                                  ? colors.emerald500
                                  : colors.background,
                                borderColor: isChecked ? colors.emerald500 : colors.border,
                              },
                            ]}
                          >
                            {isChecked && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                          <Text
                            style={[
                              styles.ingredientText,
                              { color: isChecked ? colors.textSecondary : colors.text },
                              isChecked && styles.ingredientTextChecked,
                            ]}
                          >
                            {ingredient.name} - {ingredient.quantity}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Instructions */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions</Text>
                    <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
                      {meal.instructions}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.reviewModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.reviewTitle, { color: colors.text }]}>
              {reviewType === "completed"
                ? "Congratulations! 🎉"
                : "Menu Period Ended"}
            </Text>
            <Text style={[styles.reviewSubtitle, { color: colors.textSecondary }]}>
              {reviewType === "completed"
                ? "You've completed your meal plan!"
                : "How did your meal plan go?"}
            </Text>

            {/* Star Rating */}
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Star
                    size={40}
                    color={star <= rating ? colors.amber500 : colors.border}
                    fill={star <= rating ? colors.amber500 : "transparent"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Feedback Input */}
            <TextInput
              style={[
                styles.feedbackInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder={
                reviewType === "completed"
                  ? "Share your experience (optional)"
                  : "What prevented you from completing?"
              }
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={feedback}
              onChangeText={setFeedback}
              textAlignVertical="top"
            />

            {/* Action Buttons */}
            <View style={styles.reviewActions}>
              <TouchableOpacity
                onPress={submitReview}
                disabled={isSubmittingReview}
                style={[styles.submitButton, { backgroundColor: colors.emerald500 }]}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Review</Text>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16,
  },
  errorButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  dayTabsContainer: {
    maxHeight: 80,
    borderBottomWidth: 1,
  },
  dayTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dayTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  dayTabName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  dayTabDate: {
    fontSize: 18,
    fontWeight: "700",
  },
  mealsScrollView: {
    flex: 1,
  },
  mealsContainer: {
    padding: 16,
    gap: 16,
  },
  mealCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  mealImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  mealImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  mealImageEmoji: {
    fontSize: 32,
  },
  mealInfo: {
    flex: 1,
    marginLeft: 16,
  },
  mealTypeContainer: {
    marginBottom: 6,
  },
  mealTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  mealTypeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  mealCalories: {
    fontSize: 14,
  },
  expandIcon: {
    marginLeft: 8,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    marginBottom: 16,
  },
  nutritionItem: {
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  ingredientText: {
    fontSize: 14,
    flex: 1,
  },
  ingredientTextChecked: {
    textDecorationLine: "line-through",
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  reviewModal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  reviewTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  reviewSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
  },
  reviewActions: {
    gap: 12,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
