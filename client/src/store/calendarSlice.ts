import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { calendarAPI } from "../services/api";

interface DayData {
  date: string;
  calories_goal: number;
  calories_actual: number;
  protein_goal: number;
  protein_actual: number;
  carbs_goal: number;
  carbs_actual: number;
  fat_goal: number;
  fat_actual: number;
  meal_count: number;
  quality_score: number;
  water_intake_ml: number;
  events: Array<{
    id: string;
    title: string;
    type: string;
    created_at: string;
  }>;
}

interface CalendarStats {
  monthlyProgress: number;
  streakDays: number;
  bestWeek: string;
  challengingWeek: string;
  improvementPercent: number;
  totalGoalDays: number;
  averageCalories: number;
  averageProtein: number;
  averageWater: number;
  motivationalMessage: string;
  gamificationBadges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    achieved_at: string;
  }>;
  weeklyInsights: {
    bestWeekDetails: {
      weekStart: string;
      weekEnd: string;
      averageProgress: number;
      highlights: string[];
    };
    challengingWeekDetails: {
      weekStart: string;
      weekEnd: string;
      averageProgress: number;
      challenges: string[];
    };
  };
}

export interface GamificationData {
  level: number;
  currentXP: number;
  totalPoints: number;
  badges: Badge[];
  achievements: Achievement[];
  streaks: {
    current: number;
    best: number;
    daily: number;
    weekly: number;
  };
}

export interface StatisticsData {
  averageCarbs: number;
  averageFats: number;
  averageFiber: number;
  averageSugar: number;
  averageSodium: number;
  averageFluids: number;
  dailyBreakdown: any;
  achievements: any;
  successfulDays: number;
  totalPoints: number;
  weeklyStreak: number;
  perfectDays: number;
  averageProtein: number;
  averageCalories: number;
  totalDays: number;
  goalMetDays: number;
  averageCompletion: number;
  bestStreak: number;
  currentStreak: number;
  nutritionBreakdown: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    water: number;
  };
  eventCount: number;
  timeRange: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  pointsAwarded: number;
  earnedDate: string;
  category: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  pointsAwarded: number;
  unlocked: boolean;
  category: "streak" | "goal" | "improvement" | "consistency";
}

interface CalendarState {
  calendarData: Record<string, DayData>;
  statistics: CalendarStats | null;
  enhancedStatistics: any | null;
  isLoading: boolean;
  isLoadingEnhancedStats: boolean;
  isAddingEvent: boolean;
  isDeletingEvent: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: CalendarState = {
  calendarData: {},
  statistics: null,
  enhancedStatistics: null,
  isLoading: false,
  isLoadingEnhancedStats: false,
  isAddingEvent: false,
  isDeletingEvent: false,
  error: null,
  lastUpdated: null,
};

export const fetchCalendarData = createAsyncThunk(
  "calendar/fetchCalendarData",
  async (
    { year, month }: { year: number; month: number },
    { rejectWithValue }
  ) => {
    try {
      console.log("📅 Fetching calendar data for:", year, month);
      const data = await calendarAPI.getCalendarData(year, month);
      console.log(
        "✅ Calendar data received:",
        Object.keys(data || {}).length,
        "days"
      );
      return data || {};
    } catch (error: any) {
      console.error("💥 Calendar data fetch error:", error);
      const message = error?.message || "Failed to fetch calendar data";
      return rejectWithValue(message);
    }
  }
);

export const getStatistics = createAsyncThunk(
  "calendar/getStatistics",
  async (
    { year, month }: { year: number; month: number },
    { rejectWithValue }
  ) => {
    try {
      console.log("📊 Fetching statistics for:", year, month);
      const stats = await calendarAPI.getStatistics(year, month);
      console.log("✅ Statistics received:", stats ? "success" : "null");
      return stats;
    } catch (error: any) {
      console.error("💥 Statistics fetch error:", error);
      const message = error?.message || "Failed to fetch statistics";
      return rejectWithValue(message);
    }
  }
);

export const getEnhancedStatistics = createAsyncThunk(
  "calendar/getEnhancedStatistics",
  async (
    { year, month }: { year: any; month: number },
    { rejectWithValue }
  ) => {
    try {
      console.log("📊 Fetching enhanced statistics for:", year, month);
      const stats = await calendarAPI.getEnhancedStatistics(year, month);
      console.log(
        "✅ Enhanced statistics received:",
        stats ? "success" : "null"
      );
      return stats;
    } catch (error: any) {
      console.error("💥 Enhanced statistics fetch error:", error);
      const message = error?.message || "Failed to fetch enhanced statistics";
      return rejectWithValue(message);
    }
  }
);

export const addEvent = createAsyncThunk(
  "calendar/addEvent",
  async (
    {
      date,
      title,
      type,
      description,
    }: {
      date: string;
      title: string;
      type: string;
      description?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      console.log("📝 Adding event:", { date, title, type, description });
      const event = await calendarAPI.addEvent(date, title, type, description);
      return { date, event };
    } catch (error) {
      console.error("💥 Add event error:", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to add event"
      );
    }
  }
);

export const deleteEvent = createAsyncThunk(
  "calendar/deleteEvent",
  async (
    { eventId, date }: { eventId: string; date: string },
    { rejectWithValue }
  ) => {
    try {
      console.log("🗑️ Deleting event:", eventId);
      await calendarAPI.deleteEvent(eventId);
      return { eventId, date };
    } catch (error) {
      console.error("💥 Delete event error:", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete event"
      );
    }
  }
);

export const getEventsForDate = createAsyncThunk(
  "calendar/getEventsForDate",
  async (date: string, { rejectWithValue }) => {
    try {
      console.log("📅 Fetching events for date:", date);
      const events = await calendarAPI.getEventsForDate(date);
      return { date, events };
    } catch (error) {
      console.error("💥 Get events error:", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch events"
      );
    }
  }
);

const calendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateDayData: (
      state,
      action: PayloadAction<{ date: string; data: Partial<DayData> }>
    ) => {
      const { date, data } = action.payload;
      if (state.calendarData[date]) {
        state.calendarData[date] = { ...state.calendarData[date], ...data };
      }
    },
    resetCalendar: (state) => {
      state.calendarData = {};
      state.statistics = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch calendar data
      .addCase(fetchCalendarData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCalendarData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.calendarData = action.payload || {};
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchCalendarData.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          (action.payload as string) || "Failed to fetch calendar data";
        console.warn("⚠️ Calendar data fetch rejected:", state.error);
      })

