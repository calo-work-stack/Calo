import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth"; // Import your AuthRequest type here
import { StatisticsService } from "../services/statistics";
import { z } from "zod";
import { AchievementService } from "../services/achievements";
import { AIRecommendationService } from "../services/aiRecommendations";

const router = Router();

const periodSchema = z.enum(["today", "week", "month", "custom"]);

// Get nutrition statistics
router.get(
  "/statistics",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id?.toString();

    if (!userId) {
      console.error("❌ Statistics request without user ID");
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      console.log(
        `📊 Statistics request for user: ${userId}, period: ${
          req.query.period || "week"
        }`
      );

      const period = periodSchema.parse(req.query.period || "week");

      // Handle custom period case or filter out unsupported periods
      let statisticsPeriod: "today" | "week" | "month" | undefined;

      if (period === "custom") {
        // Assuming custom period logic would be handled here or passed differently
        // For now, defaulting to 'week' if 'custom' is requested without further parameters
        statisticsPeriod = "week";
      } else {
        statisticsPeriod = period;
      }

      // Set a timeout for the statistics request (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Statistics request timeout")),
          30000
        );
      });

      const statisticsPromise = StatisticsService.getNutritionStatistics(
        userId,
        statisticsPeriod
      );

      const statistics = await Promise.race([
        statisticsPromise,
        timeoutPromise,
      ]);

      console.log(`✅ Statistics fetched successfully for user: ${userId}`);

      // Add cache headers for better performance
      res.set({
        "Cache-Control": "public, max-age=300", // 5 minutes cache
        ETag: `"statistics-${userId}-${statisticsPeriod}-${Date.now()}"`,
      });

      res.json(statistics);
    } catch (error) {
      console.error("❌ Error fetching statistics:", error);

      // Return a more detailed error response
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid period parameter",
          details: error.errors,
        });
      }

      if (
        error instanceof Error &&
        error.message === "Statistics request timeout"
      ) {
        return res.status(408).json({
          error: "Request timeout",
          message: "Statistics calculation took too long. Please try again.",
        });
      }

      // Handle database connection/table issues (example for Prisma error code)
      if (typeof error === "string" && error.includes("P2010")) {
        return res.status(503).json({
          error: "Database schema issue",
          message:
            "The database schema is not properly synchronized. Please contact support.",
          code: error,
        });
      }

      res.status(500).json({
        error: "Failed to fetch statistics",
        message: error instanceof Error ? error.message : "Unknown error",
        code: error || "UNKNOWN_ERROR",
      });
    }
  }
);

// Get detailed achievements data
router.get(
  "/statistics/achievements",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id?.toString();

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      console.log(`🏆 Statistics achievements request for user: ${userId}`);

      const achievementData = await AchievementService.getUserAchievements(
        userId
      );

      console.log(
        `✅ Statistics achievements fetched successfully for user: ${userId}, unlocked: ${achievementData.unlockedAchievements.length}, locked: ${achievementData.lockedAchievements.length}`
      );

      // Flatten the data structure to match client expectations
      const allAchievements = [
        ...achievementData.unlockedAchievements,
        ...achievementData.lockedAchievements,
      ];

      res.json({
        success: true,
        data: allAchievements,
      });
    } catch (error) {
      console.error("❌ Error fetching statistics achievements:", error);
      res.status(500).json({
        error: "Failed to fetch achievements",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Check and award new achievements
router.post(
  "/achievements/check",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id?.toString();

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      console.log(`🔄 Checking achievements for user: ${userId}`);

      const result = await AchievementService.checkAndAwardAchievements(userId);

      console.log(`✅ Achievement check completed for user: ${userId}`);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error checking achievements:", error);
      res.status(500).json({
        error: "Failed to check achievements",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Export report as PDF
router.get(
  "/export-report",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id?.toString();

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      const pdfBuffer = await StatisticsService.generatePDFReport(userId);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=nutrition-report.pdf"
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  }
);

// Get insights and recommendations
router.get(
  "/insights",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id?.toString();

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      const insights = await StatisticsService.generateInsights(userId);
      res.json(insights);
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  }
);

// Get AI-powered recommendations
router.get(
  "/recommendations",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    try {
      console.log(`💡 Fetching AI recommendations for user: ${userId}`);

      // First, get existing recommendations
      let recommendations =
        await AIRecommendationService.getUserRecommendations(userId);

      // If no recommendations exist and user is eligible (GOLD/PLATINUM), generate them
      if (recommendations.length === 0) {
        const { prisma } = await import("../lib/database");
        const user = await prisma.user.findUnique({
          where: { user_id: userId },
          select: { subscription_type: true, is_questionnaire_completed: true },
        });

        if (
          user &&
          user.is_questionnaire_completed &&
          (user.subscription_type === "GOLD" || user.subscription_type === "PREMIUM")
        ) {
          console.log(`🚀 Generating first-time AI recommendations for GOLD/PLATINUM user: ${userId}`);
          try {
            const newRecommendation =
              await AIRecommendationService.generateDailyRecommendations(userId);
            if (newRecommendation) {
              recommendations = [newRecommendation];
              console.log(`✅ Generated first-time recommendations for user: ${userId}`);
            }
          } catch (genError) {
            console.warn(`⚠️ Could not generate recommendations: ${genError}`);
            // Continue with empty recommendations
          }
        }
      }

      // ✅ Return in expected format
      res.json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      console.error(
        `❌ Error fetching AI recommendations for user ${userId}:`,
        error
      );
      res.status(500).json({
        success: false,
        error: "Failed to fetch AI recommendations",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
// Manually generate AI recommendations
router.post(
  "/recommendations/generate",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    try {
      console.log(`🚀 Manually generating AI recommendations for user: ${userId}`);

      // Check user eligibility
      const { prisma } = await import("../lib/database");
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { subscription_type: true, is_questionnaire_completed: true },
      });

      if (!user?.is_questionnaire_completed) {
        return res.status(400).json({
          success: false,
          error: "Please complete the questionnaire first",
        });
      }

      if (user.subscription_type !== "GOLD" && user.subscription_type !== "PREMIUM") {
        return res.status(403).json({
          success: false,
          error: "AI recommendations require GOLD or PREMIUM subscription",
        });
      }

      // Generate recommendations
      const recommendation = await AIRecommendationService.generateDailyRecommendations(userId);

      console.log(`✅ Generated recommendations for user: ${userId}`);

      res.json({
        success: true,
        data: recommendation,
      });
    } catch (error) {
      console.error(`❌ Error generating AI recommendations for user ${userId}:`, error);
      res.status(500).json({
        success: false,
        error: "Failed to generate AI recommendations",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Emergency setup trigger
router.post("/debug/force-setup", async (req: any, res: Response) => {
  try {
    console.log("🚨 Manual emergency setup triggered");
    const { CronJobService } = await import("../services/cronJobs");
    await CronJobService.runImmediateCleanupAndSetup();
    res.json({ success: true, message: "Emergency setup completed" });
  } catch (error) {
    console.error("❌ Manual emergency setup failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Setup failed",
    });
  }
});

export default router;
