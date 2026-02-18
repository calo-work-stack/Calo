import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import {
  Heart,
  Star,
  ChevronDown,
  ChevronUp,
  Camera,
  Flame,
  Droplets,
  Wheat,
  Dumbbell,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Apple,
  Coffee,
  Clock,
  Salad,
  Copy,
  Trash2,
  ChefHat,
  Zap,
  Brain,
  Scale,
  Wallet,
} from "lucide-react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { LinearGradient } from "expo-linear-gradient";
import { MealImagePlaceholder } from "@/components/loaders";

const { width } = Dimensions.get("window");

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Ingredient {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

interface MealCardProps {
  meal: any;
  onToggleFavorite: (mealId: string) => void;
  onDelete: (mealId: string) => void;
  onDuplicate: (mealId: string) => void;
  onSaveRatings: (mealId: string, ratings: any) => void;
  isHighlighted?: boolean;
}

const MEAL_PERIOD_CONFIG: Record<
  string,
  { icon: any; color: string; gradient: string[] }
> = {
  breakfast: {
    icon: Sunrise,
    color: "#FF9F0A",
    gradient: ["#FF9F0A", "#FFB340"],
  },
  lunch: { icon: Sun, color: "#FF6B6B", gradient: ["#FF6B6B", "#FF8E8E"] },
  dinner: { icon: Sunset, color: "#8B5CF6", gradient: ["#8B5CF6", "#A78BFA"] },
  snack: { icon: Apple, color: "#10B981", gradient: ["#10B981", "#34D399"] },
  late_night: {
    icon: Moon,
    color: "#6366F1",
    gradient: ["#6366F1", "#818CF8"],
  },
  other: { icon: Coffee, color: "#8E8E93", gradient: ["#8E8E93", "#A8A8AC"] },
};

const RATING_CATEGORIES = [
  {
    key: "taste_rating",
    label: "history.ratings.taste",
    icon: ChefHat,
    color: "#FF6B6B",
  },
  {
    key: "satiety_rating",
    label: "history.ratings.satiety",
    icon: Scale,
    color: "#10B981",
  },
  {
    key: "energy_rating",
    label: "history.ratings.energy",
    icon: Zap,
    color: "#F59E0B",
  },
  {
    key: "heaviness_rating",
    label: "history.ratings.heaviness",
    icon: Brain,
    color: "#8B5CF6",
  },
];

export default function MealCard({
  meal,
  onToggleFavorite,
  onDelete,
  onDuplicate,
  onSaveRatings,
  isHighlighted = false,
}: MealCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [localRatings, setLocalRatings] = useState({
    taste_rating: meal.taste_rating || meal.tasteRating || 0,
    satiety_rating: meal.satiety_rating || meal.satietyRating || 0,
    energy_rating: meal.energy_rating || meal.energyRating || 0,
    heaviness_rating: meal.heaviness_rating || meal.heavinessRating || 0,
  });
  const [isFavorite, setIsFavorite] = useState(
    meal.is_favorite || meal.isFavorite || false,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const swipeableRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const highlightAnim = useRef(
    new Animated.Value(isHighlighted ? 1 : 0),
  ).current;

  // Update local state when meal prop changes
  useEffect(() => {
    setIsFavorite(meal.is_favorite || meal.isFavorite || false);
    setLocalRatings({
      taste_rating: meal.taste_rating || meal.tasteRating || 0,
      satiety_rating: meal.satiety_rating || meal.satietyRating || 0,
      energy_rating: meal.energy_rating || meal.energyRating || 0,
      heaviness_rating: meal.heaviness_rating || meal.heavinessRating || 0,
    });
  }, [meal]);

  // Highlight animation
  useEffect(() => {
    if (isHighlighted) {
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.delay(2000),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isHighlighted]);

  const mealPeriod = (meal.meal_period || meal.mealPeriod || "other")
    .toLowerCase()
    .replace(/\s+/g, "_");
  const periodConfig =
    MEAL_PERIOD_CONFIG[mealPeriod] || MEAL_PERIOD_CONFIG.other;
  const PeriodIcon = periodConfig.icon;

  const mealId = meal.id || meal.meal_id?.toString();

  // Normalize ingredients - handle both string arrays (manual meals) and object arrays (AI analyzed meals)
  const normalizeIngredients = (rawIngredients: any): Ingredient[] => {
    if (!rawIngredients || !Array.isArray(rawIngredients)) return [];

    return rawIngredients.map((ing: any) => {
      // If it's already an object with name property, use it
      if (typeof ing === "object" && ing !== null && "name" in ing) {
        return {
          name: ing.name || "Unknown",
          calories: Number(ing.calories) || 0,
          protein: Number(ing.protein) || 0,
          carbs: Number(ing.carbs) || 0,
          fat: Number(ing.fat) || 0,
          fiber: Number(ing.fiber) || 0,
          sugar: Number(ing.sugar) || 0,
        };
      }
      // If it's a string (from manual meal), convert to object
      if (typeof ing === "string") {
        return {
          name: ing,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        };
      }
      // Fallback for unexpected types
      return {
        name: String(ing) || "Unknown",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    });
  };

  const ingredients: Ingredient[] = normalizeIngredients(meal.ingredients);

  const handleToggleFavorite = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.4,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setIsFavorite(!isFavorite);
    onToggleFavorite(mealId);
  }, [isFavorite, mealId, onToggleFavorite, scaleAnim]);

  const handleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleRatingChange = useCallback((key: string, value: number) => {
    setLocalRatings((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const handleSaveRatings = useCallback(() => {
    onSaveRatings(mealId, localRatings);
    setHasUnsavedChanges(false);
  }, [mealId, localRatings, onSaveRatings]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return t("common.today");
    if (diffDays === 1) return t("common.yesterday");
    if (diffDays < 7) return `${diffDays} ${t("common.daysAgo")}`;

    return date.toLocaleDateString();
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAverageRating = () => {
    const ratings = [
      localRatings.taste_rating,
      localRatings.satiety_rating,
      localRatings.energy_rating,
      localRatings.heaviness_rating,
    ].filter((r) => r > 0);

    if (ratings.length === 0) return 0;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  };

  const renderRatingSlider = (
    rating: number,
    onPress: (value: number) => void,
    color: string,
  ) => (
    <View style={styles.sliderRow}>
      {[1, 2, 3, 4, 5].map((level) => (
        <TouchableOpacity
          key={level}
          onPress={() => onPress(level)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
          style={[
            styles.sliderSegment,
            {
              backgroundColor: level <= rating ? color : colors.border,
              opacity: level <= rating ? 1 : 0.3,
            },
          ]}
        />
      ))}
    </View>
  );

  const renderLeftActions = () => (
    <TouchableOpacity
      style={[styles.swipeAction]}
      onPress={() => {
        swipeableRef.current?.close();
        onDuplicate(mealId);
      }}
    >
      <View style={[styles.swipeIconBg, { backgroundColor: "#10B98130" }]}>
        <Copy size={22} color="#10B981" strokeWidth={2} />
      </View>
      <Text style={[styles.swipeActionText, { color: "#10B981" }]}>
        {t("common.copy")}
      </Text>
    </TouchableOpacity>
  );

  const renderRightActions = () => (
    <TouchableOpacity
      style={[styles.swipeAction]}
      onPress={() => {
        swipeableRef.current?.close();
        onDelete(mealId);
      }}
    >
      <View style={[styles.swipeIconBg, { backgroundColor: "#EF444430" }]}>
        <Trash2 size={22} color="#EF4444" strokeWidth={2} />
      </View>
      <Text style={[styles.swipeActionText, { color: "#EF4444" }]}>
        {t("common.delete")}
      </Text>
    </TouchableOpacity>
  );

  const avgRating = getAverageRating();
  const borderColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isHighlighted ? borderColor : colors.border,
            borderWidth: isHighlighted ? 2 : 1,
          },
        ]}
      >
        {/* Accent gradient strip at top */}
        <LinearGradient
          colors={periodConfig.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentStrip}
        />

        {/* Main Content */}
        <TouchableOpacity
          style={styles.mainContent}
          onPress={handleExpand}
          activeOpacity={0.9}
        >
          {/* Image Section */}
          <View style={styles.imageSection}>
            {(meal.image_url || meal.imageUrl) && !(meal.image_url || meal.imageUrl || "").includes("placeholder") ? (
              <View style={[styles.imageContainer, { backgroundColor: colors.surfaceVariant }]}>
                <Image
                  source={{ uri: meal.image_url || meal.imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
                {/* Dark overlay gradient at bottom of image */}
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.4)"]}
                  style={styles.imageOverlay}
                />
              </View>
            ) : (
              <MealImagePlaceholder size={100} borderRadius={16} />
            )}

            {/* Favorite Badge */}
            {isFavorite && (
              <View style={styles.favoriteBadge}>
                <Heart size={10} color="#FFF" fill="#FFF" />
              </View>
            )}

            {/* Meal Period Badge */}
            <View style={[styles.periodBadgeOverlay]}>
              <LinearGradient
                colors={periodConfig.gradient as [string, string]}
                style={styles.periodGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <PeriodIcon size={11} color="#FFF" />
              </LinearGradient>
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            {/* Top row: name + actions */}
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.mealName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {meal.meal_name || meal.name || t("history.unknownMeal")}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.dateContainer}>
                    <Clock size={10} color={colors.muted} />
                    <Text style={[styles.dateText, { color: colors.muted }]}>
                      {formatDate(meal.created_at || meal.upload_time || meal.createdAt)}
                    </Text>
                  </View>
                  <Text style={[styles.timeText, { color: periodConfig.color }]}>
                    {formatTime(meal.created_at || meal.upload_time || meal.createdAt)}
                  </Text>
                  {avgRating > 0 && (
                    <View style={styles.avgRatingBadge}>
                      <Star size={10} color="#FFB800" fill="#FFB800" />
                      <Text style={styles.avgRatingText}>
                        {avgRating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsColumn}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: isFavorite
                          ? "#FF2D5515"
                          : "transparent",
                      },
                    ]}
                    onPress={handleToggleFavorite}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Heart
                      size={16}
                      color={isFavorite ? "#FF2D55" : colors.muted}
                      fill={isFavorite ? "#FF2D55" : "transparent"}
                    />
                  </TouchableOpacity>
                </Animated.View>
                <TouchableOpacity
                  style={[styles.actionButton]}
                  onPress={handleExpand}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  {isExpanded ? (
                    <ChevronUp size={16} color={colors.muted} />
                  ) : (
                    <ChevronDown size={16} color={colors.muted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Calories & Cost Row */}
            <View style={styles.statsRow}>
              <View style={[styles.caloriesBadge, { backgroundColor: isDark ? "#FF9F0A18" : "#FFF8EE" }]}>
                <Flame size={13} color="#FF9F0A" />
                <Text style={styles.caloriesValue}>
                  {Math.round(meal.calories || 0)}
                </Text>
                <Text style={styles.caloriesUnit}>{t("common.kcal")}</Text>
              </View>

              {Number(meal.estimated_cost || meal.estimatedCost || 0) > 0 ? (
                  <View style={[styles.costBadge, { backgroundColor: isDark ? "#10B98118" : "#F0FDF9" }]}>
                    <Wallet size={11} color="#10B981" />
                    <Text style={styles.costValue}>
                      {Number(meal.estimated_cost || meal.estimatedCost).toFixed(0)}
                    </Text>
                    <Text style={styles.costCurrency}>₪</Text>
                  </View>
                ) : null}
            </View>

            {/* Macros Row */}
            <View style={styles.macrosRow}>
              <View style={[styles.macroChip, { backgroundColor: isDark ? "#FF3B3012" : "#FFF0F0" }]}>
                <Dumbbell size={10} color="#FF3B30" />
                <Text style={[styles.macroText, { color: "#FF3B30" }]}>
                  {Math.round(meal.protein_g || meal.protein || 0)}g
                </Text>
              </View>
              <View style={[styles.macroChip, { backgroundColor: isDark ? "#34C75912" : "#F0FFF4" }]}>
                <Wheat size={10} color="#34C759" />
                <Text style={[styles.macroText, { color: "#34C759" }]}>
                  {Math.round(meal.carbs_g || meal.carbs || 0)}g
                </Text>
              </View>
              <View style={[styles.macroChip, { backgroundColor: isDark ? "#007AFF12" : "#F0F7FF" }]}>
                <Droplets size={10} color="#007AFF" />
                <Text style={[styles.macroText, { color: "#007AFF" }]}>
                  {Math.round(meal.fats_g || meal.fat || meal.fats || 0)}g
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded Section */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            {/* Ingredients Section */}
            {ingredients.length > 0 && (
              <View style={styles.ingredientsSection}>
                <View style={styles.sectionHeader}>
                  <Salad size={16} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("history.ingredients")} ({ingredients.length})
                  </Text>
                </View>
                <View style={styles.ingredientsList}>
                  {ingredients.slice(0, 6).map((ing, index) => (
                    <View
                      key={index}
                      style={[
                        styles.ingredientChip,
                        { backgroundColor: colors.surfaceVariant },
                      ]}
                    >
                      <Text
                        style={[styles.ingredientName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {ing.name}
                      </Text>
                      {ing.calories > 0 && (
                        <Text
                          style={[
                            styles.ingredientCals,
                            { color: colors.muted },
                          ]}
                        >
                          {Math.round(ing.calories)} cal
                        </Text>
                      )}
                    </View>
                  ))}
                  {ingredients.length > 6 && (
                    <View
                      style={[
                        styles.ingredientChip,
                        { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.ingredientName,
                          { color: colors.primary },
                        ]}
                      >
                        +{ingredients.length - 6} more
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Ratings Section */}
            <View style={styles.ratingsSection}>
              <View style={styles.sectionHeader}>
                <Star size={16} color="#FFB800" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("history.rateThisMeal")}
                </Text>
              </View>

              <View style={styles.ratingsGrid}>
                {RATING_CATEGORIES.map((category) => {
                  const IconComponent = category.icon;
                  const rating =
                    localRatings[category.key as keyof typeof localRatings];
                  return (
                    <View key={category.key} style={styles.ratingRow}>
                      <View style={styles.ratingLabelContainer}>
                        <View
                          style={[
                            styles.ratingIconBg,
                            { backgroundColor: category.color + "20" },
                          ]}
                        >
                          <IconComponent size={14} color={category.color} />
                        </View>
                        <Text
                          style={[
                            styles.ratingLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t(category.label)}
                        </Text>
                      </View>
                      {renderRatingSlider(
                        rating,
                        (v) => handleRatingChange(category.key, v),
                        category.color,
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: hasUnsavedChanges
                      ? colors.primary
                      : colors.surfaceVariant,
                    opacity: hasUnsavedChanges ? 1 : 0.6,
                  },
                ]}
                onPress={handleSaveRatings}
                activeOpacity={0.8}
                disabled={!hasUnsavedChanges}
              >
                <Text
                  style={[
                    styles.saveButtonText,
                    {
                      color: hasUnsavedChanges ? "#FFF" : colors.textSecondary,
                    },
                  ]}
                >
                  {hasUnsavedChanges
                    ? t("common.save")
                    : t("history.ratingsSaved")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Additional Info */}
            {(meal.description ||
              meal.food_category ||
              meal.cooking_method) ? (
              <View style={styles.additionalInfo}>
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
                {meal.description && (
                  <Text
                    style={[
                      styles.descriptionText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {meal.description}
                  </Text>
                )}
                <View style={styles.tagsRow}>
                  {meal.food_category && (
                    <View
                      style={[
                        styles.tagChip,
                        { backgroundColor: colors.surfaceVariant },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: colors.text }]}>
                        {meal.food_category}
                      </Text>
                    </View>
                  )}
                  {meal.cooking_method && (
                    <View
                      style={[
                        styles.tagChip,
                        { backgroundColor: colors.surfaceVariant },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: colors.text }]}>
                        {meal.cooking_method}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </Animated.View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  accentStrip: {
    height: 3,
    width: "100%",
  },
  mainContent: {
    flexDirection: "row",
    padding: 14,
    gap: 14,
  },
  imageSection: {
    position: "relative",
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF2D55",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  periodBadgeOverlay: {
    position: "absolute",
    bottom: 5,
    left: 5,
  },
  periodGradient: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  infoSection: {
    flex: 1,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    gap: 8,
  },
  mealName: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  avgRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFB80012",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  avgRatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFB800",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  caloriesBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  caloriesValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF9F0A",
    letterSpacing: -0.3,
  },
  caloriesUnit: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FF9F0A",
    opacity: 0.7,
  },
  costBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 3,
  },
  costValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#10B981",
  },
  costCurrency: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10B981",
    opacity: 0.7,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "500",
  },
  timeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  macrosRow: {
    flexDirection: "row",
    gap: 6,
  },
  macroChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  macroText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionsColumn: {
    alignItems: "center",
    gap: 4,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 85,
    gap: 6,
  },
  swipeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  expandedSection: {
    paddingBottom: 12,
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  ingredientsSection: {
    marginBottom: 8,
  },
  ingredientsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
  },
  ingredientChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ingredientName: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 100,
  },
  ingredientCals: {
    fontSize: 10,
    fontWeight: "500",
  },
  ratingsSection: {
    paddingHorizontal: 12,
  },
  ratingsGrid: {
    gap: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ratingLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratingIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  sliderRow: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  sliderSegment: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  saveButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  additionalInfo: {
    paddingHorizontal: 12,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
