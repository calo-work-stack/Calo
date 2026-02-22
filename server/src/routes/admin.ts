
import { Router, Response } from "express";
import rateLimit from "express-rate-limit";
import {
  authenticateToken,
  requireAdmin,
  requireSuperAdmin,
  AuthRequest,
} from "../middleware/auth";
import { prisma } from "../lib/database";

const router = Router();

// Apply admin authentication to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Strict rate limiter for sensitive role/subscription mutation endpoints
const roleMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many administrative actions. Please wait 15 minutes.",
  },
});

/**
 * Truly safe promise executor — catches both synchronous throws and async rejections.
 * This prevents a single failing Prisma call from crashing the whole Promise.all.
 */
const safe = <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return fn().catch((err) => {
      console.warn("Admin stats partial failure:", err?.message ?? err);
      return fallback;
    });
  } catch (err: any) {
    console.warn("Admin stats sync failure:", err?.message ?? err);
    return Promise.resolve(fallback);
  }
};

// ─── GET /stats ──────────────────────────────────────────────────────────────
router.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      todaySignups,
      todayLogins,
      totalMeals,
      totalMenus,
      activeSubscriptions,
      revenueData,
      weeklySignups,
      monthlySignups,
      weeklyMeals,
      monthlyMeals,
      mealGroupResult,
      topUsers,
      completionStats,
    ] = await Promise.all([
      safe(() => prisma.user.count(), 0),
      safe(() => prisma.user.count({ where: { created_at: { gte: today } } }), 0),
      // Session count: count today's sessions (tracks logins)
      safe(() => prisma.session.count({ where: { created_at: { gte: today } } }), 0),
      safe(() => prisma.meal.count(), 0),
      safe(() => prisma.recommendedMenu.count(), 0),
      safe(
        () => prisma.user.groupBy({ by: ["subscription_type"], _count: { _all: true } }),
        []
      ),
      safe(
        () =>
          prisma.subscriptionPayment.aggregate({
            _sum: { amount: true },
            _count: { _all: true },
          }),
        { _sum: { amount: 0 }, _count: { _all: 0 } }
      ),
      safe(() => prisma.user.count({ where: { created_at: { gte: last7Days } } }), 0),
      safe(
        () => prisma.user.count({ where: { created_at: { gte: last30Days } } }),
        0
      ),
      safe(() => prisma.meal.count({ where: { created_at: { gte: last7Days } } }), 0),
      safe(
        () => prisma.meal.count({ where: { created_at: { gte: last30Days } } }),
        0
      ),
      // Correct Prisma v6 groupBy syntax: _count.user_id gives per-user meal count
      safe(
        () => prisma.meal.groupBy({ by: ["user_id"], _count: { user_id: true } }),
        []
      ),
      safe(
        () =>
          prisma.user.findMany({
            take: 10,
            orderBy: { total_points: "desc" },
            select: {
              user_id: true,
              name: true,
              email: true,
              level: true,
              total_points: true,
              current_streak: true,
              subscription_type: true,
            },
          }),
        []
      ),
      safe(
        () =>
          prisma.user.aggregate({
            _avg: { current_streak: true, total_complete_days: true },
            _max: { current_streak: true, best_streak: true },
          }),
        {
          _avg: { current_streak: 0, total_complete_days: 0 },
          _max: { current_streak: 0, best_streak: 0 },
        }
      ),
    ]);

    // Correctly calculate avgMealsPerUser from groupBy result
    const mealGroups = mealGroupResult as { user_id: string; _count: { user_id: number } }[];
    const avgMealsPerUser =
      mealGroups.length > 0
        ? Math.round(
            mealGroups.reduce((sum, r) => sum + (r._count?.user_id ?? 0), 0) /
              mealGroups.length
          )
        : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          todaySignups,
          todayLogins,
          totalMeals,
          totalMenus,
          weeklySignups,
          monthlySignups,
          weeklyMeals,
          monthlyMeals,
          avgMealsPerUser,
        },
        subscriptions: (activeSubscriptions as any[]).reduce(
          (acc: Record<string, number>, sub: any) => {
            acc[sub.subscription_type] = sub._count?._all ?? sub._count ?? 0;
            return acc;
          },
          {} as Record<string, number>
        ),
        revenue: {
          total: (revenueData as any)._sum?.amount ?? 0,
          transactions: (revenueData as any)._count?._all ?? 0,
        },
        engagement: {
          avgStreak: Math.round((completionStats as any)._avg?.current_streak ?? 0),
          avgCompleteDays: Math.round(
            (completionStats as any)._avg?.total_complete_days ?? 0
          ),
          maxStreak: (completionStats as any)._max?.current_streak ?? 0,
          bestStreak: (completionStats as any)._max?.best_streak ?? 0,
        },
        topUsers,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch statistics" });
  }
});

// ─── GET /users ───────────────────────────────────────────────────────────────
router.get("/users", async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const rawSearch = req.query.search as string;
    const search = rawSearch ? rawSearch.slice(0, 100) : undefined;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          user_id: true,
          email: true,
          name: true,
          subscription_type: true,
          is_admin: true,
          is_super_admin: true,
          created_at: true,
          email_verified: true,
          is_questionnaire_completed: true,
          level: true,
          total_points: true,
          current_streak: true,
          best_streak: true,
          total_complete_days: true,
          _count: {
            select: {
              meals: true,
              recommendedMenus: true,
            },
          },
          questionnaires: {
            take: 1,
            orderBy: { date_completed: "desc" },
            select: {
              allergies: true,
              medical_conditions: true,
              medical_conditions_text: true,
              dietary_style: true,
              main_goal: true,
              physical_activity_level: true,
              age: true,
              gender: true,
              weight_kg: true,
              height_cm: true,
              target_weight_kg: true,
              kosher: true,
              liked_foods: true,
              disliked_foods: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// ─── GET /users/:userId ───────────────────────────────────────────────────────
router.get("/users/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        questionnaires: { take: 1, orderBy: { date_completed: "desc" } },
        meals: { take: 10, orderBy: { created_at: "desc" } },
        recommendedMenus: { take: 5, orderBy: { created_at: "desc" } },
        payments: { orderBy: { payment_date: "desc" } },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Admin user details error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch user details" });
  }
});

// ─── DELETE /users/:userId (Super Admin only) ─────────────────────────────────
router.delete(
  "/users/:userId",
  requireSuperAdmin,
  roleMutationLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;

      if (userId === req.user?.user_id) {
        return res
          .status(400)
          .json({ success: false, error: "Cannot delete your own account" });
      }

      // Prevent deleting other super admins
      const targetUser = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { is_super_admin: true, email: true },
      });
      if (!targetUser) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      if (targetUser.is_super_admin) {
        return res.status(403).json({
          success: false,
          error: "Cannot delete a super admin account",
        });
      }

      const { UserCleanupService } = await import("../services/userCleanup");
      await UserCleanupService.deleteUserCompletely(userId);

      console.log(
        `🗑️ [AUDIT] User ${userId} (${targetUser.email}) deleted by super admin ${req.user?.email} at ${new Date().toISOString()}`
      );

      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Admin delete user error:", error);
      res.status(500).json({ success: false, error: "Failed to delete user" });
    }
  }
);

