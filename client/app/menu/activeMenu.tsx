import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Dimensions,
  Platform,
  Easing,
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
  Calendar,
  Target,
  Timer,
  Trophy,
  Sparkles,
  TrendingUp,
} from "lucide-react-native";
import { api } from "@/src/services/api";
import { DietaryIcons } from "@/components/menu/DietaryIcons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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

// ==================== SKELETON LOADER ====================

const SkeletonPulse = React.memo(({ style }: { style?: any }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return <Animated.View style={[style, { opacity: pulseAnim }]} />;
});

// ==================== PROGRESS HEADER ====================

const ProgressHeader = React.memo(
  ({
    plan,
    selectedDay,
    totalDays,
    completionRate,
    colors,
    t,
  }: {
    plan: MealPlan;
    selectedDay: number;
    totalDays: number;
    completionRate: number;
    colors: any;
    t: any;
  }) => {
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(progressAnim, {
        toValue: completionRate,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }, [completionRate, progressAnim]);

    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: ["0%", "100%"],
    });

    return (
      <LinearGradient
        colors={[colors.emerald500, colors.emerald600 || colors.emerald500]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.progressHeader}
      >
        <View style={styles.progressHeaderContent}>
          <View style={styles.progressHeaderLeft}>
            <View style={styles.progressBadge}>
              <Sparkles size={14} color="#ffffff" />
              <Text style={styles.progressBadgeText}>
                {t("active_menu.day_of", { current: selectedDay + 1, total: totalDays })}
              </Text>
            </View>
            <Text style={styles.progressTitle}>{plan.name}</Text>
            <Text style={styles.progressSubtitle}>
              {t("active_menu.keep_going")}
            </Text>
          </View>

          <View style={styles.progressCircle}>
            <Text style={styles.progressCircleValue}>{Math.round(completionRate)}%</Text>
            <Text style={styles.progressCircleLabel}>{t("active_menu.done")}</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
        </View>
      </LinearGradient>
    );
  }
);

// ==================== DAY TAB ====================

const DayTab = React.memo(
  ({
    day,
    index,
    isSelected,
    onSelect,
    language,
    colors,
  }: {
    day: DayMeals;
    index: number;
    isSelected: boolean;
    onSelect: () => void;
    language: string;
    colors: any;
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = useCallback(() => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      onSelect();
    }, [onSelect, scaleAnim]);

    const dayDate = new Date(day.date);
    const dayName = dayDate.toLocaleDateString(
      language === "he" ? "he-IL" : "en-US",
      { weekday: "short" }
    );
    const dateNumber = dayDate.getDate();
    const monthName = dayDate.toLocaleDateString(
      language === "he" ? "he-IL" : "en-US",
      { month: "short" }
    );

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={handlePress}
          style={[
            styles.dayTab,
            {
              backgroundColor: isSelected ? colors.emerald500 : colors.card,
              borderColor: isSelected ? colors.emerald500 : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.dayTabName,
              { color: isSelected ? "rgba(255,255,255,0.85)" : colors.icon },
            ]}
          >
            {dayName}
          </Text>
          <Text
            style={[
              styles.dayTabDate,
              { color: isSelected ? "#ffffff" : colors.text },
            ]}
          >
            {dateNumber}
          </Text>
          <Text
            style={[
              styles.dayTabMonth,
              { color: isSelected ? "rgba(255,255,255,0.9)" : colors.icon },
            ]}
          >
            {monthName}
          </Text>
        </Pressable>
      </Animated.View>
    );
  }
);

// ==================== MEAL CARD ====================

