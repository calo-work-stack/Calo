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
  RefreshControl,
  Dimensions,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Camera,
  Target,
  TrendingUp,
  ShoppingCart,
  Trophy,
  Flame,
  Star,
  ChevronRight,
  Sun,
  Coffee,
} from "lucide-react-native";
import { api, APIError } from "@/src/services/api";
import { fetchMeals } from "@/src/store/mealSlice";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTranslation } from "react-i18next";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import XPNotification from "@/components/XPNotification";
import { useOptimizedSelector } from "@/src/utils/useOptimizedSelector";
import { useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/src/store";
import CircularCaloriesProgress from "@/components/index/CircularCaloriesProgress";
import ShoppingList from "@/components/ShoppingList";
import { initializeStorageCleanup } from "@/src/utils/databaseCleanup";
import WaterIntakeCard from "@/components/index/WaterIntake";
import { DailyGoals } from "@/src/types";

const { width } = Dimensions.get("window");

const HomeScreen = React.memo(() => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  const selectMealState = useMemo(
    () => (state: RootState) => ({
      meals: state.meal.meals,
      isLoading: state.meal.isLoading,
    }),
    [],
  );

  const selectAuthState = useMemo(
    () => (state: RootState) => ({
      user: state.auth.user,
    }),
    [],
  );

  const { meals, isLoading } = useOptimizedSelector(selectMealState);
  const { user } = useOptimizedSelector(selectAuthState);
  const { colors, isDark } = useTheme();

  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    water: 0,
    targetCalories: 2205,
    targetProtein: 120,
    targetCarbs: 200,
    targetFat: 60,
    waterMl: 2500,
  });
  const [waterGoalMl, setWaterGoalMl] = useState(2500); // Default 2500ml (10 cups)
  const waterGoalCups = Math.ceil(waterGoalMl / 250); // Convert ml to cups (250ml per cup)
  const [refreshing, setRefreshing] = useState(false);
  const [, setIsDataLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [waterCups, setWaterCups] = useState(0);
  const [dataError, setDataError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const [showXPNotification, setShowXPNotification] = useState(false);
  const [xpNotificationData, setXPNotificationData] = useState<{
    xpGained: number;
    leveledUp?: boolean;
    newLevel?: number;
    newAchievements?: any[];
  }>({ xpGained: 0 });

  const [showShoppingList, setShowShoppingList] = useState(false);

  const handleOpenShoppingList = useCallback(() => {
    setShowShoppingList(true);
  }, []);

  const handleCloseShoppingList = useCallback(() => {
    setShowShoppingList(false);
  }, []);

  const { isRTL, language: currentLanguage } = useLanguage();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const isLoadingRef = useRef(false);
  const lastDataLoadRef = useRef<number>(0);
  const waterSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const processedMealsData = useMemo(() => {
    if (!meals || meals.length === 0) {
      return {
        recentMeals: [],
        todaysMeals: [],
        dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      };
    }

    const sortedMeals = [...meals].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const today = new Date().toISOString().split("T")[0];
    const todayMeals = meals.filter((meal: { created_at: string }) =>
      meal.created_at.startsWith(today),
    );

    const dailyTotals = todayMeals.reduce(
      (
        acc: { calories: any; protein: any; carbs: any; fat: any },
        meal: { calories: any; protein: any; carbs: any; fat: any },
      ) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fat: acc.fat + (meal.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    return {
      recentMeals: sortedMeals.slice(0, 4),
      todaysMeals: todayMeals,
      dailyTotals,
    };
  }, [meals]);

  const updateDailyGoals = useCallback(() => {
    setDailyGoals((prev) => ({
      ...prev,
      ...processedMealsData.dailyTotals,
    }));
  }, [processedMealsData.dailyTotals]);

  const loadDailyGoals = useCallback(async () => {
    if (!user?.user_id) return;

    if (user.subscription_type === "FREE") {
      setDailyGoals((prev) => ({
        ...prev,
        targetCalories: 2000,
        targetProtein: 100,
        targetCarbs: 250,
        targetFat: 65,
      }));
      setWaterGoalMl(2500); // Default 2500ml for free users
      return;
    }

    try {
      const { dailyGoalsAPI } = await import("@/src/services/api");
      const goalsResponse = await dailyGoalsAPI.getDailyGoals();

      if (goalsResponse.success && goalsResponse.data) {
        setDailyGoals((prev) => ({
          ...prev,
          targetCalories: goalsResponse.data.calories || 2205,
          targetProtein: goalsResponse.data.protein_g || 120,
          targetCarbs: goalsResponse.data.carbs_g || 200,
          targetFat: goalsResponse.data.fats_g || 60,
        }));
        // Set water goal from DailyGoal table
        setWaterGoalMl(goalsResponse.data.water_ml || 2500);
      } else {
        const createResponse = await dailyGoalsAPI.createDailyGoals();
        if (createResponse.success && createResponse.data) {
          setDailyGoals((prev) => ({
            ...prev,
            targetCalories: createResponse.data.calories || 2205,
            targetProtein: createResponse.data.protein_g || 120,
            targetCarbs: createResponse.data.carbs_g || 200,
            targetFat: createResponse.data.fats_g || 60,
          }));
          // Set water goal from DailyGoal table
          setWaterGoalMl(createResponse.data.water_ml || 2500);
        }
      }
    } catch (error) {
      console.error(t("common.error_loading_daily_goals"), error);
      setDailyGoals((prev) => ({
        ...prev,
        targetCalories: 2205,
        targetProtein: 120,
        targetCarbs: 200,
        targetFat: 60,
      }));
      setWaterGoalMl(2500); // Default on error
    }
  }, [user?.user_id, user?.subscription_type, t]);
  console.log(dailyGoals);
  const loadWaterIntake = useCallback(async () => {
    if (!user?.user_id) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await api.get(`/nutrition/water-intake/${today}`, {
        timeout: 8000,
      });
      if (response.data?.success && response.data?.data) {
        const serverCups = response.data.data.cups_consumed || 0;
        setWaterCups(serverCups);
      } else {
        setWaterCups(0);
      }
    } catch (error: any) {
      const isCancelError =
        error.code === "ECONNABORTED" ||
        error.message === "canceled" ||
        error.name === "CanceledError" ||
        error.__CANCEL__;

      if (!isCancelError) {
        console.warn(t("common.water_load_failed"), error.message);
      }
      setWaterCups(0);
    }
  }, [user?.user_id, t]);

  const syncWaterWithServer = useCallback(
    async (totalCups: number) => {
      if (!user?.user_id) return;

      try {
        const today = new Date().toISOString().split("T")[0];
        const response = await api.post(
          "/nutrition/water-intake",
          {
            cups_consumed: totalCups,
            date: today,
          },
          {
            timeout: 10000,
          },
        );

        if (response.data.success) {
          if (
            response.data.xpAwarded > 0 ||
            response.data.newAchievements?.length > 0
          ) {
            setXPNotificationData({
              xpGained: response.data.xpAwarded || 0,
              leveledUp: response.data.leveledUp,
              newLevel: response.data.newLevel,
              newAchievements: response.data.newAchievements || [],
            });
            setShowXPNotification(true);
          }
        }
      } catch (error: any) {
        const isCancelError =
          error.code === "ECONNABORTED" ||
          error.message === "canceled" ||
          error.name === "CanceledError" ||
          error.__CANCEL__;

        if (!isCancelError) {
          console.warn(t("common.water_sync_failed"), error.message);
        }
      }
    },
    [user?.user_id, t],
  );

  const incrementWater = useCallback(() => {
    if (waterCups >= waterGoalCups) return;

    const newTotal = waterCups + 1;
    setWaterCups(newTotal);

    if (waterSyncTimeoutRef.current) {
      clearTimeout(waterSyncTimeoutRef.current);
    }

    waterSyncTimeoutRef.current = setTimeout(() => {
      syncWaterWithServer(newTotal);
    }, 1000);
  }, [waterCups, waterGoalCups, syncWaterWithServer]);

  const decrementWater = useCallback(() => {
    if (waterCups <= 0) return;

    const newTotal = waterCups - 1;
    setWaterCups(newTotal);

    if (waterSyncTimeoutRef.current) {
      clearTimeout(waterSyncTimeoutRef.current);
    }

    waterSyncTimeoutRef.current = setTimeout(() => {
      syncWaterWithServer(newTotal);
    }, 1000);
  }, [waterCups, syncWaterWithServer]);

  const addWaterVolume = useCallback(
    (mlAmount: number) => {
      const ML_PER_CUP = 250;
      const cupsToAdd = Math.ceil(mlAmount / ML_PER_CUP);
      const newTotal = Math.min(waterCups + cupsToAdd, waterGoalCups);

      if (newTotal === waterCups) return;

      setWaterCups(newTotal);

      if (waterSyncTimeoutRef.current) {
        clearTimeout(waterSyncTimeoutRef.current);
      }

      waterSyncTimeoutRef.current = setTimeout(() => {
        syncWaterWithServer(newTotal);
      }, 1000);
    },
    [waterCups, syncWaterWithServer],
  );

  const loadAllData = useCallback(
    async (force = false) => {
      if (!user?.user_id || isLoadingRef.current) return;

      const now = Date.now();
      const MIN_RELOAD_INTERVAL = 30 * 1000;

      if (!force && now - lastDataLoadRef.current < MIN_RELOAD_INTERVAL) {
        return;
      }

      isLoadingRef.current = true;
      setIsDataLoading(true);
      setDataError(null);

      try {
        const [mealsResult, goalsResult] = await Promise.allSettled([
          dispatch(fetchMeals()).unwrap(),
          loadDailyGoals(),
        ]);

        if (mealsResult.status === "rejected") {
          console.error(t("common.meals_loading_failed"), mealsResult.reason);
          setDataError(t("common.failed_to_load_meals"));
        }

        if (goalsResult.status === "rejected") {
          console.error(t("common.goals_loading_failed"), goalsResult.reason);
        }

        setRetryCount(0);
      } catch (error) {
        console.error(t("common.error_loading_data"), error);
        setDataError(
          error instanceof APIError
            ? error.message
            : t("common.failed_to_load_data"),
        );
        setRetryCount((prev) => prev + 1);
      } finally {
        setIsDataLoading(false);
        setInitialLoading(false);
        isLoadingRef.current = false;
        lastDataLoadRef.current = now;
      }
    },
    [user?.user_id, dispatch, retryCount, loadDailyGoals, t],
  );

  const onRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      await loadAllData(true);
      await loadWaterIntake();
    } finally {
      setRefreshing(false);
    }
  }, [loadAllData, loadWaterIntake, refreshing]);

  const getTimeBasedGreeting = () => {
    const currentHour = new Date().getHours();

    if (currentHour >= 5 && currentHour < 12) {
      return {
        text: t("greetings.morning"),
        icon: currentHour <= 7 ? Coffee : Sun,
        color: colors.warning,
        bgColor: isDark ? colors.primaryContainer : "#FEF3C7",
      };
    } else if (currentHour >= 12 && currentHour < 17) {
      return {
        text: t("greetings.afternoon"),
        icon: Sun,
        color: colors.warning,
        bgColor: isDark ? colors.primaryContainer : "#FEF9C3",
      };
    } else if (currentHour >= 17 && currentHour < 22) {
      return {
        text: t("greetings.evening"),
        icon: Sun,
        color: colors.warning,
        bgColor: isDark ? colors.primaryContainer : "#FED7AA",
      };
    } else {
      return {
        text: t("greetings.night"),
        icon: Sun,
        color: colors.primary,
        bgColor: isDark ? colors.primaryContainer : "#E0E7FF",
      };
    }
  };

  const greeting = getTimeBasedGreeting();
  const IconComponent = greeting.icon;

  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
      year: "numeric",
    };
    return now.toLocaleDateString(
      currentLanguage === "he" ? "he-IL" : "en-US",
      options,
    );
  };

  useEffect(() => {
    updateDailyGoals();
  }, [updateDailyGoals]);

  useEffect(() => {
    initializeStorageCleanup().catch((error) => {
      console.error(t("common.failed_storage_cleanup"), error);
    });
  }, [t]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (user?.user_id && initialLoading && isMounted) {
        await loadAllData(true);
        if (isMounted) {
          await loadWaterIntake();
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      if (waterSyncTimeoutRef.current) {
        clearTimeout(waterSyncTimeoutRef.current);
      }
    };
  }, [user?.user_id, initialLoading]);

  useEffect(() => {
    if (user?.user_id) {
      loadDailyGoals();
    }
  }, [user?.user_id, loadDailyGoals]);

  if (initialLoading) {
    return <LoadingScreen text={t("loading.loading", "loading.home")} />;
  }

  if (dataError && retryCount > 0) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.errorText, { color: colors.error }]}>
          {dataError}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => loadAllData(true)}
        >
          <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>
            {t("home.retry")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />

        <XPNotification
          visible={showXPNotification}
          xpGained={xpNotificationData.xpGained}
          leveledUp={xpNotificationData.leveledUp}
          newLevel={xpNotificationData.newLevel}
          newAchievements={xpNotificationData.newAchievements}
          onHide={() => setShowXPNotification(false)}
          language={currentLanguage as "he" | "en"}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.profileContainer}>
                <Image
                  source={{
                    uri:
                      user?.avatar_url ||
                      "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1",
                  }}
                  style={styles.profileImage}
                />
                <View
                  style={[
                    styles.onlineIndicator,
                    { backgroundColor: colors.success },
                  ]}
                />
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {getCurrentDate()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.greetingCard}>
            <LinearGradient
              colors={[colors.primary, colors.primaryContainer]}
              style={styles.greetingGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.greetingContent}>
                <View style={styles.greetingLeft}>
                  <View
                    style={[
                      styles.greetingIconContainer,
                      { backgroundColor: greeting.bgColor },
                    ]}
                  >
                    <IconComponent size={24} color={greeting.color} />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.greetingText,
                        { color: colors.onPrimary, opacity: 0.9 },
                      ]}
                    >
                      {greeting.text}
                    </Text>
                    <Text
                      style={[styles.greetingName, { color: colors.onPrimary }]}
                    >
                      {user?.name}!
                    </Text>
                  </View>
                </View>
                <View style={styles.greetingStats}>
                  <View
                    style={[
                      styles.statBadge,
                      { backgroundColor: colors.glass },
                    ]}
                  >
                    <Star
                      size={16}
                      color={colors.warning}
                      fill={colors.warning}
                    />
                    <Text
                      style={[
                        styles.statBadgeText,
                        { color: colors.onPrimary },
                      ]}
                    >
                      {t("home.level")} {user?.level || 1}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.progressSection}>
            <CircularCaloriesProgress
              calories={dailyGoals.calories}
              targetCalories={dailyGoals.targetCalories}
              dailyGoals={dailyGoals}
            />
          </View>

          <WaterIntakeCard
            currentCups={waterCups}
            maxCups={waterGoalCups}
            targetMl={waterGoalMl}
            onIncrement={incrementWater}
            onDecrement={decrementWater}
            onAddVolume={addWaterVolume}
            disabled={isUpdating}
          />

          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("home.yourProgress")}
            </Text>
            <View style={styles.statsGrid}>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.statCardHeader}>
                  <View
                    style={[
                      styles.statIcon,
                      {
                        backgroundColor: isDark
                          ? colors.primaryContainer
                          : "#FEF3C7",
                      },
                    ]}
                  >
                    <Trophy size={20} color={colors.warning} />
                  </View>
                  <Text
                    style={[
                      styles.statCardTitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("home.totalXP")}
                  </Text>
                </View>
                <Text style={[styles.statCardValue, { color: colors.text }]}>
                  {(user?.total_points || 0).toLocaleString()}
                </Text>
                <Text
                  style={[
                    styles.statCardSubtext,
                    { color: colors.textTertiary },
                  ]}
                >
                  {t("home.keepItUp")}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.statCardHeader}>
                  <View
                    style={[
                      styles.statIcon,
                      {
                        backgroundColor: isDark
                          ? colors.primaryContainer
                          : "#FEE2E2",
                      },
                    ]}
                  >
                    <Flame size={20} color={colors.error} />
                  </View>
                  <Text
                    style={[
                      styles.statCardTitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("home.streak")}
                  </Text>
                </View>
                <Text style={[styles.statCardValue, { color: colors.text }]}>
                  {user?.current_streak || 0}
                </Text>
                <Text
                  style={[
                    styles.statCardSubtext,
                    { color: colors.textTertiary },
                  ]}
                >
                  {t("home.daysInARow")}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("home.quick_actions")}
            </Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => router.push("/(tabs)/camera")}
              >
                <View
                  style={[
                    styles.actionIcon,
                    {
                      backgroundColor: isDark
                        ? colors.primaryContainer
                        : colors.emerald50,
                    },
                  ]}
                >
                  <Camera size={24} color={colors.primary} />
                </View>
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {t("home.addMeal")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => router.push("/(tabs)/food-scanner")}
              >
                <View
                  style={[
                    styles.actionIcon,
                    {
                      backgroundColor: isDark
                        ? colors.primaryContainer
                        : "#EFF6FF",
                    },
                  ]}
                >
                  <Target size={24} color={colors.primary} />
                </View>
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {t("home.scanFood")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleOpenShoppingList}
              >
                <View
                  style={[
                    styles.actionIcon,
                    {
                      backgroundColor: isDark
                        ? colors.primaryContainer
                        : "#FEF3C7",
                    },
                  ]}
                >
                  <ShoppingCart size={24} color={colors.warning} />
                </View>
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {t("home.shopping")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => router.push("/(tabs)/statistics")}
              >
                <View
                  style={[
                    styles.actionIcon,
                    {
                      backgroundColor: isDark
                        ? colors.primaryContainer
                        : "#F3E8FF",
                    },
                  ]}
                >
                  <TrendingUp size={24} color={colors.primary} />
                </View>
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {t("home.statistics")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("home.todaysMeals")}
              </Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push("/(tabs)/history")}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  {t("home.viewAll")}
                </Text>
                <ChevronRight size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.activityList,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {isLoading ? (
                <View
                  style={[
                    styles.activityItem,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[styles.activityTitle, { color: colors.text }]}>
                    {t("home.loadingMeals")}
                  </Text>
                </View>
              ) : processedMealsData.recentMeals.length > 0 ? (
                processedMealsData.recentMeals.map((meal, index) => (
                  <TouchableOpacity
                    key={meal.meal_id || `meal-${index}`}
                    style={[
                      styles.activityItem,
                      { borderBottomColor: colors.border },
                      index === processedMealsData.recentMeals.length - 1 &&
                        styles.lastActivityItem,
                    ]}
                    onPress={() => {
                      const mealId = meal.meal_id || meal.id;
                      if (mealId) {
                        router.push({
                          pathname: "/(tabs)/history",
                          params: { selectedMealId: mealId.toString() },
                        });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {meal.image_url ? (
                      <Image
                        source={{ uri: meal.image_url }}
                        style={styles.mealImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.activityIcon,
                          {
                            backgroundColor: isDark
                              ? colors.primaryContainer
                              : colors.emerald50,
                          },
                        ]}
                      >
                        <Camera size={20} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.activityContent}>
                      <Text
                        style={[styles.activityTitle, { color: colors.text }]}
                      >
                        {meal.name || t("home.unknownMeal")}
                      </Text>
                      <Text
                        style={[
                          styles.activityTime,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {meal.created_at && formatTime(meal.created_at)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.activityCalories,
                        { color: colors.primary },
                      ]}
                    >
                      {meal.calories || 0} {t("meals.kcal")}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View
                  style={[
                    styles.activityItem,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <Target size={20} color={colors.textTertiary} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text
                      style={[styles.activityTitle, { color: colors.text }]}
                    >
                      {t("home.noMealsToday")}
                    </Text>
                    <Text
                      style={[
                        styles.activityTime,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("home.addFirstMeal")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.activityBadge,
                      {
                        backgroundColor: isDark
                          ? colors.primaryContainer
                          : colors.emerald50,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => router.push("/(tabs)/camera")}
                  >
                    <Text
                      style={[
                        styles.activityBadgeText,
                        { color: colors.primary },
                      ]}
                    >
                      {t("home.addMeal")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        <ShoppingList
          visible={showShoppingList}
          onClose={handleCloseShoppingList}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
});

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileContainer: {
    position: "relative",
    marginRight: 12,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerInfo: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
  },
  greetingCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: "hidden",
  },
  greetingGradient: {
    padding: 24,
  },
  greetingContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  greetingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  greetingName: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 2,
  },
  greetingStats: {
    alignItems: "flex-end",
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statBadgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressSection: {
    marginBottom: 32,
    marginHorizontal: 16,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statCardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  statCardSubtext: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: (width - 56) / 2,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 0.5,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  activitySection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activityList: {
    borderRadius: 16,
    borderWidth: 0.5,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  lastActivityItem: {
    borderBottomWidth: 0,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  mealImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 14,
    fontWeight: "500",
  },
  activityCalories: {
    fontSize: 16,
    fontWeight: "600",
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  activityBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "500",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
});
