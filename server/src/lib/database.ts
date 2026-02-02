/**
 * Database Connection Module
 * Optimized Prisma client with connection pooling, retry logic, and health monitoring
 * AWS/Cloud-ready with proper connection management
 */

import { PrismaClient } from "@prisma/client";

// Global Prisma client singleton
declare global {
  var __prisma: PrismaClient | undefined;
}

// Configuration
const DB_CONFIG = {
  maxRetries: 5,
  initialRetryDelay: 1000,
  connectionTimeout: 10000,
  healthCheckInterval: 60000, // 1 minute
  transactionMaxWait: 3000,
  transactionTimeout: 8000,
};

// Connection state
let isConnected = false;
let connectionPromise: Promise<void> | null = null;
let healthCheckInterval: NodeJS.Timeout | null = null;
let lastHealthCheck: { healthy: boolean; timestamp: number; latency?: number } = {
  healthy: false,
  timestamp: 0,
};

// Create optimized Prisma client
function createPrismaClient(): PrismaClient {
  const logLevel = process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

  return new PrismaClient({
    log: logLevel as any,
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    transactionOptions: {
      maxWait: DB_CONFIG.transactionMaxWait,
      timeout: DB_CONFIG.transactionTimeout,
    },
  });
}

// Initialize Prisma client (singleton pattern)
export const prisma: PrismaClient = global.__prisma || createPrismaClient();

// Store in global for development hot reloading
if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

// Utility: Sleep function
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Connect to database with retry logic and exponential backoff
 */
export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    console.log("📊 Database already connected");
    return;
  }

  if (connectionPromise) {
    console.log("📊 Connection already in progress, waiting...");
    return connectionPromise;
  }

  connectionPromise = performConnection();

  try {
    await connectionPromise;
  } finally {
    connectionPromise = null;
  }
}

async function performConnection(): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= DB_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`🔌 Database connection attempt ${attempt}/${DB_CONFIG.maxRetries}...`);

      // Race between connection and timeout
      const connectPromise = prisma.$connect();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Connection timeout after ${DB_CONFIG.connectionTimeout}ms`)),
          DB_CONFIG.connectionTimeout
        )
      );

      await Promise.race([connectPromise, timeoutPromise]);

      // Verify connection with a quick query
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      isConnected = true;
      lastHealthCheck = { healthy: true, timestamp: Date.now(), latency };

      console.log(`✅ Database connected successfully (latency: ${latency}ms)`);

      // Start health check monitoring
      startHealthCheckMonitoring();

      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      isConnected = false;

      console.error(`❌ Connection attempt ${attempt} failed:`, lastError.message);

      if (attempt < DB_CONFIG.maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = DB_CONFIG.initialRetryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Failed to connect to database after ${DB_CONFIG.maxRetries} attempts. Last error: ${lastError?.message}`
  );
}

/**
 * Start periodic health check monitoring
 */
function startHealthCheckMonitoring(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = setInterval(async () => {
    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      lastHealthCheck = { healthy: true, timestamp: Date.now(), latency };

      // Log warning for slow health checks
      if (latency > 100) {
        console.warn(`⚠️ Database health check slow: ${latency}ms`);
      }
    } catch (error) {
      console.error("❌ Database health check failed:", error);
      lastHealthCheck = { healthy: false, timestamp: Date.now() };
      isConnected = false;

      // Attempt reconnection
      try {
        await connectDatabase();
      } catch (reconnectError) {
        console.error("❌ Database reconnection failed:", reconnectError);
      }
    }
  }, DB_CONFIG.healthCheckInterval);

  // Don't let health check interval prevent process exit
  healthCheckInterval.unref();
}

/**
 * Check if database is healthy
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  // Return cached result if recent (within 5 seconds)
  const cacheAge = Date.now() - lastHealthCheck.timestamp;
  if (cacheAge < 5000 && lastHealthCheck.healthy) {
    return true;
  }

  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    lastHealthCheck = { healthy: true, timestamp: Date.now(), latency };
    return true;
  } catch (error) {
    console.error("❌ Database health check failed:", error);
    lastHealthCheck = { healthy: false, timestamp: Date.now() };
    isConnected = false;
    return false;
  }
}

/**
 * Get detailed database status
 */
export function getDatabaseStatus(): {
  connected: boolean;
  healthy: boolean;
  lastCheckTimestamp: number;
  lastCheckLatency?: number;
} {
  return {
    connected: isConnected,
    healthy: lastHealthCheck.healthy,
    lastCheckTimestamp: lastHealthCheck.timestamp,
    lastCheckLatency: lastHealthCheck.latency,
  };
}

/**
 * Disconnect from database gracefully
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    // Stop health check monitoring
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }

    if (isConnected) {
      console.log("🔌 Disconnecting from database...");
      await prisma.$disconnect();
      isConnected = false;
      console.log("✅ Database disconnected successfully");
    }
  } catch (error) {
    console.error("❌ Error during database disconnect:", error);
    throw error;
  }
}

/**
 * Execute a query with automatic retry on transient failures
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; retryDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 500 } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Only retry on transient errors
      const isTransient =
        error.message?.includes("Connection") ||
        error.message?.includes("timeout") ||
        error.code === "P1001" || // Can't reach database
        error.code === "P1002" || // Database timed out
        error.code === "P1008" || // Operations timed out
        error.code === "P1017";   // Server closed connection

      if (!isTransient || attempt === maxRetries) {
        throw error;
      }

      console.warn(`⚠️ Transient database error, retrying (${attempt}/${maxRetries})...`);
      await sleep(retryDelay * attempt);
    }
  }

  throw lastError;
}

// Graceful shutdown handlers
const shutdownHandlers: (() => Promise<void>)[] = [];

export function onShutdown(handler: () => Promise<void>): void {
  shutdownHandlers.push(handler);
}

async function handleShutdown(signal: string): Promise<void> {
  console.log(`\n📤 Received ${signal}, initiating graceful shutdown...`);

  // Run custom shutdown handlers
  for (const handler of shutdownHandlers) {
    try {
      await handler();
    } catch (error) {
      console.error("Error in shutdown handler:", error);
    }
  }

  // Disconnect database
  await disconnectDatabase();

  process.exit(0);
}

// Register shutdown handlers (only once)
let shutdownRegistered = false;
if (!shutdownRegistered) {
  shutdownRegistered = true;

  process.on("beforeExit", () => disconnectDatabase());
  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
}

export default prisma;
