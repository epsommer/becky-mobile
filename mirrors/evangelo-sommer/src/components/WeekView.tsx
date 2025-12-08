"use client"

import React, { useState, useEffect, useRef } from 'react'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { Clock, Plus, MoreVertical, Edit, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useViewManager } from '@/contexts/ViewManagerContext'
import { DailyTask } from '@/types/daily-planner'
import EventCreationModal, { UnifiedEvent } from '@/components/EventCreationModal'
import DropdownMenu from '@/components/ui/DropdownMenu'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'
import { ClientNotificationService } from '@/lib/client-notification-service'
import { DragDropProvider } from '@/components/DragDropContext'
import DragAndDropEvent from '@/components/DragAndDropEvent'
import DropZone from '@/components/DropZone'
import RescheduleConfirmationModal from '@/components/RescheduleConfirmationModal'
import DragVisualFeedback from '@/components/DragVisualFeedback'
import EventDetailsModal from '@/components/EventDetailsModal'

interface ScheduledService {
  id: string
  title: string
  service: string
  clientName: string
  scheduledDate: string
  notes?: string
  priority: string
  status: string
  duration: number
}

interface RescheduleData {
  event: UnifiedEvent
  fromSlot: { date: string; hour: number }
  toSlot: { date: string; hour: number }
  reason?: string
}

interface WeekViewProps {
  onTaskClick?: (task: DailyTask | ScheduledService) => void
  onTimeSlotClick?: (date: Date, hour: number) => void
  enableEventCreation?: boolean
  onTaskEdit?: (task: DailyTask | ScheduledService) => void
  onTaskDelete?: (taskId: string) => void
  onTaskStatusChange?: (taskId: string, status: string) => void
  onDayNavigation?: (date: Date) => void
  refreshTrigger?: number
}

