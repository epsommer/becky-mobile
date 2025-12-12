/**
 * Retry logic with exponential backoff for API requests
 * @module lib/api/retry
 */

import { ApiError, ApiErrorType } from './errors';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds before first retry */
  initialDelay: number;
  /** Maximum delay in milliseconds between retries */
  maxDelay: number;
  /** Multiplier for exponential backoff (typically 2) */
  backoffMultiplier: number;
  /** HTTP status codes that should trigger retries */
  retryableStatuses: number[];
  /** Error types that should trigger retries */
  retryableErrorTypes: ApiErrorType[];
}

/**
 * Default retry configuration
 *
 * - 3 retries maximum
 * - 1 second initial delay
 * - 10 second max delay
 * - 2x exponential backoff
 * - Retry on: 408, 429, 500, 502, 503, 504
 * - Retry on: NETWORK_ERROR, TIMEOUT_ERROR, SERVER_ERROR
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrorTypes: [
    ApiErrorType.NETWORK_ERROR,
    ApiErrorType.TIMEOUT_ERROR,
    ApiErrorType.SERVER_ERROR,
  ],
};

/**
 * Handles automatic retries with exponential backoff
 *
 * Uses jitter to prevent thundering herd problem when multiple
 * clients retry simultaneously.
 *
 * @example
 * ```typescript
 * const handler = new RetryHandler({ maxRetries: 5 });
 * const result = await handler.executeWithRetry(async () => {
 *   return await fetch('https://api.example.com/data');
 * });
 * ```
 */
export class RetryHandler {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute function with automatic retry on failure
   *
   * @param fn - Async function to execute
   * @param attempt - Current attempt number (internal use)
   * @returns Result from successful execution
   * @throws Last error if all retries exhausted
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const shouldRetry = this.shouldRetry(error, attempt);

      if (!shouldRetry) {
        // No more retries, throw the error
        throw error;
      }

      const delay = this.calculateDelay(attempt);
      console.log(
        `[RetryHandler] Retry attempt ${attempt + 1}/${this.config.maxRetries} after ${delay}ms`,
        error instanceof ApiError ? error.type : error
      );

      await this.sleep(delay);
      return this.executeWithRetry(fn, attempt + 1);
    }
  }

  /**
   * Determine if error should trigger a retry
   *
   * @private
   * @param error - Error that occurred
   * @param attempt - Current attempt number
   * @returns true if should retry
   */
  private shouldRetry(error: any, attempt: number): boolean {
    // Check if we've exceeded max retries
    if (attempt >= this.config.maxRetries) {
      console.log('[RetryHandler] Max retries exceeded');
      return false;
    }

    // Handle ApiError instances
    if (error instanceof ApiError) {
      console.log('[RetryHandler] Error details:', {
        type: error.type,
        statusCode: error.statusCode,
        message: error.message,
        isRetryableType: this.config.retryableErrorTypes.includes(error.type),
        isRetryableStatus: error.statusCode && this.config.retryableStatuses.includes(error.statusCode),
      });

      // Check if error type is retryable
      if (this.config.retryableErrorTypes.includes(error.type)) {
        console.log('[RetryHandler] Retrying due to error type:', error.type);
        return true;
      }

      // Check if status code is retryable
      if (
        error.statusCode &&
        this.config.retryableStatuses.includes(error.statusCode)
      ) {
        console.log('[RetryHandler] Retrying due to status code:', error.statusCode);
        return true;
      }

      // ApiError but not retryable - 404 should fall here
      console.log('[RetryHandler] Not retrying - error type/status not retryable');
      return false;
    }

    // For non-ApiError (unexpected errors), don't retry
    console.log('[RetryHandler] Not an ApiError, not retrying:', typeof error, error?.constructor?.name);
    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   *
   * Formula: min(initialDelay * (multiplier ^ attempt) + jitter, maxDelay)
   *
   * Jitter is random variation (±30%) to prevent thundering herd
   *
   * @private
   * @param attempt - Current attempt number
   * @returns Delay in milliseconds
   */
  private calculateDelay(attempt: number): number {
    // Calculate exponential delay
    const exponentialDelay =
      this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt);

    // Add jitter: random variation between -30% and +30%
    const jitterRange = 0.3;
    const jitter = exponentialDelay * jitterRange * (Math.random() * 2 - 1);

    // Apply max delay cap
    const delay = Math.min(exponentialDelay + jitter, this.config.maxDelay);

    return Math.round(delay);
  }

  /**
   * Sleep for specified milliseconds
   *
   * @private
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration
   *
   * @param config - Partial configuration to merge with existing
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}
