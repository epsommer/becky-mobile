/**
 * ParticipantConfirmationModal - Confirmation dialog for event changes with participants
 * Shown when moving/resizing events that have participants
 */
import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event, EventParticipant } from '../../lib/api/types';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';

interface ParticipantConfirmationModalProps {
  visible: boolean;
  event: Event | null;
  oldStartTime: string;
  oldEndTime: string;
  newStartTime: string;
  newEndTime: string;
  onConfirm: (notifyParticipants: boolean) => void;
  onCancel: () => void;
}

export default function ParticipantConfirmationModal({
  visible,
  event,
  oldStartTime,
  oldEndTime,
  newStartTime,
  newEndTime,
  onConfirm,
  onCancel,
}: ParticipantConfirmationModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Format time for display
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get participant count
  const participantCount = event?.participants?.length || 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="people-outline" size={24} color={tokens.accent} />
            <Text style={styles.title}>Update Event with Participants</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.message}>
              This event has {participantCount} participant{participantCount !== 1 ? 's' : ''}.
              Do you want to notify them about the schedule change?
            </Text>

            {/* Event info */}
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{event?.title}</Text>

              {/* Time change */}
              <View style={styles.timeChange}>
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Previous:</Text>
                  <Text style={styles.timeValue}>{formatTime(oldStartTime)}</Text>
                </View>
                <Ionicons name="arrow-down" size={16} color={tokens.textSecondary} />
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>New:</Text>
                  <Text style={[styles.timeValue, styles.newTime]}>{formatTime(newStartTime)}</Text>
                </View>
              </View>

              {/* Participants list */}
              {event?.participants && event.participants.length > 0 && (
                <View style={styles.participantsSection}>
                  <Text style={styles.participantsLabel}>Participants:</Text>
                  {event.participants.map((participant) => (
                    <View key={participant.id} style={styles.participantItem}>
                      <Ionicons name="person-circle-outline" size={16} color={tokens.textSecondary} />
                      <Text style={styles.participantName}>{participant.name}</Text>
                      {participant.email && (
                        <Text style={styles.participantEmail}>({participant.email})</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Info note */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={tokens.accent} />
              <Text style={styles.infoText}>
                Participants will receive an email notification about the updated time.
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={() => onConfirm(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>Update (No Notify)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => onConfirm(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={18} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Update & Notify</Text>
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
      maxHeight: '80%',
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
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
      flex: 1,
    },
    content: {
      padding: 20,
      maxHeight: 400,
    },
    message: {
      fontSize: 15,
      lineHeight: 22,
      color: tokens.textPrimary,
      marginBottom: 16,
    },
    eventInfo: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    eventTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginBottom: 12,
    },
    timeChange: {
      gap: 8,
      marginBottom: 12,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    timeLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: tokens.textSecondary,
      width: 70,
    },
    timeValue: {
      fontSize: 13,
      color: tokens.textPrimary,
      flex: 1,
    },
    newTime: {
      fontWeight: '600',
      color: tokens.accent,
    },
    participantsSection: {
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    participantsLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textSecondary,
      marginBottom: 4,
    },
    participantItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    participantName: {
      fontSize: 13,
      color: tokens.textPrimary,
      fontWeight: '500',
    },
    participantEmail: {
      fontSize: 12,
      color: tokens.textSecondary,
      flex: 1,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: tokens.accent + '10',
      borderRadius: 8,
      padding: 12,
      borderLeftWidth: 3,
      borderLeftColor: tokens.accent,
    },
    infoText: {
      fontSize: 13,
      lineHeight: 18,
      color: tokens.textPrimary,
      flex: 1,
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
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
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
    confirmButton: {
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.accent,
    },
    confirmButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.accent,
    },
    primaryButton: {
      backgroundColor: tokens.accent,
    },
    primaryButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
