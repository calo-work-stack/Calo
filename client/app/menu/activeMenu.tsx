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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Star,
  Flame,
  CheckCircle2,
  Circle,
  ChefHat,
} from "lucide-react-native";
import { api } from "@/src/services/api";
import { DietaryIcons } from "@/components/menu/DietaryIcons";
import { NutritionHabits } from "@/components/menu/NutritionHabits";

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
  dietary_tags?: string[];
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
  const { language } = useLanguage();
  const router = useRouter();
  const { planId } = useLocalSearchParams();
  const { colors } = useTheme();

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
  }, [planId]);

  useEffect(() => {
    if (mealPlan) {
      checkMenuCompletion();
    }
  }, [mealPlan]);

  const loadMealPlan = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/recommended-menus/${planId}/with-progress`);
      const plan = response.data.data;
      setMealPlan(plan);

      if (plan.ingredient_checks) {
        const checked = new Set<string>(
          plan.ingredient_checks.filter((c: any) => c.checked).map((c: any) => c.ingredient_id as string)
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

    return checkedCount / totalIngredients >= 0.8;
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

    try {
      await api.post(`/recommended-menus/${planId}/ingredients/${ingredientId}/check`, {
        meal_id: mealId,
        checked: isChecked,
      });
    } catch (error) {
      console.error("Error updating ingredient check:", error);
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
      breakfast: "#F59E0B",
      lunch: "#10B981",
      dinner: "#6366F1",
      snack: "#EC4899",
    };
    return colorMap[type.toLowerCase()] || "#6B7280";
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.emerald500} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your menu...</Text>
      </View>
    );
  }

  if (!mealPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Menu not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.errorButton}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentDay = mealPlan.days[selectedDay];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Clean Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{mealPlan.name}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Day {selectedDay + 1} of {mealPlan.days.length}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Horizontal Day Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.dayTabsContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={styles.dayTabsContent}
      >
        {mealPlan.days.map((day, index) => {
          const dayDate = new Date(day.date);
          const dayName = dayDate.toLocaleDateString(language === "he" ? "he-IL" : "en-US", {
            weekday: "short",
          });
          const dateNumber = dayDate.getDate();
          const monthName = dayDate.toLocaleDateString(language === "he" ? "he-IL" : "en-US", {
            month: "short",
          });
          const isSelected = selectedDay === index;

          return (
            <TouchableOpacity
              key={day.day}
              onPress={() => setSelectedDay(index)}
              style={[
                styles.dayTab,
                { backgroundColor: isSelected ? colors.emerald500 : colors.surface },
              ]}
            >
              <Text style={[styles.dayTabName, { color: isSelected ? "#FFFFFF" : colors.textSecondary }]}>
                {dayName}
              </Text>
              <Text style={[styles.dayTabDate, { color: isSelected ? "#FFFFFF" : colors.text }]}>
                {dateNumber}
              </Text>
              <Text style={[styles.dayTabMonth, { color: isSelected ? "rgba(255,255,255,0.8)" : colors.textTertiary }]}>
                {monthName}
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
            <View key={meal.meal_id} style={[styles.mealCard, { backgroundColor: colors.card }]}>
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
                  <View style={[styles.mealTypeBadge, { backgroundColor: mealTypeColor }]}>
                    <Text style={styles.mealTypeText}>{meal.meal_type}</Text>
                  </View>
                  <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={1}>
                    {meal.name}
                  </Text>
                  <View style={styles.mealMeta}>
                    <Flame size={14} color={colors.amber500} />
                    <Text style={[styles.mealMetaText, { color: colors.textSecondary }]}>{meal.calories} cal</Text>
                    {meal.dietary_tags && meal.dietary_tags.length > 0 && (
                      <DietaryIcons tags={meal.dietary_tags} size={14} style={{ marginLeft: 6 }} />
                    )}
                  </View>
                </View>

                {/* Expand Icon */}
                {isExpanded ? (
                  <ChevronUp size={22} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={22} color={colors.textSecondary} />
                )}
              </TouchableOpacity>

              {/* Expanded Content */}
              {isExpanded && (
                <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                  {/* Nutrition Grid */}
                  <View style={[styles.nutritionGrid, { backgroundColor: colors.surface }]}>
                    <View style={styles.nutritionItem}>
                      <Text style={[styles.nutritionValue, { color: colors.indigo500 }]}>{meal.protein}g</Text>
                      <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>Protein</Text>
                    </View>
                    <View style={[styles.nutritionDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.nutritionItem}>
                      <Text style={[styles.nutritionValue, { color: colors.amber500 }]}>{meal.carbs}g</Text>
                      <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>Carbs</Text>
                    </View>
                    <View style={[styles.nutritionDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.nutritionItem}>
                      <Text style={[styles.nutritionValue, { color: colors.pink500 }]}>{meal.fat}g</Text>
                      <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>Fat</Text>
                    </View>
                  </View>

                  {/* Ingredients with Checkmarks */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <ChefHat size={18} color={colors.emerald500} />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
                    </View>
                    <View style={styles.ingredientsList}>
                      {meal.ingredients.map((ingredient) => {
                        const isChecked = checkedIngredients.has(ingredient.ingredient_id);

                        return (
                          <TouchableOpacity
                            key={ingredient.ingredient_id}
                            onPress={() =>
                              toggleIngredientCheck(ingredient.ingredient_id, meal.meal_id)
                            }
                            style={styles.ingredientItem}
                            activeOpacity={0.7}
                          >
                            {isChecked ? (
                              <CheckCircle2 size={20} color={colors.emerald500} fill={colors.emerald500} />
                            ) : (
                              <Circle size={20} color={colors.border} />
                            )}
                            <Text
                              style={[
                                styles.ingredientText,
                                { color: colors.text },
                                isChecked && [styles.ingredientTextChecked, { color: colors.textTertiary }],
                              ]}
                            >
                              {ingredient.name} - {ingredient.quantity}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Instructions */}
                  {meal.instructions && (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions</Text>
                      <View style={[styles.instructionsContainer, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>{meal.instructions}</Text>
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

        <View style={{ height: 20 }} />
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
                    size={36}
                    color={star <= rating ? colors.amber500 : colors.border}
                    fill={star <= rating ? colors.amber500 : "transparent"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Feedback Input */}
            <TextInput
              style={[styles.feedbackInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder={
                reviewType === "completed"
                  ? "Share your experience (optional)"
                  : "What prevented you from completing?"
              }
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              value={feedback}
              onChangeText={setFeedback}
              textAlignVertical="top"
            />

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={submitReview}
              disabled={isSubmittingReview}
              style={[styles.submitButton, { backgroundColor: colors.emerald500 }]}
            >
              {isSubmittingReview ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
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
    color: "#6B7280",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "600",
    marginBottom: 16,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  dayTabsContainer: {
    borderBottomWidth: 1,
  },
  dayTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  dayTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 65,
  },
  dayTabName: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  dayTabDate: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  dayTabMonth: {
    fontSize: 9,
    fontWeight: "500",
    marginTop: 1,
  },
  mealsScrollView: {
    flex: 1,
  },
  mealsContainer: {
    padding: 16,
    gap: 12,
  },
  mealCard: {
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  mealImageContainer: {
    marginRight: 12,
  },
  mealImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  mealImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  mealImageEmoji: {
    fontSize: 28,
  },
  mealInfo: {
    flex: 1,
    gap: 5,
  },
  mealTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  mealTypeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mealMetaText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  nutritionGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginTop: 14,
  },
  nutritionItem: {
    alignItems: "center",
    flex: 1,
  },
  nutritionDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  nutritionLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  ingredientsList: {
    gap: 10,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ingredientText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  ingredientTextChecked: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  instructionsContainer: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 10,
  },
  instructionsText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  reviewModal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
  },
  reviewTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  reviewSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    minHeight: 100,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  habitsSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
});
