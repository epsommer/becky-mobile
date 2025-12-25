/**
 * Calendar Integrations API endpoints
 * @module lib/api/endpoints/calendar-integrations
 */

import { apiClient } from '../client';
import { ApiResponse, Event, CreateEventData } from '../types';

/**
 * Calendar integration record
 */
export interface CalendarIntegration {
  id: string;
  provider: 'GOOGLE' | 'OUTLOOK' | 'NOTION';
  externalId: string;
  calendarName: string | null;
  calendarEmail: string | null;
  isActive: boolean;
  expiresAt: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sync result from calendar provider
 */
export interface CalendarSyncResult {
  success: boolean;
  data?: Event[];
  syncedAt?: string;
  count?: number;
  error?: string;
  requiresReauth?: boolean;
}

/**
 * Calendar Integrations API methods
 */
export const calendarIntegrationsApi = {
  /**
   * Get all calendar integrations for the current user
   */
  getIntegrations: async (): Promise<ApiResponse<CalendarIntegration[]>> => {
    return apiClient.get<CalendarIntegration[]>('/api/calendar/integrations');
  },

  /**
   * Get a specific calendar integration
   */
  getIntegration: async (integrationId: string): Promise<ApiResponse<CalendarIntegration>> => {
    return apiClient.get<CalendarIntegration>(`/api/calendar/integrations/${integrationId}`);
  },

  /**
   * Delete a calendar integration
   */
  deleteIntegration: async (integrationId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/api/calendar/integrations/${integrationId}`);
  },

  /**
   * Initiate Google OAuth flow for mobile
   * Returns the authorization URL to redirect the user to
   * Uses the mobile-specific endpoint that handles JWT auth and mobile callbacks
   */
  initiateGoogleAuth: async (): Promise<ApiResponse<{ authUrl: string; state: string }>> => {
    // Use the mobile-specific endpoint
    return apiClient.get<{ authUrl: string; state: string }>('/api/auth/google/mobile');
  },

  /**
   * Sync events FROM a calendar integration (e.g., Google Calendar)
   * This fetches events from the external calendar and returns them
   *
   * @param integrationId - The calendar integration ID
   * @param startDate - Optional start date for the sync range
   * @param endDate - Optional end date for the sync range
   */
  syncFromCalendar: async (
    integrationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<Event[]>> => {
    const body: Record<string, string> = {};
    if (startDate) body.startDate = startDate;
    if (endDate) body.endDate = endDate;

    return apiClient.post<Event[]>(
      `/api/calendar/integrations/${integrationId}/sync`,
      Object.keys(body).length > 0 ? body : undefined
    );
  },

  /**
   * Create an event in the external calendar
   *
   * @param integrationId - The calendar integration ID
   * @param eventData - Event data to create
   */
  createEventInCalendar: async (
    integrationId: string,
    eventData: CreateEventData
  ): Promise<ApiResponse<Event>> => {
    return apiClient.post<Event>(
      `/api/calendar/integrations/${integrationId}/events`,
      eventData
    );
  },

  /**
   * Update an event in the external calendar
   *
   * @param integrationId - The calendar integration ID
   * @param googleCalendarEventId - The Google Calendar event ID
   * @param eventData - Updated event data
   */
  updateEventInCalendar: async (
    integrationId: string,
    googleCalendarEventId: string,
    eventData: Partial<Event>
  ): Promise<ApiResponse<Event>> => {
    return apiClient.put<Event>(
      `/api/calendar/integrations/${integrationId}/events`,
      {
        googleCalendarEventId,
        ...eventData
      }
    );
  },
};
