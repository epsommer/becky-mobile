/**
 * Events/Calendar API endpoints
 * @module lib/api/endpoints/events
 */

import { apiClient } from '../client';
import { Event, ApiResponse, EventsQuery, CreateEventData } from '../types';

/**
 * Events API methods
 *
 * @example
 * ```typescript
 * import { eventsApi } from '@/lib/api/endpoints';
 *
 * // Get all events
 * const response = await eventsApi.getEvents({ source: 'database' });
 *
 * // Create event
 * const newEvent = await eventsApi.createEvent({
 *   title: 'Client Meeting',
 *   startTime: '2024-01-15T10:00:00Z',
 *   endTime: '2024-01-15T11:00:00Z',
 *   clientId: 'abc123'
 * });
 * ```
 */
export const eventsApi = {
  /**
   * Get all events with optional filters
   *
   * @param params - Query parameters (clientId, date range, source)
   * @returns List of events
   */
  getEvents: async (params?: EventsQuery): Promise<ApiResponse<Event[]>> => {
    return apiClient.get<Event[]>('/api/events', params);
  },

  /**
   * Get single event by ID
   *
   * @param eventId - Event ID
   * @returns Event details
   */
  getEvent: async (eventId: string): Promise<ApiResponse<Event>> => {
    return apiClient.get<Event>(`/api/events/${eventId}`);
  },

  /**
   * Create new event
   *
   * @param data - Event data
   * @returns Created event
   */
  createEvent: async (data: CreateEventData): Promise<ApiResponse<Event>> => {
    // Transform mobile field names to backend field names
    const backendData: Record<string, any> = {
      ...data,
      // Map startTime -> startDateTime (backend expects this)
      startDateTime: data.startTime,
      // Map endTime -> endDateTime (backend expects this)
      endDateTime: data.endTime,
      // Include type for the backend
      type: 'appointment',
    };
    // Remove mobile-specific field names
    delete backendData.startTime;
    delete backendData.endTime;

    return apiClient.post<Event>('/api/events', backendData);
  },

  /**
   * Update existing event
   *
   * @param eventId - Event ID
   * @param data - Updated event data
   * @returns Updated event
   */
  updateEvent: async (
    eventId: string,
    data: Partial<Event>
  ): Promise<ApiResponse<Event>> => {
    // Transform mobile field names to backend field names
    const backendData: Record<string, any> = { ...data };

    // Map startTime -> startDateTime if present
    if (data.startTime) {
      backendData.startDateTime = data.startTime;
      delete backendData.startTime;
    }

    // Map endTime -> endDateTime if present
    if (data.endTime) {
      backendData.endDateTime = data.endTime;
      delete backendData.endTime;
    }

    // Backend uses PUT with query param for updates
    return apiClient.put<Event>(`/api/events?id=${eventId}`, backendData);
  },

  /**
   * Delete event
   *
   * @param eventId - Event ID
   * @returns Success response
   */
  deleteEvent: async (eventId: string): Promise<ApiResponse<void>> => {
    // Backend uses query param for delete
    return apiClient.delete<void>(`/api/events?id=${eventId}`);
  },

  /**
   * Sync events between localStorage and database
   *
   * @returns Sync result
   */
  syncEvents: async (): Promise<ApiResponse<any>> => {
    return apiClient.post<any>('/api/events/sync');
  },

  /**
   * Get appointments (alias for events with specific type)
   *
   * @param params - Query parameters
   * @returns List of appointments
   */
  getAppointments: async (params?: EventsQuery): Promise<ApiResponse<Event[]>> => {
    return apiClient.get<Event[]>('/api/appointments', params);
  },
};
