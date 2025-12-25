/**
 * Events/Calendar API endpoints
 * @module lib/api/endpoints/events
 */

import { apiClient, APIClient } from '../client';
import { Event, ApiResponse, EventsQuery, CreateEventData } from '../types';

/**
 * Recurring delete options matching the web implementation
 */
export type RecurringDeleteOption =
  | 'this_only'           // Delete only this occurrence
  | 'this_and_following'  // Delete this and all future events
  | 'all';                // Delete entire series

/**
 * Response from recurring delete API
 */
interface RecurringDeleteResponse {
  deletedCount: number;
  deletedIds: string[];
}

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

  /**
   * Delete recurring events with options
   * Supports deleting: this event only, this and following, or all in series
   *
   * @param eventId - The ID of the event to start deletion from
   * @param option - Delete option: 'this_only', 'this_and_following', or 'all'
   * @param recurrenceGroupId - The group ID linking all events in the series
   * @returns Response with deleted count and IDs
   */
  deleteRecurringEvents: async (
    eventId: string,
    option: RecurringDeleteOption,
    recurrenceGroupId: string
  ): Promise<ApiResponse<RecurringDeleteResponse>> => {
    // Use request method directly to pass body with DELETE
    const client = APIClient.getInstance();
    return client.request<RecurringDeleteResponse>('/api/events/weekly-recurrence', {
      method: 'DELETE',
      body: JSON.stringify({
        eventId,
        option,
        recurrenceGroupId,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  /**
   * Get all events in a recurrence group
   *
   * @param recurrenceGroupId - The group ID linking all events in the series
   * @returns List of related events
   */
  getRelatedEvents: async (recurrenceGroupId: string): Promise<ApiResponse<Event[]>> => {
    return apiClient.get<Event[]>('/api/events', {
      source: 'database',
      recurrenceGroupId,
    });
  },
};
