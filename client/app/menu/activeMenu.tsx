import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { language } = useLanguage();
  const router = useRouter();
  const { planId } = useLocalSearchParams();
  const { colors } = useTheme();

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(
    new Set()
  );
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewType, setReviewType] = useState<"completed" | "failed">(
    "completed"
  );
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
      const response = await api.get(
        `/recommended-menus/${planId}/with-progress`
      );
      const plan = response.data.data;
      setMealPlan(plan);

      if (plan.ingredient_checks) {
        const checked = new Set<string>(
          plan.ingredient_checks
            .filter((c: any) => c.checked)
            .map((c: any) => c.ingredient_id as string)
        );
        setCheckedIngredients(checked);
      }
    } catch (error) {
      console.error("Error loading meal plan:", error);
      Alert.alert(t("active_menu.error"), t("active_menu.failed_to_load"));
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

  const toggleMealExpanded = useCallback((mealId: string) => {
    setExpandedMeals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  }, []);

  const toggleIngredientCheck = useCallback(
    async (ingredientId: string, mealId: string) => {
      const newChecked = new Set(checkedIngredients);
      const isChecked = !newChecked.has(ingredientId);

      if (isChecked) {
        newChecked.add(ingredientId);
      } else {
        newChecked.delete(ingredientId);
      }
      setCheckedIngredients(newChecked);

      try {
        await api.post(
          `/recommended-menus/${planId}/ingredients/${ingredientId}/check`,
          {
            meal_id: mealId,
            checked: isChecked,
          }
        );
      } catch (error) {
        console.error("Error updating ingredient check:", error);
        if (isChecked) {
          newChecked.delete(ingredientId);
        } else {
          newChecked.add(ingredientId);
        }
        setCheckedIngredients(new Set(newChecked));
      }
    },
    [checkedIngredients, planId]
  );

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert(
        t("active_menu.please_rate"),
        t("active_menu.select_star_rating")
      );
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
      Alert.alert(t("active_menu.thank_you"), t("active_menu.feedback_helps"), [
        {
          text: t("active_menu.ok"),
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert(t("active_menu.error"), t("active_menu.failed_to_submit"));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getMealTypeEmoji = useCallback((type: string) => {
    const typeMap: Record<string, string> = {
      breakfast: "🌅",
      lunch: "☀️",
      dinner: "🌙",
      snack: "🍎",
    };
    return typeMap[type.toLowerCase()] || "🍽️";
  }, []);

  const getMealTypeColor = useCallback((type: string) => {
    const colorMap: Record<string, string> = {
      breakfast: "#F59E0B",
      lunch: "#10B981",
      dinner: "#6366F1",
      snack: "#EC4899",
    };
    return colorMap[type.toLowerCase()] || "#6B7280";
  }, []);

  const getMealTypeLabel = useCallback(
    (type: string) => {
      return t(`active_menu.meal_types.${type.toLowerCase()}`, type);
    },
    [t]
  );

  const currentDay = useMemo(
    () => (mealPlan ? mealPlan.days[selectedDay] : null),
    [mealPlan, selectedDay]
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t("active_menu.loading_menu")}
        </Text>
      </View>
    );
  }

  if (!mealPlan) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t("active_menu.menu_not_found")}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.errorButton, { color: colors.primary }]}>
              {t("active_menu.go_back")}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {mealPlan.name}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {t("active_menu.day_of", {
              current: selectedDay + 1,
              total: mealPlan.days.length,
            })}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Day Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[
          styles.dayTabsContainer,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
        contentContainerStyle={styles.dayTabsContent}
      >
        {mealPlan.days.map((day, index) => {
          const dayDate = new Date(day.date);
          const dayName = dayDate.toLocaleDateString(
            language === "he" ? "he-IL" : "en-US",
            {
              weekday: "short",
            }
          );
          const dateNumber = dayDate.getDate();
          const monthName = dayDate.toLocaleDateString(
            language === "he" ? "he-IL" : "en-US",
            {
              month: "short",
            }
          );
          const isSelected = selectedDay === index;

          return (
            <Pressable
              key={day.day}
              onPress={() => setSelectedDay(index)}
              style={[
                styles.dayTab,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : colors.surfaceVariant,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayTabName,
                  { color: isSelected ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                {dayName}
              </Text>
              <Text
                style={[
                  styles.dayTabDate,
                  { color: isSelected ? "#FFFFFF" : colors.text },
                ]}
              >
                {dateNumber}
              </Text>
              <Text
                style={[
                  styles.dayTabMonth,
                  {
                    color: isSelected
                      ? "rgba(255,255,255,0.9)"
                      : colors.textTertiary,
                  },
                ]}
              >
                {monthName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Meals List */}
      <ScrollView
        style={styles.mealsScrollView}
        contentContainerStyle={styles.mealsContainer}
        showsVerticalScrollIndicator={false}
      >
        {currentDay?.meals.map((meal) => {
          const isExpanded = expandedMeals.has(meal.meal_id);
          const mealTypeColor = getMealTypeColor(meal.meal_type);
          const mealTypeEmoji = getMealTypeEmoji(meal.meal_type);

          return (
            <View
              key={meal.meal_id}
              style={[
                styles.mealCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Meal Header */}
              <Pressable
                onPress={() => toggleMealExpanded(meal.meal_id)}
                style={styles.mealHeader}
              >
                {/* Meal Image */}
                <View style={styles.mealImageContainer}>
                  {meal.image_url ? (
                    <Image
                      source={{ uri: meal.image_url }}
                      style={styles.mealImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.mealImagePlaceholder,
                        { backgroundColor: mealTypeColor + "20" },
                      ]}
                    >
                      <Text style={styles.mealImageEmoji}>{mealTypeEmoji}</Text>
                    </View>
                  )}
                </View>

                {/* Meal Info */}
                <View style={styles.mealInfo}>
                  <View
                    style={[
                      styles.mealTypeBadge,
                      { backgroundColor: mealTypeColor },
                    ]}
                  >
                    <Text style={styles.mealTypeText}>
                      {getMealTypeLabel(meal.meal_type)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.mealName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {meal.name}
                  </Text>
                  <View style={styles.mealMeta}>
                    <Flame size={14} color={colors.warning} />
                    <Text
                      style={[
                        styles.mealMetaText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {meal.calories} {t("active_menu.cal")}
                    </Text>
                    {meal.dietary_tags && meal.dietary_tags.length > 0 && (
                      <DietaryIcons
                        tags={meal.dietary_tags}
                        size={14}
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </View>
                </View>

                {/* Expand Icon */}
                {isExpanded ? (
                  <ChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </Pressable>

              {/* Expanded Content */}
              {isExpanded && (
                <View
                  style={[
                    styles.expandedContent,
                    { borderTopColor: colors.border },
                  ]}
                >
                  {/* Nutrition Grid */}
                  <View
                    style={[
                      styles.nutritionGrid,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                  >
                    <View style={styles.nutritionItem}>
                      <Text
                        style={[
                          styles.nutritionValue,
                          { color: colors.primary },
                        ]}
                      >
                        {meal.protein}g
                      </Text>
                      <Text
                        style={[
                          styles.nutritionLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("active_menu.protein")}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.nutritionDivider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <View style={styles.nutritionItem}>
                      <Text
                        style={[
                          styles.nutritionValue,
                          { color: colors.warning },
                        ]}
                      >
                        {meal.carbs}g
                      </Text>
                      <Text
                        style={[
                          styles.nutritionLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("active_menu.carbs")}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.nutritionDivider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <View style={styles.nutritionItem}>
                      <Text
                        style={[styles.nutritionValue, { color: colors.error }]}
                      >
                        {meal.fat}g
                      </Text>
                      <Text
                        style={[
                          styles.nutritionLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("active_menu.fat")}
                      </Text>
                    </View>
                  </View>

                  {/* Ingredients */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <ChefHat size={18} color={colors.primary} />
                      <Text
                        style={[styles.sectionTitle, { color: colors.text }]}
                      >
                        {t("active_menu.ingredients")}
                      </Text>
                    </View>
                    <View style={styles.ingredientsList}>
                      {meal.ingredients.map((ingredient) => {
                        const isChecked = checkedIngredients.has(
                          ingredient.ingredient_id
                        );

                        return (
                          <Pressable
                            key={ingredient.ingredient_id}
                            onPress={() =>
                              toggleIngredientCheck(
                                ingredient.ingredient_id,
                                meal.meal_id
                              )
                            }
                            style={styles.ingredientItem}
                          >
                            {isChecked ? (
                              <CheckCircle2
                                size={20}
                                color={colors.success}
                                fill={colors.success}
                              />
                            ) : (
                              <Circle size={20} color={colors.border} />
                            )}
                            <Text
                              style={[
                                styles.ingredientText,
                                { color: colors.text },
                                isChecked && [
                                  styles.ingredientTextChecked,
                                  { color: colors.textTertiary },
                                ],
                              ]}
                            >
                              {ingredient.name} - {ingredient.quantity}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Instructions */}
                  {meal.instructions && (
                    <View style={styles.section}>
                      <Text
                        style={[styles.sectionTitle, { color: colors.text }]}
                      >
                        {t("active_menu.instructions")}
                      </Text>
                      <View
                        style={[
                          styles.instructionsContainer,
                          { backgroundColor: colors.surfaceVariant },
                        ]}
                      >
                        <Text
                          style={[
                            styles.instructionsText,
                            { color: colors.textSecondary },
                          ]}
                        >
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

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <Pressable style={styles.modalOverlay} onPress={() => {}}>
          <View style={[styles.reviewModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.reviewTitle, { color: colors.text }]}>
              {reviewType === "completed"
                ? t("active_menu.congratulations")
                : t("active_menu.menu_period_ended")}
            </Text>
            <Text
              style={[styles.reviewSubtitle, { color: colors.textSecondary }]}
            >
              {reviewType === "completed"
                ? t("active_menu.completed_message")
                : t("active_menu.how_did_it_go")}
            </Text>

            {/* Star Rating */}
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Star
                    size={36}
                    color={star <= rating ? colors.warning : colors.border}
                    fill={star <= rating ? colors.warning : "transparent"}
                  />
                </Pressable>
              ))}
            </View>

            {/* Feedback Input */}
            <TextInput
              style={[
                styles.feedbackInput,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={
                reviewType === "completed"
                  ? t("active_menu.share_experience")
                  : t("active_menu.what_prevented")
              }
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              value={feedback}
              onChangeText={setFeedback}
              textAlignVertical="top"
            />

            {/* Action Button */}
            <Pressable
              onPress={submitReview}
              disabled={isSubmittingReview}
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
            >
              {isSubmittingReview ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {t("active_menu.submit_review")}
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
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
    fontWeight: "600",
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
    paddingVertical: 14,
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
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  dayTabsContainer: {
    borderBottomWidth: 1,
    maxHeight: 90,
  },
  dayTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    minWidth: 70,
    borderWidth: 1,
  },
  dayTabName: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayTabDate: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  dayTabMonth: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  mealsScrollView: {
    flex: 1,
  },
  mealsContainer: {
    padding: 16,
    gap: 14,
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
  mealImageContainer: {
    marginRight: 14,
  },
  mealImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  mealImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  mealImageEmoji: {
    fontSize: 30,
  },
  mealInfo: {
    flex: 1,
    gap: 6,
  },
  mealTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  mealTypeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mealName: {
    fontSize: 17,
    fontWeight: "600",
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  mealMetaText: {
    fontSize: 13,
    fontWeight: "500",
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 18,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  nutritionGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderRadius: 12,
  },
  nutritionItem: {
    alignItems: "center",
    flex: 1,
  },
  nutritionDivider: {
    width: 1,
    height: 32,
  },
  nutritionValue: {
    fontSize: 19,
    fontWeight: "700",
  },
  nutritionLabel: {
    fontSize: 11,
    marginTop: 4,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ingredientText: {
    fontSize: 14,
    flex: 1,
  },
  ingredientTextChecked: {
    textDecorationLine: "line-through",
  },
  instructionsContainer: {
    padding: 16,
    borderRadius: 12,
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
    maxWidth: 420,
    borderRadius: 24,
    padding: 28,
  },
  reviewTitle: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  reviewSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 28,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    gap: 10,
  },
  starButton: {
    padding: 6,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    minHeight: 110,
    marginBottom: 24,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  habitsSection: {
    marginTop: 8,
  },
});
