"use client";

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { Calendar, Clock, MapPin, User, MoreVertical, Edit, CheckCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents';
import DropdownMenu from '@/components/ui/DropdownMenu';

// Safe date formatting utility
const safeFormatDate = (dateValue: string | Date | undefined, formatStr: string, fallback: string = '--:--'): string => {
  try {
    if (!dateValue) return fallback;
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return isNaN(date.getTime()) ? fallback : format(date, formatStr);
  } catch {
    return fallback;
  }
};

// Safe string property accessor
const safeString = (value: any, fallback: string = 'Unknown'): string => {
  return (typeof value === 'string' && value.trim()) ? value : fallback;
};

interface ScheduledService {
  id: string;
  title: string;
  service: string;
  clientName: string;
  scheduledDate: string;
  notes?: string;
  priority: string;
  status: string;
  duration: number;
  googleCalendarId?: string;
  clientId?: string;
  location?: string;
  recurrence?: string;
}

interface ScheduleCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
  onEventEdit?: (event: any) => void;
  onEventView?: (event: any) => void;
  onEventDelete?: (eventId: string) => void;
  onEventStatusChange?: (eventId: string, status: string) => void;
  enableEditing?: boolean;
  refreshTrigger?: number;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ 
  selectedDate = (() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()) })(), 
  onDateSelect,
  onDayClick,
  onEventEdit,
  onEventView,
  onEventDelete,
  onEventStatusChange,
  enableEditing = false,
  refreshTrigger 
}) => {
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([]);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<any[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledService | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<ScheduledService | null>(null);

  // Use unified events hook
  const { events: unifiedEvents } = useUnifiedEvents({ syncWithLegacy: true });

  // Load scheduled services from localStorage
  useEffect(() => {
    try {
      const services = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
      setScheduledServices(services);
      console.log('📅 Calendar loaded schedules:', services.length);
    } catch (error) {
      console.error('Error loading scheduled services for calendar:', error);
    }
  }, [refreshTrigger]);

  // Get days in current month
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for a specific date (including unified events)
  const getEventsForDate = (date: Date) => {
    const servicesForDate = scheduledServices.filter(service => {
      const serviceDate = new Date(service.scheduledDate);
      return isSameDay(serviceDate, date);
    });

    const unifiedEventsForDate = unifiedEvents.filter(event => {
      const eventDate = new Date(event.startDateTime);
      return isSameDay(eventDate, date);
    });

    return [...servicesForDate, ...unifiedEventsForDate];
  };


  // Handle editing a scheduled service
  const handleEditSchedule = (schedule: ScheduledService) => {
    setEditingSchedule(schedule);
  };

  // Handle updating a scheduled service
  const handleUpdateSchedule = (updatedSchedule: ScheduledService) => {
    try {
      const allScheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
      const updatedServices = allScheduledServices.map((service: any) => 
        service.id === updatedSchedule.id ? updatedSchedule : service
      );
      localStorage.setItem('scheduled-services', JSON.stringify(updatedServices));
      
      // Update local state
      setScheduledServices(prev => prev.map(service => 
        service.id === updatedSchedule.id ? updatedSchedule : service
      ));
      
      setEditingSchedule(null);
      console.log('✅ Schedule updated successfully');
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  // Handle deleting a scheduled service
  const handleDeleteSchedule = (scheduleId: string) => {
    if (confirm('Are you sure you want to delete this scheduled service?')) {
      try {
        const allScheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
        const updatedServices = allScheduledServices.filter((service: any) => service.id !== scheduleId);
        localStorage.setItem('scheduled-services', JSON.stringify(updatedServices));
        
        // Update local state
        setScheduledServices(prev => prev.filter(service => service.id !== scheduleId));
        console.log('✅ Schedule deleted successfully');
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
  };

  // Get upcoming events (next 30 days)
  const getUpcomingEvents = () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Combine local scheduled services and Google Calendar events
    const upcomingServices = scheduledServices
      .filter(service => {
        const serviceDate = new Date(service.scheduledDate);
        return serviceDate >= now && serviceDate <= thirtyDaysFromNow;
      })
      .map(service => ({ ...service, source: 'local' }));

    const upcomingGoogleEvents = googleCalendarEvents
      .filter(event => {
        const eventDate = new Date(event.start?.dateTime || event.start?.date);
        return eventDate >= now && eventDate <= thirtyDaysFromNow;
      })
      .map(event => ({
        id: event.id,
        title: event.summary,
        service: event.summary,
        clientName: event.description || 'Google Calendar Event',
        scheduledDate: event.start?.dateTime || event.start?.date,
        priority: 'medium',
        status: 'scheduled',
        duration: event.duration || 60,
        notes: event.description,
        source: 'google'
      }));

    // Combine and sort by date
    const allEvents = [...upcomingServices, ...upcomingGoogleEvents];
    return allEvents.sort((a, b) => {
      try {
        const dateA = new Date(a.scheduledDate);
        const dateB = new Date(b.scheduledDate);
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        return timeA - timeB;
      } catch {
        return 0;
      }
    }).slice(0, 10); // Show only next 10 events
  };

  // Sync with Google Calendar
  const syncWithGoogleCalendar = async () => {
    try {
      console.log('🔄 Syncing with Google Calendar...');
      // Call API to fetch Google Calendar events
      const response = await fetch('/api/calendar/sync', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const events = await response.json();
        setGoogleCalendarEvents(events);
        console.log('✅ Google Calendar sync completed:', events.length, 'events');
      } else {
        console.error('❌ Failed to sync with Google Calendar');
        // For demo purposes, show a notification
        alert('Google Calendar sync is not yet configured. Please set up OAuth credentials.');
      }
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
      alert('Error syncing with Google Calendar. Please try again later.');
    }
  };

  // Export to Google Calendar
  const exportToGoogleCalendar = async () => {
    try {
      console.log('📤 Exporting to Google Calendar...');
      // Get local events to export
      const eventsToExport = scheduledServices.filter(service => 
        !service.googleCalendarId // Only export if not already in Google Calendar
      );

      if (eventsToExport.length === 0) {
        alert('No new events to export to Google Calendar.');
        return;
      }

      // Call API to create events in Google Calendar
      const response = await fetch('/api/calendar/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToExport }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Export to Google Calendar completed:', result.exported, 'events');
        alert(`Successfully exported ${result.exported} events to Google Calendar!`);
        
        // Refresh the calendar data
        await syncWithGoogleCalendar();
      } else {
        console.error('❌ Failed to export to Google Calendar');
        alert('Google Calendar export is not yet configured. Please set up OAuth credentials.');
      }
    } catch (error) {
      console.error('Error exporting to Google Calendar:', error);
      alert('Error exporting to Google Calendar. Please try again later.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="neo-card">
        <div className="p-0">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0 border-b border-border">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 bg-card border-r border-b border-border text-center">
                <span className="text-sm font-bold text-foreground uppercase tracking-wide font-primary">
                  {day}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0">
            {monthDays.map(day => {
              const dayServices = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, selectedDate);
              const isTodayDate = isToday(day);
              const isSelected = isSameDay(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[140px] p-2 border-r border-b border-border cursor-pointer transition-colors relative group ${
                    !isCurrentMonth
                      ? 'bg-background text-muted'
                      : isSelected
                      ? 'bg-accent/20'
                      : isTodayDate
                      ? 'bg-accent/10 border-2 border-accent'
                      : 'bg-card hover:bg-card/80'
                  }`}
                  onClick={() => {
                    onDateSelect?.(day)
                    if (isCurrentMonth && onDayClick) {
                      onDayClick(day)
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium font-primary ${
                      isTodayDate ? 'bg-accent text-accent-foreground px-2 py-1 rounded font-bold' : ''
                    }`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex items-center space-x-1">
                      {/* Add Event Button - appears on hover */}
                      {isCurrentMonth && onDayClick && (
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity neo-button-active text-xs p-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDayClick(day)
                          }}
                          title="Create event"
                        >
                          +
                        </button>
                      )}
                      {dayServices.length > 0 && (
                        <Badge className={`h-5 w-5 p-0 text-xs flex items-center justify-center ${
                          dayServices.length > 5 ? 'bg-red-600 text-white' :
                          dayServices.length > 3 ? 'bg-orange-500 text-white' :
                          dayServices.length > 1 ? 'bg-tactical-gold text-white' :
                          'bg-green-600 text-white'
                        }`}>
                          {dayServices.length > 9 ? '9+' : dayServices.length}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Show services for this day - Enhanced density handling */}
                  <div className="space-y-1">
                    {dayServices.slice(0, 3).map((service, index) => {
                      const servicePriority = safeString(service.priority, 'medium');
                      const priorityColor = servicePriority === 'high' ? 'bg-red-100 border-red-200 text-red-800' :
                                           servicePriority === 'medium' ? 'bg-yellow-100 border-yellow-200 text-yellow-800' :
                                           'bg-green-100 border-green-200 text-green-800';
                      
                      return (
                        <div
                          key={service.id}
                          className={`text-xs p-1 border rounded cursor-pointer hover:shadow-sm transition-all group/event ${priorityColor}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if ('service' in service && 'clientName' in service) {
                              setViewingSchedule(service as ScheduledService);
                            }
                            
                            // Also trigger the parent's onEventView if provided
                            if (onEventView) {
                              const eventData = {
                                id: service.id,
                                type: 'event' as const,
                                title: safeString(service.title || service.service, 'Event'),
                                description: service.notes,
                                startDateTime: service.scheduledDate,
                                endDateTime: service.scheduledDate,
                                duration: service.duration || 60,
                                priority: service.priority || 'medium',
                                clientId: service.clientId,
                                location: service.location,
                                notes: service.notes,
                                status: service.status
                              };
                              onEventView(eventData);
                            }
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (onEventEdit) {
                              // Convert to UnifiedEvent format for editing
                              const eventData = {
                                id: service.id,
                                type: 'event' as const,
                                title: safeString(service.title || service.service, 'Event'),
                                description: service.notes,
                                startDateTime: service.scheduledDate,
                                duration: service.duration || 60,
                                priority: service.priority as any,
                                clientName: safeString(service.clientName, 'Client'),
                                notes: service.notes,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                              };
                              onEventEdit(eventData);
                            }
                          }}
                          title={`${safeString(service.service, 'Service')} - ${safeString(service.clientName, 'Client')} at ${safeFormatDate(service.scheduledDate, 'HH:mm')}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium truncate flex-1">
                              {(() => {
                                const serviceName = safeString(service.service, 'Service');
                                return serviceName.length > 15 ? serviceName.substring(0, 15) + '...' : serviceName;
                              })()}
                            </div>
                            <div className="flex items-center space-x-1">
                              {/* Options dropdown menu */}
                              {(onEventEdit || onEventDelete || onEventStatusChange) && (
                                <DropdownMenu
                                  trigger={
                                    <button
                                      className="p-0.5 text-tactical-grey-500 hover:text-tactical-grey-700 opacity-0 group-hover/event:opacity-100 transition-opacity"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </button>
                                  }
                                  items={[
                                    ...(onEventEdit ? [{
                                      label: 'Edit',
                                      onClick: () => {
                                        const eventData = {
                                          id: service.id,
                                          type: 'event' as const,
                                          title: safeString(service.title || service.service, 'Event'),
                                          description: service.notes,
                                          startDateTime: service.scheduledDate,
                                          duration: service.duration || 60,
                                          priority: service.priority as any,
                                          clientName: safeString(service.clientName, 'Client'),
                                          notes: service.notes,
                                          createdAt: new Date().toISOString(),
                                          updatedAt: new Date().toISOString()
                                        };
                                        onEventEdit(eventData);
                                      },
                                      icon: <Edit className="h-3 w-3" />
                                    }] : []),
                                    ...(onEventStatusChange ? [{
                                      label: service.status === 'completed' ? 'Mark Pending' : 'Mark Done',
                                      onClick: () => onEventStatusChange(service.id, service.status === 'completed' ? 'pending' : 'completed'),
                                      icon: <CheckCircle className="h-3 w-3" />
                                    }] : []),
                                    ...(onEventDelete ? [{
                                      label: 'Delete',
                                      onClick: () => onEventDelete(service.id),
                                      icon: <Trash2 className="h-3 w-3" />,
                                      variant: 'destructive' as const
                                    }] : [])
                                  ]}
                                  align="right"
                                />
                              )}
                              <div className={`w-2 h-2 rounded-full ${
                                safeString(service.status, 'scheduled') === 'completed' ? 'bg-green-600' :
                                safeString(service.status, 'scheduled') === 'in_progress' ? 'bg-tactical-gold' :
                                safeString(service.status, 'scheduled') === 'cancelled' ? 'bg-red-600' :
                                'bg-medium-grey'
                              }`} title={safeString(service.status, 'scheduled')} />
                            </div>
                          </div>
                          <div className="text-xs opacity-75 truncate mt-0.5">
                            {(() => {
                              const clientName = safeString(service.clientName, 'Client');
                              return clientName.length > 12 ? clientName.substring(0, 12) + '...' : clientName;
                            })()}
                          </div>
                          <div className="text-xs opacity-60 flex items-center justify-between mt-0.5">
                            <span>{safeFormatDate(service.scheduledDate, 'HH:mm')}</span>
                            {service.duration && (
                              <span className="text-xs">{service.duration}min</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {dayServices.length > 3 && (
                      <div 
                        className="text-xs text-center py-1 bg-tactical-grey-200 rounded cursor-pointer hover:bg-tactical-grey-300 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to daily view for this date
                          if (onDayClick) {
                            onDayClick(day);
                          }
                        }}
                        title={`View all ${dayServices.length} events`}
                      >
                        <span className="font-medium">+{dayServices.length - 3} more</span>
                        <br />
                        <span className="text-xs opacity-75">click to expand</span>
                      </div>
                    )}
                    
                    {/* Event density indicator */}
                    {dayServices.length > 5 && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" title="High activity day" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="neo-card">
        <div className="bg-card border-b border-border p-6">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-foreground font-primary uppercase tracking-wide">
              Upcoming Events
            </h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => syncWithGoogleCalendar()}
                className="neo-button px-3 py-1 text-sm font-medium font-primary uppercase tracking-wide"
                title="Sync with Google Calendar"
              >
                🔄 SYNC
              </button>
              <button
                onClick={() => exportToGoogleCalendar()}
                className="neo-button-active px-3 py-1 text-sm font-medium font-primary uppercase tracking-wide"
                title="Export to Google Calendar"
              >
                📤 EXPORT
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          {getUpcomingEvents().length > 0 ? (
            <div className="space-y-3">
              {getUpcomingEvents().map(event => (
                <div
                  key={event.id}
                  className="p-4 border border-border rounded neo-card cursor-pointer hover:bg-card/80 transition-colors"
                  onClick={() => setViewingSchedule(event)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h5 className="font-bold text-foreground font-primary">{event.title || event.service}</h5>
                      <p className="text-sm text-muted-foreground font-primary">
                        {safeFormatDate(event.scheduledDate, 'EEEE, MMM d')} at {safeFormatDate(event.scheduledDate, 'h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {event.source === 'google' && (
                        <span className="text-xs bg-tactical-gold-muted text-tactical-brown-dark px-2 py-1 rounded">
                          Google
                        </span>
                      )}
                      <Badge className={`${
                        event.priority === 'high' ? 'bg-red-100 text-red-800' :
                        event.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {event.priority?.toUpperCase() || 'MEDIUM'}
                      </Badge>
                      {enableEditing && event.source !== 'google' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSchedule(event);
                            }}
                            className="p-1 text-accent hover:text-accent/80"
                            title="Edit schedule"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSchedule(event.id);
                            }}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete schedule"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground font-primary">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{event.duration || 60} minutes</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{event.clientName || 'No client'}</span>
                    </div>
                  </div>
                  {event.notes && (
                    <p className="mt-2 text-sm text-muted-foreground font-primary">{event.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-muted-foreground font-primary uppercase tracking-wide">
                NO UPCOMING EVENTS
              </p>
              <button
                onClick={() => syncWithGoogleCalendar()}
                className="mt-3 neo-button-active px-4 py-2 text-sm font-primary uppercase tracking-wide"
              >
                SYNC WITH GOOGLE CALENDAR
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Schedule Modal */}
      {editingSchedule && enableEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-tactical-grey-800 mb-4">
              Edit Scheduled Service
            </h3>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedSchedule = {
                  ...editingSchedule,
                  service: formData.get('service') as string,
                  scheduledDate: formData.get('date') + 'T' + formData.get('time'),
                  notes: formData.get('notes') as string,
                  priority: formData.get('priority') as string,
                  duration: parseInt(formData.get('duration') as string) || 60,
                  recurrence: formData.get('recurrence') as string
                };
                handleUpdateSchedule(updatedSchedule);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Service Type
                </label>
                <input
                  type="text"
                  name="service"
                  defaultValue={editingSchedule.service}
                  className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingSchedule.scheduledDate.split('T')[0]}
                    className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    name="time"
                    defaultValue={editingSchedule.scheduledDate.split('T')[1]?.substring(0, 5) || '09:00'}
                    className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    defaultValue={editingSchedule.priority || 'medium'}
                    className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    defaultValue={editingSchedule.duration || 60}
                    min="15"
                    max="480"
                    step="15"
                    className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Recurrence
                </label>
                <select
                  name="recurrence"
                  defaultValue={editingSchedule.recurrence || 'NONE'}
                  className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                >
                  <option value="NONE">No Recurrence</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Bi-weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  defaultValue={editingSchedule.notes || ''}
                  rows={3}
                  className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="px-4 py-2 text-tactical-grey-600 border border-tactical-grey-400 rounded hover:bg-tactical-grey-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-tactical-gold text-white rounded hover:bg-tactical-gold-dark"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Detail Modal */}
      {viewingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-tactical-grey-800">
                Schedule Details
              </h3>
              <button
                onClick={() => setViewingSchedule(null)}
                className="text-gray-400 hover:text-tactical-grey-500"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-tactical-grey-100 p-4 rounded-lg">
                <h4 className="font-bold text-tactical-grey-800 mb-2">{viewingSchedule.service}</h4>
                <div className="text-sm text-tactical-grey-500 space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Client: {viewingSchedule.clientName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{safeFormatDate(viewingSchedule.scheduledDate, 'EEEE, MMMM do, yyyy')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{safeFormatDate(viewingSchedule.scheduledDate, 'h:mm a')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 text-center">⏱</span>
                    <span>Duration: {viewingSchedule.duration || 60} minutes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 text-center">🔄</span>
                    <span>Recurrence: {viewingSchedule.recurrence || 'None'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 text-center">📋</span>
                    <Badge className={`${
                      viewingSchedule.priority === 'high' ? 'bg-red-100 text-red-800' :
                      viewingSchedule.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {viewingSchedule.priority?.toUpperCase() || 'MEDIUM'} PRIORITY
                    </Badge>
                  </div>
                  {viewingSchedule.notes && (
                    <div className="mt-3 p-3 bg-hud-background-secondary border border-hud-border rounded">
                      <div className="font-medium text-hud-text-primary mb-1">Notes:</div>
                      <div className="text-medium-grey">{viewingSchedule.notes}</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setViewingSchedule(null)}
                  className="px-4 py-2 text-tactical-grey-600 border border-tactical-grey-400 rounded hover:bg-tactical-grey-100"
                >
                  Close
                </button>
                {enableEditing && (
                  <>
                    <button
                      onClick={() => {
                        setEditingSchedule(viewingSchedule);
                        setViewingSchedule(null);
                      }}
                      className="px-4 py-2 bg-tactical-gold text-white rounded hover:bg-tactical-gold-dark"
                    >
                      Edit Schedule
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteSchedule(viewingSchedule.id);
                        setViewingSchedule(null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendar;