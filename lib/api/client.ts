/**
 * Core API client with retry, interceptors, and error handling
 * @module lib/api/client
 */

import { ApiConfig } from './config';
import { ApiError, ApiErrorType } from './errors';
import { RetryHandler, DEFAULT_RETRY_CONFIG } from './retry';
import {
  InterceptorManager,
  authInterceptor,
  loggingInterceptor,
  responseLoggingInterceptor,
  contentTypeInterceptor,
} from './interceptors';
import { ApiResponse, ApiRequestConfig } from './types';

/**
 * Singleton API client for making HTTP requests
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Request/response interceptors for auth and logging
 * - Timeout handling
 * - Flexible response parsing (handles multiple formats)
 * - Type-safe responses
 *
 * @example
 * ```typescript
 * const client = APIClient.getInstance();
 * const response = await client.get<Client[]>('/api/clients', { limit: 30 });
 * if (response.success) {
 *   console.log(response.data);
 * }
 * ```
 */
export class APIClient {
  private static instance: APIClient;
  private config: ApiConfig;
  private retryHandler: RetryHandler;
  private interceptors: InterceptorManager;
  private defaultTimeout = 30000; // 30 seconds

  private constructor() {
    this.config = ApiConfig.getInstance();
    this.retryHandler = new RetryHandler(DEFAULT_RETRY_CONFIG);
    this.interceptors = new InterceptorManager();

    // Register default interceptors
    this.interceptors.addRequestInterceptor(contentTypeInterceptor);
    this.interceptors.addRequestInterceptor(authInterceptor);
    this.interceptors.addRequestInterceptor(loggingInterceptor);
    this.interceptors.addResponseInterceptor(responseLoggingInterceptor);

    console.log('[APIClient] Initialized with base URL:', this.config.getBaseUrl());
  }

