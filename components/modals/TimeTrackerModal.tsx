"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { Client as ApiClient } from "../../lib/api/types";
import { clientsApi } from "../../lib/api/endpoints/clients";

// Use ApiClient type for compatibility with clientsApi
type Client = ApiClient;
import { useServiceLines } from "../../hooks/useServiceLines";
import useTimeTracker, { TimeEntry, TimeEntryFormData, ManualTimeEntryData } from "../../hooks/useTimeTracker";
import DatePickerModal from "../shared/DatePickerModal";

interface TimeTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClientId?: string;
  onTimeEntryCreated?: (entry: TimeEntry) => void;
}

type ViewMode = "timer" | "manual" | "entries";

export default function TimeTrackerModal({
  isOpen,
  onClose,
  initialClientId,
  onTimeEntryCreated,
}: TimeTrackerModalProps) {
  const { tokens } = useTheme();

  // Clients state
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Service lines
  const { serviceLines, loading: loadingServiceLines } = useServiceLines();

  // Time tracker hook
  const {
    isRunning,
    elapsedTime,
    currentEntry,
    completedEntries,
    loading: loadingEntries,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    discardTimer,
    addManualEntry,
    deleteEntry,
    formatDuration,
    formatHours,
    calculateTotalHours,
    calculateTotalAmount,
    getEntriesByClient,
  } = useTimeTracker();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("timer");

  // Form state
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || "");
  const [selectedServiceLineId, setSelectedServiceLineId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [billable, setBillable] = useState(true);

  // Manual entry state
  const [manualStartDate, setManualStartDate] = useState(new Date());
  const [manualEndDate, setManualEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Entries filter state
  const [filterClientId, setFilterClientId] = useState<string>("");
  const [filterDateRange, setFilterDateRange] = useState<"today" | "week" | "month" | "all">("all");

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true);
        const response = await clientsApi.getClients({ limit: 100 });
        if (response.success && response.data) {
          setClients(response.data);
        } else {
          console.error('[TimeTrackerModal] Failed to load clients:', response);
          setClients([]);
        }
      } catch (error) {
        console.error('[TimeTrackerModal] Error loading clients:', error);
        Alert.alert('Error', 'Failed to load clients');
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    };

    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedClientId(initialClientId || "");
      // Don't reset form if timer is running
      if (!isRunning) {
        setSelectedServiceLineId("");
        setServiceType("");
        setNotes("");
        setHourlyRate("");
        setBillable(true);
      }
      // Set view to timer by default, or entries if no client
      setViewMode("timer");
    }
  }, [isOpen, initialClientId, isRunning]);

  // Update service type when service line changes
  useEffect(() => {
    if (selectedServiceLineId) {
      const serviceLine = serviceLines.find(l => l.id === selectedServiceLineId);
      if (serviceLine) {
        setServiceType(serviceLine.category);
      }
    }
  }, [selectedServiceLineId, serviceLines]);

  // Get selected client
  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  // Get filtered entries
  const filteredEntries = useMemo(() => {
    let entries = completedEntries;

    // Filter by client
    if (filterClientId) {
      entries = entries.filter(e => e.clientId === filterClientId);
    }

    // Filter by date range
    const now = new Date();
    switch (filterDateRange) {
      case "today":
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        entries = entries.filter(e => e.startTime >= todayStart);
        break;
      case "week":
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
        entries = entries.filter(e => e.startTime >= weekStart);
        break;
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        entries = entries.filter(e => e.startTime >= monthStart);
        break;
    }

    return entries;
  }, [completedEntries, filterClientId, filterDateRange]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalHours = calculateTotalHours(filteredEntries);
    const totalAmount = calculateTotalAmount(filteredEntries);
    return { totalHours, totalAmount };
  }, [filteredEntries, calculateTotalHours, calculateTotalAmount]);

  // Handle start timer
  const handleStartTimer = async () => {
    if (!selectedClientId) {
      Alert.alert('Error', 'Please select a client');
      return;
    }

    const formData: TimeEntryFormData = {
      clientId: selectedClientId,
      clientName: selectedClient?.name || 'Unknown',
      serviceType: serviceType || 'General Service',
      serviceLineId: selectedServiceLineId || undefined,
      notes,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      billable,
    };

    await startTimer(formData);
  };

  // Handle stop timer
  const handleStopTimer = async () => {
    const entry = await stopTimer();
    if (entry && onTimeEntryCreated) {
      onTimeEntryCreated(entry);
    }

    // Reset form
    setServiceType("");
    setNotes("");
    setHourlyRate("");
    setBillable(true);
  };

  // Handle add manual entry
  const handleAddManualEntry = async () => {
    if (!selectedClientId) {
      Alert.alert('Error', 'Please select a client');
      return;
    }

    if (manualEndDate <= manualStartDate) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    const entryData: ManualTimeEntryData = {
      clientId: selectedClientId,
      clientName: selectedClient?.name || 'Unknown',
      serviceType: serviceType || 'General Service',
      serviceLineId: selectedServiceLineId || undefined,
      notes,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      billable,
      startTime: manualStartDate,
      endTime: manualEndDate,
    };

    const entry = await addManualEntry(entryData);
    if (onTimeEntryCreated) {
      onTimeEntryCreated(entry);
    }

    Alert.alert('Success', 'Time entry added');

    // Reset form
    setServiceType("");
    setNotes("");
    setHourlyRate("");
    setBillable(true);
    setManualStartDate(new Date());
    setManualEndDate(new Date());
    setViewMode("entries");
  };

  // Handle delete entry
  const handleDeleteEntry = (entryId: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this time entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteEntry(entryId),
        },
      ]
    );
  };

  // Handle discard timer
  const handleDiscardTimer = () => {
    Alert.alert(
      'Discard Timer',
      'Are you sure you want to discard the current timer without saving?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: discardTimer,
        },
      ]
    );
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Calculate cost for entry
  const calculateEntryCost = (entry: TimeEntry) => {
    if (!entry.hourlyRate || !entry.endTime) return null;
    const hours = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
    return (hours * entry.hourlyRate).toFixed(2);
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor: tokens.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="timer-outline" size={24} color={tokens.accent} />
              <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
                Time Tracker
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={tokens.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* View Mode Tabs */}
          <View style={[styles.tabContainer, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <TouchableOpacity
              style={[styles.tab, viewMode === "timer" && { backgroundColor: tokens.accent }]}
              onPress={() => setViewMode("timer")}
            >
              <Ionicons
                name="play-circle-outline"
                size={18}
                color={viewMode === "timer" ? tokens.background : tokens.textSecondary}
              />
              <Text style={[styles.tabText, { color: viewMode === "timer" ? tokens.background : tokens.textPrimary }]}>
                Timer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, viewMode === "manual" && { backgroundColor: tokens.accent }]}
              onPress={() => setViewMode("manual")}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={viewMode === "manual" ? tokens.background : tokens.textSecondary}
              />
              <Text style={[styles.tabText, { color: viewMode === "manual" ? tokens.background : tokens.textPrimary }]}>
                Manual
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, viewMode === "entries" && { backgroundColor: tokens.accent }]}
              onPress={() => setViewMode("entries")}
            >
              <Ionicons
                name="list-outline"
                size={18}
                color={viewMode === "entries" ? tokens.background : tokens.textSecondary}
              />
              <Text style={[styles.tabText, { color: viewMode === "entries" ? tokens.background : tokens.textPrimary }]}>
                Entries
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            {/* Timer View */}
            {viewMode === "timer" && (
              <>
                {/* Timer Display */}
                <View style={[styles.timerSection, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                  <Text style={[styles.timerDisplay, { color: tokens.textPrimary }]}>
                    {formatDuration(isRunning ? elapsedTime : 0)}
                  </Text>
                  <Text style={[styles.timerStatus, { color: tokens.textSecondary }]}>
                    {isRunning ? 'IN PROGRESS' : 'STOPPED'}
                  </Text>
                  {isRunning && currentEntry && (
                    <View style={[styles.currentEntryInfo, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                      <Text style={[styles.currentEntryClient, { color: tokens.textPrimary }]}>
                        {currentEntry.clientName}
                      </Text>
                      <Text style={[styles.currentEntryService, { color: tokens.textSecondary }]}>
                        {currentEntry.serviceType}
                      </Text>
                    </View>
                  )}
                </View>

                {!isRunning ? (
                  /* Timer Setup Form */
                  <>
                    {/* Client Selection */}
                    <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                      <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Select Client *</Text>
                      {loadingClients ? (
                        <ActivityIndicator size="small" color={tokens.accent} />
                      ) : (
                        <View style={[styles.picker, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                          <Picker
                            selectedValue={selectedClientId}
                            onValueChange={(itemValue) => setSelectedClientId(itemValue)}
                            style={{ color: tokens.textPrimary }}
                          >
                            <Picker.Item label="Choose a client..." value="" />
                            {clients.map((client) => (
                              <Picker.Item key={client.id} label={client.name} value={client.id} />
                            ))}
                          </Picker>
                        </View>
                      )}
                    </View>

                    {/* Service Line Selection */}
                    <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                      <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Service Type</Text>
                      {loadingServiceLines ? (
                        <ActivityIndicator size="small" color={tokens.accent} />
                      ) : (
                        <View style={[styles.picker, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                          <Picker
                            selectedValue={selectedServiceLineId}
                            onValueChange={(itemValue) => setSelectedServiceLineId(itemValue)}
                            style={{ color: tokens.textPrimary }}
                          >
                            <Picker.Item label="Choose a service..." value="" />
                            {serviceLines.map((line) => (
                              <Picker.Item key={line.id} label={line.category} value={line.id} />
                            ))}
                          </Picker>
                        </View>
                      )}
                    </View>

                    {/* Hourly Rate */}
                    <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                      <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Hourly Rate (Optional)</Text>
                      <TextInput
                        style={[styles.input, { color: tokens.textPrimary, borderColor: tokens.border }]}
                        value={hourlyRate}
                        onChangeText={setHourlyRate}
                        placeholder="0.00"
                        placeholderTextColor={tokens.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    {/* Notes */}
                    <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                      <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Notes</Text>
                      <TextInput
                        style={[styles.notesInput, { color: tokens.textPrimary, borderColor: tokens.border }]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="What are you working on?"
                        placeholderTextColor={tokens.textSecondary}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </View>

                    {/* Billable Toggle */}
                    <TouchableOpacity
                      style={[styles.toggleRow, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                      onPress={() => setBillable(!billable)}
                    >
                      <View style={styles.toggleInfo}>
                        <Ionicons name="cash-outline" size={20} color={tokens.accent} />
                        <Text style={[styles.toggleLabel, { color: tokens.textPrimary }]}>Billable</Text>
                      </View>
                      <Ionicons
                        name={billable ? "checkbox" : "square-outline"}
                        size={24}
                        color={billable ? tokens.accent : tokens.textSecondary}
                      />
                    </TouchableOpacity>

                    {/* Start Button */}
                    <TouchableOpacity
                      style={[styles.startButton, { backgroundColor: tokens.accent }]}
                      onPress={handleStartTimer}
                    >
                      <Ionicons name="play" size={24} color={tokens.background} />
                      <Text style={[styles.startButtonText, { color: tokens.background }]}>
                        Start Timer
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  /* Timer Running Controls */
                  <>
                    <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                      <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Current Session</Text>
                      {currentEntry && (
                        <>
                          <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Client</Text>
                            <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{currentEntry.clientName}</Text>
                          </View>
                          <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Service</Text>
                            <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{currentEntry.serviceType}</Text>
                          </View>
                          {currentEntry.hourlyRate && (
                            <View style={styles.infoRow}>
                              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Rate</Text>
                              <Text style={[styles.infoValue, { color: '#4CAF50' }]}>${currentEntry.hourlyRate.toFixed(2)}/hr</Text>
                            </View>
                          )}
                          {currentEntry.notes && (
                            <View style={styles.infoRow}>
                              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Notes</Text>
                              <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{currentEntry.notes}</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>

                    <View style={styles.timerControls}>
                      <TouchableOpacity
                        style={[styles.controlButton, { backgroundColor: '#F44336' }]}
                        onPress={handleStopTimer}
                      >
                        <Ionicons name="stop" size={24} color="#FFFFFF" />
                        <Text style={styles.controlButtonText}>Stop & Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.controlButton, styles.secondaryButton, { borderColor: tokens.border }]}
                        onPress={handleDiscardTimer}
                      >
                        <Ionicons name="trash-outline" size={20} color={tokens.textSecondary} />
                        <Text style={[styles.controlButtonTextSecondary, { color: tokens.textSecondary }]}>Discard</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}

            {/* Manual Entry View */}
            {viewMode === "manual" && (
              <>
                {/* Client Selection */}
                <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                  <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Select Client *</Text>
                  {loadingClients ? (
                    <ActivityIndicator size="small" color={tokens.accent} />
                  ) : (
                    <View style={[styles.picker, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                      <Picker
                        selectedValue={selectedClientId}
                        onValueChange={(itemValue) => setSelectedClientId(itemValue)}
                        style={{ color: tokens.textPrimary }}
                      >
                        <Picker.Item label="Choose a client..." value="" />
                        {clients.map((client) => (
                          <Picker.Item key={client.id} label={client.name} value={client.id} />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>

                {/* Date/Time Selection */}
                <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                  <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Time Period</Text>
                  <View style={styles.dateRow}>
                    <View style={[styles.dateField, styles.halfField]}>
                      <Text style={[styles.label, { color: tokens.textSecondary }]}>Start *</Text>
                      <TouchableOpacity
                        style={[styles.dateButton, { backgroundColor: tokens.background, borderColor: tokens.border }]}
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <Ionicons name="calendar-outline" size={16} color={tokens.textSecondary} />
                        <View>
                          <Text style={[styles.dateButtonText, { color: tokens.textPrimary }]}>
                            {formatDate(manualStartDate)}
                          </Text>
                          <Text style={[styles.timeButtonText, { color: tokens.textSecondary }]}>
                            {formatTime(manualStartDate)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.dateField, styles.halfField]}>
                      <Text style={[styles.label, { color: tokens.textSecondary }]}>End *</Text>
                      <TouchableOpacity
                        style={[styles.dateButton, { backgroundColor: tokens.background, borderColor: tokens.border }]}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <Ionicons name="calendar-outline" size={16} color={tokens.textSecondary} />
                        <View>
                          <Text style={[styles.dateButtonText, { color: tokens.textPrimary }]}>
                            {formatDate(manualEndDate)}
                          </Text>
                          <Text style={[styles.timeButtonText, { color: tokens.textSecondary }]}>
                            {formatTime(manualEndDate)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {manualEndDate > manualStartDate && (
                    <View style={[styles.durationPreview, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                      <Text style={[styles.durationLabel, { color: tokens.textSecondary }]}>Duration</Text>
                      <Text style={[styles.durationValue, { color: tokens.accent }]}>
                        {formatDuration(manualEndDate.getTime() - manualStartDate.getTime())}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Service Line Selection */}
                <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                  <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Service Type</Text>
                  {loadingServiceLines ? (
                    <ActivityIndicator size="small" color={tokens.accent} />
                  ) : (
                    <View style={[styles.picker, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                      <Picker
                        selectedValue={selectedServiceLineId}
                        onValueChange={(itemValue) => setSelectedServiceLineId(itemValue)}
                        style={{ color: tokens.textPrimary }}
                      >
                        <Picker.Item label="Choose a service..." value="" />
                        {serviceLines.map((line) => (
                          <Picker.Item key={line.id} label={line.category} value={line.id} />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>

                {/* Hourly Rate */}
                <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                  <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Hourly Rate (Optional)</Text>
                  <TextInput
                    style={[styles.input, { color: tokens.textPrimary, borderColor: tokens.border }]}
                    value={hourlyRate}
                    onChangeText={setHourlyRate}
                    placeholder="0.00"
                    placeholderTextColor={tokens.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  {hourlyRate && manualEndDate > manualStartDate && (
                    <View style={[styles.amountPreview, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                      <Text style={[styles.amountLabel, { color: tokens.textSecondary }]}>Calculated Amount</Text>
                      <Text style={[styles.amountValue, { color: '#4CAF50' }]}>
                        ${((manualEndDate.getTime() - manualStartDate.getTime()) / (1000 * 60 * 60) * parseFloat(hourlyRate)).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Notes */}
                <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                  <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Notes</Text>
                  <TextInput
                    style={[styles.notesInput, { color: tokens.textPrimary, borderColor: tokens.border }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Describe the work completed..."
                    placeholderTextColor={tokens.textSecondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                {/* Billable Toggle */}
                <TouchableOpacity
                  style={[styles.toggleRow, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                  onPress={() => setBillable(!billable)}
                >
                  <View style={styles.toggleInfo}>
                    <Ionicons name="cash-outline" size={20} color={tokens.accent} />
                    <Text style={[styles.toggleLabel, { color: tokens.textPrimary }]}>Billable</Text>
                  </View>
                  <Ionicons
                    name={billable ? "checkbox" : "square-outline"}
                    size={24}
                    color={billable ? tokens.accent : tokens.textSecondary}
                  />
                </TouchableOpacity>

                {/* Add Entry Button */}
                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: tokens.accent }]}
                  onPress={handleAddManualEntry}
                >
                  <Ionicons name="add" size={24} color={tokens.background} />
                  <Text style={[styles.startButtonText, { color: tokens.background }]}>
                    Add Time Entry
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Entries View */}
            {viewMode === "entries" && (
              <>
                {/* Summary Stats */}
                <View style={[styles.summarySection, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                  <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Summary</Text>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryStat}>
                      <Text style={[styles.summaryValue, { color: tokens.accent }]}>
                        {summaryStats.totalHours.toFixed(2)}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: tokens.textSecondary }]}>Hours</Text>
                    </View>
                    <View style={styles.summaryStat}>
                      <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                        ${summaryStats.totalAmount.toFixed(2)}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: tokens.textSecondary }]}>Billable</Text>
                    </View>
                    <View style={styles.summaryStat}>
                      <Text style={[styles.summaryValue, { color: tokens.textPrimary }]}>
                        {filteredEntries.length}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: tokens.textSecondary }]}>Entries</Text>
                    </View>
                  </View>
                </View>

                {/* Filters */}
                <View style={[styles.filtersSection, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                  <View style={styles.filterGroup}>
                    <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>Date Range</Text>
                    <View style={styles.filterButtons}>
                      {(["today", "week", "month", "all"] as const).map((range) => (
                        <TouchableOpacity
                          key={range}
                          style={[
                            styles.filterButton,
                            {
                              backgroundColor: filterDateRange === range ? tokens.accent : tokens.background,
                              borderColor: filterDateRange === range ? tokens.accent : tokens.border,
                            },
                          ]}
                          onPress={() => setFilterDateRange(range)}
                        >
                          <Text
                            style={[
                              styles.filterButtonText,
                              { color: filterDateRange === range ? tokens.background : tokens.textPrimary },
                            ]}
                          >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.filterGroup}>
                    <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>Client</Text>
                    <View style={[styles.picker, styles.smallPicker, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                      <Picker
                        selectedValue={filterClientId}
                        onValueChange={(itemValue) => setFilterClientId(itemValue)}
                        style={{ color: tokens.textPrimary }}
                      >
                        <Picker.Item label="All Clients" value="" />
                        {clients.map((client) => (
                          <Picker.Item key={client.id} label={client.name} value={client.id} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>

                {/* Entries List */}
                <View style={[styles.entriesSection, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                  <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
                    Time Entries ({filteredEntries.length})
                  </Text>

                  {loadingEntries ? (
                    <View style={styles.centerContainer}>
                      <ActivityIndicator size="large" color={tokens.accent} />
                    </View>
                  ) : filteredEntries.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="time-outline" size={48} color={tokens.textSecondary} />
                      <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
                        No time entries yet
                      </Text>
                      <Text style={[styles.emptySubtext, { color: tokens.textSecondary }]}>
                        Start the timer or add a manual entry
                      </Text>
                    </View>
                  ) : (
                    filteredEntries.map((entry) => {
                      const duration = entry.endTime ? entry.endTime - entry.startTime : 0;
                      const cost = calculateEntryCost(entry);

                      return (
                        <View
                          key={entry.id}
                          style={[styles.entryCard, { backgroundColor: tokens.background, borderColor: tokens.border }]}
                        >
                          <View style={styles.entryHeader}>
                            <View style={styles.entryInfo}>
                              <Text style={[styles.entryClient, { color: tokens.textPrimary }]}>
                                {entry.clientName}
                              </Text>
                              <Text style={[styles.entryService, { color: tokens.textSecondary }]}>
                                {entry.serviceType}
                              </Text>
                            </View>
                            <View style={styles.entryMeta}>
                              <Text style={[styles.entryDuration, { color: tokens.accent }]}>
                                {formatDuration(duration)}
                              </Text>
                              <Text style={[styles.entryHours, { color: tokens.textSecondary }]}>
                                {formatHours(duration)} hrs
                              </Text>
                              {cost && (
                                <Text style={[styles.entryCost, { color: '#4CAF50' }]}>
                                  ${cost}
                                </Text>
                              )}
                            </View>
                          </View>

                          {entry.notes && (
                            <Text style={[styles.entryNotes, { color: tokens.textSecondary }]}>
                              {entry.notes}
                            </Text>
                          )}

                          <View style={styles.entryFooter}>
                            <Text style={[styles.entryDate, { color: tokens.textSecondary }]}>
                              {new Date(entry.startTime).toLocaleDateString()} {formatTime(new Date(entry.startTime))}
                            </Text>
                            <View style={styles.entryActions}>
                              {entry.billable && (
                                <View style={[styles.billableBadge, { backgroundColor: '#4CAF50' + '20', borderColor: '#4CAF50' }]}>
                                  <Text style={[styles.billableBadgeText, { color: '#4CAF50' }]}>Billable</Text>
                                </View>
                              )}
                              <TouchableOpacity
                                onPress={() => handleDeleteEntry(entry.id)}
                                style={styles.deleteButton}
                              >
                                <Ionicons name="trash-outline" size={18} color="#F44336" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Date Pickers */}
      <DatePickerModal
        isOpen={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onSelectDate={setManualStartDate}
        initialDate={manualStartDate}
        title="Start Time"
        mode="datetime"
      />

      <DatePickerModal
        isOpen={showEndDatePicker}
        onClose={() => setShowEndDatePicker(false)}
        onSelectDate={setManualEndDate}
        initialDate={manualEndDate}
        title="End Time"
        mode="datetime"
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  closeButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  timerSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    marginBottom: 16,
  },
  timerDisplay: {
    fontSize: 48,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  timerStatus: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
    marginTop: 8,
    textTransform: "uppercase",
  },
  currentEntryInfo: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    width: "100%",
    alignItems: "center",
  },
  currentEntryClient: {
    fontSize: 16,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  currentEntryService: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    marginTop: 4,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  picker: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  smallPicker: {
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: "lores-9-wide",
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "lores-9-wide",
    minHeight: 80,
    textAlignVertical: "top",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    padding: 18,
    marginTop: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  timerControls: {
    gap: 12,
    marginTop: 8,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    padding: 16,
  },
  controlButtonText: {
    fontSize: 16,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  controlButtonTextSecondary: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  timeButtonText: {
    fontSize: 11,
    fontFamily: "lores-9-wide",
    marginTop: 2,
  },
  durationPreview: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  durationLabel: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    textTransform: "uppercase",
  },
  durationValue: {
    fontSize: 18,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  amountPreview: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    textTransform: "uppercase",
  },
  amountValue: {
    fontSize: 18,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  summarySection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryStat: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "lores-9-wide",
    textTransform: "uppercase",
    marginTop: 4,
  },
  filtersSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  filterButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  entriesSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Bytesized-Regular",
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
    marginTop: 8,
    textAlign: "center",
  },
  entryCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  entryInfo: {
    flex: 1,
  },
  entryClient: {
    fontSize: 15,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  entryService: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    marginTop: 2,
  },
  entryMeta: {
    alignItems: "flex-end",
  },
  entryDuration: {
    fontSize: 16,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  entryHours: {
    fontSize: 11,
    fontFamily: "lores-9-wide",
    marginTop: 2,
  },
  entryCost: {
    fontSize: 14,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
    marginTop: 4,
  },
  entryNotes: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
    marginTop: 10,
    fontStyle: "italic",
  },
  entryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  entryDate: {
    fontSize: 11,
    fontFamily: "lores-9-wide",
  },
  entryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  billableBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  billableBadgeText: {
    fontSize: 10,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  deleteButton: {
    padding: 4,
  },
});
