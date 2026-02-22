/**
 * ⚠️  DANGER: THIS FILE IS INTENTIONALLY NOT REGISTERED IN index.ts ⚠️
 *
 * This was a one-time bootstrap helper to create the first super admin.
 * It has been DISABLED because it allowed ANY authenticated user to
 * self-promote to super admin — a critical privilege escalation vulnerability.
 *
 * To grant admin access, use the secure endpoint instead:
 *   PATCH /api/admin/users/:userId/role   (requires is_super_admin = true)
 *
 * DO NOT re-register this router in index.ts or any other entry point.
 */

import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/database";

const router = Router();

/**
 * DISABLED — see file header comment above.
 */
router.post(
  "/promote-me-to-admin",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const userEmail = req.user.email;

      console.log(`🔧 Promoting user ${userEmail} (${userId}) to admin...`);

      // Check current status
      const currentUser = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          email: true,
          name: true,
          is_admin: true,
          is_super_admin: true,
        },
      });

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      console.log("📋 Current user status:");
      console.log(`   Name: ${currentUser.name}`);
      console.log(`   Email: ${currentUser.email}`);
      console.log(`   Is Admin: ${currentUser.is_admin}`);
      console.log(`   Is Super Admin: ${currentUser.is_super_admin}`);

      if (currentUser.is_admin && currentUser.is_super_admin) {
        console.log("✅ User is already a super admin");
        return res.json({
          success: true,
          message: "You are already a super admin",
          user: currentUser,
        });
      }

      // Promote to admin
      const updatedUser = await prisma.user.update({
        where: { user_id: userId },
        data: {
          is_admin: true,
          is_super_admin: true,
        },
        select: {
          user_id: true,
          email: true,
          name: true,
          is_admin: true,
          is_super_admin: true,
        },
      });

      console.log("✅ User promoted successfully!");
      console.log("📋 Updated user status:");
      console.log(`   Name: ${updatedUser.name}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Is Admin: ${updatedUser.is_admin}`);
      console.log(`   Is Super Admin: ${updatedUser.is_super_admin}`);

      res.json({
        success: true,
        message:
          "You have been promoted to admin! Please log out and log back in for changes to take effect.",
        user: updatedUser,
      });
    } catch (error) {
      console.error("❌ Error promoting user to admin:", error);
      res.status(500).json({
        success: false,
        error: "Failed to promote user to admin",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export { router as promoteAdminRoutes };
