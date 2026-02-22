import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  Share,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  ArrowLeft,
  ChefHat,
  Clock,
  Flame,
  Target,
  Share2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Timer,
  Pencil,
  Check,
} from "lucide-react-native";
import { api } from "@/src/services/api";
import { DietaryIcons } from "@/components/menu/DietaryIcons";
import { MenuEditModal } from "@/components/menu/MenuEditModal";
import { MealEditModal } from "@/components/menu/MealEditModal";
import { NutritionPills } from "@/components/menu/shared/NutritionPills";
import { InstructionSteps } from "@/components/menu/shared/InstructionSteps";
import { IngredientList } from "@/components/menu/shared/IngredientList";
import { DailyBreakdownCard } from "@/components/menu/DailyBreakdownCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  daily_calorie_target?: number;
}

// ==================== MEAL TYPE CONFIG ====================

const MEAL_TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  BREAKFAST: { emoji: "🌅", color: "#F59E0B" },
  LUNCH: { emoji: "☀️", color: "#10B981" },
  DINNER: { emoji: "🌙", color: "#6366F1" },
  SNACK: { emoji: "🍎", color: "#EC4899" },
  MORNING_SNACK: { emoji: "🥐", color: "#F97316" },
  AFTERNOON_SNACK: { emoji: "🍪", color: "#A855F7" },
};

const getMealConfig = (type: string) =>
  MEAL_TYPE_CONFIG[type] || { emoji: "🍽️", color: "#6B7280" };

// ==================== DAY PILL ====================

const DayPill = React.memo(
  ({
    day,
    isSelected,
    totalCalories,
    mealCount,
    colors,
    t,
    onSelect,
  }: {
    day: number;
    isSelected: boolean;
    totalCalories: number;
    mealCount: number;
    colors: any;
    t: any;
    onSelect: () => void;
  }) => (
    <Pressable
      onPress={onSelect}
      style={[
        s.dayPill,
        {
          backgroundColor: isSelected ? colors.warmOrange : colors.surface,
          borderColor: isSelected ? colors.warmOrange : colors.border,
        },
      ]}
    >
      <Text
        style={[s.dayPillLabel, { color: isSelected ? "rgba(255,255,255,0.8)" : colors.textSecondary }]}
      >
        {t("menu_details.day")}
      </Text>
      <Text style={[s.dayPillNum, { color: isSelected ? "#fff" : colors.text }]}>
        {day}
      </Text>
      <Text
        style={[s.dayPillCal, { color: isSelected ? "rgba(255,255,255,0.85)" : colors.textSecondary }]}
      >
        {Math.round(totalCalories)}
      </Text>
    </Pressable>
  )
);

// ==================== COMPACT MEAL CARD ====================

