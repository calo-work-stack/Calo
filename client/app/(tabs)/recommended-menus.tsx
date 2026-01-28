import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  Easing,
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
  Trash2,
  Sparkles,
  BookOpen,
  Timer,
  Wallet,
  ChevronRight,
  RefreshCw,
  LayoutGrid,
  List,
  SortAsc,
} from "lucide-react-native";
import { api } from "@/src/services/api";
import LoadingScreen from "@/components/LoadingScreen";
import { router, useFocusEffect } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { EnhancedMenuCreator } from "@/components/menu";
import { RecommendedMenu } from "@/src/types/recommended-menus";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { MenuCardSkeleton } from "@/components/loaders/SkeletonLoader";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isSmallDevice = SCREEN_WIDTH < 375;

const FILTER_OPTIONS = [
  { key: "all", label: "menus.filters.all", icon: LayoutGrid },
  { key: "recent", label: "menus.filters.recent", icon: Clock },
  { key: "high_protein", label: "menus.filters.high_protein", icon: Target },
  { key: "low_calorie", label: "menus.filters.low_calorie", icon: Flame },
  { key: "quick_prep", label: "menus.filters.quick_prep", icon: Timer },
  {
    key: "budget_friendly",
    label: "menus.filters.budget_friendly",
    icon: Wallet,
  },
];

const SORT_OPTIONS = [
  { key: "newest", label: "menus.sort_options.newest" },
  { key: "oldest", label: "menus.sort_options.oldest" },
  { key: "calories_low", label: "menus.sort_options.calories_low" },
  { key: "calories_high", label: "menus.sort_options.calories_high" },
  { key: "cost_low", label: "menus.sort_options.cost_low" },
  { key: "cost_high", label: "menus.sort_options.cost_high" },
];

