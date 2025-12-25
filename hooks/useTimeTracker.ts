// hooks/useTimeTracker.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '../types/billing';

/**
 * TimeEntry represents a tracked time session
 */
export interface TimeEntry {
  id: string;
  startTime: number;
  endTime?: number;
  clientId: string;
  clientName: string;
  serviceType: string;
  serviceLineId?: string;
  notes: string;
  hourlyRate?: number;
  billable: boolean;
  createdAt: number;
}

/**
 * Timer state for the time tracker
 */
export interface TimerState {
  isRunning: boolean;
  elapsedTime: number;
  currentEntry: TimeEntry | null;
}

/**
 * Time entry form data for creating new entries
 */
export interface TimeEntryFormData {
  clientId: string;
  clientName: string;
  serviceType: string;
  serviceLineId?: string;
  notes: string;
  hourlyRate?: number;
  billable: boolean;
}

/**
 * Manual time entry data
 */
export interface ManualTimeEntryData extends TimeEntryFormData {
  startTime: Date;
  endTime: Date;
}

const STORAGE_KEYS = {
  ACTIVE_ENTRY: 'timeTracker_activeEntry',
  ENTRIES: 'timeTracker_entries',
} as const;

/**
 * Hook for time tracking functionality
 * Handles timer state, persistence, and time entry management
 */
