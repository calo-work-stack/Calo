import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { Server } from "http";
import { errorHandler } from "./middleware/errorHandler";
import { authRoutes } from "./routes/auth";
import { nutritionRoutes } from "./routes/nutrition";
import { userRoutes } from "./routes/user";
import { questionnaireRoutes } from "./routes/questionnaire";
import chatRoutes from "./routes/chat";
import { deviceRoutes } from "./routes/devices";
import { mealPlansRoutes } from "./routes/mealPlans";
import recommendedMenuRoutes from "./routes/recommendedMenu";
import { calendarRoutes } from "./routes/calendar";
import statisticsRoutes from "./routes/statistics";
import foodScannerRoutes from "./routes/foodScanner";
import { EnhancedCronJobService } from "./services/cron/enhanced";
import { enhancedDailyGoalsRoutes } from "./routes/enhanced/dailyGoals";
import { testRecommendationsRoutes } from "./routes/enhanced/recommendations";
import { enhancedDatabaseRoutes } from "./routes/enhanced/database";
import { dailyGoalsRoutes } from "./routes/dailyGoal";
import achievementsRouter from "./routes/achievements";
import shoppingListRoutes from "./routes/shoppingLists";
import mealCompletionRouter from "./routes/mealCompletion";
import { schemaValidationRoutes } from "./routes/schema-validation";
import { authenticateToken, AuthRequest } from "./middleware/auth"; // ⚠️ FIXED: Removed double slash
import enhancedMenuRouter from "./routes/enhancedMenu";
import adminRoutes from "./routes/admin";
import { promoteAdminRoutes } from "./routes/promote-admin";
import dashboardRoutes from "./routes/dashboard";
import { prisma, connectDatabase } from "./lib/database";

// Load environment variables first
dotenv.config();
console.log(
  "🔍 DATABASE_URL loaded:",
  process.env.DATABASE_URL ? "✅ Yes" : "❌ No",
);
console.log("🔍 First 50 chars:", process.env.DATABASE_URL?.substring(0, 50));
// ⚠️ MOVE server and config declarations BEFORE startServer function
let server: Server;

// Optimized configuration with computed values
const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  apiBaseUrl: process.env.API_BASE_URL,
  clientUrl: process.env.CLIENT_URL,
  openaiApiKey: process.env.OPENAI_API_KEY,
  isDevelopment: process.env.NODE_ENV !== "production",
  get serverIp() {
    return this.apiBaseUrl
      ? this.apiBaseUrl
          .replace(/\/api$/, "")
          .split("//")[1]
          ?.split(":")[0]
      : "localhost";
  },
  get apiOrigin() {
    return this.apiBaseUrl?.replace(/\/api$/, "");
  },
} as const;

// Simplified logging
const log = {
  info: (msg: string, ...args: any[]) => console.log(`ℹ️ ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`⚠️ ${msg}`, ...args),
  success: (msg: string, ...args: any[]) => console.log(`✅ ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`❌ ${msg}`, ...args),
  rocket: (msg: string, ...args: any[]) => console.log(`🚀 ${msg}`, ...args),
};

// Initialize Express with optimizations
const app = express();
app.disable("x-powered-by"); // Security: hide Express
app.set("trust proxy", 1);

// Optimized middleware stack (order matters for performance)
app.use(
  helmet({
    contentSecurityPolicy: config.isDevelopment ? false : undefined,
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  compression({
    level: 4, // Reduced from 6 for faster compression (speed over ratio)
    threshold: 2048, // Only compress responses > 2KB (reduced CPU overhead)
    // Skip compression for small/fast endpoints
    filter: (req, res) => {
      const skipPaths = ["/health", "/test"];
      if (skipPaths.some((path) => req.path.startsWith(path))) {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);

// Optimized rate limiter with skip function for fast paths
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isDevelopment ? 5000 : 200, // Increased limits
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for fast endpoints
  skip: (req) => {
    const fastPaths = ["/health", "/test", "/api/auth/me", "/api/dashboard"];
    return fastPaths.some((path) => req.path.startsWith(path));
  },
});
app.use(limiter);

// Request timing middleware for performance monitoring (dev only)
if (config.isDevelopment) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (duration > 500) {
        // Log slow requests (>500ms)
        console.log(`⚠️ SLOW: ${req.method} ${req.path} took ${duration}ms`);
      }
    });
    next();
  });
}

// Pre-computed CORS origins
const corsOrigins = [
  config.clientUrl,
  "http://localhost:19006",
  "http://localhost:19000",
  config.apiOrigin || `http://${config.serverIp}:19006`,
  config.apiOrigin || `http://${config.serverIp}:8081`,
  ...(config.isDevelopment ? ["*"] : []),
].filter(Boolean) as string[];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cached database health check
let lastHealthCheck = { status: "unknown", timestamp: 0 };
const HEALTH_CACHE_MS = 30000; // Cache for 30 seconds

