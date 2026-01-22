import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
  Modal,
  TextInput,
  FlatList,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  ChefHat,
  Plus,
  Calendar,
  Clock,
  Star,
  Eye,
  Play,
  X,
  Filter,
  Search,
  CircleCheck as CheckCircle,
  ArrowRight,
  Flame,
  TrendingUp,
  Award,
  Heart,
  Zap,
  Target,
  Activity,
  DollarSign,
  Trash2,
} from "lucide-react-native";
import { api } from "@/src/services/api";
import LoadingScreen from "@/components/LoadingScreen";
import { router, useFocusEffect } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { EnhancedMenuCreator } from "@/components/menu";
import { RecommendedMenu } from "@/src/types/recommended-menus";
import { FILTER_OPTIONS } from "@/src/Features/Features/recommended-features";
import { LinearGradient } from "expo-linear-gradient";
import { NutritionHabits } from "@/components/menu/NutritionHabits";

// ==================== OPTIMIZED COMPONENTS ====================

// Enhanced Filter Modal with better performance
const FilterModal = React.memo(
  ({
    visible,
    onClose,
    selectedFilter,
    onFilterSelect,
    colors,
    language,
  }: any) => {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.filterModalOverlay}>
          <View
            style={[
              styles.filterModalContainer,
              { backgroundColor: colors.card },
            ]}
          >
            <View style={styles.filterModalHeader}>
              <Text style={[styles.filterModalTitle, { color: colors.text }]}>
                {language === "he" ? "סנן תפריטים" : "Filter Menus"}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.filterCloseButton}
              >
                <X size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filterOptions}
              showsVerticalScrollIndicator={false}
            >
              {FILTER_OPTIONS.map((option) => {
                const IconComponent = option.icon;
                const isSelected = selectedFilter === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor: isSelected
                          ? colors.emerald500
                          : colors.surface,
                      },
                    ]}
                    onPress={() => {
                      onFilterSelect(option.key);
                      onClose();
                    }}
                  >
                    <IconComponent
                      size={20}
                      color={isSelected ? "#ffffff" : colors.icon}
                    />
                    <Text
                      style={[
                        styles.filterOptionText,
                        { color: isSelected ? "#ffffff" : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && <CheckCircle size={16} color="#ffffff" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  },
);

// Optimized Menu Card with gradient and better visuals
const MenuCard = React.memo(
  ({
    menu,
    colors,
    isDark,
    language,
    isRTL,
    onStart,
    onView,
    onDelete,
  }: any) => {
    const avgCaloriesPerDay = Math.round(
      menu.total_calories / (menu.days_count || 1),
    );
    const avgProteinPerDay = Math.round(
      (menu.total_protein || 0) / (menu.days_count || 1),
    );

    const getDifficultyColor = (level: number) => {
      if (level <= 2) return "#10b981";
      if (level <= 3) return "#f59e0b";
      return "#ef4444";
    };

    const getDifficultyLabel = (level: number) => {
      if (level <= 2) return language === "he" ? "קל" : "Easy";
      if (level <= 3) return language === "he" ? "בינוני" : "Medium";
      return language === "he" ? "קשה" : "Hard";
    };

    return (
      <View style={[styles.menuCard, { backgroundColor: colors.card }]}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[colors.emerald500 + "20", colors.emerald500 + "05"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.menuImageHeader}
        >
          <View style={styles.menuImageContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.emerald500 },
              ]}
            >
              <ChefHat size={28} color="#ffffff" />
            </View>
            <View style={styles.menuBadges}>
              <View
                style={[styles.badge, { backgroundColor: colors.emerald500 }]}
              >
                <Calendar size={12} color="#ffffff" />
                <Text style={styles.badgeText}>{menu.days_count}d</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: getDifficultyColor(menu.difficulty_level),
                  },
                ]}
              >
                <Star size={12} color="#ffffff" />
                <Text style={styles.badgeText}>
                  {getDifficultyLabel(menu.difficulty_level)}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Menu Content */}
        <View style={styles.menuContent}>
          <View style={styles.menuHeader}>
            <Text
              style={[styles.menuTitle, { color: colors.text }]}
              numberOfLines={2}
            >
              {menu.title}
            </Text>
            <Text style={[styles.menuSubtitle, { color: colors.icon }]}>
              {menu.dietary_category || "Balanced Menu"}
            </Text>
          </View>

          {/* Enhanced Nutrition Grid */}
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <View
                style={[styles.nutritionIcon, { backgroundColor: "#fef3c7" }]}
              >
                <Flame size={16} color="#f59e0b" />
              </View>
              <Text style={[styles.nutritionValue, { color: colors.text }]}>
                {avgCaloriesPerDay}
              </Text>
              <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                {language === "he" ? "קלוריות" : "Calories"}
              </Text>
            </View>

            <View style={styles.nutritionItem}>
              <View
                style={[styles.nutritionIcon, { backgroundColor: "#dcfce7" }]}
              >
                <TrendingUp size={16} color="#10b981" />
              </View>
              <Text style={[styles.nutritionValue, { color: colors.text }]}>
                {avgProteinPerDay}g
              </Text>
              <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                {language === "he" ? "חלבון" : "Protein"}
              </Text>
            </View>

            <View style={styles.nutritionItem}>
              <View
                style={[styles.nutritionIcon, { backgroundColor: "#f3e8ff" }]}
              >
                <Clock size={16} color="#8b5cf6" />
              </View>
              <Text style={[styles.nutritionValue, { color: colors.text }]}>
                {menu.prep_time_minutes || 30}m
              </Text>
              <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                {language === "he" ? "הכנה" : "Prep"}
              </Text>
            </View>
          </View>

          {/* Cost and Rating Row */}
          <View style={styles.menuMeta}>
            {menu.estimated_cost && (
              <View
                style={[
                  styles.costBadge,
                  { backgroundColor: colors.success + "20" },
                ]}
              >
                <DollarSign size={14} color={colors.success} />
                <Text style={[styles.costText, { color: colors.success }]}>
                  ₪{menu.estimated_cost.toFixed(0)}
                </Text>
              </View>
            )}

            <View style={styles.ratingBadge}>
              <Star size={14} color="#FFB800" fill="#FFB800" />
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {menu.difficulty_level}/5
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.menuActions}>
            <TouchableOpacity
              style={[styles.viewButton, { backgroundColor: colors.surface }]}
              onPress={() => onView(menu.menu_id)}
            >
              <Eye size={16} color={colors.icon} />
              <Text style={[styles.viewButtonText, { color: colors.icon }]}>
                {language === "he" ? "צפה" : "View"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.startButton,
                { backgroundColor: colors.emerald500 },
              ]}
              onPress={() => onStart(menu.menu_id)}
            >
              <Play size={16} color="#ffffff" />
              <Text style={styles.startButtonText}>
                {language === "he" ? "התחל" : "Start"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewButton, { backgroundColor: colors.error }]}
              onPress={() => onDelete(menu.menu_id)}
            >
              <Trash2 size={16} color={colors.text} />
              <Text style={[styles.viewButtonText, { color: colors.text }]}>
                {language === "he" ? "מחק" : "Delete"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  },
);

