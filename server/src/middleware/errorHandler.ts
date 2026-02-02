/**
 * Enhanced Error Handler Middleware
 * Provides structured error responses with proper error classification
 * AWS/Cloud-ready with request ID tracking
 */

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

// Custom error types for better error handling
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(401, message, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(403, message, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(404, `${resource} not found`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT_ERROR");
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number = 60) {
    super(429, "Too many requests, please try again later", "RATE_LIMIT_EXCEEDED", { retryAfter });
    this.name = "RateLimitError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed") {
    super(503, message, "DATABASE_ERROR");
    this.name = "DatabaseError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(502, message || `${service} service unavailable`, "EXTERNAL_SERVICE_ERROR", { service });
    this.name = "ExternalServiceError";
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
    requestId?: string;
  };
  timestamp: string;
}

// Helper to determine if error details should be exposed
function shouldExposeDetails(statusCode: number): boolean {
  // Only expose details for client errors (4xx), not server errors (5xx)
  return statusCode >= 400 && statusCode < 500;
}

// Helper to sanitize error message for production
function sanitizeMessage(message: string, isProduction: boolean): string {
  if (!isProduction) return message;

  // Remove potentially sensitive information from error messages
  const sensitivePatterns = [
    /password/gi,
    /secret/gi,
    /token/gi,
    /key/gi,
    /credential/gi,
    /connection string/gi,
    /database.*url/gi,
  ];

  let sanitized = message;
  for (const pattern of sensitivePatterns) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    }
  }

  return sanitized;
}

// Convert Prisma errors to AppErrors
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case "P2002":
      // Unique constraint violation
      const field = (error.meta?.target as string[])?.join(", ") || "field";
      return new ConflictError(`A record with this ${field} already exists`);

    case "P2025":
      // Record not found
      return new NotFoundError("Record");

    case "P2003":
      // Foreign key constraint failed
      return new ValidationError("Invalid reference: related record not found");

    case "P2014":
      // Required relation violation
      return new ValidationError("The change you are trying to make would violate required relations");

    default:
      return new DatabaseError(`Database operation failed: ${error.code}`);
  }
}

// Main error handler middleware
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === "production";
  const requestId = (req as any).requestId || req.headers["x-request-id"];

  // Default values
  let statusCode = 500;
  let message = "An unexpected error occurred";
  let code = "INTERNAL_ERROR";
  let details: unknown = undefined;

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || code;
    details = shouldExposeDetails(statusCode) ? error.details : undefined;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    code = "VALIDATION_ERROR";
    details = error.errors.map(e => ({
      path: e.path.join("."),
      message: e.message,
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(error);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
    code = prismaError.code || code;
    details = shouldExposeDetails(statusCode) ? prismaError.details : undefined;
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    message = "Database connection failed";
    code = "DATABASE_CONNECTION_ERROR";
  } else if (error instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = 500;
    message = "Database error";
    code = "DATABASE_PANIC";
  } else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    code = "INVALID_TOKEN";
  } else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    code = "TOKEN_EXPIRED";
  } else if ((error as any).type === "entity.too.large") {
    statusCode = 413;
    message = "Request body too large";
    code = "PAYLOAD_TOO_LARGE";
  } else if ((error as any).code === "ECONNREFUSED") {
    statusCode = 503;
    message = "Service temporarily unavailable";
    code = "CONNECTION_REFUSED";
  }

  // Log error (with different levels based on status code)
  const logMessage = `[${requestId || "no-id"}] ${statusCode} ${code}: ${message}`;

  if (statusCode >= 500) {
    console.error(`${logMessage}\n`, error.stack || error);
  } else if (statusCode >= 400) {
    console.warn(logMessage);
  }

  // Build response
  const response: ErrorResponse = {
    success: false,
    error: {
      message: sanitizeMessage(message, isProduction),
      code,
      ...(details && !isProduction && { details }),
      ...(requestId && { requestId }),
    },
    timestamp: new Date().toISOString(),
  };

  // Set appropriate headers
  if (statusCode === 429) {
    const retryAfter = (error as AppError).details as { retryAfter?: number };
    res.set("Retry-After", String(retryAfter?.retryAfter || 60));
  }

  if (statusCode === 503) {
    res.set("Retry-After", "5");
  }

  // Send response
  res.status(statusCode).json(response);
}

// Async handler wrapper to catch async errors
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default errorHandler;
