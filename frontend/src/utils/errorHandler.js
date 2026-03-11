/**
 * ClearDeal API Error Handling Utilities
 * Industry-standard error handling for React applications
 */

// Error codes mapping to user-friendly messages
const ERROR_MESSAGES = {
  // Authentication Errors
  AUTH_1001: "Invalid email or password. Please check your credentials.",
  AUTH_1002: "Your session has expired. Please log in again.",
  AUTH_1003: "Invalid authentication token. Please log in again.",
  AUTH_1004: "You are not authorized to perform this action.",
  AUTH_1005: "An account with this email already exists.",
  
  // Validation Errors
  VAL_2001: "Please check your input and try again.",
  VAL_2002: "Required field is missing.",
  VAL_2003: "Invalid format. Please check your input.",
  VAL_2004: "Value is out of allowed range.",
  
  // Resource Errors
  RES_3001: "The requested item was not found.",
  RES_3002: "This item already exists.",
  RES_3003: "Conflict with existing data.",
  RES_3004: "This resource is currently locked.",
  
  // Business Logic Errors
  BIZ_4001: "Please complete your company registration first.",
  BIZ_4002: "This offer violates the price band limits.",
  BIZ_4003: "This action is not allowed in the current deal state.",
  BIZ_4004: "Manager approval is required for this action.",
  BIZ_4005: "You don't have permission for this action.",
  BIZ_4006: "Please complete verification first.",
  BIZ_4007: "This exceeds your budget ceiling.",
  
  // Database Errors
  DB_5001: "A database error occurred. Please try again.",
  DB_5002: "Unable to connect to the database.",
  DB_5003: "The request timed out. Please try again.",
  
  // External Service Errors
  EXT_6001: "External service is temporarily unavailable.",
  EXT_6002: "GST verification failed. Please try again.",
  EXT_6003: "Bank verification failed. Please try again.",
  EXT_6004: "Payment processing failed. Please try again.",
  
  // Rate Limiting
  RATE_7001: "Too many requests. Please wait a moment.",
  
  // Generic
  INTERNAL_ERROR: "An unexpected error occurred. Please try again.",
  NETWORK_ERROR: "Network error. Please check your connection.",
};

/**
 * Parse API error response and return user-friendly message
 * @param {Error|Object} error - Axios error or error object
 * @returns {Object} - { message, code, details }
 */
export function parseApiError(error) {
  // Network errors
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return {
        message: "Request timed out. Please try again.",
        code: "TIMEOUT",
        details: {}
      };
    }
    return {
      message: ERROR_MESSAGES.NETWORK_ERROR,
      code: "NETWORK_ERROR",
      details: { originalError: error.message }
    };
  }

  const { status, data } = error.response;

  // Handle structured error response from our API
  if (data?.error) {
    const errorCode = data.error.code;
    const serverMessage = data.error.message;
    const details = data.error.details || {};

    return {
      message: serverMessage || ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.INTERNAL_ERROR,
      code: errorCode,
      details
    };
  }

  // Handle legacy error format
  if (data?.detail) {
    return {
      message: typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail),
      code: `HTTP_${status}`,
      details: {}
    };
  }

  // Handle HTTP status codes
  switch (status) {
    case 400:
      return { message: "Invalid request. Please check your input.", code: "BAD_REQUEST", details: {} };
    case 401:
      return { message: ERROR_MESSAGES.AUTH_1002, code: "AUTH_1002", details: {} };
    case 403:
      return { message: ERROR_MESSAGES.AUTH_1004, code: "AUTH_1004", details: {} };
    case 404:
      return { message: ERROR_MESSAGES.RES_3001, code: "RES_3001", details: {} };
    case 409:
      return { message: ERROR_MESSAGES.RES_3003, code: "RES_3003", details: {} };
    case 422:
      return { message: ERROR_MESSAGES.VAL_2001, code: "VAL_2001", details: {} };
    case 429:
      return { message: ERROR_MESSAGES.RATE_7001, code: "RATE_7001", details: {} };
    case 500:
    case 502:
    case 503:
      return { message: "Server is temporarily unavailable. Please try again later.", code: "SERVER_ERROR", details: {} };
    default:
      return { message: ERROR_MESSAGES.INTERNAL_ERROR, code: "UNKNOWN", details: {} };
  }
}

/**
 * Format validation errors for form display
 * @param {Object} details - Error details from API
 * @returns {Object} - Field-level error messages
 */
export function formatValidationErrors(details) {
  const errors = {};
  
  if (details.validation_errors) {
    details.validation_errors.forEach(err => {
      errors[err.field] = err.message;
    });
  }
  
  if (details.field) {
    errors[details.field] = details.message || "Invalid value";
  }
  
  return errors;
}

/**
 * Check if error is an authentication error requiring re-login
 * @param {Object} error - Parsed error object
 * @returns {boolean}
 */
export function isAuthError(error) {
  const authCodes = ['AUTH_1002', 'AUTH_1003', 'AUTH_1004'];
  return authCodes.includes(error.code);
}

/**
 * Check if error is retryable
 * @param {Object} error - Parsed error object
 * @returns {boolean}
 */
export function isRetryableError(error) {
  const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR', 'DB_5002', 'DB_5003'];
  return retryableCodes.includes(error.code);
}

/**
 * Log error for debugging (can be sent to monitoring service)
 * @param {Object} error - Error object
 * @param {Object} context - Additional context
 */
export function logError(error, context = {}) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: error,
    context: context,
    url: window.location.href,
    userAgent: navigator.userAgent
  };
  
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('[ClearDeal Error]', errorLog);
  }
  
  // In production, send to monitoring service (e.g., Sentry)
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, { extra: context });
  // }
}

export default {
  parseApiError,
  formatValidationErrors,
  isAuthError,
  isRetryableError,
  logError,
  ERROR_MESSAGES
};