const CompactMealCard = React.memo(
  ({
    meal,
    isExpanded,
    onToggle,
    onLongPress,
    colors,
    t,
  }: {
    meal: Meal;
    isExpanded: boolean;
    onToggle: () => void;
    onLongPress?: () => void;
    colors: any;
    t: any;
  }) => {
    const config = getMealConfig(meal.meal_type);

    return (
      <View style={[s.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable onPress={onToggle} onLongPress={onLongPress} style={s.mealRow}>
          {/* Emoji / Image */}
          {meal.image_url ? (
            <Image source={{ uri: meal.image_url }} style={s.mealThumb} />
          ) : (
            <View style={[s.mealEmojiWrap, { backgroundColor: config.color + "15" }]}>
              <Text style={s.mealEmoji}>{config.emoji}</Text>
            </View>
          )}

          {/* Info */}
          <View style={s.mealInfo}>
            <View style={s.mealTypeRow}>
              <View style={[s.mealTypeDot, { backgroundColor: config.color }]} />
              <Text style={[s.mealTypeLabel, { color: config.color }]}>
                {t(`menu_details.meal_types.${meal.meal_type}`)}
              </Text>
              {meal.prep_time_minutes ? (
                <View style={s.prepRow}>
                  <Timer size={11} color={colors.textSecondary} />
                  <Text style={[s.prepText, { color: colors.textSecondary }]}>
                    {meal.prep_time_minutes}m
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[s.mealName, { color: colors.text }]} numberOfLines={1}>
              {meal.name}
            </Text>
            <NutritionPills
              calories={meal.calories}
              protein={meal.protein}
              carbs={meal.carbs}
              fat={meal.fat}
              compact
            />
          </View>

          {/* Chevron */}
          <View style={[s.chevronWrap, { backgroundColor: colors.surface }]}>
            {isExpanded ? (
              <ChevronUp size={16} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={16} color={colors.textSecondary} />
            )}
          </View>
        </Pressable>

        {/* Expanded */}
        {isExpanded && (
          <View style={[s.expanded, { borderTopColor: colors.border }]}>
            {/* Nutrition row */}
            <View style={[s.nutritionRow, { backgroundColor: colors.surface }]}>
              {[
                { label: t("menu_details.calories"), val: `${Math.round(meal.calories)}`, color: colors.warmOrange },
                { label: t("menu_details.protein"), val: `${Math.round(meal.protein)}g`, color: "#10B981" },
                { label: t("menu_details.carbs"), val: `${Math.round(meal.carbs)}g`, color: "#F59E0B" },
                { label: t("menu_details.fat"), val: `${Math.round(meal.fat)}g`, color: "#EF4444" },
              ].map((n, i) => (
                <View key={i} style={s.nutritionCell}>
                  <Text style={[s.nutritionVal, { color: n.color }]}>{n.val}</Text>
                  <Text style={[s.nutritionLbl, { color: colors.textSecondary }]}>{n.label}</Text>
                </View>
              ))}
            </View>

            {/* Ingredients */}
            {meal.ingredients.length > 0 && (
              <IngredientList ingredients={meal.ingredients} showPrices />
            )}

            {/* Cooking method */}
            {meal.cooking_method && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <ChefHat size={14} color={colors.warmOrange} />
                  <Text style={[s.sectionTitle, { color: colors.text }]}>
                    {t("menu_details.cooking_method")}
                  </Text>
                </View>
                <Text style={[s.methodText, { color: colors.warmOrange }]}>
                  {meal.cooking_method}
                </Text>
              </View>
            )}

            {/* Instructions */}
            {meal.instructions && (
              <InstructionSteps instructions={meal.instructions} />
            )}

            {/* Dietary tags */}
            {meal.dietary_tags && meal.dietary_tags.length > 0 && (
              <DietaryIcons tags={meal.dietary_tags} size={14} />
            )}
          </View>
        )}
      </View>
    );
  }
);

// ==================== MAIN COMPONENT ====================

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

  // CRUD modals
  const [showMenuEditModal, setShowMenuEditModal] = useState(false);
  const [showMealEditModal, setShowMealEditModal] = useState(false);
  const [selectedMealForEdit, setSelectedMealForEdit] = useState<Meal | null>(null);

  const dayTabsRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (id) loadMenuDetails();
  }, [id]);

  const loadMenuDetails = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/recommended-menus/${id}`);
      if (response.data.success && response.data.data) {
        setMenu(response.data.data);
      }
    } catch (error) {
      console.error("Error loading menu:", error);
      Alert.alert(t("common.error"), t("menu_details.failed_to_load"));
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
        Alert.alert(t("common.success"), t("menu_details.menu_activated"), [
          {
            text: t("menu_details.view_active_menu"),
            onPress: () => router.push(`/menu/activeMenu?planId=${id}`),
          },
        ]);
      }
    } catch (error) {
      console.error("Error starting menu:", error);
      Alert.alert(t("common.error"), t("menu_details.failed_to_start"));
    } finally {
      setIsStarting(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t("menu_details.share_message", {
          days: menu?.days_count,
          title: menu?.title,
          mealCount: menu?.meals.length || 0,
          calories: menu?.total_calories,
          cost: menu?.estimated_cost || 0,
        }),
      });
    } catch {}
  };

  const handleDeleteMenu = async () => {
    Alert.alert(
      t("menu_crud.delete_confirm", "Delete this menu?"),
      t("menu_crud.delete_confirm_desc", "This action cannot be undone."),
      [
        { text: t("menu_details.cancel"), style: "cancel" },
        {
          text: t("menu_crud.delete_menu", "Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/recommended-menus/${id}`);
              router.back();
            } catch (error) {
              console.error("Error deleting menu:", error);
            }
          },
        },
      ]
    );
  };

  const toggleMealExpanded = useCallback((mealId: string) => {
    setExpandedMeal((prev) => (prev === mealId ? null : mealId));
  }, []);

  const mealsForDay = useMemo(
    () => menu?.meals.filter((m) => m.day_number === selectedDay) || [],
    [menu, selectedDay]
  );

  const uniqueDays = useMemo(
    () =>
      [...new Set(menu?.meals.map((m) => m.day_number) || [])]
        .filter((d) => d >= 1 && d <= (menu?.days_count ?? Infinity))
        .sort((a, b) => a - b),
    [menu]
  );

  const avgCalPerDay = menu ? Math.round(menu.total_calories / menu.days_count) : 0;
  const totalMeals = menu?.meals.length || 0;

  // ==================== LOADING ====================

  if (isLoading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.loadingCenter}>
          <ActivityIndicator size="large" color={colors.warmOrange} />
        </View>
      </SafeAreaView>
    );
  }

  if (!menu) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.loadingCenter}>
          <ChefHat size={48} color={colors.textSecondary} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>
            {t("menu_details.menu_not_found")}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[s.startBtn, { backgroundColor: colors.warmOrange }]}
          >
            <Text style={s.startBtnText}>{t("menu_details.go_back")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== RENDER ====================

  const dayTotalCalories = mealsForDay.reduce((sum, m) => sum + m.calories, 0);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* ===== HEADER ===== */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {menu.title}
          </Text>
        </View>
        <View style={s.headerActions}>
          <Pressable onPress={handleShare} hitSlop={8}>
            <Share2 size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => setShowMenuEditModal(true)} hitSlop={8}>
            <Pencil size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* ===== OVERVIEW STATS ===== */}
        <View style={[s.overviewRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.overviewItem}>
            <Flame size={16} color={colors.warmOrange} />
            <Text style={[s.overviewVal, { color: colors.text }]}>{avgCalPerDay}</Text>
            <Text style={[s.overviewLbl, { color: colors.textSecondary }]}>
              {t("menu_details.avg_cal_day")}
            </Text>
          </View>
          <View style={[s.overviewDivider, { backgroundColor: colors.border }]} />
          <View style={s.overviewItem}>
            <Clock size={16} color="#6366F1" />
            <Text style={[s.overviewVal, { color: colors.text }]}>{menu.days_count}</Text>
            <Text style={[s.overviewLbl, { color: colors.textSecondary }]}>
              {t("menu_details.days")}
            </Text>
          </View>
          <View style={[s.overviewDivider, { backgroundColor: colors.border }]} />
          <View style={s.overviewItem}>
            <Target size={16} color="#10B981" />
            <Text style={[s.overviewVal, { color: colors.text }]}>{totalMeals}</Text>
            <Text style={[s.overviewLbl, { color: colors.textSecondary }]}>
              {t("menu.meals_label", "meals")}
            </Text>
          </View>
          {menu.prep_time_minutes ? (
            <>
              <View style={[s.overviewDivider, { backgroundColor: colors.border }]} />
              <View style={s.overviewItem}>
                <Timer size={16} color="#EC4899" />
                <Text style={[s.overviewVal, { color: colors.text }]}>
                  {menu.prep_time_minutes}m
                </Text>
                <Text style={[s.overviewLbl, { color: colors.textSecondary }]}>
                  {t("menu_details.avg_prep")}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* ===== DESCRIPTION ===== */}
        {menu.description ? (
          <Text style={[s.description, { color: colors.textSecondary }]}>
            {menu.description}
          </Text>
        ) : null}

        {/* ===== DAILY BREAKDOWN (goal alignment + macros) ===== */}
        <DailyBreakdownCard menuId={menu.menu_id} />

        {/* ===== DAY PILLS ===== */}
        <ScrollView
          ref={dayTabsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.dayPillsRow}
        >
          {uniqueDays.map((day) => {
            const dayMeals = menu.meals.filter((m) => m.day_number === day);
            return (
              <DayPill
                key={day}
                day={day}
                isSelected={selectedDay === day}
                totalCalories={dayMeals.reduce((sum, m) => sum + m.calories, 0)}
                mealCount={dayMeals.length}
                colors={colors}
                t={t}
                onSelect={() => setSelectedDay(day)}
              />
            );
          })}
        </ScrollView>

        {/* ===== DAY HEADER ===== */}
        <View style={s.dayHeader}>
          <Text style={[s.dayTitle, { color: colors.text }]}>
            {t("menu.day_of", "Day {{current}} of {{total}}", {
              current: selectedDay,
              total: menu.days_count,
            })}
          </Text>
          <Text style={[s.dayCalories, { color: colors.textSecondary }]}>
            {Math.round(dayTotalCalories)} {t("menu_details.cal")}
          </Text>
        </View>

        {/* ===== MEAL CARDS ===== */}
        {mealsForDay.map((meal) => (
          <CompactMealCard
            key={meal.meal_id}
            meal={meal}
            isExpanded={expandedMeal === meal.meal_id}
            onToggle={() => toggleMealExpanded(meal.meal_id)}
            onLongPress={() => {
              setSelectedMealForEdit(meal);
              setShowMealEditModal(true);
            }}
            colors={colors}
            t={t}
          />
        ))}

        {mealsForDay.length === 0 && (
          <View style={[s.emptyDay, { backgroundColor: colors.surface }]}>
            <ChefHat size={32} color={colors.textSecondary} />
            <Text style={[s.emptyDayText, { color: colors.textSecondary }]}>
              {t("menu_details.no_meals_for_day", "No meals for this day")}
            </Text>
          </View>
        )}

        {/* ===== ACTION BUTTONS ===== */}
        <View style={s.actionRow}>
          {!menu.is_active ? (
            <Pressable
              onPress={() => setShowStartModal(true)}
              style={[s.startBtn, { backgroundColor: colors.warmOrange }]}
            >
              <Sparkles size={18} color="#fff" />
              <Text style={s.startBtnText}>{t("menu_details.start_now")}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push(`/menu/activeMenu?planId=${id}`)}
              style={[s.startBtn, { backgroundColor: colors.warmOrange }]}
            >
              <Text style={s.startBtnText}>{t("menu_details.view_active_menu")}</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleDeleteMenu}
            style={[s.deleteBtn, { borderColor: (colors.error || "#EF4444") + "30" }]}
          >
            <Text style={[s.deleteBtnText, { color: colors.error || "#EF4444" }]}>
              {t("menu_crud.delete_menu", "Delete")}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===== START MODAL ===== */}
      <Modal
        visible={showStartModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStartModal(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowStartModal(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[s.modalCard, { backgroundColor: colors.card }]}>
              <View style={[s.modalIcon, { backgroundColor: colors.warmOrange + "15" }]}>
                <Sparkles size={32} color={colors.warmOrange} />
              </View>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                {t("menu_details.start_this_menu")}
              </Text>
              <Text style={[s.modalSub, { color: colors.textSecondary }]}>
                {t("menu_details.activate_description")}
              </Text>

              <View style={s.modalFeatures}>
                {[
                  t("menu_details.track_ingredients"),
                  t("menu_details.daily_progress"),
                  t("menu_details.completion_rewards"),
                ].map((feat, i) => (
                  <View key={i} style={s.modalFeature}>
                    <Check size={16} color={colors.warmOrange} />
                    <Text style={[s.modalFeatureText, { color: colors.text }]}>{feat}</Text>
                  </View>
                ))}
              </View>

              <View style={s.modalBtns}>
                <Pressable
                  onPress={() => setShowStartModal(false)}
                  style={[s.modalCancelBtn, { backgroundColor: colors.surface }]}
                >
                  <Text style={[s.modalCancelText, { color: colors.text }]}>
                    {t("menu_details.cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleStartMenu}
                  disabled={isStarting}
                  style={[s.modalStartBtn, { backgroundColor: colors.warmOrange }]}
                >
                  {isStarting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.modalStartText}>{t("menu_details.start_now")}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===== EDIT MODALS ===== */}
      <MenuEditModal
        visible={showMenuEditModal}
        menuId={id as string}
        initialTitle={menu?.title || ""}
        initialDescription={menu?.description || ""}
        onClose={() => setShowMenuEditModal(false)}
        onSaved={() => loadMenuDetails()}
        onDeleted={() => router.back()}
      />

      {selectedMealForEdit && (
        <MealEditModal
          visible={showMealEditModal}
          menuId={id as string}
          mealId={selectedMealForEdit.meal_id}
          initialData={{
            name: selectedMealForEdit.name,
            calories: selectedMealForEdit.calories,
            protein: selectedMealForEdit.protein,
            carbs: selectedMealForEdit.carbs,
            fat: selectedMealForEdit.fat,
            instructions: selectedMealForEdit.instructions || "",
            ingredients: selectedMealForEdit.ingredients.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unit: i.unit || "piece",
            })),
          }}
          onClose={() => {
            setShowMealEditModal(false);
            setSelectedMealForEdit(null);
          }}
          onSaved={() => loadMenuDetails()}
          onDeleted={() => loadMenuDetails()}
        />
      )}
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const s = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  headerActions: { flexDirection: "row", gap: 16, alignItems: "center" },

  scrollContent: { paddingTop: 16, paddingBottom: 20 },

  // Overview stats
  overviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginHorizontal: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  overviewItem: { alignItems: "center", gap: 4 },
  overviewVal: { fontSize: 17, fontWeight: "800" },
  overviewLbl: { fontSize: 10, fontWeight: "600" },
  overviewDivider: { width: 1, height: 28 },

  // Description
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: 20,
    marginTop: 14,
  },

  // Day pills
  dayPillsRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingTop: 16,
    paddingBottom: 14,
  },
  dayPill: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 54,
  },
  dayPillLabel: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
  dayPillNum: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  dayPillCal: { fontSize: 10, fontWeight: "600", marginTop: 1 },

  // Day header
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  dayTitle: { fontSize: 15, fontWeight: "700" },
  dayCalories: { fontSize: 13, fontWeight: "500" },

  // Meal card
  mealCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  mealThumb: { width: 48, height: 48, borderRadius: 12 },
  mealEmojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  mealEmoji: { fontSize: 22 },
  mealInfo: { flex: 1, gap: 4 },
  mealTypeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mealTypeDot: { width: 6, height: 6, borderRadius: 3 },
  mealTypeLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  prepRow: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: 6 },
  prepText: { fontSize: 11, fontWeight: "500" },
  mealName: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  // Expanded
  expanded: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderRadius: 12,
  },
  nutritionCell: { alignItems: "center", gap: 2 },
  nutritionVal: { fontSize: 16, fontWeight: "800" },
  nutritionLbl: { fontSize: 10, fontWeight: "600" },

  section: { gap: 8 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: "700" },
  countBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  countText: { fontSize: 11, fontWeight: "700" },

  methodText: { fontSize: 13, fontWeight: "600" },

  // Empty day
  emptyDay: {
    marginHorizontal: 20,
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    gap: 10,
  },
  emptyDayText: { fontSize: 14, fontWeight: "500" },

  // Action buttons
  actionRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  startBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  deleteBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  deleteBtnText: { fontSize: 14, fontWeight: "700" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 380,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  modalSub: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  modalFeatures: { gap: 12, marginBottom: 24, alignSelf: "stretch" },
  modalFeature: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalFeatureText: { fontSize: 14, fontWeight: "600" },
  modalBtns: { flexDirection: "row", gap: 12, alignSelf: "stretch" },
  modalCancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
  },
  modalCancelText: { fontSize: 15, fontWeight: "600" },
  modalStartBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
  },
  modalStartText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
