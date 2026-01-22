import { Router } from "express";
import { CalendarService } from "../services/calendar";
import { calendarStatsService } from "../services/calendarStats";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get calendar data for a specific month
router.get("/data/:year/:month", async (req: AuthRequest, res) => {
  try {
    const { year, month } = req.params;

    // Validate year and month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        error: "Invalid year or month provided",
      });
    }

    console.log("📅 Get calendar data request for:", yearNum, monthNum);

    const calendarData = await CalendarService.getCalendarData(
      req.user.user_id,
      yearNum,
      monthNum
    );

    res.json({
      success: true,
      data: calendarData,
    });
  } catch (error) {
    console.error("💥 Get calendar data error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch calendar data";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Get statistics for a specific month
router.get("/statistics/:year/:month", async (req: AuthRequest, res) => {
  try {
    const { year, month } = req.params;

    // Validate year and month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        error: "Invalid year or month provided",
      });
    }

    console.log("📊 Get statistics request for:", yearNum, monthNum);

    const statistics = await CalendarService.getStatistics(
      req.user.user_id,
      yearNum,
      monthNum
    );

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("💥 Get statistics error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch statistics";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Get enhanced statistics for a specific month
router.get(
  "/statistics/enhanced/:year/:month",
  async (req: AuthRequest, res) => {
    try {
      const { year, month } = req.params;

      // Validate year and month
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          error: "Invalid year or month provided",
        });
      }

      console.log("📊 Get enhanced statistics request for:", yearNum, monthNum);

      const statistics =
        await calendarStatsService.getEnhancedStatistics(
          req.user.user_id,
          yearNum,
          monthNum
        );

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error("💥 Get enhanced statistics error:", error);
      // Log full error stack for debugging
      if (error instanceof Error && error.stack) {
        console.error("📋 Error stack:", error.stack);
      }
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch enhanced statistics";
      res.status(500).json({
        success: false,
        error: message,
        // Include debug info in development
        ...(process.env.NODE_ENV === "development" && {
          debug: error instanceof Error ? error.stack : undefined,
        }),
      });
    }
  }
);

// Add event to a specific date
router.post("/events", async (req: AuthRequest, res) => {
  try {
    const { date, title, type, description } = req.body;

    if (!date || !title) {
      return res.status(400).json({
        success: false,
        error: "Date and title are required",
      });
    }

    // Validate date format
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({
        success: false,
        error: "Date must be in YYYY-MM-DD format",
      });
    }

    console.log("📝 Add event request:", { date, title, type, description });

    const event = await CalendarService.addEvent(
      req.user.user_id,
      date,
      title,
      type || "general",
      description
    );

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("💥 Add event error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to add event";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Get events for a specific date
router.get("/events/:date", async (req: AuthRequest, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({
        success: false,
        error: "Date must be in YYYY-MM-DD format",
      });
    }

    console.log("📅 Get events request for date:", date);

    const events = await CalendarService.getEventsForDate(
      req.user.user_id,
      date
    );

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("💥 Get events error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch events";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Delete event
router.delete("/events/:eventId", async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: "Event ID is required",
      });
    }

    console.log("🗑️ Delete event request:", eventId);

    await CalendarService.deleteEvent(req.user.user_id, eventId);

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("💥 Delete event error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete event";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Get month comparison (for trend analysis)
router.get("/comparison/:year/:month", async (req: AuthRequest, res) => {
  try {
    const { year, month } = req.params;

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        error: "Invalid year or month provided",
      });
    }

    console.log("📊 Get month comparison request for:", yearNum, monthNum);

    // Calculate previous month values
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
    const prevYear = monthNum === 1 ? yearNum - 1 : yearNum;

    // Fetch both months in parallel for faster response
    const [currentMonth, previousMonth] = await Promise.all([
      CalendarService.getCalendarData(req.user.user_id, yearNum, monthNum),
      CalendarService.getCalendarData(req.user.user_id, prevYear, prevMonth),
    ]);

    res.json({
      success: true,
      data: {
        currentMonth,
        previousMonth,
        comparison: {
          currentMonthAvg:
            Object.values(currentMonth).reduce(
              (sum, day) => sum + day.calories_actual,
              0
            ) / Object.values(currentMonth).length,
          previousMonthAvg:
            Object.values(previousMonth).reduce(
              (sum, day) => sum + day.calories_actual,
              0
            ) / Object.values(previousMonth).length,
        },
      },
    });
  } catch (error) {
    console.error("💥 Get month comparison error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch month comparison";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export { router as calendarRoutes };
