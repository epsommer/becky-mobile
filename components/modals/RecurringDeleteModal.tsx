/**
 * RecurringDeleteModal - Modal for choosing how to delete recurring events
 * Provides options: delete this only, this and future, or all events in series
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../lib/api/types';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';

/**
 * Recurring delete options matching the web implementation
 */
export type RecurringDeleteOption =
  | 'this_only'           // Delete only this occurrence
  | 'this_and_following'  // Delete this and all future events
  | 'all';                // Delete entire series

interface RecurringDeleteModalProps {
  visible: boolean;
  event: Event | null;
  relatedEvents: Event[];  // All events in the recurrence group
  onConfirm: (option: RecurringDeleteOption) => Promise<{ deletedCount: number; deletedIds: string[] }>;
  onCancel: () => void;
}

export default function RecurringDeleteModal({
  visible,
  event,
  relatedEvents,
  onConfirm,
  onCancel,
}: RecurringDeleteModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [selectedOption, setSelectedOption] = useState<RecurringDeleteOption>('this_only');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sort related events by date
  const sortedEvents = useMemo(() => {
    return [...relatedEvents].sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [relatedEvents]);

  // Find current event index in sorted list
  const currentIndex = useMemo(() => {
    if (!event) return -1;
    return sortedEvents.findIndex(e => e.id === event.id);
  }, [sortedEvents, event]);

  // Calculate counts for each option
  const counts = useMemo(() => {
    if (!event || currentIndex === -1) {
      return { following: 0, total: sortedEvents.length };
    }
    return {
      following: sortedEvents.length - currentIndex - 1,
      total: sortedEvents.length
    };
  }, [sortedEvents, currentIndex, event]);

  // Format date for display
  const formatEventDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Format time for display
  const formatEventTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  // Get description for selected option
  const getOptionDescription = useCallback((option: RecurringDeleteOption): string => {
    switch (option) {
      case 'this_only':
        return 'Only this occurrence will be deleted. Other events in the series will remain.';
      case 'this_and_following':
        return `This event and ${counts.following} following event${counts.following !== 1 ? 's' : ''} will be deleted.`;
      case 'all':
        return `All ${counts.total} events in this recurring series will be permanently deleted.`;
    }
  }, [counts]);

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm(selectedOption);
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete event(s)');
      setIsDeleting(false);
    }
  }, [selectedOption, onConfirm]);

  // Handle close
  const handleClose = useCallback(() => {
    if (!isDeleting) {
      setError(null);
      setSelectedOption('this_only');
      onCancel();
    }
  }, [isDeleting, onCancel]);

  // Get priority color
  const getPriorityColor = useCallback((priority?: string): string => {
    switch (priority) {
      case 'urgent':
        return '#ef4444'; // Red
      case 'high':
        return '#f59e0b'; // Amber
      case 'medium':
        return tokens.accent;
      case 'low':
        return '#22c55e'; // Green
      default:
        return tokens.muted;
    }
  }, [tokens]);

  if (!event) return null;

  const options: { value: RecurringDeleteOption; label: string; icon: string; disabled?: boolean }[] = [
    {
      value: 'this_only',
      label: 'Delete this event only',
      icon: 'calendar-outline',
    },
    {
      value: 'this_and_following',
      label: `Delete this and following (${counts.following + 1})`,
      icon: 'arrow-forward-outline',
      disabled: false,
    },
    {
      value: 'all',
      label: `Delete all events (${counts.total})`,
      icon: 'repeat-outline',
    },
  ];

  const isTask = event.type === 'task';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
            <Text style={styles.title}>Delete Recurring {isTask ? 'Task' : 'Event'}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isDeleting}
            >
              <Ionicons name="close" size={24} color={tokens.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Event Info Card */}
            <View style={[styles.eventCard, { borderLeftColor: getPriorityColor(event.priority) }]}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {event.title}
                </Text>
                {event.priority && (
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(event.priority) + '20', borderColor: getPriorityColor(event.priority) }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(event.priority) }]}>
                      {event.priority.toUpperCase()}
                    </Text>
                  </View>
                )}
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
                  Part of a recurring series ({counts.total} event{counts.total !== 1 ? 's' : ''})
                </Text>
              </View>
              {currentIndex >= 0 && (
                <Text style={styles.seriesSubtext}>
                  This is event {currentIndex + 1} of {counts.total}
                </Text>
              )}
            </View>

            {/* Deletion Options */}
            <View style={styles.optionsSection}>
              <Text style={styles.optionsLabel}>Choose what to delete</Text>

              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    selectedOption === option.value && styles.optionButtonSelected,
                    option.disabled && styles.optionButtonDisabled,
                  ]}
                  onPress={() => !option.disabled && setSelectedOption(option.value)}
                  disabled={option.disabled || isDeleting}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.optionIcon,
                    selectedOption === option.value && styles.optionIconSelected,
                  ]}>
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={selectedOption === option.value ? '#ffffff' : tokens.textPrimary}
                    />
                  </View>
                  <Text style={[
                    styles.optionLabel,
                    selectedOption === option.value && styles.optionLabelSelected,
                    option.disabled && styles.optionLabelDisabled,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Description of selected option */}
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionText}>
                  {getOptionDescription(selectedOption)}
                </Text>
              </View>
            </View>

            {/* Warning for destructive options */}
            {(selectedOption === 'all' || selectedOption === 'this_and_following') && (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={20} color="#f59e0b" />
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Warning</Text>
                  <Text style={styles.warningText}>
                    This action cannot be undone. The selected event(s) will be permanently deleted.
                  </Text>
                </View>
              </View>
            )}

            {/* Error Display */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                <View style={styles.errorContent}>
                  <Text style={styles.errorTitle}>Error</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.deleteButton, isDeleting && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              {isDeleting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.deleteButtonText}>Deleting...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="trash-outline" size={18} color="#ffffff" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    container: {
      backgroundColor: tokens.background,
      borderRadius: 16,
      width: '100%',
      maxWidth: 400,
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
      flex: 1,
    },
    closeButton: {
      padding: 4,
    },
    content: {
      padding: 20,
      maxHeight: 400,
    },
    eventCard: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: tokens.border,
      borderLeftWidth: 4,
    },
    eventHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    eventTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    priorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
    },
    priorityText: {
      fontSize: 10,
      fontWeight: '700',
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
    optionsSection: {
      marginBottom: 16,
    },
    optionsLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 10,
      marginBottom: 8,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    optionButtonSelected: {
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    optionButtonDisabled: {
      opacity: 0.5,
    },
    optionIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: tokens.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    optionIconSelected: {
      backgroundColor: '#ef4444',
    },
    optionLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: tokens.textPrimary,
      flex: 1,
    },
    optionLabelSelected: {
      color: '#ef4444',
    },
    optionLabelDisabled: {
      color: tokens.muted,
    },
    descriptionBox: {
      backgroundColor: tokens.surface,
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    descriptionText: {
      fontSize: 13,
      lineHeight: 18,
      color: tokens.textSecondary,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: '#f59e0b',
    },
    warningContent: {
      flex: 1,
      marginLeft: 12,
    },
    warningTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#f59e0b',
      marginBottom: 4,
    },
    warningText: {
      fontSize: 13,
      lineHeight: 18,
      color: '#b45309',
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: '#ef4444',
    },
    errorContent: {
      flex: 1,
      marginLeft: 12,
    },
    errorTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ef4444',
      marginBottom: 4,
    },
    errorText: {
      fontSize: 13,
      lineHeight: 18,
      color: '#dc2626',
    },
    actions: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    deleteButton: {
      backgroundColor: '#ef4444',
    },
    deleteButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });
