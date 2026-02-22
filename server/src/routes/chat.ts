import { Router, Request, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { ChatService } from "../services/chat";
import { UsageTrackingService } from "../services/usageTracking";
import { z } from "zod";
import { prisma } from "../lib/database";

const router = Router();

const healthBasedRecommendationSchema = z.object({
  userId: z.string(),
  healthData: z.object({
    steps: z.number(),
    caloriesBurned: z.number(),
    heartRate: z.number(),
    distance: z.number(),
    activeMinutes: z.number(),
    date: z.string(),
  }),
  prompt: z.string().optional(),
});

// Send chat message
router.post(
  "/message",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      // Check user subscription first
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { subscription_type: true },
      });

      if (!user || user.subscription_type === "FREE") {
        return res.status(403).json({
          success: false,
          error:
            "AI Chat is not available on the Free plan. Please upgrade to Gold or Platinum plan.",
          subscriptionRequired: true,
        });
      }

      const { message } = req.body;

      // Language is always derived from the user's DB profile preference.
      // The client does not control this — changing it only happens in profile settings.
      const language = req.user?.preferred_lang === "HE" ? "hebrew" : "english";

      if (!message || typeof message !== "string" || message.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Message is required and must be a non-empty string",
        });
      }

      if (message.length > 2000) {
        return res.status(400).json({
          success: false,
          error: "Message is too long. Maximum 2000 characters allowed.",
        });
      }

      const estimatedTokens = Math.ceil(message.length / 4) + 100;
      const limitCheck = await UsageTrackingService.checkAIChatLimit(
        userId,
        estimatedTokens
      );

      if (!limitCheck.allowed) {
        return res.status(403).json({
          success: false,
          error: limitCheck.message,
          usage: {
            current: limitCheck.current,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining,
          },
        });
      }

      const response = await ChatService.processMessage(
        userId,
        message,
        language
      );

      const actualTokens =
        Math.ceil(message.length / 4) +
        Math.ceil((response.response?.length || 0) / 4);
      await UsageTrackingService.incrementAIChatTokens(userId, actualTokens);

      res.json({
        success: true,
        response: {
          response: response.response,
          messageId: response.messageId,
        },
        usage: {
          tokensUsed: actualTokens,
          current: limitCheck.current + actualTokens,
          limit: limitCheck.limit,
          remaining: limitCheck.remaining
            ? limitCheck.remaining - actualTokens
            : null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("💥 Chat error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process message",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

router.get(
  "/history",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

      const messages = await prisma.chatMessage.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: limit,
      });

      res.json({
        success: true,
        data: messages.reverse(), // Return in chronological order
      });
    } catch (error) {
      console.error("💥 Chat history error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get chat history",
      });
    }
  }
);

// Clear chat history
router.delete(
  "/history",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      console.log("🗑️ Clearing chat history for user:", userId);

      await prisma.chatMessage.deleteMany({
        where: { user_id: userId },
      });

      console.log("✅ Chat history cleared successfully");

      res.json({
        success: true,
        message: "Chat history cleared successfully",
      });
    } catch (error) {
      console.error("💥 Clear chat history error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to clear chat history",
      });
    }
  }
);

// Health-based recommendation
router.post(
  "/health-based-recommendation",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      const { healthData, prompt } = healthBasedRecommendationSchema.parse(
        req.body
      );

      // Generate AI prompt with health data and personal info
      const recommendation = await ChatService.processHealthBasedRecommendation(
        userId,
        healthData,
        prompt
      );

      res.json({
        recommendation,
        healthData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Health-based recommendation error:", error);
      res
        .status(500)
        .json({ error: "Failed to generate health-based recommendation" });
    }
  }
);

export default router;
