/**
 * Google Calendar Service
 * Handles OAuth authentication and calendar sync operations for mobile app
 * Uses Expo AuthSession for OAuth flow and backend API for data operations
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calendarIntegrationsApi, CalendarIntegration } from '../api/endpoints/calendar-integrations';
import { Event, CreateEventData } from '../api/types';
import Constants from 'expo-constants';

// Complete auth session to allow redirect back to app
WebBrowser.maybeCompleteAuthSession();

// Storage keys
const STORAGE_KEYS = {
  GOOGLE_STATE: '@becky_google_oauth_state',
  PENDING_AUTH: '@becky_pending_google_auth',
};

// Google OAuth configuration
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface GoogleCalendarSyncResult {
  success: boolean;
  events?: Event[];
  count?: number;
  error?: string;
  requiresReauth?: boolean;
  syncedAt?: string;
}

export interface GoogleCalendarConnectionStatus {
  isConnected: boolean;
  integration: CalendarIntegration | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  calendarName: string | null;
  calendarEmail: string | null;
}

/**
 * Generate a random state string for OAuth CSRF protection
 */
function generateState(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Google Calendar Service for mobile app
 * Coordinates with backend API for secure OAuth and sync operations
 */
export class GoogleCalendarService {
  private static instance: GoogleCalendarService;

  private constructor() {}

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  /**
   * Get the OAuth redirect URI for the mobile app
   * Uses Expo's proxy auth for development and native deep linking for production
   */
  getRedirectUri(): string {
    // Use Expo's built-in auth proxy for development
    // In production, use your app's custom scheme
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'beckycrm',
      path: 'oauth/google/callback',
    });
    console.log('[GoogleCalendarService] Redirect URI:', redirectUri);
    return redirectUri;
  }

  /**
   * Initiate the Google OAuth flow
   * Opens browser for authentication and handles the callback
   *
   * Flow:
   * 1. Request auth URL from backend (includes user verification)
   * 2. Open browser to Google OAuth consent screen
   * 3. User grants permission, Google redirects to our mobile-callback endpoint
   * 4. Backend processes callback, stores integration, redirects to mobile app
   * 5. Mobile app receives deep link with integration ID
   */
  async initiateOAuth(): Promise<{ success: boolean; integrationId?: string; error?: string }> {
    try {
      console.log('[GoogleCalendarService] Initiating OAuth flow...');

      // Get the auth URL from our backend
      // The backend will:
      // - Verify the user's JWT
      // - Generate the proper Google OAuth URL with server credentials
      // - Include user email in state for callback verification
      const response = await calendarIntegrationsApi.initiateGoogleAuth();

      if (!response.success || !response.data?.authUrl) {
        console.error('[GoogleCalendarService] Failed to get auth URL:', response);
        return {
          success: false,
          error: response.error || 'Failed to initiate authentication'
        };
      }

      // Store the state for verification
      if (response.data.state) {
        await AsyncStorage.setItem(STORAGE_KEYS.GOOGLE_STATE, response.data.state);
      }

      console.log('[GoogleCalendarService] Opening auth URL...');

      // Open the browser for OAuth
      // The callback URL (beckycrm://oauth/google/callback) is registered in app.json
      const result = await WebBrowser.openAuthSessionAsync(
        response.data.authUrl,
        this.getRedirectUri(),
        {
          showInRecents: true,
        }
      );

      console.log('[GoogleCalendarService] Auth result:', result);

      if (result.type === 'success' && result.url) {
        // Parse the callback URL from the mobile deep link
        const callbackUrl = new URL(result.url);
        const returnedState = callbackUrl.searchParams.get('state');
        const integrationId = callbackUrl.searchParams.get('integrationId');
        const success = callbackUrl.searchParams.get('success');
        const error = callbackUrl.searchParams.get('error');
        const message = callbackUrl.searchParams.get('message');

        // Verify state matches (if we have one)
        const savedState = await AsyncStorage.getItem(STORAGE_KEYS.GOOGLE_STATE);
        if (savedState && returnedState && returnedState !== savedState) {
          console.error('[GoogleCalendarService] State mismatch - possible CSRF attack');
          return { success: false, error: 'Security validation failed' };
        }

        // Clear stored state
        await AsyncStorage.removeItem(STORAGE_KEYS.GOOGLE_STATE);

        if (error) {
          console.error('[GoogleCalendarService] OAuth error:', error, message);
          return {
            success: false,
            error: message ? decodeURIComponent(message) : decodeURIComponent(error)
          };
        }

        if (success === 'true' && integrationId) {
          console.log('[GoogleCalendarService] OAuth successful, integration ID:', integrationId);
          return { success: true, integrationId };
        }

        // If we got here with success=true but no integrationId, something's wrong
        if (success === 'true') {
          return { success: false, error: 'No integration ID received' };
        }

        return { success: false, error: 'Authentication failed' };
      } else if (result.type === 'cancel') {
        console.log('[GoogleCalendarService] OAuth cancelled by user');
        await AsyncStorage.removeItem(STORAGE_KEYS.GOOGLE_STATE);
        return { success: false, error: 'Authentication cancelled' };
      } else if (result.type === 'dismiss') {
        console.log('[GoogleCalendarService] OAuth dismissed');
        await AsyncStorage.removeItem(STORAGE_KEYS.GOOGLE_STATE);
        return { success: false, error: 'Authentication dismissed' };
      } else {
        console.error('[GoogleCalendarService] OAuth failed:', result);
        await AsyncStorage.removeItem(STORAGE_KEYS.GOOGLE_STATE);
        return { success: false, error: 'Authentication failed' };
      }
    } catch (error) {
      console.error('[GoogleCalendarService] OAuth error:', error);
      await AsyncStorage.removeItem(STORAGE_KEYS.GOOGLE_STATE);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all calendar integrations for the current user
   */
  async getIntegrations(): Promise<CalendarIntegration[]> {
    try {
      console.log('[GoogleCalendarService] Fetching integrations...');
      const response = await calendarIntegrationsApi.getIntegrations();

      if (response.success && response.data) {
        console.log('[GoogleCalendarService] Found', response.data.length, 'integrations');
        return response.data;
      }

      console.log('[GoogleCalendarService] No integrations found');
      return [];
    } catch (error) {
      console.error('[GoogleCalendarService] Error fetching integrations:', error);
      return [];
    }
  }

  /**
   * Get the active Google Calendar integration
   */
  async getGoogleIntegration(): Promise<CalendarIntegration | null> {
    const integrations = await this.getIntegrations();
    return integrations.find(i => i.provider === 'GOOGLE' && i.isActive) || null;
  }

  /**
   * Get connection status for Google Calendar
   */
  async getConnectionStatus(): Promise<GoogleCalendarConnectionStatus> {
    const integration = await this.getGoogleIntegration();

    if (!integration) {
      return {
        isConnected: false,
        integration: null,
        lastSyncAt: null,
        lastSyncError: null,
        calendarName: null,
        calendarEmail: null,
      };
    }

    return {
      isConnected: integration.isActive,
      integration,
      lastSyncAt: integration.lastSyncAt,
      lastSyncError: integration.lastSyncError,
      calendarName: integration.calendarName,
      calendarEmail: integration.calendarEmail,
    };
  }

  /**
   * Sync events FROM Google Calendar
   * @param integrationId The integration ID to sync from
   * @param startDate Optional start date for sync range
   * @param endDate Optional end date for sync range
   */
  async syncFromGoogleCalendar(
    integrationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<GoogleCalendarSyncResult> {
    try {
      console.log('[GoogleCalendarService] Syncing from Google Calendar...');

      // Calculate default date range if not provided
      const start = startDate || new Date();
      const end = endDate || new Date();

      if (!startDate) {
        start.setDate(start.getDate() - 30);
      }
      if (!endDate) {
        end.setDate(end.getDate() + 90);
      }

      const response = await calendarIntegrationsApi.syncFromCalendar(
        integrationId,
        start.toISOString(),
        end.toISOString()
      );

      if (response.success && response.data) {
        console.log('[GoogleCalendarService] Synced', response.data.length, 'events');
        return {
          success: true,
          events: response.data,
          count: response.data.length,
          syncedAt: new Date().toISOString(),
        };
      }

      // Check for reauth requirement
      if ((response as any).requiresReauth) {
        console.warn('[GoogleCalendarService] Reauth required');
        return {
          success: false,
          error: 'Authentication expired. Please reconnect your Google Calendar.',
          requiresReauth: true,
        };
      }

      return {
        success: false,
        error: response.error || 'Sync failed',
      };
    } catch (error: any) {
      console.error('[GoogleCalendarService] Sync error:', error);

      // Handle 401 unauthorized
      if (error?.statusCode === 401) {
        return {
          success: false,
          error: 'Authentication expired. Please reconnect your Google Calendar.',
          requiresReauth: true,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  /**
   * Push a Becky event TO Google Calendar
   * @param integrationId The integration ID to push to
   * @param eventData The event data to create
   */
  async pushEventToGoogleCalendar(
    integrationId: string,
    eventData: CreateEventData
  ): Promise<{ success: boolean; event?: Event; error?: string }> {
    try {
      console.log('[GoogleCalendarService] Pushing event to Google Calendar...');

      const response = await calendarIntegrationsApi.createEventInCalendar(
        integrationId,
        eventData
      );

      if (response.success && response.data) {
        console.log('[GoogleCalendarService] Event pushed successfully:', response.data.id);
        return {
          success: true,
          event: response.data,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to create event in Google Calendar',
      };
    } catch (error) {
      console.error('[GoogleCalendarService] Push event error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event',
      };
    }
  }

  /**
   * Update an event in Google Calendar
   * @param integrationId The integration ID
   * @param googleCalendarEventId The Google Calendar event ID
   * @param eventData The updated event data
   */
  async updateEventInGoogleCalendar(
    integrationId: string,
    googleCalendarEventId: string,
    eventData: Partial<Event>
  ): Promise<{ success: boolean; event?: Event; error?: string }> {
    try {
      console.log('[GoogleCalendarService] Updating event in Google Calendar...');

      const response = await calendarIntegrationsApi.updateEventInCalendar(
        integrationId,
        googleCalendarEventId,
        eventData
      );

      if (response.success && response.data) {
        console.log('[GoogleCalendarService] Event updated successfully');
        return {
          success: true,
          event: response.data,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to update event in Google Calendar',
      };
    } catch (error) {
      console.error('[GoogleCalendarService] Update event error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update event',
      };
    }
  }

  /**
   * Disconnect Google Calendar integration
   * @param integrationId The integration ID to disconnect
   */
  async disconnect(integrationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[GoogleCalendarService] Disconnecting integration:', integrationId);

      const response = await calendarIntegrationsApi.deleteIntegration(integrationId);

      if (response.success) {
        console.log('[GoogleCalendarService] Integration disconnected successfully');
        return { success: true };
      }

      return {
        success: false,
        error: response.error || 'Failed to disconnect',
      };
    } catch (error) {
      console.error('[GoogleCalendarService] Disconnect error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect',
      };
    }
  }

  /**
   * Check if a specific event is from Google Calendar
   */
  isGoogleCalendarEvent(event: Event): boolean {
    return event.id.startsWith('gcal-') || !!event.googleCalendarEventId;
  }

  /**
   * Format last sync time for display
   */
  formatLastSyncTime(lastSyncAt: string | null): string {
    if (!lastSyncAt) {
      return 'Never synced';
    }

    const syncDate = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return syncDate.toLocaleDateString();
    }
  }
}

// Export singleton instance
export const googleCalendarService = GoogleCalendarService.getInstance();