const FilterSortModal = React.memo(
  ({
    visible,
    onClose,
    selectedFilter,
    selectedSort,
    onFilterSelect,
    onSortSelect,
    colors,
    t,
  }: any) => {
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
      if (visible) {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      } else {
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    }, [visible, slideAnim]);

    if (!visible) return null;

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.filterModalContainer,
              {
                backgroundColor: colors.card,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {/* Handle */}
              <View style={styles.modalHandle}>
                <View
                  style={[styles.handleBar, { backgroundColor: colors.border }]}
                />
              </View>

              {/* Header */}
              <View style={styles.filterModalHeader}>
                <Text style={[styles.filterModalTitle, { color: colors.text }]}>
                  {t("menus.filter_and_sort")}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.modalCloseBtn,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <X size={20} color={colors.icon} />
                </TouchableOpacity>
              </View>

              {/* Filters Section */}
              <View style={styles.filterSection}>
                <Text
                  style={[styles.filterSectionTitle, { color: colors.text }]}
                >
                  {t("menus.filter_by")}
                </Text>
                <View style={styles.filterGrid}>
                  {FILTER_OPTIONS.map((option) => {
                    const IconComponent = option.icon;
                    const isSelected = selectedFilter === option.key;

                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: isSelected
                              ? colors.emerald500
                              : colors.surface,
                            borderColor: isSelected
                              ? colors.emerald500
                              : colors.border,
                          },
                        ]}
                        onPress={() => onFilterSelect(option.key)}
                      >
                        <IconComponent
                          size={16}
                          color={isSelected ? "#ffffff" : colors.icon}
                        />
                        <Text
                          style={[
                            styles.filterChipText,
                            { color: isSelected ? "#ffffff" : colors.text },
                          ]}
                        >
                          {t(option.label)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Sort Section */}
              <View style={styles.filterSection}>
                <Text
                  style={[styles.filterSectionTitle, { color: colors.text }]}
                >
                  {t("menus.sort_by")}
                </Text>
                <View style={styles.sortList}>
                  {SORT_OPTIONS.map((option) => {
                    const isSelected = selectedSort === option.key;

                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.sortOption,
                          {
                            backgroundColor: isSelected
                              ? colors.emerald500 + "15"
                              : "transparent",
                          },
                        ]}
                        onPress={() => onSortSelect(option.key)}
                      >
                        <Text
                          style={[
                            styles.sortOptionText,
                            {
                              color: isSelected
                                ? colors.emerald500
                                : colors.text,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {t(option.label)}
                        </Text>
                        {isSelected && (
                          <CheckCircle size={18} color={colors.emerald500} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Apply Button */}
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  { backgroundColor: colors.emerald500 },
                ]}
                onPress={onClose}
              >
                <Text style={styles.applyButtonText}>
                  {t("menus.apply_filters")}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  },
);

// ==================== ENHANCED MENU CARD ====================

const MenuCard = React.memo(
  ({
    menu,
    colors,
    isDark,
    t,
    isRTL,
    onStart,
    onView,
    onDelete,
    index,
  }: any) => {
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const delay = index * 80;
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
      ]).start();
    }, [index, opacityAnim, scaleAnim]);

    const avgCaloriesPerDay = Math.round(
      menu.total_calories / (menu.days_count || 1),
    );
    const avgProteinPerDay = Math.round(
      (menu.total_protein || 0) / (menu.days_count || 1),
    );

    const getDifficultyConfig = (level: number) => {
      if (level <= 2)
        return {
          color: "#10b981",
          label: t("menus.difficulty.easy"),
          bg: "#10b98120",
        };
      if (level <= 3)
        return {
          color: "#f59e0b",
          label: t("menus.difficulty.medium"),
          bg: "#f59e0b20",
        };
      return {
        color: "#ef4444",
        label: t("menus.difficulty.hard"),
        bg: "#ef444420",
      };
    };

    const difficultyConfig = getDifficultyConfig(menu.difficulty_level);

    return (
      <Animated.View
        style={[
          styles.menuCard,
          {
            backgroundColor: colors.card,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Top Section with Gradient */}
        <LinearGradient
          colors={[colors.emerald500 + "15", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.menuIconBg,
                { backgroundColor: colors.emerald500 },
              ]}
            >
              <ChefHat size={24} color="#ffffff" />
            </View>

            <View style={styles.cardBadges}>
              <View
                style={[
                  styles.daysBadge,
                  { backgroundColor: colors.emerald500 },
                ]}
              >
                <Calendar size={12} color="#ffffff" />
                <Text style={styles.daysBadgeText}>
                  {menu.days_count} {t("menus.days_short")}
                </Text>
              </View>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: difficultyConfig.bg },
                ]}
              >
                <Star size={12} color={difficultyConfig.color} />
                <Text
                  style={[
                    styles.difficultyText,
                    { color: difficultyConfig.color },
                  ]}
                >
                  {difficultyConfig.label}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Content Section */}
        <View style={styles.cardContent}>
          <Text
            style={[styles.menuTitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {menu.title}
          </Text>
          <Text style={[styles.menuCategory, { color: colors.icon }]}>
            {menu.dietary_category || t("menus.balanced_menu")}
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: "#fef3c7" }]}>
                <Flame size={14} color="#f59e0b" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {avgCaloriesPerDay}
                </Text>
                <Text style={[styles.statLabel, { color: colors.icon }]}>
                  {t("foodScanner.kcal")}
                </Text>
              </View>
            </View>

            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />

            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: "#dcfce7" }]}>
                <TrendingUp size={14} color="#10b981" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {avgProteinPerDay}g
                </Text>
                <Text style={[styles.statLabel, { color: colors.icon }]}>
                  {t("foodScannner.protein")}
                </Text>
              </View>
            </View>

            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />

            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: "#e0e7ff" }]}>
                <Wallet size={14} color="#6366f1" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  ₪{Math.round(menu.estimated_cost || 0)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.icon }]}>
                  {t("menu_details.est_cost")}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.viewBtn,
                { backgroundColor: colors.surface },
              ]}
              onPress={() => onView(menu.menu_id)}
            >
              <Eye size={16} color={colors.icon} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>
                {t("common.view")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.startBtn,
                { backgroundColor: colors.emerald500 },
              ]}
              onPress={() => onStart(menu.menu_id)}
            >
              <Play size={16} color="#ffffff" />
              <Text style={styles.startBtnText}>{t("menus.start")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.deleteBtn,
                { backgroundColor: colors.error + "15" },
              ]}
              onPress={() => onDelete(menu.menu_id)}
            >
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  },
);

