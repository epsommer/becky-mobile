"use client";

import { useState, useEffect, useRef } from 'react';
import { Clock, Play, Square, DollarSign } from 'lucide-react';

interface TimeEntry {
  id: string;
  startTime: number;
  endTime?: number;
  clientId?: string;
  clientName?: string;
  serviceType: string;
  notes: string;
  hourlyRate?: number;
}

export default function PunchClock() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [completedEntries, setCompletedEntries] = useState<TimeEntry[]>([]);
  const [clientName, setClientName] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [notes, setNotes] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load entries from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('timeEntries');
    if (stored) {
      try {
        const entries = JSON.parse(stored);
        setCompletedEntries(entries);
      } catch (error) {
        console.error('Failed to parse stored time entries:', error);
      }
    }

    const activeEntry = localStorage.getItem('activeTimeEntry');
    if (activeEntry) {
      try {
        const entry = JSON.parse(activeEntry);
        setCurrentEntry(entry);
        setIsRunning(true);
        setClientName(entry.clientName || '');
        setServiceType(entry.serviceType || '');
        setNotes(entry.notes || '');
        setHourlyRate(entry.hourlyRate?.toString() || '');
      } catch (error) {
        console.error('Failed to parse active time entry:', error);
      }
    }
  }, []);

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
    const entry: TimeEntry = {
      id: `entry-${Date.now()}`,
      startTime: Date.now(),
      clientName: clientName.trim() || undefined,
      serviceType: serviceType.trim() || 'General Service',
      notes: notes.trim(),
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
    };

    setCurrentEntry(entry);
    setIsRunning(true);
    setElapsedTime(0);
    localStorage.setItem('activeTimeEntry', JSON.stringify(entry));
  };

  const stopClock = () => {
    if (!currentEntry) return;

    const completedEntry: TimeEntry = {
      ...currentEntry,
      endTime: Date.now(),
    };

    const updatedEntries = [completedEntry, ...completedEntries];
    setCompletedEntries(updatedEntries);
    localStorage.setItem('timeEntries', JSON.stringify(updatedEntries));
    localStorage.removeItem('activeTimeEntry');

    setIsRunning(false);
    setCurrentEntry(null);
    setElapsedTime(0);
    setClientName('');
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
    const updatedEntries = completedEntries.filter(e => e.id !== id);
    setCompletedEntries(updatedEntries);
    localStorage.setItem('timeEntries', JSON.stringify(updatedEntries));
  };

  const createReceiptFromEntry = (entry: TimeEntry) => {
    if (!entry.endTime || !entry.hourlyRate) {
      alert('Cannot create receipt: entry must have hourly rate and be completed');
      return;
    }

    const hours = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
    const amount = hours * entry.hourlyRate;

    // Store in session for the manual entry form to pick up
    const receiptData = {
      serviceType: entry.serviceType,
      amount: amount.toFixed(2),
      description: `${hours.toFixed(2)} hours - ${entry.notes || entry.serviceType}`,
      date: new Date(entry.startTime).toISOString().slice(0, 10),
      clientId: entry.clientId || '',
    };

    sessionStorage.setItem('punchClockReceipt', JSON.stringify(receiptData));
    alert(`Receipt data prepared: $${amount.toFixed(2)} for ${hours.toFixed(2)} hours. Use the Manual Entry form to create the receipt.`);
  };

  return (
    <div className="space-y-6">
      {/* Active Timer */}
      <div className="neo-container p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-primary font-bold text-foreground uppercase tracking-wide text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Time Tracker
          </h2>
        </div>

        {/* Timer Display */}
        <div className="neo-inset p-8 mb-6 text-center">
          <div className="text-5xl font-bold font-mono text-foreground mb-2">
            {formatTime(isRunning ? elapsedTime : 0)}
          </div>
          <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide">
            {isRunning ? 'IN PROGRESS' : 'STOPPED'}
          </div>
        </div>

        {!isRunning ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2 font-primary uppercase tracking-wide">
                  Client Name (Optional)
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name"
                  className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-2 font-primary uppercase tracking-wide">
                  Service Type
                </label>
                <input
                  type="text"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  placeholder="E.g., Consulting, Design, Development"
                  className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-2 font-primary uppercase tracking-wide">
                Hourly Rate (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-2 font-primary uppercase tracking-wide">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What are you working on?"
                rows={2}
                className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all resize-none"
              />
            </div>

            <button
              onClick={startClock}
              className="w-full neo-button-active px-6 py-4 font-primary flex items-center justify-center gap-2 text-lg"
            >
              <Play className="w-5 h-5" />
              Start Timer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="neo-inset p-4 space-y-2">
              {clientName && (
                <div className="text-sm">
                  <span className="text-muted-foreground font-primary uppercase tracking-wide">Client:</span>{' '}
                  <span className="font-semibold text-foreground">{clientName}</span>
                </div>
              )}
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
              className="w-full neo-button px-6 py-4 font-primary flex items-center justify-center gap-2 text-lg bg-red-600 text-white hover:bg-red-700"
            >
              <Square className="w-5 h-5" />
              Stop Timer
            </button>
          </div>
        )}
      </div>

      {/* Completed Entries */}
      {completedEntries.length > 0 && (
        <div className="neo-container p-6">
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
                        {entry.clientName && (
                          <span className="text-muted-foreground font-normal"> - {entry.clientName}</span>
                        )}
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
                          className="neo-button text-xs px-3 py-1 flex items-center gap-1"
                        >
                          <DollarSign className="w-3 h-3" />
                          Create Receipt
                        </button>
                      )}
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="text-red-600 hover:text-red-800"
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
    </div>
  );
}
