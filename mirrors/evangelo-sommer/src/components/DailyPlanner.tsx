"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { Plus, Clock, MapPin, User, Edit, Check, X, MoreVertical, Trash2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DailyTask, PRIORITY_CONFIGS, STATUS_CONFIGS } from '@/types/daily-planner'
import EventCreationModal, { UnifiedEvent } from '@/components/EventCreationModal'
import DropdownMenu from '@/components/ui/DropdownMenu'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'
import { createLocalDate } from '@/lib/timezone-utils'
import { ClientNotificationService } from '@/lib/client-notification-service'
import { DragDropProvider } from '@/components/DragDropContext'
import { MouseEventDebugger } from '@/components/MouseEventDebugger'
import DragAndDropEvent from '@/components/DragAndDropEvent'
import DropZone from '@/components/DropZone'
import RescheduleConfirmationModal from '@/components/RescheduleConfirmationModal'
import ResizeConfirmationModal from '@/components/ResizeConfirmationModal'
import DragVisualFeedback from '@/components/DragVisualFeedback'
import ContinuousEventBlock from '@/components/ContinuousEventBlock'
import ConflictResolutionModal from '@/components/ConflictResolutionModal'
import { conflictDetector, ConflictResult, ResolutionStrategy } from '@/lib/conflict-detector'
import { eventDebugger } from '@/lib/event-debugger'
import DebugPanel from '@/components/DebugPanel'
import { 
  mockTasks, 
  calculatePlannerStats, 
  getTasksForDate, 
  updateTaskStatus,
  formatTime,
  formatDuration,
  getPriorityColorClass,
  getStatusColorClass,
  sortTasksByTime
} from '@/lib/daily-planner'

interface DailyPlannerProps {
  date?: Date
  onEventView?: (event: UnifiedEvent) => void
  refreshTrigger?: number
  onRefreshTrigger?: () => void
  onTaskStatusChange?: (taskId: string, status: string) => void
  onConflictClick?: (event: UnifiedEvent, conflicts: ConflictResult) => void
  activeConflicts?: { [eventId: string]: ConflictResult }
  excludeFromConflictDetection?: Set<string>
}

interface RescheduleData {
  event: UnifiedEvent
  fromSlot: { date: string; hour: number }
  toSlot: { date: string; hour: number }
  reason?: string
}

interface ConflictModalData {
  proposedEvent: UnifiedEvent
  conflicts: ConflictResult
}

