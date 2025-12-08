/**
 * API configuration and URL resolution
 * @module lib/api/config
 */

import Constants from 'expo-constants';

/**
 * Singleton configuration manager for API base URL resolution
 *
 * Resolution order:
 * 1. Environment variable: process.env.BECKY_API_URL
 * 2. Global variable: (global as any).BECKY_API_URL
 * 3. Expo config: Constants.expoConfig?.extra?.backendUrl
 * 4. Development server: http://{hostUri}:3000
 * 5. Fallback: https://evangelosommer.com
 *
 * @example
 * ```typescript
 * const config = ApiConfig.getInstance();
 * const url = config.buildUrl('/api/clients');
 * // => 'https://evangelosommer.com/api/clients'
 * ```
 */
export class ApiConfig {
  private static instance: ApiConfig;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = this.resolveBaseUrl();
    console.log(`[ApiConfig] Resolved base URL: ${this.baseUrl}`);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ApiConfig {
    if (!ApiConfig.instance) {
      ApiConfig.instance = new ApiConfig();
    }
    return ApiConfig.instance;
  }

  /**
   * Resolve base URL from various sources
   *
   * @private
   * @returns Base URL without trailing slash
   */
  private resolveBaseUrl(): string {
    // Priority 1: Environment variable
    const envUrl = process.env.BECKY_API_URL || (global as any).BECKY_API_URL;
    if (envUrl) {
      console.log('[ApiConfig] Using BECKY_API_URL from environment');
      return envUrl.replace(/\/+$/, '');
    }

    // Priority 2: Expo manifest extra config
    const manifestUrl =
      Constants.expoConfig?.extra?.backendUrl ||
      Constants.manifest?.extra?.backendUrl;

    if (manifestUrl) {
      console.log('[ApiConfig] Using backendUrl from Expo config');
      return manifestUrl.replace(/\/+$/, '');
    }

    // Priority 3: Development server (packager host)
    if (Constants.manifest?.packagerOpts?.hostUri) {
      const host = Constants.manifest.packagerOpts.hostUri.split(':')[0];
      const devUrl = `http://${host}:3000`;
      console.log('[ApiConfig] Using development server:', devUrl);
      return devUrl;
    }

    // Priority 4: Production fallback (use www to avoid redirect stripping auth headers)
    console.log('[ApiConfig] Using production fallback URL');
    return 'https://www.evangelosommer.com';
  }

  /**
   * Get current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Update base URL (for testing or dynamic configuration)
   *
   * @param url - New base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
    console.log(`[ApiConfig] Base URL updated to: ${this.baseUrl}`);
  }

  /**
   * Build full URL from endpoint path
   *
   * Automatically handles leading slashes
   *
   * @param endpoint - API endpoint path (e.g., '/api/clients' or 'api/clients')
   * @returns Full URL
   *
   * @example
   * ```typescript
   * buildUrl('/api/clients') // => 'https://evangelosommer.com/api/clients'
   * buildUrl('api/clients')  // => 'https://evangelosommer.com/api/clients'
   * ```
   */
  buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  /**
   * Check if currently using development server
   */
  isDevelopment(): boolean {
    return this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1');
  }

  /**
   * Check if currently using production server
   */
  isProduction(): boolean {
    return this.baseUrl.includes('evangelosommer.com');
  }
}
