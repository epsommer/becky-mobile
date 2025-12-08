/**
 * Custom error classes for API error handling
 * @module lib/api/errors
 */

import { ApiErrorType } from './types';

// Re-export ApiErrorType for convenience
export { ApiErrorType } from './types';

/**
 * Custom API error class with typed error categories
 *
 * @example
 * ```typescript
 * throw new ApiError('Not found', ApiErrorType.VALIDATION_ERROR, 404);
 * ```
 */
export class ApiError extends Error {
  /** Type of API error */
  type: ApiErrorType;

  /** HTTP status code if applicable */
  statusCode?: number;

  /** Raw response data from server */
  responseData?: any;

  constructor(
    message: string,
    type: ApiErrorType = ApiErrorType.UNKNOWN_ERROR,
    statusCode?: number,
    responseData?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.statusCode = statusCode;
    this.responseData = responseData;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Create ApiError from HTTP Response
   *
   * Maps status codes to appropriate error types:
   * - 401/403 → AUTH_ERROR
   * - 400 → VALIDATION_ERROR
   * - 500+ → SERVER_ERROR
   *
   * @param response - Fetch API Response object
   * @param data - Parsed response body
   * @returns Typed ApiError instance
   */
  static fromResponse(response: Response, data?: any): ApiError {
    let type = ApiErrorType.UNKNOWN_ERROR;
    let message = 'An unexpected error occurred';

    // Determine error type based on status code
    if (response.status === 401 || response.status === 403) {
      type = ApiErrorType.AUTH_ERROR;
      message = data?.error || data?.message || 'Authentication required';
    } else if (response.status === 400) {
      type = ApiErrorType.VALIDATION_ERROR;
      message = data?.error || data?.message || 'Invalid request';
    } else if (response.status >= 500) {
      type = ApiErrorType.SERVER_ERROR;
      message = data?.error || data?.message || 'Server error occurred';
    } else if (response.status >= 400) {
      type = ApiErrorType.UNKNOWN_ERROR;
      message = data?.error || data?.message || response.statusText || 'Request failed';
    }

    return new ApiError(message, type, response.status, data);
  }

  /**
   * Create network error (no connection)
   */
  static networkError(message = 'Network connection failed'): ApiError {
    return new ApiError(message, ApiErrorType.NETWORK_ERROR);
  }

  /**
   * Create timeout error (request exceeded timeout)
   */
  static timeoutError(message = 'Request timed out'): ApiError {
    return new ApiError(message, ApiErrorType.TIMEOUT_ERROR);
  }

  /**
   * Check if error is retryable
   *
   * Retryable errors include:
   * - Network errors (connection issues)
   * - Timeout errors
   * - Server errors (500+)
   * - Rate limit errors (429)
   *
   * @returns true if error should be retried
   */
  isRetryable(): boolean {
    // Network and timeout errors are always retryable
    if (
      this.type === ApiErrorType.NETWORK_ERROR ||
      this.type === ApiErrorType.TIMEOUT_ERROR
    ) {
      return true;
    }

    // Server errors (500+) are retryable
    if (this.type === ApiErrorType.SERVER_ERROR) {
      return true;
    }

    // Specific status codes that are retryable
    const retryableStatuses = [408, 429, 502, 503, 504];
    if (this.statusCode && retryableStatuses.includes(this.statusCode)) {
      return true;
    }

    return false;
  }

  /**
   * Get user-friendly error message
   *
   * Provides cleaner messages for display to end users
   */
  getUserMessage(): string {
    switch (this.type) {
      case ApiErrorType.NETWORK_ERROR:
        return 'Unable to connect. Please check your internet connection.';
      case ApiErrorType.TIMEOUT_ERROR:
        return 'Request timed out. Please try again.';
      case ApiErrorType.AUTH_ERROR:
        return 'Session expired. Please log in again.';
      case ApiErrorType.VALIDATION_ERROR:
        return this.message || 'Invalid request. Please check your input.';
      case ApiErrorType.SERVER_ERROR:
        return 'Server error. Please try again later.';
      default:
        return this.message || 'An unexpected error occurred.';
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      statusCode: this.statusCode,
      responseData: this.responseData,
      stack: this.stack,
    };
  }
}
