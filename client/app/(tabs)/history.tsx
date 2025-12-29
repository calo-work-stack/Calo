import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/src/store";
import {
  fetchMeals,
  saveMealFeedback,
  toggleMealFavorite,
  duplicateMeal,
  removeMeal,
} from "@/src/store/mealSlice";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { useMealDataRefresh } from "@/hooks/useMealDataRefresh";
import {
  Search,
  Filter,
  Heart,
  Star,
  Copy,
  Flame,
  Droplets,
  Target,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  Camera,
  Wheat,
  Dumbbell,
  Calendar,
  Activity,
  Plus,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Apple,
  Sparkles,
  TrendingUp,
  Award,
  Zap,
  Scale,
  Utensils,
} from "lucide-react-native";
import LoadingScreen from "@/components/LoadingScreen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { nutritionAPI } from "@/src/services/api";
import ManualMealAddition from "@/components/history/ManualMealAddition";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 40;

interface FilterOptions {
  category: string;
  dateRange: string;
  minCalories: number;
  maxCalories: number;
  showFavoritesOnly: boolean;
}
const CATEGORIES = [
  {
    key: "all",
    label: "history.categories.all",
    icon: Target,
    gradient: ["#0d9488", "#0d9488"],
  },
  {
    key: "high_protein",
    label: "history.categories.highProtein",
    icon: Dumbbell,
    gradient: ["#EF4444", "#DC2626"],
  },
  {
    key: "high_carb",
    label: "history.categories.highCarb",
    icon: Wheat,
    gradient: ["#F59E0B", "#D97706"],
  },
  {
    key: "high_fat",
    label: "history.categories.highFat",
    icon: Droplets,
    gradient: ["#3B82F6", "#2563EB"],
  },
  {
    key: "balanced",
    label: "history.categories.balanced",
    icon: Activity,
    gradient: ["#10B981", "#059669"],
  },
  {
    key: "low_calorie",
    label: "history.categories.lowCalorie",
    icon: Flame,
    gradient: ["#F97316", "#EA580C"],
  },
];
const DATE_RANGES = [
  { key: "all", label: "history.timeRanges.all", icon: Calendar },
  { key: "today", label: "history.timeRanges.today", icon: Calendar },
  { key: "week", label: "history.timeRanges.thisWeek", icon: Calendar },
  { key: "month", label: "history.timeRanges.thisMonth", icon: Calendar },
];

const NUTRITION_ICONS = {
  calories: {
    icon: Flame,
    name: "nutrition.calories",
    color: "#F59E0B",
    unit: "kcal",
  },
  protein: {
    icon: Dumbbell,
    name: "nutrition.protein",
    color: "#EF4444",
    unit: "g",
  },
  carbs: { icon: Wheat, name: "nutrition.carbs", color: "#10B981", unit: "g" },
  fat: { icon: Droplets, name: "nutrition.fat", color: "#3B82F6", unit: "g" },
};

const getMealPeriodStyle = (mealPeriod: string) => {
  const baseStyles = {
    breakfast: {
      gradient: ["#FBBF24", "#F59E0B"],
      iconColor: "#F59E0B",
      textColor: "#92400E",
      icon: Sunrise,
      bgColor: "#FEF3C7",
    },
    lunch: {
      gradient: ["#F87171", "#EF4444"],
      iconColor: "#EF4444",
      textColor: "#991B1B",
      icon: Sun,
      bgColor: "#FEE2E2",
    },
    dinner: {
      gradient: ["#34D399", "#10B981"],
      iconColor: "#10B981",
      textColor: "#065F46",
      icon: Sunset,
      bgColor: "#D1FAE5",
    },
    snack: {
      gradient: ["#FB923C", "#F97316"],
      iconColor: "#F97316",
      textColor: "#9A3412",
      icon: Apple,
      bgColor: "#FED7AA",
    },
    late_night: {
      gradient: ["#60A5FA", "#3B82F6"],
      iconColor: "#3B82F6",
      textColor: "#1E3A8A",
      icon: Moon,
      bgColor: "#DBEAFE",
    },
  };

  const mealType = mealPeriod?.toLowerCase().replace(/\s+/g, "_") || "other";
  const style = baseStyles[mealType as keyof typeof baseStyles];

  if (!style) {
    return {
      gradient: ["#9CA3AF", "#6B7280"],
      iconColor: "#6B7280",
      textColor: "#374151",
      icon: Coffee,
      bgColor: "#F3F4F6",
    };
  }

  return style;
};