  /**
   * Get singleton instance
   */
  static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient();
    }
    return APIClient.instance;
  }

  /**
   * Make HTTP request with retry and error handling
   *
   * @param endpoint - API endpoint path
   * @param options - Request configuration
   * @returns Typed API response
   */
  async request<T = any>(
    endpoint: string,
    options: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = DEFAULT_RETRY_CONFIG.maxRetries,
      skipAuth = false,
      skipInterceptors = false,
      ...fetchOptions
    } = options;

    const url = this.config.buildUrl(endpoint);

    return this.retryHandler.executeWithRetry(async () => {
      try {
        // Prepare request config
        let finalUrl = url;
        let finalConfig: RequestInit = {
          ...fetchOptions,
          headers: {
            ...fetchOptions.headers,
          },
        };

        // Run request interceptors
        if (!skipInterceptors) {
          const intercepted = await this.interceptors.runRequestInterceptors(
            finalUrl,
            finalConfig
          );
          finalUrl = intercepted.url;
          finalConfig = intercepted.config;
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        let response: Response;
        try {
          // Make the request
          response = await fetch(finalUrl, {
            ...finalConfig,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);

          // Handle abort (timeout)
          if (fetchError.name === 'AbortError') {
            throw ApiError.timeoutError(`Request timed out after ${timeout}ms`);
          }

          // Handle network errors (only actual fetch failures, not response parsing)
          throw ApiError.networkError(fetchError.message || 'Network request failed');
        }

        // Run response interceptors (outside fetch try-catch to avoid catching ApiErrors as network errors)
        const finalResponse = skipInterceptors
          ? response
          : await this.interceptors.runResponseInterceptors(response);

        // Parse and return response (outside fetch try-catch to avoid catching ApiErrors as network errors)
        return await this.parseResponse<T>(finalResponse);
      } catch (error) {
        // Re-throw ApiError instances
        if (error instanceof ApiError) {
          throw error;
        }

        // Wrap unknown errors
        throw new ApiError(
          error instanceof Error ? error.message : 'Unknown error occurred',
          ApiErrorType.UNKNOWN_ERROR
        );
      }
    });
  }

  /**
   * Normalize event fields from backend format to mobile app format
   * Backend uses: startDateTime, endDateTime
   * Mobile uses: startTime, endTime
   *
   * @private
   */
  private normalizeEventFields(event: any): any {
    if (!event || typeof event !== 'object') {
      return event;
    }

    const normalized = { ...event };

    // Map startDateTime -> startTime
    if (event.startDateTime && !event.startTime) {
      normalized.startTime = event.startDateTime;
      delete normalized.startDateTime;
    }

    // Map endDateTime -> endTime
    if (event.endDateTime && !event.endTime) {
      normalized.endTime = event.endDateTime;
      delete normalized.endDateTime;
    }

    return normalized;
  }

  /**
   * Parse and validate response
   *
   * Handles multiple response formats:
   * 1. { success: true, data: {...} }
   * 2. Direct array: [...]
   * 3. { data: [...] } or { clients: [...] }
   * 4. Direct object: {...}
   *
   * @private
   */
  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let data: any;

    try {
      const text = await response.text();
      console.log(`[APIClient] Response text (${response.status}):`, text.substring(0, 200));
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      // JSON parsing failed
      console.error('[APIClient] JSON parse failed:', parseError);

      if (response.ok) {
        // Request was successful but response not JSON
        return {
          success: true,
          data: null as any,
        };
      }

      throw new ApiError(
        `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
        ApiErrorType.UNKNOWN_ERROR,
        response.status
      );
    }

    // Handle error responses
    if (!response.ok) {
      throw ApiError.fromResponse(response, data);
    }

    // Handle multiple response formats

    // Format 1: { success: true, data: {...}, ... } or { success: true, receipt: {...}, ... }
    if (typeof data === 'object' && data !== null && 'success' in data) {
      if ('data' in data) {
        return data as ApiResponse<T>;
      }
      // Handle { success: true, receipt: {...} } format
      if ('receipt' in data) {
        return {
          success: data.success,
          data: data.receipt as T,
        };
      }
      // Handle { success: true, event: {...} } format (singular event from create/update)
      if ('event' in data) {
        return {
          success: data.success,
          data: this.normalizeEventFields(data.event) as T,
        };
      }
    }

    // Format 2: Direct array [...]
    if (Array.isArray(data)) {
      return {
        success: true,
        data: data as T,
      };
    }

    // Format 3: Object with data/clients/conversations property
    if (typeof data === 'object' && data !== null) {
      const dataKeys = ['data', 'clients', 'conversations', 'messages', 'events', 'receipts'];
      const dataKey = Object.keys(data).find((key) => dataKeys.includes(key));

      if (dataKey && Array.isArray(data[dataKey])) {
        // Normalize event fields for events array
        const normalizedData = dataKey === 'events'
          ? data[dataKey].map((event: any) => this.normalizeEventFields(event))
          : data[dataKey];

        return {
          success: true,
          data: normalizedData as T,
          total: data.total,
          page: data.page,
          limit: data.limit,
        };
      }
    }

    // Format 4: Direct object response
    return {
      success: true,
      data: data as T,
    };
  }

  /**
   * GET request
   *
   * @param endpoint - API endpoint
   * @param params - Query parameters
   * @param config - Request configuration
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    let url = endpoint;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const queryString = searchParams.toString();
      if (queryString) {
        url = `${endpoint}?${queryString}`;
      }
    }

    return this.request<T>(url, {
      method: 'GET',
      ...config,
    });
  }

  /**
   * POST request
   *
   * @param endpoint - API endpoint
   * @param body - Request body
   * @param config - Request configuration
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...config,
    });
  }

  /**
   * PUT request
   *
   * @param endpoint - API endpoint
   * @param body - Request body
   * @param config - Request configuration
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...config,
    });
  }

  /**
   * PATCH request
   *
   * @param endpoint - API endpoint
   * @param body - Request body
   * @param config - Request configuration
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...config,
    });
  }

  /**
   * DELETE request
   *
   * @param endpoint - API endpoint
   * @param config - Request configuration
   */
  async delete<T = any>(
    endpoint: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...config,
    });
  }

  /**
   * Get interceptor manager for adding custom interceptors
   */
  getInterceptors(): InterceptorManager {
    return this.interceptors;
  }

  /**
   * Update base URL (useful for switching environments)
   */
  setBaseUrl(url: string): void {
    this.config.setBaseUrl(url);
  }

  /**
   * Get current base URL
   */
  getBaseUrl(): string {
    return this.config.getBaseUrl();
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Parameters<RetryHandler['updateConfig']>[0]): void {
    this.retryHandler.updateConfig(config);
  }
}

/**
 * Export singleton instance for convenience
 */
export const apiClient = APIClient.getInstance();