// Active Plan Card with gradient
const ActivePlanCard = React.memo(
  ({ plan, colors, language, onContinue }: any) => {
    return (
      <LinearGradient
        colors={[colors.emerald500, colors.emerald500 + "dd"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.activePlanCard}
      >
        <View style={styles.activePlanHeader}>
          <View style={styles.activePlanBadge}>
            <CheckCircle size={16} color="#ffffff" />
            <Text style={styles.activePlanBadgeText}>
              {language === "he" ? "פעיל" : "Active"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onContinue}
            style={styles.activePlanAction}
          >
            <ArrowRight size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.activePlanTitle}>
          {plan.name ||
            (language === "he" ? "התוכנית הפעילה שלך" : "Your Active Plan")}
        </Text>

        <Text style={styles.activePlanSubtitle}>
          {language === "he"
            ? "המשך לעקוב אחר התקדמותך"
            : "Continue tracking your progress"}
        </Text>

        <TouchableOpacity
          style={styles.activePlanContinueButton}
          onPress={onContinue}
        >
          <Text style={styles.activePlanContinueText}>
            {language === "he" ? "המשך התוכנית" : "Continue Plan"}
          </Text>
          <ArrowRight size={14} color="#ffffff" />
        </TouchableOpacity>
      </LinearGradient>
    );
  },
);