// ==================== ACTIVE PLAN BANNER ====================

const ActivePlanBanner = React.memo(({ plan, colors, t, onContinue }: any) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity onPress={onContinue} activeOpacity={0.95}>
        <LinearGradient
          colors={[colors.emerald500, colors.emerald600 || colors.emerald500]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activePlanBanner}
        >
          <View style={styles.activePlanContent}>
            <View style={styles.activePlanLeft}>
              <View style={styles.activePlanBadge}>
                <Sparkles size={14} color="#ffffff" />
                <Text style={styles.activePlanBadgeText}>
                  {t("menus.active")}
                </Text>
              </View>
              <Text style={styles.activePlanTitle}>
                {plan.name || t("menus.your_active_plan")}
              </Text>
              <Text style={styles.activePlanSubtitle}>
                {t("menus.tap_to_continue")}
              </Text>
            </View>

            <View style={styles.activePlanArrow}>
              <ChevronRight size={28} color="#ffffff" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ==================== QUICK STATS CARD ====================

const QuickStatsCard = React.memo(({ menus, colors, t }: any) => {
  const stats = useMemo(() => {
    if (!menus.length) return null;

    const totalMenus = menus.length;
    const avgCalories = Math.round(
      menus.reduce((sum: number, m: any) => sum + (m.total_calories || 0), 0) /
        totalMenus,
    );
    const totalMeals = menus.reduce(
      (sum: number, m: any) => sum + (m.meals?.length || 0),
      0,
    );
    const avgCost = Math.round(
      menus.reduce((sum: number, m: any) => sum + (m.estimated_cost || 0), 0) /
        totalMenus,
    );

    return { totalMenus, avgCalories, totalMeals, avgCost };
  }, [menus]);

  if (!stats) return null;

  return (
    <View style={[styles.quickStatsCard, { backgroundColor: colors.card }]}>
      <View style={styles.quickStatsHeader}>
        <Award size={18} color={colors.emerald500} />
        <Text style={[styles.quickStatsTitle, { color: colors.text }]}>
          {t("menus.your_menu_stats")}
        </Text>
      </View>

      <View style={styles.quickStatsGrid}>
        <View style={styles.quickStatItem}>
          <Text style={[styles.quickStatValue, { color: colors.emerald500 }]}>
            {stats.totalMenus}
          </Text>
          <Text style={[styles.quickStatLabel, { color: colors.icon }]}>
            {t("menus.menus")}
          </Text>
        </View>

        <View
          style={[styles.quickStatDivider, { backgroundColor: colors.border }]}
        />

        <View style={styles.quickStatItem}>
          <Text style={[styles.quickStatValue, { color: colors.emerald500 }]}>
            {stats.avgCalories}
          </Text>
          <Text style={[styles.quickStatLabel, { color: colors.icon }]}>
            {t("menus.avg_cal")}
          </Text>
        </View>

        <View
          style={[styles.quickStatDivider, { backgroundColor: colors.border }]}
        />

        <View style={styles.quickStatItem}>
          <Text style={[styles.quickStatValue, { color: colors.emerald500 }]}>
            ₪{stats.avgCost}
          </Text>
          <Text style={[styles.quickStatLabel, { color: colors.icon }]}>
            {t("menus.avg_cost")}
          </Text>
        </View>
      </View>
    </View>
  );
});

// ==================== CATEGORY FILTER PILLS ====================

const CategoryPills = React.memo(
  ({ colors, t, selectedCategory, onCategorySelect }: any) => {
    const categories = [
      { key: "all", label: t("menus.categories.all"), icon: LayoutGrid },
      { key: "healthy", label: t("menus.categories.healthy"), icon: Heart },
      { key: "keto", label: t("menus.categories.keto"), icon: Target },
      { key: "protein", label: t("menus.categories.protein"), icon: Activity },
      { key: "quick", label: t("menus.categories.quick"), icon: Zap },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
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
                  borderColor: isActive ? colors.emerald500 : colors.border,
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
                  styles.categoryPillText,
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

// ==================== EMPTY STATE ====================

const EmptyState = React.memo(
  ({ colors, t, searchQuery, onCreateMenu }: any) => {
    const bounceAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const bounce = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      bounce.start();
      return () => bounce.stop();
    }, [bounceAnim]);

    return (
      <View style={styles.emptyState}>
        <Animated.View
          style={[
            styles.emptyIconContainer,
            {
              backgroundColor: colors.surface,
              transform: [{ translateY: bounceAnim }],
            },
          ]}
        >
          <ChefHat size={48} color={colors.emerald500} />
        </Animated.View>

        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {searchQuery
            ? t("menus.no_results_found")
            : t("menus.no_menus_available")}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
          {searchQuery
            ? t("menus.try_different_search")
            : t("menus.create_personalized_menu")}
        </Text>

        {!searchQuery && (
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.emerald500 }]}
            onPress={onCreateMenu}
          >
            <Plus size={20} color="#ffffff" />
            <Text style={styles.emptyButtonText}>
              {t("menus.create_first_menu")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
  const [selectedSort, setSelectedSort] = useState("newest");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [activePlanData, setActivePlanData] = useState<any>(null);
  const [showEnhancedCreation, setShowEnhancedCreation] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(-50)).current;

  // Load all data in parallel
  const loadAllData = useCallback(async () => {
    try {
      const [menusResponse, activePlanResponse] = await Promise.all([
        api
          .get("/recommended-menus")
          .catch(() => ({ data: { success: false, data: [] } })),
        api
          .get("/meal-plans/current")
          .catch(() => ({ data: { success: false } })),
      ]);

      if (menusResponse.data.success) {
        setMenus(menusResponse.data.data || []);
      } else {
        setMenus([]);
      }

      if (
        activePlanResponse.data.success &&
        activePlanResponse.data.hasActivePlan &&
        activePlanResponse.data.data
      ) {
        const planData = {
          plan_id: activePlanResponse.data.planId,
          name: activePlanResponse.data.planName || t("menus.active_plan"),
          data: activePlanResponse.data.data,
        };
        setActivePlanData(planData);
        setHasActivePlan(true);
      } else {
        setActivePlanData(null);
        setHasActivePlan(false);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setMenus([]);
      setActivePlanData(null);
      setHasActivePlan(false);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAllData();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
    ]).start();
  }, [loadAllData, fadeAnim, headerAnim]);

  useFocusEffect(
    useCallback(() => {
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
              name: response.data.planName || t("menus.active_plan"),
              data: response.data.data,
            };
            setActivePlanData(planData);
            setHasActivePlan(true);
          } else {
            setActivePlanData(null);
            setHasActivePlan(false);
          }
        })
        .catch(() => {
          setActivePlanData(null);
          setHasActivePlan(false);
        });
    }, [t]),
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
          setActivePlanData(newPlan);
          setHasActivePlan(true);

          Alert.alert(t("common.success"), t("menus.menu_started_success"), [
            {
              text: t("menus.view_plan"),
              onPress: () => {
                router.push(`/menu/activeMenu?planId=${newPlan.plan_id}`);
              },
            },
            { text: t("common.ok") },
          ]);
        }
      } catch (error: any) {
        Alert.alert(
          t("common.error"),
          error.message || t("menus.failed_to_start"),
        );
      }
    },
    [t],
  );

  const handleViewMenu = useCallback((menuId: string) => {
    router.push(`/menu/${menuId}`);
  }, []);

  const handleDeleteMenu = useCallback(
    async (menuId: string) => {
      Alert.alert(t("menus.confirm_delete"), t("menus.delete_confirmation"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("menus.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const response = await api.delete(`/recommended-menus/${menuId}`);

              if (response.data.success) {
                setMenus((prev) => prev.filter((m) => m.menu_id !== menuId));

                if (activePlanData?.plan_id === menuId) {
                  setActivePlanData(null);
                  setHasActivePlan(false);
                }

                Alert.alert(
                  t("common.success"),
                  t("menus.menu_deleted_success"),
                );
              } else {
                throw new Error(response.data.error || "Failed to delete");
              }
            } catch (error: any) {
              Alert.alert(
                t("common.error"),
                error.response?.data?.error ||
                  error.message ||
                  t("menus.failed_to_delete"),
              );
            }
          },
        },
      ]);
    },
    [t, activePlanData],
  );

  // Filter and sort menus
  const filteredMenus = useMemo(() => {
    let filtered = menus.filter((menu) => {
      if (
        hasActivePlan &&
        activePlanData &&
        menu.menu_id === activePlanData.plan_id
      ) {
        return false;
      }
      return true;
    });

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (menu) =>
          menu.title.toLowerCase().includes(query) ||
          menu.description?.toLowerCase().includes(query) ||
          menu.dietary_category?.toLowerCase().includes(query),
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((menu) => {
        const category = menu.dietary_category?.toLowerCase() || "";
        return category.includes(selectedCategory.toLowerCase());
      });
    }

    // Advanced filter
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
            const avgCal = menu.total_calories / (menu.days_count || 1);
            return avgCal <= 1800;
          case "quick_prep":
            return (menu.prep_time_minutes || 60) <= 30;
          case "budget_friendly":
            return (menu.estimated_cost || 1000) <= 200;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (selectedSort) {
        case "oldest":
          return (
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime()
          );
        case "calories_low":
          return (a.total_calories || 0) - (b.total_calories || 0);
        case "calories_high":
          return (b.total_calories || 0) - (a.total_calories || 0);
        case "cost_low":
          return (a.estimated_cost || 0) - (b.estimated_cost || 0);
        case "cost_high":
          return (b.estimated_cost || 0) - (a.estimated_cost || 0);
        case "newest":
        default:
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
      }
    });

    return filtered;
  }, [
    menus,
    searchQuery,
    selectedFilter,
    selectedSort,
    selectedCategory,
    hasActivePlan,
    activePlanData,
  ]);

  const renderMenuCreationModal = () => {
    if (!showEnhancedCreation) return null;

    return (
      <EnhancedMenuCreator
        onCreateMenu={async () => {
          try {
            setShowEnhancedCreation(false);
            await loadAllData();
            Alert.alert(t("common.success"), t("menus.menu_created_success"));
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
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <View
            style={[
              styles.loadingHeader,
              { backgroundColor: colors.background },
            ]}
          >
            <Text style={[styles.pageTitle, { color: colors.text }]}>
              {t("menus.recommended_menus")}
            </Text>
          </View>
          <View style={styles.skeletonList}>
            {[1, 2, 3].map((i) => (
              <MenuCardSkeleton key={i} colors={colors} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            transform: [{ translateY: headerAnim }],
          },
        ]}
      >
        <View style={styles.headerTop}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>
            {t("menus.recommended_menus")}
          </Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.emerald500 }]}
            onPress={() => setShowEnhancedCreation(true)}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Search and Filter Row */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <Search size={18} color={colors.icon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t("menus.search_menus")}
              placeholderTextColor={colors.icon}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={18} color={colors.icon} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor:
                  selectedFilter !== "all" || selectedSort !== "newest"
                    ? colors.emerald500 + "20"
                    : colors.surface,
                borderColor:
                  selectedFilter !== "all" || selectedSort !== "newest"
                    ? colors.emerald500
                    : colors.border,
              },
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter
              size={18}
              color={
                selectedFilter !== "all" || selectedSort !== "newest"
                  ? colors.emerald500
                  : colors.icon
              }
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Main Content */}
      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
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
        {/* Active Plan Banner */}
        {hasActivePlan && activePlanData && (
          <ActivePlanBanner
            plan={activePlanData}
            colors={colors}
            t={t}
            onContinue={() => {
              router.push(`/menu/activeMenu?planId=${activePlanData.plan_id}`);
            }}
          />
        )}

        {/* Category Pills */}
        <CategoryPills
          colors={colors}
          t={t}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />

        {/* Quick Stats */}
        {filteredMenus.length > 0 && (
          <QuickStatsCard menus={filteredMenus} colors={colors} t={t} />
        )}

        {/* Menus List */}
        {filteredMenus.length > 0 ? (
          <View style={styles.menusList}>
            {filteredMenus.map((menu, index) => (
              <MenuCard
                key={menu.menu_id}
                menu={menu}
                colors={colors}
                isDark={isDark}
                t={t}
                isRTL={isRTL}
                onStart={handleStartMenu}
                onView={handleViewMenu}
                onDelete={handleDeleteMenu}
                index={index}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            colors={colors}
            t={t}
            searchQuery={searchQuery}
            onCreateMenu={() => setShowEnhancedCreation(true)}
          />
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Modals */}
      <FilterSortModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedFilter={selectedFilter}
        selectedSort={selectedSort}
        onFilterSelect={setSelectedFilter}
        onSortSelect={setSelectedSort}
        colors={colors}
        t={t}
      />

      {renderMenuCreationModal()}
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
  loadingHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  // Skeleton
  skeletonList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  skeletonCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  skeletonBadges: {
    flexDirection: "row",
    gap: 8,
  },
  skeletonBadge: {
    width: 60,
    height: 24,
    borderRadius: 12,
  },
  skeletonTitle: {
    height: 24,
    width: "70%",
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 16,
    width: "50%",
    borderRadius: 6,
    marginBottom: 16,
  },
  skeletonStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  skeletonStat: {
    width: "30%",
    height: 60,
    borderRadius: 12,
  },
  skeletonActions: {
    flexDirection: "row",
    gap: 12,
  },
  skeletonButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 8, android: 16 }),
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: "900",
    letterSpacing: -1,
  },
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Active Plan Banner
  activePlanBanner: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  activePlanContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activePlanLeft: {
    flex: 1,
  },
  activePlanBadge: {
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
  activePlanBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  activePlanTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  activePlanSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  activePlanArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Category Pills
  categoryScroll: {
    marginBottom: 20,
  },
  categoryContent: {
    gap: 10,
    paddingRight: 20,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Quick Stats
  quickStatsCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  quickStatsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  quickStatsTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  quickStatsGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  quickStatItem: {
    flex: 1,
    alignItems: "center",
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  quickStatLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 30,
  },

  // Menu Card
  menusList: {
    gap: 16,
  },
  menuCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  cardGradient: {
    padding: 18,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  menuIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBadges: {
    flexDirection: "row",
    gap: 8,
  },
  daysBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  daysBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  difficultyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardContent: {
    padding: 18,
    paddingTop: 0,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  menuCategory: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  viewBtn: {
    flex: 1,
  },
  startBtn: {
    flex: 2,
  },
  deleteBtn: {
    width: 44,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  startBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
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
    borderRadius: 20,
    gap: 10,
  },
  emptyButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterModalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  modalHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  filterModalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sortList: {
    gap: 4,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  sortOptionText: {
    fontSize: 15,
  },
  applyButton: {
    marginHorizontal: 24,
    marginBottom: Platform.select({ ios: 40, android: 24 }),
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
