import { Router } from "express";
import { prisma } from "../lib/database";
import { updateProfileSchema } from "../types/auth";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { StatisticsService } from "../services/statistics";
import { z } from "zod";

const avatarUploadSchema = z.object({
  avatar_base64: z.string().min(100, "Avatar image data is required"),
});

const router = Router();

router.put(
  "/profile",
  authenticateToken,
  async (req: AuthRequest, res, next) => {
    try {
      const validatedData = updateProfileSchema.parse(req.body);

      const updatedUser = await prisma.user.update({
        where: { user_id: req.user?.user_id },
        data: validatedData,
        select: {
          user_id: true,
          email: true,
          name: true,
          avatar_url: true,
          subscription_type: true,
          birth_date: true,
          ai_requests_count: true,
          ai_requests_reset_at: true,
          created_at: true,
          email_verified: true,
          is_questionnaire_completed: true,
        },
      });

      res.json({
        success: true,
        user: updatedUser,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      } else {
        next(error);
      }
    }
  }
);

// Upload avatar endpoint
router.post("/avatar", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.user_id;

    const validationResult = avatarUploadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid avatar data",
        details: validationResult.error.errors,
      });
    }

    const { avatar_base64 } = validationResult.data;

    // Clean base64 data
    let cleanBase64 = avatar_base64;
    if (avatar_base64.startsWith("data:image/")) {
      cleanBase64 = avatar_base64.split(",")[1];
    }

    // Validate base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanBase64)) {
      return res.status(400).json({
        success: false,
        error: "Invalid image format",
      });
    }

    // Create data URL for storage
    const avatarUrl = `data:image/jpeg;base64,${cleanBase64}`;

    // Update user avatar in database
    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data: { avatar_url: avatarUrl },
      select: {
        user_id: true,
        email: true,
        name: true,
        avatar_url: true,
        subscription_type: true,
        birth_date: true,
        ai_requests_count: true,
        created_at: true,
      },
    });

    console.log("✅ Avatar uploaded successfully for user:", userId);

    res.json({
      success: true,
      message: "Avatar uploaded successfully",
      avatar_url: avatarUrl,
      user: updatedUser,
    });
  } catch (error) {
    console.error("💥 Avatar upload error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload avatar",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// src/routes/user.ts
router.put(
  "/subscription",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.user_id;
      const { subscription_type } = req.body;

      if (!["FREE", "PREMIUM", "GOLD"].includes(subscription_type)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid subscription type" });
      }

      await prisma.user.update({
        where: { user_id: userId },
        data: { subscription_type },
      });

      return res.json({ success: true, message: "Subscription updated" });
    } catch (error) {
      console.error("Subscription update error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to update subscription" });
    }
  }
);

router.get(
  "/subscription-info",
  authenticateToken,
  async (req: AuthRequest, res) => {
    const subscriptionInfo = {
      FREE: { dailyRequests: 2, name: "Free Plan" },
      BASIC: { dailyRequests: 20, name: "Basic Plan" },
      PREMIUM: { dailyRequests: 50, name: "Premium Plan" },
    };

    const userSubscriptionType = req.user?.subscription_type;
    const info =
      subscriptionInfo[userSubscriptionType as keyof typeof subscriptionInfo] ||
      subscriptionInfo.FREE;

    res.json({
      success: true,
      subscription: {
        ...info,
        currentRequests: req.user?.ai_requests_count,
        resetAt: req.user?.ai_requests_reset_at,
      },
    });
  }
);

// Promote user to admin (use with caution - should be restricted)
router.post(
  "/promote-admin",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { secret_key, user_email } = req.body;
      const ADMIN_SECRET =
        process.env.ADMIN_PROMOTION_SECRET || "change-this-secret-key";

      if (secret_key !== ADMIN_SECRET) {
        return res.status(403).json({
          success: false,
          error: "Invalid secret key",
        });
      }

      const targetUser = await prisma.user.update({
        where: { email: user_email },
        data: {
          is_admin: true,
          subscription_type: "PREMIUM", // Give them premium access
        },
      });

      return res.json({
        success: true,
        message: `User ${user_email} promoted to ADMIN`,
        data: targetUser,
      });
    } catch (error) {
      console.error("Admin promotion error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to promote user",
      });
    }
  }
);