// Quick Stats Component
const QuickStats = React.memo(({ menus, colors, language }: any) => {
  const stats = useMemo(() => {
    if (!menus.length) return null;

    const totalCalories = menus.reduce(
      (sum: number, menu: any) => sum + (menu.total_calories || 0),
      0,
    );
    const avgCalories = Math.round(totalCalories / menus.length);
    const totalMeals = menus.reduce(
      (sum: number, menu: any) => sum + (menu.meals?.length || 0),
      0,
    );
    const avgCost = Math.round(
      menus.reduce(
        (sum: number, menu: any) => sum + (menu.estimated_cost || 0),
        0,
      ) / menus.length,
    );

    return {
      totalMenus: menus.length,
      avgCalories,
      totalMeals,
      avgCost,
    };
  }, [menus]);

  if (!stats) return null;

  return (
    <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
      <View style={styles.statsHeader}>
        <Text style={[styles.statsTitle, { color: colors.text }]}>
          {language === "he" ? "סיכום תפריטים" : "Menu Overview"}
        </Text>
        <Award size={20} color={colors.emerald500} />
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.emerald500 }]}>
            {stats.totalMenus}
          </Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>
            {language === "he" ? "תפריטים" : "Menus"}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.emerald500 }]}>
            {stats.avgCalories}
          </Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>
            {language === "he" ? 'ק"ק ממוצע' : "Avg Cal"}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.emerald500 }]}>
            {stats.totalMeals}
          </Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>
            {language === "he" ? "ארוחות" : "Meals"}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.emerald500 }]}>
            ₪{stats.avgCost}
          </Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>
            {language === "he" ? "עלות ממוצעת" : "Avg Cost"}
          </Text>
        </View>
      </View>
    </View>
  );
});

