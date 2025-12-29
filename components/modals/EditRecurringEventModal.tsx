/**
 * EditRecurringEventModal - Modal for choosing how to edit recurring events
 *
 * Features:
 * - Options: "This event only", "This and future events", "All events"
 * - Shows event info and series details
 * - Uses BaseConfirmationModal for consistent styling
 *
 * Triggered when user edits an event that is part of a recurring series
 */
import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../lib/api/types';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import BaseConfirmationModal from './BaseConfirmationModal';
import { RadioOption } from './RadioOptionList';

export type RecurringEditOption = 'single' | 'future' | 'all';

interface EditRecurringEventModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** The event being edited */
  event: Event | null;
  /** All related events in the recurrence series */
  relatedEvents: Event[];
  /** Callback when user confirms with selected option */
  onConfirm: (option: RecurringEditOption) => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

export default function EditRecurringEventModal({
  visible,
  event,
  relatedEvents,
  onConfirm,
  onCancel,
}: EditRecurringEventModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Sort events by date
  const sortedEvents = useMemo(() => {
    return [...relatedEvents].sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [relatedEvents]);

  // Find current event position
  const currentIndex = useMemo(() => {
    if (!event) return -1;
    return sortedEvents.findIndex(e => e.id === event.id);
  }, [sortedEvents, event]);

  // Calculate counts
  const counts = useMemo(() => {
    if (!event || currentIndex === -1) {
      return { future: 0, total: sortedEvents.length };
    }
    return {
      future: sortedEvents.length - currentIndex - 1,
      total: sortedEvents.length
    };
  }, [sortedEvents, currentIndex, event]);

  // Build edit options
  const editOptions: RadioOption[] = useMemo(() => [
    {
      id: 'single',
      label: 'This event only',
      description: 'Only this occurrence will be modified. Other events in the series will remain unchanged.',
      icon: 'calendar-outline',
    },
    {
      id: 'future',
      label: `This and future events (${counts.future + 1})`,
      description: `This event and ${counts.future} following event${counts.future !== 1 ? 's' : ''} will be updated.`,
      icon: 'arrow-forward-outline',
    },
    {
      id: 'all',
      label: `All events in series (${counts.total})`,
      description: `All ${counts.total} events in this recurring series will be updated.`,
      icon: 'repeat-outline',
    },
  ], [counts]);

  // Handle confirm
  const handleConfirm = useCallback((selectedOptionId?: string) => {
    const option = (selectedOptionId as RecurringEditOption) || 'single';
    onConfirm(option);
  }, [onConfirm]);

  // Format event date
  const formatEventDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Format event time
  const formatEventTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  // Get recurrence description
  const getRecurrenceDescription = useCallback(() => {
    if (!event?.recurrence) return 'This event repeats on a schedule.';

    const { frequency, interval } = event.recurrence;
    if (interval === 1) {
      return `This event repeats ${frequency}.`;
    }
    return `This event repeats every ${interval} ${frequency === 'daily' ? 'days' : frequency === 'weekly' ? 'weeks' : frequency === 'monthly' ? 'months' : 'years'}.`;
  }, [event]);

  if (!event) return null;

  return (
    <BaseConfirmationModal
      visible={visible}
      title="Edit Recurring Event"
      message={getRecurrenceDescription()}
      icon="create-outline"
      options={editOptions}
      defaultSelectedOption="single"
      confirmLabel="Continue"
      cancelLabel="Cancel"
      isDestructive={false}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      {/* Event Info Card */}
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {event.title}
          </Text>
        </View>

        <View style={styles.eventDetails}>
          <View style={styles.eventDetailRow}>
            <Ionicons name="calendar-outline" size={16} color={tokens.textSecondary} />
            <Text style={styles.eventDetailText}>{formatEventDate(event.startTime)}</Text>
          </View>
          <View style={styles.eventDetailRow}>
            <Ionicons name="time-outline" size={16} color={tokens.textSecondary} />
            <Text style={styles.eventDetailText}>{formatEventTime(event.startTime)}</Text>
          </View>
        </View>

        {/* Series info */}
        <View style={styles.seriesInfo}>
          <Ionicons name="repeat" size={16} color={tokens.accent} />
          <Text style={styles.seriesText}>
            Part of a recurring series ({counts.total} events)
          </Text>
        </View>
        {currentIndex >= 0 && (
          <Text style={styles.seriesSubtext}>
            This is event {currentIndex + 1} of {counts.total}
          </Text>
        )}
      </View>
    </BaseConfirmationModal>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    eventCard: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: tokens.border,
      borderLeftWidth: 4,
      borderLeftColor: tokens.accent,
    },
    eventHeader: {
      marginBottom: 12,
    },
    eventTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    eventDetails: {
      gap: 8,
      marginBottom: 12,
    },
    eventDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    eventDetailText: {
      fontSize: 14,
      color: tokens.textSecondary,
    },
    seriesInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    seriesText: {
      fontSize: 14,
      color: tokens.textSecondary,
    },
    seriesSubtext: {
      fontSize: 12,
      color: tokens.muted,
      marginLeft: 24,
      marginTop: 4,
    },
  });