const SwipeableMealCard = ({
  meal,
  onDelete,
  onDuplicate,
  onToggleFavorite,
}: any) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const [isExpanded, setIsExpanded] = useState(false);
  const [savingRatings, setSavingRatings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  const [localMealData, setLocalMealData] = useState({
    taste_rating: meal.taste_rating || 0,
    satiety_rating: meal.satiety_rating || 0,
    energy_rating: meal.energy_rating || 0,
    heaviness_rating: meal.heaviness_rating || 0,
    is_favorite: meal.is_favorite || false,
  });
  const { immediateRefresh } = useMealDataRefresh();
  const swipeableRef = React.useRef<any>(null);

  const animatedHeight = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];
  const mealPeriodStyle = getMealPeriodStyle(
    meal.meal_period || meal.mealPeriod || "other"
  );
  const MealIcon = mealPeriodStyle.icon;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isExpanded ? 1 : 0,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  useEffect(() => {
    setLocalMealData({
      taste_rating: meal.taste_rating || 0,
      satiety_rating: meal.satiety_rating || 0,
      energy_rating: meal.energy_rating || 0,
      heaviness_rating: meal.heaviness_rating || 0,
      is_favorite: meal.is_favorite || false,
    });
  }, [
    meal.taste_rating,
    meal.satiety_rating,
    meal.energy_rating,
    meal.heaviness_rating,
    meal.is_favorite,
  ]);

  const handleRatingChange = (key: string, value: number) => {
    setLocalMealData((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleFavorite = async () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      setLocalMealData((prev) => ({ ...prev, is_favorite: !prev.is_favorite }));
      await onToggleFavorite(meal.id || meal.meal_id?.toString());
    } catch (error) {
      setLocalMealData((prev) => ({ ...prev, is_favorite: !prev.is_favorite }));
    }
  };

  const handleSaveRatings = async () => {
    try {
      setSavingRatings(true);
      const mealId = meal.id || meal.meal_id?.toString();
      if (!mealId) throw new Error("No meal ID found");

      const result = await dispatch(
        saveMealFeedback({
          mealId,
          feedback: {
            tasteRating: localMealData.taste_rating,
            satietyRating: localMealData.satiety_rating,
            energyRating: localMealData.energy_rating,
            heavinessRating: localMealData.heaviness_rating,
          },
        })
      ).unwrap();

      if (result) {
        Alert.alert(t("common.success"), t("history.messages.ratingsSaved"));
        immediateRefresh();
      }
    } catch (error) {
      console.error("Failed to save ratings:", error);
      Alert.alert(t("common.error"), t("history.messages.ratingsSaveFailed"));
    } finally {
      setSavingRatings(false);
    }
  };

  const handleCopyPress = () => {
    setShowCopyConfirm(true);
    swipeableRef.current?.close();
  };

  const handleDeletePress = () => {
    setShowDeleteConfirm(true);
    swipeableRef.current?.close();
  };

  const confirmCopy = () => {
    setShowCopyConfirm(false);
    onDuplicate(meal.id || meal.meal_id?.toString());
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(meal.id || meal.meal_id?.toString());
  };

  const renderLeftActions = () => (
    <View style={styles.swipeActionWrapper}>
      <TouchableOpacity
        style={styles.swipeActionButton}
        onPress={handleCopyPress}
        activeOpacity={0.85}
      >
        <View style={styles.swipeActionGradient}>
          <View style={styles.swipeIconWrapper}>
            <Copy size={24} color={colors.success} strokeWidth={2.5} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderRightActions = () => (
    <View style={styles.swipeActionWrapper}>
      <TouchableOpacity
        style={styles.swipeActionButton}
        onPress={handleDeletePress}
        activeOpacity={0.85}
      >
        <View style={styles.swipeActionGradient}>
          <View style={styles.swipeIconWrapper}>
            <Trash2 size={24} color={colors.destructive} strokeWidth={2.5} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderStarRating = (
    rating: number,
    onPress: (rating: number) => void
  ) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress(star)}
            style={styles.starButton}
            activeOpacity={0.6}
          >
            <Star
              size={20}
              color={star <= rating ? "#FBBF24" : "#E5E7EB"}
              fill={star <= rating ? "#FBBF24" : "transparent"}
              strokeWidth={2}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getNutritionValue = (key: string) => {
    switch (key) {
      case "calories":
        return Math.round(meal.calories || 0);
      case "protein":
        return Math.round(meal.protein_g || meal.protein || 0);
      case "carbs":
        return Math.round(meal.carbs_g || meal.carbs || 0);
      case "fat":
        return Math.round(meal.fats_g || meal.fat || 0);
      default:
        return 0;
    }
  };

  const getIngredients = () => {
    if (!meal.ingredients) return [];
    if (Array.isArray(meal.ingredients)) return meal.ingredients;
    if (typeof meal.ingredients === "string") {
      try {
        return JSON.parse(meal.ingredients);
      } catch {
        return [];
      }
    }
    return [];
  };

  const ingredients = getIngredients();

  return (
    <View style={styles.swipeContainer}>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        leftThreshold={40}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
      >
        <View style={[styles.mealCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.cardContent}
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.95}
          >
            <View style={styles.cardImageContainer}>
              {meal.image_url ? (
                <Image
                  source={{ uri: meal.image_url }}
                  style={styles.cardImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Camera size={32} color="#FFFFFF" strokeWidth={2} />
                </View>
              )}
              {localMealData.is_favorite && (
                <View style={styles.heartBadge}>
                  <Heart
                    size={14}
                    color="#FFFFFF"
                    fill="#FFFFFF"
                    strokeWidth={2.5}
                  />
                </View>
              )}
            </View>

            <View style={styles.cardInfo}>
              <View style={styles.mealHeader}>
                <View style={styles.mealTitleRow}>
                  <Text
                    style={[styles.mealName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {meal.meal_name || meal.name || t("common.unknown_meal")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.mealPeriodBadge,
                    { backgroundColor: mealPeriodStyle.bgColor },
                  ]}
                >
                  <MealIcon
                    size={12}
                    color={mealPeriodStyle.iconColor}
                    strokeWidth={2.5}
                  />
                </View>
              </View>

              <View style={styles.mealMetaRow}>
                <View style={styles.caloriesBadge}>
                  <Flame size={14} color="#F59E0B" strokeWidth={2.5} />
                  <Text style={styles.caloriesText}>
                    {Math.round(meal.calories || 0)}
                  </Text>
                  <Text style={styles.caloriesUnit}>kcal</Text>
                </View>

                <Text
                  style={[styles.mealDate, { color: colors.textSecondary }]}
                >
                  {new Date(
                    meal.created_at || meal.upload_time
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>

              {localMealData.taste_rating > 0 && (
                <View style={styles.quickRatingRow}>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={11}
                      color={
                        i < localMealData.taste_rating ? "#FBBF24" : "#E5E7EB"
                      }
                      fill={
                        i < localMealData.taste_rating
                          ? "#FBBF24"
                          : "transparent"
                      }
                      strokeWidth={2}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.cardActions}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  onPress={handleToggleFavorite}
                  style={[
                    styles.favoriteButton,
                    {
                      backgroundColor: localMealData.is_favorite
                        ? "#FEE2E2"
                        : colors.background,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Heart
                    size={20}
                    color={
                      localMealData.is_favorite
                        ? "#EF4444"
                        : colors.textSecondary
                    }
                    fill={localMealData.is_favorite ? "#EF4444" : "transparent"}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
              </Animated.View>

              <View
                style={[
                  styles.expandButton,
                  {
                    backgroundColor: isExpanded
                      ? mealPeriodStyle.bgColor
                      : colors.background,
                  },
                ]}
              >
                {isExpanded ? (
                  <ChevronUp
                    size={18}
                    color={
                      isExpanded
                        ? mealPeriodStyle.iconColor
                        : colors.textSecondary
                    }
                    strokeWidth={3}
                  />
                ) : (
                  <ChevronDown
                    size={18}
                    color={
                      isExpanded
                        ? mealPeriodStyle.iconColor
                        : colors.textSecondary
                    }
                    strokeWidth={3}
                  />
                )}
              </View>
            </View>
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.expandedSection,
              {
                opacity: animatedHeight,
                maxHeight: animatedHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 2000],
                }),
              },
            ]}
          >
            {isExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.divider} />

                <View style={styles.nutritionSection}>
                  <View style={styles.sectionHeader}>
                    <View
                      style={[
                        styles.sectionIconBg,
                        { backgroundColor: mealPeriodStyle.bgColor },
                      ]}
                    >
                      <TrendingUp
                        size={16}
                        color={mealPeriodStyle.iconColor}
                        strokeWidth={2.5}
                      />
                    </View>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t("history.nutritionInfo")}
                    </Text>
                  </View>

                  <View style={styles.nutritionGrid}>
                    {Object.entries(NUTRITION_ICONS).map(([key, config]) => {
                      const IconComponent = config.icon;
                      const value = getNutritionValue(key);
                      return (
                        <View
                          key={key}
                          style={[
                            styles.nutritionCard,
                            { backgroundColor: colors.background },
                          ]}
                        >
                          <View
                            style={[
                              styles.nutritionIconContainer,
                              { backgroundColor: config.color + "15" },
                            ]}
                          >
                            <IconComponent
                              size={18}
                              color={config.color}
                              strokeWidth={2.5}
                            />
                          </View>
                          <Text
                            style={[
                              styles.nutritionValue,
                              { color: colors.text },
                            ]}
                          >
                            {value}
                            <Text
                              style={[
                                styles.nutritionUnit,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {config.unit}
                            </Text>
                          </Text>
                          <Text
                            style={[
                              styles.nutritionLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {t(config.name)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {ingredients && ingredients.length > 0 && (
                  <View style={styles.ingredientsSection}>
                    <View style={styles.sectionHeader}>
                      <View
                        style={[
                          styles.sectionIconBg,
                          { backgroundColor: "#DCFCE7" },
                        ]}
                      >
                        <Apple size={16} color="#10B981" strokeWidth={2.5} />
                      </View>
                      <Text
                        style={[styles.sectionTitle, { color: colors.text }]}
                      >
                        {t("history.ingredients")}
                      </Text>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>
                          {ingredients.length}
                        </Text>
                      </View>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.ingredientsScrollContainer}
                    >
                      {ingredients.map((ingredient: any, index: number) => {
                        const ingredientName =
                          typeof ingredient === "string"
                            ? ingredient
                            : ingredient.name ||
                              ingredient.ingredient_name ||
                              `Ingredient ${index + 1}`;

                        return (
                          <View
                            key={`ingredient-${index}`}
                            style={styles.ingredientChip}
                          >
                            <Text style={styles.ingredientText}>
                              {ingredientName}
                            </Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.ratingSection}>
                  <View style={styles.sectionHeader}>
                    <View
                      style={[
                        styles.sectionIconBg,
                        { backgroundColor: "#FEF3C7" },
                      ]}
                    >
                      <Star
                        size={16}
                        color="#F59E0B"
                        strokeWidth={2.5}
                        fill="#F59E0B"
                      />
                    </View>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t("history.rateExperience")}
                    </Text>
                  </View>

                  <View style={styles.ratingsContainer}>
                    {[
                      {
                        key: "taste_rating",
                        label: "history.ratings.taste",
                        Icon: Utensils,
                        color: "#F59E0B",
                      },
                      {
                        key: "satiety_rating",
                        label: "history.ratings.fullness",
                        Icon: Heart,
                        color: "#10B981",
                      },
                      {
                        key: "energy_rating",
                        label: "history.ratings.energy",
                        Icon: Zap,
                        color: "#3B82F6",
                      },
                      {
                        key: "heaviness_rating",
                        label: "history.ratings.heaviness",
                        Icon: Scale,
                        color: "#8B5CF6",
                      },
                    ].map(({ key, label, Icon, color }) => {
                      return (
                        <View
                          key={key}
                          style={[
                            styles.ratingItem,
                            { backgroundColor: colors.background },
                          ]}
                        >
                          <View style={styles.ratingItemHeader}>
                            <View
                              style={[
                                styles.ratingEmojiContainer,
                                { backgroundColor: color + "15" },
                              ]}
                            >
                              <Icon size={18} color={color} strokeWidth={2.5} />
                            </View>
                            <Text
                              style={[
                                styles.ratingLabel,
                                { color: colors.text },
                              ]}
                            >
                              {t(label)}
                            </Text>
                          </View>
                          {renderStarRating(
                            localMealData[
                              key as keyof typeof localMealData
                            ] as number,
                            (rating) => handleRatingChange(key, rating)
                          )}
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveRatings}
                    disabled={savingRatings}
                    activeOpacity={0.8}
                  >
                    <View style={styles.saveButtonGradient}>
                      {savingRatings ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Sparkles
                            size={18}
                            color="#ffffff"
                            strokeWidth={2.5}
                          />
                          <Text style={styles.saveButtonText}>
                            {t("history.saveRatings")}
                          </Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      </Swipeable>

      <Modal
        visible={showCopyConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCopyConfirm(false)}
      >
        <BlurView intensity={40} tint="dark" style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.confirmIconContainer,
                { backgroundColor: "#DCFCE7" },
              ]}
            >
              <Copy size={32} color="#10B981" strokeWidth={2.5} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>
              {t("history.confirm.copyTitle")}
            </Text>
            <Text
              style={[styles.confirmMessage, { color: colors.textSecondary }]}
            >
              {t("history.confirm.copyMessage")}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[
                  styles.confirmCancelButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setShowCopyConfirm(false)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.confirmCancelText, { color: colors.text }]}
                >
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmCopy}
                activeOpacity={0.8}
              >
                <View style={styles.confirmButtonGradient}>
                  <Copy size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.confirmButtonText}>
                    {t("history.actions.copy")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <BlurView intensity={40} tint="dark" style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.confirmIconContainer,
                { backgroundColor: "#FEE2E2" },
              ]}
            >
              <Trash2 size={32} color="#EF4444" strokeWidth={2.5} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>
              {t("history.confirm.deleteTitle")}
            </Text>
            <Text
              style={[styles.confirmMessage, { color: colors.textSecondary }]}
            >
              {t("history.confirm.deleteMessage")}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[
                  styles.confirmCancelButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setShowDeleteConfirm(false)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.confirmCancelText, { color: colors.text }]}
                >
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmDelete}
                activeOpacity={0.8}
              >
                <View style={styles.confirmButtonGradient}>
                  <Trash2 size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.confirmButtonText}>
                    {t("history.actions.delete")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
};

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { meals, isLoading } = useSelector((state: RootState) => state.meal);
  const { refreshAllMealData, refreshMealData } = useMealDataRefresh();

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    category: "all",
    dateRange: "all",
    minCalories: 0,
    maxCalories: 2000,
    showFavoritesOnly: false,
  });

  const [showManualMealModal, setShowManualMealModal] = useState(false);

  useEffect(() => {
    dispatch(fetchMeals());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAllMealData();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllMealData]);

  const handleToggleFavorite = useCallback(
    async (mealId: string) => {
      try {
        const result = await dispatch(toggleMealFavorite(mealId)).unwrap();
        if (result) {
          refreshMealData();
        }
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
        Alert.alert(
          t("common.error"),
          t("history.messages.favoriteUpdateFailed")
        );
      }
    },
    [dispatch, refreshMealData, t]
  );

  const handleDuplicateMeal = useCallback(
    async (mealId: string) => {
      try {
        await dispatch(
          duplicateMeal({
            mealId,
            newDate: new Date().toISOString().split("T")[0],
          })
        ).unwrap();
        Alert.alert(t("common.success"), t("history.messages.mealDuplicated"));
        refreshMealData();
      } catch (error) {
        console.error("Failed to duplicate meal:", error);
        Alert.alert(t("common.error"), t("history.messages.duplicateFailed"));
      }
    },
    [dispatch, refreshMealData, t]
  );

  const handleRemoveMeal = useCallback(
    async (mealId: string) => {
      try {
        await dispatch(removeMeal(mealId)).unwrap();
        refreshMealData();
      } catch (error) {
        console.error("Failed to remove meal:", error);
        Alert.alert(t("common.error"), t("history.messages.deleteFailed"));
      }
    },
    [dispatch, refreshMealData, t]
  );

  const filteredMeals = useMemo(() => {
    if (!meals) return [];

    return meals.filter((meal: any) => {
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          meal.name?.toLowerCase().includes(query) ||
          meal.meal_name?.toLowerCase().includes(query) ||
          meal.description?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (filters.category !== "all") {
        const calories = meal.calories || 0;
        const protein = meal.protein || meal.protein_g || 0;
        const carbs = meal.carbs || meal.carbs_g || 0;
        const fat = meal.fat || meal.fats_g || 0;
        const total = protein + carbs + fat;

        switch (filters.category) {
          case "high_protein":
            if (total === 0 || protein / total < 0.3) return false;
            break;
          case "high_carb":
            if (total === 0 || carbs / total < 0.5) return false;
            break;
          case "high_fat":
            if (total === 0 || fat / total < 0.35) return false;
            break;
          case "balanced":
            if (total === 0) return false;
            const proteinRatio = protein / total;
            const carbRatio = carbs / total;
            const fatRatio = fat / total;
            if (
              proteinRatio < 0.2 ||
              proteinRatio > 0.4 ||
              carbRatio < 0.3 ||
              carbRatio > 0.6 ||
              fatRatio < 0.15 ||
              fatRatio > 0.4
            )
              return false;
            break;
          case "low_calorie":
            if (calories > 300) return false;
            break;
        }
      }

      const calories = meal.calories || 0;
      if (calories < filters.minCalories || calories > filters.maxCalories) {
        return false;
      }

      if (filters.showFavoritesOnly && !meal.is_favorite) {
        return false;
      }

      if (filters.dateRange !== "all") {
        const mealDate = new Date(meal.created_at || meal.upload_time);
        const now = new Date();

        switch (filters.dateRange) {
          case "today":
            if (mealDate.toDateString() !== now.toDateString()) return false;
            break;
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (mealDate < weekAgo) return false;
            break;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (mealDate < monthAgo) return false;
            break;
        }
      }

      return true;
    });
  }, [meals, searchQuery, filters]);

  const insights = useMemo(() => {
    if (!filteredMeals.length) return null;

    const totalCalories = filteredMeals.reduce(
      (sum: number, meal: any) => sum + (meal.calories || 0),
      0
    );
    const avgCalories = Math.round(totalCalories / filteredMeals.length);
    const favoriteMeals = filteredMeals.filter((meal: any) => meal.is_favorite);
    const ratedMeals = filteredMeals.filter(
      (meal: any) => meal.taste_rating && meal.taste_rating > 0
    );
    const avgRating =
      ratedMeals.length > 0
        ? ratedMeals.reduce(
            (sum: number, meal: any) => sum + (meal.taste_rating || 0),
            0
          ) / ratedMeals.length
        : 0;

    return {
      totalMeals: filteredMeals.length,
      avgCalories,
      favoriteMeals: favoriteMeals.length,
      avgRating: Math.round(avgRating * 10) / 10,
      totalCalories,
    };
  }, [filteredMeals]);

  const listData = useMemo(() => {
    const data = [];
    if (insights) {
      data.push({ type: "insights", data: insights });
    }
    return data.concat(
      filteredMeals.map((meal: any) => ({ type: "meal", data: meal }))
    );
  }, [filteredMeals, insights]);

  const selectedCategory = CATEGORIES.find((c) => c.key === filters.category);

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === "insights") {
      return (
        <View style={styles.insightsCard}>
          <BlurView intensity={80} tint="light" style={styles.insightsBlur}>
            <View style={styles.insightsGradient}>
              <View style={styles.insightsHeader}>
                <View style={styles.insightsHeaderText}>
                  <Text style={styles.insightsTitle}>
                    {t("history.insights.title")}
                  </Text>
                </View>
              </View>

              <View style={styles.insightsGrid}>
                <View style={styles.insightItem}>
                  <Text style={styles.insightValue}>
                    {item.data.totalMeals}
                  </Text>
                  <Text style={styles.insightLabel}>
                    {t("history.insights.totalMeals")}
                  </Text>
                </View>

                <View style={styles.insightItem}>
                  <Text style={styles.insightValue}>
                    {item.data.avgCalories}
                  </Text>
                  <Text style={styles.insightLabel}>
                    {t("history.insights.avgCalories")}
                  </Text>
                </View>

                <View style={styles.insightItem}>
                  <Text style={styles.insightValue}>
                    {item.data.favoriteMeals}
                  </Text>
                  <Text style={styles.insightLabel}>
                    {t("history.insights.favorites")}
                  </Text>
                </View>

                <View style={styles.insightItem}>
                  <Text style={styles.insightValue}>{item.data.avgRating}</Text>
                  <Text style={styles.insightLabel}>
                    {t("history.insights.avgRating")}
                  </Text>
                </View>
              </View>
            </View>
          </BlurView>
        </View>
      );
    }

    return (
      <SwipeableMealCard
        key={item.data.meal_id}
        meal={item.data}
        onDelete={handleRemoveMeal}
        onDuplicate={handleDuplicateMeal}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  };

  if (isLoading && !meals.length) {
    return <LoadingScreen text={t("history.loading")} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {t("history.title")}
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              >
                Track your nutrition journey
              </Text>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
              <Search
                size={20}
                color={colors.textSecondary}
                strokeWidth={2.5}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t("history.searchPlaceholder")}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.textSecondary}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={18} color={colors.textSecondary} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.card }]}
              onPress={() => setShowFilters(true)}
              activeOpacity={0.7}
            >
              <Filter size={20} color={colors.background} strokeWidth={2.5} />
              {(filters.category !== "all" ||
                filters.dateRange !== "all" ||
                filters.showFavoritesOnly) && <View style={styles.filterDot} />}
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {CATEGORIES.map((category) => {
              const isSelected = filters.category === category.key;
              const IconComponent = category.icon;

              return (
                <TouchableOpacity
                  key={category.key}
                  onPress={() =>
                    setFilters((prev) => ({ ...prev, category: category.key }))
                  }
                  activeOpacity={0.7}
                >
                  {isSelected ? (
                    <View style={styles.categoryPill}>
                      <IconComponent
                        size={14}
                        color="#FFFFFF"
                        strokeWidth={2.5}
                      />
                      <Text style={styles.categoryPillTextSelected}>
                        {t(category.label)}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.categoryPillUnselected,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <IconComponent
                        size={14}
                        color={colors.textSecondary}
                        strokeWidth={2.5}
                      />
                      <Text
                        style={[
                          styles.categoryPillText,
                          { color: colors.text },
                        ]}
                      >
                        {t(category.label)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {listData.length > 0 ? (
          <FlatList
            data={listData}
            keyExtractor={(item, index) =>
              item.type === "insights" ? "insights" : index.toString()
            }
            renderItem={renderItem}
            contentContainerStyle={styles.mealsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[selectedCategory?.gradient[0] || "#8B5CF6"]}
                tintColor={selectedCategory?.gradient[0] || "#8B5CF6"}
                progressBackgroundColor={colors.card}
              />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <View
              style={[styles.emptyStateIcon, { backgroundColor: colors.card }]}
            >
              <Camera size={56} color={colors.textSecondary} strokeWidth={2} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("history.emptyState.title")}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ||
              filters.category !== "all" ||
              filters.showFavoritesOnly
                ? t("history.emptyState.adjustedFilters")
                : t("history.emptyState.default")}
            </Text>
          </View>
        )}

        <Modal
          visible={showFilters}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFilters(false)}
        >
          <BlurView intensity={50} tint="dark" style={styles.modalOverlay}>
            <View
              style={[
                styles.filterModal,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {t("history.filter.title")}
                  </Text>
                  <Text style={styles.modalSubtitle}>Customize your view</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowFilters(false)}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <X size={22} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.filterContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.filterSection}>
                  <Text
                    style={[styles.filterSectionTitle, { color: colors.text }]}
                  >
                    {t("history.filter.category")}
                  </Text>
                  <View style={styles.categoryGrid}>
                    {CATEGORIES.map((category) => {
                      const IconComponent = category.icon;
                      const isSelected = filters.category === category.key;
                      return (
                        <TouchableOpacity
                          key={category.key}
                          style={[
                            styles.filterCategoryChip,
                            {
                              backgroundColor: isSelected
                                ? category.gradient[0] + "20"
                                : colors.card,
                              borderColor: isSelected
                                ? category.gradient[0]
                                : colors.border,
                            },
                          ]}
                          onPress={() =>
                            setFilters((prev) => ({
                              ...prev,
                              category: category.key,
                            }))
                          }
                          activeOpacity={0.7}
                        >
                          <IconComponent
                            size={16}
                            color={
                              isSelected
                                ? category.gradient[0]
                                : colors.textSecondary
                            }
                            strokeWidth={2.5}
                          />
                          <Text
                            style={[
                              styles.categoryChipText,
                              {
                                color: isSelected
                                  ? category.gradient[0]
                                  : colors.text,
                              },
                            ]}
                          >
                            {t(category.label)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <Text
                    style={[styles.filterSectionTitle, { color: colors.text }]}
                  >
                    {t("history.filter.timePeriod")}
                  </Text>
                  <View style={styles.dateRangeGrid}>
                    {DATE_RANGES.map((range) => {
                      const IconComponent = range.icon;
                      const isSelected = filters.dateRange === range.key;
                      return (
                        <TouchableOpacity
                          key={range.key}
                          style={[
                            styles.dateRangeChip,
                            {
                              backgroundColor: isSelected
                                ? selectedCategory?.gradient[0] + "20"
                                : colors.card,
                              borderColor: isSelected
                                ? selectedCategory?.gradient[0]
                                : colors.border,
                            },
                          ]}
                          onPress={() =>
                            setFilters((prev) => ({
                              ...prev,
                              dateRange: range.key,
                            }))
                          }
                          activeOpacity={0.7}
                        >
                          <IconComponent
                            size={16}
                            color={
                              isSelected
                                ? selectedCategory?.gradient[0]
                                : colors.textSecondary
                            }
                            strokeWidth={2.5}
                          />
                          <Text
                            style={[
                              styles.dateRangeChipText,
                              {
                                color: isSelected
                                  ? selectedCategory?.gradient[0]
                                  : colors.text,
                              },
                            ]}
                          >
                            {t(range.label)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <TouchableOpacity
                    style={[
                      styles.favoritesToggle,
                      {
                        backgroundColor: filters.showFavoritesOnly
                          ? "#FEE2E2"
                          : colors.card,
                        borderColor: filters.showFavoritesOnly
                          ? "#EF4444"
                          : colors.border,
                      },
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        showFavoritesOnly: !prev.showFavoritesOnly,
                      }))
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.toggleLeft}>
                      <View
                        style={[
                          styles.toggleIconBg,
                          {
                            backgroundColor: filters.showFavoritesOnly
                              ? "#FFFFFF"
                              : colors.background,
                          },
                        ]}
                      >
                        <Heart
                          size={18}
                          color="#EF4444"
                          fill={
                            filters.showFavoritesOnly
                              ? "#EF4444"
                              : "transparent"
                          }
                          strokeWidth={2.5}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.favoritesToggleText,
                            { color: colors.text },
                          ]}
                        >
                          {t("history.filter.favoritesOnly")}
                        </Text>
                        <Text
                          style={[
                            styles.toggleSubtext,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Show only favorited meals
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.toggleSwitch,
                        {
                          backgroundColor: filters.showFavoritesOnly
                            ? "#EF4444"
                            : "#D1D5DB",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleSwitchThumb,
                          {
                            transform: [
                              {
                                translateX: filters.showFavoritesOnly ? 20 : 2,
                              },
                            ],
                          },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.resetButton,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() =>
                      setFilters({
                        category: "all",
                        dateRange: "all",
                        minCalories: 0,
                        maxCalories: 2000,
                        showFavoritesOnly: false,
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.resetButtonText, { color: colors.text }]}
                    >
                      {t("history.filter.reset")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => setShowFilters(false)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.applyButtonGradient}>
                      <Zap size={18} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.applyButtonText}>
                        {t("history.filter.apply")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </BlurView>
        </Modal>

        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setShowManualMealModal(true)}
          activeOpacity={0.9}
        >
          <View>
            <Plus size={24} color="#FFFFFF" strokeWidth={3} />
          </View>
        </TouchableOpacity>

        <ManualMealAddition
          visible={showManualMealModal}
          onClose={() => setShowManualMealModal(false)}
          onMealAdded={() => {
            dispatch(fetchMeals());
            refreshAllMealData();
          }}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },

  headerTop: {
    marginBottom: 20,
  },

  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginBottom: 2,
  },

  headerSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.2,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.2,
  },

  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  filterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },

  categoriesContent: {
    gap: 8,
  },

  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },

  categoryPillUnselected: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },

  categoryPillTextSelected: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },

  categoryPillText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  insightsCard: {
    marginTop: 12,
    marginBottom: 24,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },

  insightsBlur: {
    borderRadius: 24,
    overflow: "hidden",
  },

  insightsGradient: {
    padding: 26,
    borderRadius: 24,
    backgroundColor: "#065F46",
  },

  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 14,
  },

  insightsIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  insightsHeaderText: {
    flex: 1,
  },

  insightsTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 2,
  },

  insightsSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  insightsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  insightItem: {
    alignItems: "center",
    flex: 1,
  },

  insightIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  insightValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 4,
  },

  insightLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    letterSpacing: -0.2,
  },

  swipeContainer: {
    marginBottom: 16,
  },

  mealCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.03)",
  },

  cardContent: {
    flexDirection: "row",
    padding: 18,
    gap: 14,
  },

  cardImageContainer: {
    position: "relative",
  },

  cardImage: {
    width: 90,
    height: 90,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },

  imagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },

  heartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  cardInfo: {
    flex: 1,
  },

  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  mealTitleRow: {
    flex: 1,
    marginRight: 8,
  },

  mealName: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 22,
  },

  mealPeriodBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  mealMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  caloriesBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
    backgroundColor: "#FEF3C7",
  },

  caloriesText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: -0.3,
  },

  caloriesUnit: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
    letterSpacing: -0.2,
  },

  mealDate: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  quickRatingRow: {
    flexDirection: "row",
    gap: 3,
  },

  cardActions: {
    flexDirection: "column",
    gap: 8,
    marginLeft: 8,
  },

  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  expandButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  swipeActionWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 0,
  },

  swipeActionButton: {
    width: 80,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
  },

  swipeActionGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },

  swipeIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  confirmModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  confirmModal: {
    width: "88%",
    maxWidth: 380,
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
  },

  confirmIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  confirmTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 14,
    textAlign: "center",
    letterSpacing: -0.6,
  },

  confirmMessage: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    letterSpacing: -0.3,
    opacity: 0.8,
  },

  confirmActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },

  confirmCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.08)",
  },

  confirmCancelText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  confirmButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },

  confirmButtonGradient: {
    flexDirection: "row",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  confirmButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },

  expandedSection: {
    overflow: "hidden",
  },

  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },

  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    flex: 1,
  },

  countBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  countBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
    letterSpacing: -0.2,
  },

  nutritionSection: {
    marginBottom: 20,
  },

  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  nutritionCard: {
    width: "48.5%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  nutritionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  nutritionValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 2,
  },

  nutritionUnit: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    marginBottom: 4,
  },

  nutritionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.2,
  },

  ingredientsSection: {
    marginBottom: 20,
  },

  ingredientsScrollContainer: {
    gap: 8,
  },

  ingredientChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
  },

  ingredientText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#065F46",
    letterSpacing: -0.2,
  },

  ratingSection: {
    marginBottom: 0,
  },

  ratingsContainer: {
    gap: 10,
    marginBottom: 16,
  },

  ratingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
  },

  ratingItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  ratingEmojiContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  ratingEmoji: {
    fontSize: 18,
  },

  ratingLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  starContainer: {
    flexDirection: "row",
    gap: 4,
  },

  starButton: {
    padding: 2,
  },

  saveButton: {
    borderRadius: 16,
    overflow: "hidden",
  },

  saveButtonGradient: {
    backgroundColor: "#0d9488",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },

  saveButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },

  mealsList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },

  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
    fontWeight: "500",
    letterSpacing: -0.2,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  filterModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 2,
  },

  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  filterContent: {
    padding: 24,
  },

  filterSection: {
    marginBottom: 28,
  },

  filterSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
    letterSpacing: -0.3,
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  filterCategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    gap: 8,
  },

  categoryChipText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  dateRangeGrid: {
    gap: 10,
  },

  dateRangeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    gap: 10,
  },

  dateRangeChipText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  favoritesToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
  },

  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },

  toggleIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  favoritesToggleText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  toggleSubtext: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },

  toggleSwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },

  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 2,
  },

  resetButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  applyButton: {
    flex: 2,
    borderRadius: 14,
    overflow: "hidden",
  },

  applyButtonGradient: {
    flexDirection: "row",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  applyButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },

  floatingButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    borderRadius: 30,
    overflow: "hidden",
  },

  floatingGradient: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
});