      // Get statistics
      .addCase(getStatistics.pending, (state) => {
        // Don't set loading for statistics to avoid UI flicker
      })
      .addCase(getStatistics.fulfilled, (state, action) => {
        if (action.payload) {
          state.statistics = action.payload;
        } else {
          console.warn(
            "⚠️ Calendar statistics returned null - keeping previous state"
          );
        }
      })
      .addCase(getStatistics.rejected, (state, action) => {
        console.warn("⚠️ Statistics fetch failed:", action.payload);
        state.error =
          (action.payload as string) || "Failed to fetch statistics";
      })

      // Get enhanced statistics
      .addCase(getEnhancedStatistics.pending, (state) => {
        state.isLoadingEnhancedStats = true;
      })
      .addCase(getEnhancedStatistics.fulfilled, (state, action) => {
        state.isLoadingEnhancedStats = false;
        if (action.payload) {
          state.enhancedStatistics = action.payload;
        } else {
          console.warn("⚠️ Enhanced statistics returned null");
        }
      })
      .addCase(getEnhancedStatistics.rejected, (state, action) => {
        state.isLoadingEnhancedStats = false;
        console.warn("⚠️ Enhanced statistics fetch failed:", action.payload);
        state.error =
          (action.payload as string) || "Failed to fetch enhanced statistics";
      })

      // Add event
      .addCase(addEvent.pending, (state) => {
        state.isAddingEvent = true;
        state.error = null;
      })
      .addCase(addEvent.fulfilled, (state, action) => {
        state.isAddingEvent = false;
        const { date, event } = action.payload;

        // Update the calendar data with the new event
        if (state.calendarData[date]) {
          state.calendarData[date].events.push({
            id: event.id,
            title: event.title,
            type: event.type,
            created_at: event.created_at,
          });
        }
      })
      .addCase(addEvent.rejected, (state, action) => {
        state.isAddingEvent = false;
        state.error = action.payload as string;
      })

      // Delete event
      .addCase(deleteEvent.pending, (state) => {
        state.isDeletingEvent = true;
        state.error = null;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.isDeletingEvent = false;
        const { eventId, date } = action.payload;

        // Remove the event from calendar data
        if (state.calendarData[date]) {
          state.calendarData[date].events = state.calendarData[
            date
          ].events.filter((event) => event.id !== eventId);
        }
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.isDeletingEvent = false;
        state.error = action.payload as string;
      })

      // Get events for date
      .addCase(getEventsForDate.fulfilled, (state, action) => {
        const { date, events } = action.payload;
        if (state.calendarData[date]) {
          state.calendarData[date].events = events.map((event: any) => ({
            id: event.id,
            title: event.title,
            type: event.type,
            created_at: event.created_at,
          }));
        }
      });
  },
});

export const { clearError, updateDayData, resetCalendar } =
  calendarSlice.actions;
export default calendarSlice.reducer;