// ─── PATCH /users/:userId/subscription (Super Admin only) ─────────────────────
router.patch(
  "/users/:userId/subscription",
  requireSuperAdmin,
  roleMutationLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { subscription_type } = req.body;

      const validTypes = ["FREE", "GOLD", "PLATINUM", "PREMIUM"];
      if (!validTypes.includes(subscription_type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid subscription type. Allowed: ${validTypes.join(", ")}`,
        });
      }

      // Fetch current value for audit
      const currentUser = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { subscription_type: true, email: true },
      });
      if (!currentUser) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const updatedUser = await prisma.user.update({
        where: { user_id: userId },
        data: { subscription_type },
        select: { user_id: true, email: true, subscription_type: true },
      });

      console.log(
        `💳 [AUDIT] Subscription changed: user ${userId} (${currentUser.email}) ` +
          `${currentUser.subscription_type} → ${subscription_type} ` +
          `by ${req.user?.email} at ${new Date().toISOString()}`
      );

      res.json({ success: true, data: updatedUser });
    } catch (error) {
      console.error("Update subscription error:", error);
      res.status(500).json({ success: false, error: "Failed to update subscription" });
    }
  }
);

// ─── PATCH /users/:userId/role (Super Admin only) ─────────────────────────────
// Promotes or demotes a user's admin/super_admin flags.
// Enforces: cannot self-modify, cannot demote the last super_admin,
// cannot promote to super_admin unless actor is super_admin.
router.patch(
  "/users/:userId/role",
  requireSuperAdmin,
  roleMutationLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const actorId = req.user?.user_id;
      const actorEmail = req.user?.email;
      const { userId } = req.params;
      const { is_admin, is_super_admin, reason } = req.body;

      // ── Validate inputs ──────────────────────────────────────────────────
      if (is_admin === undefined && is_super_admin === undefined) {
        return res.status(400).json({
          success: false,
          error: "Provide at least one of: is_admin, is_super_admin",
        });
      }
      if (
        (is_admin !== undefined && typeof is_admin !== "boolean") ||
        (is_super_admin !== undefined && typeof is_super_admin !== "boolean")
      ) {
        return res.status(400).json({
          success: false,
          error: "is_admin and is_super_admin must be boolean values",
        });
      }

      // ── Self-modification guard ───────────────────────────────────────────
      if (userId === actorId) {
        return res.status(403).json({
          success: false,
          error: "You cannot modify your own administrative role",
        });
      }

      // ── Fetch target user ────────────────────────────────────────────────
      const targetUser = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          email: true,
          is_admin: true,
          is_super_admin: true,
        },
      });
      if (!targetUser) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // ── Last super_admin protection ───────────────────────────────────────
      const isDemotingSuperAdmin =
        targetUser.is_super_admin &&
        is_super_admin === false;

      if (isDemotingSuperAdmin) {
        const superAdminCount = await prisma.user.count({
          where: { is_super_admin: true },
        });
        if (superAdminCount <= 1) {
          return res.status(403).json({
            success: false,
            error:
              "Cannot demote the last super admin. Promote another user first.",
          });
        }
      }

      // ── Build and apply update ────────────────────────────────────────────
      const updateData: Record<string, boolean> = {};
      if (is_admin !== undefined) updateData.is_admin = is_admin;
      if (is_super_admin !== undefined) {
        updateData.is_super_admin = is_super_admin;
        // If granting super_admin, also grant admin
        if (is_super_admin) updateData.is_admin = true;
        // If revoking super_admin, also revoke admin (unless explicitly kept)
        if (!is_super_admin && is_admin === undefined) updateData.is_admin = false;
      }

      const updatedUser = await prisma.user.update({
        where: { user_id: userId },
        data: updateData,
        select: {
          user_id: true,
          email: true,
          is_admin: true,
          is_super_admin: true,
        },
      });

      // ── Audit log ─────────────────────────────────────────────────────────
      const changes = Object.entries(updateData)
        .map(([k, v]) => `${k}: ${(targetUser as any)[k]} → ${v}`)
        .join(", ");
      console.log(
        `🛡️  [AUDIT] Role change: user ${userId} (${targetUser.email}) — ${changes} ` +
          `by super admin ${actorEmail} (${actorId}) ` +
          `reason: "${reason ?? "none"}" ` +
          `at ${new Date().toISOString()}`
      );

      res.json({
        success: true,
        data: updatedUser,
        message: "Role updated successfully",
      });
    } catch (error) {
      console.error("Role update error:", error);
      res.status(500).json({ success: false, error: "Failed to update role" });
    }
  }
);

// ─── GET /activity ────────────────────────────────────────────────────────────
router.get("/activity", async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 30);

    const [recentMeals, recentSignups, recentPayments] = await Promise.all([
      prisma.meal.findMany({
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          meal_id: true,
          meal_name: true,
          calories: true,
          created_at: true,
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.user.findMany({
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          user_id: true,
          name: true,
          email: true,
          subscription_type: true,
          created_at: true,
        },
      }),
      prisma.subscriptionPayment.findMany({
        take: limit,
        orderBy: { payment_date: "desc" },
        select: {
          payment_id: true,
          plan_type: true,
          amount: true,
          payment_date: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: { recentMeals, recentSignups, recentPayments },
    });
  } catch (error) {
    console.error("Admin activity error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch activity" });
  }
});

// ─── GET /system/health ───────────────────────────────────────────────────────
router.get("/system/health", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      data: {
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("System health check error:", error);
    res.status(500).json({
      success: false,
      error: "System health check failed",
      data: { status: "unhealthy" },
    });
  }
});

export default router;
