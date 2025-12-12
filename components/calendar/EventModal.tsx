/**
 * EventModal - Modal for creating and editing calendar events/tasks
 * Features: all-day, multi-day, recurring, priority, clients, participants, location, notifications
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Event,
  CreateEventData,
  Client,
  EventPriority,
  NotificationRule,
  RecurrenceRule,
  RecurrenceFrequency,
  EventParticipant,
} from '../../lib/api/types';
import { clientsApi } from '../../lib/api/endpoints';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import LocationAutocomplete from './LocationAutocomplete';

type EntryType = 'event' | 'task';

interface EventModalProps {
  visible: boolean;
  event?: Event | null;
  initialDate?: Date;
  initialHour?: number;
  entryType?: EntryType;
  onClose: () => void;
  onSave: (data: CreateEventData) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
}

const PRIORITY_OPTIONS: { value: EventPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#94a3b8' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

const NOTIFICATION_PRESETS = [
  { label: 'At time of event', value: 0, trigger: 'minutes' as const },
  { label: '5 minutes before', value: 5, trigger: 'minutes' as const },
  { label: '15 minutes before', value: 15, trigger: 'minutes' as const },
  { label: '30 minutes before', value: 30, trigger: 'minutes' as const },
  { label: '1 hour before', value: 1, trigger: 'hours' as const },
  { label: '1 day before', value: 1, trigger: 'days' as const },
  { label: '1 week before', value: 1, trigger: 'weeks' as const },
];

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SERVICE_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'Landscaping', value: 'landscaping' },
  { label: 'Snow Removal', value: 'snow' },
  { label: 'Pet Services', value: 'pet' },
  { label: 'Other', value: 'other' },
];

export default function EventModal({
  visible,
  event,
  initialDate,
  initialHour,
  entryType = 'event',
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const isEditing = !!event;

  // Internal entry type state
  const [currentEntryType, setCurrentEntryType] = useState<EntryType>(entryType);
  const isTask = currentEntryType === 'task';

  // Basic form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [service, setService] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  // New feature states
  const [isAllDay, setIsAllDay] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [priority, setPriority] = useState<EventPriority>('medium');
  const [recurrence, setRecurrence] = useState<RecurrenceRule>({
    frequency: 'weekly',
    interval: 1,
    daysOfWeek: [new Date().getDay()],
  });
  const [notifications, setNotifications] = useState<NotificationRule[]>([
    { id: '1', value: 15, trigger: 'minutes', enabled: true },
  ]);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');

  // Client search state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    notifications: false,
    recurrence: false,
    participants: false,
  });

  // Date/time picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Sync internal entry type with prop
  useEffect(() => {
    if (visible) {
      setCurrentEntryType(entryType);
    }
  }, [visible, entryType]);

  // Initialize form
  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setLocation(event.location || '');
      setService(event.service || '');
      setStartDate(new Date(event.startTime));
      setEndDate(new Date(event.endTime));
      setIsAllDay(event.isAllDay || false);
      setIsMultiDay(event.isMultiDay || false);
      setIsRecurring(event.isRecurring || false);
      setPriority(event.priority || 'medium');
      if (event.recurrence) setRecurrence(event.recurrence);
      if (event.notifications) setNotifications(event.notifications);
      if (event.participants) setParticipants(event.participants);
      if (event.clientId) {
        setSelectedClient({ id: event.clientId, name: event.clientName || '' } as Client);
        setClientSearchQuery(event.clientName || '');
      }
    } else {
      const start = initialDate ? new Date(initialDate) : new Date();
      if (initialHour !== undefined) {
        start.setHours(initialHour, 0, 0, 0);
      }
      const end = new Date(start);
      end.setHours(end.getHours() + 1);

      setTitle('');
      setDescription('');
      setLocation('');
      setService('');
      setStartDate(start);
      setEndDate(end);
      setIsAllDay(false);
      setIsMultiDay(false);
      setIsRecurring(false);
      setPriority('medium');
      setRecurrence({ frequency: 'weekly', interval: 1, daysOfWeek: [start.getDay()] });
      setNotifications([{ id: '1', value: 15, trigger: 'minutes', enabled: true }]);
      setParticipants([]);
      setSelectedClient(null);
      setClientSearchQuery('');
    }
  }, [event, initialDate, initialHour, visible]);

  // All clients cache for initial display
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Fetch all clients for initial display
  const fetchAllClients = useCallback(async () => {
    if (allClients.length > 0) return; // Already loaded
    setLoadingClients(true);
    try {
      const response = await clientsApi.getClients({ limit: 100 });
      if (response.success && response.data) {
        // Sort alphabetically by name
        const sorted = [...response.data].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setAllClients(sorted);
      }
    } catch (error) {
      console.error('[EventModal] Error fetching clients:', error);
    } finally {
      setLoadingClients(false);
    }
  }, [allClients.length]);

  // Search/filter clients
  const searchClients = useCallback(async (query: string) => {
    if (query.length < 2) {
      // Show all clients when no search query
      setClientSuggestions(allClients);
      return;
    }
    // Filter from cached clients first for instant results
    const filtered = allClients.filter(client =>
      client.name.toLowerCase().includes(query.toLowerCase()) ||
      client.email?.toLowerCase().includes(query.toLowerCase())
    );
    setClientSuggestions(filtered);
  }, [allClients]);

  // Handle client input focus
  const handleClientInputFocus = useCallback(() => {
    fetchAllClients();
    setShowClientSuggestions(true);
    if (!clientSearchQuery) {
      setClientSuggestions(allClients);
    }
  }, [fetchAllClients, clientSearchQuery, allClients]);

  // Handle client input blur - hide suggestions after a delay to allow selection
  const handleClientInputBlur = useCallback(() => {
    // Delay to allow touch on suggestion item to register
    setTimeout(() => {
      setShowClientSuggestions(false);
    }, 200);
  }, []);

  // Update suggestions when allClients loads
  useEffect(() => {
    if (showClientSuggestions && !clientSearchQuery && allClients.length > 0) {
      setClientSuggestions(allClients);
    }
  }, [allClients, showClientSuggestions, clientSearchQuery]);

  // Debounced client search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!selectedClient) {
        searchClients(clientSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearchQuery, selectedClient, searchClients]);

  // Format functions
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Add notification
  const addNotification = (preset: typeof NOTIFICATION_PRESETS[0]) => {
    const exists = notifications.some(
      n => n.value === preset.value && n.trigger === preset.trigger
    );
    if (!exists) {
      setNotifications([
        ...notifications,
        {
          id: Date.now().toString(),
          value: preset.value,
          trigger: preset.trigger,
          enabled: true,
        },
      ]);
    }
  };

  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  // Add participant
  const addParticipant = () => {
    if (!newParticipantEmail.trim()) return;
    const exists = participants.some(p => p.email === newParticipantEmail.trim());
    if (!exists) {
      setParticipants([
        ...participants,
        {
          id: Date.now().toString(),
          name: newParticipantEmail.split('@')[0],
          email: newParticipantEmail.trim(),
          role: 'attendee',
          responseStatus: 'needs_action',
        },
      ]);
      setNewParticipantEmail('');
    }
  };

  // Remove participant
  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  // Toggle day of week for recurrence
  const toggleDayOfWeek = (day: number) => {
    const current = recurrence.daysOfWeek || [];
    if (current.includes(day)) {
      setRecurrence({
        ...recurrence,
        daysOfWeek: current.filter(d => d !== day),
      });
    } else {
      setRecurrence({
        ...recurrence,
        daysOfWeek: [...current, day].sort(),
      });
    }
  };

  // Handle save
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Error', `Please enter a title for the ${isTask ? 'task' : 'event'}`);
      return;
    }

    if (!isTask && !isAllDay && endDate <= startDate) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      let finalStartDate = new Date(startDate);
      let finalEndDate = new Date(endDate);

      if (isTask) {
        // Tasks have 30-min duration for calendar display
        finalEndDate = new Date(finalStartDate);
        finalEndDate.setMinutes(finalEndDate.getMinutes() + 30);
      } else if (isAllDay) {
        // All-day events: set times to full day boundaries
        finalStartDate.setHours(0, 0, 0, 0);
        if (isMultiDay) {
          // Multi-day all-day: end date is user-selected, set to end of that day
          finalEndDate.setHours(23, 59, 59, 999);
        } else {
          // Single all-day: same day
          finalEndDate = new Date(finalStartDate);
          finalEndDate.setHours(23, 59, 59, 999);
        }
      } else if (isMultiDay) {
        // Multi-day with specific times: keep user-selected start/end date+times
        // (no modification needed, user has full control)
      }
      // Regular single-day timed events: no modification needed

      const eventData: CreateEventData = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        service: service || undefined,
        startTime: finalStartDate.toISOString(),
        endTime: finalEndDate.toISOString(),
        type: isTask ? 'task' : 'event',
        priority,
        isAllDay,
        isMultiDay,
        isRecurring,
        recurrence: isRecurring ? recurrence : undefined,
        notifications: notifications.filter(n => n.enabled),
        participants: participants.length > 0 ? participants : undefined,
        clientId: selectedClient?.id,
        clientName: selectedClient?.name,
      };

      await onSave(eventData);
      onClose();
    } catch (error) {
      console.error('[EventModal] Error saving:', error);
      Alert.alert('Error', `Failed to save ${isTask ? 'task' : 'event'}`);
    } finally {
      setSaving(false);
    }
  }, [
    title, description, location, service, startDate, endDate,
    isTask, isAllDay, isMultiDay, isRecurring, priority,
    recurrence, notifications, participants, selectedClient,
    onSave, onClose,
  ]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!event || !onDelete) return;
    Alert.alert(
      `Delete ${isTask ? 'Task' : 'Event'}`,
      `Are you sure you want to delete this ${isTask ? 'task' : 'event'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete(event.id);
              onClose();
            } catch (error) {
              Alert.alert('Error', `Failed to delete ${isTask ? 'task' : 'event'}`);
            }
          },
        },
      ]
    );
  }, [event, isTask, onDelete, onClose]);

  // Date/time picker handlers
  const handleStartDateChange = (selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const newStart = new Date(startDate);
      newStart.setFullYear(selectedDate.getFullYear());
      newStart.setMonth(selectedDate.getMonth());
      newStart.setDate(selectedDate.getDate());
      setStartDate(newStart);
      if (endDate <= newStart) {
        const newEnd = new Date(newStart);
        newEnd.setHours(newEnd.getHours() + 1);
        setEndDate(newEnd);
      }
    }
  };

  const handleStartTimeChange = (selectedDate?: Date) => {
    setShowStartTimePicker(false);
    if (selectedDate) {
      const newStart = new Date(startDate);
      newStart.setHours(selectedDate.getHours());
      newStart.setMinutes(selectedDate.getMinutes());
      setStartDate(newStart);
      if (endDate <= newStart) {
        const newEnd = new Date(newStart);
        newEnd.setHours(newEnd.getHours() + 1);
        setEndDate(newEnd);
      }
    }
  };

  const handleEndDateChange = (selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      const newEnd = new Date(endDate);
      newEnd.setFullYear(selectedDate.getFullYear());
      newEnd.setMonth(selectedDate.getMonth());
      newEnd.setDate(selectedDate.getDate());
      if (newEnd > startDate) {
        setEndDate(newEnd);
      }
    }
  };

  const handleEndTimeChange = (selectedDate?: Date) => {
    setShowEndTimePicker(false);
    if (selectedDate) {
      const newEnd = new Date(endDate);
      newEnd.setHours(selectedDate.getHours());
      newEnd.setMinutes(selectedDate.getMinutes());
      if (newEnd > startDate) {
        setEndDate(newEnd);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing
              ? isTask ? 'Edit Task' : 'Edit Event'
              : isTask ? 'New Task' : 'New Event'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
            disabled={saving}
          >
            <Text style={[styles.saveText, saving && styles.disabledText]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Event/Task Toggle */}
        {!isEditing && (
          <View style={styles.typeToggleContainer}>
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[
                  styles.typeToggleButton,
                  currentEntryType === 'event' && styles.typeToggleButtonActive,
                ]}
                onPress={() => setCurrentEntryType('event')}
              >
                <Ionicons
                  name="calendar"
                  size={16}
                  color={currentEntryType === 'event' ? '#ffffff' : tokens.textSecondary}
                />
                <Text
                  style={[
                    styles.typeToggleText,
                    currentEntryType === 'event' && styles.typeToggleTextActive,
                  ]}
                >
                  Event
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeToggleButton,
                  currentEntryType === 'task' && styles.typeToggleButtonActive,
                ]}
                onPress={() => setCurrentEntryType('task')}
              >
                <Ionicons
                  name="checkbox-outline"
                  size={16}
                  color={currentEntryType === 'task' ? '#ffffff' : tokens.textSecondary}
                />
                <Text
                  style={[
                    styles.typeToggleText,
                    currentEntryType === 'task' && styles.typeToggleTextActive,
                  ]}
                >
                  Task
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
          {/* Title */}
          <View style={styles.field}>
            <TextInput
              style={styles.titleInput}
              placeholder={isTask ? "What needs to be done?" : "Add title"}
              placeholderTextColor={tokens.textSecondary}
              value={title}
              onChangeText={setTitle}
              autoFocus={!isEditing}
            />
          </View>

          {/* Priority Selector */}
          <View style={styles.section}>
            <View style={styles.fieldRow}>
              <Ionicons name="flag-outline" size={20} color={tokens.textSecondary} />
              <View style={styles.priorityContainer}>
                <Text style={styles.fieldLabel}>Priority</Text>
                <View style={styles.priorityOptions}>
                  {PRIORITY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.priorityOption,
                        priority === option.value && { backgroundColor: option.color },
                      ]}
                      onPress={() => setPriority(option.value)}
                    >
                      <Text
                        style={[
                          styles.priorityOptionText,
                          priority === option.value && styles.priorityOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Event Options (All-day, Multi-day, Recurring) - Events only */}
          {!isTask && (
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Ionicons name="sunny-outline" size={20} color={tokens.textSecondary} />
                  <Text style={styles.switchLabelText}>All-day event</Text>
                </View>
                <Switch
                  value={isAllDay}
                  onValueChange={setIsAllDay}
                  trackColor={{ false: tokens.border, true: tokens.accent }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Ionicons name="calendar-outline" size={20} color={tokens.textSecondary} />
                  <Text style={styles.switchLabelText}>Multi-day event</Text>
                </View>
                <Switch
                  value={isMultiDay}
                  onValueChange={setIsMultiDay}
                  trackColor={{ false: tokens.border, true: tokens.accent }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Ionicons name="repeat-outline" size={20} color={tokens.textSecondary} />
                  <Text style={styles.switchLabelText}>Recurring event</Text>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: tokens.border, true: tokens.accent }}
                />
              </View>
            </View>
          )}

          {/* Recurrence Options */}
          {isRecurring && !isTask && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.expandableHeader}
                onPress={() => toggleSection('recurrence')}
              >
                <Text style={styles.expandableTitle}>Recurrence Settings</Text>
                <Ionicons
                  name={expandedSections.recurrence ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={tokens.textSecondary}
                />
              </TouchableOpacity>

              {expandedSections.recurrence && (
                <View style={styles.expandedContent}>
                  <View style={styles.recurrenceOptions}>
                    {RECURRENCE_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.recurrenceOption,
                          recurrence.frequency === option.value && styles.recurrenceOptionActive,
                        ]}
                        onPress={() => setRecurrence({ ...recurrence, frequency: option.value })}
                      >
                        <Text
                          style={[
                            styles.recurrenceOptionText,
                            recurrence.frequency === option.value && styles.recurrenceOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {recurrence.frequency === 'weekly' && (
                    <View style={styles.daysOfWeek}>
                      <Text style={styles.daysOfWeekLabel}>Repeat on:</Text>
                      <View style={styles.daysOfWeekButtons}>
                        {DAYS_OF_WEEK.map((day, index) => (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dayButton,
                              recurrence.daysOfWeek?.includes(index) && styles.dayButtonActive,
                            ]}
                            onPress={() => toggleDayOfWeek(index)}
                          >
                            <Text
                              style={[
                                styles.dayButtonText,
                                recurrence.daysOfWeek?.includes(index) && styles.dayButtonTextActive,
                              ]}
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Date & Time */}
          <View style={styles.section}>
            <View style={styles.dateTimeRow}>
              <Ionicons name="time-outline" size={20} color={tokens.textSecondary} />
              <View style={styles.dateTimeFields}>
                {/* Start Date/Time */}
                <View style={styles.dateTimeField}>
                  <Text style={styles.fieldLabel}>{isTask ? 'Due Date' : 'Start'}</Text>
                  <View style={styles.dateTimeButtons}>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
                    </TouchableOpacity>
                    {!isAllDay && (
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => setShowStartTimePicker(true)}
                      >
                        <Text style={styles.timeButtonText}>{formatTime(startDate)}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* End Date/Time - show for events (not tasks) */}
                {!isTask && (
                  <View style={styles.dateTimeField}>
                    <Text style={styles.fieldLabel}>End</Text>
                    <View style={styles.dateTimeButtons}>
                      {/* Show end date picker for multi-day events */}
                      {isMultiDay && (
                        <TouchableOpacity
                          style={styles.dateButton}
                          onPress={() => setShowEndDatePicker(true)}
                        >
                          <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
                        </TouchableOpacity>
                      )}
                      {/* Show end time picker unless it's an all-day event */}
                      {!isAllDay && (
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => setShowEndTimePicker(true)}
                        >
                          <Text style={styles.timeButtonText}>{formatTime(endDate)}</Text>
                        </TouchableOpacity>
                      )}
                      {/* Show helper text for all-day single-day events */}
                      {isAllDay && !isMultiDay && (
                        <Text style={styles.allDayHint}>Same day</Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Client Search - Events only */}
          {!isTask && (
            <View style={styles.section}>
              <View style={styles.fieldRow}>
                <Ionicons name="person-outline" size={20} color={tokens.textSecondary} />
                <View style={styles.clientSearchContainer}>
                  <Text style={styles.fieldLabel}>Client</Text>
                  {selectedClient ? (
                    // Show selected client as a chip
                    <View style={styles.selectedClientChip}>
                      <Ionicons name="person" size={16} color={tokens.accent} />
                      <View style={styles.selectedClientInfo}>
                        <Text style={styles.selectedClientName}>{selectedClient.name}</Text>
                        {selectedClient.email && (
                          <Text style={styles.selectedClientEmail}>{selectedClient.email}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedClient(null);
                          setClientSearchQuery('');
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close-circle" size={20} color={tokens.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    // Show search input when no client selected
                    <TextInput
                      style={styles.clientSearchInput}
                      placeholder="Search for a client..."
                      placeholderTextColor={tokens.textSecondary}
                      value={clientSearchQuery}
                      onChangeText={(text) => {
                        setClientSearchQuery(text);
                        setShowClientSuggestions(true);
                      }}
                      onFocus={handleClientInputFocus}
                      onBlur={handleClientInputBlur}
                    />
                  )}
                </View>
              </View>
              {showClientSuggestions && !selectedClient && (
                <View style={styles.clientDropdown}>
                  {loadingClients ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>Loading clients...</Text>
                    </View>
                  ) : clientSuggestions.length > 0 ? (
                    <ScrollView
                      style={styles.clientDropdownScroll}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      keyboardShouldPersistTaps="always"
                    >
                      {clientSuggestions.map((client, index) => (
                        <TouchableOpacity
                          key={client.id}
                          activeOpacity={0.7}
                          style={[
                            styles.clientDropdownItem,
                            index < clientSuggestions.length - 1 && styles.clientDropdownItemBorder,
                          ]}
                          onPress={() => {
                            console.log('[EventModal] Client selected:', client.name);
                            setSelectedClient(client);
                            setClientSearchQuery(client.name);
                            setShowClientSuggestions(false);
                          }}
                        >
                          <Ionicons name="person" size={16} color={tokens.accent} />
                          <View style={styles.clientDropdownText}>
                            <Text style={styles.clientDropdownName}>{client.name}</Text>
                            {client.email && (
                              <Text style={styles.clientDropdownEmail}>{client.email}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.noResultsContainer}>
                      <Text style={styles.noResultsText}>No clients found</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Participants - Events only */}
          {!isTask && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.expandableHeader}
                onPress={() => toggleSection('participants')}
              >
                <View style={styles.expandableHeaderLeft}>
                  <Ionicons name="people-outline" size={20} color={tokens.textSecondary} />
                  <Text style={styles.expandableTitle}>
                    Participants {participants.length > 0 && `(${participants.length})`}
                  </Text>
                </View>
                <Ionicons
                  name={expandedSections.participants ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={tokens.textSecondary}
                />
              </TouchableOpacity>

              {expandedSections.participants && (
                <View style={styles.expandedContent}>
                  <View style={styles.addParticipantRow}>
                    <TextInput
                      style={styles.participantInput}
                      placeholder="Enter email address"
                      placeholderTextColor={tokens.textSecondary}
                      value={newParticipantEmail}
                      onChangeText={setNewParticipantEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.addParticipantButton}
                      onPress={addParticipant}
                    >
                      <Ionicons name="add" size={20} color="#ffffff" />
                    </TouchableOpacity>
                  </View>

                  {participants.map((participant) => (
                    <View key={participant.id} style={styles.participantItem}>
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName}>{participant.name}</Text>
                        <Text style={styles.participantEmail}>{participant.email}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeParticipant(participant.id)}>
                        <Ionicons name="close" size={18} color={tokens.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Location - Events only */}
          {!isTask && (
            <View style={[styles.section, styles.locationSection]}>
              <View style={styles.fieldRow}>
                <Ionicons name="location-outline" size={20} color={tokens.textSecondary} style={styles.locationIcon} />
                <LocationAutocomplete
                  value={location}
                  onChangeText={setLocation}
                  onSelectLocation={(details) => {
                    setLocation(details.address);
                    // Could store placeId, lat/lng in the future
                  }}
                  placeholder="Add location"
                />
              </View>
            </View>
          )}

          {/* Service - Events only */}
          {!isTask && (
            <View style={styles.section}>
              <View style={styles.fieldRow}>
                <Ionicons name="briefcase-outline" size={20} color={tokens.textSecondary} />
                <View style={styles.serviceSelector}>
                  <Text style={styles.serviceSelectorLabel}>Service</Text>
                  <View style={styles.serviceOptions}>
                    {SERVICE_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.serviceOption,
                          service === option.value && styles.serviceOptionSelected,
                        ]}
                        onPress={() => setService(option.value)}
                      >
                        <Text
                          style={[
                            styles.serviceOptionText,
                            service === option.value && styles.serviceOptionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Notifications */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.expandableHeader}
              onPress={() => toggleSection('notifications')}
            >
              <View style={styles.expandableHeaderLeft}>
                <Ionicons name="notifications-outline" size={20} color={tokens.textSecondary} />
                <Text style={styles.expandableTitle}>
                  Reminders {notifications.length > 0 && `(${notifications.length})`}
                </Text>
              </View>
              <Ionicons
                name={expandedSections.notifications ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={tokens.textSecondary}
              />
            </TouchableOpacity>

            {expandedSections.notifications && (
              <View style={styles.expandedContent}>
                <Text style={styles.quickAddLabel}>Quick add:</Text>
                <View style={styles.notificationPresets}>
                  {NOTIFICATION_PRESETS.map((preset, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.notificationPreset}
                      onPress={() => addNotification(preset)}
                    >
                      <Ionicons name="add-circle-outline" size={14} color={tokens.accent} />
                      <Text style={styles.notificationPresetText}>{preset.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {notifications.length > 0 && (
                  <View style={styles.activeNotifications}>
                    <Text style={styles.activeNotificationsLabel}>Active reminders:</Text>
                    {notifications.map((notification) => (
                      <View key={notification.id} style={styles.notificationItem}>
                        <Ionicons name="alarm-outline" size={16} color={tokens.accent} />
                        <Text style={styles.notificationItemText}>
                          {notification.value === 0
                            ? 'At time of event'
                            : `${notification.value} ${notification.trigger} before`}
                        </Text>
                        <TouchableOpacity onPress={() => removeNotification(notification.id)}>
                          <Ionicons name="close" size={18} color={tokens.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Description / Notes */}
          <View style={styles.section}>
            <View style={styles.fieldRow}>
              <Ionicons name="document-text-outline" size={20} color={tokens.textSecondary} />
              <TextInput
                style={[styles.fieldInput, styles.descriptionInput]}
                placeholder={isTask ? "Add notes" : "Add description"}
                placeholderTextColor={tokens.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Delete button */}
          {isEditing && onDelete && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={styles.deleteButtonText}>
                {isTask ? 'Delete Task' : 'Delete Event'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Date/Time Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => handleStartDateChange(date)}
          />
        )}
        {showStartTimePicker && (
          <DateTimePicker
            value={startDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minuteInterval={15}
            onChange={(_, date) => handleStartTimeChange(date)}
          />
        )}
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => handleEndDateChange(date)}
          />
        )}
        {showEndTimePicker && (
          <DateTimePicker
            value={endDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minuteInterval={15}
            onChange={(_, date) => handleEndTimeChange(date)}
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
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    cancelText: {
      fontSize: 16,
      color: tokens.textSecondary,
    },
    saveText: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.accent,
    },
    disabledText: {
      opacity: 0.5,
    },
    typeToggleContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    typeToggle: {
      flexDirection: 'row',
      backgroundColor: tokens.surface,
      borderRadius: 10,
      padding: 4,
    },
    typeToggleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    typeToggleButtonActive: {
      backgroundColor: tokens.accent,
    },
    typeToggleText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    typeToggleTextActive: {
      color: '#ffffff',
    },
    content: {
      flex: 1,
    },
    field: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    titleInput: {
      fontSize: 20,
      fontWeight: '500',
      color: tokens.textPrimary,
      padding: 0,
    },
    section: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    locationSection: {
      zIndex: 100,
      overflow: 'visible',
    },
    locationIcon: {
      marginTop: 2,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    fieldInput: {
      flex: 1,
      fontSize: 16,
      color: tokens.textPrimary,
      padding: 0,
    },
    fieldLabel: {
      fontSize: 14,
      color: tokens.textSecondary,
      marginBottom: 8,
    },
    descriptionInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    // Priority styles
    priorityContainer: {
      flex: 1,
    },
    priorityOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    priorityOption: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    priorityOptionText: {
      fontSize: 13,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    priorityOptionTextActive: {
      color: '#ffffff',
    },
    // Switch styles
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    switchLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    switchLabelText: {
      fontSize: 16,
      color: tokens.textPrimary,
    },
    // Expandable section styles
    expandableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    expandableHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    expandableTitle: {
      fontSize: 16,
      color: tokens.textPrimary,
    },
    expandedContent: {
      marginTop: 12,
      paddingLeft: 32,
    },
    // Recurrence styles
    recurrenceOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    recurrenceOption: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    recurrenceOptionActive: {
      backgroundColor: tokens.accent,
      borderColor: tokens.accent,
    },
    recurrenceOptionText: {
      fontSize: 13,
      color: tokens.textSecondary,
    },
    recurrenceOptionTextActive: {
      color: '#ffffff',
    },
    daysOfWeek: {
      marginTop: 8,
    },
    daysOfWeekLabel: {
      fontSize: 13,
      color: tokens.textSecondary,
      marginBottom: 8,
    },
    daysOfWeekButtons: {
      flexDirection: 'row',
      gap: 6,
    },
    dayButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tokens.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: tokens.border,
    },
    dayButtonActive: {
      backgroundColor: tokens.accent,
      borderColor: tokens.accent,
    },
    dayButtonText: {
      fontSize: 11,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    dayButtonTextActive: {
      color: '#ffffff',
    },
    // Date/Time styles
    dateTimeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    dateTimeFields: {
      flex: 1,
      gap: 16,
    },
    dateTimeField: {
      gap: 8,
    },
    dateTimeButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    dateButton: {
      backgroundColor: tokens.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    dateButtonText: {
      fontSize: 15,
      color: tokens.textPrimary,
    },
    timeButton: {
      backgroundColor: tokens.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    timeButtonText: {
      fontSize: 15,
      color: tokens.accent,
    },
    allDayHint: {
      fontSize: 14,
      color: tokens.textSecondary,
      fontStyle: 'italic',
      paddingVertical: 8,
    },
    // Client search styles
    clientSearchContainer: {
      flex: 1,
    },
    clientSearchInput: {
      backgroundColor: tokens.surface,
      borderRadius: 8,
      padding: 10,
      fontSize: 15,
      color: tokens.textPrimary,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    selectedClientChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.accent + '15',
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: tokens.accent + '40',
      gap: 8,
    },
    selectedClientInfo: {
      flex: 1,
    },
    selectedClientName: {
      fontSize: 15,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    selectedClientEmail: {
      fontSize: 12,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    // Client dropdown styles
    clientDropdown: {
      marginTop: 8,
      marginLeft: 32,
      backgroundColor: tokens.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: tokens.border,
      maxHeight: 250,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    clientDropdownScroll: {
      maxHeight: 248,
    },
    clientDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 10,
      backgroundColor: tokens.surface,
    },
    clientDropdownItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    clientDropdownText: {
      flex: 1,
    },
    clientDropdownName: {
      fontSize: 15,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    clientDropdownEmail: {
      fontSize: 13,
      color: tokens.textSecondary,
    },
    loadingContainer: {
      padding: 16,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      color: tokens.textSecondary,
    },
    noResultsContainer: {
      padding: 16,
      alignItems: 'center',
    },
    noResultsText: {
      fontSize: 14,
      color: tokens.textSecondary,
      fontStyle: 'italic',
    },
    // Participant styles
    addParticipantRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    participantInput: {
      flex: 1,
      backgroundColor: tokens.surface,
      borderRadius: 8,
      padding: 10,
      fontSize: 15,
      color: tokens.textPrimary,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    addParticipantButton: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: tokens.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    participantItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: tokens.surface,
      borderRadius: 8,
      padding: 10,
      marginBottom: 8,
    },
    participantInfo: {
      flex: 1,
    },
    participantName: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    participantEmail: {
      fontSize: 12,
      color: tokens.textSecondary,
    },
    // Notification styles
    quickAddLabel: {
      fontSize: 13,
      color: tokens.textSecondary,
      marginBottom: 8,
    },
    notificationPresets: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    notificationPreset: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    notificationPresetText: {
      fontSize: 12,
      color: tokens.textPrimary,
    },
    activeNotifications: {
      marginTop: 16,
    },
    activeNotificationsLabel: {
      fontSize: 13,
      color: tokens.textSecondary,
      marginBottom: 8,
    },
    notificationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: tokens.accent + '20',
      borderRadius: 8,
      padding: 10,
      marginBottom: 6,
    },
    notificationItemText: {
      flex: 1,
      fontSize: 14,
      color: tokens.textPrimary,
    },
    // Service styles
    serviceSelector: {
      flex: 1,
    },
    serviceSelectorLabel: {
      fontSize: 14,
      color: tokens.textSecondary,
      marginBottom: 8,
    },
    serviceOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    serviceOption: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    serviceOptionSelected: {
      backgroundColor: tokens.accent + '20',
      borderColor: tokens.accent,
    },
    serviceOptionText: {
      fontSize: 14,
      color: tokens.textSecondary,
    },
    serviceOptionTextSelected: {
      color: tokens.accent,
      fontWeight: '500',
    },
    // Delete button
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 32,
      marginBottom: 20,
      paddingVertical: 12,
    },
    deleteButtonText: {
      fontSize: 16,
      color: '#ef4444',
    },
  });
