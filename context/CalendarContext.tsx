/**
 * Calendar Context - State management for calendar and events
 * Includes Google Calendar sync integration
 */
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { eventsApi, calendarIntegrationsApi, CalendarIntegration } from '../lib/api/endpoints';
import { Event, CreateEventData } from '../lib/api/types';

export type CalendarView = 'day' | 'week' | 'month';

export interface DragState {
  isDragging: boolean;
  draggedEvent: Event | null;
  originalSlot: { date: string; hour: number; minute: number } | null;
}

export interface ResizeState {
  isResizing: boolean;
  resizingEvent: Event | null;
  handle: 'top' | 'bottom' | null;
  originalStart: string | null;
  originalEnd: string | null;
}

interface CalendarContextType {
  // Current state
  selectedDate: Date;
  currentView: CalendarView;
  events: Event[];
  loading: boolean;
  error: string | null;

  // Google Calendar integration state
  calendarIntegrations: CalendarIntegration[];
  activeIntegration: CalendarIntegration | null;
  syncingGoogle: boolean;
  lastGoogleSyncAt: string | null;

  // Drag & drop state
  dragState: DragState;
  resizeState: ResizeState;

  // Actions
  setSelectedDate: (date: Date) => void;
  setCurrentView: (view: CalendarView) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;

  // Event CRUD
  fetchEvents: (startDate?: string, endDate?: string) => Promise<void>;
  createEvent: (data: CreateEventData) => Promise<Event | null>;
  updateEvent: (eventId: string, data: Partial<Event>) => Promise<Event | null>;
  deleteEvent: (eventId: string) => Promise<boolean>;

  // Google Calendar actions
  fetchCalendarIntegrations: () => Promise<void>;
  syncFromGoogleCalendar: () => Promise<void>;
  initiateGoogleAuth: () => Promise<string | null>;

  // Drag & drop actions
  startDrag: (event: Event, slot: { date: string; hour: number; minute: number }) => void;
  endDrag: (newSlot: { date: string; hour: number; minute: number } | null) => void;
  cancelDrag: () => void;

  // Resize actions
  startResize: (event: Event, handle: 'top' | 'bottom') => void;
  updateResize: (newTime: string) => void;
  endResize: () => void;
  cancelResize: () => void;

  // Helpers
  getEventsForDate: (date: Date) => Event[];
  getEventsForDateRange: (startDate: Date, endDate: Date) => Event[];
}

const CalendarContext = createContext<CalendarContextType | null>(null);

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}

