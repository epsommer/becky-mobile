/**
 * MultidayConflictModal - Modal for warning about multiday event conflicts
 *
 * Features:
 * - Shows list of conflicting events
 * - Options to continue anyway or adjust time
 * - Uses BaseConfirmationModal for consistent styling
 */
import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import BaseConfirmationModal from './BaseConfirmationModal';
import { ConflictEvent } from '../../hooks/useMultidayEventActions';

interface MultidayConflictModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** List of conflicting events */
  conflicts: ConflictEvent[];
  /** Proposed start date */
  proposedStart: Date | null;
  /** Proposed end date */
  proposedEnd: Date | null;
  /** Callback when user chooses to continue anyway */
  onContinue: () => void;
  /** Callback when user chooses to go back and adjust */
  onAdjust: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

export default function MultidayConflictModal({
  visible,
  conflicts,
  proposedStart,
  proposedEnd,
  onContinue,
  onAdjust,
  onCancel,
}: MultidayConflictModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Format date for display
  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Format time for display
  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  // Handle confirm - user wants to continue anyway
  const handleConfirm = useCallback(() => {
    onContinue();
  }, [onContinue]);

  // Handle go back - user wants to adjust times
  const handleGoBack = useCallback(() => {
    onAdjust();
  }, [onAdjust]);

  if (!proposedStart || !proposedEnd) return null;

  return (
    <BaseConfirmationModal
      visible={visible}
      title="Schedule Conflict"
      message={`This event overlaps with ${conflicts.length} existing event${conflicts.length !== 1 ? 's' : ''}.`}
      icon="warning-outline"
      iconColor="#f59e0b"
      confirmLabel="Continue Anyway"
      cancelLabel="Go Back"
      isDestructive={false}
      onConfirm={handleConfirm}
      onCancel={handleGoBack}
      warningMessage="Creating overlapping events may cause scheduling conflicts."
    >
      {/* Proposed Event Info */}
      <View style={styles.proposedEvent}>
        <Text style={styles.proposedLabel}>New Event:</Text>
        <Text style={styles.proposedDates}>
          {formatDate(proposedStart)} - {formatDate(proposedEnd)}
        </Text>
      </View>

      {/* Conflicting Events List */}
      <View style={styles.conflictsSection}>
        <Text style={styles.conflictsLabel}>Conflicts with:</Text>
        <ScrollView
          style={styles.conflictsList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {conflicts.map((conflict, index) => (
            <View
              key={conflict.event.id}
              style={[
                styles.conflictItem,
                index < conflicts.length - 1 && styles.conflictItemBorder,
              ]}
            >
              <View style={styles.conflictIcon}>
                <Ionicons name="calendar" size={16} color={tokens.accent} />
              </View>
              <View style={styles.conflictInfo}>
                <Text style={styles.conflictTitle} numberOfLines={1}>
                  {conflict.event.title}
                </Text>
                <Text style={styles.conflictDate}>
                  {formatDate(new Date(conflict.event.startTime))}
                  {' at '}
                  {formatTime(new Date(conflict.event.startTime))}
                </Text>
                {conflict.event.clientName && (
                  <Text style={styles.conflictClient} numberOfLines={1}>
                    <Ionicons name="person-outline" size={12} color={tokens.muted} />
                    {' '}{conflict.event.clientName}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </BaseConfirmationModal>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    proposedEvent: {
      backgroundColor: tokens.surface,
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: tokens.accent,
    },
    proposedLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    proposedDates: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    conflictsSection: {
      marginBottom: 8,
    },
    conflictsLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
      marginBottom: 10,
    },
    conflictsList: {
      maxHeight: 180,
    },
    conflictItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 12,
      gap: 12,
    },
    conflictItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    conflictIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: tokens.accent + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    conflictInfo: {
      flex: 1,
    },
    conflictTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: tokens.textPrimary,
      marginBottom: 2,
    },
    conflictDate: {
      fontSize: 13,
      color: tokens.textSecondary,
    },
    conflictClient: {
      fontSize: 12,
      color: tokens.muted,
      marginTop: 4,
    },
  });
