/**
 * QuickEntrySheet - Quick task/event entry with structured fields
 * Allows users to quickly add multiple tasks or events with individual field inputs
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import { CreateEventData } from '../../lib/api/types';

interface EntryItem {
  id: string;
  title: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  type: 'event' | 'task';
}

interface QuickEntrySheetProps {
  visible: boolean;
  onClose: () => void;
  onAddEvents: (events: CreateEventData[]) => Promise<void>;
  selectedDate: Date;
}

// Create a new empty entry
function createEmptyEntry(baseDate: Date): EntryItem {
  const startTime = new Date(baseDate);
  startTime.setHours(9, 0, 0, 0);
  const endTime = new Date(startTime);
  endTime.setHours(10, 0, 0, 0);

  return {
    id: Math.random().toString(36).substring(2, 9),
    title: '',
    date: new Date(baseDate),
    startTime,
    endTime,
    type: 'event',
  };
}

export default function QuickEntrySheet({
  visible,
  onClose,
  onAddEvents,
  selectedDate,
}: QuickEntrySheetProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [entries, setEntries] = useState<EntryItem[]>([createEmptyEntry(selectedDate)]);
  const [saving, setSaving] = useState(false);

  // Picker state
  const [activePickerEntry, setActivePickerEntry] = useState<string | null>(null);
  const [activePickerType, setActivePickerType] = useState<'date' | 'startTime' | 'endTime' | null>(null);
  const [tempPickerValue, setTempPickerValue] = useState<Date>(new Date());

  // Reset entries when modal opens
  React.useEffect(() => {
    if (visible) {
      setEntries([createEmptyEntry(selectedDate)]);
    }
  }, [visible, selectedDate]);

  // Update entry field
  const updateEntry = useCallback((entryId: string, field: keyof EntryItem, value: any) => {
    setEntries(prev =>
      prev.map(entry =>
        entry.id === entryId ? { ...entry, [field]: value } : entry
      )
    );
  }, []);

  // Add new entry
  const addEntry = useCallback(() => {
    setEntries(prev => [...prev, createEmptyEntry(selectedDate)]);
  }, [selectedDate]);

  // Remove entry
  const removeEntry = useCallback((entryId: string) => {
    setEntries(prev => {
      if (prev.length <= 1) return prev; // Keep at least one entry
      return prev.filter(e => e.id !== entryId);
    });
  }, []);

  // Open picker
  const openPicker = useCallback((entryId: string, pickerType: 'date' | 'startTime' | 'endTime') => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    Keyboard.dismiss();
    setActivePickerEntry(entryId);
    setActivePickerType(pickerType);

    switch (pickerType) {
      case 'date':
        setTempPickerValue(entry.date);
        break;
      case 'startTime':
        setTempPickerValue(entry.startTime);
        break;
      case 'endTime':
        setTempPickerValue(entry.endTime);
        break;
    }
  }, [entries]);

  // Handle picker change
  const handlePickerChange = useCallback((event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setActivePickerEntry(null);
      setActivePickerType(null);
      if (event.type === 'set' && date && activePickerEntry && activePickerType) {
        updateEntry(activePickerEntry, activePickerType === 'date' ? 'date' :
          activePickerType === 'startTime' ? 'startTime' : 'endTime', date);
      }
    } else if (date) {
      setTempPickerValue(date);
    }
  }, [activePickerEntry, activePickerType, updateEntry]);

  // Confirm picker (iOS)
  const confirmPicker = useCallback(() => {
    if (activePickerEntry && activePickerType) {
      updateEntry(
        activePickerEntry,
        activePickerType === 'date' ? 'date' :
          activePickerType === 'startTime' ? 'startTime' : 'endTime',
        tempPickerValue
      );
    }
    setActivePickerEntry(null);
    setActivePickerType(null);
  }, [activePickerEntry, activePickerType, tempPickerValue, updateEntry]);

  // Cancel picker (iOS)
  const cancelPicker = useCallback(() => {
    setActivePickerEntry(null);
    setActivePickerType(null);
  }, []);

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Format date for display
  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if entries are valid
  const validEntries = useMemo(() => {
    return entries.filter(e => e.title.trim().length > 0);
  }, [entries]);

  // Add all entries
  const handleAddAll = useCallback(async () => {
    if (validEntries.length === 0) return;

    setSaving(true);
    try {
      const events: CreateEventData[] = validEntries.map(entry => {
        // Combine date with times
        const startDateTime = new Date(entry.date);
        startDateTime.setHours(
          entry.startTime.getHours(),
          entry.startTime.getMinutes(),
          0,
          0
        );

        const endDateTime = new Date(entry.date);
        endDateTime.setHours(
          entry.endTime.getHours(),
          entry.endTime.getMinutes(),
          0,
          0
        );

        return {
          title: entry.title.trim(),
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          description: entry.type === 'task' ? 'Quick task entry' : undefined,
        };
      });

      await onAddEvents(events);

      // Reset and close
      setEntries([createEmptyEntry(selectedDate)]);
      onClose();
    } catch (error) {
      console.error('[QuickEntrySheet] Error adding events:', error);
    } finally {
      setSaving(false);
    }
  }, [validEntries, selectedDate, onAddEvents, onClose]);

  // Close and reset
  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    setEntries([createEmptyEntry(selectedDate)]);
    setActivePickerEntry(null);
    setActivePickerType(null);
    onClose();
  }, [selectedDate, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Entry</Text>
          <TouchableOpacity
            onPress={handleAddAll}
            style={styles.headerButton}
            disabled={saving || validEntries.length === 0}
          >
            <Text
              style={[
                styles.addAllText,
                (saving || validEntries.length === 0) && styles.disabledText,
              ]}
            >
              {saving ? 'Adding...' : `Add${validEntries.length > 0 ? ` (${validEntries.length})` : ''}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Entries list */}
        <ScrollView
          style={styles.entriesList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {entries.map((entry, index) => (
            <View key={entry.id} style={styles.entryCard}>
              {/* Entry header with type toggle and remove */}
              <View style={styles.entryHeader}>
                <View style={styles.entryNumber}>
                  <Text style={styles.entryNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.typeToggle}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      entry.type === 'event' && styles.typeButtonActive,
                    ]}
                    onPress={() => updateEntry(entry.id, 'type', 'event')}
                  >
                    <Ionicons
                      name="calendar"
                      size={14}
                      color={entry.type === 'event' ? '#ffffff' : tokens.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        entry.type === 'event' && styles.typeButtonTextActive,
                      ]}
                    >
                      Event
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      entry.type === 'task' && styles.typeButtonActive,
                    ]}
                    onPress={() => updateEntry(entry.id, 'type', 'task')}
                  >
                    <Ionicons
                      name="checkbox-outline"
                      size={14}
                      color={entry.type === 'task' ? '#ffffff' : tokens.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        entry.type === 'task' && styles.typeButtonTextActive,
                      ]}
                    >
                      Task
                    </Text>
                  </TouchableOpacity>
                </View>
                {entries.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeEntry(entry.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={tokens.error} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Title field */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Title</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder="What needs to be done?"
                  placeholderTextColor={tokens.textSecondary}
                  value={entry.title}
                  onChangeText={(text) => updateEntry(entry.id, 'title', text)}
                  returnKeyType="done"
                />
              </View>

              {/* Date and time row */}
              <View style={styles.dateTimeRow}>
                {/* Date field */}
                <TouchableOpacity
                  style={styles.dateField}
                  onPress={() => openPicker(entry.id, 'date')}
                >
                  <Text style={styles.fieldLabel}>Date</Text>
                  <View style={styles.pickerButton}>
                    <Ionicons name="calendar-outline" size={16} color={tokens.accent} />
                    <Text style={styles.pickerButtonText}>{formatDate(entry.date)}</Text>
                  </View>
                </TouchableOpacity>

                {/* Start time field */}
                <TouchableOpacity
                  style={styles.timeField}
                  onPress={() => openPicker(entry.id, 'startTime')}
                >
                  <Text style={styles.fieldLabel}>Start</Text>
                  <View style={styles.pickerButton}>
                    <Ionicons name="time-outline" size={16} color={tokens.accent} />
                    <Text style={styles.pickerButtonText}>{formatTime(entry.startTime)}</Text>
                  </View>
                </TouchableOpacity>

                {/* End time field */}
                <TouchableOpacity
                  style={styles.timeField}
                  onPress={() => openPicker(entry.id, 'endTime')}
                >
                  <Text style={styles.fieldLabel}>End</Text>
                  <View style={styles.pickerButton}>
                    <Ionicons name="time-outline" size={16} color={tokens.accent} />
                    <Text style={styles.pickerButtonText}>{formatTime(entry.endTime)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add more button */}
          <TouchableOpacity style={styles.addMoreButton} onPress={addEntry}>
            <Ionicons name="add-circle-outline" size={22} color={tokens.accent} />
            <Text style={styles.addMoreText}>Add Another Entry</Text>
          </TouchableOpacity>

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* iOS Date/Time Picker Modal */}
        {Platform.OS === 'ios' && activePickerEntry && activePickerType && (
          <Modal
            visible={true}
            transparent
            animationType="slide"
            onRequestClose={cancelPicker}
          >
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={cancelPicker}>
                    <Text style={styles.pickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>
                    {activePickerType === 'date' ? 'Select Date' :
                      activePickerType === 'startTime' ? 'Start Time' : 'End Time'}
                  </Text>
                  <TouchableOpacity onPress={confirmPicker}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempPickerValue}
                  mode={activePickerType === 'date' ? 'date' : 'time'}
                  display="spinner"
                  onChange={handlePickerChange}
                  style={styles.picker}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Android Date/Time Picker */}
        {Platform.OS === 'android' && activePickerEntry && activePickerType && (
          <DateTimePicker
            value={tempPickerValue}
            mode={activePickerType === 'date' ? 'date' : 'time'}
            display={activePickerType === 'date' ? 'calendar' : 'clock'}
            onChange={handlePickerChange}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    headerButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    addAllText: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.accent,
    },
    disabledText: {
      opacity: 0.5,
    },
    entriesList: {
      flex: 1,
      padding: 16,
    },
    entryCard: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    entryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 12,
    },
    entryNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: tokens.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    entryNumberText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#ffffff',
    },
    typeToggle: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: tokens.border,
      borderRadius: 8,
      padding: 3,
    },
    typeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      borderRadius: 6,
      gap: 4,
    },
    typeButtonActive: {
      backgroundColor: tokens.accent,
    },
    typeButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    typeButtonTextActive: {
      color: '#ffffff',
    },
    removeButton: {
      padding: 6,
    },
    field: {
      marginBottom: 12,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: tokens.textSecondary,
      marginBottom: 6,
    },
    titleInput: {
      backgroundColor: tokens.background,
      borderRadius: 8,
      padding: 12,
      fontSize: 15,
      color: tokens.textPrimary,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    dateTimeRow: {
      flexDirection: 'row',
      gap: 10,
    },
    dateField: {
      flex: 1.2,
    },
    timeField: {
      flex: 1,
    },
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.background,
      borderRadius: 8,
      padding: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    pickerButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    addMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: tokens.accent,
      borderStyle: 'dashed',
    },
    addMoreText: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.accent,
    },
    // Picker modal styles
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    pickerContainer: {
      backgroundColor: tokens.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 34,
    },
    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    pickerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    pickerCancel: {
      fontSize: 16,
      color: tokens.textSecondary,
    },
    pickerDone: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.accent,
    },
    picker: {
      height: 200,
    },
  });
