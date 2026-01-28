import { Router } from "express";
import { authenticateToken, AuthRequest } from "../../middleware/auth";
import { AIRecommendationService } from "../../services/aiRecommendations";
import { prisma } from "../../lib/database";

const router = Router();

/**
 * POST /api/recommendations/test/:userId
 * Manual test endpoint to generate AI recommendations for a specific user
 * Useful for debugging and testing
 */
router.post(
  "/test/:userId",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;

      // Security: Only allow users to test their own recommendations (or admins)
      if (userId !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          error: "You can only generate recommendations for yourself",
        });
      }

      // Check user subscription
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          subscription_type: true,
          is_questionnaire_completed: true,
          name: true,
          email: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Check if user has the right subscription
      if (
        user.subscription_type !== "GOLD" &&
        user.subscription_type !== "PREMIUM"
      ) {
        return res.status(403).json({
          success: false,
          error: `AI recommendations require GOLD or PREMIUM subscription. Your current plan: ${user.subscription_type}`,
          subscriptionRequired: true,
          currentSubscription: user.subscription_type,
        });
      }

      // Check if questionnaire is completed
      if (!user.is_questionnaire_completed) {
        return res.status(400).json({
          success: false,
          error:
            "Please complete the questionnaire first to receive personalized recommendations",
          questionnaireRequired: true,
        });
      }

      console.log(
        `🧪 Test: Generating recommendations for user: ${user.name || user.email} (${userId})`,
      );

      const recommendation =
        await AIRecommendationService.generateDailyRecommendations(userId);

      res.json({
        success: true,
        data: recommendation,
        message: "Test recommendation generated successfully",
        metadata: {
          userId,
          subscription: user.subscription_type,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ Test generation failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development"
            ? (error as Error).stack
            : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/recommendations/debug/:userId
 * Get debug information about why recommendations might not be generating
 */
router.get(
  "/debug/:userId",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;

      // Security check
      if (userId !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized",
        });
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: {
          questionnaires: {
            orderBy: { date_completed: "desc" },
            take: 1,
          },
          aiRecommendations: {
            orderBy: { created_at: "desc" },
            take: 5,
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const today = new Date().toISOString().split("T")[0];
      const hasRecommendationToday = user.aiRecommendations.some(
        (r) => r.date === today,
      );

      // Initialize blockers array with proper type
      const blockers: string[] = [];

      // Debug info
      const debugInfo = {
        user: {
          id: user.user_id,
          email: user.email,
          name: user.name,
          subscription: user.subscription_type,
          isQuestionnaireCompleted: user.is_questionnaire_completed,
        },
        eligibility: {
          hasCorrectSubscription:
            user.subscription_type === "GOLD" ||
            user.subscription_type === "PREMIUM",
          hasCompletedQuestionnaire: user.is_questionnaire_completed,
          hasRecommendationToday: hasRecommendationToday,
          canReceiveRecommendations:
            (user.subscription_type === "GOLD" ||
              user.subscription_type === "PREMIUM") &&
            user.is_questionnaire_completed,
        },
        questionnaire: user.questionnaires[0]
          ? {
              completedAt: user.questionnaires[0].date_completed,
              mainGoal: user.questionnaires[0].main_goal,
              activityLevel: user.questionnaires[0].physical_activity_level,
            }
          : null,
        recentRecommendations: user.aiRecommendations.map((r) => ({
          id: r.id,
          date: r.date,
          priorityLevel: r.priority_level,
          confidenceScore: r.confidence_score,
          createdAt: r.created_at,
          isRead: r.is_read,
        })),
        apiStatus: {
          hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        },
        blockers,
      };

      // Identify blockers
      if (!debugInfo.eligibility.hasCorrectSubscription) {
        debugInfo.blockers.push(
          `Subscription type ${user.subscription_type} is not eligible (need GOLD or PREMIUM)`,
        );
      }
      if (!debugInfo.eligibility.hasCompletedQuestionnaire) {
        debugInfo.blockers.push("Questionnaire not completed");
      }
      if (debugInfo.eligibility.hasRecommendationToday) {
        debugInfo.blockers.push("Already has recommendation for today");
      }
      if (!debugInfo.apiStatus.hasOpenAIKey) {
        debugInfo.blockers.push(
          "OpenAI API key not configured (will use fallback recommendations)",
        );
      }

      res.json({
        success: true,
        data: debugInfo,
        message:
          debugInfo.blockers.length > 0
            ? `${debugInfo.blockers.length} blocker(s) found`
            : "User is eligible for AI recommendations",
      });
    } catch (error) {
      console.error("❌ Debug endpoint failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export { router as testRecommendationsRoutes };
