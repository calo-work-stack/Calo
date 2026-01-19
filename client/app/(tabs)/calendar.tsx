import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../src/store";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import {
  fetchCalendarData,
  addEvent,
  deleteEvent,
  getStatistics,
  getEnhancedStatistics,
  clearError,
} from "../../src/store/calendarSlice";
import StatisticsCarousel from "@/components/calendar/StatisticsCarousel";
import { Ionicons } from "@expo/vector-icons";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Target,
  TrendingUp,
  TrendingDown,
  CircleCheck as CheckCircle,
  Circle as XCircle,
  Flame,
  CreditCard as Edit,
  Eye,
  Star,
} from "lucide-react-native";
import LoadingScreen from "@/components/LoadingScreen";
import { DayData, MonthStats } from "@/src/types/calendar";
import { useTranslation } from "react-i18next";

// Sleek Day Cell Component - Minimal & Modern
interface AnimatedDayCellProps {
  dayData: DayData;
  isToday: boolean;
  isSelected: boolean;
  onPress: (dayData: DayData) => void;
  onLongPress: (date: string) => void;
  primaryColor: string;
  isDark: boolean;
}

const AnimatedDayCell = React.memo(
  ({
    dayData,
    isToday,
    isSelected,
    onPress,
    onLongPress,
    primaryColor,
    isDark,
  }: AnimatedDayCellProps) => {
    // Extract day number from date string directly to avoid Date parsing issues
    const dayNumber = useMemo(() => {
      const parts = dayData.date.split("-");
      return parseInt(parts[2], 10);
    }, [dayData.date]);

    const { progress, hasEvents, hasData, statusColors } = useMemo(() => {
      const getProgressPercentage = (actual: number, goal: number) => {
        if (goal === 0) return 0;
        return Math.min((actual / goal) * 100, 150);
      };

      const prog = getProgressPercentage(
        dayData.calories_actual,
        dayData.calories_goal
      );
      const events = dayData.events.length > 0;
      const data = prog > 0;

      // Sleek color palette
      let colors;
      if (prog >= 110) {
        colors = { bg: "#FEE2E2", fill: "#EF4444", text: "#DC2626" };
      } else if (prog >= 100) {
        colors = { bg: "#D1FAE5", fill: "#10B981", text: "#059669" };
      } else if (prog >= 70) {
        colors = { bg: "#FEF3C7", fill: "#F59E0B", text: "#D97706" };
      } else if (prog > 0) {
        colors = { bg: "#FFEDD5", fill: "#F97316", text: "#EA580C" };
      } else {
        colors = {
          bg: isDark ? "#374151" : "#F3F4F6",
          fill: isDark ? "#6B7280" : "#D1D5DB",
          text: isDark ? "#9CA3AF" : "#9CA3AF",
        };
      }

      return {
        progress: prog,
        hasEvents: events,
        hasData: data,
        statusColors: colors,
      };
    }, [
      dayData.calories_actual,
      dayData.calories_goal,
      dayData.events.length,
      isDark,
    ]);

    const handlePress = useCallback(() => {
      onPress(dayData);
    }, [onPress, dayData]);

    const handleLongPress = useCallback(() => {
      onLongPress(dayData.date);
    }, [onLongPress, dayData.date]);

    return (
      <View style={styles.dayCellWrapper}>
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          style={({ pressed }) => [
            styles.sleekDayCell,
            {
              backgroundColor: isSelected
                ? isDark
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(16, 185, 129, 0.08)"
                : "transparent",
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
            isToday && styles.todayCell,
            isSelected && { borderColor: primaryColor, borderWidth: 1.5 },
          ]}
        >
          {/* Day Number */}
          <Text
            style={[
              styles.sleekDayNumber,
              {
                color: isToday
                  ? primaryColor
                  : hasData
                  ? isDark
                    ? "#F9FAFB"
                    : "#1F2937"
                  : isDark
                  ? "#6B7280"
                  : "#9CA3AF",
                fontWeight: isToday ? "700" : "600",
              },
            ]}
          >
            {dayNumber}
          </Text>

          {/* Progress Bar - Sleek horizontal style */}
          <View style={styles.sleekProgressContainer}>
            <View
              style={[
                styles.sleekProgressBg,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
                },
              ]}
            >
              <View
                style={[
                  styles.sleekProgressFill,
                  {
                    width: `${Math.min(progress, 100)}%`,
                    backgroundColor: statusColors.fill,
                  },
                ]}
              />
            </View>
          </View>

          {/* Event indicator - subtle dot */}
          {hasEvents && (
            <View
              style={[styles.sleekEventDot, { backgroundColor: "#F59E0B" }]}
            />
          )}
        </Pressable>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if these specific props change
    return (
      prevProps.dayData.date === nextProps.dayData.date &&
      prevProps.dayData.calories_actual === nextProps.dayData.calories_actual &&
      prevProps.dayData.calories_goal === nextProps.dayData.calories_goal &&
      prevProps.dayData.events.length === nextProps.dayData.events.length &&
      prevProps.isToday === nextProps.isToday &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isDark === nextProps.isDark &&
      prevProps.primaryColor === nextProps.primaryColor
    );
  }
);

const { width } = Dimensions.get("window");

export default function CalendarScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    calendarData,
    statistics,
    enhancedStatistics,
    isLoading,
    isLoadingEnhancedStats,
    isAddingEvent,
    isDeletingEvent,
    error,
  } = useSelector((state: RootState) => state.calendar);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("general");
  const [eventDescription, setEventDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  // Menu logic states
  const [menuStartDate, setMenuStartDate] = useState<Date | null>(null);
  const [menuDuration, setMenuDuration] = useState<number>(0);
  const [menuProgress, setMenuProgress] = useState<number>(0);
  const [isMenuComplete, setIsMenuComplete] = useState(false);

  // Theme and language hooks
  const { colors, isDark } = useTheme();
  const { language, isRTL } = useLanguage();
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useTranslation();

  // Create dynamic styles based on theme
  const dynamicStyles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    console.log("🔄 [Calendar] Date changed, loading data...");
    loadCalendarData();
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  useEffect(() => {
    if (error) {
      console.error("❌ [Calendar] Error detected:", error);
      Alert.alert(t("calendar.errors.generic"), error, [
        {
          text: t("common.retry"),
          onPress: () => {
            dispatch(clearError());
            loadCalendarData();
          },
        },
        {
          text: t("common.cancel"),
          style: "cancel",
          onPress: () => dispatch(clearError()),
        },
      ]);
    }
  }, [error, dispatch, t]);

  const loadCalendarData = useCallback(async () => {
    console.log("📅 [Calendar] Starting to load calendar data");
    setIsLoadingCalendar(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      console.log(`📅 [Calendar] Loading data for ${year}/${month}`);

      const results = await Promise.allSettled([
        dispatch(fetchCalendarData({ year, month })).unwrap(),
        dispatch(getStatistics({ year, month })).unwrap(),
        dispatch(getEnhancedStatistics({ year, month })).unwrap(),
      ]);
      console.log(results);
      const [calendarResult, statsResult, enhancedResult] = results;

      if (calendarResult.status === "rejected") {
        console.error(
          "❌ [Calendar] Calendar data failed:",
          calendarResult.reason
        );
      } else {
        console.log("✅ [Calendar] Calendar data loaded successfully");
      }

      if (statsResult.status === "rejected") {
        console.warn(
          "⚠️ [Calendar] Stats failed (non-critical):",
          statsResult.reason
        );
      } else {
        console.log("✅ [Calendar] Statistics loaded successfully");
      }

      if (enhancedResult.status === "rejected") {
        console.warn(
          "⚠️ [Calendar] Enhanced stats failed (non-critical):",
          enhancedResult.reason
        );
      } else {
        console.log("✅ [Calendar] Enhanced statistics loaded successfully");
      }

      console.log("✅ [Calendar] All calendar data loading complete");
    } catch (error) {
      console.error("💥 [Calendar] Calendar load error:", error);
    } finally {
      setIsLoadingCalendar(false);
    }
  }, [currentDate, dispatch]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      const dayData = calendarData[dateStr] || {
        date: dateStr,
        calories_goal: 2000,
        calories_actual: 0,
        protein_goal: 150,
        protein_actual: 0,
        carbs_goal: 250,
        carbs_actual: 0,
        fat_goal: 67,
        fat_actual: 0,
        meal_count: 0,
        quality_score: 0,
        water_intake_ml: 0,
        events: [],
      };
      days.push(dayData);
    }

    return days;
  }, [currentDate, calendarData]);

  const getProgressPercentage = (actual: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min((actual / goal) * 100, 150);
  };

  const getDayColor = (dayData: DayData) => {
    const caloriesProgress = getProgressPercentage(
      dayData.calories_actual,
      dayData.calories_goal
    );

    if (caloriesProgress >= 110) return colors.error;
    if (caloriesProgress >= 100) return colors.success;
    if (caloriesProgress >= 70) return colors.warning;
    return colors.destructive;
  };

  const getDayStatus = (dayData: DayData) => {
    const caloriesProgress = getProgressPercentage(
      dayData.calories_actual,
      dayData.calories_goal
    );

    if (caloriesProgress >= 100) return t("calendar.excellent");
    if (caloriesProgress >= 80) return t("calendar.good");
    return t("calendar.needsImprovement");
  };

  const navigateMonth = useCallback(
    (direction: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + direction);
      setCurrentDate(newDate);
    },
    [currentDate]
  );

  const handleMonthSelect = useCallback(
    (monthIndex: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(monthIndex);
      setCurrentDate(newDate);
      setShowMonthPicker(false);
    },
    [currentDate]
  );

  const handleYearSelect = useCallback(
    (year: number) => {
      const newDate = new Date(currentDate);
      newDate.setFullYear(year);
      setCurrentDate(newDate);
      setShowYearPicker(false);
    },
    [currentDate]
  );

  const generateYearRange = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  const handleDayPress = useCallback((dayData: DayData) => {
    setSelectedDay(dayData);
    setShowDayModal(true);
  }, []);

  const handleAddEvent = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setEventTitle("");
    setEventType("general");
    setEventDescription("");
    setSelectedEvent(null);
    setIsEditingEvent(false);
    setShowEventModal(true);
  }, []);

  const handleEventPress = (event: any, dayData: DayData) => {
    setSelectedEvent({ ...event, date: dayData.date });
    setShowEventDetailsModal(true);
  };

  const handleEditEvent = () => {
    if (!selectedEvent) return;
    setEventTitle(selectedEvent.title);
    setEventType(selectedEvent.type);
    setEventDescription(selectedEvent.description || "");
    setSelectedDate(selectedEvent.date);
    setIsEditingEvent(true);
    setShowEventDetailsModal(false);
    setShowEventModal(true);
  };

  const handleViewEvent = (event: any, dayData: DayData) => {
    setSelectedEvent({ ...event, date: dayData.date });
    setShowEventDetailsModal(true);
  };

  const submitEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert(t("common.error"), t("calendar.events.titleRequired"));
      return;
    }

    try {
      if (isEditingEvent && selectedEvent) {
        await dispatch(
          deleteEvent({ eventId: selectedEvent.id, date: selectedEvent.date })
        ).unwrap();
      }

      await dispatch(
        addEvent({
          date: selectedDate,
          title: eventTitle.trim(),
          type: eventType,
          description: eventDescription.trim() || undefined,
        })
      ).unwrap();

      setShowEventModal(false);
      setIsEditingEvent(false);
      Alert.alert(
        t("common.success"),
        isEditingEvent
          ? t("calendar.events.success")
          : t("calendar.events.success")
      );
    } catch (error) {
      Alert.alert(
        t("common.error"),
        isEditingEvent ? t("calendar.events.error") : t("calendar.events.error")
      );
    }
  };

  const handleDeleteEvent = async (eventId: string, date: string) => {
    Alert.alert(
      t("calendar.events.deleteTitle"),
      t("calendar.events.deleteConfirm"),
      [
        { text: t("calendar.events.cancel"), style: "cancel" },
        {
          text: t("calendar.events.deleteButton"),
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(deleteEvent({ eventId, date })).unwrap();
              setShowEventDetailsModal(false);
              Alert.alert(
                t("common.success"),
                t("calendar.events.deleteSuccess")
              );
            } catch (error) {
              Alert.alert(t("common.error"), t("calendar.events.deleteError"));
            }
          },
        },
      ]
    );
  };

  const monthStats = useMemo((): MonthStats => {
    const days = daysInMonth.filter((day) => day !== null) as DayData[];
    const totalDays = days.length;
    const successfulDays = days.filter(
      (day) =>
        getProgressPercentage(day.calories_actual, day.calories_goal) >= 100
    ).length;
    const averageCompletion =
      days.reduce(
        (sum, day) =>
          sum + getProgressPercentage(day.calories_actual, day.calories_goal),
        0
      ) / totalDays;

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (let i = days.length - 1; i >= 0; i--) {
      const goalMet =
        getProgressPercentage(days[i].calories_actual, days[i].calories_goal) >=
        100;
      if (goalMet) {
        tempStreak++;
        if (i === days.length - 1 || currentStreak === 0) {
          currentStreak = tempStreak;
        }
      } else {
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
        tempStreak = 0;
        if (i === days.length - 1) {
          currentStreak = 0;
        }
      }
    }

    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }

    return {
      totalDays,
      successfulDays,
      averageCompletion,
      bestStreak,
      currentStreak,
    };
  }, [daysInMonth]);

  const calculateMenuProgress = () => {
    if (!menuStartDate || menuDuration === 0) {
      setMenuProgress(0);
      setIsMenuComplete(false);
      return;
    }

    const today = new Date();
    const startDate = new Date(menuStartDate);
    startDate.setHours(0, 0, 0, 0);

    if (menuStartDate.getHours() >= 14) {
      startDate.setDate(startDate.getDate() + 1);
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + menuDuration - 1);
    endDate.setHours(23, 59, 59, 999);

    if (today < startDate) {
      setMenuProgress(0);
      setIsMenuComplete(false);
      return;
    }

    if (today > endDate) {
      setMenuProgress(100);
      setIsMenuComplete(true);
      return;
    }

    const elapsedDays =
      Math.floor(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
    const progress = Math.min((elapsedDays / menuDuration) * 100, 100);
    setMenuProgress(progress);
    setIsMenuComplete(false);
  };

  const handleStartMenu = (date: Date, duration: number) => {
    setMenuStartDate(date);
    setMenuDuration(duration);
  };

  const handleCompleteMenu = () => {
    setIsMenuComplete(true);
    Alert.alert(t("calendar.menuCompleted"), t("calendar.generatingSummary"));
  };

  useEffect(() => {
    if (menuStartDate || menuDuration > 0) {
      calculateMenuProgress();
    }
  }, [menuStartDate, menuDuration]);

  const handleDayCellPress = useCallback(
    (dayData: DayData) => {
      handleDayPress(dayData);
    },
    [handleDayPress]
  );

  const handleDayCellLongPress = useCallback(
    (date: string) => {
      handleAddEvent(date);
    },
    [handleAddEvent]
  );

  const selectedDayDate = useMemo(
    () => selectedDay?.date || null,
    [selectedDay?.date]
  );

  const todayString = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const renderDay = useCallback(
    (dayData: DayData | null, index: number) => {
      if (!dayData) {
        return <View key={`empty-${index}`} style={styles.emptyDayCell} />;
      }

      const isToday = todayString === dayData.date;
      const isSelected = selectedDayDate === dayData.date;

      return (
        <AnimatedDayCell
          key={dayData.date}
          dayData={dayData}
          isToday={isToday}
          isSelected={isSelected}
          onPress={handleDayCellPress}
          onLongPress={handleDayCellLongPress}
          primaryColor={colors.primary}
          isDark={isDark}
        />
      );
    },
    [
      selectedDayDate,
      todayString,
      handleDayCellPress,
      handleDayCellLongPress,
      colors.primary,
      isDark,
    ]
  );

  const renderWeekDays = () => {
    const dayNames = t("calendar.dayNames", {
      returnObjects: true,
    }) as string[];
    return (
      <View
        style={[
          styles.sleekWeekDaysContainer,
          { borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : colors.border },
        ]}
      >
        {dayNames.map((day, index) => (
          <View key={index} style={styles.sleekDayHeader}>
            <Text
              style={[
                styles.sleekDayHeaderText,
                { color: isDark ? "rgba(255,255,255,0.5)" : colors.textSecondary },
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderGamificationSection = () => {
    if (!statistics || !statistics.gamificationBadges?.length) return null;

    return (
      <View style={dynamicStyles.section}>
        <View style={dynamicStyles.gamificationContainer}>
          <View style={dynamicStyles.statsGradient}>
            <View style={dynamicStyles.gamificationHeader}>
              <Text style={dynamicStyles.gamificationTitle}>
                🏆 {t("calendar.recentAchievements")}
              </Text>
              <TouchableOpacity onPress={() => setShowBadgesModal(true)}>
                <Text style={dynamicStyles.seeAllText}>{t("calendar.seeAll")}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {statistics.gamificationBadges.slice(0, 5).map((badge) => (
                <View key={badge.id} style={dynamicStyles.badgeItem}>
                  <View style={dynamicStyles.badgeIcon}>
                    <Text style={dynamicStyles.badgeIconText}>{badge.icon}</Text>
                  </View>
                  <Text style={dynamicStyles.badgeName}>{badge.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  const renderEnhancedStatistics = () => {
    return (
      <View style={dynamicStyles.statisticsSection}>
        <Text style={dynamicStyles.statisticsSectionTitle}>
          {t("calendar.monthlyStats")}
        </Text>
        <StatisticsCarousel
          statistics={enhancedStatistics}
          isLoading={isLoadingEnhancedStats}
          language={language}
        />
      </View>
    );
  };

  if (
    (isLoading || isLoadingCalendar) &&
    Object.keys(calendarData).length === 0
  ) {
    return <LoadingScreen text={t("loading.calendar", "loading.calendar")} />;
  }

  const hasNoData =
    Object.keys(calendarData).length === 0 && !isLoading && !isLoadingCalendar;

  const monthNames = t("calendar.monthNames", {
    returnObjects: true,
  }) as string[];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Modern Gradient Header */}
        <View
          style={styles.modernHeader}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerIconContainer}>
              <CalendarIcon size={32} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: "#FFFFFF" }]}>
                {t("calendar.title")}
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: "rgba(255, 255, 255, 0.9)" },
                ]}
              >
                {t("calendar.subtitle")}
              </Text>
            </View>
          </View>
        </View>

        {/* Enhanced Statistics Carousel */}
        {renderEnhancedStatistics()}

        {/* Gamification Section */}
        {renderGamificationSection()}

        {/* Enhanced Calendar Navigation */}
        <View
          style={[
            styles.enhancedCalendarHeader,
            { backgroundColor: isDark ? colors.surface : colors.card },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.enhancedNavButton,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : `${colors.primary}15`,
              },
            ]}
            onPress={() => navigateMonth(-1)}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.sleekMonthContainer}>
            <Text style={[styles.sleekMonthText, { color: colors.text }]}>
              {monthNames[currentDate.getMonth()]}
            </Text>
            <Text
              style={[
                styles.sleekYearText,
                { color: colors.textSecondary },
              ]}
            >
              {currentDate.getFullYear()}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.sleekNavButton}
            onPress={() => navigateMonth(1)}
            activeOpacity={0.7}
          >
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sleek Calendar Grid */}
        <View style={styles.sleekCalendarSection}>
          <View
            style={[
              styles.sleekCalendarContainer,
              {
                backgroundColor: isDark ? colors.surface : colors.card,
                borderColor: isDark ? colors.outline : colors.border,
              },
            ]}
          >
            {renderWeekDays()}
            <View style={styles.sleekDaysGrid}>
              {daysInMonth.map((dayData, index) => renderDay(dayData, index))}
            </View>
          </View>

          {/* Empty State for No Data */}
          {hasNoData && (
            <View style={dynamicStyles.emptyStateContainer}>
              <CalendarIcon size={48} color={colors.muted} />
              <Text style={dynamicStyles.emptyStateTitle}>
                {t("common.no_data")}
              </Text>
              <Text style={dynamicStyles.emptyStateText}>
                {t("history.start_logging")}
              </Text>
            </View>
          )}
        </View>

        {/* Sleek Legend */}
        <View style={styles.sleekLegendSection}>
          <View style={styles.sleekLegendContainer}>
            <View style={styles.sleekLegendItem}>
              <View
                style={[styles.sleekLegendDot, { backgroundColor: colors.success }]}
              />
              <Text style={[styles.sleekLegendText, { color: colors.textSecondary }]}>
                {t("calendar.goalMet")}
              </Text>
            </View>
            <View style={styles.sleekLegendItem}>
              <View
                style={[styles.sleekLegendDot, { backgroundColor: colors.warning }]}
              />
              <Text style={[styles.sleekLegendText, { color: colors.textSecondary }]}>
                70-99%
              </Text>
            </View>
            <View style={styles.sleekLegendItem}>
              <View
                style={[styles.sleekLegendDot, { backgroundColor: colors.error }]}
              />
              <Text style={[styles.sleekLegendText, { color: colors.textSecondary }]}>
                {"<70%"}
              </Text>
            </View>
            <View style={styles.sleekLegendItem}>
              <View
                style={[styles.sleekLegendDot, { backgroundColor: colors.muted }]}
              />
              <Text style={[styles.sleekLegendText, { color: colors.textSecondary }]}>
                {t("common.no_data")}
              </Text>
            </View>
          </View>
        </View>

        {/* Day Details */}
        {selectedDay ? (
          <View style={dynamicStyles.section}>
            <View style={dynamicStyles.dayDetailsContainer}>
              <LinearGradient
                colors={isDark ? [colors.surface, colors.surfaceVariant] : [colors.card, colors.surfaceVariant]}
                style={styles.dayDetailsGradient}
              >
                {/* Elegant Header */}
                <View style={styles.dayDetailsHeader}>
                  <View style={styles.dayDetailsDateContainer}>
                    <View
                      style={[
                        styles.dayDetailsDateCircle,
                        { backgroundColor: `${getDayColor(selectedDay)}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayDetailsDateText,
                          { color: getDayColor(selectedDay) },
                        ]}
                      >
                        {new Date(selectedDay.date).getDate()}
                      </Text>
                    </View>
                    <View style={styles.dayDetailsHeaderText}>
                      <Text style={[styles.dayDetailsMonthText, { color: colors.text }]}>
                        {monthNames[new Date(selectedDay.date).getMonth()]}
                      </Text>
                      <Text style={[styles.dayDetailsYearText, { color: colors.textSecondary }]}>
                        {new Date(selectedDay.date).getFullYear()}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.dayDetailsStatusBadge,
                      { backgroundColor: `${getDayColor(selectedDay)}15` },
                    ]}
                  >
                    {getProgressPercentage(
                      selectedDay.calories_actual,
                      selectedDay.calories_goal
                    ) >= 100 ? (
                      <CheckCircle size={20} color={colors.success} />
                    ) : (
                      <XCircle size={20} color={colors.error} />
                    )}
                    <Text
                      style={[
                        styles.dayDetailsStatusText,
                        { color: getDayColor(selectedDay) },
                      ]}
                    >
                      {getDayStatus(selectedDay)}
                    </Text>
                  </View>
                </View>

                {/* Metrics Grid */}
                <View style={styles.dayDetailsMetrics}>
                  {/* Daily Goal Card */}
                  <View style={[dynamicStyles.metricCard, styles.metricCardLarge]}>
                    <LinearGradient
                      colors={[colors.primary, colors.emerald600]}
                      style={styles.metricGradient}
                    >
                      <View style={styles.metricIconContainer}>
                        <Target size={24} color="#FFFFFF" />
                      </View>
                      <Text style={styles.metricTitleWhite}>
                        {t("calendar.dailyGoal")}
                      </Text>
                      <Text style={styles.metricValueWhite}>
                        {selectedDay.calories_goal}{" "}
                        <Text style={styles.metricUnitWhite}>
                          {t("calendar.kcal")}
                        </Text>
                      </Text>
                      <View style={styles.metricProgressBar}>
                        <View
                          style={[
                            styles.metricProgressFill,
                            {
                              width: `${Math.min(
                                (selectedDay.calories_actual /
                                  selectedDay.calories_goal) *
                                  100,
                                100
                              )}%`,
                            },
                          ]}
                        />
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Meals Progress Card */}
                  <View style={[dynamicStyles.metricCard, styles.metricCardLarge]}>
                    <LinearGradient
                      colors={[colors.error, "#DC2626"]}
                      style={styles.metricGradient}
                    >
                      <View style={styles.metricIconContainer}>
                        <Flame size={24} color="#FFFFFF" />
                      </View>
                      <Text style={styles.metricTitleWhite}>
                        {t("calendar.meals")}
                      </Text>
                      <Text style={styles.metricValueWhite}>
                        {selectedDay.meal_count}/{user?.meals_per_day || 4}
                      </Text>
                      <View style={styles.metricProgressBar}>
                        <View
                          style={[
                            styles.metricProgressFill,
                            {
                              width: `${Math.min(
                                (selectedDay.meal_count /
                                  (user?.meals_per_day || 4)) *
                                  100,
                                100
                              )}%`,
                            },
                          ]}
                        />
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Nutrition Cards */}
                  <View style={dynamicStyles.metricCard}>
                    <View style={styles.metricHeader}>
                      <View
                        style={[
                          styles.metricIconBadge,
                          { backgroundColor: "#FEF3C7" },
                        ]}
                      >
                        <Flame size={16} color="#F59E0B" />
                      </View>
                      <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>
                        {t("calendar.caloriesGoal")}
                      </Text>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                      {selectedDay.calories_actual}
                    </Text>
                    <Text style={[styles.metricTarget, { color: colors.textTertiary }]}>
                      {t("common.of")} {selectedDay.calories_goal}{" "}
                      {t("calendar.kcal")}
                    </Text>
                    <View style={styles.deviationContainer}>
                      {selectedDay.calories_actual >
                      selectedDay.calories_goal ? (
                        <TrendingUp size={12} color={colors.error} />
                      ) : (
                        <TrendingDown size={12} color="#3B82F6" />
                      )}
                      <Text
                        style={[
                          styles.deviationValue,
                          {
                            color:
                              selectedDay.calories_actual >
                              selectedDay.calories_goal
                                ? colors.error
                                : "#3B82F6",
                          },
                        ]}
                      >
                        {Math.abs(
                          selectedDay.calories_actual -
                            selectedDay.calories_goal
                        )}{" "}
                        {t("calendar.kcal")}
                      </Text>
                    </View>
                  </View>

                  <View style={dynamicStyles.metricCard}>
                    <View style={styles.metricHeader}>
                      <View
                        style={[
                          styles.metricIconBadge,
                          { backgroundColor: "#F3E8FF" },
                        ]}
                      >
                        <Target size={16} color="#8B5CF6" />
                      </View>
                      <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>
                        {t("calendar.proteinGoal")}
                      </Text>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                      {selectedDay.protein_actual}
                    </Text>
                    <Text style={[styles.metricTarget, { color: colors.textTertiary }]}>
                      {t("common.of")} {selectedDay.protein_goal}{" "}
                      {t("calendar.g")}
                    </Text>
                    <Text style={[styles.metricPercentage, { color: colors.success }]}>
                      {Math.round(
                        (selectedDay.protein_actual /
                          selectedDay.protein_goal) *
                          100
                      )}
                      %
                    </Text>
                  </View>

                  <View style={dynamicStyles.metricCard}>
                    <View style={styles.metricHeader}>
                      <View
                        style={[
                          styles.metricIconBadge,
                          { backgroundColor: "#DBEAFE" },
                        ]}
                      >
                        <Target size={16} color="#3B82F6" />
                      </View>
                      <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>
                        {t("calendar.waterGoal")}
                      </Text>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                      {selectedDay.water_intake_ml}
                    </Text>
                    <Text style={[styles.metricTarget, { color: colors.textTertiary }]}>{t("calendar.ml")}</Text>
                  </View>
                </View>

                {selectedDay.events.length > 0 && (
                  <View style={dynamicStyles.eventsSection}>
                    <View
                      style={[
                        dynamicStyles.eventsSectionHeader,
                        isRTL && dynamicStyles.eventsSectionHeaderRTL,
                      ]}
                    >
                      <Ionicons name="calendar" size={20} color={colors.primary} />
                      <Text
                        style={[dynamicStyles.eventsTitle, isRTL && dynamicStyles.textRTL]}
                      >
                        {t("calendar.events.title")}
                      </Text>
                    </View>
                    {selectedDay.events.map((event, index) => (
                      <View key={event.id} style={dynamicStyles.eventItem}>
                        <LinearGradient
                          colors={isDark ? [colors.surface, colors.surfaceVariant] : [colors.card, colors.surfaceVariant]}
                          style={styles.eventGradient}
                        >
                          <TouchableOpacity
                            style={[
                              dynamicStyles.eventMainContent,
                              isRTL && dynamicStyles.eventMainContentRTL,
                            ]}
                            onPress={() => handleViewEvent(event, selectedDay)}
                            activeOpacity={0.8}
                          >
                            <View style={dynamicStyles.eventIconContainer}>
                              <LinearGradient
                                colors={[colors.primary, colors.emerald600]}
                                style={styles.eventIconGradient}
                              >
                                <Ionicons
                                  name="calendar"
                                  size={18}
                                  color="#fff"
                                />
                              </LinearGradient>
                            </View>
                            <View
                              style={[
                                dynamicStyles.eventTextContainer,
                                isRTL && dynamicStyles.eventTextContainerRTL,
                              ]}
                            >
                              <Text
                                style={[
                                  dynamicStyles.eventText,
                                  isRTL && dynamicStyles.textRTL,
                                ]}
                              >
                                {event.title}
                              </Text>
                              <Text
                                style={[
                                  dynamicStyles.eventTypeText,
                                  isRTL && dynamicStyles.textRTL,
                                ]}
                              >
                                {event.type}
                              </Text>
                              <Text
                                style={[
                                  dynamicStyles.eventTimeText,
                                  isRTL && dynamicStyles.textRTL,
                                ]}
                              >
                                {new Date(event.created_at).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </Text>
                            </View>
                            <View style={[dynamicStyles.eventNumberBadge, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                              <Text style={[dynamicStyles.eventNumberText, { color: colors.textSecondary }]}>
                                {index + 1}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          <View
                            style={[
                              dynamicStyles.eventActions,
                              isRTL && dynamicStyles.eventActionsRTL,
                            ]}
                          >
                            <TouchableOpacity
                              style={dynamicStyles.eventActionButton}
                              onPress={() => {
                                setSelectedEvent({
                                  ...event,
                                  date: selectedDay.date,
                                });
                                handleEditEvent();
                              }}
                              activeOpacity={0.8}
                            >
                              <Edit size={16} color="#3B82F6" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={dynamicStyles.eventActionButton}
                              onPress={() =>
                                handleViewEvent(event, selectedDay)
                              }
                              activeOpacity={0.8}
                            >
                              <Eye size={16} color={colors.success} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={dynamicStyles.deleteEventButton}
                              onPress={() =>
                                handleDeleteEvent(event.id, selectedDay.date)
                              }
                              disabled={isDeletingEvent}
                              activeOpacity={0.8}
                            >
                              {isDeletingEvent ? (
                                <ActivityIndicator
                                  size="small"
                                  color={colors.error}
                                />
                              ) : (
                                <Ionicons
                                  name="trash"
                                  size={16}
                                  color={colors.error}
                                />
                              )}
                            </TouchableOpacity>
                          </View>
                        </LinearGradient>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[dynamicStyles.modalButton, dynamicStyles.addEventButton]}
                    onPress={() => {
                      setSelectedDay(null);
                      handleAddEvent(selectedDay.date);
                    }}
                  >
                    <Text style={dynamicStyles.addEventButtonText}>
                      {t("calendar.events.addEvent")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        ) : (
          <View style={dynamicStyles.section}>
            <View style={dynamicStyles.selectDayContainer}>
              <CalendarIcon size={48} color={colors.muted} />
              <Text style={dynamicStyles.selectDayText}>
                {t("calendar.selectDay")}
              </Text>
            </View>
          </View>
        )}

        {/* Event Details Modal */}
        <Modal
          visible={showEventDetailsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEventDetailsModal(false)}
        >
          <View style={[dynamicStyles.modalOverlay, { backgroundColor: colors.backdrop }]}>
            <View style={[dynamicStyles.modalContent, { backgroundColor: colors.card }]}>
              <View style={dynamicStyles.eventDetailsHeader}>
                <Text style={[dynamicStyles.modalTitle, { color: colors.text }]}>
                  {t("history.event_details")}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowEventDetailsModal(false)}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {selectedEvent && (
                <ScrollView>
                  <View style={[dynamicStyles.eventDetailCard, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[dynamicStyles.eventDetailTitle, { color: colors.text }]}>
                      {selectedEvent.title}
                    </Text>
                    <Text style={[dynamicStyles.eventDetailType, { color: colors.textSecondary }]}>
                      {t("history.type")}: {selectedEvent.type}
                    </Text>
                    {selectedEvent.description && (
                      <Text style={[dynamicStyles.eventDetailDescription, { color: colors.textSecondary }]}>
                        {selectedEvent.description}
                      </Text>
                    )}
                    <Text style={[dynamicStyles.eventDetailDate, { color: colors.textSecondary }]}>
                      {t("history.date")}:{" "}
                      {new Date(selectedEvent.date).toLocaleDateString()}
                    </Text>
                    <Text style={[dynamicStyles.eventDetailCreated, { color: colors.textTertiary }]}>
                      {t("history.created")}:{" "}
                      {new Date(selectedEvent.created_at).toLocaleString()}
                    </Text>
                  </View>

                  <View style={dynamicStyles.eventDetailActions}>
                    <TouchableOpacity
                      style={[dynamicStyles.modalButton, dynamicStyles.editButton]}
                      onPress={handleEditEvent}
                    >
                      <Edit size={16} color="#fff" />
                      <Text style={dynamicStyles.editButtonText}>
                        {t("common.edit")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[dynamicStyles.modalButton, dynamicStyles.deleteButton]}
                      onPress={() =>
                        handleDeleteEvent(selectedEvent.id, selectedEvent.date)
                      }
                      disabled={isDeletingEvent}
                    >
                      {isDeletingEvent ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <>
                          <Ionicons name="trash" size={16} color="#fff" />
                          <Text style={dynamicStyles.deleteButtonText}>
                            {t("common.delete")}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Add/Edit Event Modal */}
        <Modal
          visible={showEventModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEventModal(false)}
        >
          <View style={[dynamicStyles.modalOverlay, { backgroundColor: colors.backdrop }]}>
            <View style={[dynamicStyles.modalContent, { backgroundColor: colors.card }]}>
              <ScrollView>
                <Text style={[dynamicStyles.modalTitle, { color: colors.text }]}>
                  {isEditingEvent
                    ? t("calendar.events.editEvent")
                    : t("calendar.events.addEventTitle")}
                </Text>

                <TextInput
                  style={[dynamicStyles.eventInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder={t("calendar.events.eventTitle")}
                  placeholderTextColor={colors.textTertiary}
                  value={eventTitle}
                  onChangeText={setEventTitle}
                  autoFocus={!isEditingEvent}
                />

                <TextInput
                  style={[dynamicStyles.eventInput, dynamicStyles.eventDescriptionInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder={t("calendar.events.eventDescription")}
                  placeholderTextColor={colors.textTertiary}
                  value={eventDescription}
                  onChangeText={setEventDescription}
                  multiline
                  numberOfLines={3}
                />

                <View style={dynamicStyles.eventTypeContainer}>
                  <Text style={[dynamicStyles.eventTypeLabel, { color: colors.text }]}>
                    {t("calendar.events.eventType")}
                  </Text>
                  <View style={dynamicStyles.eventTypeButtons}>
                    {[
                      {
                        key: "general",
                        label: t("calendar.events.eventTypes.general"),
                        icon: "calendar",
                      },
                      {
                        key: "workout",
                        label: t("calendar.events.eventTypes.workout"),
                        icon: "fitness",
                      },
                      {
                        key: "social",
                        label: t("calendar.events.eventTypes.social"),
                        icon: "people",
                      },
                      {
                        key: "health",
                        label: t("calendar.events.eventTypes.health"),
                        icon: "medical",
                      },
                      {
                        key: "travel",
                        label: t("calendar.events.eventTypes.travel"),
                        icon: "airplane",
                      },
                      {
                        key: "work",
                        label: t("calendar.events.eventTypes.work"),
                        icon: "briefcase",
                      },
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          dynamicStyles.eventTypeButton,
                          eventType === type.key &&
                            dynamicStyles.eventTypeButtonActive,
                        ]}
                        onPress={() => setEventType(type.key)}
                      >
                        <Ionicons
                          name={type.icon as any}
                          size={16}
                          color={eventType === type.key ? "#fff" : colors.primary}
                        />
                        <Text
                          style={[
                            dynamicStyles.eventTypeButtonText,
                            eventType === type.key &&
                              dynamicStyles.eventTypeButtonTextActive,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[dynamicStyles.modalButton, dynamicStyles.cancelButton]}
                    onPress={() => {
                      setShowEventModal(false);
                      setIsEditingEvent(false);
                    }}
                    disabled={isAddingEvent}
                  >
                    <Text style={dynamicStyles.cancelButtonText}>
                      {t("calendar.events.cancel")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[dynamicStyles.modalButton, dynamicStyles.submitButton]}
                    onPress={submitEvent}
                    disabled={!eventTitle.trim() || isAddingEvent}
                  >
                    {isAddingEvent ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={dynamicStyles.submitButtonText}>
                        {isEditingEvent
                          ? t("common.save")
                          : t("calendar.events.submit")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Badges Modal */}
        <Modal
          visible={showBadgesModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowBadgesModal(false)}
        >
          <View style={[dynamicStyles.modalOverlay, { backgroundColor: colors.backdrop }]}>
            <View style={[dynamicStyles.modalContent, { backgroundColor: colors.card }]}>
              <View style={dynamicStyles.badgesHeader}>
                <Text style={[dynamicStyles.modalTitle, { color: colors.text }]}>
                  🏆 {t("achievements.title")}
                </Text>
                <TouchableOpacity onPress={() => setShowBadgesModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={dynamicStyles.badgesScrollView}>
                {statistics?.gamificationBadges?.map((badge) => (
                  <View key={badge.id} style={[dynamicStyles.badgeDetailItem, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={dynamicStyles.badgeDetailIcon}>{badge.icon}</Text>
                    <View style={dynamicStyles.badgeDetailContent}>
                      <Text style={[dynamicStyles.badgeDetailName, { color: colors.text }]}>{badge.name}</Text>
                      <Text style={[dynamicStyles.badgeDetailDescription, { color: colors.textSecondary }]}>
                        {badge.description}
                      </Text>
                      <Text style={[dynamicStyles.badgeDetailDate, { color: colors.textTertiary }]}>
                        {t("achievements.unlockedOn")}:{" "}
                        {new Date(badge.achieved_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                )) || (
                  <View style={dynamicStyles.noBadgesContainer}>
                    <Text style={[dynamicStyles.noBadgesText, { color: colors.textSecondary }]}>
                      {t("calendar.badges.noBadgesYet")}
                    </Text>
                    <Text style={[dynamicStyles.noBadgesSubtext, { color: colors.textTertiary }]}>
                      {t("calendar.badges.keepWorking")}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Weekly Insights Modal */}
        <Modal
          visible={showInsightsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowInsightsModal(false)}
        >
          <View style={[dynamicStyles.modalOverlay, { backgroundColor: colors.backdrop }]}>
            <View style={[dynamicStyles.modalContent, { backgroundColor: colors.card }]}>
              <View style={dynamicStyles.insightsHeader}>
                <Text style={[dynamicStyles.modalTitle, { color: colors.text }]}>
                  📊 {t("calendar.insights.title")}
                </Text>
                <TouchableOpacity onPress={() => setShowInsightsModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={dynamicStyles.insightsScrollView}>
                {statistics?.weeklyInsights?.bestWeekDetails && (
                  <View style={[dynamicStyles.insightCard, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[dynamicStyles.insightCardTitle, { color: colors.text }]}>
                      🎯 {t("calendar.insights.bestWeek")}
                    </Text>
                    <Text style={[dynamicStyles.insightCardSubtitle, { color: colors.textSecondary }]}>
                      {statistics.weeklyInsights.bestWeekDetails.weekStart}{" "}
                      {t("common.to")}{" "}
                      {statistics.weeklyInsights.bestWeekDetails.weekEnd}
                    </Text>
                    <Text style={[dynamicStyles.insightCardValue, { color: colors.primary }]}>
                      {Math.round(
                        statistics.weeklyInsights.bestWeekDetails
                          .averageProgress
                      )}
                      % {t("calendar.insights.averageProgress")}
                    </Text>
                    <View style={dynamicStyles.insightHighlights}>
                      {statistics.weeklyInsights.bestWeekDetails.highlights.map(
                        (highlight, index) => (
                          <Text key={index} style={[dynamicStyles.insightHighlight, { color: colors.success }]}>
                            ✅ {highlight}
                          </Text>
                        )
                      )}
                    </View>
                  </View>
                )}

                {statistics?.weeklyInsights?.challengingWeekDetails && (
                  <View style={[dynamicStyles.insightCard, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[dynamicStyles.insightCardTitle, { color: colors.text }]}>
                      💪 {t("calendar.insights.challengingWeek")}
                    </Text>
                    <Text style={[dynamicStyles.insightCardSubtitle, { color: colors.textSecondary }]}>
                      {
                        statistics.weeklyInsights.challengingWeekDetails
                          .weekStart
                      }{" "}
                      {t("common.to")}{" "}
                      {statistics.weeklyInsights.challengingWeekDetails.weekEnd}
                    </Text>
                    <Text style={[dynamicStyles.insightCardValue, { color: colors.primary }]}>
                      {Math.round(
                        statistics.weeklyInsights.challengingWeekDetails
                          .averageProgress
                      )}
                      % {t("calendar.insights.averageProgress")}
                    </Text>
                    <View style={dynamicStyles.insightChallenges}>
                      {statistics.weeklyInsights.challengingWeekDetails.challenges.map(
                        (challenge, index) => (
                          <Text key={index} style={[dynamicStyles.insightChallenge, { color: colors.warning }]}>
                            🔍 {challenge}
                          </Text>
                        )
                      )}
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

// Create dynamic styles function that uses theme colors
const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statisticsSection: {
    marginBottom: 24,
    alignItems: "center",
  },
  statisticsSectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 20,
    letterSpacing: 0.3,
    color: colors.text,
  },
  gamificationContainer: {
    borderRadius: 20,
    overflow: "hidden",
  },
  statsGradient: {
    backgroundColor: `${colors.primary}15`,
    padding: 16,
    borderRadius: 16,
  },
  gamificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  gamificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  badgeItem: {
    alignItems: "center",
    marginRight: 20,
    minWidth: 60,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  badgeIconText: {
    fontSize: 20,
  },
  badgeName: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 40,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  dayDetailsContainer: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  metricCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectDayContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  selectDayText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: "center",
  },
  eventsSection: {
    marginTop: 20,
  },
  eventsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  eventsSectionHeaderRTL: {
    flexDirection: "row-reverse",
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  textRTL: {
    textAlign: "right",
  },
  eventItem: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    backgroundColor: "transparent",
  },
  eventMainContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    flex: 1,
  },
  eventMainContentRTL: {
    flexDirection: "row-reverse",
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  eventTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  eventTextContainerRTL: {
    marginLeft: 0,
    marginRight: 12,
    alignItems: "flex-end",
  },
  eventText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  eventTypeText: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: "capitalize",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  eventTimeText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  eventNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  eventActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  eventActionsRTL: {
    flexDirection: "row-reverse",
  },
  eventActionButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteEventButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: `${colors.error}15`,
    borderWidth: 1,
    borderColor: `${colors.error}20`,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.card,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: colors.text,
  },
  eventDetailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  eventDetailCard: {
    backgroundColor: colors.surfaceVariant,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  eventDetailTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 10,
  },
  eventDetailType: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
    textTransform: "capitalize",
  },
  eventDetailDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
    fontStyle: "italic",
  },
  eventDetailDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  eventDetailCreated: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  eventDetailActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
    flexDirection: "row",
    justifyContent: "center",
  },
  addEventButton: {
    backgroundColor: colors.primary,
  },
  addEventButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  editButton: {
    backgroundColor: "#3498DB",
  },
  editButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 5,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 5,
  },
  cancelButton: {
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  eventInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  eventDescriptionInput: {
    height: 80,
    textAlignVertical: "top",
  },
  eventTypeContainer: {
    marginBottom: 20,
  },
  eventTypeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 10,
  },
  eventTypeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  eventTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.surface,
    minWidth: 100,
  },
  eventTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  eventTypeButtonText: {
    marginLeft: 5,
    fontSize: 12,
    color: colors.primary,
  },
  eventTypeButtonTextActive: {
    color: "white",
  },
  badgesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  badgesScrollView: {
    maxHeight: 400,
  },
  badgeDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    marginBottom: 10,
  },
  badgeDetailIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  badgeDetailContent: {
    flex: 1,
  },
  badgeDetailName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 5,
  },
  badgeDetailDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  badgeDetailDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  noBadgesContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noBadgesText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  noBadgesSubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: "center",
  },
  insightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  insightsScrollView: {
    maxHeight: 400,
  },
  insightCard: {
    backgroundColor: colors.surfaceVariant,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  insightCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 5,
  },
  insightCardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  insightCardValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 10,
  },
  insightHighlights: {
    marginTop: 10,
  },
  insightHighlight: {
    fontSize: 14,
    color: colors.success,
    marginBottom: 5,
  },
  insightChallenges: {
    marginTop: 10,
  },
  insightChallenge: {
    fontSize: 14,
    color: colors.warning,
    marginBottom: 5,
  },
});

// Static styles that don't need theme colors
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  enhancedCalendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 20,
  },
  enhancedNavButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  sleekMonthContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sleekMonthText: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sleekYearText: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.6,
  },
  sleekNavButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sleekCalendarSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sleekCalendarContainer: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  sleekWeekDaysContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  sleekDayHeader: {
    width: (width - 72) / 7,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  sleekDayHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sleekDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  emptyDayCell: {
    width: (width - 72) / 7,
    height: 52,
    marginBottom: 4,
  },
  dayCellWrapper: {
    width: (width - 72) / 7,
    height: 52,
    marginBottom: 4,
  },
  sleekDayCell: {
    flex: 1,
    margin: 2,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  todayCell: {
    backgroundColor: "#E8F8F5",
  },
  sleekDayNumber: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  sleekProgressContainer: {
    width: "70%",
    height: 3,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  sleekProgressBg: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 1.5,
  },
  sleekProgressFill: {
    height: "100%",
    borderRadius: 1.5,
  },
  sleekEventDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  sleekLegendSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sleekLegendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  sleekLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sleekLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sleekLegendText: {
    fontSize: 11,
    fontWeight: "500",
  },
  dayDetailsGradient: {
    padding: 24,
  },
  dayDetailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  dayDetailsDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayDetailsDateCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  dayDetailsDateText: {
    fontSize: 24,
    fontWeight: "800",
  },
  dayDetailsHeaderText: {
    gap: 2,
  },
  dayDetailsMonthText: {
    fontSize: 16,
    fontWeight: "600",
  },
  dayDetailsYearText: {
    fontSize: 12,
  },
  dayDetailsStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dayDetailsStatusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dayDetailsMetrics: {
    gap: 12,
  },
  metricCardLarge: {
    padding: 0,
    overflow: "hidden",
    borderWidth: 0,
  },
  metricGradient: {
    padding: 20,
    borderRadius: 16,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  metricIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  metricTitleWhite: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  metricValueWhite: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  metricUnitWhite: {
    fontSize: 16,
    fontWeight: "600",
  },
  metricTarget: {
    fontSize: 13,
    marginBottom: 8,
  },
  metricPercentage: {
    fontSize: 12,
    fontWeight: "600",
  },
  metricProgressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  metricProgressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  deviationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deviationValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  eventGradient: {
    borderRadius: 16,
    overflow: "hidden",
  },
  eventIconGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