// Category Pills Component
const CategoryPills = React.memo(
  ({ colors, language, onCategorySelect, selectedCategory }: any) => {
    const categories = [
      { key: "all", label: language === "he" ? "הכל" : "All", icon: ChefHat },
      {
        key: "healthy",
        label: language === "he" ? "בריא" : "Healthy",
        icon: Heart,
      },
      { key: "keto", label: language === "he" ? "קטו" : "Keto", icon: Target },
      {
        key: "protein",
        label: language === "he" ? "חלבון" : "Protein",
        icon: Activity,
      },
      { key: "quick", label: language === "he" ? "מהיר" : "Quick", icon: Zap },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScrollContainer}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map((category) => {
          const IconComponent = category.icon;
          const isActive = selectedCategory === category.key;

          return (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: isActive
                    ? colors.emerald500
                    : colors.surface,
                },
              ]}
              onPress={() => onCategorySelect(category.key)}
            >
              <IconComponent
                size={16}
                color={isActive ? "#ffffff" : colors.icon}
              />
              <Text
                style={[
                  styles.categoryText,
                  { color: isActive ? "#ffffff" : colors.text },
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  },
);

// ==================== MAIN COMPONENT ====================

export default function RecommendedMenusScreen() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const { user } = useSelector((state: RootState) => state.auth);

  // State
  const [menus, setMenus] = useState<RecommendedMenu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [activePlanData, setActivePlanData] = useState<any>(null);
  const [showEnhancedCreation, setShowEnhancedCreation] = useState(false);
  const [currentActivePlan, setCurrentActivePlan] = useState<any>(null);

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));

  // ==================== OPTIMIZED DATA LOADING ====================

  // Load all data in parallel for better performance
  const loadAllData = useCallback(async () => {
    try {
      // Use Promise.all to fetch data in parallel
      const [menusResponse, activePlanResponse] = await Promise.all([
        api
          .get("/recommended-menus")
          .catch(() => ({ data: { success: false, data: [] } })),
        api
          .get("/meal-plans/current")
          .catch(() => ({ data: { success: false } })),
      ]);

      // Process menus
      if (menusResponse.data.success) {
        setMenus(menusResponse.data.data || []);
      } else {
        setMenus([]);
      }

      // Process active plan
      if (
        activePlanResponse.data.success &&
        activePlanResponse.data.hasActivePlan &&
        activePlanResponse.data.data
      ) {
        const planData = {
          plan_id: activePlanResponse.data.planId,
          name: activePlanResponse.data.planName || "Active Plan",
          data: activePlanResponse.data.data,
        };
        setCurrentActivePlan(planData);
        setActivePlanData(planData);
        setHasActivePlan(true);
      } else {
        setCurrentActivePlan(null);
        setActivePlanData(null);
        setHasActivePlan(false);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setMenus([]);
      setCurrentActivePlan(null);
      setActivePlanData(null);
      setHasActivePlan(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [loadAllData]);

  useFocusEffect(
    useCallback(() => {
      // Only check for active plan, not reload all menus
      api
        .get("/meal-plans/current")
        .then((response) => {
          if (
            response.data.success &&
            response.data.hasActivePlan &&
            response.data.data
          ) {
            const planData = {
              plan_id: response.data.planId,
              name: response.data.planName || "Active Plan",
              data: response.data.data,
            };
            setCurrentActivePlan(planData);
            setActivePlanData(planData);
            setHasActivePlan(true);
          } else {
            setCurrentActivePlan(null);
            setActivePlanData(null);
            setHasActivePlan(false);
          }
        })
        .catch(() => {
          setCurrentActivePlan(null);
          setActivePlanData(null);
          setHasActivePlan(false);
        });
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  const handleStartMenu = useCallback(
    async (menuId: string) => {
      try {
        const response = await api.post(
          `/recommended-menus/${menuId}/start-today`,
          {},
        );

        if (response.data.success && response.data.data) {
          const newPlan = response.data.data;
          setCurrentActivePlan(newPlan);
          setHasActivePlan(true);

          Alert.alert(
            language === "he" ? "הצלחה!" : "Success!",
            language === "he"
              ? "התפריט הופעל בהצלחה!"
              : "Menu started successfully!",
            [
              {
                text: language === "he" ? "אישור" : "OK",
                onPress: () => {
                  router.push(`/menu/activeMenu?planId=${newPlan.plan_id}`);
                },
              },
            ],
          );
        }
      } catch (error: any) {
        Alert.alert(
          language === "he" ? "שגיאה" : "Error",
          error.message ||
            (language === "he" ? "נכשל בהפעלת התפריט" : "Failed to start menu"),
        );
      }
    },
    [language],
  );

  const handleViewMenu = useCallback((menuId: string) => {
    router.push(`/menu/${menuId}`);
  }, []);

  const handleDeleteMenu = useCallback(
    async (menuId: string) => {
      // Show confirmation dialog
      Alert.alert(
        language === "he" ? "אישור מחיקה" : "Confirm Delete",
        language === "he"
          ? "האם אתה בטוח שברצונך למחוק את התפריט? פעולה זו אינה הפיכה."
          : "Are you sure you want to delete this menu? This action cannot be undone.",
        [
          {
            text: language === "he" ? "ביטול" : "Cancel",
            style: "cancel",
          },
          {
            text: language === "he" ? "מחק" : "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                console.log("🗑️ Attempting to delete menu:", menuId);

                // Make the DELETE request
                const response = await api.delete(
                  `/recommended-menus/${menuId}`,
                );

                console.log("✅ Delete response:", response.data);

                if (response.data.success) {
                  // Optimistically remove from UI
                  setMenus((prev) => prev.filter((m) => m.menu_id !== menuId));

                  // Also check if this was the active menu
                  if (activePlanData?.plan_id === menuId) {
                    setCurrentActivePlan(null);
                    setActivePlanData(null);
                    setHasActivePlan(false);
                  }

                  // Show success message
                  Alert.alert(
                    language === "he" ? "הצלחה" : "Success",
                    language === "he"
                      ? `התפריט נמחק בהצלחה. ${response.data.mealsDeleted || 0} ארוחות הוסרו.`
                      : `Menu deleted successfully. ${response.data.mealsDeleted || 0} meals removed.`,
                  );
                } else {
                  throw new Error(response.data.error || "Failed to delete");
                }
              } catch (error: any) {
                console.error("💥 Failed to delete menu:", error);

                // Parse error message
                const errorMessage =
                  error.response?.data?.error ||
                  error.message ||
                  (language === "he"
                    ? "נכשל במחיקת התפריט"
                    : "Failed to delete menu");

                Alert.alert(
                  language === "he" ? "שגיאה" : "Error",
                  errorMessage,
                );
              }
            },
          },
        ],
      );
    },
    [language, activePlanData],
  );

  // ==================== OPTIMIZED FILTERING ====================

  const filteredMenus = useMemo(() => {
    let filtered = menus.filter((menu) => {
      // Exclude active menu
      if (
        hasActivePlan &&
        activePlanData &&
        menu.menu_id === activePlanData.plan_id
      ) {
        return false;
      }
      return true;
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (menu) =>
          menu.title.toLowerCase().includes(query) ||
          menu.description?.toLowerCase().includes(query) ||
          menu.dietary_category?.toLowerCase().includes(query),
      );
    }

    // Apply category filter (from pills)
    if (selectedCategory !== "all") {
      filtered = filtered.filter((menu) => {
        const category = menu.dietary_category?.toLowerCase() || "";
        return category.includes(selectedCategory.toLowerCase());
      });
    }

    // Apply advanced filter (from filter modal)
    if (selectedFilter !== "all") {
      filtered = filtered.filter((menu) => {
        switch (selectedFilter) {
          case "recent":
            if (menu.created_at) {
              const menuDate = new Date(menu.created_at);
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              return menuDate > weekAgo;
            }
            return false;

          case "high_protein":
            const proteinRatio =
              ((menu.total_protein || 0) / (menu.total_calories || 1)) * 4;
            return proteinRatio >= 0.25;

          case "low_calorie":
            const avgCaloriesPerDay =
              menu.total_calories / (menu.days_count || 1);
            return avgCaloriesPerDay <= 1800;

          case "quick_prep":
            return (menu.prep_time_minutes || 60) <= 30;

          case "budget_friendly":
            return (menu.estimated_cost || 1000) <= 200;

          default:
            return true;
        }
      });
    }

    return filtered;
  }, [
    menus,
    searchQuery,
    selectedFilter,
    selectedCategory,
    hasActivePlan,
    activePlanData,
  ]);

  // Enhanced creation modal
  const renderEnhancedCreationModal = () => {
    if (!showEnhancedCreation) return null;

    return (
      <EnhancedMenuCreator
        onCreateMenu={async () => {
          try {
            setShowEnhancedCreation(false);
            await loadAllData();
            Alert.alert(
              language === "he" ? "הצלחה!" : "Success!",
              language === "he"
                ? "התפריט נוצר בהצלחה"
                : "Menu created successfully",
            );
          } catch (error) {
            console.error("Error handling menu creation:", error);
          }
        }}
        onClose={() => setShowEnhancedCreation(false)}
      />
    );
  };

  if (isLoading) {
    return (
      <LoadingScreen text={t("loading.loading", "loading.recommended_menus")} />
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Fixed Search Header */}
      <View
        style={[styles.searchHeader, { backgroundColor: colors.background }]}
      >
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <Search size={20} color={colors.icon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={
                language === "he" ? "חיפוש תפריטים..." : "Search menus..."
              }
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.icon}
            />
          </View>

          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <Animated.ScrollView
        style={[styles.scrollContent, { opacity: fadeAnim }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.emerald500]}
            tintColor={colors.emerald500}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Page Title */}
          <Text style={[styles.pageTitle, { color: colors.text }]}>
            {language === "he" ? "תפריטים מומלצים" : "Recommended Menus"}
          </Text>

          {/* Active Plan Card */}
          {hasActivePlan && activePlanData && (
            <ActivePlanCard
              plan={activePlanData}
              colors={colors}
              language={language}
              onContinue={() => {
                router.push(
                  `/menu/activeMenu?planId=${activePlanData.plan_id}`,
                );
              }}
            />
          )}

          {/* Category Pills */}
          <CategoryPills
            colors={colors}
            language={language}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />

          {/* Create New Menu Button */}
          <TouchableOpacity
            style={[
              styles.createMenuButton,
              { backgroundColor: colors.emerald500 },
            ]}
            onPress={() => setShowEnhancedCreation(true)}
          >
            <Plus size={20} color="#ffffff" />
            <Text style={styles.createMenuButtonText}>
              {language === "he" ? "צור תפריט חדש" : "Create New Menu"}
            </Text>
          </TouchableOpacity>

          {/* Quick Stats */}
          {filteredMenus.length > 0 && (
            <QuickStats
              menus={filteredMenus}
              colors={colors}
              language={language}
            />
          )}

          {/* Menus List - Using FlatList for better performance */}
          {filteredMenus.length > 0 ? (
            <FlatList
              data={filteredMenus}
              keyExtractor={(item) => item.menu_id}
              renderItem={({ item }) => (
                <MenuCard
                  menu={item}
                  colors={colors}
                  isDark={isDark}
                  language={language}
                  isRTL={isRTL}
                  onStart={handleStartMenu}
                  onView={handleViewMenu}
                  onDelete={handleDeleteMenu}
                />
              )}
              scrollEnabled={false}
              contentContainerStyle={styles.menusGrid}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
            />
          ) : (
            <View style={styles.emptyState}>
              <View
                style={[styles.emptyIcon, { backgroundColor: colors.surface }]}
              >
                <ChefHat size={48} color={colors.emerald500} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery.trim()
                  ? language === "he"
                    ? "לא נמצאו תוצאות"
                    : "No results found"
                  : language === "he"
                    ? "אין תפריטים זמינים"
                    : "No menus available"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                {searchQuery.trim()
                  ? language === "he"
                    ? "נסה מילות חיפוש אחרות"
                    : "Try different search terms"
                  : language === "he"
                    ? "צור תפריט מותאם אישית כדי להתחיל"
                    : "Create a personalized menu to get started"}
              </Text>

              {!searchQuery.trim() && (
                <TouchableOpacity
                  style={[
                    styles.emptyButton,
                    { backgroundColor: colors.emerald500 },
                  ]}
                  onPress={() => setShowEnhancedCreation(true)}
                >
                  <Plus size={18} color="#ffffff" />
                  <Text style={styles.emptyButtonText}>
                    {language === "he"
                      ? "צור תפריט ראשון"
                      : "Create First Menu"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Nutrition Habits Section */}
          {filteredMenus.length > 0 && (
            <View style={styles.habitsSection}>
              <NutritionHabits />
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Modals */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedFilter={selectedFilter}
        onFilterSelect={setSelectedFilter}
        colors={colors}
        language={language}
      />

      {renderEnhancedCreationModal()}
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isSmallDevice = SCREEN_WIDTH < 375;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Fixed Search Header
  searchHeader: {
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingTop: Platform.select({ ios: 8, android: 10 }),
    paddingBottom: isSmallDevice ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },

  searchContainer: {
    flexDirection: "row",
    gap: 12,
  },

  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  // Scrollable Content
  scrollContent: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingTop: isSmallDevice ? 16 : 20,
    paddingBottom: Platform.select({ ios: 120, android: 100 }),
  },

  pageTitle: {
    fontSize: isSmallDevice ? 26 : 32,
    fontWeight: "900",
    marginBottom: isSmallDevice ? 16 : 20,
    letterSpacing: -0.8,
  },

  // Active Plan Card
  activePlanCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    overflow: "hidden",
  },

  activePlanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  activePlanBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },

  activePlanBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },

  activePlanAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  activePlanTitle: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  activePlanSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    marginBottom: 18,
  },

  activePlanContinueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },

  activePlanContinueText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Category Scroll
  categoryScrollContainer: {
    marginBottom: 24,
  },

  categoryContainer: {
    paddingRight: 20,
    gap: 12,
  },

  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },

  categoryText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Create Menu Button
  createMenuButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 20,
    marginBottom: 24,
    gap: 10,
  },

  createMenuButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Quick Stats Card
  statsCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },

  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  statsTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  statItem: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },

  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },

  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },

  // Menus Grid
  menusGrid: {
    gap: 20,
  },

  // Enhanced Menu Cards
  menuCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 8,
  },

  menuImageHeader: {
    height: 140,
    justifyContent: "space-between",
    padding: 20,
  },

  menuImageContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  menuBadges: {
    gap: 8,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },

  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },

  menuContent: {
    padding: 18,
  },

  menuHeader: {
    marginBottom: 16,
  },

  menuTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.5,
  },

  menuSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
  },

  // Enhanced Nutrition Grid
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 8,
  },

  nutritionItem: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },

  nutritionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  nutritionValue: {
    fontSize: 18,
    fontWeight: "800",
  },

  nutritionLabel: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Menu Meta
  menuMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  costBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },

  costText: {
    fontSize: 14,
    fontWeight: "700",
  },

  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  ratingText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Action Buttons
  menuActions: {
    flexDirection: "row",
    gap: 12,
  },

  viewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },

  viewButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },

  startButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },

  startButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },

  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },

  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 24,
  },

  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 25,
    gap: 10,
  },

  emptyButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Filter Modal
  filterModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  filterModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
  },

  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },

  filterModalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },

  filterCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  filterOptions: {
    padding: 20,
  },

  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 10,
    gap: 14,
  },

  filterOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },

  habitsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
  },
});
