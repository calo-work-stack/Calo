import cron from "node-cron";
import { EnhancedDailyGoalsService } from "../database/dailyGoals";
import { EnhancedAIRecommendationService } from "../database/aiRecommendations";
import { DatabaseOptimizationService } from "../database/optimization";
import { ScheduledNotificationService } from "../scheduledNotifications";
import { MenuExpirationService } from "../menuExpiration";

export class EnhancedCronJobService {
  private static isRunning = false;
  private static lastRun = new Map<string, Date>();

  /**
   * Initialize all cron jobs with proper error handling
   */
  static initializeEnhancedCronJobs() {
    console.log("🚀 Initializing enhanced cron jobs...");

    // Daily goals creation at 00:30 AM every day
    cron.schedule(
      "30 0 * * *",
      async () => {
        await this.runJobSafely("daily-goals", async () => {
          console.log("📊 Running daily goals creation at 00:30 AM");
          const result =
            await EnhancedDailyGoalsService.createDailyGoalsForAllUsers();
          console.log("✅ Daily goals creation completed:", result);
          console.log(
            `Created: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors.length}`
          );
        });
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );

    // AI recommendations at 06:00 AM
    cron.schedule("0 6 * * *", async () => {
      await this.runJobSafely("ai-recommendations", async () => {
        console.log("🤖 Running AI recommendations generation at 6:00 AM");
        const result =
          await EnhancedAIRecommendationService.generateRecommendationsForAllUsers();
        console.log("✅ AI recommendations completed:", result);
      });
    });

    // Database optimization every 6 hours
    cron.schedule("0 */6 * * *", async () => {
      await this.runJobSafely("database-optimization", async () => {
        console.log("⚡ Running database optimization");
        const health = await DatabaseOptimizationService.checkDatabaseHealth();

        if (health.needsCleanup) {
          const cleanupResult =
            await DatabaseOptimizationService.performIntelligentCleanup();
          console.log("🧹 Database cleanup completed:", cleanupResult);
        }

        await DatabaseOptimizationService.optimizeDatabase();
        console.log("✅ Database optimization completed");
      });
    });

    // Emergency health check every 2 hours
    cron.schedule("0 */2 * * *", async () => {
      await this.runJobSafely("health-check", async () => {
        const health = await DatabaseOptimizationService.checkDatabaseHealth();

        if (health.status === "critical") {
          console.log(
            "🚨 Critical database state detected, running emergency recovery"
          );
          const recovered =
            await DatabaseOptimizationService.emergencyRecovery();

          if (recovered) {
            console.log("✅ Emergency recovery successful");
          } else {
            console.error(
              "❌ Emergency recovery failed - manual intervention required"
            );
          }
        }
      });
    });

    // Menu expiration check at 00:15 AM every day
    cron.schedule(
      "15 0 * * *",
      async () => {
        await this.runJobSafely("menu-expiration", async () => {
          console.log("📅 Running menu expiration check at 00:15 AM");

          // First fix any menus without end_date
          const fixed = await MenuExpirationService.fixMenusWithoutEndDate();
          if (fixed > 0) {
            console.log(`🔧 Fixed ${fixed} menus without end_date`);
          }

          // Then deactivate expired menus
          const result = await MenuExpirationService.deactivateExpiredMenus();
          console.log("✅ Menu expiration check completed:", result);

          if (result.errors.length > 0) {
            console.warn(`⚠️ ${result.errors.length} errors during expiration check`);
          }
        });
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );

    // Initialize scheduled push notifications
    ScheduledNotificationService.initialize();

    console.log("✅ Enhanced cron jobs initialized");

    // Run immediate startup tasks
    setTimeout(async () => {
      await this.runStartupTasks();
    }, 5000);
  }

  /**
   * Run a cron job safely with error handling and duplicate prevention
   */
  private static async runJobSafely(
    jobName: string,
    jobFunction: () => Promise<void>
  ) {
    if (this.isRunning) {
      console.log(`⏭️ Skipping ${jobName} - another job is running`);
      return;
    }

    const lastRunTime = this.lastRun.get(jobName);
    const now = new Date();

    // Prevent running the same job within 30 minutes
    if (lastRunTime && now.getTime() - lastRunTime.getTime() < 30 * 60 * 1000) {
      console.log(`⏭️ Skipping ${jobName} - ran recently`);
      return;
    }

    this.isRunning = true;
    this.lastRun.set(jobName, now);

    try {
      console.log(`🔄 Starting job: ${jobName}`);
      await jobFunction();
      console.log(`✅ Job completed: ${jobName}`);
    } catch (error) {
      console.error(`💥 Job failed: ${jobName}`, error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run startup tasks - now resilient to database issues
   */
  private static async runStartupTasks() {
    console.log("🚀 Running startup tasks...");

    try {
      // 1. Check database health first
      const health = await DatabaseOptimizationService.checkDatabaseHealth();
      console.log("📊 Database health:", health);

      // If database is critical, skip heavy operations
      if (health.status === "critical") {
        console.log("⚠️ Database in critical state - skipping heavy startup tasks");
        // Only try cleanup to free resources
        try {
          await DatabaseOptimizationService.performIntelligentCleanup();
        } catch (cleanupError) {
          console.error("⚠️ Cleanup also failed:", cleanupError);
        }
        return;
      }

      // 2. Perform cleanup if needed
      if (health.needsCleanup) {
        console.log("🧹 Database needs cleanup, performing maintenance...");
        try {
          await DatabaseOptimizationService.performIntelligentCleanup();
        } catch (cleanupError) {
          console.error("⚠️ Cleanup failed, continuing:", cleanupError);
        }
      }

      // 3. Create daily goals for users (run in background, non-blocking)
      console.log("📊 Creating daily goals for users...");
      EnhancedDailyGoalsService.createDailyGoalsForAllUsers()
        .then((result) => {
          console.log(`✅ Daily goals created: ${result.created} new, ${result.updated} updated`);
        })
        .catch((error) => {
          console.warn("⚠️ Daily goals creation failed (non-critical):", error.message);
        });

      // 4. Generate AI recommendations for eligible users (run in background, non-blocking)
      if (process.env.OPENAI_API_KEY) {
        console.log("🤖 Generating AI recommendations for eligible users...");
        EnhancedAIRecommendationService.generateRecommendationsForAllUsers()
          .then((result) => {
            console.log(`✅ AI recommendations generated: ${result.generated} for ${result.processed} users`);
          })
          .catch((error) => {
            console.warn("⚠️ AI recommendations generation failed (non-critical):", error.message);
          });
      } else {
        console.log("ℹ️ Skipping AI recommendations (no OpenAI API key configured)");
      }

      // 5. Check for expired menus on startup (run in background, non-blocking)
      console.log("📅 Checking for expired menus...");
      MenuExpirationService.deactivateExpiredMenus()
        .then((result) => {
          if (result.deactivated > 0) {
            console.log(`✅ Deactivated ${result.deactivated} expired menus on startup`);
          } else {
            console.log("✅ No expired menus found");
          }
        })
        .catch((error) => {
          console.warn("⚠️ Menu expiration check failed (non-critical):", error.message);
        });

      console.log("✅ Startup tasks completed");
    } catch (error) {
      console.error("💥 Startup tasks failed:", error);
      // Don't throw - let server continue running
    }
  }

  /**
   * Manual trigger for immediate execution
   */
  static async runImmediateCleanupAndSetup(): Promise<void> {
    console.log("🚀 Running immediate cleanup and setup...");

    try {
      // 1. Database health check and cleanup
      const health = await DatabaseOptimizationService.checkDatabaseHealth();
      console.log("📊 Current database health:", health);

      if (health.needsCleanup || health.status !== "healthy") {
        const cleanupResult =
          await DatabaseOptimizationService.performIntelligentCleanup();
        console.log("🧹 Cleanup result:", cleanupResult);
      }

      // 2. Optimize database
      await DatabaseOptimizationService.optimizeDatabase();

      // 3. Force create daily goals for ALL users
      console.log("📊 Force creating daily goals for ALL users...");
      const goalsResult =
        await EnhancedDailyGoalsService.forceCreateGoalsForAllUsers();
      console.log("📊 Daily goals result:", goalsResult);

      // 4. Generate AI recommendations
      if (process.env.OPENAI_API_KEY) {
        const recommendationsResult =
          await EnhancedAIRecommendationService.generateRecommendationsForAllUsers();
        console.log("🤖 AI recommendations result:", recommendationsResult);
      }

      console.log("✅ Immediate cleanup and setup completed successfully");
    } catch (error) {
      console.error("💥 Immediate cleanup and setup failed:", error);
      throw error;
    }
  }

  /**
   * Get cron job status
   */
  static getJobStatus(): {
    isRunning: boolean;
    lastRuns: Record<string, Date>;
    nextRuns: Record<string, string>;
  } {
    return {
      isRunning: this.isRunning,
      lastRuns: Object.fromEntries(this.lastRun),
      nextRuns: {
        "daily-goals": "00:30 AM daily",
        "ai-recommendations": "06:00 AM daily",
        "database-optimization": "Every 6 hours",
        "health-check": "Every 2 hours",
        "menu-expiration": "00:15 AM daily",
      },
    };
  }
}