// NEW ENDPOINT: Get global nutritional statistics
router.get(
  "/global-statistics",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      console.log("📊 Global statistics request from user:", req.user?.user_id);

      // You can optionally accept a query param ?period=week|month|custom
      const period =
        (req.query.period as "week" | "month" | "custom") || "week";

      const statistics = await StatisticsService.getNutritionStatistics(
        req.user?.user_id,
        period
      );

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error("💥 Global statistics error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch global statistics";
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

// Add these endpoints to your existing userRoutes file

// EDIT USER ENDPOINT
router.patch(
  "/edit",
  authenticateToken,
  async (req: AuthRequest, res, next) => {
    try {
      // Only allow updating specific fields with explicit mapping
      const allowedFields = {
        name: "name",
        birth_date: "birth_date",
      } as const;

      const updateData: any = {};

      // Safely map only allowed fields from request body
      Object.keys(allowedFields).forEach((key) => {
        const fieldName = allowedFields[key as keyof typeof allowedFields];
        if (req.body[key] !== undefined) {
          updateData[fieldName] = req.body[key];
        }
      });

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: "No valid fields provided for update",
        });
      }

      const updatedUser = await prisma.user.update({
        where: { user_id: req.user?.user_id },
        data: updateData,
        select: {
          user_id: true,
          email: true,
          name: true,
          avatar_url: true,
          subscription_type: true,
          birth_date: true,
          ai_requests_count: true,
          ai_requests_reset_at: true,
          created_at: true,
          email_verified: true,
          is_questionnaire_completed: true,
        },
      });

      res.json({
        success: true,
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("💥 Edit user error:", error);
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      } else {
        next(error);
      }
    }
  }
);

// DELETE USER ENDPOINT (Permanent deletion with related data cleanup)
router.delete(
  "/delete",
  authenticateToken,
  async (req: AuthRequest, res, next) => {
    try {
      console.log(
        "🗑️ Permanent delete user request for user:",
        req.user?.user_id
      );

      // Use a transaction to ensure all deletions succeed or fail together
      await prisma.$transaction(async (tx) => {
        // Delete all related data first (based on common nutrition app tables)

        // Delete nutrition logs/entries
        await tx.connectedDevice.deleteMany({
          where: { user_id: req.user?.user_id },
        });

        // Delete meal plans
        await tx.userMealPlan.deleteMany({
          where: { user_id: req.user?.user_id },
        });

        // Delete user goals/targets
        await tx.dailyActivitySummary.deleteMany({
          where: { user_id: req.user?.user_id },
        });

        // Delete user preferences/settings
        await tx.userMealPreference.deleteMany({
          where: { user_id: req.user?.user_id },
        });

        // Delete user recipes
        await tx.meal.deleteMany({
          where: { user_id: req.user?.user_id },
        });

        // Delete user workouts (if applicable)
        // await tx.mealPlanSchedule.deleteMany({
        //   where: { user_id: req.user?.user_id },
        // });

        // Delete user progress tracking
        await tx.userQuestionnaire.deleteMany({
          where: { user_id: req.user?.user_id },
        });

        // Delete user notifications
        await tx.shoppingList.deleteMany({
          where: { user_id: req.user?.user_id },
        });

        // Delete user sessions/tokens
        await tx.nutritionPlan.deleteMany({
          where: { user_id: req.user?.user_id },
        });

        // Delete user subscriptions/payments (if applicable)
        await tx.subscriptionPayment.deleteMany({
          where: { user_id: req.user?.user_id },
        });

        // Finally, delete the user
        await tx.user.delete({
          where: { user_id: req.user?.user_id },
        });

        console.log(
          "✅ Successfully deleted user and all related data:",
          req.user?.user_id
        );
      });

      res.json({
        success: true,
        message: "User account and all related data permanently deleted",
      });
    } catch (error) {
      console.error("💥 Delete user error:", error);
      if (error instanceof Error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      } else {
        next(error);
      }
    }
  }
);

// STORE PUSH TOKEN ENDPOINT
router.post("/push-token", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken || typeof pushToken !== "string") {
      return res.status(400).json({
        success: false,
        error: "Valid push token is required",
      });
    }

    // Validate token length (Expo push tokens are around 40-50 characters)
    if (pushToken.length > 200) {
      return res.status(400).json({
        success: false,
        error: "Push token is too long",
      });
    }

    // Store push token in user metadata or create a separate tokens table
    // For now, just log it (implement proper storage based on your schema)
    console.log(
      `📱 Push token received for user ${req.user?.user_id}:`,
      pushToken.substring(0, 20) + "..."
    );

    res.json({
      success: true,
      message: "Push token received (local notifications only in Expo Go)",
    });
  } catch (error) {
    console.error("💥 Error storing push token:", error);
    res.status(500).json({
      success: false,
      error: "Failed to store push token",
    });
  }
});

// GET USER PROFILE ENDPOINT
router.get("/profile", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.user_id;
    console.log("📋 Getting profile for user:", userId);

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        name: true,
        avatar_url: true,
        subscription_type: true,
        level: true,
        current_xp: true,
        total_points: true,
        current_streak: true,
        best_streak: true,
        total_complete_days: true,
        created_at: true,
        email_verified: true,
        questionnaires: {
          select: {
            meals_per_day: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    console.log("✅ Profile fetched successfully", user);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("💥 Error fetching profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
    });
  }
});

