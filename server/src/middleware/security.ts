/**
 * Security Middleware Module
 * Provides request ID tracking, input sanitization, and security headers
 * AWS/Cloud-ready with ALB/ELB compatibility
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Extend Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Request ID Middleware
 * Generates or forwards request IDs for tracing across services
 * Compatible with AWS ALB, API Gateway, and other load balancers
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check for existing request ID from various sources (AWS, other proxies)
  const existingId =
    req.headers["x-request-id"] ||
    req.headers["x-amzn-trace-id"] ||
    req.headers["x-correlation-id"];

  // Generate new ID if none exists (16 chars for brevity, cryptographically random)
  const requestId = typeof existingId === "string"
    ? existingId
    : crypto.randomBytes(8).toString("hex");

  req.requestId = requestId;
  req.startTime = Date.now();

  // Set response header for tracing
  res.setHeader("X-Request-ID", requestId);

  next();
}

/**
 * Security Headers Middleware
 * Additional security headers beyond Helmet defaults
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // XSS protection (legacy browsers)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy (restrict browser features)
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // Cache control for API responses
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  next();
}

/**
 * Input Sanitization Middleware
 * Sanitizes request body, query, and params to prevent XSS and injection
 */
export function sanitizeInputMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Sanitize body
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query) as typeof req.query;
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params) as typeof req.params;
  }

  next();
}

/**
 * Recursively sanitize object values
 */
function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key
    const sanitizedKey = sanitizeString(key);

    // Sanitize value based on type
    if (value === null || value === undefined) {
      sanitized[sanitizedKey] = value;
    } else if (typeof value === "string") {
      sanitized[sanitizedKey] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.map(item =>
        typeof item === "object" && item !== null
          ? sanitizeObject(item)
          : typeof item === "string"
          ? sanitizeString(item)
          : item
      );
    } else if (typeof value === "object") {
      sanitized[sanitizedKey] = sanitizeObject(value);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize string to prevent XSS, injection, and other malicious payloads
 */
function sanitizeString(str: string): string {
  if (!str || typeof str !== "string") return str;

  // Limit string length first to prevent DoS before any processing
  const MAX_STRING_LENGTH = 100000;
  if (str.length > MAX_STRING_LENGTH) {
    str = str.substring(0, MAX_STRING_LENGTH);
  }

  // Remove null bytes
  let sanitized = str.replace(/\0/g, "");

  // Trim excessive whitespace
  sanitized = sanitized.trim();

  // Remove script tags (including variations with whitespace and attributes)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove other dangerous HTML tags that can execute code
  sanitized = sanitized.replace(/<(iframe|object|embed|applet|form|meta|link|base)\b[^>]*>/gi, "");

  // Block javascript: and data: URI schemes
  sanitized = sanitized.replace(/javascript\s*:/gi, "");
  sanitized = sanitized.replace(/data\s*:\s*text\s*\/\s*(html|javascript)/gi, "");
  sanitized = sanitized.replace(/vbscript\s*:/gi, "");

  // Remove inline event handlers (onclick=, onerror=, onload=, etc.)
  sanitized = sanitized.replace(/on\w+\s*=/gi, "");

  // Block expression() CSS injection (IE legacy)
  sanitized = sanitized.replace(/expression\s*\(/gi, "");

  // Remove SVG-based XSS vectors
  sanitized = sanitized.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "");

  return sanitized;
}

/**
 * Request Logging Middleware
 * Logs request details with timing (development/debug mode)
 */
export function requestLoggingMiddleware(options: { slowThreshold?: number } = {}) {
  const { slowThreshold = 500 } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = req.startTime || Date.now();

    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const requestId = req.requestId || "-";

      // Determine log level based on status and duration
      let level = "info";
      let emoji = "✓";

      if (statusCode >= 500) {
        level = "error";
        emoji = "✗";
      } else if (statusCode >= 400) {
        level = "warn";
        emoji = "⚠";
      } else if (duration > slowThreshold) {
        level = "warn";
        emoji = "⏱";
      }

      // Skip logging for health checks in production
      if (process.env.NODE_ENV === "production" &&
          (req.path === "/health" || req.path === "/test")) {
        return;
      }

      const logMessage = `${emoji} [${requestId}] ${req.method} ${req.path} ${statusCode} ${duration}ms`;

      if (level === "error") {
        console.error(logMessage);
      } else if (level === "warn") {
        console.warn(logMessage);
      } else if (process.env.NODE_ENV === "development") {
        console.log(logMessage);
      }
    });

    next();
  };
}

/**
 * Prevent Parameter Pollution
 * Ensures query parameters are not arrays when they shouldn't be
 */
export function preventParameterPollution(req: Request, res: Response, next: NextFunction): void {
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) {
        // Keep only the last value for most parameters
        // Exception: known array parameters
        const arrayParams = ["tags", "ids", "categories", "fields"];
        if (!arrayParams.includes(key)) {
          req.query[key] = value[value.length - 1];
        }
      }
    }
  }
  next();
}

/**
 * Validate Content-Type for POST/PUT/PATCH requests to prevent unexpected payloads
 */
export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  const methodsRequiringBody = ["POST", "PUT", "PATCH"];

  if (methodsRequiringBody.includes(req.method)) {
    const contentType = req.headers["content-type"] || "";

    // Allow multipart for file uploads, JSON for API calls
    const isJson = contentType.includes("application/json");
    const isMultipart = contentType.includes("multipart/form-data");
    const isUrlEncoded = contentType.includes("application/x-www-form-urlencoded");

    // Skip validation for empty bodies (some PATCH requests may have no body)
    const hasBody = req.headers["content-length"] && parseInt(req.headers["content-length"]) > 0;

    if (hasBody && !isJson && !isMultipart && !isUrlEncoded) {
      res.status(415).json({
        success: false,
        error: "Unsupported Media Type. Use application/json.",
      });
      return;
    }
  }

  next();
}

/**
 * Combined security middleware stack
 * Returns an array of middleware to apply
 */
export function getSecurityMiddleware() {
  return [
    requestIdMiddleware,
    securityHeadersMiddleware,
    preventParameterPollution,
    sanitizeInputMiddleware,
  ];
}

export default {
  requestIdMiddleware,
  securityHeadersMiddleware,
  sanitizeInputMiddleware,
  requestLoggingMiddleware,
  preventParameterPollution,
  getSecurityMiddleware,
};