interface CalendarProviderProps {
  children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('day');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Calendar integration state
  const [calendarIntegrations, setCalendarIntegrations] = useState<CalendarIntegration[]>([]);
  const [activeIntegration, setActiveIntegration] = useState<CalendarIntegration | null>(null);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [lastGoogleSyncAt, setLastGoogleSyncAt] = useState<string | null>(null);

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedEvent: null,
    originalSlot: null,
  });

  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    resizingEvent: null,
    handle: null,
    originalStart: null,
    originalEnd: null,
  });

  // Fetch events from API
  // Note: Using source='database' to only get events that are persisted to the database
  // This avoids getting localStorage-only events from the web app that can't be updated via mobile
  const fetchEvents = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('[CalendarContext] Fetching events with source=database');
      const response = await eventsApi.getEvents({ startDate, endDate, source: 'database' });
      console.log('[CalendarContext] Fetch response:', {
        success: response.success,
        eventCount: response.data?.length || 0,
        eventIds: response.data?.map(e => e.id) || [],
      });
      if (response.success && response.data) {
        setEvents(response.data);
      } else {
        setError(response.error || 'Failed to fetch events');
      }
    } catch (err) {
      setError('Failed to fetch events');
      console.error('[CalendarContext] Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new event
  const createEvent = useCallback(async (data: CreateEventData): Promise<Event | null> => {
    try {
      const response = await eventsApi.createEvent(data);
      if (response.success && response.data) {
        setEvents(prev => [...prev, response.data!]);
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('[CalendarContext] Error creating event:', err);
      return null;
    }
  }, []);

  // Update event
  const updateEvent = useCallback(async (eventId: string, data: Partial<Event>): Promise<Event | null> => {
    console.log('[CalendarContext] ========== UPDATE EVENT ==========');
    console.log('[CalendarContext] Event ID:', eventId);
    console.log('[CalendarContext] Update data:', JSON.stringify(data, null, 2));

    // Get the current event for potential upsert
    const currentEvent = events.find(e => e.id === eventId);

    // Optimistically update UI immediately
    console.log('[CalendarContext] Applying optimistic update to events state...');
    setEvents(prev => {
      const updated = prev.map(e => e.id === eventId ? { ...e, ...data } : e);
      const updatedEvent = updated.find(e => e.id === eventId);
      console.log('[CalendarContext] Optimistic update applied. New event times:', {
        id: updatedEvent?.id,
        startTime: updatedEvent?.startTime,
        endTime: updatedEvent?.endTime,
      });
      return updated;
    });
    console.log('[CalendarContext] setEvents called, state update scheduled');

    try {
      const response = await eventsApi.updateEvent(eventId, data);
      if (response.success && response.data) {
        // Update with server response (may have additional fields)
        console.log('[CalendarContext] API update successful, applying server response');
        setEvents(prev => prev.map(e => e.id === eventId ? response.data! : e));
        return response.data;
      }
      // Don't revert - keep optimistic update for better UX
      // Backend localStorage issue - events still work locally
      console.warn('[CalendarContext] Event update API failed, keeping local changes');
      return null;
    } catch (err: any) {
      console.error('[CalendarContext] Error updating event:', err);

      // If event not found (404), try to create it in the database
      if (err?.statusCode === 404 && currentEvent) {
        console.log('[CalendarContext] Event not in database, attempting to create it...');
        try {
          // Merge current event with updates for the create
          const mergedEvent = { ...currentEvent, ...data };
          const createResponse = await eventsApi.createEvent({
            title: mergedEvent.title,
            description: mergedEvent.description,
            startTime: mergedEvent.startTime,
            endTime: mergedEvent.endTime,
            clientId: mergedEvent.clientId,
            clientName: mergedEvent.clientName,
            location: mergedEvent.location,
            service: mergedEvent.service,
            type: mergedEvent.type,
            priority: mergedEvent.priority,
            isAllDay: mergedEvent.isAllDay,
            isRecurring: mergedEvent.isRecurring,
            recurrence: mergedEvent.recurrence,
            notifications: mergedEvent.notifications,
            participants: mergedEvent.participants,
          });

          if (createResponse.success && createResponse.data) {
            console.log('[CalendarContext] Event created in database successfully');
            // Replace the old event with the new one (new ID from database)
            setEvents(prev => prev.map(e =>
              e.id === eventId ? createResponse.data! : e
            ));
            return createResponse.data;
          }
        } catch (createErr) {
          console.error('[CalendarContext] Failed to create event in database:', createErr);
        }
      }

      // Keep optimistic update for better UX
      // This allows drag/resize to work even when backend has issues
      console.warn('[CalendarContext] Keeping local event changes despite API error');
      return null;
    }
  }, [events]);

  // Delete event
  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      const response = await eventsApi.deleteEvent(eventId);
      if (response.success) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('[CalendarContext] Error deleting event:', err);
      return false;
    }
  }, []);

  // ============================================================================
  // Google Calendar Integration
  // ============================================================================

  // Fetch calendar integrations for the current user
  const fetchCalendarIntegrations = useCallback(async () => {
    try {
      console.log('[CalendarContext] Fetching calendar integrations...');
      const response = await calendarIntegrationsApi.getIntegrations();
      if (response.success && response.data) {
        setCalendarIntegrations(response.data);
        // Set active integration to first active Google Calendar
        const googleIntegration = response.data.find(
          i => i.provider === 'GOOGLE' && i.isActive
        );
        if (googleIntegration) {
          setActiveIntegration(googleIntegration);
          setLastGoogleSyncAt(googleIntegration.lastSyncAt);
          console.log('[CalendarContext] Active Google Calendar integration:', googleIntegration.calendarName);
        }
      }
    } catch (err) {
      console.error('[CalendarContext] Error fetching calendar integrations:', err);
    }
  }, []);

  // Sync events FROM Google Calendar
  const syncFromGoogleCalendar = useCallback(async () => {
    if (!activeIntegration) {
      console.log('[CalendarContext] No active Google Calendar integration');
      return;
    }

    setSyncingGoogle(true);
    try {
      console.log('[CalendarContext] Syncing from Google Calendar...');

      // Calculate date range based on current view
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);

      switch (currentView) {
        case 'day':
          startDate.setDate(startDate.getDate() - 7); // Include a week before
          endDate.setDate(endDate.getDate() + 7); // And a week after
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - startDate.getDay() - 7);
          endDate.setDate(endDate.getDate() + (6 - endDate.getDay()) + 7);
          break;
        case 'month':
          startDate.setDate(1);
          startDate.setMonth(startDate.getMonth() - 1);
          endDate.setMonth(endDate.getMonth() + 2);
          endDate.setDate(0);
          break;
      }

      const response = await calendarIntegrationsApi.syncFromCalendar(
        activeIntegration.id,
        startDate.toISOString(),
        endDate.toISOString()
      );

      if (response.success && response.data) {
        console.log('[CalendarContext] Synced', response.data.length, 'events from Google Calendar');

        // Merge Google Calendar events with existing events
        // Google events have IDs starting with 'gcal-'
        setEvents(prev => {
          // Remove old Google Calendar events
          const nonGoogleEvents = prev.filter(e => !e.id.startsWith('gcal-'));
          // Add new Google Calendar events
          return [...nonGoogleEvents, ...response.data!];
        });

        setLastGoogleSyncAt(new Date().toISOString());
      } else if ((response as any).requiresReauth) {
        console.warn('[CalendarContext] Google Calendar requires re-authentication');
        setError('Google Calendar requires re-authentication. Please reconnect.');
      }
    } catch (err: any) {
      console.error('[CalendarContext] Error syncing from Google Calendar:', err);
      if (err?.statusCode === 401) {
        setError('Google Calendar session expired. Please reconnect.');
      }
    } finally {
      setSyncingGoogle(false);
    }
  }, [activeIntegration, selectedDate, currentView]);

  // Initiate Google OAuth flow
  const initiateGoogleAuth = useCallback(async (): Promise<string | null> => {
    try {
      console.log('[CalendarContext] Initiating Google OAuth...');
      const response = await calendarIntegrationsApi.initiateGoogleAuth();
      if (response.success && response.data?.authUrl) {
        console.log('[CalendarContext] Google OAuth URL received');
        return response.data.authUrl;
      }
      return null;
    } catch (err) {
      console.error('[CalendarContext] Error initiating Google OAuth:', err);
      return null;
    }
  }, []);

  // Note: Calendar integrations are fetched on-demand when user views Integrations tab
  // This avoids unnecessary API calls and "Not authenticated" errors on app launch

  // Navigation
  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const goToPrevious = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      switch (currentView) {
        case 'day':
          newDate.setDate(newDate.getDate() - 1);
          break;
        case 'week':
          newDate.setDate(newDate.getDate() - 7);
          break;
        case 'month':
          newDate.setMonth(newDate.getMonth() - 1);
          break;
      }
      return newDate;
    });
  }, [currentView]);

  const goToNext = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      switch (currentView) {
        case 'day':
          newDate.setDate(newDate.getDate() + 1);
          break;
        case 'week':
          newDate.setDate(newDate.getDate() + 7);
          break;
        case 'month':
          newDate.setMonth(newDate.getMonth() + 1);
          break;
      }
      return newDate;
    });
  }, [currentView]);

  // Drag & drop
  const startDrag = useCallback((event: Event, slot: { date: string; hour: number; minute: number }) => {
    setDragState({
      isDragging: true,
      draggedEvent: event,
      originalSlot: slot,
    });
  }, []);

  const endDrag = useCallback(async (newSlot: { date: string; hour: number; minute: number } | null) => {
    if (!dragState.draggedEvent || !newSlot) {
      setDragState({ isDragging: false, draggedEvent: null, originalSlot: null });
      return;
    }

    const event = dragState.draggedEvent;
    const originalStart = new Date(event.startTime);
    const originalEnd = new Date(event.endTime);
    const duration = originalEnd.getTime() - originalStart.getTime();

    // Calculate new start time
    const newStart = new Date(newSlot.date);
    newStart.setHours(newSlot.hour, newSlot.minute, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    // Update event
    await updateEvent(event.id, {
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
    });

    setDragState({ isDragging: false, draggedEvent: null, originalSlot: null });
  }, [dragState.draggedEvent, updateEvent]);

  const cancelDrag = useCallback(() => {
    setDragState({ isDragging: false, draggedEvent: null, originalSlot: null });
  }, []);

  // Resize
  const startResize = useCallback((event: Event, handle: 'top' | 'bottom') => {
    setResizeState({
      isResizing: true,
      resizingEvent: event,
      handle,
      originalStart: event.startTime,
      originalEnd: event.endTime,
    });
  }, []);

  const updateResize = useCallback((newTime: string) => {
    if (!resizeState.resizingEvent || !resizeState.handle) return;

    // Preview resize (local state only)
    setEvents(prev => prev.map(e => {
      if (e.id !== resizeState.resizingEvent!.id) return e;
      if (resizeState.handle === 'top') {
        return { ...e, startTime: newTime };
      } else {
        return { ...e, endTime: newTime };
      }
    }));
  }, [resizeState]);

  const endResize = useCallback(async () => {
    if (!resizeState.resizingEvent) {
      setResizeState({ isResizing: false, resizingEvent: null, handle: null, originalStart: null, originalEnd: null });
      return;
    }

    const event = events.find(e => e.id === resizeState.resizingEvent!.id);
    if (event) {
      await updateEvent(event.id, {
        startTime: event.startTime,
        endTime: event.endTime,
      });
    }

    setResizeState({ isResizing: false, resizingEvent: null, handle: null, originalStart: null, originalEnd: null });
  }, [resizeState.resizingEvent, events, updateEvent]);

  const cancelResize = useCallback(() => {
    if (resizeState.resizingEvent && resizeState.originalStart && resizeState.originalEnd) {
      // Restore original times
      setEvents(prev => prev.map(e => {
        if (e.id !== resizeState.resizingEvent!.id) return e;
        return {
          ...e,
          startTime: resizeState.originalStart!,
          endTime: resizeState.originalEnd!,
        };
      }));
    }
    setResizeState({ isResizing: false, resizingEvent: null, handle: null, originalStart: null, originalEnd: null });
  }, [resizeState]);

  // Helper functions
  const getEventsForDate = useCallback((date: Date): Event[] => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.startTime).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  }, [events]);

  const getEventsForDateRange = useCallback((startDate: Date, endDate: Date): Event[] => {
    return events.filter(event => {
      const eventStart = new Date(event.startTime);
      return eventStart >= startDate && eventStart <= endDate;
    });
  }, [events]);

  // Note: Sync removed - the sync endpoint requires localStorage data from web app
  // Mobile app now fetches from database source only to avoid localStorage-only events

  // Fetch events when date changes
  useEffect(() => {
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);

    switch (currentView) {
      case 'day':
        // Just the selected day
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
        break;
      case 'month':
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        break;
    }

    fetchEvents(startDate.toISOString(), endDate.toISOString());
  }, [selectedDate, currentView, fetchEvents]);

  const value: CalendarContextType = {
    selectedDate,
    currentView,
    events,
    loading,
    error,
    // Google Calendar integration
    calendarIntegrations,
    activeIntegration,
    syncingGoogle,
    lastGoogleSyncAt,
    dragState,
    resizeState,
    setSelectedDate,
    setCurrentView,
    goToToday,
    goToPrevious,
    goToNext,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    // Google Calendar actions
    fetchCalendarIntegrations,
    syncFromGoogleCalendar,
    initiateGoogleAuth,
    startDrag,
    endDrag,
    cancelDrag,
    startResize,
    updateResize,
    endResize,
    cancelResize,
    getEventsForDate,
    getEventsForDateRange,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}