const WeekView: React.FC<WeekViewProps> = ({ 
  onTaskClick, 
  onTimeSlotClick, 
  enableEventCreation = true,
  onTaskEdit,
  onTaskDelete,
  onTaskStatusChange,
  onDayNavigation,
  refreshTrigger 
}) => {
  const { state } = useViewManager()
  const { selectedDate, workingHours, displaySettings } = state
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([])
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [modalInitialDate, setModalInitialDate] = useState<Date>(new Date())
  const [modalInitialTime, setModalInitialTime] = useState<string>('09:00')
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleData, setRescheduleData] = useState<RescheduleData | null>(null)
  const [eventDetailsModal, setEventDetailsModal] = useState<{
    isOpen: boolean
    event: UnifiedEvent | null
  }>({ isOpen: false, event: null })
  const timeSlotRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Use unified events hook
  const {
    events: unifiedEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate
  } = useUnifiedEvents({ syncWithLegacy: true, refreshTrigger })

  // Load data from localStorage
  useEffect(() => {
    try {
      const services = JSON.parse(localStorage.getItem('scheduled-services') || '[]')
      setScheduledServices(services)

      // Load mock tasks (you might want to replace this with actual data loading)
      const mockTasks = JSON.parse(localStorage.getItem('daily-tasks') || '[]')
      setTasks(mockTasks)
    } catch (error) {
      console.error('Error loading week view data:', error)
    }
  }, [refreshTrigger])

  // Auto-scroll to current time on mount and when selectedDate changes
  useEffect(() => {
    const scrollToCurrentTime = () => {
      const now = new Date()
      const currentHour = now.getHours()
      
      // Check if any day in the current week is today
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      const isTodayInWeek = weekDays.some(day => isToday(day))
      
      if (isTodayInWeek && timeSlotRefs.current[currentHour]) {
        setTimeout(() => {
          timeSlotRefs.current[currentHour]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }, 100) // Small delay to ensure rendering is complete
      }
    }

    scrollToCurrentTime()
  }, [selectedDate])
  
  // Event creation handlers
  const handleTimeSlotClick = (date: Date, hour: number) => {
    console.group('🕐 WeekView: Time Slot Clicked')
    console.log('Time slot clicked:', {
      date: date.toISOString(),
      hour: hour,
      enableEventCreation: enableEventCreation
    })
    
    if (enableEventCreation) {
      console.log('Opening event creation modal...')
      setModalInitialDate(date)
      setModalInitialTime(`${hour.toString().padStart(2, '0')}:00`)
      setEditingEvent(null)
      setShowEventModal(true)
    } else {
      console.log('Event creation is disabled')
    }
    
    if (onTimeSlotClick) {
      console.log('Calling onTimeSlotClick callback')
      onTimeSlotClick(date, hour)
    } else {
      console.log('No onTimeSlotClick callback provided')
    }
    
    console.groupEnd()
  }
  
  const handleEventCreate = async (eventData: UnifiedEvent) => {
    try {
      await createEvent(eventData)
      setShowEventModal(false)
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }
  
  const handleEventEdit = (event: UnifiedEvent) => {
    setEditingEvent(event)
    setShowEventModal(true)
  }

  // Handle showing event details modal
  const handleShowEventDetails = (event: UnifiedEvent) => {
    console.group('🔍 WeekView: Show Event Details')
    console.log('Event clicked:', {
      id: event.id,
      title: event.title,
      type: event.type,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      clientName: event.clientName,
      location: event.location
    })
    console.log('Opening event details modal...')
    
    setEventDetailsModal({ isOpen: true, event })
    
    // Also call the original onTaskClick if provided for backward compatibility
    if (onTaskClick) {
      console.log('Calling original onTaskClick callback for backward compatibility')
      onTaskClick(event as any)
    } else {
      console.log('No onTaskClick callback provided')
    }
    
    console.groupEnd()
  }

  // Handle editing from event details modal
  const handleEditFromDetails = (event: UnifiedEvent) => {
    console.group('✏️ WeekView: Edit Event from Details')
    console.log('Editing event:', {
      id: event.id,
      title: event.title,
      type: event.type
    })
    console.log('Closing details modal and opening edit modal...')
    
    setEventDetailsModal({ isOpen: false, event: null })
    setEditingEvent(event)
    setShowEventModal(true)
    
    console.log('Edit modal should now be open with event data')
    console.groupEnd()
  }

  // Handle deleting from event details modal
  const handleDeleteFromDetails = async (eventId: string) => {
    console.group('🗑️ WeekView: Delete Event from Details')
    console.log('Deleting event ID:', eventId)
    console.log('Closing details modal...')
    
    setEventDetailsModal({ isOpen: false, event: null })
    
    try {
      console.log('Calling deleteEvent...')
      await deleteEvent(eventId)
      console.log('✅ Event deleted successfully')
    } catch (error) {
      console.error('❌ Error deleting event:', error)
    }
    
    console.groupEnd()
  }

  // Drag and drop handlers
  const handleEventDrop = async (event: UnifiedEvent, fromSlot: { date: string; hour: number }, toSlot: { date: string; hour: number }) => {
    const rescheduleInfo: RescheduleData = {
      event,
      fromSlot,
      toSlot
    }
    setRescheduleData(rescheduleInfo)
    setShowRescheduleModal(true)
  }

  const handleEventResize = async (event: UnifiedEvent, newStartTime: string, newEndTime: string) => {
    try {
      const updates = {
        startDateTime: newStartTime,
        endDateTime: newEndTime,
        duration: Math.round((new Date(newEndTime).getTime() - new Date(newStartTime).getTime()) / (1000 * 60))
      }
      await updateEvent(event.id, updates)
      console.log('✅ Event resized:', event.title)
    } catch (error) {
      console.error('❌ Error resizing event:', error)
    }
  }

  const handleRescheduleConfirm = async (data: RescheduleData, notifyParticipants: boolean) => {
    try {
      // Calculate new start and end times based on the new slot
      const newDate = new Date(data.toSlot.date + 'T00:00:00')
      newDate.setHours(data.toSlot.hour)
      
      const originalStart = new Date(data.event.startDateTime)
      const originalDuration = data.event.duration
      
      // Preserve the minutes from original time
      newDate.setMinutes(originalStart.getMinutes())
      
      const newStart = newDate.toISOString().slice(0, 19)
      const newEnd = new Date(newDate.getTime() + originalDuration * 60000).toISOString().slice(0, 19)
      
      const updates = {
        startDateTime: newStart,
        endDateTime: newEnd,
        notes: data.reason ? 
          `${data.event.notes || ''}

Rescheduled: ${data.reason}`.trim() : 
          data.event.notes
      }
      
      await updateEvent(data.event.id, updates)
      
      console.log('✅ Event rescheduled:', data.event.title)
      
      // Send notifications to participants if requested
      if (notifyParticipants) {
        try {
          const participants = ClientNotificationService.extractParticipants(data.event)
          
          if (participants.length > 0) {
            // Create the new event object with updated times
            const newEvent = {
              ...data.event,
              startDateTime: newStart,
              endDateTime: newEnd,
              updatedAt: new Date().toISOString()
            }
            
            // Send reschedule notifications via API
            const result = await ClientNotificationService.sendRescheduleNotification({
              originalEvent: data.event,
              newEvent,
              participants,
              reason: data.reason
            })
            
            if (result.success && result.results) {
              const { successful, failed } = result.results
              if (successful > 0) {
                console.log(`📧 Reschedule notifications sent to ${successful} participant(s)`)
              }
              if (failed > 0) {
                console.warn(`⚠️ Failed to send reschedule notifications to ${failed} participant(s)`)
                if (result.results.errors.length > 0) {
                  console.warn('Notification errors:', result.results.errors)
                }
              }
            } else {
              console.error('❌ Failed to send reschedule notifications:', result.error)
            }
          } else {
            console.log('📧 No participants found to notify about reschedule')
          }
        } catch (error) {
          console.error('❌ Error sending reschedule notifications:', error)
        }
      }
      
    } catch (error) {
      console.error('❌ Error rescheduling event:', error)
      throw error
    }
  }

  // Generate week days starting from Sunday
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Generate time slots for all 24 hours
  const timeSlots = Array.from({ length: 24 }, (_, i) => i)

  // Get events for a specific day and hour
  const getEventsForSlot = (date: Date, hour: number) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    const servicesForSlot = scheduledServices.filter(service => {
      const serviceDate = new Date(service.scheduledDate)
      const serviceHour = serviceDate.getHours()
      return isSameDay(serviceDate, date) && serviceHour === hour
    })

    const tasksForSlot = tasks.filter(task => {
      if (!task.startTime) return false
      const taskDate = new Date(task.startTime)
      const taskHour = taskDate.getHours()
      return isSameDay(taskDate, date) && taskHour === hour
    })

    // Include unified events
    const unifiedEventsForSlot = unifiedEvents.filter(event => {
      const eventDate = new Date(event.startDateTime)
      const eventHour = eventDate.getHours()
      return isSameDay(eventDate, date) && eventHour === hour
    })

    return [...servicesForSlot, ...tasksForSlot, ...unifiedEventsForSlot]
  }

  const formatTimeSlot = (hour: number) => {
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const period = hour < 12 ? 'AM' : 'PM'
    return `${displayHour}:00 ${period}`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-tactical-gold-muted text-tactical-brown-dark border-tactical-gold'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-600'
      case 'in_progress':
      case 'in-progress':
        return 'bg-tactical-gold'
      case 'cancelled':
        return 'bg-red-600'
      default:
        return 'bg-medium-grey'
    }
  }

  return (
    <DragDropProvider onEventDrop={handleEventDrop} onEventResize={handleEventResize}>
    <div ref={containerRef} className="space-y-6">
      {/* Week Header */}
      <div className="neo-card">
        <div className="p-0">
          {/* Day Headers */}
          <div className="grid grid-cols-8 gap-0 border-b border-border">
            {/* Time column header */}
            <div className="p-2 md:p-4 bg-card border-r border-border">
              <span className="text-xs md:text-sm font-bold text-foreground uppercase tracking-wide font-primary">
                TIME
              </span>
            </div>

            {/* Day headers */}
            {weekDays.map(day => {
              const isCurrentDay = isToday(day)
              const dayOfMonth = format(day, 'd')
              const dayName = format(day, 'EEE')

              return (
                <div
                  key={day.toISOString()}
                  className={`p-2 md:p-4 border-r border-border text-center ${
                    isCurrentDay ? 'bg-accent text-accent-foreground' : 'bg-card'
                  }`}
                >
                  <div className="space-y-1">
                    <div className={`text-xs font-bold uppercase tracking-wide font-primary ${
                      isCurrentDay ? 'text-accent-foreground' : 'text-foreground'
                    }`}>
                      {dayName}
                    </div>
                    <div className={`text-sm md:text-lg font-bold font-primary ${
                      isCurrentDay
                        ? 'bg-accent-foreground text-accent rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center mx-auto'
                        : 'text-foreground'
                    }`}>
                      {dayOfMonth}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time Grid */}
          {timeSlots.map(hour => {
            // Check if this is the current hour
            const now = new Date()
            const isCurrentHour = now.getHours() === hour

            return (
            <div
              key={hour}
              ref={(el) => { timeSlotRefs.current[hour] = el; }}
              className={`grid grid-cols-8 gap-0 border-b border-border min-h-[60px] md:min-h-[80px] ${isCurrentHour ? 'bg-accent/10 border-l-4 border-accent' : ''}`}>
              {/* Time Label */}
              <div className={`p-2 md:p-3 border-r border-border flex items-start transition-colors ${isCurrentHour ? 'bg-accent text-accent-foreground' : 'bg-card hover:bg-card/80'}`}>
                <div className="text-center w-full">
                  <div className={`text-xs md:text-sm font-bold font-primary ${isCurrentHour ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
                    {hour.toString().padStart(2, '0')}:00
                    {isCurrentHour && <span className="ml-1 text-xs">●</span>}
                  </div>
                  <div className={`text-xs font-primary hidden md:block ${isCurrentHour ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
                    {formatTimeSlot(hour).split(' ')[1]}
                  </div>
                </div>
              </div>

              {/* Day Columns */}
              {weekDays.map(day => {
                const events = getEventsForSlot(day, hour)
                const isCurrentDay = isToday(day)

                return (
                  <DropZone
                    key={`${day.toISOString()}-${hour}`}
                    date={format(day, 'yyyy-MM-dd')}
                    hour={hour}
                    isOccupied={events.length > 0}
                    events={events.filter(event => unifiedEvents.find(e => e.id === event.id)) as UnifiedEvent[]}
                    onTimeSlotClick={handleTimeSlotClick}
                    className={`p-1 md:p-2 border-r border-border min-h-[60px] md:min-h-[80px] transition-colors ${
                      isCurrentDay ? 'bg-accent/20 border-l-2 border-accent' : 'bg-background hover:bg-card'
                    }`}
                    compact={true}
                  >
                    <div className="space-y-1">
                      {events.slice(0, 2).map(event => {
                        const unifiedEvent = unifiedEvents.find(e => e.id === event.id)
                        if (unifiedEvent) {
                          return (
                            <DragAndDropEvent
                              key={event.id}
                              event={unifiedEvent}
                              currentDate={format(day, 'yyyy-MM-dd')}
                              currentHour={hour}
                              onClick={(e) => handleShowEventDetails(e)}
                              showResizeHandles={false}
                              isCompact={true}
                              className="text-xs p-1 md:p-2 rounded border hover:shadow-sm transition-all"
                            />
                          )
                        } else {
                          return (
                            <div
                              key={event.id}
                              className={`text-xs p-1 md:p-2 rounded border cursor-pointer hover:shadow-sm transition-all group/event ${
                                getPriorityColor(event.priority)
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                const unifiedEvent = unifiedEvents.find(ue => ue.id === event.id)
                                if (unifiedEvent) {
                                  handleShowEventDetails(unifiedEvent)
                                } else if ('service' in event || 'startTime' in event) {
                                  onTaskClick?.(event as DailyTask | ScheduledService)
                                }
                              }}
                            >
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium truncate text-xs flex-1 mr-1">
                              {(event.title || ('service' in event ? event.service : '') || 'Untitled').length > 10
                                ? (event.title || ('service' in event ? event.service : '') || 'Untitled').substring(0, 10) + '...'
                                : (event.title || ('service' in event ? event.service : '') || 'Untitled')
                              }
                            </div>
                            <div className="flex items-center space-x-1">
                              <div 
                                className={`w-2 h-2 rounded-full ${getStatusColor(event.status || 'scheduled')}`}
                                title={event.status || 'scheduled'}
                              />
                              {(onTaskEdit || onTaskDelete || onTaskStatusChange) && (
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
                                    ...(onTaskEdit && ('service' in event || 'startTime' in event) ? [{
                                      label: 'Edit',
                                      onClick: () => onTaskEdit(event as DailyTask | ScheduledService),
                                      icon: <Edit className="h-3 w-3" />
                                    }] : []),
                                    ...(onTaskStatusChange ? [{
                                      label: event.status === 'completed' ? 'Mark Pending' : 'Mark Done',
                                      onClick: () => onTaskStatusChange(event.id, event.status === 'completed' ? 'pending' : 'completed'),
                                      icon: <CheckCircle className="h-3 w-3" />
                                    }] : []),
                                    ...(onTaskDelete ? [{
                                      label: 'Delete',
                                      onClick: () => onTaskDelete(event.id),
                                      icon: <Trash2 className="h-3 w-3" />,
                                      variant: 'destructive' as const
                                    }] : [])
                                  ]}
                                  align="right"
                                />
                              )}
                            </div>
                          </div>
                          <div className="text-xs opacity-75 truncate hidden md:block">
                            {'clientName' in event ? event.clientName : 'No client'}
                          </div>
                          {'duration' in event && event.duration && (
                            <div className="text-xs opacity-60 flex items-center mt-1 hidden md:flex">
                              <Clock className="h-3 w-3 mr-1" />
                              {'duration' in event ? event.duration : 0}min
                            </div>
                          )}
                          </div>
                          )
                        }
                      })}
                      
                      {events.length > 2 && (
                        <div 
                          className="text-xs text-medium-grey text-center py-1 cursor-pointer hover:text-hud-text-primary hover:bg-tactical-gold-light rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onDayNavigation) {
                              onDayNavigation(day)
                            }
                          }}
                          title={`View all ${events.length} events for ${format(day, 'MMM d')}`}
                        >
                          +{events.length - 2} more
                        </div>
                      )}
                    </div>
                  </DropZone>
                )
              })}
            </div>
            )
          })}
        </div>
      </div>

      {/* Week Summary */}
      <div className="neo-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground font-primary uppercase tracking-wide">
            WEEK SUMMARY
          </h3>
            <div className="flex items-center space-x-4">
              {weekDays.map(day => {
                const dayEvents = scheduledServices.filter(service => {
                  const serviceDate = new Date(service.scheduledDate)
                  return isSameDay(serviceDate, day)
                })
                
                return (
                  <div key={day.toISOString()} className="text-center">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-primary">
                      {format(day, 'EEE')}
                    </div>
                    <Badge
                      variant="outline"
                      className={`mt-1 ${dayEvents.length > 0 ? 'bg-accent text-accent-foreground' : 'bg-card text-muted-foreground border-border'}`}
                    >
                      {dayEvents.length}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      {/* Drag Visual Feedback */}
      <DragVisualFeedback containerRef={containerRef as React.RefObject<HTMLElement>} />
      
      {/* Event Creation Modal */}
      {enableEventCreation && (
        <EventCreationModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false)
            setEditingEvent(null)
          }}
          onSave={handleEventCreate}
          initialDate={modalInitialDate}
          initialTime={modalInitialTime}
          editingEvent={editingEvent || undefined}
        />
      )}
      
      {/* Reschedule Confirmation Modal */}
      <RescheduleConfirmationModal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false)
          setRescheduleData(null)
        }}
        onConfirm={handleRescheduleConfirm}
        rescheduleData={rescheduleData}
      />
      
      {/* Event Details Modal */}
      <EventDetailsModal
        event={eventDetailsModal.event}
        isOpen={eventDetailsModal.isOpen}
        onClose={() => setEventDetailsModal({ isOpen: false, event: null })}
        onEdit={handleEditFromDetails}
        onDelete={handleDeleteFromDetails}
      />
    </div>
    </DragDropProvider>
  )
}

export default WeekView