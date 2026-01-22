/**
 * Safe error handling utilities
 * Prevents "error?.message?.includes is not a function" and similar errors
 */

/**
 * Safely get error message from any error type
 * Handles: Error objects, strings, objects with message property, undefined, null
 */
export function getErrorMessage(error: unknown): string {
  if (error === null || error === undefined) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message || "Unknown error";
  }

  if (typeof error === "object") {
    // Handle objects with message property
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.message === "string") {
      return errorObj.message;
    }
    if (typeof errorObj.error === "string") {
      return errorObj.error;
    }
    // Try to stringify
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error object";
    }
  }

  return String(error);
}

/**
 * Safely check if error message includes a substring
 * Returns false if error or message is invalid
 */
export function errorMessageIncludes(error: unknown, substring: string): boolean {
  const message = getErrorMessage(error);
  return message.toLowerCase().includes(substring.toLowerCase());
}

/**
 * Safely check if error message includes any of the substrings
 */
export function errorMessageIncludesAny(error: unknown, substrings: string[]): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return substrings.some((s) => message.includes(s.toLowerCase()));
}

/**
 * Type guard to check if value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Create a standardized error response object
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage = "An error occurred"
): {
  success: false;
  error: string;
  details?: string;
} {
  const message = getErrorMessage(error);
  return {
    success: false,
    error: message || defaultMessage,
    details: isError(error) ? error.stack : undefined,
  };
}