const ActiveMealCard = React.memo(
  ({
    meal,
    isExpanded,
    onToggle,
    checkedIngredients,
    onToggleIngredient,
    colors,
    t,
  }: {
    meal: Meal;
    isExpanded: boolean;
    onToggle: () => void;
    checkedIngredients: Set<string>;
    onToggleIngredient: (ingredientId: string, mealId: string) => void;
    colors: any;
    t: any;
  }) => {
    const getMealTypeConfig = useCallback((type: string) => {
      const configs: Record<string, { emoji: string; color: string; label: string }> = {
        breakfast: { emoji: "🌅", color: "#F59E0B", label: t("active_menu.meal_types.breakfast") },
        lunch: { emoji: "☀️", color: "#10B981", label: t("active_menu.meal_types.lunch") },
        dinner: { emoji: "🌙", color: "#6366F1", label: t("active_menu.meal_types.dinner") },
        snack: { emoji: "🍎", color: "#EC4899", label: t("active_menu.meal_types.snack") },
      };
      return configs[type.toLowerCase()] || { emoji: "🍽️", color: "#6B7280", label: type };
    }, [t]);

    const config = getMealTypeConfig(meal.meal_type);
    const ingredientCount = meal.ingredients.length;
    const checkedCount = meal.ingredients.filter((ing) =>
      checkedIngredients.has(ing.ingredient_id)
    ).length;
    const mealProgress = ingredientCount > 0 ? (checkedCount / ingredientCount) * 100 : 0;

    return (
      <View
        style={[
          styles.mealCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Header */}
        <Pressable onPress={onToggle} style={styles.mealHeader}>
          {/* Meal Image */}
          <View style={styles.mealImageContainer}>
            {meal.image_url ? (
              <Image source={{ uri: meal.image_url }} style={styles.mealImage} />
            ) : (
              <View style={[styles.mealImagePlaceholder, { backgroundColor: config.color + "20" }]}>
                <Text style={styles.mealEmoji}>{config.emoji}</Text>
              </View>
            )}

            {/* Mini progress indicator */}
            {mealProgress > 0 && (
              <View style={[styles.miniProgressBadge, { backgroundColor: colors.emerald500 }]}>
                <Text style={styles.miniProgressText}>{Math.round(mealProgress)}%</Text>
              </View>
            )}
          </View>

          {/* Meal Info */}
          <View style={styles.mealInfo}>
            <View style={[styles.mealTypeBadge, { backgroundColor: config.color }]}>
              <Text style={styles.mealTypeText}>{config.label}</Text>
            </View>
            <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={1}>
              {meal.name}
            </Text>
            <View style={styles.mealMeta}>
              <Flame size={14} color={colors.warning || "#f59e0b"} />
              <Text style={[styles.mealMetaText, { color: colors.icon }]}>
                {meal.calories} {t("active_menu.cal")}
              </Text>
              <Text style={[styles.mealMetaDot, { color: colors.icon }]}>•</Text>
              <Text style={[styles.mealMetaText, { color: colors.icon }]}>
                {checkedCount}/{ingredientCount} {t("active_menu.checked")}
              </Text>
              {meal.dietary_tags && meal.dietary_tags.length > 0 && (
                <DietaryIcons tags={meal.dietary_tags} size={14} style={{ marginLeft: 6 }} />
              )}
            </View>
          </View>

          {/* Expand Icon */}
          <View style={[styles.expandIconBg, { backgroundColor: colors.surface }]}>
            {isExpanded ? (
              <ChevronUp size={20} color={colors.icon} />
            ) : (
              <ChevronDown size={20} color={colors.icon} />
            )}
          </View>
        </Pressable>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
            {/* Nutrition Grid */}
            <View style={[styles.nutritionGrid, { backgroundColor: colors.surface }]}>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: colors.emerald500 }]}>
                  {meal.protein}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {t("active_menu.protein")}
                </Text>
              </View>
              <View style={[styles.nutritionDivider, { backgroundColor: colors.border }]} />
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: "#f59e0b" }]}>
                  {meal.carbs}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {t("active_menu.carbs")}
                </Text>
              </View>
              <View style={[styles.nutritionDivider, { backgroundColor: colors.border }]} />
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: colors.error || "#ef4444" }]}>
                  {meal.fat}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {t("active_menu.fat")}
                </Text>
              </View>
            </View>

            {/* Ingredients with Checkboxes */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ChefHat size={18} color={colors.emerald500} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("active_menu.ingredients")}
                </Text>
                <View style={[styles.checkedBadge, { backgroundColor: colors.emerald500 + "20" }]}>
                  <Text style={[styles.checkedBadgeText, { color: colors.emerald500 }]}>
                    {checkedCount}/{ingredientCount}
                  </Text>
                </View>
              </View>
              <View style={styles.ingredientsList}>
                {meal.ingredients.map((ingredient) => {
                  const isChecked = checkedIngredients.has(ingredient.ingredient_id);

                  return (
                    <Pressable
                      key={ingredient.ingredient_id}
                      onPress={() => onToggleIngredient(ingredient.ingredient_id, meal.meal_id)}
                      style={[
                        styles.ingredientItem,
                        isChecked && { backgroundColor: colors.emerald500 + "10" },
                      ]}
                    >
                      {isChecked ? (
                        <CheckCircle2 size={22} color={colors.success || colors.emerald500} fill={colors.success || colors.emerald500} />
                      ) : (
                        <Circle size={22} color={colors.border} />
                      )}
                      <Text
                        style={[
                          styles.ingredientText,
                          { color: colors.text },
                          isChecked && [styles.ingredientTextChecked, { color: colors.icon }],
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
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("active_menu.instructions")}
                </Text>
                <View style={[styles.instructionsContainer, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.instructionsText, { color: colors.icon }]}>
                    {meal.instructions}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }
);

// ==================== MAIN COMPONENT ====================

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
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewType, setReviewType] = useState<"completed" | "failed">("completed");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadMealPlan();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
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
          plan.ingredient_checks
            .filter((c: any) => c.checked)
            .map((c: any) => c.ingredient_id as string)
        );
        setCheckedIngredients(checked);
      }
    } catch (error) {
      console.error("Error loading meal plan:", error);
      Alert.alert(t("common.error"), t("active_menu.failed_to_load"));
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
    },
    [checkedIngredients, planId]
  );

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert(t("active_menu.please_rate"), t("active_menu.select_star_rating"));
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
        { text: t("common.ok"), onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert(t("common.error"), t("active_menu.failed_to_submit"));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Calculate completion rate
  const completionRate = useMemo(() => {
    if (!mealPlan) return 0;

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

    return totalIngredients > 0 ? (checkedCount / totalIngredients) * 100 : 0;
  }, [mealPlan, checkedIngredients]);

  const currentDay = useMemo(
    () => (mealPlan ? mealPlan.days[selectedDay] : null),
    [mealPlan, selectedDay]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
            <SkeletonPulse style={[styles.skeletonHeaderTitle, { backgroundColor: colors.border }]} />
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.skeletonContent}>
            <SkeletonPulse style={[styles.skeletonProgressHeader, { backgroundColor: colors.border }]} />
            <SkeletonPulse style={[styles.skeletonDayTabs, { backgroundColor: colors.border }]} />
            {[1, 2].map((i) => (
              <SkeletonPulse key={i} style={[styles.skeletonMealCard, { backgroundColor: colors.border }]} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!mealPlan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <ChefHat size={64} color={colors.icon} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t("active_menu.menu_not_found")}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.errorButton, { backgroundColor: colors.emerald500 }]}
          >
            <Text style={styles.errorButtonText}>{t("active_menu.go_back")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {mealPlan.name}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Header */}
      <ProgressHeader
        plan={mealPlan}
        selectedDay={selectedDay}
        totalDays={mealPlan.days.length}
        completionRate={completionRate}
        colors={colors}
        t={t}
      />

      {/* Day Tabs */}
      <View style={[styles.dayTabsWrapper, { backgroundColor: colors.surface }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabsContent}
        >
          {mealPlan.days.map((day, index) => (
            <DayTab
              key={day.day}
              day={day}
              index={index}
              isSelected={selectedDay === index}
              onSelect={() => setSelectedDay(index)}
              language={language}
              colors={colors}
            />
          ))}
        </ScrollView>
      </View>

      {/* Meals List */}
      <Animated.ScrollView
        style={[styles.mealsScrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.mealsContainer}
        showsVerticalScrollIndicator={false}
      >
        {currentDay?.meals.map((meal) => (
          <ActiveMealCard
            key={meal.meal_id}
            meal={meal}
            isExpanded={expandedMeals.has(meal.meal_id)}
            onToggle={() => toggleMealExpanded(meal.meal_id)}
            checkedIngredients={checkedIngredients}
            onToggleIngredient={toggleIngredientCheck}
            colors={colors}
            t={t}
          />
        ))}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.reviewModal, { backgroundColor: colors.card }]}>
            {/* Trophy Icon */}
            <View style={[styles.reviewIconContainer, { backgroundColor: colors.emerald500 + "20" }]}>
              {reviewType === "completed" ? (
                <Trophy size={40} color={colors.emerald500} />
              ) : (
                <TrendingUp size={40} color={colors.warning || "#f59e0b"} />
              )}
            </View>

            <Text style={[styles.reviewTitle, { color: colors.text }]}>
              {reviewType === "completed"
                ? t("active_menu.congratulations")
                : t("active_menu.menu_period_ended")}
            </Text>
            <Text style={[styles.reviewSubtitle, { color: colors.icon }]}>
              {reviewType === "completed"
                ? t("active_menu.completed_message")
                : t("active_menu.how_did_it_go")}
            </Text>

            {/* Star Rating */}
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)} style={styles.starButton}>
                  <Star
                    size={36}
                    color={star <= rating ? "#f59e0b" : colors.border}
                    fill={star <= rating ? "#f59e0b" : "transparent"}
                  />
                </Pressable>
              ))}
            </View>

            {/* Feedback Input */}
            <TextInput
              style={[
                styles.feedbackInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={
                reviewType === "completed"
                  ? t("active_menu.share_experience")
                  : t("active_menu.what_prevented")
              }
              placeholderTextColor={colors.icon}
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
              style={[styles.submitButton, { backgroundColor: colors.emerald500 }]}
            >
              {isSubmittingReview ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>{t("active_menu.submit_review")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonHeaderTitle: {
    width: 150,
    height: 24,
    borderRadius: 8,
  },
  skeletonProgressHeader: {
    height: 140,
    borderRadius: 20,
    marginBottom: 16,
  },
  skeletonDayTabs: {
    height: 80,
    borderRadius: 16,
    marginBottom: 16,
  },
  skeletonMealCard: {
    height: 110,
    borderRadius: 18,
    marginBottom: 14,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  errorButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Header
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

  // Progress Header
  progressHeader: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
  },
  progressHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  progressHeaderLeft: {
    flex: 1,
  },
  progressBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 10,
  },
  progressBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  progressTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  progressSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
  },
  progressCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressCircleValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  progressCircleLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "600",
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 3,
  },

  // Day Tabs
  dayTabsWrapper: {
    paddingVertical: 12,
  },
  dayTabsContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  dayTab: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 75,
    borderWidth: 1,
  },
  dayTabName: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayTabDate: {
    fontSize: 22,
    fontWeight: "800",
    marginVertical: 2,
  },
  dayTabMonth: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Meals
  mealsScrollView: {
    flex: 1,
  },
  mealsContainer: {
    padding: 16,
    gap: 14,
  },
  mealCard: {
    borderRadius: 18,
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
    position: "relative",
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
  mealEmoji: {
    fontSize: 28,
  },
  miniProgressBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniProgressText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
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
    fontSize: 16,
    fontWeight: "700",
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
  mealMetaDot: {
    fontSize: 13,
  },
  expandIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  // Expanded Content
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
    borderRadius: 14,
  },
  nutritionItem: {
    alignItems: "center",
    flex: 1,
  },
  nutritionDivider: {
    width: 1,
    height: 28,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: "800",
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
    fontSize: 15,
    fontWeight: "700",
  },
  checkedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: "auto",
  },
  checkedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
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
    borderRadius: 14,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
  },

  // Review Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  reviewModal: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 420,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  reviewIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  reviewTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  reviewSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
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
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    marginBottom: 24,
  },
  submitButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
