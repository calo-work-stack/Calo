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
      const parts = dayData.date.split('-');
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

      return { progress: prog, hasEvents: events, hasData: data, statusColors: colors };
    }, [dayData.calories_actual, dayData.calories_goal, dayData.events.length, isDark]);

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
  const t = {
    title: language === "he" ? "לוח יעדים" : "Goal Calendar",
    subtitle:
      language === "he"
        ? "עקוב אחרי ההתקדמות היומית שלך"
        : "Track your daily progress",
    monthlyStats:
      language === "he" ? "סטטיסטיקות חודשיות" : "Monthly Statistics",
    successfulDays: language === "he" ? "ימים מוצלחים" : "Successful Days",
    averageCompletion: language === "he" ? "ממוצע השלמה" : "Average Completion",
    bestStreak: language === "he" ? "רצף הטוב ביותר" : "Best Streak",
    currentStreak: language === "he" ? "רצף נוכחי" : "Current Streak",
    dayDetails: language === "he" ? "פרטי היום" : "Day Details",
    caloriesGoal: language === "he" ? "יעד קלוריות" : "Calorie Goal",
    proteinGoal: language === "he" ? "יעד חלבון" : "Protein Goal",
    waterGoal: language === "he" ? "יעד מים" : "Water Goal",
    consumed: language === "he" ? "נצרך" : "Consumed",
    goal: language === "he" ? "יעד" : "Goal",
    deviation: language === "he" ? "סטייה" : "Deviation",
    over: language === "he" ? "עודף" : "Over",
    under: language === "he" ? "חסר" : "Under",
    goalMet: language === "he" ? "יעד הושג!" : "Goal Achieved!",
    goalNotMet: language === "he" ? "יעד לא הושג" : "Goal Not Met",
    days: language === "he" ? "ימים" : "days",
    kcal: language === "he" ? 'קק"ל' : "kcal",
    g: language === "he" ? "גר׳" : "g",
    ml: language === "he" ? 'מ"ל' : "ml",
    today: language === "he" ? "היום" : "Today",
    selectDay:
      language === "he"
        ? "בחר יום לצפייה בפרטים"
        : "Select a day to view details",
    excellent: language === "he" ? "מעולה!" : "Excellent!",
    good: language === "he" ? "טוב!" : "Good!",
    needsImprovement: language === "he" ? "צריך שיפור" : "Needs Improvement",
    monthNames:
      language === "he"
        ? [
            "ינואר",
            "פברואר",
            "מרץ",
            "אפריל",
            "מאי",
            "יוני",
            "יולי",
            "אוגוסט",
            "ספטמבר",
            "אוקטובר",
            "נובמבר",
            "דצמבר",
          ]
        : [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ],
    dayNames:
      language === "he"
        ? ["א", "ב", "ג", "ד", "ה", "ו", "ש"]
        : ["S", "M", "T", "W", "T", "F", "S"],
    eventDetails: language === "he" ? "פרטי האירוע" : "Event Details",
    editEvent: language === "he" ? "ערוך אירוע" : "Edit Event",
    viewEvent: language === "he" ? "צפה באירוע" : "View Event",
    deleteEvent: language === "he" ? "מחק אירוע" : "Delete Event",
    addEvent: language === "he" ? "הוסף אירוע" : "Add Event",
    cancel: language === "he" ? "ביטול" : "Cancel",
    save: language === "he" ? "שמור" : "Save",
    edit: language === "he" ? "ערוך" : "Edit",
    delete: language === "he" ? "מחק" : "Delete",
    recentAchievements: language === "he" ? "הישגים אחרונים" : "Recent Achievements",
    seeAll: language === "he" ? "צפה בהכל" : "See All",
    yourAchievements: language === "he" ? "ההישגים שלך" : "Your Achievements",
    weeklyInsights: language === "he" ? "תובנות שבועיות" : "Weekly Insights",
    noDataYet: language === "he" ? "אין נתונים עדיין" : "No Data Yet",
    startTracking: language === "he" ? "התחל לעקוב אחר הארוחות שלך" : "Start tracking your meals",
    noData: language === "he" ? "אין נתונים" : "No Data",
    events: language === "he" ? "אירועים" : "Events",
    meals: language === "he" ? "ארוחות" : "Meals",
    dailyGoal: language === "he" ? "יעד יומי" : "Daily Goal",
    eventTitle: language === "he" ? "כותרת האירוע (למשל: חתונה, אימון כבד, יום צום)" : "Event title (e.g., Wedding, Heavy workout, Fasting day)",
    eventDescription: language === "he" ? "תיאור (אופציונלי)" : "Description (optional)",
    eventType: language === "he" ? "סוג האירוע:" : "Event Type:",
    eventTypes: {
      general: language === "he" ? "כללי" : "General",
      workout: language === "he" ? "אימון" : "Workout",
      social: language === "he" ? "חברתי" : "Social",
      health: language === "he" ? "בריאות" : "Health",
      travel: language === "he" ? "נסיעות" : "Travel",
      work: language === "he" ? "עבודה" : "Work",
    },
    success: language === "he" ? "הצלחה" : "Success",
    error: language === "he" ? "שגיאה" : "Error",
    eventAddedSuccess: language === "he" ? "האירוע נוסף בהצלחה!" : "Event added successfully!",
    eventUpdatedSuccess: language === "he" ? "האירוע עודכן בהצלחה!" : "Event updated successfully!",
    eventDeletedSuccess: language === "he" ? "האירוע נמחק בהצלחה!" : "Event deleted successfully!",
    failedToAddEvent: language === "he" ? "נכשל בהוספת האירוע" : "Failed to add event",
    failedToUpdateEvent: language === "he" ? "נכשל בעדכון האירוע" : "Failed to update event",
    failedToDeleteEvent: language === "he" ? "נכשל במחיקת האירוע" : "Failed to delete event",
    deleteEventConfirm: language === "he" ? "האם אתה בטוח שברצונך למחוק את האירוע הזה?" : "Are you sure you want to delete this event?",
    enterEventTitle: language === "he" ? "אנא הכנס כותרת לאירוע" : "Please enter an event title",
    type: language === "he" ? "סוג" : "Type",
    date: language === "he" ? "תאריך" : "Date",
    created: language === "he" ? "נוצר" : "Created",
    noBadgesYet: language === "he" ? "עדיין אין הישגים" : "No badges earned yet",
    keepWorking: language === "he" ? "המשך לעבוד לקראת המטרות שלך כדי לזכות בהישגים!" : "Keep working towards your goals to earn achievements!",
    achieved: language === "he" ? "הושג" : "Achieved",
    mostChallengingWeek: language === "he" ? "השבוע המאתגר ביותר" : "Most Challenging Week",
    averageProgress: language === "he" ? "התקדמות ממוצעת" : "average progress",
    loadingCalendar: language === "he" ? "טוען לוח שנה..." : "Loading Calendar...",
    retry: language === "he" ? "נסה שוב" : "Retry",
    dismiss: language === "he" ? "סגור" : "Dismiss",
    calendarError: language === "he" ? "שגיאה בלוח השנה" : "Calendar Error",
    menuCompleted: language === "he" ? "התפריט הושלם" : "Menu Completed",
    generatingSummary: language === "he" ? "מייצר דוח סיכום..." : "Generating summary report...",
  };
  console.log(user);

  useEffect(() => {
    console.log("🔄 [Calendar] Date changed, loading data...");
    loadCalendarData();
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  useEffect(() => {
    if (error) {
      console.error("❌ [Calendar] Error detected:", error);
      Alert.alert("Calendar Error", error, [
        {
          text: "Retry",
          onPress: () => {
            dispatch(clearError());
            loadCalendarData();
          },
        },
        {
          text: "Dismiss",
          style: "cancel",
          onPress: () => dispatch(clearError()),
        },
      ]);
    }
  }, [error, dispatch]);

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
    return Math.min((actual / goal) * 100, 150); // Cap at 150% for display
  };

  const getDayColor = (dayData: DayData) => {
    const caloriesProgress = getProgressPercentage(
      dayData.calories_actual,
      dayData.calories_goal
    );

    if (caloriesProgress >= 110) return colors.error; // Error color for overeating
    if (caloriesProgress >= 100) return colors.success; // Success color for goal achieved
    if (caloriesProgress >= 70) return colors.warning; // Warning color for close to goal
    return colors.destructive; // Destructive color for not achieved
  };

  const getProgressLabel = (dayData: DayData) => {
    const caloriesProgress = getProgressPercentage(
      dayData.calories_actual,
      dayData.calories_goal
    );

    if (caloriesProgress >= 110) return "Overeating";
    if (caloriesProgress >= 100) return t.goalMet;
    if (caloriesProgress >= 70) return "Close to Goal";
    return t.goalNotMet;
  };

  const getDayStatus = (dayData: DayData) => {
    const caloriesProgress = getProgressPercentage(
      dayData.calories_actual,
      dayData.calories_goal
    );

    if (caloriesProgress >= 100) return t.excellent;
    if (caloriesProgress >= 80) return t.good;
    return t.needsImprovement;
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

  const months = t.monthNames;

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
      Alert.alert("Error", "Please enter an event title");
      return;
    }

    try {
      if (isEditingEvent && selectedEvent) {
        // Delete the old event and create a new one (simulating edit)
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
        "Success",
        isEditingEvent
          ? "Event updated successfully!"
          : "Event added successfully!"
      );
    } catch (error) {
      Alert.alert(
        "Error",
        isEditingEvent ? "Failed to update event" : "Failed to add event"
      );
    }
  };

  const handleDeleteEvent = async (eventId: string, date: string) => {
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: t.cancel, style: "cancel" },
      {
        text: t.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await dispatch(deleteEvent({ eventId, date })).unwrap();
            setShowEventDetailsModal(false);
            Alert.alert("Success", "Event deleted successfully!");
          } catch (error) {
            Alert.alert("Error", "Failed to delete event");
          }
        },
      },
    ]);
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

    // Calculate streaks
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

  // Menu Logic Functions
  const calculateMenuProgress = () => {
    if (!menuStartDate || menuDuration === 0) {
      setMenuProgress(0);
      setIsMenuComplete(false);
      return;
    }

    const today = new Date();
    const startDate = new Date(menuStartDate);
    startDate.setHours(0, 0, 0, 0); // Normalize start date

    // Adjust start date if it's after 14:00 (2 PM)
    if (menuStartDate.getHours() >= 14) {
      startDate.setDate(startDate.getDate() + 1);
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + menuDuration - 1);
    endDate.setHours(23, 59, 59, 999); // End of the last day

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
    setIsMenuComplete(false); // Reset if not yet completed
  };

  const handleStartMenu = (date: Date, duration: number) => {
    setMenuStartDate(date);
    setMenuDuration(duration);
    // Optionally, reset menu progress or load existing menu data
  };

  const handleCompleteMenu = () => {
    // Logic to generate summary report, send notification, etc.
    setIsMenuComplete(true);
    Alert.alert("Menu Completed", "Generating summary report...");
    // In a real app, you would dispatch an action to save the report and send notifications
  };

  // Effect to recalculate menu progress when date changes or menu details are set
  useEffect(() => {
    if (menuStartDate || menuDuration > 0) {
      calculateMenuProgress();
    }
  }, [menuStartDate, menuDuration]); // Only recalculate when menu details change

  // Stable callbacks for day cell
  const handleDayCellPress = useCallback((dayData: DayData) => {
    handleDayPress(dayData);
  }, [handleDayPress]);

  const handleDayCellLongPress = useCallback((date: string) => {
    handleAddEvent(date);
  }, [handleAddEvent]);

  // Memoize the selected day date string to avoid reference changes
  const selectedDayDate = useMemo(() => selectedDay?.date || null, [selectedDay?.date]);

  // Today's date string - computed once per render
  const todayString = useMemo(() => new Date().toDateString(), []);

  const renderDay = useCallback((dayData: DayData | null, index: number) => {
    if (!dayData) {
      return <View key={`empty-${index}`} style={styles.emptyDayCell} />;
    }

    const isToday = todayString === new Date(dayData.date).toDateString();
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
  }, [selectedDayDate, todayString, handleDayCellPress, handleDayCellLongPress, colors.primary, isDark]);

  const renderWeekDays = () => {
    return (
      <View style={[
        styles.sleekWeekDaysContainer,
        { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }
      ]}>
        {t.dayNames.map((day, index) => (
          <View key={index} style={styles.sleekDayHeader}>
            <Text style={[
              styles.sleekDayHeaderText,
              { color: isDark ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }
            ]}>
              {day}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderGamificationSection = () => {
    // Only show if there are real badges from the backend
    if (!statistics || !statistics.gamificationBadges?.length) return null;

    return (
      <View style={styles.section}>
        <View style={styles.gamificationContainer}>
          <View style={styles.statsGradient}>
            <View style={styles.gamificationHeader}>
              <Text style={styles.gamificationTitle}>
                🏆 Recent Achievements
              </Text>
              <TouchableOpacity onPress={() => setShowBadgesModal(true)}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {statistics.gamificationBadges.slice(0, 5).map((badge) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <View style={styles.badgeIcon}>
                    <Text style={styles.badgeIconText}>{badge.icon}</Text>
                  </View>
                  <Text style={styles.badgeName}>{badge.name}</Text>
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
      <View style={styles.statisticsSection}>
        <Text
          style={[
            styles.statisticsSectionTitle,
            { color: colors.text },
          ]}
        >
          {t.monthlyStats}
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
    return (
      <LoadingScreen text={isRTL ? "טוען לוח שנה" : "Loading Calendar..."} />
    );
  }

  const hasNoData =
    Object.keys(calendarData).length === 0 && !isLoading && !isLoadingCalendar;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Modern Gradient Header */}
        <LinearGradient
          colors={["#10B981", "#059669", "#047857"]}
          style={styles.modernHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerIconContainer}>
              <CalendarIcon size={32} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: "#FFFFFF" }]}>
                {t.title}
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: "rgba(255, 255, 255, 0.9)" },
                ]}
              >
                {t.subtitle}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Enhanced Statistics Carousel */}
        {renderEnhancedStatistics()}

        {/* Gamification Section */}
        {renderGamificationSection()}

        {/* Enhanced Calendar Navigation */}
        <View style={[
          styles.enhancedCalendarHeader,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF' }
        ]}>
          <TouchableOpacity
            style={[
              styles.enhancedNavButton,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.1)' }
            ]}
            onPress={() => navigateMonth(-1)}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.sleekMonthContainer}>
            <Text style={[styles.sleekMonthText, { color: colors.text }]}>
              {t.monthNames[currentDate.getMonth()]}
            </Text>
            <Text style={[styles.sleekYearText, { color: isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }]}>
              {currentDate.getFullYear()}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.sleekNavButton}
            onPress={() => navigateMonth(1)}
            activeOpacity={0.7}
          >
            <ChevronRight size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </TouchableOpacity>
        </View>

        {/* Sleek Calendar Grid */}
        <View style={styles.sleekCalendarSection}>
          <View
            style={[
              styles.sleekCalendarContainer,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
              }
            ]}
          >
            {renderWeekDays()}
            <View style={styles.sleekDaysGrid}>
              {daysInMonth.map((dayData, index) => renderDay(dayData, index))}
            </View>
          </View>

          {/* Empty State for No Data */}
          {hasNoData && (
            <View style={styles.emptyStateContainer}>
              <CalendarIcon size={48} color={isDark ? '#4B5563' : '#D1D5DB'} />
              <Text style={[styles.emptyStateTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {t.noDataYet}
              </Text>
              <Text style={[styles.emptyStateText, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                {t.startTracking}
              </Text>
            </View>
          )}
        </View>

        {/* Sleek Legend */}
        <View style={styles.sleekLegendSection}>
          <View style={styles.sleekLegendContainer}>
            <View style={styles.sleekLegendItem}>
              <View style={[styles.sleekLegendDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.sleekLegendText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {t.goalMet}
              </Text>
            </View>
            <View style={styles.sleekLegendItem}>
              <View style={[styles.sleekLegendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.sleekLegendText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                70-99%
              </Text>
            </View>
            <View style={styles.sleekLegendItem}>
              <View style={[styles.sleekLegendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.sleekLegendText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {"<70%"}
              </Text>
            </View>
            <View style={styles.sleekLegendItem}>
              <View style={[styles.sleekLegendDot, { backgroundColor: isDark ? '#4B5563' : '#D1D5DB' }]} />
              <Text style={[styles.sleekLegendText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {language === 'he' ? 'אין נתונים' : 'No Data'}
              </Text>
            </View>
          </View>
        </View>

        {/* Day Details */}
        {selectedDay ? (
          <View style={styles.section}>
            <View style={styles.dayDetailsContainer}>
              <LinearGradient
                colors={["#FFFFFF", "#F8F9FA"]}
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
                      <Text style={styles.dayDetailsMonthText}>
                        {t.monthNames[new Date(selectedDay.date).getMonth()]}
                      </Text>
                      <Text style={styles.dayDetailsYearText}>
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
                      <CheckCircle size={20} color="#10B981" />
                    ) : (
                      <XCircle size={20} color="#EF4444" />
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
                  <View style={[styles.metricCard, styles.metricCardLarge]}>
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      style={styles.metricGradient}
                    >
                      <View style={styles.metricIconContainer}>
                        <Target size={24} color="#FFFFFF" />
                      </View>
                      <Text style={styles.metricTitleWhite}>
                        {t.dailyGoal}
                      </Text>
                      <Text style={styles.metricValueWhite}>
                        {selectedDay.calories_goal}{" "}
                        <Text style={styles.metricUnitWhite}>{t.kcal}</Text>
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
                  <View style={[styles.metricCard, styles.metricCardLarge]}>
                    <LinearGradient
                      colors={["#EF4444", "#DC2626"]}
                      style={styles.metricGradient}
                    >
                      <View style={styles.metricIconContainer}>
                        <Flame size={24} color="#FFFFFF" />
                      </View>
                      <Text style={styles.metricTitleWhite}>
                        {t.meals}
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
                  <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                      <View
                        style={[
                          styles.metricIconBadge,
                          { backgroundColor: "#FEF3C7" },
                        ]}
                      >
                        <Flame size={16} color="#F59E0B" />
                      </View>
                      <Text style={styles.metricTitle}>{t.caloriesGoal}</Text>
                    </View>
                    <Text style={styles.metricValue}>
                      {selectedDay.calories_actual}
                    </Text>
                    <Text style={styles.metricTarget}>
                      of {selectedDay.calories_goal} {t.kcal}
                    </Text>
                    <View style={styles.deviationContainer}>
                      {selectedDay.calories_actual >
                      selectedDay.calories_goal ? (
                        <TrendingUp size={12} color="#EF4444" />
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
                                ? "#EF4444"
                                : "#3B82F6",
                          },
                        ]}
                      >
                        {Math.abs(
                          selectedDay.calories_actual -
                            selectedDay.calories_goal
                        )}{" "}
                        {t.kcal}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                      <View
                        style={[
                          styles.metricIconBadge,
                          { backgroundColor: "#F3E8FF" },
                        ]}
                      >
                        <Target size={16} color="#8B5CF6" />
                      </View>
                      <Text style={styles.metricTitle}>{t.proteinGoal}</Text>
                    </View>
                    <Text style={styles.metricValue}>
                      {selectedDay.protein_actual}
                    </Text>
                    <Text style={styles.metricTarget}>
                      of {selectedDay.protein_goal} {t.g}
                    </Text>
                    <Text style={styles.metricPercentage}>
                      {Math.round(
                        (selectedDay.protein_actual /
                          selectedDay.protein_goal) *
                          100
                      )}
                      %
                    </Text>
                  </View>

                  <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                      <View
                        style={[
                          styles.metricIconBadge,
                          { backgroundColor: "#DBEAFE" },
                        ]}
                      >
                        <Target size={16} color="#3B82F6" />
                      </View>
                      <Text style={styles.metricTitle}>{t.waterGoal}</Text>
                    </View>
                    <Text style={styles.metricValue}>
                      {selectedDay.water_intake_ml}
                    </Text>
                    <Text style={styles.metricTarget}>{t.ml}</Text>
                  </View>
                </View>

                {selectedDay.events.length > 0 && (
                  <View style={styles.eventsSection}>
                    <View
                      style={[
                        styles.eventsSectionHeader,
                        isRTL && styles.eventsSectionHeaderRTL,
                      ]}
                    >
                      <Ionicons name="calendar" size={20} color="#16A085" />
                      <Text
                        style={[styles.eventsTitle, isRTL && styles.textRTL]}
                      >
                        {isRTL ? "אירועים" : "Events"}
                      </Text>
                    </View>
                    {selectedDay.events.map((event, index) => (
                      <View key={event.id} style={styles.eventItem}>
                        <LinearGradient
                          colors={[
                            "rgba(255, 255, 255, 0.95)",
                            "rgba(248, 250, 252, 0.95)",
                          ]}
                          style={styles.eventGradient}
                        >
                          <TouchableOpacity
                            style={[
                              styles.eventMainContent,
                              isRTL && styles.eventMainContentRTL,
                            ]}
                            onPress={() => handleViewEvent(event, selectedDay)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.eventIconContainer}>
                              <LinearGradient
                                colors={["#16A085", "#1ABC9C"]}
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
                                styles.eventTextContainer,
                                isRTL && styles.eventTextContainerRTL,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.eventText,
                                  isRTL && styles.textRTL,
                                ]}
                              >
                                {event.title}
                              </Text>
                              <Text
                                style={[
                                  styles.eventTypeText,
                                  isRTL && styles.textRTL,
                                ]}
                              >
                                {event.type}
                              </Text>
                              <Text
                                style={[
                                  styles.eventTimeText,
                                  isRTL && styles.textRTL,
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
                            <View style={styles.eventNumberBadge}>
                              <Text style={styles.eventNumberText}>
                                {index + 1}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          <View
                            style={[
                              styles.eventActions,
                              isRTL && styles.eventActionsRTL,
                            ]}
                          >
                            <TouchableOpacity
                              style={styles.eventActionButton}
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
                              style={styles.eventActionButton}
                              onPress={() =>
                                handleViewEvent(event, selectedDay)
                              }
                              activeOpacity={0.8}
                            >
                              <Eye size={16} color="#10B981" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteEventButton}
                              onPress={() =>
                                handleDeleteEvent(event.id, selectedDay.date)
                              }
                              disabled={isDeletingEvent}
                              activeOpacity={0.8}
                            >
                              {isDeletingEvent ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#EF4444"
                                />
                              ) : (
                                <Ionicons
                                  name="trash"
                                  size={16}
                                  color="#EF4444"
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
                    style={[styles.modalButton, styles.addEventButton]}
                    onPress={() => {
                      setSelectedDay(null);
                      handleAddEvent(selectedDay.date);
                    }}
                  >
                    <Text style={styles.addEventButtonText}>{t.addEvent}</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.selectDayContainer}>
              <CalendarIcon size={48} color="#BDC3C7" />
              <Text style={styles.selectDayText}>{t.selectDay}</Text>
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
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.eventDetailsHeader}>
                <Text style={styles.modalTitle}>{t.eventDetails}</Text>
                <TouchableOpacity
                  onPress={() => setShowEventDetailsModal(false)}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {selectedEvent && (
                <ScrollView>
                  <View style={styles.eventDetailCard}>
                    <Text style={styles.eventDetailTitle}>
                      {selectedEvent.title}
                    </Text>
                    <Text style={styles.eventDetailType}>
                      Type: {selectedEvent.type}
                    </Text>
                    {selectedEvent.description && (
                      <Text style={styles.eventDetailDescription}>
                        {selectedEvent.description}
                      </Text>
                    )}
                    <Text style={styles.eventDetailDate}>
                      Date: {new Date(selectedEvent.date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.eventDetailCreated}>
                      Created:{" "}
                      {new Date(selectedEvent.created_at).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.eventDetailActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.editButton]}
                      onPress={handleEditEvent}
                    >
                      <Edit size={16} color="#fff" />
                      <Text style={styles.editButtonText}>{t.edit}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.deleteButton]}
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
                          <Text style={styles.deleteButtonText}>
                            {t.delete}
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
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                <Text style={styles.modalTitle}>
                  {isEditingEvent ? t.editEvent : t.addEvent}
                </Text>

                <TextInput
                  style={styles.eventInput}
                  placeholder="Event title (e.g., Wedding, Heavy workout, Fasting day)"
                  value={eventTitle}
                  onChangeText={setEventTitle}
                  autoFocus={!isEditingEvent}
                />

                <TextInput
                  style={[styles.eventInput, styles.eventDescriptionInput]}
                  placeholder="Description (optional)"
                  value={eventDescription}
                  onChangeText={setEventDescription}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.eventTypeContainer}>
                  <Text style={styles.eventTypeLabel}>Event Type:</Text>
                  <View style={styles.eventTypeButtons}>
                    {[
                      { key: "general", label: "General", icon: "calendar" },
                      { key: "workout", label: "Workout", icon: "fitness" },
                      { key: "social", label: "Social", icon: "people" },
                      { key: "health", label: "Health", icon: "medical" },
                      { key: "travel", label: "Travel", icon: "airplane" },
                      { key: "work", label: "Work", icon: "briefcase" },
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          styles.eventTypeButton,
                          eventType === type.key &&
                            styles.eventTypeButtonActive,
                        ]}
                        onPress={() => setEventType(type.key)}
                      >
                        <Ionicons
                          name={type.icon as any}
                          size={16}
                          color={eventType === type.key ? "#fff" : "#16A085"}
                        />
                        <Text
                          style={[
                            styles.eventTypeButtonText,
                            eventType === type.key &&
                              styles.eventTypeButtonTextActive,
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
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowEventModal(false);
                      setIsEditingEvent(false);
                    }}
                    disabled={isAddingEvent}
                  >
                    <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={submitEvent}
                    disabled={!eventTitle.trim() || isAddingEvent}
                  >
                    {isAddingEvent ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {isEditingEvent ? t.save : t.addEvent}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Badges Modal - Only show if real badges exist */}
        <Modal
          visible={showBadgesModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowBadgesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.badgesHeader}>
                <Text style={styles.modalTitle}>🏆 Your Achievements</Text>
                <TouchableOpacity onPress={() => setShowBadgesModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.badgesScrollView}>
                {statistics?.gamificationBadges?.map((badge) => (
                  <View key={badge.id} style={styles.badgeDetailItem}>
                    <Text style={styles.badgeDetailIcon}>{badge.icon}</Text>
                    <View style={styles.badgeDetailContent}>
                      <Text style={styles.badgeDetailName}>{badge.name}</Text>
                      <Text style={styles.badgeDetailDescription}>
                        {badge.description}
                      </Text>
                      <Text style={styles.badgeDetailDate}>
                        Achieved:{" "}
                        {new Date(badge.achieved_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                )) || (
                  <View style={styles.noBadgesContainer}>
                    <Text style={styles.noBadgesText}>
                      No badges earned yet
                    </Text>
                    <Text style={styles.noBadgesSubtext}>
                      Keep working towards your goals to earn achievements!
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
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.insightsHeader}>
                <Text style={styles.modalTitle}>📊 Weekly Insights</Text>
                <TouchableOpacity onPress={() => setShowInsightsModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.insightsScrollView}>
                {statistics?.weeklyInsights?.bestWeekDetails && (
                  <View style={styles.insightCard}>
                    <Text style={styles.insightCardTitle}>🎯 Best Week</Text>
                    <Text style={styles.insightCardSubtitle}>
                      {statistics.weeklyInsights.bestWeekDetails.weekStart} to{" "}
                      {statistics.weeklyInsights.bestWeekDetails.weekEnd}
                    </Text>
                    <Text style={styles.insightCardValue}>
                      {Math.round(
                        statistics.weeklyInsights.bestWeekDetails
                          .averageProgress
                      )}
                      % average progress
                    </Text>
                    <View style={styles.insightHighlights}>
                      {statistics.weeklyInsights.bestWeekDetails.highlights.map(
                        (highlight, index) => (
                          <Text key={index} style={styles.insightHighlight}>
                            ✅ {highlight}
                          </Text>
                        )
                      )}
                    </View>
                  </View>
                )}

                {statistics?.weeklyInsights?.challengingWeekDetails && (
                  <View style={styles.insightCard}>
                    <Text style={styles.insightCardTitle}>
                      💪 Most Challenging Week
                    </Text>
                    <Text style={styles.insightCardSubtitle}>
                      {
                        statistics.weeklyInsights.challengingWeekDetails
                          .weekStart
                      }{" "}
                      to{" "}
                      {statistics.weeklyInsights.challengingWeekDetails.weekEnd}
                    </Text>
                    <Text style={styles.insightCardValue}>
                      {Math.round(
                        statistics.weeklyInsights.challengingWeekDetails
                          .averageProgress
                      )}
                      % average progress
                    </Text>
                    <View style={styles.insightChallenges}>
                      {statistics.weeklyInsights.challengingWeekDetails.challenges.map(
                        (challenge, index) => (
                          <Text key={index} style={styles.insightChallenge}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  subtitle: {
    fontSize: 16,
    color: "#7F8C8D",
    marginTop: 4,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  languageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 16,
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
  },
  statsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  statsGradient: {
    backgroundColor: "#16A08515",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
  gamificationContainer: {
    borderRadius: 20,
    overflow: "hidden",
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
    color: "#2C3E50",
  },
  seeAllText: {
    color: "#16A085",
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
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  badgeIconText: {
    fontSize: 20,
  },
  badgeName: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  monthContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  textRTL: {
    textAlign: "right",
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C3E50",
    marginLeft: 8,
  },
  calendarContainer: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  weekDaysContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  dayHeader: {
    width: (width - 72) / 7,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7F8C8D",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: (width - 72) / 7,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  emptyDay: {
    backgroundColor: "transparent",
  },
  dayButton: {
    borderRadius: 8,
  },
  todayCell: {
    backgroundColor: "#E8F8F5",
  },
  selectedCell: {
    backgroundColor: "#16A08520",
  },
  dayIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  progressContainer: {
    width: "80%",
    height: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 2,
    marginBottom: 2,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#16A085",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 8,
    color: "#666",
    fontWeight: "600",
  },
  eventIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  eventCount: {
    fontSize: 8,
    color: "#FFD700",
    marginLeft: 2,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: "#7F8C8D",
  },
  dayDetailsContainer: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
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
    color: "#1F2937",
  },
  dayDetailsYearText: {
    fontSize: 12,
    color: "#6B7280",
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
  metricCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
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
    color: "#6B7280",
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
    color: "#111827",
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
    color: "#9CA3AF",
    marginBottom: 8,
  },
  metricPercentage: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
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
  metricSubtext: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  selectDayContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  selectDayText: {
    fontSize: 16,
    color: "#7F8C8D",
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
    color: "#2C3E50",
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  eventGradient: {
    borderRadius: 16,
    overflow: "hidden",
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
  eventIconGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  eventTextContainerRTL: {
    marginLeft: 0,
    marginRight: 12,
    alignItems: "flex-end",
  },
  eventTimeText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  eventNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  eventNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  eventActionsRTL: {
    flexDirection: "row-reverse",
  },
  eventItem: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
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
  eventTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  eventText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: 4,
    lineHeight: 20,
  },
  eventTypeText: {
    fontSize: 13,
    color: "#718096",
    textTransform: "capitalize",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  eventActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
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
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
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
    color: "#333",
  },
  eventDetailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  eventDetailCard: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  eventDetailTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  eventDetailType: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    textTransform: "capitalize",
  },
  eventDetailDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    fontStyle: "italic",
  },
  eventDetailDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  eventDetailCreated: {
    fontSize: 12,
    color: "#999",
  },
  eventDetailActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  eventInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
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
    color: "#333",
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
    borderColor: "#16A085",
    borderRadius: 8,
    backgroundColor: "white",
    minWidth: 100,
  },
  eventTypeButtonActive: {
    backgroundColor: "#16A085",
  },
  eventTypeButtonText: {
    marginLeft: 5,
    fontSize: 12,
    color: "#16A085",
  },
  eventTypeButtonTextActive: {
    color: "white",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
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
    backgroundColor: "#16A085",
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
    backgroundColor: "#E74C3C",
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 5,
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#16A085",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
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
    backgroundColor: "#f8f9fa",
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
    color: "#333",
    marginBottom: 5,
  },
  badgeDetailDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  badgeDetailDate: {
    fontSize: 12,
    color: "#999",
  },
  noBadgesContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noBadgesText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  noBadgesSubtext: {
    fontSize: 14,
    color: "#999",
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
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  insightCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  insightCardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  insightCardValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#16A085",
    marginBottom: 10,
  },
  insightHighlights: {
    marginTop: 10,
  },
  insightHighlight: {
    fontSize: 14,
    color: "#4CAF50",
    marginBottom: 5,
  },
  insightChallenges: {
    marginTop: 10,
  },
  insightChallenge: {
    fontSize: 14,
    color: "#FF9800",
    marginBottom: 5,
  },
  insightsButton: {
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  insightsButtonText: {
    color: "#16A085",
    fontSize: 14,
    fontWeight: "600",
  },

  // RTL Support Styles
  headerRTL: {
    flexDirection: "row-reverse",
  },

  headerContentRTL: {
    alignItems: "flex-end",
  },

  // Empty State Styles
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 40,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4A5568",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },

  // Enhanced Day Cell Styles
  enhancedDayCell: {
    width: (width - 72) / 7,
    height: 72,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    borderRadius: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  enhancedDayIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  enhancedDayNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  progressRingContainer: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
  },
  progressRingBackground: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  progressRingFill: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  enhancedProgressText: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  enhancedEventBadge: {
    position: "absolute",
    top: 3,
    left: 3,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  enhancedEventCount: {
    fontSize: 8,
    fontWeight: "700",
    color: "#B8860B",
  },
  todayDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Enhanced Week Days Header
  enhancedWeekDaysContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  enhancedDayHeader: {
    width: (width - 72) / 7,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  enhancedDayHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Enhanced Calendar Header Styles
  enhancedCalendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  enhancedNavButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  enhancedMonthContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  monthIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  monthTextContainer: {
    alignItems: "flex-start",
  },
  enhancedMonthText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  enhancedYearText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },

  // Enhanced Calendar Container
  enhancedCalendarContainer: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  enhancedDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },

  // Enhanced Legend Styles
  enhancedLegendContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  enhancedLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  enhancedLegendColor: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  enhancedLegendText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Sleek Calendar Styles
  emptyDayCell: {
    width: (width - 72) / 7,
    height: 52,
    marginBottom: 4,
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
  sleekDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
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
});