// Get user stats
router.get("/stats", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    console.log("📊 Fetching user stats for user:", userId);

    // Get user profile data with error handling
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        created_at: true,
        subscription_type: true,
        best_streak: true,
        current_streak: true,
        total_points: true,
        active_menu_id: true,
      },
    });

    if (!user) {
      console.log("⚠️ User not found:", userId);
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Default stats object
    const defaultStats = {
      totalMeals: 0,
      todayWaterIntake: 0,
      totalAchievements: 0,
      best_streak: user.best_streak || 0,
      current_streak: user.current_streak || 0,
      totalPoints: user.total_points || 0,
      memberSince: user.created_at,
      subscriptionType: user.subscription_type || "free",
      questionnaireCompleted: false,
      hasActiveMenu: !!user.active_menu_id,
    };

    try {
      // Count total meals with timeout
      const totalMeals = await Promise.race([
        prisma.meal.count({
          where: { user_id: userId },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3000)
        ),
      ]);
      defaultStats.totalMeals = totalMeals as number;
    } catch (error) {
      console.warn("⚠️ Failed to fetch total meals, using default");
    }

    try {
      // Get today's water intake with timeout
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayWater = await Promise.race([
        prisma.waterIntake.aggregate({
          where: {
            user_id: userId,
            date: { gte: today, lt: tomorrow },
          },
          _sum: { cups_consumed: true },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3000)
        ),
      ]);
      defaultStats.todayWaterIntake = (todayWater as any)?._sum?.cups_consumed || 0;
    } catch (error) {
      console.warn("⚠️ Failed to fetch water intake, using default");
    }

    try {
      // Count achievements with timeout
      const totalAchievements = await Promise.race([
        prisma.userAchievement.count({
          where: { user_id: userId },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3000)
        ),
      ]);
      defaultStats.totalAchievements = totalAchievements as number;
    } catch (error) {
      console.warn("⚠️ Failed to fetch achievements, using default");
    }

    try {
      // Check if questionnaire is completed with timeout
      const questionnaireCompleted = await Promise.race([
        prisma.userQuestionnaire.findFirst({
          where: { user_id: userId },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3000)
        ),
      ]);
      defaultStats.questionnaireCompleted = !!questionnaireCompleted;
    } catch (error) {
      console.warn("⚠️ Failed to fetch questionnaire status, using default");
    }

    console.log("✅ User stats fetched successfully:", defaultStats);

    res.json({
      success: true,
      data: defaultStats,
    });
  } catch (error) {
    console.error("💥 Error fetching user stats:", error);

    // Return minimal working stats instead of failing completely
    const fallbackStats = {
      totalMeals: 0,
      todayWaterIntake: 0,
      totalAchievements: 0,
      streak: 0,
      totalPoints: 0,
      memberSince: new Date(),
      subscriptionType: "free",
      questionnaireCompleted: false,
      hasActiveMenu: false,
    };

    res.json({
      success: true,
      data: fallbackStats,
    });
  }
});

router.post(
  "/request-password-change",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { email: true, name: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      await prisma.user.update({
        where: { user_id: userId },
        data: {
          password_reset_code: verificationCode,
          password_reset_expires: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      console.log(
        `🔐 Password change verification code for ${user.email}: ${verificationCode}`
      );

      res.json({
        success: true,
        message: "Verification code sent to your email",
        verificationCode,
      });
    } catch (error) {
      console.error("Error requesting password change:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process password change request",
      });
    }
  }
);

router.post(
  "/change-password",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.user_id;
      const { verificationCode, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      if (!verificationCode || !newPassword) {
        return res.status(400).json({
          success: false,
          error: "Verification code and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: "Password must be at least 6 characters long",
        });
      }

      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          password_reset_code: true,
          password_reset_expires: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      if (!user.password_reset_code || !user.password_reset_expires) {
        return res.status(400).json({
          success: false,
          error: "No password change request found",
        });
      }

      if (new Date() > user.password_reset_expires) {
        return res.status(400).json({
          success: false,
          error: "Verification code has expired",
        });
      }

      if (user.password_reset_code !== verificationCode) {
        return res.status(400).json({
          success: false,
          error: "Invalid verification code",
        });
      }

      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { user_id: userId },
        data: {
          password_hash: hashedPassword,
          password_reset_code: null,
          password_reset_expires: null,
        },
      });

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({
        success: false,
        error: "Failed to change password",
      });
    }
  }
);

export { router as userRoutes };
