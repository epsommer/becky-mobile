/**
 * Request and response interceptors for API client
 * @module lib/api/interceptors
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Request interceptor function signature
 *
 * Interceptors can modify URL and config before request is sent
 */
export type RequestInterceptor = (
  url: string,
  config: RequestInit
) => Promise<{ url: string; config: RequestInit }>;

/**
 * Response interceptor function signature
 *
 * Interceptors can inspect or modify response after it's received
 */
export type ResponseInterceptor = (response: Response) => Promise<Response>;

/**
 * Manages request and response interceptors
 *
 * @example
 * ```typescript
 * const manager = new InterceptorManager();
 * manager.addRequestInterceptor(authInterceptor);
 * manager.addResponseInterceptor(loggingInterceptor);
 * ```
 */
export class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  /**
   * Add request interceptor
   *
   * Interceptors run in the order they are added
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   *
   * Interceptors run in the order they are added
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Remove all request interceptors
   */
  clearRequestInterceptors(): void {
    this.requestInterceptors = [];
  }

  /**
   * Remove all response interceptors
   */
  clearResponseInterceptors(): void {
    this.responseInterceptors = [];
  }

  /**
   * Run all request interceptors in sequence
   *
   * @param url - Request URL
   * @param config - Fetch config
   * @returns Modified URL and config
   */
  async runRequestInterceptors(
    url: string,
    config: RequestInit
  ): Promise<{ url: string; config: RequestInit }> {
    let result = { url, config };

    for (const interceptor of this.requestInterceptors) {
      result = await interceptor(result.url, result.config);
    }

    return result;
  }

  /**
   * Run all response interceptors in sequence
   *
   * @param response - Fetch response
   * @returns Modified response
   */
  async runResponseInterceptors(response: Response): Promise<Response> {
    let result = response;

    for (const interceptor of this.responseInterceptors) {
      result = await interceptor(result);
    }

    return result;
  }
}

// ============================================================================
// Built-in Interceptors
// ============================================================================

/**
 * Authentication interceptor
 *
 * Automatically injects JWT token from AsyncStorage into Authorization header
 *
 * @example
 * ```typescript
 * manager.addRequestInterceptor(authInterceptor);
 * ```
 */
export const authInterceptor: RequestInterceptor = async (url, config) => {
  try {
    // Get auth token from AsyncStorage
    const token = await AsyncStorage.getItem('auth_token');
    console.log('[authInterceptor] Retrieved token:', token ? `${token.substring(0, 20)}...` : 'null');

    if (token) {
      // Clone headers to avoid mutation
      const headers = new Headers(config.headers);
      // Use standard Authorization header for mobile JWT
      headers.set('authorization', `Bearer ${token}`);
      console.log('[authInterceptor] Added authorization header');

      return {
        url,
        config: {
          ...config,
          headers,
        },
      };
    } else {
      console.warn('[authInterceptor] No token found in AsyncStorage');
    }
  } catch (error) {
    console.warn('[authInterceptor] Failed to retrieve auth token:', error);
  }

  // Return unchanged if no token or error
  console.log('[authInterceptor] Returning config without auth');
  return { url, config };
};

/**
 * Request logging interceptor
 *
 * Logs outgoing requests for debugging
 *
 * @example
 * ```typescript
 * manager.addRequestInterceptor(loggingInterceptor);
 * ```
 */
export const loggingInterceptor: RequestInterceptor = async (url, config) => {
  const method = config.method || 'GET';
  console.log(`[API Request] ${method} ${url}`);

  // Log headers
  if (config.headers) {
    const headers = config.headers instanceof Headers
      ? Object.fromEntries(config.headers.entries())
      : config.headers;
    console.log('[API Request Headers]', headers);
  }

  // Log request body for POST/PATCH/PUT
  if (config.body && ['POST', 'PATCH', 'PUT'].includes(method)) {
    try {
      const body = JSON.parse(config.body as string);
      console.log('[API Request Body]', body);
    } catch {
      // Body not JSON, skip logging
    }
  }

  return { url, config };
};

/**
 * Response logging interceptor
 *
 * Logs response status and timing
 *
 * @example
 * ```typescript
 * manager.addResponseInterceptor(responseLoggingInterceptor);
 * ```
 */
export const responseLoggingInterceptor: ResponseInterceptor = async (
  response
) => {
  const status = response.status;
  const statusText = response.statusText;
  const url = response.url;

  if (status >= 400) {
    console.warn(`[API Response] ${status} ${statusText} - ${url}`);
  } else {
    console.log(`[API Response] ${status} ${statusText} - ${url}`);
  }

  return response;
};

/**
 * Content-Type interceptor
 *
 * Ensures JSON content-type is set for requests with body
 *
 * @example
 * ```typescript
 * manager.addRequestInterceptor(contentTypeInterceptor);
 * ```
 */
export const contentTypeInterceptor: RequestInterceptor = async (url, config) => {
  if (config.body) {
    const headers = new Headers(config.headers);

    // Set Content-Type if not already set
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return {
      url,
      config: {
        ...config,
        headers,
      },
    };
  }

  return { url, config };
};

/**
 * CORS interceptor for development
 *
 * Adds credentials: 'include' for CORS requests
 *
 * @example
 * ```typescript
 * manager.addRequestInterceptor(corsInterceptor);
 * ```
 */
export const corsInterceptor: RequestInterceptor = async (url, config) => {
  return {
    url,
    config: {
      ...config,
      credentials: 'include',
    },
  };
};

/**
 * Rate limit interceptor
 *
 * Logs rate limit headers from response
 */
export const rateLimitInterceptor: ResponseInterceptor = async (response) => {
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const limit = response.headers.get('X-RateLimit-Limit');
  const reset = response.headers.get('X-RateLimit-Reset');

  if (remaining !== null && limit !== null) {
    console.log(`[RateLimit] ${remaining}/${limit} requests remaining`);

    if (parseInt(remaining) < 10) {
      console.warn('[RateLimit] Low on API requests!');
    }

    if (reset) {
      const resetDate = new Date(parseInt(reset) * 1000);
      console.log(`[RateLimit] Resets at ${resetDate.toLocaleTimeString()}`);
    }
  }

  return response;
};
