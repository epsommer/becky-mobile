/**
 * useGoogleCalendar Hook
 * Provides Google Calendar integration functionality for React components
 * Handles OAuth flow, sync operations, and connection state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  googleCalendarService,
  GoogleCalendarConnectionStatus,
  GoogleCalendarSyncResult,
  SyncStatus,
} from '../lib/services/GoogleCalendarService';
import { CalendarIntegration } from '../lib/api/endpoints/calendar-integrations';
import { Event, CreateEventData } from '../lib/api/types';
import { useAuth } from '../context/AuthContext';

// Storage keys for persisting state
const STORAGE_KEYS = {
  LAST_SYNC_AT: '@becky_google_last_sync',
  AUTO_SYNC_ENABLED: '@becky_google_auto_sync',
};

export interface UseGoogleCalendarResult {
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  integration: CalendarIntegration | null;
  calendarName: string | null;
  calendarEmail: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  formattedLastSync: string;

  // Sync state
  syncStatus: SyncStatus;
  syncedEvents: Event[];

  // Settings
  autoSyncEnabled: boolean;

  // Actions
  connect: () => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<{ success: boolean; error?: string }>;
  sync: (startDate?: Date, endDate?: Date) => Promise<GoogleCalendarSyncResult>;
  pushEvent: (eventData: CreateEventData) => Promise<{ success: boolean; event?: Event; error?: string }>;
  updateEvent: (googleEventId: string, eventData: Partial<Event>) => Promise<{ success: boolean; event?: Event; error?: string }>;
  refreshConnectionStatus: () => Promise<void>;
  setAutoSyncEnabled: (enabled: boolean) => Promise<void>;

  // Helpers
  isGoogleEvent: (event: Event) => boolean;
}

export function useGoogleCalendar(): UseGoogleCalendarResult {
  const { isAuthenticated } = useAuth();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null);
  const [calendarName, setCalendarName] = useState<string | null>(null);
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncedEvents, setSyncedEvents] = useState<Event[]>([]);

  // Settings
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState(false);

  // Refs to prevent duplicate operations
  const isRefreshing = useRef(false);
  const isSyncing = useRef(false);

  /**
   * Format the last sync time for display
   */
  const formattedLastSync = googleCalendarService.formatLastSyncTime(lastSyncAt);

  /**
   * Load persisted settings on mount
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [storedLastSync, storedAutoSync] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_AT),
          AsyncStorage.getItem(STORAGE_KEYS.AUTO_SYNC_ENABLED),
        ]);

        if (storedLastSync) {
          setLastSyncAt(storedLastSync);
        }
        if (storedAutoSync !== null) {
          setAutoSyncEnabledState(storedAutoSync === 'true');
        }
      } catch (error) {
        console.error('[useGoogleCalendar] Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  /**
   * Refresh connection status from the server
   */
  const refreshConnectionStatus = useCallback(async () => {
    if (isRefreshing.current || !isAuthenticated) {
      return;
    }

    isRefreshing.current = true;
    setIsLoading(true);

    try {
      console.log('[useGoogleCalendar] Refreshing connection status...');
      const status = await googleCalendarService.getConnectionStatus();

      setIsConnected(status.isConnected);
      setIntegration(status.integration);
      setCalendarName(status.calendarName);
      setCalendarEmail(status.calendarEmail);
      setLastSyncAt(status.lastSyncAt);
      setLastSyncError(status.lastSyncError);

      console.log('[useGoogleCalendar] Connection status:', status.isConnected ? 'Connected' : 'Not connected');
    } catch (error) {
      console.error('[useGoogleCalendar] Error refreshing status:', error);
      setIsConnected(false);
      setIntegration(null);
    } finally {
      setIsLoading(false);
      isRefreshing.current = false;
    }
  }, [isAuthenticated]);

  /**
   * Refresh connection status when auth state changes
   */
  useEffect(() => {
    if (isAuthenticated) {
      refreshConnectionStatus();
    } else {
      // Clear state when logged out
      setIsConnected(false);
      setIntegration(null);
      setCalendarName(null);
      setCalendarEmail(null);
      setLastSyncAt(null);
      setLastSyncError(null);
      setSyncedEvents([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshConnectionStatus]);

  /**
   * Connect to Google Calendar (initiates OAuth flow)
   */
  const connect = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[useGoogleCalendar] Initiating connection...');
      setIsLoading(true);

      const result = await googleCalendarService.initiateOAuth();

      if (result.success) {
        console.log('[useGoogleCalendar] Connection successful');
        // Refresh status to get the new integration
        await refreshConnectionStatus();

        // Auto-sync after successful connection if enabled
        if (autoSyncEnabled && result.integrationId) {
          console.log('[useGoogleCalendar] Triggering auto-sync after connection...');
          await sync();
        }

        return { success: true };
      } else {
        console.error('[useGoogleCalendar] Connection failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[useGoogleCalendar] Connection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    } finally {
      setIsLoading(false);
    }
  }, [refreshConnectionStatus, autoSyncEnabled]);

  /**
   * Disconnect from Google Calendar
   */
  const disconnect = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!integration) {
      return { success: false, error: 'No active integration' };
    }

    try {
      console.log('[useGoogleCalendar] Disconnecting...');
      setIsLoading(true);

      const result = await googleCalendarService.disconnect(integration.id);

      if (result.success) {
        console.log('[useGoogleCalendar] Disconnected successfully');

        // Clear local state
        setIsConnected(false);
        setIntegration(null);
        setCalendarName(null);
        setCalendarEmail(null);
        setLastSyncAt(null);
        setLastSyncError(null);
        setSyncedEvents([]);

        // Clear persisted data
        await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC_AT);

        return { success: true };
      } else {
        console.error('[useGoogleCalendar] Disconnect failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[useGoogleCalendar] Disconnect error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Disconnect failed'
      };
    } finally {
      setIsLoading(false);
    }
  }, [integration]);

  /**
   * Sync events from Google Calendar
   */
  const sync = useCallback(async (
    startDate?: Date,
    endDate?: Date
  ): Promise<GoogleCalendarSyncResult> => {
    if (!integration) {
      return { success: false, error: 'No active integration' };
    }

    if (isSyncing.current) {
      console.log('[useGoogleCalendar] Sync already in progress');
      return { success: false, error: 'Sync already in progress' };
    }

    isSyncing.current = true;
    setSyncStatus('syncing');
    setLastSyncError(null);

    try {
      console.log('[useGoogleCalendar] Starting sync...');

      const result = await googleCalendarService.syncFromGoogleCalendar(
        integration.id,
        startDate,
        endDate
      );

      if (result.success) {
        console.log('[useGoogleCalendar] Sync successful, got', result.count, 'events');

        setSyncedEvents(result.events || []);
        setSyncStatus('success');

        const syncTime = result.syncedAt || new Date().toISOString();
        setLastSyncAt(syncTime);
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_AT, syncTime);

        // Reset status after 3 seconds
        setTimeout(() => {
          setSyncStatus('idle');
        }, 3000);

        return result;
      } else {
        console.error('[useGoogleCalendar] Sync failed:', result.error);

        setSyncStatus('error');
        setLastSyncError(result.error || 'Sync failed');

        // Handle reauth requirement
        if (result.requiresReauth) {
          console.log('[useGoogleCalendar] Reauth required, clearing integration');
          setIsConnected(false);
        }

        return result;
      }
    } catch (error) {
      console.error('[useGoogleCalendar] Sync error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setSyncStatus('error');
      setLastSyncError(errorMessage);

      return { success: false, error: errorMessage };
    } finally {
      isSyncing.current = false;
    }
  }, [integration]);

  /**
   * Push a local event to Google Calendar
   */
  const pushEvent = useCallback(async (
    eventData: CreateEventData
  ): Promise<{ success: boolean; event?: Event; error?: string }> => {
    if (!integration) {
      return { success: false, error: 'No active integration' };
    }

    try {
      console.log('[useGoogleCalendar] Pushing event to Google Calendar...');

      const result = await googleCalendarService.pushEventToGoogleCalendar(
        integration.id,
        eventData
      );

      if (result.success) {
        console.log('[useGoogleCalendar] Event pushed successfully');
      } else {
        console.error('[useGoogleCalendar] Push failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[useGoogleCalendar] Push error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to push event'
      };
    }
  }, [integration]);

  /**
   * Update an event in Google Calendar
   */
  const updateEvent = useCallback(async (
    googleEventId: string,
    eventData: Partial<Event>
  ): Promise<{ success: boolean; event?: Event; error?: string }> => {
    if (!integration) {
      return { success: false, error: 'No active integration' };
    }

    try {
      console.log('[useGoogleCalendar] Updating event in Google Calendar...');

      const result = await googleCalendarService.updateEventInGoogleCalendar(
        integration.id,
        googleEventId,
        eventData
      );

      if (result.success) {
        console.log('[useGoogleCalendar] Event updated successfully');
      } else {
        console.error('[useGoogleCalendar] Update failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[useGoogleCalendar] Update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update event'
      };
    }
  }, [integration]);

  /**
   * Update auto-sync setting
   */
  const setAutoSyncEnabled = useCallback(async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_SYNC_ENABLED, String(enabled));
      setAutoSyncEnabledState(enabled);
      console.log('[useGoogleCalendar] Auto-sync', enabled ? 'enabled' : 'disabled');
    } catch (error) {
      console.error('[useGoogleCalendar] Error saving auto-sync setting:', error);
    }
  }, []);

  /**
   * Check if an event is from Google Calendar
   */
  const isGoogleEvent = useCallback((event: Event): boolean => {
    return googleCalendarService.isGoogleCalendarEvent(event);
  }, []);

  return {
    // Connection state
    isConnected,
    isLoading,
    integration,
    calendarName,
    calendarEmail,
    lastSyncAt,
    lastSyncError,
    formattedLastSync,

    // Sync state
    syncStatus,
    syncedEvents,

    // Settings
    autoSyncEnabled,

    // Actions
    connect,
    disconnect,
    sync,
    pushEvent,
    updateEvent,
    refreshConnectionStatus,
    setAutoSyncEnabled,

    // Helpers
    isGoogleEvent,
  };
}