app.get("/health", async (req, res) => {
  const now = Date.now();

  // Return cached result if recent
  if (now - lastHealthCheck.timestamp < HEALTH_CACHE_MS) {
    return res.json({
      ...lastHealthCheck,
      cached: true,
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    lastHealthCheck = {
      status: "ok",
      timestamp: now,
    };

    res.json({
      status: "ok",
      environment: config.nodeEnv,
      database: "connected",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      openai_enabled: !!config.openaiApiKey,
      cached: false,
    });
  } catch (error) {
    lastHealthCheck = {
      status: "error",
      timestamp: now,
    };

    res.status(503).json({
      status: "error",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      cached: false,
    });
  }
});

// Lightweight test endpoint
app.get("/test", (req, res) => {
  res.json({
    message: "Server is reachable!",
    timestamp: new Date().toISOString(),
    openai_enabled: !!config.openaiApiKey,
  });
});

// Consolidated API router
const apiRouter = express.Router();

// Group routes for better organization and routing performance
apiRouter.use("/auth", authRoutes);
apiRouter.use("/dashboard", dashboardRoutes); // ✅ Good: Added dashboard route
apiRouter.use("/questionnaire", questionnaireRoutes);
apiRouter.use("/nutrition", nutritionRoutes);
apiRouter.use("/recommended-menus", recommendedMenuRoutes);
apiRouter.use("/user", userRoutes);
apiRouter.use("/devices", deviceRoutes);
apiRouter.use("/calendar", calendarRoutes);
apiRouter.use("/meal-plans", mealPlansRoutes);
apiRouter.use("/chat", chatRoutes);
apiRouter.use("/food-scanner", foodScannerRoutes);
apiRouter.use("/shopping-lists", shoppingListRoutes);
apiRouter.use("/", statisticsRoutes);
apiRouter.use("/daily-goals", enhancedDailyGoalsRoutes);
apiRouter.use("/recommendations", testRecommendationsRoutes);
apiRouter.use("/database", enhancedDatabaseRoutes);
apiRouter.use("/daily-goals-simple", dailyGoalsRoutes);
apiRouter.use("/", achievementsRouter);
apiRouter.use("/meal-completions", mealCompletionRouter);
apiRouter.use("/schema", schemaValidationRoutes);
apiRouter.use("/menu/enhanced", enhancedMenuRouter);
apiRouter.use("/", promoteAdminRoutes);

// Test endpoints (conditionally add in development)
if (config.isDevelopment) {
  apiRouter.post("/test/create-daily-goals", async (req, res) => {
    try {
      const { EnhancedDailyGoalsService } =
        await import("./services/database/dailyGoals");

      const [debugInfo, result] = await Promise.all([
        EnhancedDailyGoalsService.debugDatabaseState(),
        EnhancedDailyGoalsService.forceCreateGoalsForAllUsers(),
      ]);

      const finalDebugInfo =
        await EnhancedDailyGoalsService.debugDatabaseState();

      res.json({
        success: true,
        message: `${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
        data: { ...result, debugInfo, finalDebugInfo },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  apiRouter.post(
    "/test/create-single-goal",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const { EnhancedDailyGoalsService } =
          await import("./services/database/dailyGoals");

        const [success, goals] = await Promise.all([
          EnhancedDailyGoalsService.createDailyGoalForUser(req.user.user_id),
          EnhancedDailyGoalsService.getUserDailyGoals(req.user.user_id),
        ]);

        res.json({
          success,
          data: goals,
          message: "Daily goal created successfully",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );
}

app.use("/api", apiRouter);
app.use("/api/admin", adminRoutes);

// Optimized 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown with timeout
const gracefulShutdown = (signal: string) => {
  log.info(`Received ${signal}, shutting down...`);

  const shutdownTimeout = setTimeout(() => {
    log.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000); // 10 second timeout

  if (server) {
    server.close(async () => {
      clearTimeout(shutdownTimeout);
      await prisma.$disconnect();
      log.success("Shutdown complete");
      process.exit(0);
    });
  } else {
    prisma.$disconnect().then(() => {
      clearTimeout(shutdownTimeout);
      process.exit(0);
    });
  }
};

// ✅ CORRECTED: startServer function in the right place
async function startServer() {
  try {
    // Connect to database FIRST
    await connectDatabase();

    // Initialize cron jobs in parallel with server start
    const cronPromise = Promise.resolve().then(() => {
      EnhancedCronJobService.initializeEnhancedCronJobs();
      log.success("Cron jobs initialized");
    });

    // Start server
    server = app.listen(config.port, "0.0.0.0", () => {
      log.rocket(`Server running on port ${config.port}`);
      log.info(`Environment: ${config.nodeEnv}`);
      log.info(`Access: http://${config.serverIp}:${config.port}`);

      if (!config.openaiApiKey) {
        log.warn("AI features using mock data (no OPENAI_API_KEY)");
      }
    });

    // Wait for cron initialization
    await cronPromise;
  } catch (error) {
    log.error("Startup failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Signal handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", (error) => {
  log.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  log.error("Unhandled Rejection:", reason);
  gracefulShutdown("unhandledRejection");
});

startServer();

export default app;
