/**
 * TimeManagerScreen - Calendar with day/week/month views and drag-drop events
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import { CalendarProvider, useCalendar, CalendarView } from '../../context/CalendarContext';
import { DayView, WeekView, MonthView, EventModal, QuickEntrySheet } from '../calendar';
import { Event, CreateEventData } from '../../lib/api/types';

function CalendarContent() {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const {
    selectedDate,
    setSelectedDate,
    currentView,
    setCurrentView,
    events,
    loading,
    goToToday,
    goToPrevious,
    goToNext,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendar();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [initialDate, setInitialDate] = useState<Date | undefined>();
  const [initialHour, setInitialHour] = useState<number | undefined>();

  // Date picker modal state
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Quick entry sheet state
  const [quickEntryVisible, setQuickEntryVisible] = useState(false);

  // FAB menu state
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [newEntryType, setNewEntryType] = useState<'event' | 'task'>('event');

  // Check if viewing today
  const isViewingToday = useMemo(() => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  }, [selectedDate]);

  // Format header date based on view
  const headerTitle = useMemo(() => {
    switch (currentView) {
      case 'day':
        return selectedDate.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
      case 'week':
        const weekStart = new Date(selectedDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.toLocaleDateString(undefined, { month: 'long' })} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
        }
        return `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'month':
        return selectedDate.toLocaleDateString(undefined, {
          month: 'long',
          year: 'numeric',
        });
    }
  }, [selectedDate, currentView]);

  // Handle event press
  const handleEventPress = useCallback((event: Event) => {
    setSelectedEvent(event);
    setInitialDate(undefined);
    setInitialHour(undefined);
    setModalVisible(true);
  }, []);

  // Handle time slot press (create new event)
  const handleTimeSlotPress = useCallback((date: Date, hour: number) => {
    setSelectedEvent(null);
    setInitialDate(date);
    setInitialHour(hour);
    setModalVisible(true);
  }, []);

  // Handle day press (switch to day view)
  const handleDayPress = useCallback((date: Date) => {
    setSelectedDate(date);
    if (currentView === 'month') {
      setCurrentView('day');
    }
  }, [currentView, setSelectedDate, setCurrentView]);

  // Handle event update (drag/resize)
  const handleEventUpdate = useCallback(async (event: Event, newStart: string, newEnd: string) => {
    console.log('[TimeManagerScreen] ========== EVENT UPDATE HANDLER ==========');
    console.log('[TimeManagerScreen] Event:', event.id, event.title);
    console.log('[TimeManagerScreen] Old times:', event.startTime, 'to', event.endTime);
    console.log('[TimeManagerScreen] New times:', newStart, 'to', newEnd);
    await updateEvent(event.id, {
      startTime: newStart,
      endTime: newEnd,
    });
    console.log('[TimeManagerScreen] updateEvent call completed');
  }, [updateEvent]);

  // Handle save from modal
  const handleSaveEvent = useCallback(async (data: CreateEventData) => {
    if (selectedEvent) {
      await updateEvent(selectedEvent.id, data);
    } else {
      await createEvent(data);
    }
  }, [selectedEvent, createEvent, updateEvent]);

  // Handle delete from modal
  const handleDeleteEvent = useCallback(async (eventId: string) => {
    await deleteEvent(eventId);
  }, [deleteEvent]);

  // Handle adding multiple events from quick entry
  const handleAddMultipleEvents = useCallback(async (events: CreateEventData[]) => {
    for (const eventData of events) {
      await createEvent(eventData);
    }
  }, [createEvent]);

  // Handle FAB menu options
  const handleAddNewEvent = useCallback(() => {
    setFabMenuVisible(false);
    setNewEntryType('event');
    setSelectedEvent(null);
    setInitialDate(selectedDate);
    setInitialHour(new Date().getHours());
    setModalVisible(true);
  }, [selectedDate]);

  const handleAddNewTask = useCallback(() => {
    setFabMenuVisible(false);
    setNewEntryType('task');
    setSelectedEvent(null);
    setInitialDate(selectedDate);
    setInitialHour(9); // Default task time
    setModalVisible(true);
  }, [selectedDate]);

  const handleOpenQuickEntry = useCallback(() => {
    setFabMenuVisible(false);
    setQuickEntryVisible(true);
  }, []);

  // Handle date picker open
  const handleOpenDatePicker = useCallback(() => {
    setTempDate(selectedDate);
    setDatePickerVisible(true);
  }, [selectedDate]);

  // Handle date picker change
  const handleDateChange = useCallback((event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setDatePickerVisible(false);
      if (event.type === 'set' && date) {
        setSelectedDate(date);
      }
    } else if (date) {
      setTempDate(date);
    }
  }, [setSelectedDate]);

  // Handle date picker confirm (iOS)
  const handleDateConfirm = useCallback(() => {
    setSelectedDate(tempDate);
    setDatePickerVisible(false);
  }, [tempDate, setSelectedDate]);

  // View buttons
  const viewButtons: { view: CalendarView; label: string }[] = [
    { view: 'day', label: 'Day' },
    { view: 'week', label: 'Week' },
    { view: 'month', label: 'Month' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with navigation */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={goToPrevious} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>

          {/* Date title - tappable to open date picker */}
          <TouchableOpacity
            style={styles.dateTitleButton}
            onPress={handleOpenDatePicker}
          >
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Ionicons name="calendar-outline" size={18} color={tokens.accent} />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNext} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Go to Today button - only show when not viewing today */}
        {!isViewingToday && (
          <TouchableOpacity onPress={goToToday} style={styles.goToTodayButton}>
            <Ionicons name="today-outline" size={16} color={tokens.accent} />
            <Text style={styles.goToTodayText}>Go to Today</Text>
          </TouchableOpacity>
        )}

        {/* View selector */}
        <View style={styles.viewSelector}>
          {viewButtons.map(({ view, label }) => (
            <TouchableOpacity
              key={view}
              style={[
                styles.viewButton,
                currentView === view && styles.viewButtonActive,
              ]}
              onPress={() => setCurrentView(view)}
            >
              <Text
                style={[
                  styles.viewButtonText,
                  currentView === view && styles.viewButtonTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      )}

      {/* Calendar view */}
      <View style={styles.calendarContainer}>
        {currentView === 'day' && (
          <DayView
            date={selectedDate}
            events={events}
            onEventPress={handleEventPress}
            onTimeSlotPress={handleTimeSlotPress}
            onEventUpdate={handleEventUpdate}
          />
        )}
        {currentView === 'week' && (
          <WeekView
            startDate={selectedDate}
            events={events}
            onEventPress={handleEventPress}
            onTimeSlotPress={handleTimeSlotPress}
            onEventUpdate={handleEventUpdate}
            onDayPress={handleDayPress}
          />
        )}
        {currentView === 'month' && (
          <MonthView
            date={selectedDate}
            events={events}
            onDayPress={handleDayPress}
            onEventPress={handleEventPress}
          />
        )}
      </View>

      {/* FAB with menu */}
      <View style={styles.fabContainer}>
        {/* FAB Menu - shows when fabMenuVisible */}
        {fabMenuVisible && (
          <>
            {/* Backdrop to close menu */}
            <TouchableOpacity
              style={styles.fabMenuBackdrop}
              activeOpacity={1}
              onPress={() => setFabMenuVisible(false)}
            />
            <View style={styles.fabMenu}>
              <TouchableOpacity
                style={styles.fabMenuItem}
                onPress={handleOpenQuickEntry}
              >
                <Ionicons name="flash-outline" size={20} color={tokens.accent} />
                <Text style={styles.fabMenuText}>Quick Entry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fabMenuItem}
                onPress={handleAddNewTask}
              >
                <Ionicons name="checkbox-outline" size={20} color={tokens.accent} />
                <Text style={styles.fabMenuText}>Add Task</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fabMenuItem}
                onPress={handleAddNewEvent}
              >
                <Ionicons name="calendar-outline" size={20} color={tokens.accent} />
                <Text style={styles.fabMenuText}>Add Event</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Main FAB */}
        <TouchableOpacity
          style={[styles.fab, fabMenuVisible && styles.fabActive]}
          onPress={() => setFabMenuVisible(!fabMenuVisible)}
        >
          <Ionicons
            name={fabMenuVisible ? 'close' : 'add'}
            size={28}
            color="#ffffff"
          />
        </TouchableOpacity>
      </View>

      {/* Event/Task modal */}
      <EventModal
        visible={modalVisible}
        event={selectedEvent}
        initialDate={initialDate}
        initialHour={initialHour}
        entryType={newEntryType}
        onClose={() => {
          setModalVisible(false);
          setSelectedEvent(null);
          setNewEntryType('event'); // Reset to default
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Quick entry sheet */}
      <QuickEntrySheet
        visible={quickEntryVisible}
        onClose={() => setQuickEntryVisible(false)}
        onAddEvents={handleAddMultipleEvents}
        selectedDate={selectedDate}
      />

      {/* Date Picker Modal - iOS style */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={datePickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDatePickerVisible(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setDatePickerVisible(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={handleDateConfirm}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.datePicker}
              />
              <TouchableOpacity
                style={styles.datePickerTodayButton}
                onPress={() => {
                  setTempDate(new Date());
                }}
              >
                <Ionicons name="today-outline" size={18} color={tokens.accent} />
                <Text style={styles.datePickerTodayText}>Jump to Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker - Android style (native) */}
      {Platform.OS === 'android' && datePickerVisible && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="calendar"
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
  );
}

export default function TimeManagerScreen() {
  return (
    <CalendarProvider>
      <CalendarContent />
    </CalendarProvider>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    navButton: {
      padding: 8,
    },
    dateTitleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginHorizontal: 8,
      borderRadius: 8,
      backgroundColor: tokens.surface,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
      textAlign: 'center',
    },
    goToTodayButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      marginBottom: 8,
    },
    goToTodayText: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.accent,
    },
    viewSelector: {
      flexDirection: 'row',
      backgroundColor: tokens.surface,
      borderRadius: 8,
      padding: 4,
    },
    viewButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 6,
    },
    viewButtonActive: {
      backgroundColor: tokens.accent,
    },
    viewButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    viewButtonTextActive: {
      color: '#ffffff',
    },
    loadingContainer: {
      position: 'absolute',
      top: 160,
      left: 0,
      right: 0,
      zIndex: 50,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 12,
      color: tokens.textSecondary,
      backgroundColor: tokens.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    calendarContainer: {
      flex: 1,
    },
    fabContainer: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      alignItems: 'flex-end',
      zIndex: 100,
    },
    fabMenuBackdrop: {
      position: 'absolute',
      top: -1000,
      left: -1000,
      right: -1000,
      bottom: -1000,
      zIndex: 1,
    },
    fabMenu: {
      backgroundColor: tokens.background,
      borderRadius: 12,
      marginBottom: 12,
      paddingVertical: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: tokens.border,
      zIndex: 2,
    },
    fabMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    fabMenuText: {
      fontSize: 15,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: tokens.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 3,
    },
    fabActive: {
      transform: [{ rotate: '45deg' }],
    },
    // Date Picker Modal Styles
    datePickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    datePickerContainer: {
      backgroundColor: tokens.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 34,
    },
    datePickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    datePickerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    datePickerCancel: {
      fontSize: 16,
      color: tokens.textSecondary,
    },
    datePickerDone: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.accent,
    },
    datePicker: {
      height: 200,
    },
    datePickerTodayButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.accent,
    },
    datePickerTodayText: {
      fontSize: 16,
      fontWeight: '500',
      color: tokens.accent,
    },
  });
