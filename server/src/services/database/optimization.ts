import { PrismaClient } from "@prisma/client";
import { DatabaseHealth, CleanupResult } from "../../types/database";
import { prisma } from "../../lib/database";

export class DatabaseOptimizationService {
  /**
   * Helper to run a query with timeout
   */
  private static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    fallback: T
  ): Promise<T> {
    const timeout = new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout")), timeoutMs)
    );
    try {
      return await Promise.race([promise, timeout]);
    } catch {
      return fallback;
    }
  }

  /**
   * Lightweight database health check - uses fast queries with timeouts
   */
  static async checkDatabaseHealth(): Promise<DatabaseHealth> {
    try {
      console.log("🔍 Checking database health (lightweight)...");

      // Use a short timeout (5 seconds) for health checks
      const QUERY_TIMEOUT = 5000;

      // Only check critical tables with timeouts - skip heavy counts
      const [userCount, expiredSessions] = await Promise.all([
        this.withTimeout(prisma.user.count(), QUERY_TIMEOUT, 0),
        this.withTimeout(
          prisma.session.count({
            where: {
              expiresAt: { lt: new Date() },
            },
          }),
          QUERY_TIMEOUT,
          0
        ),
      ]);

      // Skip heavy meal/recommendation counts - they cause timeouts
      // Just use a simple connectivity check instead
      const isConnected = userCount > 0 || (await this.testConnection());

      const needsCleanup = expiredSessions > 100;

      let status: "healthy" | "warning" | "critical" = "healthy";
      if (!isConnected) {
        status = "critical";
      } else if (expiredSessions > 500) {
        status = "critical";
      } else if (expiredSessions > 200) {
        status = "warning";
      }

      const health: DatabaseHealth = {
        status,
        size: userCount * 0.1, // Rough estimate based on user count
        maxSize: 100,
        connectionCount: 1,
        lastCleanup: new Date(),
        needsCleanup,
      };

      console.log("✅ Database health check completed:", health);
      return health;
    } catch (error) {
      console.error("💥 Database health check failed:", error);
      return {
        status: "critical",
        size: 0,
        maxSize: 100,
        connectionCount: 0,
        lastCleanup: new Date(),
        needsCleanup: true,
      };
    }
  }

  /**
   * Simple connection test
   */
  private static async testConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Intelligent database cleanup with safety checks
   * Now runs operations separately to avoid transaction timeouts
   */
  static async performIntelligentCleanup(): Promise<CleanupResult> {
    console.log("🧹 Starting intelligent database cleanup...");

    let deletedRecords = 0;
    const errors: string[] = [];

    // Run cleanup operations separately (not in one big transaction)
    // This prevents statement timeouts and is more resilient

    try {
      // 1. Clean expired sessions (fast, indexed query)
      const expiredSessionsResult = await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });
      deletedRecords += expiredSessionsResult.count;
      console.log(`🗑️ Deleted ${expiredSessionsResult.count} expired sessions`);
    } catch (error) {
      console.error("⚠️ Failed to clean sessions:", error);
      errors.push("Session cleanup failed");
    }

    try {
      // 2. Clean old AI recommendations (keep last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const oldRecommendationsResult = await prisma.aiRecommendation.deleteMany({
        where: {
          created_at: { lt: thirtyDaysAgo },
        },
      });
      deletedRecords += oldRecommendationsResult.count;
      console.log(`🗑️ Deleted ${oldRecommendationsResult.count} old AI recommendations`);
    } catch (error) {
      console.error("⚠️ Failed to clean recommendations:", error);
      errors.push("Recommendation cleanup failed");
    }

    try {
      // 3. Clean old daily goals (keep last 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const oldGoalsResult = await prisma.dailyGoal.deleteMany({
        where: {
          created_at: { lt: ninetyDaysAgo },
        },
      });
      deletedRecords += oldGoalsResult.count;
      console.log(`🗑️ Deleted ${oldGoalsResult.count} old daily goals`);
    } catch (error) {
      console.error("⚠️ Failed to clean daily goals:", error);
      errors.push("Daily goals cleanup failed");
    }

    // Skip chat message cleanup per-user iteration - too slow
    // Chat messages should be cleaned via a scheduled job with LIMIT

    console.log(`✅ Intelligent cleanup completed: ${deletedRecords} records deleted`);

    return {
      deletedRecords,
      freedSpace: deletedRecords * 0.001,
      errors,
    };
  }

  /**
   * Optimize database queries and indexes
   */
  static async optimizeDatabase(): Promise<void> {
    try {
      console.log("⚡ Optimizing database performance...");

      // Run ANALYZE to update table statistics
      try {
        await prisma.$executeRaw`ANALYZE;`;
        console.log("✅ Database ANALYZE completed");
      } catch (analyzeError) {
        console.log("⚠️ ANALYZE operation failed:", analyzeError);
      }

      // Note: VACUUM requires no active transactions and can cause connection issues
      // when using a shared Prisma instance. For production, consider running VACUUM
      // via a separate database connection or scheduled maintenance window.
      // Skipping VACUUM to prevent "Engine is not yet connected" errors in concurrent requests.
      console.log("ℹ️ VACUUM skipped to maintain connection stability");

      console.log("✅ Database optimization completed");
    } catch (error) {
      console.error("❌ Database optimization failed:", error);
      // Don't throw error to prevent breaking the application
    }
  }

  /**
   * Check for duplicate prevention
   */
  static async checkForDuplicates(
    userId: string,
    date: string
  ): Promise<{
    hasDailyGoal: boolean;
    hasRecommendation: boolean;
  }> {
    try {
      const [dailyGoal, recommendation] = await Promise.all([
        prisma.dailyGoal.findFirst({
          where: {
            user_id: userId,
            date: new Date(date),
          },
        }),
        prisma.aiRecommendation.findFirst({
          where: {
            user_id: userId,
            date: date,
          },
        }),
      ]);

      return {
        hasDailyGoal: !!dailyGoal,
        hasRecommendation: !!recommendation,
      };
    } catch (error) {
      console.error("Error checking for duplicates:", error);
      return {
        hasDailyGoal: false,
        hasRecommendation: false,
      };
    }
  }

  /**
   * Emergency database recovery
   */
  static async emergencyRecovery(): Promise<boolean> {
    try {
      console.log("🚨 Starting emergency database recovery...");

      // 1. Test basic connectivity with timeout
      const connected = await this.testConnection();
      if (!connected) {
        await prisma.$connect();
      }
      console.log("✅ Database connection restored");

      // 2. Perform aggressive cleanup
      const cleanupResult = await this.performIntelligentCleanup();
      console.log(
        `🧹 Emergency cleanup: ${cleanupResult.deletedRecords} records removed`
      );

      // 3. Skip heavy optimization during emergency - just verify connection
      // await this.optimizeDatabase();

      // 4. Verify basic connectivity only (skip heavy counts)
      const userCount = await this.withTimeout(prisma.user.count(), 5000, -1);

      if (userCount >= 0) {
        console.log("📊 Database verified, user count:", userCount);
        console.log("✅ Emergency recovery completed successfully");
        return true;
      } else {
        console.log("⚠️ Could not verify database state");
        return false;
      }
    } catch (error) {
      console.error("💥 Emergency recovery failed:", error);
      return false;
    }
  }
}
