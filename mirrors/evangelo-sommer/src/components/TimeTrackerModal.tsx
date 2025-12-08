"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Play, Square, DollarSign } from 'lucide-react';
import { Client } from '@/types/client';
import { lockScroll, unlockScroll } from '@/lib/modal-scroll-lock';
import { logTimeTracked } from '@/lib/activity-logger-client';

interface TimeTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client;
}

interface TimeEntry {
  id: string;
  startTime: number;
  endTime?: number;
  clientId: string;
  clientName: string;
  serviceType: string;
  notes: string;
  hourlyRate?: number;
}

const TimeTrackerModal: React.FC<TimeTrackerModalProps> = ({ isOpen, onClose, client }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [completedEntries, setCompletedEntries] = useState<TimeEntry[]>([]);
  const [serviceType, setServiceType] = useState('');
  const [notes, setNotes] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockScroll();
    } else {
      unlockScroll();
    }

    return () => {
      unlockScroll();
    };
  }, [isOpen]);

  // Load entries from localStorage on mount
  useEffect(() => {
    if (isOpen && client?.id) {
      const storageKey = `timeEntries_${client.id}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const entries = JSON.parse(stored);
          setCompletedEntries(entries);
        } catch (error) {
          console.error('Failed to parse stored time entries:', error);
        }
      }

      const activeEntryKey = `activeTimeEntry_${client.id}`;
      const activeEntry = localStorage.getItem(activeEntryKey);
      if (activeEntry) {
        try {
          const entry = JSON.parse(activeEntry);
          setCurrentEntry(entry);
          setIsRunning(true);
          setServiceType(entry.serviceType || '');
          setNotes(entry.notes || '');
          setHourlyRate(entry.hourlyRate?.toString() || '');
        } catch (error) {
          console.error('Failed to parse active time entry:', error);
        }
      }
    }
  }, [isOpen, client?.id]);

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

  const startClock = () => {
    if (!client) return;

    const entry: TimeEntry = {
      id: `entry-${Date.now()}`,
      startTime: Date.now(),
      clientId: client.id,
      clientName: client.name,
      serviceType: serviceType.trim() || 'General Service',
      notes: notes.trim(),
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
    };

    setCurrentEntry(entry);
    setIsRunning(true);
    setElapsedTime(0);
    localStorage.setItem(`activeTimeEntry_${client.id}`, JSON.stringify(entry));
  };

  const stopClock = async () => {
    if (!currentEntry || !client) return;

    const completedEntry: TimeEntry = {
      ...currentEntry,
      endTime: Date.now(),
    };

    const updatedEntries = [completedEntry, ...completedEntries];
    setCompletedEntries(updatedEntries);
    localStorage.setItem(`timeEntries_${client.id}`, JSON.stringify(updatedEntries));
    localStorage.removeItem(`activeTimeEntry_${client.id}`);

    // Log activity
    try {
      const duration = completedEntry.endTime! - completedEntry.startTime;
      const amount = completedEntry.hourlyRate
        ? (duration / (1000 * 60 * 60)) * completedEntry.hourlyRate
        : undefined;

      await logTimeTracked({
        entryId: completedEntry.id,
        clientId: client.id,
        clientName: client.name,
        serviceType: completedEntry.serviceType,
        duration,
        amount,
      });
    } catch (error) {
      console.error('Failed to log time tracking activity:', error);
      // Don't block the user flow if logging fails
    }

    setIsRunning(false);
    setCurrentEntry(null);
    setElapsedTime(0);
    setServiceType('');
    setNotes('');
    setHourlyRate('');
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateCost = (entry: TimeEntry) => {
    if (!entry.hourlyRate || !entry.endTime) return null;
    const hours = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
    return (hours * entry.hourlyRate).toFixed(2);
  };

  const deleteEntry = (id: string) => {
    if (!client) return;

    const updatedEntries = completedEntries.filter(e => e.id !== id);
    setCompletedEntries(updatedEntries);
    localStorage.setItem(`timeEntries_${client.id}`, JSON.stringify(updatedEntries));
  };

  const createReceiptFromEntry = (entry: TimeEntry) => {
    if (!entry.endTime || !entry.hourlyRate) {
      alert('Cannot create receipt: entry must have hourly rate and be completed');
      return;
    }

    const hours = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
    const amount = hours * entry.hourlyRate;

    // Navigate to billing page with receipt data
    const receiptData = {
      clientId: entry.clientId,
      serviceType: entry.serviceType,
      amount: amount.toFixed(2),
      description: `${hours.toFixed(2)} hours - ${entry.notes || entry.serviceType}`,
      date: new Date(entry.startTime).toISOString().slice(0, 10),
    };

    sessionStorage.setItem('timeTrackerReceipt', JSON.stringify(receiptData));
    alert(`Receipt data prepared: $${amount.toFixed(2)} for ${hours.toFixed(2)} hours. Navigate to Billing to create the receipt.`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={onClose} />

      {/* Modal container - accounts for sidebar on desktop */}
      <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-[101] flex items-start justify-center p-4 sm:p-6 md:p-8 overflow-y-auto pointer-events-none">
        <div className="neo-container max-w-2xl w-full max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-16rem)] mt-16 sm:mt-20 md:mt-16 mb-8 overflow-y-auto pointer-events-auto">
        {/* Header */}
        <div className="neo-inset border-b border-foreground/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-foreground" />
              <h2 className="text-xl font-bold text-foreground uppercase tracking-wide font-primary">
                Time Tracker{client ? ` - ${client.name}` : ''}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="neo-icon-button transition-transform hover:scale-[1.1]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!client ? (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-bold text-foreground mb-2 font-primary uppercase">
                No Client Selected
              </h3>
              <p className="text-muted-foreground font-primary text-sm">
                Time tracker requires a client context. Please open this from a client page.
              </p>
            </div>
          ) : (
            <>
          {/* Timer Display */}
          <div className="neo-inset p-8 text-center">
            <div className="text-5xl font-bold font-mono text-foreground mb-2">
              {formatTime(isRunning ? elapsedTime : 0)}
            </div>
            <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide">
              {isRunning ? 'IN PROGRESS' : 'STOPPED'}
            </div>
          </div>

          {!isRunning ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                  Service Type
                </label>
                <input
                  type="text"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  placeholder="E.g., Consulting, Design, Development"
                  className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all placeholder:text-muted-foreground/50 placeholder:font-normal"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                  Hourly Rate (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all placeholder:text-muted-foreground/50 placeholder:font-normal"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What are you working on?"
                  rows={3}
                  className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all resize-none placeholder:text-muted-foreground/50 placeholder:font-normal"
                />
              </div>

              <button
                onClick={startClock}
                className="w-full neo-button-active px-6 py-4 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Timer
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="neo-inset p-4 space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground font-primary uppercase tracking-wide">Service:</span>{' '}
                  <span className="font-semibold text-foreground">{serviceType || 'General Service'}</span>
                </div>
                {notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground font-primary uppercase tracking-wide">Notes:</span>{' '}
                    <span className="text-foreground">{notes}</span>
                  </div>
                )}
                {hourlyRate && (
                  <div className="text-sm">
                    <span className="text-muted-foreground font-primary uppercase tracking-wide">Rate:</span>{' '}
                    <span className="font-semibold text-green-600">${parseFloat(hourlyRate).toFixed(2)}/hr</span>
                  </div>
                )}
              </div>

              <button
                onClick={stopClock}
                className="w-full neo-button px-6 py-4 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700"
              >
                <Square className="w-5 h-5" />
                Stop Timer
              </button>
            </div>
          )}

          {/* Completed Entries */}
          {completedEntries.length > 0 && (
            <div>
              <h3 className="font-primary font-bold text-foreground uppercase tracking-wide text-lg mb-4">
                Recent Time Entries
              </h3>
              <div className="space-y-3">
                {completedEntries.slice(0, 5).map((entry) => {
                  const duration = entry.endTime ? entry.endTime - entry.startTime : 0;
                  const hours = duration / (1000 * 60 * 60);
                  const cost = calculateCost(entry);

                  return (
                    <div key={entry.id} className="neo-inset p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-foreground font-primary">
                            {entry.serviceType}
                          </div>
                          {entry.notes && (
                            <div className="text-sm text-muted-foreground mt-1">{entry.notes}</div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-foreground font-mono">{formatTime(duration)}</div>
                          <div className="text-xs text-muted-foreground">{hours.toFixed(2)} hrs</div>
                          {cost && (
                            <div className="text-sm font-semibold text-green-600 mt-1">${cost}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                        <div>
                          {new Date(entry.startTime).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.hourlyRate && (
                            <button
                              onClick={() => createReceiptFromEntry(entry)}
                              className="neo-button text-xs px-3 py-1 flex items-center gap-1 transition-transform hover:scale-[1.05]"
                            >
                              <DollarSign className="w-3 h-3" />
                              Create Receipt
                            </button>
                          )}
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="text-red-600 hover:text-red-800 font-bold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default TimeTrackerModal;
