/**
 * ConflictWarningModal - Warning modal for event scheduling conflicts
 * Shows when a user tries to create or edit an event that overlaps with existing events
 */
import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../lib/api/types';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import { ConflictResult, ConflictDetail } from '../../utils/eventConflicts';

export type ConflictResolutionOption = 'create_anyway' | 'adjust_time' | 'cancel';

interface ConflictWarningModalProps {
  visible: boolean;
  conflicts: ConflictResult;
  proposedEventTitle: string;
  proposedStartTime: string;
  proposedEndTime: string;
  onResolve: (option: ConflictResolutionOption) => void;
  onClose: () => void;
}

export default function ConflictWarningModal({
  visible,
  conflicts,
  proposedEventTitle,
  proposedStartTime,
  proposedEndTime,
  onResolve,
  onClose,
}: ConflictWarningModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Format time for display
  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  // Format date for display
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Format full date/time range
  const formatTimeRange = useCallback((startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const startDate = formatDate(startStr);
    const startTime = formatTime(startStr);
    const endTime = formatTime(endStr);

    // Check if same day
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) {
      return `${startDate}, ${startTime} - ${endTime}`;
    }
    return `${startDate} ${startTime} - ${formatDate(endStr)} ${endTime}`;
  }, [formatDate, formatTime]);

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

  // Handle resolution options
  const handleCreateAnyway = useCallback(() => {
    onResolve('create_anyway');
  }, [onResolve]);

  const handleAdjustTime = useCallback(() => {
    onResolve('adjust_time');
  }, [onResolve]);

  const handleCancel = useCallback(() => {
    onResolve('cancel');
  }, [onResolve]);

  if (!visible || !conflicts.hasConflicts) return null;

  const conflictCount = conflicts.conflicts.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="warning-outline" size={28} color="#f59e0b" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Schedule Conflict</Text>
              <Text style={styles.subtitle}>
                {conflictCount} conflict{conflictCount !== 1 ? 's' : ''} detected
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={tokens.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Proposed Event Info */}
            <View style={styles.proposedEventCard}>
              <Text style={styles.sectionLabel}>New Event</Text>
              <Text style={styles.proposedEventTitle}>{proposedEventTitle}</Text>
              <View style={styles.proposedEventTime}>
                <Ionicons name="time-outline" size={16} color={tokens.accent} />
                <Text style={styles.proposedEventTimeText}>
                  {formatTimeRange(proposedStartTime, proposedEndTime)}
                </Text>
              </View>
            </View>

            {/* Conflicts List */}
            <Text style={styles.sectionLabel}>Conflicting Events</Text>
            {conflicts.conflicts.map((conflict, index) => (
              <View
                key={conflict.id}
                style={[
                  styles.conflictCard,
                  { borderLeftColor: getPriorityColor(conflict.conflictingEvent.priority) },
                ]}
              >
                <View style={styles.conflictHeader}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={tokens.textSecondary}
                  />
                  <Text style={styles.conflictEventTitle} numberOfLines={2}>
                    {conflict.conflictingEvent.title}
                  </Text>
                </View>

                {/* Conflict Details */}
                <View style={styles.conflictDetails}>
                  <View style={styles.conflictDetailRow}>
                    <Ionicons name="time-outline" size={14} color={tokens.textSecondary} />
                    <Text style={styles.conflictDetailText}>
                      {formatTimeRange(
                        conflict.conflictingEvent.startTime,
                        conflict.conflictingEvent.endTime
                      )}
                    </Text>
                  </View>

                  {conflict.conflictingEvent.clientName && (
                    <View style={styles.conflictDetailRow}>
                      <Ionicons name="person-outline" size={14} color={tokens.textSecondary} />
                      <Text style={styles.conflictDetailText}>
                        {conflict.conflictingEvent.clientName}
                      </Text>
                    </View>
                  )}

                  {conflict.conflictingEvent.location && (
                    <View style={styles.conflictDetailRow}>
                      <Ionicons name="location-outline" size={14} color={tokens.textSecondary} />
                      <Text style={styles.conflictDetailText} numberOfLines={1}>
                        {conflict.conflictingEvent.location}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Overlap Info */}
                <View style={styles.overlapBadge}>
                  <Ionicons name="git-compare-outline" size={12} color="#ef4444" />
                  <Text style={styles.overlapText}>
                    {conflict.timeOverlap.durationMinutes} min overlap
                  </Text>
                </View>
              </View>
            ))}

            {/* Warning Message */}
            <View style={styles.warningBox}>
              <Ionicons name="information-circle-outline" size={18} color="#f59e0b" />
              <Text style={styles.warningText}>
                Creating this event will result in overlapping appointments. This may cause scheduling issues.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.adjustButton]}
              onPress={handleAdjustTime}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color={tokens.accent} />
              <Text style={styles.adjustButtonText}>Adjust Time</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.proceedButton]}
              onPress={handleCreateAnyway}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-outline" size={18} color="#ffffff" />
              <Text style={styles.proceedButtonText}>Create Anyway</Text>
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
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    closeButton: {
      padding: 4,
    },
    content: {
      padding: 20,
      maxHeight: 400,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    proposedEventCard: {
      backgroundColor: tokens.accent + '10',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: tokens.accent + '30',
    },
    proposedEventTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginBottom: 8,
    },
    proposedEventTime: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    proposedEventTimeText: {
      fontSize: 14,
      color: tokens.accent,
      fontWeight: '500',
    },
    conflictCard: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      borderLeftWidth: 4,
    },
    conflictHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 10,
    },
    conflictEventTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textPrimary,
      flex: 1,
    },
    conflictDetails: {
      gap: 6,
      marginBottom: 10,
    },
    conflictDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    conflictDetailText: {
      fontSize: 13,
      color: tokens.textSecondary,
      flex: 1,
    },
    overlapBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    overlapText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#ef4444',
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#f59e0b',
    },
    warningText: {
      fontSize: 13,
      lineHeight: 18,
      color: tokens.textPrimary,
      flex: 1,
    },
    actions: {
      flexDirection: 'row',
      padding: 16,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    cancelButton: {
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    adjustButton: {
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.accent,
    },
    adjustButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.accent,
    },
    proceedButton: {
      backgroundColor: '#f59e0b',
    },
    proceedButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
