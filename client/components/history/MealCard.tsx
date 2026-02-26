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

  useEffect(() => {
    setIsFavorite(meal.is_favorite || meal.isFavorite || false);
    setLocalRatings({
      taste_rating: meal.taste_rating || meal.tasteRating || 0,
      satiety_rating: meal.satiety_rating || meal.satietyRating || 0,
      energy_rating: meal.energy_rating || meal.energyRating || 0,
      heaviness_rating: meal.heaviness_rating || meal.heavinessRating || 0,
    });
  }, [meal]);

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

  const mealId = (meal.id || meal.meal_id?.toString()) ?? "";

  const ingredients: Ingredient[] = React.useMemo(() => {
    const rawIngredients = meal.ingredients;
    if (!rawIngredients || !Array.isArray(rawIngredients)) return [];

    return rawIngredients.map((ing: any) => {
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
      if (typeof ing === "string") {
        return { name: ing, calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      return { name: String(ing) || "Unknown", calories: 0, protein: 0, carbs: 0, fat: 0 };
    });
  }, [meal.ingredients]);

  const handleToggleFavorite = useCallback(() => {
    if (!mealId) return;
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
    if (!mealId) return;
    onSaveRatings(mealId, localRatings);
    setHasUnsavedChanges(false);
  }, [mealId, localRatings, onSaveRatings]);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
              backgroundColor: level <= rating ? color : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            },
          ]}
        />
      ))}
    </View>
  );

  const renderLeftActions = () => (
    <TouchableOpacity
      style={styles.swipeAction}
      onPress={() => {
        swipeableRef.current?.close();
        onDuplicate(mealId);
      }}
    >
      <LinearGradient
        colors={["#10B981", "#34D399"]}
        style={styles.swipeGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Copy size={20} color="#FFF" strokeWidth={2} />
        <Text style={styles.swipeActionText}>{t("common.copy")}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.swipeAction}
      onPress={() => {
        swipeableRef.current?.close();
        onDelete(mealId);
      }}
    >
      <LinearGradient
        colors={["#EF4444", "#F87171"]}
        style={styles.swipeGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Trash2 size={20} color="#FFF" strokeWidth={2} />
        <Text style={styles.swipeActionText}>{t("common.delete")}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const avgRating = getAverageRating();
  const hasImage =
    (meal.image_url || meal.imageUrl) &&
    !(meal.image_url || meal.imageUrl || "").includes("placeholder");

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.card : "#FFFFFF",
            shadowColor: periodConfig.color,
          },
        ]}
      >
        {/* Left color accent bar */}
        <LinearGradient
          colors={periodConfig.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.accentBar}
        />

        {/* Right column: main content + expanded */}
        <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.mainContent}
          onPress={handleExpand}
          activeOpacity={0.92}
        >
          {/* Image Section */}
          <View style={styles.imageSection}>
            {hasImage ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: meal.image_url || meal.imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.35)"]}
                  style={styles.imageOverlay}
                />
                {/* Period icon on image */}
                <View
                  style={[
                    styles.periodPill,
                    { backgroundColor: periodConfig.color + "EE" },
                  ]}
                >
                  <PeriodIcon size={10} color="#FFF" />
                </View>
              </View>
            ) : (
              <View style={styles.imageContainer}>
                <MealImagePlaceholder size={88} borderRadius={14} />
                <View
                  style={[
                    styles.periodPill,
                    { backgroundColor: periodConfig.color + "EE" },
                  ]}
                >
                  <PeriodIcon size={10} color="#FFF" />
                </View>
              </View>
            )}

            {isFavorite && (
              <View style={styles.favoriteBadge}>
                <Heart size={9} color="#FFF" fill="#FFF" />
              </View>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            {/* Name + Actions */}
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.mealName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {meal.meal_name || meal.name || t("history.unknownMeal")}
                </Text>

                {/* Time + Rating row */}
                <View style={styles.metaRow}>
                  <View style={styles.timePill}>
                    <Clock size={9} color={periodConfig.color} />
                    <Text style={[styles.timeText, { color: periodConfig.color }]}>
                      {formatTime(meal.created_at || meal.upload_time || meal.createdAt)}
                    </Text>
                  </View>
                  {avgRating > 0 && (
                    <View style={styles.ratingPill}>
                      <Star size={9} color="#FFB800" fill="#FFB800" />
                      <Text style={styles.ratingPillText}>
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
                      styles.iconBtn,
                      {
                        backgroundColor: isFavorite
                          ? "#FF2D5518"
                          : isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                    onPress={handleToggleFavorite}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Heart
                      size={15}
                      color={isFavorite ? "#FF2D55" : colors.muted}
                      fill={isFavorite ? "#FF2D55" : "transparent"}
                    />
                  </TouchableOpacity>
                </Animated.View>
                <TouchableOpacity
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                  onPress={handleExpand}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  {isExpanded ? (
                    <ChevronUp size={15} color={colors.muted} />
                  ) : (
                    <ChevronDown size={15} color={colors.muted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Calories + Cost */}
            <View style={styles.statsRow}>
              <View
                style={[
                  styles.calBadge,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,159,10,0.12)"
                      : "#FFF4E0",
                  },
                ]}
              >
                <Flame size={12} color="#FF9F0A" />
                <Text style={styles.calValue}>
                  {Math.round(meal.calories || 0)}
                </Text>
                <Text style={styles.calUnit}>{t("common.kcal")}</Text>
              </View>

              {Number(meal.estimated_cost || meal.estimatedCost || 0) > 0 && (
                <View
                  style={[
                    styles.costBadge,
                    {
                      backgroundColor: isDark
                        ? "rgba(16,185,129,0.12)"
                        : "#EDFAF4",
                    },
                  ]}
                >
                  <Wallet size={10} color="#10B981" />
                  <Text style={styles.costValue}>
                    {Number(
                      meal.estimated_cost || meal.estimatedCost,
                    ).toFixed(0)}
                    ₪
                  </Text>
                </View>
              )}
            </View>

            {/* Macros */}
            <View style={styles.macrosRow}>
              <MacroChip
                icon={Dumbbell}
                value={Math.round(meal.protein_g || meal.protein || 0)}
                color="#FF3B30"
                bg={isDark ? "rgba(255,59,48,0.1)" : "#FFF1F0"}
              />
              <MacroChip
                icon={Wheat}
                value={Math.round(meal.carbs_g || meal.carbs || 0)}
                color="#34C759"
                bg={isDark ? "rgba(52,199,89,0.1)" : "#F0FFF4"}
              />
              <MacroChip
                icon={Droplets}
                value={Math.round(meal.fats_g || meal.fat || meal.fats || 0)}
                color="#007AFF"
                bg={isDark ? "rgba(0,122,255,0.1)" : "#F0F5FF"}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded Section */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            <View
              style={[
                styles.expandedDivider,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
            />

            {/* Ingredients */}
            {ingredients.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Salad size={14} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("history.ingredients")}
                    <Text style={{ color: colors.muted, fontWeight: "500" }}>
                      {" "}
                      · {ingredients.length}
                    </Text>
                  </Text>
                </View>
                <View style={styles.chipWrap}>
                  {ingredients.slice(0, 6).map((ing, i) => (
                    <View
                      key={i}
                      style={[
                        styles.ingChip,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                        },
                      ]}
                    >
                      <Text
                        style={[styles.ingName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {ing.name}
                      </Text>
                      {ing.calories > 0 && (
                        <Text style={[styles.ingCal, { color: colors.muted }]}>
                          {Math.round(ing.calories)}
                        </Text>
                      )}
                    </View>
                  ))}
                  {ingredients.length > 6 && (
                    <View
                      style={[
                        styles.ingChip,
                        { backgroundColor: colors.primary + "18" },
                      ]}
                    >
                      <Text
                        style={[styles.ingName, { color: colors.primary }]}
                      >
                        +{ingredients.length - 6}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Ratings */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Star size={14} color="#FFB800" fill="#FFB800" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("history.rateThisMeal")}
                </Text>
              </View>

              <View style={styles.ratingsGrid}>
                {RATING_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const rating =
                    localRatings[cat.key as keyof typeof localRatings];
                  return (
                    <View key={cat.key} style={styles.ratingRow}>
                      <View style={styles.ratingLeft}>
                        <View
                          style={[
                            styles.ratingIconBox,
                            { backgroundColor: cat.color + "18" },
                          ]}
                        >
                          <Icon size={13} color={cat.color} />
                        </View>
                        <Text
                          style={[
                            styles.ratingLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t(cat.label)}
                        </Text>
                      </View>
                      {renderRatingSlider(
                        rating,
                        (v) => handleRatingChange(cat.key, v),
                        cat.color,
                      )}
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: hasUnsavedChanges
                      ? colors.primary
                      : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                    opacity: hasUnsavedChanges ? 1 : 0.55,
                  },
                ]}
                onPress={handleSaveRatings}
                activeOpacity={0.8}
                disabled={!hasUnsavedChanges}
              >
                <Text
                  style={[
                    styles.saveBtnText,
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

            {/* Tags */}
            {(meal.description || meal.food_category || meal.cooking_method) && (
              <View style={styles.section}>
                {meal.description && (
                  <Text
                    style={[
                      styles.descText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {meal.description}
                  </Text>
                )}
                <View style={styles.chipWrap}>
                  {meal.food_category && (
                    <View
                      style={[
                        styles.tagChip,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                        },
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
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                        },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: colors.text }]}>
                        {meal.cooking_method}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
        </View>
      </View>
    </Swipeable>
  );
}

function MacroChip({
  icon: Icon,
  value,
  color,
  bg,
}: {
  icon: any;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.macroChip, { backgroundColor: bg }]}>
      <Icon size={10} color={color} />
      <Text style={[styles.macroVal, { color }]}>{value}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    flexDirection: "row",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  mainContent: {
    flex: 1,
    flexDirection: "row",
    padding: 14,
    gap: 12,
  },
  imageSection: {
    position: "relative",
  },
  imageContainer: {
    width: 88,
    height: 88,
    borderRadius: 14,
    overflow: "hidden",
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
    height: 28,
  },
  periodPill: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF2D55",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  infoSection: {
    flex: 1,
    gap: 7,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  mealName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFB80014",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFB800",
  },
  actionsColumn: {
    alignItems: "center",
    gap: 5,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  calBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  calValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF9F0A",
    letterSpacing: -0.3,
  },
  calUnit: {
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
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
  },
  macrosRow: {
    flexDirection: "row",
    gap: 5,
  },
  macroChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  macroVal: {
    fontSize: 11,
    fontWeight: "700",
  },
  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
  },
  swipeGradient: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  swipeActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  expandedSection: {
    paddingBottom: 14,
  },
  expandedDivider: {
    height: 1,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  section: {
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  ingChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  ingName: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 90,
  },
  ingCal: {
    fontSize: 10,
    fontWeight: "500",
  },
  ratingsGrid: {
    gap: 11,
    marginBottom: 14,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ratingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratingIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  sliderRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  sliderSegment: {
    width: 26,
    height: 7,
    borderRadius: 4,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
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
