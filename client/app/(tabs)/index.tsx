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
  const [waterGoalMl, setWaterGoalMl] = useState(2500);
  const waterGoalCups = Math.ceil(waterGoalMl / 250);
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
  // FIXED VERSION - Key changes marked with // FIX comments

  // Around line 155-170, replace the dailyTotals calculation:

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

    // FIX: Handle both snake_case and camelCase field names from backend
    // IMPORTANT: Check _g fields FIRST since API returns protein_g, carbs_g, fats_g
    const dailyTotals = todayMeals.reduce(
      (
        acc: { calories: any; protein: any; carbs: any; fat: any },
        meal: any,
      ) => ({
        calories: acc.calories + (Number(meal.calories) || 0),
        // FIX: Check protein_g FIRST (API format), then protein (compatibility)
        protein: acc.protein + (Number(meal.protein_g) || Number(meal.protein) || 0),
        // FIX: Check carbs_g FIRST (API format), then carbs (compatibility)
        carbs: acc.carbs + (Number(meal.carbs_g) || Number(meal.carbs) || 0),
        // FIX: Check fats_g FIRST (API format), then fat/fats (compatibility)
        fat: acc.fat + (Number(meal.fats_g) || Number(meal.fat) || Number(meal.fats) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    return {
      recentMeals: sortedMeals.slice(0, 4),
      todaysMeals: todayMeals,
      dailyTotals,
    };
  }, [meals]);

  // ADDITIONAL FIX: Around line 173-179, update the updateDailyGoals function
  const updateDailyGoals = useCallback(() => {
    console.log("🔍 DEBUG: Daily Totals:", processedMealsData.dailyTotals); // FIX: Add debug logging
    setDailyGoals((prev) => ({
      ...prev,
      calories: processedMealsData.dailyTotals.calories,
      protein: processedMealsData.dailyTotals.protein,
      carbs: processedMealsData.dailyTotals.carbs,
      fat: processedMealsData.dailyTotals.fat,
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
      setWaterGoalMl(2500);
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
      setWaterGoalMl(2500);
    }
  }, [user?.user_id, user?.subscription_type, t]);

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
    [waterCups, syncWaterWithServer, waterGoalCups],
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
        gradient: ["#FF6B6B", "#FFE66D"] as const,
        color: "#FF6B6B",
      };
    } else if (currentHour >= 12 && currentHour < 17) {
      return {
        text: t("greetings.afternoon"),
        icon: Sun,
        gradient: ["#4ECDC4", "#44A08D"] as const,
        color: "#4ECDC4",
      };
    } else if (currentHour >= 17 && currentHour < 22) {
      return {
        text: t("greetings.evening"),
        icon: Sun,
        gradient: ["#F857A6", "#FF5858"] as const,
        color: "#F857A6",
      };
    } else {
      return {
        text: t("greetings.night"),
        icon: Sun,
        gradient: ["#5B247A", "#1BCEDF"] as const,
        color: "#5B247A",
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
          {/* Premium Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.profileSection}>
                <View style={styles.profileWrapper}>
                  <LinearGradient
                    colors={greeting.gradient}
                    style={styles.profileGradientRing}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View
                      style={[
                        styles.profileImageContainer,
                        { backgroundColor: colors.background },
                      ]}
                    >
                      <Image
                        source={{
                          uri:
                            user?.avatar_url ||
                            "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1",
                        }}
                        style={styles.profileImage}
                      />
                    </View>
                  </LinearGradient>
                  <View
                    style={[
                      styles.onlineIndicator,
                      {
                        backgroundColor: colors.success,
                        borderColor: colors.background,
                      },
                    ]}
                  />
                </View>
                <View style={styles.headerTextContent}>
                  <Text
                    style={[styles.dateText, { color: colors.textSecondary }]}
                  >
                    {getCurrentDate()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Elevated Greeting Card with Dynamic Gradient */}
          <View style={styles.greetingCardContainer}>
            <LinearGradient
              colors={greeting.gradient}
              style={styles.greetingCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.greetingOverlay}>
                <View style={styles.greetingContent}>
                  <View style={styles.greetingTextSection}>
                    <View style={styles.greetingIconWrapper}>
                      <View
                        style={[
                          styles.greetingIconBg,
                          { backgroundColor: "rgba(255, 255, 255, 0.25)" },
                        ]}
                      >
                        <IconComponent
                          size={28}
                          color="#FFFFFF"
                          strokeWidth={2.5}
                        />
                      </View>
                    </View>
                    <View style={styles.greetingTextContent}>
                      <Text style={styles.greetingLabel}>{greeting.text}</Text>
                      <Text style={styles.greetingUserName}>{user?.name}!</Text>
                    </View>
                  </View>
                  <View style={styles.levelBadgeContainer}>
                    <View style={styles.levelBadge}>
                      <Star
                        size={18}
                        color="#FFD700"
                        fill="#FFD700"
                        strokeWidth={0}
                      />
                      <Text style={styles.levelText}>
                        {t("home.level")} {user?.level || 1}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Decorative Elements */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />
              </View>
            </LinearGradient>
          </View>

          {/* Progress Section with Enhanced Design */}
          <View style={styles.progressSection}>
            <CircularCaloriesProgress
              calories={dailyGoals.calories}
              targetCalories={dailyGoals.targetCalories}
              dailyGoals={dailyGoals}
            />
          </View>

          {/* Water Intake */}
          <WaterIntakeCard
            currentCups={waterCups}
            maxCups={waterGoalCups}
            targetMl={waterGoalMl}
            onIncrement={incrementWater}
            onDecrement={decrementWater}
            onAddVolume={addWaterVolume}
            disabled={isUpdating}
          />

          {/* Premium Stats Cards */}
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
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    isDark
                      ? ["rgba(255, 215, 0, 0.15)", "rgba(255, 215, 0, 0.05)"]
                      : ["#FFF9E6", "#FFFBF0"]
                  }
                  style={styles.statCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.statCardContent}>
                    <View
                      style={[
                        styles.statIconContainer,
                        { backgroundColor: "rgba(255, 215, 0, 0.2)" },
                      ]}
                    >
                      <Trophy size={24} color="#FFD700" strokeWidth={2} />
                    </View>
                    <View style={styles.statCardTextSection}>
                      <Text
                        style={[
                          styles.statCardLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("home.totalXP")}
                      </Text>
                      <Text
                        style={[styles.statCardValue, { color: colors.text }]}
                      >
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
                  </View>
                </LinearGradient>
              </View>

              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    isDark
                      ? [
                          "rgba(255, 107, 107, 0.15)",
                          "rgba(255, 107, 107, 0.05)",
                        ]
                      : ["#FFE8E8", "#FFF5F5"]
                  }
                  style={styles.statCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.statCardContent}>
                    <View
                      style={[
                        styles.statIconContainer,
                        { backgroundColor: "rgba(255, 107, 107, 0.2)" },
                      ]}
                    >
                      <Flame size={24} color="#FF6B6B" strokeWidth={2} />
                    </View>
                    <View style={styles.statCardTextSection}>
                      <Text
                        style={[
                          styles.statCardLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("home.streak")}
                      </Text>
                      <Text
                        style={[styles.statCardValue, { color: colors.text }]}
                      >
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
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Modern Action Grid */}
          <View style={styles.actionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("home.quick_actions")}
            </Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push("/(tabs)/camera")}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[
                    "rgba(16, 185, 129, 0.1)",
                    "rgba(16, 185, 129, 0.05)",
                  ]}
                  style={styles.actionCardGradient}
                >
                  <View
                    style={[
                      styles.actionIconCircle,
                      { backgroundColor: "rgba(16, 185, 129, 0.15)" },
                    ]}
                  >
                    <Camera size={26} color="#10B981" strokeWidth={2} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>
                    {t("home.addMeal")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push("/(tabs)/food-scanner")}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[
                    "rgba(59, 130, 246, 0.1)",
                    "rgba(59, 130, 246, 0.05)",
                  ]}
                  style={styles.actionCardGradient}
                >
                  <View
                    style={[
                      styles.actionIconCircle,
                      { backgroundColor: "rgba(59, 130, 246, 0.15)" },
                    ]}
                  >
                    <Target size={26} color="#3B82F6" strokeWidth={2} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>
                    {t("home.scanFood")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface }]}
                onPress={handleOpenShoppingList}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[
                    "rgba(245, 158, 11, 0.1)",
                    "rgba(245, 158, 11, 0.05)",
                  ]}
                  style={styles.actionCardGradient}
                >
                  <View
                    style={[
                      styles.actionIconCircle,
                      { backgroundColor: "rgba(245, 158, 11, 0.15)" },
                    ]}
                  >
                    <ShoppingCart size={26} color="#F59E0B" strokeWidth={2} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>
                    {t("home.shopping")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push("/(tabs)/statistics")}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[
                    "rgba(139, 92, 246, 0.1)",
                    "rgba(139, 92, 246, 0.05)",
                  ]}
                  style={styles.actionCardGradient}
                >
                  <View
                    style={[
                      styles.actionIconCircle,
                      { backgroundColor: "rgba(139, 92, 246, 0.15)" },
                    ]}
                  >
                    <TrendingUp size={26} color="#8B5CF6" strokeWidth={2} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>
                    {t("home.statistics")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Enhanced Activity Section */}
          <View style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("home.todaysMeals")}
              </Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push("/(tabs)/history")}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  {t("home.viewAll")}
                </Text>
                <ChevronRight
                  size={18}
                  color={colors.primary}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </View>

            <View
              style={[styles.activityCard, { backgroundColor: colors.surface }]}
            >
              {isLoading ? (
                <View style={styles.activityItem}>
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
                      index !== processedMealsData.recentMeals.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: isDark
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.05)",
                      },
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
                      <View style={styles.mealImageWrapper}>
                        <Image
                          source={{ uri: meal.image_url }}
                          style={styles.mealImage}
                        />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.mealPlaceholder,
                          { backgroundColor: "rgba(16, 185, 129, 0.1)" },
                        ]}
                      >
                        <Camera size={22} color="#10B981" strokeWidth={2} />
                      </View>
                    )}
                    <View style={styles.activityContent}>
                      <Text
                        style={[styles.activityTitle, { color: colors.text }]}
                        numberOfLines={1}
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
                    <View style={styles.caloriesBadge}>
                      <Text
                        style={[styles.caloriesText, { color: colors.primary }]}
                      >
                        {meal.calories || 0}
                      </Text>
                      <Text
                        style={[
                          styles.caloriesUnit,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {t("meals.kcal")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <View
                    style={[
                      styles.emptyIconCircle,
                      {
                        backgroundColor: isDark
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(0, 0, 0, 0.03)",
                      },
                    ]}
                  >
                    <Target
                      size={32}
                      color={colors.textTertiary}
                      strokeWidth={1.5}
                    />
                  </View>
                  <Text
                    style={[styles.emptyStateTitle, { color: colors.text }]}
                  >
                    {t("home.noMealsToday")}
                  </Text>
                  <Text
                    style={[
                      styles.emptyStateSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("home.addFirstMeal")}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.addMealButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => router.push("/(tabs)/camera")}
                    activeOpacity={0.8}
                  >
                    <Camera size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.addMealButtonText}>
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
    paddingBottom: 32,
  },

  // Premium Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileWrapper: {
    position: "relative",
    marginRight: 14,
  },
  profileGradientRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  profileImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  headerTextContent: {
    flex: 1,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  // Elevated Greeting Card
  greetingCardContainer: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 28,
    borderRadius: 28,
  },
  greetingCard: {
    borderRadius: 28,
    overflow: "hidden",
  },
  greetingOverlay: {
    padding: 28,
    position: "relative",
    overflow: "hidden",
  },
  greetingContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  greetingTextSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  greetingIconWrapper: {
    marginRight: 16,
  },
  greetingIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingTextContent: {
    flex: 1,
  },
  greetingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  greetingUserName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  levelBadgeContainer: {
    alignItems: "flex-end",
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    backdropFilter: "blur(10px)",
  },
  levelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  decorativeCircle1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    zIndex: 1,
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    zIndex: 1,
  },

  // Progress Section
  progressSection: {
    marginBottom: 32,
    marginHorizontal: 20,
  },

  // Premium Stats Cards
  statsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  statCardGradient: {
    padding: 20,
  },
  statCardContent: {
    gap: 14,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardTextSection: {
    gap: 4,
  },
  statCardLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  statCardValue: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: 4,
  },
  statCardSubtext: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },

  // Modern Action Grid
  actionsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  actionCard: {
    width: (width - 62) / 2,
    borderRadius: 24,
    overflow: "hidden",
  },
  actionCardGradient: {
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  actionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.2,
  },

  // Enhanced Activity Section
  activitySection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  activityCard: {
    borderRadius: 24,
    overflow: "hidden",
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  mealImageWrapper: {},
  mealImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
  },
  mealPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
    gap: 4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  activityTime: {
    fontSize: 13,
    fontWeight: "500",
  },
  caloriesBadge: {
    alignItems: "flex-end",
    gap: 2,
  },
  caloriesText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  caloriesUnit: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Empty State
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 24,
    textAlign: "center",
  },
  addMealButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
  },
  addMealButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  bottomSpacing: {
    height: 32,
  },

  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  retryButtonText: {
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