const DailyPlanner: React.FC<DailyPlannerProps> = ({ date = createLocalDate(), onEventView, refreshTrigger, onRefreshTrigger, onTaskStatusChange, onConflictClick, activeConflicts, excludeFromConflictDetection }) => {
  const [tasks, setTasks] = useState<DailyTask[]>(mockTasks)
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null)
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null)
  const [conflictModal, setConflictModal] = useState<ConflictModalData | null>(null)
  const [eventConflicts, setEventConflicts] = useState<Map<string, ConflictResult>>(new Map())
  const pixelsPerHour = 80 // Standard height per hour for continuous blocks
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:00')
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleData, setRescheduleData] = useState<RescheduleData | null>(null)
  const [showResizeModal, setShowResizeModal] = useState(false)
  const [resizeData, setResizeData] = useState<any>(null)
  const timeSlotRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Use the unified events hook
  const { 
    events, 
    createEvent, 
    updateEvent, 
    deleteEvent,
    getEventsForDate, 
    isLoading: eventsLoading 
  } = useUnifiedEvents({ syncWithLegacy: true, refreshTrigger })

  // Load scheduled services from localStorage and convert to tasks
  useEffect(() => {
    try {
      const scheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
      const scheduleTasks = scheduledServices.map((schedule: any) => {
        // Parse the scheduled date and time properly
        const scheduledDateTime = new Date(schedule.scheduledDate)
        const duration = schedule.duration || 60
        const endDateTime = new Date(scheduledDateTime)
        endDateTime.setMinutes(endDateTime.getMinutes() + duration)
        
        return {
          id: schedule.id,
          title: schedule.title || `${schedule.service} - ${schedule.clientName}`,
          description: schedule.notes || `Scheduled ${schedule.service.toLowerCase()} service`,
          date: schedule.scheduledDate.split('T')[0],
          startTime: scheduledDateTime, // Use Date object instead of string
          endTime: endDateTime, // Calculate end time as Date object
          estimatedDuration: duration, // Add required field for DailyTask interface
          duration: duration,
          priority: schedule.priority?.toLowerCase() || 'medium',
          status: schedule.status?.toLowerCase() || 'pending',
          category: 'service',
          location: `${schedule.clientName}'s Property`,
          client: schedule.clientName,
          createdAt: new Date(), // Add required field for DailyTask interface
          updatedAt: new Date()  // Add required field for DailyTask interface
        }
      });
      
      // Combine with existing mock tasks
      setTasks([...mockTasks, ...scheduleTasks]);
      console.log('📅 Loaded scheduled services into planner:', scheduleTasks);
    } catch (error) {
      console.error('Error loading scheduled services:', error);
      setTasks(mockTasks);
    }
  }, [refreshTrigger]);

  // Auto-scroll to current time on mount and when date changes
  useEffect(() => {
    const scrollToCurrentTime = () => {
      const now = new Date()
      const currentHour = now.getHours()
      
      // Only scroll if viewing today's date
      const isToday = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
      
      if (isToday && timeSlotRefs.current[currentHour]) {
        setTimeout(() => {
          timeSlotRefs.current[currentHour]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }, 100) // Small delay to ensure rendering is complete
      }
    }

    scrollToCurrentTime()
  }, [date])

  // Get today's tasks from both legacy tasks and unified events
  const todaysTasks = getTasksForDate(tasks, date)

  // Debug: Check event filtering
  console.log('🔥 DEBUG EVENTS FILTER - Total loaded events:', events.length)
  console.log('🔥 DEBUG EVENTS FILTER - Target date:', date)
  console.log('🔥 DEBUG EVENTS FILTER - Date format:', format(date, 'yyyy-MM-dd'))
  console.log('🔥 DEBUG EVENTS FILTER - All events:', events.map(e => ({
    id: e.id,
    title: e.title,
    startDateTime: e.startDateTime,
    extractedDate: e.startDateTime.split('T')[0],
    matchesTarget: e.startDateTime.split('T')[0] === format(date, 'yyyy-MM-dd')
  })))
  console.log('🔥 DEBUG EVENTS FILTER - Target date string for comparison:', format(date, 'yyyy-MM-dd'))

  const todaysEvents = getEventsForDate(date)
  console.log('🔥 DEBUG EVENTS FILTER - Filtered events count:', todaysEvents.length)

  // Group events by time slot to identify conflicts and prevent duplicate rendering
  const groupEventsByTimeSlot = (events: UnifiedEvent[]) => {
    const timeSlotGroups = new Map<string, UnifiedEvent[]>()

    events.forEach(event => {
      const startTime = event.startDateTime.split('T')[1]?.substring(0, 5) || '09:00'
      const timeSlotKey = startTime

      if (!timeSlotGroups.has(timeSlotKey)) {
        timeSlotGroups.set(timeSlotKey, [])
      }
      timeSlotGroups.get(timeSlotKey)!.push(event)
    })

    return timeSlotGroups
  }

  const eventGroups = groupEventsByTimeSlot(todaysEvents)
  const combinedTasks = [...todaysTasks]

  // Process each time slot group - only render primary event, store conflicts for tabs
  const eventConflictTabs = new Map<string, UnifiedEvent[]>()

  eventGroups.forEach((eventsInSlot, timeSlot) => {
    if (eventsInSlot.length === 1) {
      // Single event - render normally
      const event = eventsInSlot[0]
      processEventForRendering(event)
    } else {
      // Multiple events in same time slot - render primary, store others for conflict tabs
      const primaryEvent = eventsInSlot[0] // Use first event as primary
      const conflictingEvents = eventsInSlot.slice(1) // Store others as conflicts

      console.log(`🔥 CONFLICT GROUP: ${eventsInSlot.length} events at ${timeSlot}`)
      console.log(`🔥 Primary event: ${primaryEvent.title}`)
      console.log(`🔥 Conflicting events: ${conflictingEvents.map(e => e.title).join(', ')}`)

      // Store conflicting events for tabs
      eventConflictTabs.set(primaryEvent.id, conflictingEvents)

      // Only render the primary event
      processEventForRendering(primaryEvent)
    }
  })

  // Helper function to process events for rendering (extracted from forEach logic)
  function processEventForRendering(event: UnifiedEvent) {
    // Parse event start time safely to avoid timezone issues
    let eventDate = new Date(date) // Use the date prop as base instead of current time
    let eventTime = '09:00'
    
    try {
      if (event.startDateTime) {
        // Parse date and time from local format (YYYY-MM-DDTHH:MM:SS)
        const [datePart, timePart] = event.startDateTime.split('T')
        if (datePart && timePart) {
          const [year, month, day] = datePart.split('-').map(Number)
          const [hour, minute, second = 0] = timePart.split(':').map(Number)
          
          // Validate parsed values
          if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hour) && !isNaN(minute)) {
            // Create date in local timezone without any UTC conversion
            const newEventDate = new Date(year, month - 1, day, hour, minute, second)
            
            // Only use the parsed date if it's valid
            if (!isNaN(newEventDate.getTime())) {
              eventDate = newEventDate
              eventTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
              
              // Debug logging for troubleshooting
              if (event.title?.toLowerCase().includes('hedge')) {
                console.log('🌿 HEDGE DEBUG - Event:', event.title)
                console.log('🌿 HEDGE DEBUG - startDateTime:', event.startDateTime)
                console.log('🌿 HEDGE DEBUG - endDateTime:', event.endDateTime)
                console.log('🌿 HEDGE DEBUG - stored duration:', event.duration)
                console.log('🌿 HEDGE DEBUG - Parsed eventTime:', eventTime)
                console.log('🌿 HEDGE DEBUG - Parsed hour/minute:', hour, minute)
                console.log('🌿 HEDGE DEBUG - Valid eventDate:', eventDate)
                console.log('🌿 HEDGE DEBUG - Today date prop:', date)
                console.log('🌿 HEDGE DEBUG - Event ID:', event.id)
                console.log('🌿 HEDGE DEBUG - Full event object:', event)
              }
            } else {
              console.warn('Invalid parsed date for event:', event.title, { year, month, day, hour, minute })
            }
          } else {
            console.warn('Invalid date/time components for event:', event.title, { year, month, day, hour, minute })
          }
        } else {
          console.warn('Invalid startDateTime format:', event.startDateTime)
        }
      }
    } catch (error) {
      console.warn('Error parsing event startDateTime:', event.startDateTime, error)
    }
    
    // Calculate endTime based on start time and duration
    let endTime = eventTime // fallback to start time
    try {
      if (!isNaN(eventDate.getTime())) {
        const endDate = new Date(eventDate)
        endDate.setMinutes(endDate.getMinutes() + (event.duration || 60))
        endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
      }
    } catch (error) {
      console.warn('Error calculating end time for event:', event.title, error)
    }
    
    // Convert eventTime string back to Date object for DailyTask interface compatibility
    const startTimeDate = new Date(eventDate)
    const endTimeDate = new Date(eventDate)
    
    try {
      // Parse eventTime (HH:MM format) and set on the date
      const [startHour, startMinute] = eventTime.split(':').map(Number)
      if (!isNaN(startHour) && !isNaN(startMinute)) {
        startTimeDate.setHours(startHour, startMinute, 0, 0)
      }
      
      // Parse endTime (HH:MM format) and set on the date
      const [endHour, endMinute] = endTime.split(':').map(Number)
      if (!isNaN(endHour) && !isNaN(endMinute)) {
        endTimeDate.setHours(endHour, endMinute, 0, 0)
      }
    } catch (error) {
      console.warn('Error parsing time for event:', event.title, error)
    }

    const eventAsTask = {
      id: event.id,
      title: event.title,
      description: event.description || '',
      startTime: startTimeDate,
      endTime: endTimeDate,
      estimatedDuration: event.duration,
      priority: event.priority,
      status: 'pending' as const,
      location: event.location || '',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    combinedTasks.push(eventAsTask as any)
  }
  
  const sortedTasks = sortTasksByTime(combinedTasks)
  const stats = calculatePlannerStats(combinedTasks)

  // Debug logging for event positioning investigation
  console.log(`🔥 DAILY PLANNER DEBUG - Date: ${format(date, 'yyyy-MM-dd')}`)
  console.log(`🔥 Today's tasks: ${todaysTasks.length}, Today's events: ${todaysEvents.length}, Combined: ${combinedTasks.length}, Sorted: ${sortedTasks.length}`)
  if (todaysEvents.length > 0) {
    console.log(`🔥 Today's events:`, todaysEvents.map(e => ({ id: e.id, title: e.title, startDateTime: e.startDateTime })))
  }

  const handleStatusChange = (taskId: string, status: DailyTask['status']) => {
    console.log('DailyPlanner handleStatusChange called:', taskId, status)
    
    // Update local React state
    setTasks(prevTasks => updateTaskStatus(prevTasks, taskId, status))
    
    // Also call the external status change handler if provided (for localStorage updates)
    if (onTaskStatusChange) {
      console.log('Calling external onTaskStatusChange handler')
      onTaskStatusChange(taskId, status)
    } else {
      console.log('No external onTaskStatusChange handler provided')
    }
  }

  const handleDeleteEvent = async (taskId: string) => {
    try {
      await deleteEvent(taskId)
      // Also remove from local tasks if it exists there
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId))
      console.log('✅ Event deleted:', taskId)
    } catch (error) {
      console.error('❌ Error deleting event:', error)
    }
  }
  
  // Handle creating new unified events with time slot context
  const handleCreateEvent = async (eventData: UnifiedEvent) => {
    try {
      await createEvent(eventData)
      console.log('✅ Event created:', eventData.title)
    } catch (error) {
      console.error('❌ Error creating event:', error)
    }
  }
  
  // Handle time slot clicks
  const handleTimeSlotClick = (hour: number) => {
    const timeString = `${hour.toString().padStart(2, '0')}:00`
    setEditingEvent(null)
    setShowEventModal(true)
    // The modal will use the date prop and we can enhance it to accept initial time
  }
  
  // Handle editing events
  const handleEditEvent = (task: any) => {
    // Find if this is a unified event
    const unifiedEvent = events.find(e => e.id === task.id)
    if (unifiedEvent) {
      setEditingEvent(unifiedEvent)
      setShowEventModal(true)
    } else {
      // Handle legacy task editing (placeholder for now)
      console.log('Editing legacy task:', task)
    }
  }

  // Conflict detection and resolution handlers
  const detectEventConflicts = async (proposedEvent: UnifiedEvent): Promise<ConflictResult> => {
    const existingEvents = events.filter(e => e.id !== proposedEvent.id)
    return conflictDetector.detectConflicts(proposedEvent, existingEvents)
  }

  const handleConflictResolution = async (
    strategy: ResolutionStrategy, 
    alternativeSlot?: { start: Date; end: Date }
  ) => {
    if (!conflictModal) return

    const { proposedEvent } = conflictModal

    try {
      switch (strategy) {
        case 'override':
          // Force create the event despite conflicts
          await createEvent(proposedEvent)
          console.log('✅ Event created with override:', proposedEvent.title)
          break

        case 'auto_reschedule':
          if (alternativeSlot) {
            const rescheduledEvent = {
              ...proposedEvent,
              startDateTime: alternativeSlot.start.toISOString(),
              endDateTime: alternativeSlot.end.toISOString(),
              duration: Math.round((alternativeSlot.end.getTime() - alternativeSlot.start.getTime()) / (1000 * 60))
            }
            await createEvent(rescheduledEvent)
            console.log('✅ Event rescheduled:', rescheduledEvent.title)
          }
          break

        case 'notify_client':
          // Create the event and send notifications about conflicts
          await createEvent(proposedEvent)
          // TODO: Implement client notification for conflicts
          console.log('✅ Event created with client notification:', proposedEvent.title)
          break

        case 'waitlist':
          // TODO: Implement waitlist functionality
          console.log('📋 Event added to waitlist:', proposedEvent.title)
          break
      }

      setConflictModal(null)
    } catch (error) {
      console.error('❌ Error resolving conflict:', error)
    }
  }

  // Individual conflict handlers for ConflictResolutionModal interface
  const handleAcceptConflict = async (conflictId: string) => {
    console.log(`✅ DailyPlanner accepting conflict: ${conflictId}`)
    // Remove the specific conflict and continue with event creation if no conflicts remain
    if (conflictModal) {
      const updatedConflicts = {
        ...conflictModal.conflicts,
        conflicts: conflictModal.conflicts.conflicts.filter(c => c.id !== conflictId)
      }

      if (updatedConflicts.conflicts.length === 0) {
        // No more conflicts, create the event
        await createEvent(conflictModal.proposedEvent)
        console.log('✅ Event created after accepting all conflicts:', conflictModal.proposedEvent.title)
        setConflictModal(null)
      } else {
        // Update conflicts state
        setConflictModal({
          ...conflictModal,
          conflicts: updatedConflicts
        })
      }
    }
  }

  const handleConflictDeleteEvent = async (conflictId: string, eventId: string) => {
    console.log(`🗑️ DailyPlanner deleting event: ${eventId} for conflict: ${conflictId}`)
    try {
      // Delete the conflicting event
      const result = await deleteEvent(eventId)
      console.log(`✅ Event deleted: ${eventId}, result: ${result}`)

      // Recalculate conflicts after deletion
      if (conflictModal) {
        const updatedConflicts = await detectEventConflicts(conflictModal.proposedEvent)
        if (updatedConflicts.hasConflicts) {
          setConflictModal({
            ...conflictModal,
            conflicts: updatedConflicts
          })
        } else {
          // No more conflicts, create the event
          await createEvent(conflictModal.proposedEvent)
          console.log('✅ Event created after resolving all conflicts:', conflictModal.proposedEvent.title)
          setConflictModal(null)
        }
      }
    } catch (error) {
      console.error('❌ Error deleting conflicting event:', error)
    }
  }

  const handleRescheduleEvent = async (conflictId: string, eventId: string) => {
    console.log(`📅 DailyPlanner rescheduling event: ${eventId} for conflict: ${conflictId}`)
    // For now, just show a message - rescheduling could be implemented later
    alert(`Rescheduling functionality for event ${eventId} is not yet implemented in DailyPlanner`)
  }

  const handleConflictAcceptSave = async () => {
    console.log(`✅ DailyPlanner handling accept/save for conflict resolution`)

    if (conflictModal) {
      // Get existing events for conflict detection
      const existingEvents = events.filter(e => e.id !== conflictModal.proposedEvent.id)

      // Check if there are any remaining unresolved conflicts after user resolutions
      const remainingConflicts = await conflictDetector.detectConflictsWithResolutions(
        conflictModal.proposedEvent,
        existingEvents
      )

      console.log(`🔥 DailyPlanner: After checking resolved conflicts, remaining: ${remainingConflicts.conflicts.length}`)

      if (!remainingConflicts.hasConflicts) {
        // No remaining unresolved conflicts, create the event
        console.log(`✅ No remaining unresolved conflicts. Creating event: ${conflictModal.proposedEvent.title}`)
        try {
          await createEvent(conflictModal.proposedEvent)
          console.log('✅ Event created successfully after conflict resolution:', conflictModal.proposedEvent.title)
          setConflictModal(null)
        } catch (error) {
          console.error('❌ Failed to create event after conflict resolution:', error)
        }
      } else {
        console.log(`⚠️ Cannot save event. ${remainingConflicts.conflicts.length} unresolved conflicts remaining.`)
        // Update the modal with remaining conflicts
        setConflictModal({
          ...conflictModal,
          conflicts: remainingConflicts
        })
      }
    }
  }

  // Enhanced event creation with conflict detection
  const handleCreateEventWithConflictCheck = async (eventData: UnifiedEvent) => {
    const timer = eventDebugger.startTimer('handleCreateEventWithConflictCheck')
    
    try {
      // Validate event data
      const validation = eventDebugger.validateEvent(eventData)
      if (!validation.isValid) {
        eventDebugger.log('error', 'event', 'Event validation failed', {
          eventId: eventData.id,
          errors: validation.errors
        }, 'DailyPlanner')
        return
      }

      // Check for conflicts before creating
      const conflicts = await detectEventConflicts(eventData)
      eventDebugger.validateConflictResult(conflicts, 'event creation')
      
      if (conflicts.hasConflicts) {
        eventDebugger.log('warn', 'conflict', 'Conflicts detected during event creation', {
          eventId: eventData.id,
          conflictCount: conflicts.conflicts.length
        }, 'DailyPlanner')
        
        // Show conflict resolution modal
        setConflictModal({ proposedEvent: eventData, conflicts })
        
        eventDebugger.logEventOperation({
          type: 'create',
          event: eventData,
          result: 'conflict',
          conflicts
        })
        return
      }

      // No conflicts, proceed with creation
      await createEvent(eventData)
      
      eventDebugger.log('info', 'event', 'Event created successfully without conflicts', {
        eventId: eventData.id,
        title: eventData.title
      }, 'DailyPlanner')
      
      eventDebugger.logEventOperation({
        type: 'create',
        event: eventData,
        result: 'success'
      })
    } catch (error) {
      eventDebugger.log('error', 'event', 'Error creating event', {
        eventId: eventData.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'DailyPlanner')
      
      eventDebugger.logEventOperation({
        type: 'create',
        event: eventData,
        result: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      timer()
    }
  }

  // Enhanced event update with conflict detection
  const handleUpdateEventWithConflictCheck = async (eventData: UnifiedEvent) => {
    const timer = eventDebugger.startTimer('handleUpdateEventWithConflictCheck')
    
    try {
      // Validate event data
      const validation = eventDebugger.validateEvent(eventData)
      if (!validation.isValid) {
        eventDebugger.log('error', 'event', 'Event validation failed', {
          eventId: eventData.id,
          errors: validation.errors
        }, 'DailyPlanner')
        return
      }

      // Check for conflicts before updating (detectEventConflicts already excludes the event being updated)
      const conflicts = await detectEventConflicts(eventData)
      eventDebugger.validateConflictResult(conflicts, 'event update')
      
      if (conflicts.hasConflicts) {
        eventDebugger.log('warn', 'conflict', 'Conflicts detected during event update', {
          eventId: eventData.id,
          conflictCount: conflicts.conflicts.length
        }, 'DailyPlanner')
        
        // Show conflict resolution modal
        setConflictModal({ proposedEvent: eventData, conflicts })
        
        eventDebugger.logEventOperation({
          type: 'update',
          event: eventData,
          result: 'conflict',
          conflicts
        })
        return
      }

      // No conflicts, proceed with update
      await updateEvent(eventData.id, eventData)
      
      eventDebugger.log('info', 'event', 'Event updated successfully without conflicts', {
        eventId: eventData.id,
        title: eventData.title
      }, 'DailyPlanner')
      
      eventDebugger.logEventOperation({
        type: 'update',
        event: eventData,
        result: 'success'
      })
    } catch (error) {
      eventDebugger.log('error', 'event', 'Failed to update event', {
        eventId: eventData.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'DailyPlanner')
      
      eventDebugger.logEventOperation({
        type: 'update',
        event: eventData,
        result: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      timer()
    }
  }

  // Combined handler that routes to create or update based on editing state
  const handleSaveEvent = async (eventData: UnifiedEvent) => {
    if (editingEvent) {
      await handleUpdateEventWithConflictCheck(eventData)
    } else {
      await handleCreateEventWithConflictCheck(eventData)
    }
  }

  // Handle showing event details modal
  const handleShowEventDetails = (event: UnifiedEvent) => {
    // Only call the parent's onEventView - no local modal needed
    onEventView?.(event)
  }


  // Memoized function to update conflicts
  // Get all existing events from all storage sources (matching time-manager approach)
  const getAllExistingEvents = useCallback((): UnifiedEvent[] => {
    const scheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]')
    const localEvents = JSON.parse(localStorage.getItem('calendar-events') || '[]')

    // Convert scheduled services to UnifiedEvent format with proper data validation
    const serviceEvents: UnifiedEvent[] = scheduledServices
      .filter((service: any) => service && service.id && (service.startTime || service.scheduledDate))
      .map((service: any) => {
        // Handle different time field names and formats
        let startDateTime: string
        let endDateTime: string

        if (service.startTime) {
          startDateTime = service.startTime instanceof Date ? service.startTime.toISOString() : service.startTime
        } else if (service.scheduledDate) {
          startDateTime = service.scheduledDate instanceof Date ? service.scheduledDate.toISOString() : service.scheduledDate
        } else {
          console.warn('Service missing start time:', service)
          return null
        }

        if (service.endTime) {
          endDateTime = service.endTime instanceof Date ? service.endTime.toISOString() : service.endTime
        } else {
          // Calculate end time based on duration
          const startTime = new Date(startDateTime)
          const duration = service.duration || 60
          const endTime = new Date(startTime.getTime() + (duration * 60 * 1000))
          endDateTime = endTime.toISOString()
        }

        return {
          id: service.id,
          type: 'task' as const,
          title: service.title || `${service.service || 'Service'} - ${service.clientName || service.client || 'Client'}`,
          description: service.description || service.notes || '',
          startDateTime,
          endDateTime,
          duration: service.duration || 60,
          clientName: service.client || service.clientName,
          location: service.location,
          priority: service.priority || 'medium',
          status: service.status || 'pending'
        }
      })
      .filter(Boolean) as UnifiedEvent[]

    // Validate local events and ensure they have required fields
    const validLocalEvents: UnifiedEvent[] = localEvents
      .filter((event: any) => event && event.id && event.startDateTime)

    // Combine all events and deduplicate by ID
    const allEvents = [...serviceEvents, ...validLocalEvents, ...events]
    const uniqueEvents = allEvents.filter((event, index, array) =>
      array.findIndex(e => e.id === event.id) === index
    )

    console.log(`🔥 Raw events count: scheduled=${serviceEvents.length}, local=${validLocalEvents.length}, unified=${events.length}`)
    console.log(`🔥 Total raw events: ${allEvents.length}, After deduplication: ${uniqueEvents.length}`)

    return uniqueEvents
  }, [events])

  const updateConflicts = useCallback(async () => {
    console.log(`🔥 DailyPlanner updateConflicts called`)
    const conflictsMap = new Map<string, ConflictResult>()

    // If we have active conflicts from the time manager (modal state), use those instead
    if (activeConflicts) {
      console.log(`🔥 Using active conflicts from time manager:`, activeConflicts)
      Object.entries(activeConflicts).forEach(([eventId, conflicts]) => {
        if (conflicts.hasConflicts) {
          conflictsMap.set(eventId, conflicts)
        }
      })
      console.log(`🔥 Active conflicts applied: ${conflictsMap.size}`)
      setEventConflicts(conflictsMap)
      return
    }

    // Otherwise, perform normal conflict detection
    const allEvents = getAllExistingEvents()
    console.log(`🔥 Total events for conflict detection: ${allEvents.length}`)

    for (const event of allEvents) {
      // Skip conflict detection for recently created events (temporary exclusion)
      if (excludeFromConflictDetection && excludeFromConflictDetection.has(event.id)) {
        console.log(`🔥 Skipping conflict detection for recently created event: ${event.id}`)
        continue
      }

      const otherEvents = allEvents.filter(e => e.id !== event.id)
      const conflicts = await conflictDetector.detectConflictsWithResolutions(event, otherEvents)

      if (conflicts.hasConflicts) {
        console.log(`🔥 Conflicts found for event ${event.id}: ${conflicts.conflicts.length} unresolved conflicts`)
        conflictsMap.set(event.id, conflicts)
      }
    }

    console.log(`🔥 Total conflicts detected: ${conflictsMap.size}`)
    setEventConflicts(conflictsMap)
  }, [getAllExistingEvents, activeConflicts, excludeFromConflictDetection])

  // Update event conflicts when events change
  useEffect(() => {
    updateConflicts()
  }, [updateConflicts, refreshTrigger])

  // Generate continuous event blocks for each hour
  const generateContinuousBlocks = (hourEvents: UnifiedEvent[], hour: number) => {
    return hourEvents.map(event => {
      const startTime = new Date(event.startDateTime)
      const startHour = startTime.getHours()
      const duration = event.duration || 60
      
      return (
        <ContinuousEventBlock
          key={`continuous-${event.id}`}
          event={event}
          conflicts={eventConflicts.get(event.id)}
          startHour={startHour}
          durationHours={duration / 60}
          pixelsPerHour={pixelsPerHour}
          onDragStart={() => console.log('Drag started:', event.title)}
          onDragEnd={(draggedEvent, newSlot) => {
            console.log('Continuous block dropped:', draggedEvent.title, newSlot)
            // TODO: Implement rescheduling with conflict detection
          }}
          onEventClick={(clickedEvent) => {
            handleShowEventDetails(clickedEvent)
          }}
          onConflictClick={(conflicts) => {
            if (onConflictClick) {
              onConflictClick(event, conflicts)
            } else {
              setConflictModal({ proposedEvent: event, conflicts })
            }
          }}
          showConflicts={true}
          className="mr-2"
        />
      )
    })
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
      console.log('🎯 ========== RESCHEDULE CONFIRMATION STARTED ==========')
      console.log('🎯 Starting reschedule for:', data.event.title)
      console.log('🎯 From slot:', data.fromSlot)
      console.log('🎯 To slot:', data.toSlot)
      console.log('🎯 Event ID:', data.event.id)
      console.log('🎯 Event current startDateTime:', data.event.startDateTime)
      console.log('🎯 Event current endDateTime:', data.event.endDateTime)
      console.log('🎯 Full event object:', data.event)

      // Debug: Check current events state
      console.log('🎯 Current unified events count:', events.length)
      console.log('🎯 Current unified event IDs:', events.map(e => e.id))
      const targetEvent = events.find(e => e.id === data.event.id)
      console.log('🎯 Target event found in current state:', targetEvent ? 'YES' : 'NO')
      if (targetEvent) {
        console.log('🎯 Target event details:', { id: targetEvent.id, title: targetEvent.title, startDateTime: targetEvent.startDateTime })
      }

      // Calculate new start and end times based on the new slot
      console.log('🎯 TIMEZONE DEBUG - Input data:', {
        toSlotDate: data.toSlot.date,
        toSlotHour: data.toSlot.hour,
        originalStartDateTime: data.event.startDateTime
      })

      // Parse the original event start time to preserve timezone handling
      const originalStart = new Date(data.event.startDateTime)
      const originalDuration = data.event.duration

      console.log('🎯 TIMEZONE DEBUG - Parsed original start:', {
        originalStart: originalStart.toISOString(),
        originalStartLocal: originalStart.toString(),
        originalHour: originalStart.getHours(),
        originalMinutes: originalStart.getMinutes()
      })

      // Create the new start time by preserving the date format from original event
      // but updating the hour and keeping the same timezone context
      const newStart = new Date(originalStart)

      // Parse the target date and set the new date components
      const targetDate = new Date(data.toSlot.date + 'T00:00:00')
      newStart.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
      newStart.setHours(data.toSlot.hour)
      // Keep original minutes
      newStart.setMinutes(originalStart.getMinutes())

      const newEnd = new Date(newStart.getTime() + originalDuration * 60000)

      console.log('🎯 TIMEZONE DEBUG - Calculated new times:', {
        newStart: newStart.toISOString(),
        newStartLocal: newStart.toString(),
        newEnd: newEnd.toISOString(),
        newEndLocal: newEnd.toString()
      })

      // Format dates in local timezone to avoid UTC conversion issues
      const formatToLocalISOString = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      }

      const newStartString = formatToLocalISOString(newStart)
      const newEndString = formatToLocalISOString(newEnd)

      console.log('🎯 TIMEZONE DEBUG - Formatted strings (local timezone):', {
        newStartString,
        newEndString,
        targetHour: data.toSlot.hour
      })

      const updates = {
        startDateTime: newStartString,
        endDateTime: newEndString,
        notes: data.reason ?
          `${data.event.notes || ''}

Rescheduled: ${data.reason}`.trim() :
          data.event.notes
      }

      console.log('🎯 Calculated new times:', { originalStart: data.event.startDateTime, newStart: newStartString, newEnd: newEndString })
      console.log('🎯 Calling updateEvent with updates:', updates)
      console.log('🎯 updateEvent function type:', typeof updateEvent)

      const result = await updateEvent(data.event.id, updates)
      console.log('🎯 UpdateEvent result:', result)
      console.log('🎯 UpdateEvent result type:', typeof result)

      if (result) {
        console.log('✅ Event rescheduled successfully:', data.event.title)
        console.log('✅ New event details:', { id: result.id, startDateTime: result.startDateTime, endDateTime: result.endDateTime })
        console.log('🎯 Event updated - UI should refresh automatically via useUnifiedEvents hook')
      } else {
        console.error('❌ UpdateEvent returned null/undefined')
      }

      console.log('🎯 ========== RESCHEDULE CONFIRMATION COMPLETED ==========')
      console.log('✅ Event rescheduled:', data.event.title)
      
      // Send notifications to participants if requested
      if (notifyParticipants) {
        try {
          const participants = ClientNotificationService.extractParticipants(data.event)
          
          if (participants.length > 0) {
            // Create the new event object with updated times
            const newEvent: UnifiedEvent = {
              ...data.event,
              startDateTime: typeof newStart === 'string' ? newStart : newStart.toISOString(),
              endDateTime: typeof newEnd === 'string' ? newEnd : newEnd.toISOString(),
              updatedAt: new Date().toISOString()
            }

            // Send reschedule notifications via API
            const result = await ClientNotificationService.sendRescheduleNotification({
              originalEvent: data.event,
              newEvent: newEvent as any,
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

  const handleResizeConfirm = async (data: any, notifyParticipants: boolean) => {
    try {
      console.log('🎯 ========== RESIZE CONFIRMATION STARTED ==========')
      console.log('🎯 Starting resize for:', data.event.title)
      console.log('🎯 Original start:', data.originalStart)
      console.log('🎯 Original end:', data.originalEnd)
      console.log('🎯 New start:', data.newStart)
      console.log('🎯 New end:', data.newEnd)
      console.log('🎯 Handle used:', data.handle)

      // Calculate new duration
      const duration = Math.round((new Date(data.newEnd).getTime() - new Date(data.newStart).getTime()) / (1000 * 60))
      const originalDuration = data.event.duration

      console.log('🔧 RESIZE DURATION DEBUG:', {
        eventId: data.event.id,
        eventTitle: data.event.title,
        originalDuration: originalDuration,
        newDuration: duration,
        durationChange: duration - originalDuration,
        shouldUseMultiHour: duration > 60,
        wasMultiHour: originalDuration > 60
      })

      // Update the event with new times
      const updatedEvent = await updateEvent(data.event.id, {
        startDateTime: data.newStart,
        endDateTime: data.newEnd,
        duration: duration,
        notes: data.reason ?
          `${data.event.notes || ''}

Resized: ${data.reason}`.trim() :
          data.event.notes
      })

      console.log('✅ Event resized successfully:', data.event.title)
      console.log('🎯 ========== RESIZE CONFIRMATION COMPLETED ==========')

      // Trigger UI refresh to show updated event
      if (onRefreshTrigger) {
        console.log('🔄 Triggering UI refresh after resize...')
        onRefreshTrigger()
      }

      // Send notifications to participants if requested
      if (notifyParticipants) {
        try {
          const participants = []
          if (data.event.clientName) {
            participants.push(data.event.clientName)
          }

          if (participants.length > 0) {
            console.log('📧 Sending resize notifications to:', participants)
            // TODO: Implement resize notification service
            console.log('⚠️ Resize notification service not implemented yet')
          } else {
            console.log('📧 No participants found to notify about resize')
          }
        } catch (error) {
          console.error('❌ Error sending resize notifications:', error)
        }
      }

    } catch (error) {
      console.error('❌ Error resizing event:', error)
      throw error
    }
  }

  return (
    <DragDropProvider onEventDrop={handleEventDrop} onEventResize={handleEventResize}>
    <MouseEventDebugger />
    <div ref={containerRef} className="space-y-6">
      {/* Planner Header */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-6">
            <div className="neo-card p-4">
              <div className="text-2xl font-bold text-accent font-primary">
                {stats.completedTasks}
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-primary">
                COMPLETED
              </div>
            </div>

            <div className="neo-card p-4">
              <div className="text-2xl font-bold text-foreground font-primary">
                {stats.totalTasks}
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-primary">
                TOTAL TASKS
              </div>
            </div>
          </div>

          <button
            className="neo-button-active px-6 py-3 font-bold uppercase tracking-wide font-primary text-sm flex items-center gap-2"
            onClick={() => {
              setSelectedTimeSlot('09:00') // Reset to default time
              setEditingEvent(null)
              setShowEventModal(true)
            }}
          >
            <Plus className="h-4 w-4" />
            ADD EVENT
          </button>
        </div>

        {/* Progress Bar */}
        <div className="neo-card p-4">
          <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2 font-primary">
            <span className="uppercase tracking-wide">DAILY PROGRESS</span>
            <span className="text-foreground font-bold">{Math.round(stats.completionRate)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${stats.completionRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Task Timeline */}
      <div className="grid grid-cols-12 gap-6 px-6">
        {/* Time Slots with Tasks */}
        {Array.from({ length: 24 }, (_, i) => {
          const hour = i // Show all 24 hours (0-23)
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
          const period = hour < 12 ? 'AM' : 'PM'
          
          // Check if this is the current hour
          const now = new Date()
          const isCurrentHour = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') && now.getHours() === hour
          
          // Find tasks that span this hour (not just start in this hour)
          const hourTasks = sortedTasks.filter(task => {
            try {
              const startTime = task.startTime;
              
              // All startTime should now be Date objects
              if (startTime instanceof Date && !isNaN(startTime.getTime())) {
                const startHour = startTime.getHours();
                const startMinutes = startTime.getMinutes();
                
                // Calculate end time
                const duration = ('estimatedDuration' in task ? task.estimatedDuration : 60) || 60; // Default 1 hour if no duration
                const endTime = new Date(startTime.getTime() + duration * 60000);
                const endHour = endTime.getHours();
                const endMinutes = endTime.getMinutes();
                
                // Debug hedge trimming events
                if (task.title?.toLowerCase().includes('hedge')) {
                  console.log('🌿 HOUR FILTER - Event:', task.title)
                  console.log('🌿 HOUR FILTER - Current hour being checked:', hour)
                  console.log('🌿 HOUR FILTER - Event startHour:', startHour)
                  console.log('🌿 HOUR FILTER - Event endHour:', endHour)
                  console.log('🌿 HOUR FILTER - Event duration:', duration)
                  console.log('🌿 HOUR FILTER - Date being rendered:', format(date, 'yyyy-MM-dd'))
                }

                // Check if this hour falls within the event duration
                // Event spans this hour if:
                // 1. It starts in this hour, OR
                // 2. It started in a previous hour and hasn't ended yet, OR
                // 3. It starts later in this hour but before the hour ends
                if (startHour === hour) {
                  if (task.title?.toLowerCase().includes('hedge')) {
                    console.log('🌿 HOUR FILTER - ✅ Event starts in this hour')
                  }
                  return true; // Event starts in this hour
                } else if (startHour < hour && (endHour > hour || (endHour === hour && endMinutes > 0))) {
                  if (task.title?.toLowerCase().includes('hedge')) {
                    console.log('🌿 HOUR FILTER - ✅ Event extends into this hour')
                  }
                  return true; // Event started earlier and extends into this hour
                }
                
                return false;
              }
              
              // Fallback for legacy string format (should not happen after fixes)
              const startTimeStr = startTime as unknown as string;
              if (typeof startTimeStr === 'string' && startTimeStr.includes(':')) {
                const timeParts = startTimeStr.split(':');
                const [hourStr, minuteStr = '0'] = timeParts;
                const taskHour = parseInt(hourStr, 10);
                const taskMinutes = parseInt(minuteStr, 10);

                if (isNaN(taskHour)) return false;

                // Calculate end hour for legacy format
                const duration = ('estimatedDuration' in task ? task.estimatedDuration : 60) || 60;
                const totalMinutes = taskHour * 60 + taskMinutes + duration;
                const endHour = Math.floor(totalMinutes / 60);
                
                // Check if current hour falls within the task duration
                return taskHour <= hour && hour < endHour;
              }
              
              console.warn('Invalid startTime format for task:', task.id, startTime);
              return false;
            } catch (error) {
              console.error('Error determining task hour:', error, task.id);
              return false;
            }
          });
          
          return (
            <div
              key={hour}
              ref={(el) => { timeSlotRefs.current[hour] = el; }}
              className={`col-span-12 grid grid-cols-12 gap-6 mb-3 group overflow-visible ${isCurrentHour ? 'bg-accent/10 border-l-4 border-accent' : ''}`}>
              {/* Time Column */}
              <div className="col-span-2">
                <div
                  className={`text-right cursor-pointer neo-button transition-colors p-2 rounded ${isCurrentHour ? 'neo-button-active' : ''}`}
                  onClick={() => {
                    const timeString = `${hour.toString().padStart(2, '0')}:00`
                    setSelectedTimeSlot(timeString)
                    setEditingEvent(null)
                    setShowEventModal(true)
                  }}
                  title="Click to create event at this time"
                >
                  <div className={`text-sm font-bold font-primary ${isCurrentHour ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
                    {hour.toString().padStart(2, '0')}:00
                    {isCurrentHour && <span className="ml-1 text-xs">●</span>}
                  </div>
                  <div className={`text-xs font-primary ${isCurrentHour ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
                    {displayHour} {period}
                  </div>
                </div>
              </div>
              
              {/* Events for this hour - using continuous blocks */}
              <div className="col-span-10">
                <div style={{ height: `${pixelsPerHour}px` }}>
                  <DropZone
                    date={format(date, 'yyyy-MM-dd')}
                    hour={hour}
                    isOccupied={hourTasks.length > 0}
                    events={hourTasks.filter(task => events.find(e => e.id === task.id)) as any}
                    onTimeSlotClick={(clickDate, clickHour) => {
                      const timeString = `${clickHour.toString().padStart(2, '0')}:00`
                      setSelectedTimeSlot(timeString)
                      setEditingEvent(null)
                      setShowEventModal(true)
                    }}
                    className="relative"
                  >
                  {/* Events for this hour - display continuous blocks only at start hour */}
                  {hourTasks.length > 0 ? (
                    <div className="space-y-2 overflow-visible">
                      {hourTasks.map(task => {
                        const unifiedEvent = events.find(e => e.id === task.id)
                        if (unifiedEvent) {
                          const eventStartTime = new Date(unifiedEvent.startDateTime)
                          const eventStartHour = eventStartTime.getHours()
                          let eventDuration = unifiedEvent.duration || 60

                          // Calculate duration from start/end times if available
                          if (unifiedEvent.endDateTime) {
                            const startTime = new Date(unifiedEvent.startDateTime)
                            const endTime = new Date(unifiedEvent.endDateTime)

                            // Add validation for hedge trimming events
                            if (unifiedEvent.title?.toLowerCase().includes('hedge')) {
                              console.log(`🌿 DURATION DEBUG - Validating times for "${unifiedEvent.title}":`, {
                                startDateTime: unifiedEvent.startDateTime,
                                endDateTime: unifiedEvent.endDateTime,
                                parsedStart: startTime,
                                parsedEnd: endTime,
                                isStartValid: !isNaN(startTime.getTime()),
                                isEndValid: !isNaN(endTime.getTime()),
                                dateBeingRendered: format(date, 'yyyy-MM-dd'),
                                startsOnRenderDate: format(startTime, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                              })
                            }
                            const calculatedDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

                            console.log(`🔍 DURATION CALCULATION for "${unifiedEvent.title}":`, {
                              storedDuration: unifiedEvent.duration,
                              calculatedFromTimes: calculatedDuration,
                              startDateTime: unifiedEvent.startDateTime,
                              endDateTime: unifiedEvent.endDateTime,
                              willUse: Math.max(eventDuration, calculatedDuration),
                              startTimeObj: startTime,
                              endTimeObj: endTime,
                              timeDiff: endTime.getTime() - startTime.getTime(),
                              timeDiffHours: (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60),
                              eventId: unifiedEvent.id
                            })

                            // Fix: Only use calculated duration if it's reasonable and different from stored duration
                            // Avoid using calculated duration if it's drastically different (likely timezone/date parsing issues)
                            const durationDiff = Math.abs(calculatedDuration - unifiedEvent.duration)
                            const isCalculatedReasonable = calculatedDuration >= 15 && calculatedDuration <= 1440 // 15 min to 24 hours
                            const isDifferenceReasonable = durationDiff <= unifiedEvent.duration * 2 // Not more than double

                            if (isCalculatedReasonable && isDifferenceReasonable) {
                              eventDuration = Math.max(eventDuration, calculatedDuration)
                              console.log(`✅ Using calculated duration: ${calculatedDuration} minutes`)
                            } else {
                              console.log(`⚠️ Ignoring calculated duration due to inconsistency:`, {
                                stored: unifiedEvent.duration,
                                calculated: calculatedDuration,
                                diff: durationDiff,
                                reasonable: isCalculatedReasonable,
                                diffReasonable: isDifferenceReasonable
                              })
                              // Keep the stored duration
                            }
                          }

                          // Debug logging for event positioning
                          if (eventStartHour === hour) {
                            console.log(`🔥 EVENT POSITIONING - Rendering event "${unifiedEvent.title}" at hour ${hour}`, {
                              startHour: eventStartHour,
                              duration: eventDuration,
                              durationHours: eventDuration / 60,
                              isMultiHour: eventDuration > 60,
                              eventData: {
                                startDateTime: unifiedEvent.startDateTime,
                                endDateTime: unifiedEvent.endDateTime,
                                duration: unifiedEvent.duration
                              }
                            })
                          }

                          // Only render the event in its starting hour as a continuous block
                          // Use more robust logic to determine if it's truly a multi-hour event
                          const isActuallyMultiHour = eventDuration > 90 && eventDuration <= 1440 // More than 1.5 hours, less than 24 hours
                          const startsThisHour = eventStartHour === hour

                          if (startsThisHour && isActuallyMultiHour) {
                            console.log(`🔧 RENDERING MULTI-HOUR EVENT: "${unifiedEvent.title}" (${eventDuration}min) as ContinuousEventBlock`);
                            return (
                              <ContinuousEventBlock
                                key={`continuous-${unifiedEvent.id}`}
                                event={unifiedEvent}
                                conflicts={eventConflicts.get(unifiedEvent.id)}
                                conflictingEvents={eventConflictTabs.get(unifiedEvent.id) || []}
                                startHour={eventStartHour}
                                durationHours={eventDuration / 60}
                                pixelsPerHour={pixelsPerHour}
                                onEventClick={(clickedEvent) => {
                                  handleShowEventDetails(clickedEvent)
                                }}
                                onConflictClick={(conflicts) => {
                                  if (onConflictClick) {
                                    onConflictClick(unifiedEvent, conflicts)
                                  } else {
                                    setConflictModal({ proposedEvent: unifiedEvent, conflicts })
                                  }
                                }}
                                onResizeStart={(event, handle) => {
                                  console.log('ContinuousEventBlock resize started:', event.title, handle)
                                }}
                                onResizeEnd={async (event, newStart, newEnd) => {
                                  console.log('🎯 ContinuousEventBlock resize ended - showing confirmation modal:', event.title, newStart, newEnd)

                                  // Determine which handle was used
                                  const originalStart = event.startDateTime
                                  const originalEnd = event.endDateTime || new Date(new Date(event.startDateTime).getTime() + event.duration * 60000).toISOString().slice(0, 19)

                                  const handle = originalStart !== newStart ? 'top' : 'bottom'

                                  // Show resize confirmation modal
                                  setResizeData({
                                    event,
                                    originalStart,
                                    originalEnd,
                                    newStart,
                                    newEnd,
                                    handle
                                  })
                                  setShowResizeModal(true)
                                }}
                              />
                            )
                          } else if (eventStartHour === hour) {
                            // Single hour event - render normally
                            console.log(`🔧 RENDERING SINGLE-HOUR EVENT: "${unifiedEvent.title}" (${eventDuration}min) as DragAndDropEvent`);
                            return (
                              <DragAndDropEvent
                                key={task.id}
                                event={unifiedEvent}
                                conflicts={eventConflicts.get(unifiedEvent.id)}
                                conflictingEvents={eventConflictTabs.get(unifiedEvent.id) || []}
                                currentDate={format(date, 'yyyy-MM-dd')}
                                currentHour={hour}
                                pixelsPerHour={pixelsPerHour}
                                onClick={(event) => handleShowEventDetails(event)}
                                onConflictClick={(conflicts) => {
                                  if (onConflictClick) {
                                    onConflictClick(unifiedEvent, conflicts)
                                  } else {
                                    setConflictModal({ proposedEvent: unifiedEvent, conflicts })
                                  }
                                }}
                                onDragStart={(dragData) => {
                                  console.log('Drag started:', dragData.event.title)
                                }}
                                onDragEnd={async (dragData, dropZone) => {
                                  if (dropZone) {
                                    console.log('🎯 Event dropped:', dragData.event.title, 'from', dragData.originalSlot, 'to', dropZone)
                                    console.log('🎯 Drag event data:', dragData.event)

                                    // Prepare reschedule data
                                    const rescheduleData: RescheduleData = {
                                      event: dragData.event,
                                      fromSlot: {
                                        date: dragData.originalSlot.date,
                                        hour: dragData.originalSlot.hour
                                      },
                                      toSlot: {
                                        date: dropZone.date,
                                        hour: dropZone.hour
                                      }
                                    }

                                    console.log('🎯 Reschedule data prepared:', rescheduleData)
                                    console.log('🎯 Setting reschedule modal data and showing modal')
                                    setRescheduleData(rescheduleData)
                                    setShowRescheduleModal(true)
                                    console.log('🎯 Modal should now be visible - showRescheduleModal set to true')
                                  }
                                }}
                                onResizeStart={(event, handle) => {
                                  console.log('Resize started:', event.title, handle)
                                }}
                                onResizeEnd={async (event, newStart, newEnd) => {
                                  console.log('🎯 Resize ended - showing confirmation modal:', event.title, newStart, newEnd)

                                  // Determine which handle was used
                                  const originalStart = event.startDateTime
                                  const originalEnd = event.endDateTime || new Date(new Date(event.startDateTime).getTime() + event.duration * 60000).toISOString().slice(0, 19)

                                  const handle = originalStart !== newStart ? 'top' : 'bottom'

                                  // Show resize confirmation modal
                                  setResizeData({
                                    event,
                                    originalStart,
                                    originalEnd,
                                    newStart,
                                    newEnd,
                                    handle
                                  })
                                  setShowResizeModal(true)
                                }}
                                showResizeHandles={true}
                                className="mb-2"
                              />
                            )
                          } else {
                            // This is a continuation hour - don't render anything
                            return null
                          }
                        } else {
                          // Render legacy task block for non-unified events
                          return (
                            <TaskBlock 
                              key={task.id} 
                              task={task} 
                              onEdit={handleEditEvent}
                              onStatusChange={handleStatusChange}
                              onView={handleShowEventDetails}
                              onDelete={handleDeleteEvent}
                            />
                          )
                        }
                      }).filter(Boolean)}
                    </div>
                  ) : null}
                </DropZone>
                </div>
              </div>
            </div>
          )
        })}
        
        {/* Show message if no tasks at all - but only if we're not loading events */}
        {sortedTasks.length === 0 && !eventsLoading && (
          <div className="col-span-12 text-center py-12">
            <div className="text-medium-grey font-primary">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium uppercase tracking-wide">NO TASKS SCHEDULED</p>
              <p className="text-sm mt-2">Click on any time slot to add your first task</p>
            </div>
          </div>
        )}
      </div>
    </div>
    
    {/* Drag Visual Feedback */}
    <DragVisualFeedback containerRef={containerRef as React.RefObject<HTMLElement>} />
    
    {/* Event Creation Modal */}
    <EventCreationModal
      isOpen={showEventModal}
      onClose={() => {
        setShowEventModal(false)
        setEditingEvent(null)
      }}
      onSave={handleSaveEvent}
      initialDate={date}
      initialTime={selectedTimeSlot}
      editingEvent={editingEvent || undefined}
    />
    
    {/* Conflict Resolution Modal */}
    {conflictModal && (
      <ConflictResolutionModal
        isOpen={true}
        proposedEvent={conflictModal.proposedEvent}
        conflicts={conflictModal.conflicts}
        onAcceptConflict={handleAcceptConflict}
        onDeleteEvent={handleConflictDeleteEvent}
        onRescheduleEvent={handleRescheduleEvent}
        onAcceptSave={handleConflictAcceptSave}
        onCancel={() => setConflictModal(null)}
        onClose={() => setConflictModal(null)}
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

    {/* Resize Confirmation Modal */}
    <ResizeConfirmationModal
      isOpen={showResizeModal}
      onClose={() => {
        setShowResizeModal(false)
        setResizeData(null)
      }}
      onConfirm={handleResizeConfirm}
      resizeData={resizeData}
    />


    {/* Debug Panel - only in development */}
    {process.env.NODE_ENV === 'development' && <DebugPanel />}
    </DragDropProvider>
  )
}

interface TaskBlockProps {
  task: DailyTask
  onEdit: (task: DailyTask) => void
  onStatusChange: (taskId: string, status: DailyTask['status']) => void
  onView?: (event: UnifiedEvent) => void
  onDelete?: (taskId: string) => void
}

const TaskBlock: React.FC<TaskBlockProps> = ({ task, onEdit, onStatusChange, onView, onDelete }) => {
  const priorityConfig = PRIORITY_CONFIGS[task.priority]
  const statusConfig = STATUS_CONFIGS[task.status]

  const convertTaskToEvent = (task: DailyTask): UnifiedEvent => {
    const startDate = task.startTime instanceof Date ? task.startTime : new Date(task.startTime)
    const endDate = task.endTime instanceof Date ? task.endTime : new Date(task.endTime)
    
    return {
      id: task.id,
      type: 'task' as const,
      title: task.title,
      description: task.description,
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
      duration: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)),
      priority: task.priority,
      clientId: task.clientId,
      location: task.location,
      notes: task.notes,
      status: task.status,
      createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : new Date().toISOString()
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons
    if (e.target instanceof Element && (
      e.target.closest('button') || 
      e.target.tagName === 'BUTTON'
    )) {
      return
    }
    
    if (onView) {
      onView(convertTaskToEvent(task))
    }
  }

  return (
    <Card
      data-event-block="true"
      className={`border-l-4 ${getStatusColorClass(task.status)} hover:bg-hud-background-secondary transition-colors cursor-pointer`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="font-bold text-hud-text-primary font-primary">{task.title}</h4>
              <Badge className={`px-2 py-1 text-xs font-bold text-white uppercase ${getPriorityColorClass(task.priority)}`}>
                {priorityConfig.label}
              </Badge>
              {task.serviceType && (
                <Badge variant="outline" className="text-xs text-medium-grey uppercase tracking-wider font-primary">
                  {task.serviceType.replace('_', ' ')}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-medium-grey font-primary mb-2">
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(task.startTime)} - {formatTime(task.endTime)}
              </span>
              {task.location && (
                <span className="flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {task.location}
                </span>
              )}
              {task.clientId && (
                <span className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  Client
                </span>
              )}
            </div>
            
            {task.description && (
              <p className="text-sm text-medium-grey font-primary">{task.description}</p>
            )}
            
            {task.notes && (
              <p className="text-xs text-medium-grey font-primary mt-2 italic">
                Note: {task.notes}
              </p>
            )}
          </div>
          
          <div className="flex items-center ml-4">
            <DropdownMenu
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto text-medium-grey hover:text-hud-text-primary hover:bg-tactical-gold-light"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              }
              items={[
                {
                  label: 'Edit',
                  onClick: () => onEdit(task),
                  icon: <Edit className="h-3 w-3" />
                },
                {
                  label: task.status === 'completed' ? 'Mark Pending' : 'Mark Done',
                  onClick: () => {
                    console.log('TaskBlock status change clicked:', task.id, task.status === 'completed' ? 'pending' : 'completed')
                    onStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')
                  },
                  icon: <CheckCircle className="h-3 w-3" />
                },
                ...(onDelete ? [{
                  label: 'Delete',
                  onClick: () => onDelete(task.id),
                  icon: <Trash2 className="h-3 w-3" />,
                  variant: 'destructive' as const
                }] : [])
              ]}
              align="right"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DailyPlanner
