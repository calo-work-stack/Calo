/**
 * Calo Server - Main Entry Point
 * Production-ready Express server with security, performance, and AWS compatibility
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { Server } from "http";

// Load environment variables FIRST
dotenv.config();

// Import configuration and utilities
import { config, getCorsOrigins } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import {
  requestIdMiddleware,
  securityHeadersMiddleware,
  sanitizeInputMiddleware,
  requestLoggingMiddleware,
  preventParameterPollution,
} from "./middleware/security";
import { prisma, connectDatabase, disconnectDatabase, getDatabaseStatus } from "./lib/database";

// Import routes
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
import ingredientsRoutes from "./routes/ingredients";
import { EnhancedCronJobService } from "./services/cron/enhanced";
import { enhancedDailyGoalsRoutes } from "./routes/enhanced/dailyGoals";
import { testRecommendationsRoutes } from "./routes/enhanced/recommendations";
import { enhancedDatabaseRoutes } from "./routes/enhanced/database";
import { dailyGoalsRoutes } from "./routes/dailyGoal";
import achievementsRouter from "./routes/achievements";
import shoppingListRoutes from "./routes/shoppingLists";
import mealCompletionRouter from "./routes/mealCompletion";
import { schemaValidationRoutes } from "./routes/schema-validation";
import { authenticateToken, AuthRequest } from "./middleware/auth";
import enhancedMenuRouter from "./routes/enhancedMenu";
import adminRoutes from "./routes/admin";
import dashboardRoutes from "./routes/dashboard";
import notificationsRoutes from "./routes/notifications";

// Server instance
let server: Server;

// Startup timestamp for uptime calculation
const startupTime = Date.now();

// Structured logging utility
const log = {
  info: (msg: string, meta?: object) => console.log(`ℹ️  ${msg}`, meta ? JSON.stringify(meta) : ""),
  warn: (msg: string, meta?: object) => console.warn(`⚠️  ${msg}`, meta ? JSON.stringify(meta) : ""),
  success: (msg: string, meta?: object) => console.log(`✅ ${msg}`, meta ? JSON.stringify(meta) : ""),
  error: (msg: string, error?: unknown) => console.error(`❌ ${msg}`, error || ""),
  debug: (msg: string, meta?: object) => {
    if (config.isDevelopment) console.log(`🔍 ${msg}`, meta ? JSON.stringify(meta) : "");
  },
};

// Initialize Express application
const app = express();

// ====================
// SECURITY MIDDLEWARE
// ====================

// Disable x-powered-by header (security)
app.disable("x-powered-by");

// Trust proxy for proper client IP detection behind load balancers (AWS ALB/ELB)
app.set("trust proxy", 1);

// Request ID tracking (must be first for proper tracing)
app.use(requestIdMiddleware);

// Security headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: config.security.helmet.contentSecurityPolicy ? undefined : false,
    crossOriginEmbedderPolicy: config.security.helmet.crossOriginEmbedderPolicy,
    hsts: config.security.helmet.hsts,
  })
);

// Additional security headers
app.use(securityHeadersMiddleware);

// ====================
// PERFORMANCE MIDDLEWARE
// ====================

// Response compression
app.use(
  compression({
    level: config.performance.compression.level,
    threshold: config.performance.compression.threshold,
    filter: (req, res) => {
      // Skip compression for specified paths
      if (config.performance.compression.skipPaths.some(path => req.path.startsWith(path))) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// ====================
// RATE LIMITING
// ====================

const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      message: "Too many requests, please try again later",
      code: "RATE_LIMIT_EXCEEDED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for specified paths
  skip: (req) => config.security.rateLimit.skipPaths.some(path => req.path.startsWith(path)),
  // Custom key generator for better identification
  keyGenerator: (req) => {
    return req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
  },
});
app.use(limiter);

// ====================
// REQUEST PROCESSING
// ====================

// Request logging (development and slow request detection)
app.use(requestLoggingMiddleware({ slowThreshold: config.performance.slowRequestThreshold }));

// CORS configuration
const corsOptions = {
  origin: getCorsOrigins(),
  credentials: config.security.cors.credentials,
  methods: [...config.security.cors.methods] as string[],
  allowedHeaders: [...config.security.cors.allowedHeaders] as string[],
  exposedHeaders: [...config.security.cors.exposedHeaders] as string[],
  maxAge: config.security.cors.maxAge,
};
app.use(cors(corsOptions));

// Cookie parser
app.use(cookieParser());

// Body parsers with size limits
app.use(express.json({ limit: config.security.bodyParser.jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: config.security.bodyParser.urlEncodedLimit }));

// Input sanitization and parameter pollution prevention
app.use(preventParameterPollution);
app.use(sanitizeInputMiddleware);

// ====================
// HEALTH CHECK ENDPOINTS
// ====================

// Cached health check state
let lastHealthCheck = { status: "unknown", timestamp: 0, data: {} as any };

// Main health check endpoint (AWS ALB/ELB compatible)
app.get("/health", async (req, res) => {
  const now = Date.now();
  const cacheMs = config.performance.healthCheck.cacheMs;

  // Return cached result if recent
  if (now - lastHealthCheck.timestamp < cacheMs && lastHealthCheck.status === "ok") {
    return res.json({
      ...lastHealthCheck.data,
      cached: true,
    });
  }

  try {
    const dbStatus = getDatabaseStatus();
    const uptime = Math.floor((now - startupTime) / 1000);
    const memoryUsage = process.memoryUsage();

    const healthData = {
      status: "ok",
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptime,
        formatted: formatUptime(uptime),
      },
      database: {
        connected: dbStatus.connected,
        healthy: dbStatus.healthy,
        latency: dbStatus.lastCheckLatency,
      },
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
      services: {
        openai: config.services.openai.enabled,
        email: config.services.email.enabled,
      },
    };

    lastHealthCheck = {
      status: "ok",
      timestamp: now,
      data: healthData,
    };

    res.json({ ...healthData, cached: false });
  } catch (error) {
    lastHealthCheck = { status: "error", timestamp: now, data: {} };

    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      cached: false,
    });
  }
});

// Lightweight liveness probe (for Kubernetes/ECS)
app.get("/health/live", (req, res) => {
  res.status(200).json({ status: "alive" });
});

// Readiness probe (checks database connection)
app.get("/health/ready", async (req, res) => {
  const dbStatus = getDatabaseStatus();

  if (dbStatus.connected && dbStatus.healthy) {
    res.status(200).json({ status: "ready", database: "connected" });
  } else {
    res.status(503).json({ status: "not ready", database: "disconnected" });
  }
});

// Simple test endpoint
app.get("/test", (req, res) => {
  res.json({
    message: "Server is reachable!",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    services: {
      openai: config.services.openai.enabled,
    },
  });
});

// ====================
// API ROUTES
// ====================

const apiRouter = express.Router();

// Core routes
apiRouter.use("/auth", authRoutes);
apiRouter.use("/dashboard", dashboardRoutes);
apiRouter.use("/questionnaire", questionnaireRoutes);
apiRouter.use("/nutrition", nutritionRoutes);
apiRouter.use("/recommended-menus", recommendedMenuRoutes);
apiRouter.use("/user", userRoutes);
apiRouter.use("/devices", deviceRoutes);
apiRouter.use("/calendar", calendarRoutes);
apiRouter.use("/meal-plans", mealPlansRoutes);
apiRouter.use("/chat", chatRoutes);
apiRouter.use("/food-scanner", foodScannerRoutes);
apiRouter.use("/ingredients", ingredientsRoutes);
apiRouter.use("/shopping-lists", shoppingListRoutes);
apiRouter.use("/daily-goals", enhancedDailyGoalsRoutes);
apiRouter.use("/recommendations", testRecommendationsRoutes);
apiRouter.use("/database", enhancedDatabaseRoutes);
apiRouter.use("/daily-goals-simple", dailyGoalsRoutes);
apiRouter.use("/meal-completions", mealCompletionRouter);
apiRouter.use("/schema", schemaValidationRoutes);
apiRouter.use("/menu/enhanced", enhancedMenuRouter);
apiRouter.use("/notifications", notificationsRoutes);

// Routes mounted at root of /api
apiRouter.use("/", statisticsRoutes);
apiRouter.use("/", achievementsRouter);

// Development-only test endpoints
if (config.isDevelopment) {
  apiRouter.post("/test/create-daily-goals", async (req, res) => {
    try {
      const { EnhancedDailyGoalsService } = await import("./services/database/dailyGoals");

      const [debugInfo, result] = await Promise.all([
        EnhancedDailyGoalsService.debugDatabaseState(),
        EnhancedDailyGoalsService.forceCreateGoalsForAllUsers(),
      ]);

      const finalDebugInfo = await EnhancedDailyGoalsService.debugDatabaseState();

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

  apiRouter.post("/test/create-single-goal", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { EnhancedDailyGoalsService } = await import("./services/database/dailyGoals");

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
  });
}

// Mount API router
app.use("/api", apiRouter);
app.use("/api/admin", adminRoutes);

// ====================
// ERROR HANDLING
// ====================

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: "Route not found",
      code: "NOT_FOUND",
      path: req.originalUrl,
      requestId: req.requestId,
    },
    timestamp: new Date().toISOString(),
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// ====================
// SERVER LIFECYCLE
// ====================

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`Received ${signal}, initiating graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    log.error("Forced shutdown after timeout");
    process.exit(1);
  }, config.cloud.shutdownTimeout);

  try {
    // Stop accepting new connections
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      log.success("HTTP server closed");
    }

    // Disconnect database
    await disconnectDatabase();

    clearTimeout(shutdownTimeout);
    log.success("Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    log.error("Error during shutdown:", error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

// Start server
async function startServer(): Promise<void> {
  try {
    log.info("Starting Calo Server...", {
      environment: config.nodeEnv,
      port: config.port,
    });

    // Connect to database first
    await connectDatabase();

    // Initialize cron jobs
    EnhancedCronJobService.initializeEnhancedCronJobs();
    log.success("Cron jobs initialized");

    // Start HTTP server
    server = app.listen(config.port, "0.0.0.0", () => {
      log.success(`Server running on port ${config.port}`);
      log.info(`Environment: ${config.nodeEnv}`);
      log.info(`Health check: http://localhost:${config.port}/health`);

      if (!config.services.openai.enabled) {
        log.warn("OpenAI service disabled (no API key)");
      }
    });

    // Handle server errors
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        log.error(`Port ${config.port} is already in use`);
      } else {
        log.error("Server error:", error);
      }
      process.exit(1);
    });
  } catch (error) {
    log.error("Startup failed:", error);
    await disconnectDatabase();
    process.exit(1);
  }
}

// Utility: Format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

// ====================
// SIGNAL HANDLERS
// ====================

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

// Start the server
startServer();

export default app;
