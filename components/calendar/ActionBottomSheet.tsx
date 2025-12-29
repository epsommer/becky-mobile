/**
 * ActionBottomSheet - Bottom sheet action menu for the calendar
 *
 * Features:
 * - Three snap points: Collapsed (handle visible), Half (year calendar + quick actions), Full (all content)
 * - Year calendar for month navigation
 * - Quick action buttons (Create Event, Create Client Appointment, Today)
 * - View toggle (Day, Week, Month, Year)
 * - Gesture-based interaction with handle
 *
 * Based on web ActionSidebar research from ./research/web-action-sidebar-analysis.md
 */
import React, { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import { Event } from '../../lib/api/types';
import { CalendarView } from '../../context/CalendarContext';
import YearCalendarMini from './YearCalendarMini';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ActionBottomSheetRef {
  expand: () => void;
  collapse: () => void;
  snapToIndex: (index: number) => void;
  close: () => void;
}

interface ActionBottomSheetProps {
  /** Currently selected date */
  selectedDate: Date;
  /** Current calendar view */
  currentView: CalendarView;
  /** All events for displaying in year calendar */
  events: Event[];
  /** Callback when date is selected from year calendar */
  onDateSelect: (date: Date) => void;
  /** Callback when view is changed */
  onViewChange: (view: CalendarView) => void;
  /** Callback to create a new event */
  onCreateEvent: () => void;
  /** Callback to create a client appointment */
  onCreateClientAppointment: () => void;
  /** Callback to open quick entry */
  onOpenQuickEntry: () => void;
  /** Callback to go to today */
  onGoToToday: () => void;
}

const ActionBottomSheet = forwardRef<ActionBottomSheetRef, ActionBottomSheetProps>(
  (
    {
      selectedDate,
      currentView,
      events,
      onDateSelect,
      onViewChange,
      onCreateEvent,
      onCreateClientAppointment,
      onOpenQuickEntry,
      onGoToToday,
    },
    ref
  ) => {
    const { tokens } = useTheme();
    const styles = useMemo(() => createStyles(tokens), [tokens]);

    const bottomSheetRef = useRef<BottomSheet>(null);

    // Snap points: collapsed (60px), half (50%), full (90%)
    const snapPoints = useMemo(() => [60, '50%', '90%'], []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      expand: () => bottomSheetRef.current?.expand(),
      collapse: () => bottomSheetRef.current?.collapse(),
      snapToIndex: (index: number) => bottomSheetRef.current?.snapToIndex(index),
      close: () => bottomSheetRef.current?.close(),
    }));

    // Handle month selection from year calendar
    const handleMonthSelect = useCallback((date: Date) => {
      onDateSelect(date);
      // Switch to month view when selecting from year calendar
      if (currentView !== 'month' && currentView !== 'day') {
        onViewChange('month');
      }
    }, [currentView, onDateSelect, onViewChange]);

    // View toggle options
    const viewOptions: { view: CalendarView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
      { view: 'day', label: 'Day', icon: 'calendar-outline' },
      { view: 'week', label: 'Week', icon: 'calendar' },
      { view: 'month', label: 'Month', icon: 'grid-outline' },
      { view: 'year', label: 'Year', icon: 'apps-outline' },
    ];

    // Render custom handle
    const renderHandle = useCallback(() => (
      <View style={styles.handleContainer}>
        <View style={styles.handleBar} />
        <View style={styles.handleContent}>
          <Text style={styles.handleText}>Calendar Actions</Text>
          <Ionicons name="chevron-up" size={16} color={tokens.textSecondary} />
        </View>
      </View>
    ), [styles, tokens]);

    // Render custom background
    const renderBackground = useCallback(() => (
      <View style={styles.background} />
    ), [styles]);

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        handleComponent={renderHandle}
        backgroundComponent={renderBackground}
        enablePanDownToClose={false}
        enableContentPanningGesture={true}
        enableHandlePanningGesture={true}
        animateOnMount={true}
      >
        <BottomSheetScrollView
          style={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Year Calendar Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={18} color={tokens.accent} />
              <Text style={styles.sectionTitle}>Year Overview</Text>
            </View>
            <YearCalendarMini
              selectedDate={selectedDate}
              events={events}
              onMonthSelect={handleMonthSelect}
              onGoToToday={onGoToToday}
            />
          </View>

          {/* Quick Actions Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={18} color={tokens.accent} />
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={onCreateEvent}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: tokens.accent + '20' }]}>
                  <Ionicons name="add-circle" size={24} color={tokens.accent} />
                </View>
                <Text style={styles.quickActionLabel}>New Event</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={onCreateClientAppointment}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#22c55e20' }]}>
                  <Ionicons name="person-add" size={24} color="#22c55e" />
                </View>
                <Text style={styles.quickActionLabel}>Client Appt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={onOpenQuickEntry}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#8b5cf620' }]}>
                  <Ionicons name="flash" size={24} color="#8b5cf6" />
                </View>
                <Text style={styles.quickActionLabel}>Quick Add</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={onGoToToday}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#f5920b20' }]}>
                  <Ionicons name="today" size={24} color="#f59e0b" />
                </View>
                <Text style={styles.quickActionLabel}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* View Toggle Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="eye" size={18} color={tokens.accent} />
              <Text style={styles.sectionTitle}>View</Text>
            </View>
            <View style={styles.viewToggle}>
              {viewOptions.map(({ view, label, icon }) => (
                <TouchableOpacity
                  key={view}
                  style={[
                    styles.viewToggleButton,
                    currentView === view && styles.viewToggleButtonActive,
                  ]}
                  onPress={() => onViewChange(view)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={icon}
                    size={20}
                    color={currentView === view ? '#ffffff' : tokens.textSecondary}
                  />
                  <Text
                    style={[
                      styles.viewToggleLabel,
                      currentView === view && styles.viewToggleLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Selected Date Info */}
          <View style={styles.section}>
            <View style={styles.selectedDateInfo}>
              <Text style={styles.selectedDateLabel}>Selected:</Text>
              <Text style={styles.selectedDateValue}>
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {/* Bottom padding for safe area */}
          <View style={{ height: 40 }} />
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

ActionBottomSheet.displayName = 'ActionBottomSheet';

export default ActionBottomSheet;

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    handleContainer: {
      backgroundColor: tokens.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: 8,
      paddingBottom: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    handleBar: {
      width: 40,
      height: 4,
      backgroundColor: tokens.muted,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 8,
    },
    handleContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    handleText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    background: {
      backgroundColor: tokens.background,
      flex: 1,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    contentContainer: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    section: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    quickActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    quickActionButton: {
      alignItems: 'center',
      flex: 1,
    },
    quickActionIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    quickActionLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: tokens.textPrimary,
      textAlign: 'center',
    },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 4,
    },
    viewToggleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 8,
      gap: 6,
    },
    viewToggleButtonActive: {
      backgroundColor: tokens.accent,
    },
    viewToggleLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    viewToggleLabelActive: {
      color: '#ffffff',
    },
    selectedDateInfo: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    selectedDateLabel: {
      fontSize: 12,
      color: tokens.textSecondary,
      marginBottom: 4,
    },
    selectedDateValue: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
      textAlign: 'center',
    },
  });
