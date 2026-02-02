/**
 * Server Configuration Module
 * Centralizes all configuration with validation and type safety
 * AWS/Cloud-ready with environment variable validation
 */

import { z } from "zod";

// Environment schema with validation
const envSchema = z.object({
  // Server
  PORT: z.string().default("5000").transform(Number),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),

  // Authentication
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRY: z.string().default("7d"),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters").optional(),

  // External Services
  OPENAI_API_KEY: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),

  // URLs
  CLIENT_URL: z.string().default("http://localhost:8081"),
  API_BASE_URL: z.string().optional(),

  // Email
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform(Number), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default("200").transform(Number),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

// Validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map(e => `${e.path.join(".")}: ${e.message}`);
      console.error("Environment validation failed:");
      missing.forEach(m => console.error(`  - ${m}`));

      // In development, continue with warnings
      if (process.env.NODE_ENV === "development") {
        console.warn("Continuing in development mode with defaults...");
        return envSchema.parse({
          ...process.env,
          JWT_SECRET: process.env.JWT_SECRET || "development-secret-key-minimum-32-chars",
          DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost:5432/calo",
        });
      }

      throw new Error(`Invalid environment configuration: ${missing.join(", ")}`);
    }
    throw error;
  }
}

// Parse and validate environment
const env = validateEnv();

// Derived configuration
export const config = {
  // Server
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === "development",
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",

  // Database
  database: {
    url: env.DATABASE_URL,
    directUrl: env.DIRECT_URL,
    poolSize: env.NODE_ENV === "production" ? 20 : 5,
    connectionTimeout: 10000,
    maxRetries: 5,
    retryDelay: 1000,
  },

  // Authentication
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiry: env.JWT_EXPIRY,
    tokenCacheTTL: 5 * 60 * 1000, // 5 minutes
    cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    cookieSecure: env.NODE_ENV === "production",
    cookieSameSite: (env.NODE_ENV === "production" ? "strict" : "lax") as "strict" | "lax" | "none",
  },

  // Encryption
  encryption: {
    key: env.ENCRYPTION_KEY,
    algorithm: "aes-256-gcm" as const,
    enabled: !!env.ENCRYPTION_KEY,
  },

  // External Services
  services: {
    openai: {
      apiKey: env.OPENAI_API_KEY,
      enabled: !!env.OPENAI_API_KEY,
    },
    supabase: {
      url: env.SUPABASE_URL,
      anonKey: env.SUPABASE_ANON_KEY,
      enabled: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
    },
    email: {
      user: env.EMAIL_USER,
      password: env.EMAIL_PASSWORD,
      enabled: !!(env.EMAIL_USER && env.EMAIL_PASSWORD),
    },
  },

  // URLs
  urls: {
    client: env.CLIENT_URL,
    api: env.API_BASE_URL,
    get serverIp() {
      if (!env.API_BASE_URL) return "localhost";
      return env.API_BASE_URL
        .replace(/\/api$/, "")
        .split("//")[1]
        ?.split(":")[0] || "localhost";
    },
    get apiOrigin() {
      return env.API_BASE_URL?.replace(/\/api$/, "");
    },
  },

  // Security
  security: {
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.NODE_ENV === "development" ? 5000 : env.RATE_LIMIT_MAX_REQUESTS,
      skipPaths: ["/health", "/test", "/api/auth/me", "/api/dashboard"],
    },
    cors: {
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"] as const,
      allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Request-ID"],
      exposedHeaders: ["X-Request-ID", "X-RateLimit-Remaining"],
      maxAge: 86400, // 24 hours
    },
    helmet: {
      contentSecurityPolicy: env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: false,
      hsts: env.NODE_ENV === "production",
    },
    bodyParser: {
      jsonLimit: "10mb",
      urlEncodedLimit: "10mb",
    },
  },

  // Performance
  performance: {
    compression: {
      level: 4,
      threshold: 2048,
      skipPaths: ["/health", "/test"],
    },
    healthCheck: {
      cacheMs: 30000, // 30 seconds
    },
    slowRequestThreshold: 500, // Log requests taking >500ms
  },

  // Logging
  logging: {
    level: env.LOG_LEVEL,
    includeTimestamp: true,
    includeRequestId: true,
  },

  // AWS/Cloud specific
  cloud: {
    // Health check path for ALB/ELB
    healthCheckPath: "/health",
    // Readiness check path
    readinessPath: "/health",
    // Graceful shutdown timeout
    shutdownTimeout: 10000,
  },
} as const;

// CORS origins helper
export function getCorsOrigins(): string[] {
  const origins = [
    config.urls.client,
    "http://localhost:19006",
    "http://localhost:19000",
    "http://localhost:8081",
    config.urls.apiOrigin,
  ].filter(Boolean) as string[];

  // Add dynamic server IP based origins
  if (config.urls.serverIp && config.urls.serverIp !== "localhost") {
    origins.push(
      `http://${config.urls.serverIp}:19006`,
      `http://${config.urls.serverIp}:8081`
    );
  }

  // In development, allow all origins
  if (config.isDevelopment) {
    return ["*"];
  }

  return [...new Set(origins)]; // Remove duplicates
}

// Export type for type safety
export type Config = typeof config;

export default config;