export function useTimeTracker() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [completedEntries, setCompletedEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load time entries from storage
   */
  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load completed entries
      const entriesJson = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (entriesJson) {
        const entries = JSON.parse(entriesJson) as TimeEntry[];
        setCompletedEntries(entries);
      }

      // Load active entry (if timer was running)
      const activeEntryJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_ENTRY);
      if (activeEntryJson) {
        const activeEntry = JSON.parse(activeEntryJson) as TimeEntry;
        setCurrentEntry(activeEntry);
        setIsRunning(true);
        // Calculate elapsed time since start
        const elapsed = Date.now() - activeEntry.startTime;
        setElapsedTime(elapsed);
      }
    } catch (err) {
      console.error('[useTimeTracker] Error loading entries:', err);
      setError('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save entries to storage
   */
  const saveEntries = useCallback(async (entries: TimeEntry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    } catch (err) {
      console.error('[useTimeTracker] Error saving entries:', err);
    }
  }, []);

  /**
   * Save active entry to storage (for timer recovery)
   */
  const saveActiveEntry = useCallback(async (entry: TimeEntry | null) => {
    try {
      if (entry) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_ENTRY, JSON.stringify(entry));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_ENTRY);
      }
    } catch (err) {
      console.error('[useTimeTracker] Error saving active entry:', err);
    }
  }, []);

  // Load entries on mount
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Update elapsed time when running
  useEffect(() => {
    if (isRunning && currentEntry) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - currentEntry.startTime;
        setElapsedTime(elapsed);
      }, 100);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRunning, currentEntry]);

  /**
   * Start a new time tracking session
   */
  const startTimer = useCallback(async (formData: TimeEntryFormData) => {
    const entry: TimeEntry = {
      id: `entry-${Date.now()}`,
      startTime: Date.now(),
      clientId: formData.clientId,
      clientName: formData.clientName,
      serviceType: formData.serviceType || 'General Service',
      serviceLineId: formData.serviceLineId,
      notes: formData.notes.trim(),
      hourlyRate: formData.hourlyRate,
      billable: formData.billable,
      createdAt: Date.now(),
    };

    setCurrentEntry(entry);
    setIsRunning(true);
    setElapsedTime(0);
    await saveActiveEntry(entry);

    console.log('[useTimeTracker] Timer started:', entry);
  }, [saveActiveEntry]);

  /**
   * Stop the current timer
   */
  const stopTimer = useCallback(async () => {
    if (!currentEntry) return null;

    const completedEntry: TimeEntry = {
      ...currentEntry,
      endTime: Date.now(),
    };

    const updatedEntries = [completedEntry, ...completedEntries];
    setCompletedEntries(updatedEntries);
    await saveEntries(updatedEntries);
    await saveActiveEntry(null);

    // Reset timer state
    setIsRunning(false);
    setCurrentEntry(null);
    setElapsedTime(0);

    console.log('[useTimeTracker] Timer stopped:', completedEntry);
    return completedEntry;
  }, [currentEntry, completedEntries, saveEntries, saveActiveEntry]);

  /**
   * Pause the timer (keeps the entry but stops counting)
   */
  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    console.log('[useTimeTracker] Timer paused');
  }, []);

  /**
   * Resume a paused timer
   */
  const resumeTimer = useCallback(() => {
    if (currentEntry && !isRunning) {
      setIsRunning(true);
      console.log('[useTimeTracker] Timer resumed');
    }
  }, [currentEntry, isRunning]);

  /**
   * Discard the current timer without saving
   */
  const discardTimer = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setCurrentEntry(null);
    setElapsedTime(0);
    await saveActiveEntry(null);
    console.log('[useTimeTracker] Timer discarded');
  }, [saveActiveEntry]);

  /**
   * Add a manual time entry (not using timer)
   */
  const addManualEntry = useCallback(async (data: ManualTimeEntryData) => {
    const entry: TimeEntry = {
      id: `entry-${Date.now()}`,
      startTime: data.startTime.getTime(),
      endTime: data.endTime.getTime(),
      clientId: data.clientId,
      clientName: data.clientName,
      serviceType: data.serviceType || 'General Service',
      serviceLineId: data.serviceLineId,
      notes: data.notes.trim(),
      hourlyRate: data.hourlyRate,
      billable: data.billable,
      createdAt: Date.now(),
    };

    const updatedEntries = [entry, ...completedEntries];
    setCompletedEntries(updatedEntries);
    await saveEntries(updatedEntries);

    console.log('[useTimeTracker] Manual entry added:', entry);
    return entry;
  }, [completedEntries, saveEntries]);

  /**
   * Delete a time entry
   */
  const deleteEntry = useCallback(async (entryId: string) => {
    const updatedEntries = completedEntries.filter(e => e.id !== entryId);
    setCompletedEntries(updatedEntries);
    await saveEntries(updatedEntries);
    console.log('[useTimeTracker] Entry deleted:', entryId);
  }, [completedEntries, saveEntries]);

  /**
   * Update an existing time entry
   */
  const updateEntry = useCallback(async (entryId: string, updates: Partial<TimeEntry>) => {
    const updatedEntries = completedEntries.map(e =>
      e.id === entryId ? { ...e, ...updates } : e
    );
    setCompletedEntries(updatedEntries);
    await saveEntries(updatedEntries);
    console.log('[useTimeTracker] Entry updated:', entryId, updates);
  }, [completedEntries, saveEntries]);

  /**
   * Get entries for a specific client
   */
  const getEntriesByClient = useCallback((clientId: string) => {
    return completedEntries.filter(e => e.clientId === clientId);
  }, [completedEntries]);

  /**
   * Get entries within a date range
   */
  const getEntriesByDateRange = useCallback((startDate: Date, endDate: Date) => {
    const start = startDate.getTime();
    const end = endDate.getTime();
    return completedEntries.filter(e =>
      e.startTime >= start && e.startTime <= end
    );
  }, [completedEntries]);

  /**
   * Calculate total hours for entries
   */
  const calculateTotalHours = useCallback((entries: TimeEntry[]) => {
    return entries.reduce((total, entry) => {
      if (!entry.endTime) return total;
      const duration = entry.endTime - entry.startTime;
      return total + (duration / (1000 * 60 * 60));
    }, 0);
  }, []);

  /**
   * Calculate total billable amount for entries
   */
  const calculateTotalAmount = useCallback((entries: TimeEntry[]) => {
    return entries.reduce((total, entry) => {
      if (!entry.endTime || !entry.hourlyRate || !entry.billable) return total;
      const hours = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
      return total + (hours * entry.hourlyRate);
    }, 0);
  }, []);

  /**
   * Format duration from milliseconds
   */
  const formatDuration = useCallback((milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Format hours as decimal
   */
  const formatHours = useCallback((milliseconds: number) => {
    const hours = milliseconds / (1000 * 60 * 60);
    return hours.toFixed(2);
  }, []);

  /**
   * Clear all entries (for debugging/reset)
   */
  const clearAllEntries = useCallback(async () => {
    setCompletedEntries([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.ENTRIES);
    console.log('[useTimeTracker] All entries cleared');
  }, []);

  return {
    // State
    isRunning,
    elapsedTime,
    currentEntry,
    completedEntries,
    loading,
    error,

    // Timer actions
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    discardTimer,

    // Entry management
    addManualEntry,
    deleteEntry,
    updateEntry,
    getEntriesByClient,
    getEntriesByDateRange,

    // Calculations
    calculateTotalHours,
    calculateTotalAmount,

    // Formatting
    formatDuration,
    formatHours,

    // Utilities
    loadEntries,
    clearAllEntries,
  };
}

export default useTimeTracker;
