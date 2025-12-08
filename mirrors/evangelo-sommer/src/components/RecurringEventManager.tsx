"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import FrequencyScheduler from "./FrequencyScheduler";
import {
  RecurringEvent,
  ScheduleRule,
  CalendarEvent,
  FrequencyValidationResult,
} from "@/types/scheduling";
import { Calendar, Clock, Repeat, Play, Pause, Trash2, Plus } from "lucide-react";

interface RecurringEventManagerProps {
  clientId?: string;
  onEventsGenerated?: (events: CalendarEvent[]) => void;
  className?: string;
}

export default function RecurringEventManager({
  clientId,
  onEventsGenerated,
  className = "",
}: RecurringEventManagerProps) {
  const [recurringEvents, setRecurringEvents] = useState<RecurringEvent[]>([]);
  const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
  const [generatedEvents, setGeneratedEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<RecurringEvent | null>(null);

  // Create form state
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventRule, setNewEventRule] = useState<ScheduleRule | null>(null);
  const [validation, setValidation] = useState<FrequencyValidationResult>({
    isValid: false,
    errors: [],
    warnings: [],
  });

  useEffect(() => {
    loadRecurringEvents();
  }, [clientId]);

  const loadRecurringEvents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (clientId) params.set("clientId", clientId);
      params.set("action", "list");

      const response = await fetch(`/api/recurring-events?${params}`);
      const data = await response.json();

      if (data.success) {
        setRecurringEvents(data.recurringEvents);
        setScheduleRules(data.scheduleRules);
      }
    } catch (error) {
      console.error("Failed to load recurring events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createRecurringEvent = async () => {
    if (!validation.isValid || !newEventRule || !newEventTitle.trim()) {
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/recurring-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          data: {
            recurringEvent: {
              title: newEventTitle.trim(),
              description: `Recurring ${newEventRule.frequency} appointment`,
              clientId: clientId || "default-client",
              nextOccurrence: new Date().toISOString(),
              totalOccurrences: 0,
              isActive: true,
              metadata: {
                reminderMinutesBefore: 30,
                autoCreateTask: false,
                notificationPreferences: {
                  email: true,
                  push: true,
                },
              },
            },
            scheduleRule: newEventRule,
            generateEvents: true,
            generationOptions: {
              lookAheadDays: 90,
              defaultDuration: 60,
            },
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reload to get updated data
        await loadRecurringEvents();
        
        // Close form and reset
        setShowCreateForm(false);
        setNewEventTitle("");
        setNewEventRule(null);
        
        // Notify parent about generated events
        if (result.generatedBatch?.events) {
          onEventsGenerated?.(result.generatedBatch.events);
        }
      }
    } catch (error) {
      console.error("Failed to create recurring event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createBiWeeklyEvent = async (title: string, daysOfWeek: number[] = [1]) => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/recurring-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-biweekly",
          data: {
            title,
            clientId: clientId || "default-client",
            daysOfWeek,
            generateEvents: true,
            generationOptions: {
              lookAheadDays: 90,
              defaultDuration: 60,
            },
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadRecurringEvents();
        
        if (result.generatedBatch?.events) {
          onEventsGenerated?.(result.generatedBatch.events);
        }
      }
    } catch (error) {
      console.error("Failed to create bi-weekly event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEventActive = async (eventId: string, isActive: boolean) => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/recurring-events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: eventId,
          updates: { isActive },
        }),
      });

      if (response.ok) {
        await loadRecurringEvents();
      }
    } catch (error) {
      console.error("Failed to toggle event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRecurringEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this recurring event?")) {
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/recurring-events?id=${eventId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadRecurringEvents();
      }
    } catch (error) {
      console.error("Failed to delete recurring event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMoreEvents = async (eventId: string) => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/recurring-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          data: {
            recurringEventId: eventId,
            generationOptions: {
              lookAheadDays: 90,
              defaultDuration: 60,
            },
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.batch?.events) {
        onEventsGenerated?.(result.batch.events);
        await loadRecurringEvents();
      }
    } catch (error) {
      console.error("Failed to generate events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScheduleRule = (ruleId: string) => {
    return scheduleRules.find((rule) => rule.id === ruleId);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-tactical-grey-800">
            Recurring Events
          </h2>
          <p className="text-sm text-tactical-grey-500 mt-1">
            Manage recurring appointments and automatic event generation
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => createBiWeeklyEvent("Bi-weekly Appointment")}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="border-hud-border-accent text-gold hover:bg-tactical-gold hover:text-hud-text-primary"
          >
            <Repeat className="h-4 w-4 mr-2" />
            Quick Bi-weekly
          </Button>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={isLoading}
            className="bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Recurring Event
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-tactical-grey-800 mb-4">
            Create New Recurring Event
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-tactical-grey-600 mb-2">
                Event Title
              </label>
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Enter event title..."
                className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-gold focus:border-hud-border-accent text-tactical-grey-800 bg-white"
              />
            </div>

            <FrequencyScheduler
              onRuleChange={setNewEventRule}
              onValidationChange={setValidation}
              showPreview={true}
              maxPreviewOccurrences={5}
            />

            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={createRecurringEvent}
                disabled={!validation.isValid || !newEventTitle.trim() || isLoading}
                className="bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold/90"
                size="sm"
              >
                Create & Generate Events
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Events List */}
      {recurringEvents.length > 0 ? (
        <div className="space-y-4">
          {recurringEvents.map((event) => {
            const rule = getScheduleRule(event.scheduleRuleId);
            if (!rule) return null;

            return (
              <div
                key={event.id}
                className={`border rounded-lg p-4 transition-all ${
                  event.isActive
                    ? "border-green-200 bg-green-50"
                    : "border-tactical-grey-300 bg-tactical-grey-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Calendar className="h-5 w-5 text-gold" />
                      <h3 className="font-medium text-tactical-grey-800">
                        {event.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          event.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-tactical-grey-200 text-tactical-grey-700"
                        }`}
                      >
                        {event.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-tactical-grey-500">
                      <div>
                        <div className="font-medium text-tactical-grey-600">Pattern</div>
                        <div>
                          {rule.frequency === "bi-weekly"
                            ? `Every other week${
                                rule.daysOfWeek?.length
                                  ? ` on ${rule.daysOfWeek
                                      .map((d) =>
                                        [
                                          "Sun",
                                          "Mon",
                                          "Tue",
                                          "Wed",
                                          "Thu",
                                          "Fri",
                                          "Sat",
                                        ][d]
                                      )
                                      .join(", ")}`
                                  : ""
                              }`
                            : `${rule.frequency} (interval: ${rule.interval})`}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-tactical-grey-600">Next Event</div>
                        <div>
                          {event.nextOccurrence
                            ? new Date(event.nextOccurrence).toLocaleDateString()
                            : "None scheduled"}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-tactical-grey-600">
                          Total Generated
                        </div>
                        <div>{event.totalOccurrences} events</div>
                      </div>
                      <div>
                        <div className="font-medium text-tactical-grey-600">End Rule</div>
                        <div>
                          {rule.endRule.type === "never"
                            ? "Never ends"
                            : rule.endRule.type === "occurrences"
                              ? `After ${rule.endRule.value} occurrences`
                              : `Until ${new Date(rule.endRule.value as string).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-sm text-tactical-grey-500 mt-2">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      onClick={() => generateMoreEvents(event.id)}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="text-tactical-gold border-tactical-grey-300 hover:bg-tactical-gold-muted"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => toggleEventActive(event.id, !event.isActive)}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className={
                        event.isActive
                          ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                          : "text-green-600 border-green-200 hover:bg-green-50"
                      }
                    >
                      {event.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={() => deleteRecurringEvent(event.id)}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-tactical-grey-100 rounded-lg">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-tactical-grey-800 mb-2">
            No Recurring Events
          </h3>
          <p className="text-tactical-grey-500 mb-4">
            Create recurring events to automatically generate calendar appointments
          </p>
          <Button
            onClick={() => createBiWeeklyEvent("My Bi-weekly Meeting")}
            disabled={isLoading}
            className="bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold/90"
          >
            Create Your First Bi-weekly Event
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-hud-border-accent"></div>
            <span>Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}