import { TFunction } from 'i18next';
import { Alert, Platform } from 'react-native';

/**
 * Safely get error message from any error type
 * Prevents "error?.message?.includes is not a function" errors
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
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.message === "string") {
      return errorObj.message;
    }
    if (typeof errorObj.error === "string") {
      return errorObj.error;
    }
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

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  userId?: string;
  context?: string;
}

export class ErrorHandler {
  private static errors: AppError[] = [];
  private static maxErrors = 50;

  // Log error for debugging and analytics
  static logError(error: AppError): void {
    this.errors.unshift(error);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    if (__DEV__) {
      console.error('App Error:', error);
    }

    // In production, send to analytics service
    if (!__DEV__) {
      this.sendToAnalytics(error);
    }
  }

  // Handle API errors with user-friendly messages
  static handleApiError(error: any, t: TFunction, context?: string): string {
    const appError: AppError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      details: error.response?.data || error,
      timestamp: new Date(),
      context,
    };

    this.logError(appError);

    // Map common error codes to user-friendly messages
    const errorMap: Record<string, string> = {
      'ERR_NETWORK': t('common.network_error'),
      'ERR_BAD_REQUEST': t('common.invalid_data'),
      'ERR_UNAUTHORIZED': t('common.authentication_error'),
      'ERR_FORBIDDEN': t('common.authorization_error'),
      'ERR_NOT_FOUND': t('common.not_found'),
      'ERR_TIMEOUT': t('common.timeout_error'),
      'ERR_SERVER': t('common.server_error'),
      'QUOTA_EXCEEDED': t('common.quota_exceeded'),
      'RATE_LIMIT': t('common.rate_limit'),
    };

    // Check HTTP status codes
    const status = error.response?.status;
    if (status) {
      switch (status) {
        case 400:
          return t('common.invalid_data');
        case 401:
          return t('common.authentication_error');
        case 403:
          return t('common.authorization_error');
        case 404:
          return t('common.not_found');
        case 429:
          return t('common.rate_limit');
        case 500:
        case 502:
        case 503:
        case 504:
          return t('common.server_error');
        default:
          break;
      }
    }

    return errorMap[appError.code] || appError.message || t('common.error');
  }

  // Show user-friendly error alert
  static showError(
    error: any,
    t: TFunction,
    context?: string,
    onRetry?: () => void
  ): void {
    const message = this.handleApiError(error, t, context);
    
    const buttons = [
      {
        text: t('common.ok'),
        style: 'default' as const,
      },
    ];

    if (onRetry) {
      buttons.unshift({
        text: t('common.retry'),
        style: 'default' as const,
      });
    }

    Alert.alert(
      t('common.error'),
      message,
      buttons
    );
  }

  // Show success message
  static showSuccess(message: string, t: TFunction): void {
    if (Platform.OS === 'android') {
      // Use ToastAndroid for Android
      const { ToastAndroid } = require('react-native');
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(t('common.success'), message);
    }
  }

  // Handle network connectivity errors
  static handleNetworkError(t: TFunction, onRetry?: () => void): void {
    Alert.alert(
      t('common.connection_error'),
      t('common.network_error'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        ...(onRetry ? [{
          text: t('common.retry'),
          onPress: onRetry,
        }] : []),
      ]
    );
  }

  // Handle permission errors
  static handlePermissionError(permission: string, t: TFunction): void {
    Alert.alert(
      t('common.permission_denied'),
      `${permission} permission is required for this feature.`,
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.settings'),
          onPress: () => {
            // Open app settings
            if (Platform.OS === 'ios') {
              const { Linking } = require('react-native');
              Linking.openURL('app-settings:');
            } else {
              const { Linking } = require('react-native');
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }

  // Get all logged errors (for debugging)
  static getErrors(): AppError[] {
    return [...this.errors];
  }

  // Clear error log
  static clearErrors(): void {
    this.errors = [];
  }

  // Send error to analytics service
  private static sendToAnalytics(error: AppError): void {
    // Implement your analytics service here
    // Example: Firebase Crashlytics, Sentry, etc.
    console.log('Sending error to analytics:', error);
  }

  // Validate form data and return errors
  static validateForm(
    data: Record<string, any>,
    rules: Record<string, (value: any) => string | null>,
    t: TFunction
  ): Record<string, string> {
    const errors: Record<string, string> = {};

    Object.keys(rules).forEach(field => {
      const value = data[field];
      const error = rules[field](value);
      if (error) {
        errors[field] = error;
      }
    });

    return errors;
  }

  // Common validation rules
  static validationRules = {
    required: (fieldName: string, t: TFunction) => (value: any) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return `${fieldName} ${t('common.required').toLowerCase()}`;
      }
      return null;
    },

    email: (t: TFunction) => (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        return t('auth.email_validation_error');
      }
      return null;
    },

    minLength: (fieldName: string, min: number, t: TFunction) => (value: string) => {
      if (value && value.length < min) {
        return `${fieldName} must be at least ${min} characters`;
      }
      return null;
    },

    numeric: (fieldName: string, t: TFunction) => (value: any) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (value && isNaN(num)) {
        return `${fieldName} must be a number`;
      }
      return null;
    },

    range: (fieldName: string, min: number, max: number, t: TFunction) => (value: any) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (value && (isNaN(num) || num < min || num > max)) {
        return `${fieldName} must be between ${min} and ${max}`;
      }
      return null;
    },
  };
}