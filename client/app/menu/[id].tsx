import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
  Modal,
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
  DollarSign,
  Info,
  Check,
  Sparkles,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/src/services/api";
import { DietaryIcons } from "@/components/menu/DietaryIcons";
import { NutritionHabits } from "@/components/menu/NutritionHabits";

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
      Alert.alert(t("menu_details.error"), t("menu_details.failed_to_load"));
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
          t("menu_details.success"),
          t("menu_details.menu_activated"),
          [
            {
              text: t("menu_details.view_active_menu"),
              onPress: () => router.push(`/menu/activeMenu?planId=${id}`),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error starting menu:", error);
      Alert.alert(t("menu_details.error"), t("menu_details.failed_to_start"));
    } finally {
      setIsStarting(false);
    }
  };

  const handleShare = async () => {
    try {
      const mealCount = menu?.meals.length || 0;
      await Share.share({
        message: t("menu_details.share_message", {
          days: menu?.days_count,
          title: menu?.title,
          mealCount,
          calories: menu?.total_calories,
          cost: menu?.estimated_cost || 0,
        }),
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const toggleMealExpanded = useCallback((mealId: string) => {
    setExpandedMeal((prev) => (prev === mealId ? null : mealId));
  }, []);

  const getMealTypeEmoji = useCallback((type: string) => {
    const typeMap: Record<string, string> = {
      BREAKFAST: "🌅",
      LUNCH: "☀️",
      DINNER: "🌙",
      SNACK: "🍎",
      MORNING_SNACK: "🥐",
      AFTERNOON_SNACK: "🍪",
    };
    return typeMap[type] || "🍽️";
  }, []);

  const getMealTypeColor = useCallback((type: string) => {
    const colorMap: Record<string, string> = {
      BREAKFAST: "#F59E0B",
      LUNCH: "#10B981",
      DINNER: "#6366F1",
      SNACK: "#EC4899",
      MORNING_SNACK: "#F97316",
      AFTERNOON_SNACK: "#A855F7",
    };
    return colorMap[type] || "#6B7280";
  }, []);

  const getMealTypeLabel = useCallback(
    (type: string) => {
      return t(`menu_details.meal_types.${type}`, type);
    },
    [t]
  );

  const mealsForDay = useMemo(
    () => menu?.meals.filter((m) => m.day_number === selectedDay) || [],
    [menu, selectedDay]
  );

  const uniqueDays = useMemo(
    () =>
      [...new Set(menu?.meals.map((m) => m.day_number) || [])].sort(
        (a, b) => a - b
      ),
    [menu]
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
          {t("menu_details.loading_menu")}
        </Text>
      </View>
    );
  }

  if (!menu) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t("menu_details.menu_not_found")}
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.errorButton, { color: colors.primary }]}>
              {t("menu_details.go_back")}
            </Text>
          </Pressable>
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
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {menu.title}
          </Text>
          <View style={styles.headerBadges}>
            <View
              style={[
                styles.headerBadge,
                { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <Calendar size={12} color={colors.textSecondary} />
              <Text
                style={[
                  styles.headerBadgeText,
                  { color: colors.textSecondary },
                ]}
              >
                {menu.days_count} {t("menu_details.days")}
              </Text>
            </View>
            <View
              style={[
                styles.headerBadge,
                { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <Utensils size={12} color={colors.textSecondary} />
              <Text
                style={[
                  styles.headerBadgeText,
                  { color: colors.textSecondary },
                ]}
              >
                {menu.meals.length} {t("menu_details.meals")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable onPress={handleShare} style={styles.headerIconButton}>
            <Share2 size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => setIsFavorite(!isFavorite)}
            style={styles.headerIconButton}
          >
            <Heart
              size={20}
              color={isFavorite ? colors.error : colors.textSecondary}
              fill={isFavorite ? colors.error : "transparent"}
            />
          </Pressable>
        </View>
      </View>

      {/* Stats Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContainer}
      >
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.statIconContainer,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Flame size={24} color={colors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {Math.round(menu.total_calories / menu.days_count)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t("menu_details.avg_cal_day")}
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.statIconContainer,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Target size={24} color={colors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {menu.total_protein
              ? Math.round(menu.total_protein / menu.days_count)
              : 0}
            g
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t("menu_details.protein_day")}
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.statIconContainer,
              { backgroundColor: colors.warning + "20" },
            ]}
          >
            <DollarSign size={24} color={colors.warning} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            ₪{menu.estimated_cost || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t("menu_details.est_cost")}
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.statIconContainer,
              { backgroundColor: colors.error + "20" },
            ]}
          >
            <Clock size={24} color={colors.error} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {menu.prep_time_minutes || 30}
            {t("menu_details.min")}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t("menu_details.avg_prep")}
          </Text>
        </View>
      </ScrollView>

      {/* Day Selector */}
      <View
        style={[
          styles.daySelectorContainer,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelector}
        >
          {uniqueDays.map((day) => {
            const isSelected = selectedDay === day;
            const dayMeals = menu.meals.filter((m) => m.day_number === day);
            const totalCalories = dayMeals.reduce(
              (sum, m) => sum + m.calories,
              0
            );

            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
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
                    styles.dayTabLabel,
                    { color: isSelected ? "#ffffff" : colors.textSecondary },
                  ]}
                >
                  {t("menu_details.day")}
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
                    {
                      color: isSelected
                        ? "rgba(255,255,255,0.9)"
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {Math.round(totalCalories)} {t("menu_details.kcal")}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Meals List */}
      <Animated.ScrollView
        style={[styles.mealsScrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.mealsContainer}
        showsVerticalScrollIndicator={false}
      >
        {mealsForDay.map((meal) => {
          const isExpanded = expandedMeal === meal.meal_id;
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
                  <View style={styles.mealTypeRow}>
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
                    {meal.prep_time_minutes && (
                      <View style={styles.prepTimeBadge}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text
                          style={[
                            styles.prepTimeText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {meal.prep_time_minutes}
                          {t("menu_details.min")}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[styles.mealName, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {meal.name}
                  </Text>
                  <View style={styles.mealMetaRow}>
                    <View style={styles.mealMetaItem}>
                      <Flame size={14} color={colors.primary} />
                      <Text
                        style={[
                          styles.mealMetaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {Math.round(meal.calories)} {t("menu_details.cal")}
                      </Text>
                    </View>
                    <View style={styles.mealMetaItem}>
                      <Target size={14} color={colors.primary} />
                      <Text
                        style={[
                          styles.mealMetaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {Math.round(meal.protein)}g {t("menu_details.protein")}
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
                    <ChevronUp size={22} color={colors.textSecondary} />
                  ) : (
                    <ChevronDown size={22} color={colors.textSecondary} />
                  )}
                </View>
              </Pressable>

              {/* Expanded Content */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  {/* Nutrition Grid */}
                  <View
                    style={[
                      styles.nutritionSection,
                      { borderTopColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t("menu_details.nutrition_facts")}
                    </Text>
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
                          {Math.round(meal.calories)}
                        </Text>
                        <Text
                          style={[
                            styles.nutritionLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("menu_details.calories")}
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
                            { color: colors.primary },
                          ]}
                        >
                          {Math.round(meal.protein)}g
                        </Text>
                        <Text
                          style={[
                            styles.nutritionLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("menu_details.protein")}
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
                          {Math.round(meal.carbs)}g
                        </Text>
                        <Text
                          style={[
                            styles.nutritionLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("menu_details.carbs")}
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
                            { color: colors.error },
                          ]}
                        >
                          {Math.round(meal.fat)}g
                        </Text>
                        <Text
                          style={[
                            styles.nutritionLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("menu_details.fat")}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Ingredients */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Sparkles size={18} color={colors.primary} />
                      <Text
                        style={[styles.sectionTitle, { color: colors.text }]}
                      >
                        {t("menu_details.ingredients")}
                      </Text>
                    </View>
                    <View style={styles.ingredientsList}>
                      {meal.ingredients.map((ingredient) => (
                        <View
                          key={ingredient.ingredient_id}
                          style={styles.ingredientItem}
                        >
                          <View
                            style={[
                              styles.ingredientDot,
                              { backgroundColor: colors.primary },
                            ]}
                          />
                          <Text
                            style={[
                              styles.ingredientText,
                              { color: colors.text },
                            ]}
                          >
                            <Text style={styles.ingredientQuantity}>
                              {ingredient.quantity} {ingredient.unit}
                            </Text>{" "}
                            {ingredient.name}
                          </Text>
                          {ingredient.estimated_cost && (
                            <Text
                              style={[
                                styles.ingredientCost,
                                { color: colors.textSecondary },
                              ]}
                            >
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
                        <ChefHat size={18} color={colors.primary} />
                        <Text
                          style={[styles.sectionTitle, { color: colors.text }]}
                        >
                          {t("menu_details.cooking_method")}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.cookingMethodBadge,
                          { backgroundColor: colors.primary + "15" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cookingMethodText,
                            { color: colors.primary },
                          ]}
                        >
                          {meal.cooking_method}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Instructions */}
                  {meal.instructions && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Info size={18} color={colors.warning} />
                        <Text
                          style={[styles.sectionTitle, { color: colors.text }]}
                        >
                          {t("menu_details.instructions")}
                        </Text>
                      </View>
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

        {/* Bottom Spacing for FAB */}
        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Floating Action Button */}
      {!menu.is_active && (
        <View style={styles.fabContainer}>
          <Pressable
            onPress={() => setShowStartModal(true)}
            style={[styles.fab, { backgroundColor: colors.primary }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Sparkles size={22} color="#ffffff" />
              <Text style={styles.fabText}>{t("menu_details.start_menu")}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* Start Modal */}
      <Modal
        visible={showStartModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStartModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowStartModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[styles.startModal, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <View
                  style={[
                    styles.modalIconContainer,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <Sparkles size={32} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t("menu_details.start_this_menu")}
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("menu_details.activate_description")}
                </Text>
              </View>

              <View style={styles.modalFeatures}>
                <View style={styles.modalFeature}>
                  <Check size={20} color={colors.success} />
                  <Text
                    style={[styles.modalFeatureText, { color: colors.text }]}
                  >
                    {t("menu_details.track_ingredients")}
                  </Text>
                </View>
                <View style={styles.modalFeature}>
                  <Check size={20} color={colors.success} />
                  <Text
                    style={[styles.modalFeatureText, { color: colors.text }]}
                  >
                    {t("menu_details.daily_progress")}
                  </Text>
                </View>
                <View style={styles.modalFeature}>
                  <Check size={20} color={colors.success} />
                  <Text
                    style={[styles.modalFeatureText, { color: colors.text }]}
                  >
                    {t("menu_details.completion_rewards")}
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setShowStartModal(false)}
                  style={[
                    styles.modalButton,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                >
                  <Text
                    style={[styles.modalButtonText, { color: colors.text }]}
                  >
                    {t("menu_details.cancel")}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleStartMenu}
                  disabled={isStarting}
                  style={[
                    styles.modalButton,
                    { backgroundColor: colors.primary, flex: 1 },
                  ]}
                >
                  {isStarting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Sparkles size={18} color="#ffffff" />
                      <Text
                        style={[styles.modalButtonText, { color: "#ffffff" }]}
                      >
                        {t("menu_details.start_now")}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </Pressable>
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
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerBadges: {
    flexDirection: "row",
    gap: 8,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "600",
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
    maxHeight: 140,
    marginTop: 16,
  },
  statsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    width: 115,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  statIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  daySelectorContainer: {
    marginTop: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  daySelector: {
    paddingHorizontal: 16,
    gap: 10,
  },
  dayTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 95,
    gap: 4,
    borderWidth: 1,
  },
  dayTabLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  dayTabNumber: {
    fontSize: 26,
    fontWeight: "800",
  },
  dayTabCalories: {
    fontSize: 11,
    fontWeight: "600",
  },
  mealsScrollView: {
    flex: 1,
  },
  mealsContainer: {
    padding: 16,
    gap: 16,
  },
  mealCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },
  mealHeader: {
    flexDirection: "row",
    padding: 16,
    gap: 14,
  },
  mealImageContainer: {},
  mealImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  mealImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  mealImageEmoji: {
    fontSize: 34,
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
    fontWeight: "600",
  },
  mealName: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
  },
  mealMetaRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  mealMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mealMetaText: {
    fontSize: 13,
    fontWeight: "600",
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
    gap: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderRadius: 12,
  },
  nutritionItem: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  nutritionDivider: {
    width: 1,
    height: 32,
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
    gap: 12,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    paddingVertical: 14,
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
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 20,
    left: 20,
    alignItems: "flex-end",
  },
  fab: {
    borderRadius: 32,
  },
  fabGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 32,
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
    maxWidth: 420,
    borderRadius: 24,
    padding: 28,
  },
  modalHeader: {
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  modalFeatures: {
    gap: 14,
    marginBottom: 28,
  },
  modalFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalFeatureText: {
    fontSize: 15,
    fontWeight: "600",
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
    minWidth: 110,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  habitsSection: {
    marginTop: 8,
  },
});
