/**
 * useRecurringEventActions - Hook for managing recurring event edit/delete flows
 *
 * Features:
 * - Show edit confirmation modal for recurring events
 * - Show delete confirmation modal for recurring events
 * - Handle edit choice (single, future, all)
 * - Handle delete choice (single, future, all)
 * - Track processing state
 */
import { useState, useCallback } from 'react';
import { Event, CreateEventData } from '../lib/api/types';
import { eventsApi } from '../lib/api/endpoints';

export type RecurringEditOption = 'single' | 'future' | 'all';
export type RecurringDeleteOption = 'this_only' | 'this_and_following' | 'all';

interface RecurringEditState {
  visible: boolean;
  event: Event | null;
  relatedEvents: Event[];
  pendingChanges: Partial<Event> | null;
}

interface RecurringDeleteState {
  visible: boolean;
  event: Event | null;
  relatedEvents: Event[];
}

interface UseRecurringEventActionsOptions {
  /** All events for finding related events */
  events: Event[];
  /** Callback after successful edit */
  onEditComplete?: (updatedEvents: Event[]) => void;
  /** Callback after successful delete */
  onDeleteComplete?: (deletedIds: string[]) => void;
}

interface UseRecurringEventActionsReturn {
  /** State for edit modal */
  editState: RecurringEditState;
  /** State for delete modal */
  deleteState: RecurringDeleteState;
  /** Show edit modal for a recurring event */
  showEditModal: (event: Event, changes: Partial<Event>) => void;
  /** Show delete modal for a recurring event */
  showDeleteModal: (event: Event) => void;
  /** Handle edit choice and apply changes */
  handleEditChoice: (choice: RecurringEditOption) => Promise<void>;
  /** Handle delete choice */
  handleDeleteChoice: (choice: RecurringDeleteOption) => Promise<{ deletedCount: number; deletedIds: string[] }>;
  /** Cancel edit modal */
  cancelEdit: () => void;
  /** Cancel delete modal */
  cancelDelete: () => void;
  /** Whether an action is in progress */
  isProcessing: boolean;
}

export function useRecurringEventActions({
  events,
  onEditComplete,
  onDeleteComplete,
}: UseRecurringEventActionsOptions): UseRecurringEventActionsReturn {
  const [isProcessing, setIsProcessing] = useState(false);

  const [editState, setEditState] = useState<RecurringEditState>({
    visible: false,
    event: null,
    relatedEvents: [],
    pendingChanges: null,
  });

  const [deleteState, setDeleteState] = useState<RecurringDeleteState>({
    visible: false,
    event: null,
    relatedEvents: [],
  });

  // Get related events in a recurrence group
  const getRelatedEvents = useCallback((event: Event): Event[] => {
    if (!event.recurrenceGroupId) {
      return [event];
    }
    return events
      .filter(e => e.recurrenceGroupId === event.recurrenceGroupId)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events]);

  // Show edit modal
  const showEditModal = useCallback((event: Event, changes: Partial<Event>) => {
    const relatedEvents = getRelatedEvents(event);

    setEditState({
      visible: true,
      event,
      relatedEvents,
      pendingChanges: changes,
    });
  }, [getRelatedEvents]);

  // Show delete modal
  const showDeleteModal = useCallback((event: Event) => {
    const relatedEvents = getRelatedEvents(event);

    setDeleteState({
      visible: true,
      event,
      relatedEvents,
    });
  }, [getRelatedEvents]);

  // Handle edit choice
  const handleEditChoice = useCallback(async (choice: RecurringEditOption): Promise<void> => {
    const { event, relatedEvents, pendingChanges } = editState;

    if (!event || !pendingChanges) {
      throw new Error('No event or changes to apply');
    }

    setIsProcessing(true);

    try {
      const updatedEvents: Event[] = [];
      const currentIndex = relatedEvents.findIndex(e => e.id === event.id);

      switch (choice) {
        case 'single':
          // Update only this event
          const singleResponse = await eventsApi.updateEvent(event.id, pendingChanges);
          if (singleResponse.success && singleResponse.data) {
            updatedEvents.push(singleResponse.data);
          }
          break;

        case 'future':
          // Update this and all future events
          const futureEvents = relatedEvents.slice(currentIndex);
          for (const futureEvent of futureEvents) {
            const response = await eventsApi.updateEvent(futureEvent.id, pendingChanges);
            if (response.success && response.data) {
              updatedEvents.push(response.data);
            }
          }
          break;

        case 'all':
          // Update all events in the series
          for (const seriesEvent of relatedEvents) {
            const response = await eventsApi.updateEvent(seriesEvent.id, pendingChanges);
            if (response.success && response.data) {
              updatedEvents.push(response.data);
            }
          }
          break;
      }

      // Close modal and notify parent
      setEditState({
        visible: false,
        event: null,
        relatedEvents: [],
        pendingChanges: null,
      });

      onEditComplete?.(updatedEvents);
    } finally {
      setIsProcessing(false);
    }
  }, [editState, onEditComplete]);

  // Handle delete choice
  const handleDeleteChoice = useCallback(async (
    choice: RecurringDeleteOption
  ): Promise<{ deletedCount: number; deletedIds: string[] }> => {
    const { event, relatedEvents } = deleteState;

    if (!event) {
      throw new Error('No event to delete');
    }

    setIsProcessing(true);

    try {
      let eventIdsToDelete: string[] = [];
      const currentIndex = relatedEvents.findIndex(e => e.id === event.id);

      switch (choice) {
        case 'this_only':
          eventIdsToDelete = [event.id];
          break;

        case 'this_and_following':
          eventIdsToDelete = relatedEvents.slice(currentIndex).map(e => e.id);
          break;

        case 'all':
          eventIdsToDelete = relatedEvents.map(e => e.id);
          break;
      }

      // Use the recurring delete API if available
      if (event.recurrenceGroupId) {
        const response = await eventsApi.deleteRecurringEvents(
          event.id,
          choice,
          event.recurrenceGroupId
        );

        if (response.success && response.data) {
          // Close modal and notify parent
          setDeleteState({
            visible: false,
            event: null,
            relatedEvents: [],
          });

          onDeleteComplete?.(response.data.deletedIds);

          return response.data;
        }
      }

      // Fallback to individual deletes
      const deletedIds: string[] = [];
      for (const eventId of eventIdsToDelete) {
        const response = await eventsApi.deleteEvent(eventId);
        if (response.success) {
          deletedIds.push(eventId);
        }
      }

      // Close modal and notify parent
      setDeleteState({
        visible: false,
        event: null,
        relatedEvents: [],
      });

      onDeleteComplete?.(deletedIds);

      return { deletedCount: deletedIds.length, deletedIds };
    } finally {
      setIsProcessing(false);
    }
  }, [deleteState, onDeleteComplete]);

  // Cancel edit modal
  const cancelEdit = useCallback(() => {
    setEditState({
      visible: false,
      event: null,
      relatedEvents: [],
      pendingChanges: null,
    });
  }, []);

  // Cancel delete modal
  const cancelDelete = useCallback(() => {
    setDeleteState({
      visible: false,
      event: null,
      relatedEvents: [],
    });
  }, []);

  return {
    editState,
    deleteState,
    showEditModal,
    showDeleteModal,
    handleEditChoice,
    handleDeleteChoice,
    cancelEdit,
    cancelDelete,
    isProcessing,
  };
}
