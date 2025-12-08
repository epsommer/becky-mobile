"use client"

import React, { useState, Suspense } from 'react'
import CRMLayout from '@/components/CRMLayout'
import DailyPlanner from '@/components/DailyPlanner'
import ScheduleCalendar from '@/components/ScheduleCalendar'
import TimeManagerNavigation from '@/components/TimeManagerNavigation'
import WeekView from '@/components/WeekView'
import YearView from '@/components/YearView'
import AgendaView from '@/components/AgendaView'
import EnhancedMissionObjectives from '@/components/EnhancedMissionObjectives'
import EventCreationModal, { UnifiedEvent } from '@/components/EventCreationModal'
import EventDetailsModal from '@/components/EventDetailsModal'
import ConflictResolutionModal from '@/components/ConflictResolutionModal'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'
import { ViewManagerProvider, useViewManager } from '@/contexts/ViewManagerContext'
import { CalendarEvent } from '@/types/scheduling'
import { conflictDetector, ConflictResult, ResolutionStrategy } from '@/lib/conflict-detector'

const TimeManagerContent = () => {
  const { state, setCurrentView, setSelectedDate } = useViewManager()
  const [syncedEvents, setSyncedEvents] = useState<CalendarEvent[]>([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [modalInitialDate, setModalInitialDate] = useState<Date>(new Date())
  const [modalInitialTime, setModalInitialTime] = useState<string>('09:00')
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Conflict resolution state
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [pendingEvent, setPendingEvent] = useState<UnifiedEvent | null>(null)
  const [conflicts, setConflicts] = useState<ConflictResult | null>(null)
  const [recentlyCreatedEvents, setRecentlyCreatedEvents] = useState<Set<string>>(new Set())
  
  // Use unified events hook for global event management
  const { createEvent, updateEvent, deleteEvent } = useUnifiedEvents({
    refreshTrigger
  })


  // Helper function to get all existing events for conflict detection
  const getAllExistingEvents = (): UnifiedEvent[] => {
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
    const allEvents = [...serviceEvents, ...validLocalEvents]
    const uniqueEvents = allEvents.filter((event, index, array) =>
      array.findIndex(e => e.id === event.id) === index
    )

    console.log(`🔥 TimeManager - Raw events: scheduled=${serviceEvents.length}, local=${validLocalEvents.length}`)
    console.log(`🔥 TimeManager - Total raw: ${allEvents.length}, After deduplication: ${uniqueEvents.length}`)

    return uniqueEvents
  }

  // Global event handlers for all calendar views
  const handleEventCreate = async (eventData: UnifiedEvent) => {
    try {
      const isEditing = editingEvent !== null

      if (isEditing) {
        // Update existing event
        console.log(`🔄 Updating existing event: ${eventData.title} (ID: ${eventData.id})`)
        await updateEvent(eventData.id, eventData)
        setShowEventModal(false)
        setEditingEvent(null)
        setRefreshTrigger(prev => prev + 1) // Force UI refresh after update
        console.log('✅ Event updated:', eventData.title)
        return
      }

      // Check for conflicts before creating new event (using enhanced detection with database persistence)
      const existingEvents = getAllExistingEvents()
      console.log(`🔥🔥🔥 ========== ENHANCED CONFLICT DETECTION ==========`)
      console.log(`🔥 Event being created: ${eventData.title}`)
      console.log(`🔥 Existing events count: ${existingEvents.length}`)
      const conflictResult = await conflictDetector.detectConflictsWithResolutions(eventData, existingEvents)
      console.log(`🔥 Conflicts found after filtering resolved: ${conflictResult.conflicts.length}`)
      conflictResult.conflicts.forEach((conflict, index) => {
        console.log(`🔥 Unresolved conflict ${index + 1}: ${conflict.message} (ID: ${conflict.id})`)
      })
      console.log(`🔥🔥🔥 ========== END ENHANCED CONFLICT DETECTION ==========`)

      if (conflictResult.hasConflicts) {
        // Show conflict resolution modal
        setPendingEvent(eventData)
        setConflicts(conflictResult)
        setShowConflictModal(true)
        setShowEventModal(false)
      } else {
        // No conflicts, create event directly
        await createEvent(eventData)
        setShowEventModal(false)
        console.log('✅ Event created:', eventData.title)

        // Trigger refresh of all calendar views
        setRefreshTrigger(prev => prev + 1)
      }
    } catch (error) {
      console.error('❌ Error creating/updating event:', error)
    }
  }

  const handleEventEdit = (event: UnifiedEvent) => {
    setEditingEvent(event)
    setShowEventModal(true)
  }

  const handleEventView = (event: UnifiedEvent) => {
    setSelectedEvent(event)
    setShowDetailsModal(true)
  }

  const handleEventDelete = async (eventId: string) => {
    try {
      await deleteEvent(eventId)
      setShowDetailsModal(false)
      setRefreshTrigger(prev => prev + 1) // Force UI refresh after deletion
      console.log('✅ Event deleted:', eventId)
    } catch (error) {
      console.error('❌ Error deleting event:', error)
    }
  }

  const handleEditFromDetails = (event: UnifiedEvent) => {
    setShowDetailsModal(false)
    setEditingEvent(event)
    setShowEventModal(true)
  }

  const handleTaskEdit = (task: any) => {
    if ('startTime' in task && 'endTime' in task) {
      const startDate = task.startTime instanceof Date ? task.startTime : new Date(task.startTime)
      const endDate = task.endTime instanceof Date ? task.endTime : new Date(task.endTime)
      
      const event: UnifiedEvent = {
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setEditingEvent(event)
      setShowEventModal(true)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteEvent(taskId)
      setRefreshTrigger(prev => prev + 1) // Force UI refresh after deletion
      console.log('✅ Task deleted:', taskId)
    } catch (error) {
      console.error('❌ Error deleting task:', error)
    }
  }

  const handleTaskStatusChange = async (taskId: string, status: string) => {
    try {
      console.log('TimeManager handleTaskStatusChange called:', taskId, 'to', status)
      
      // Since we need to update the full event, we need to get the current event first
      // For now, let's update the localStorage directly for scheduled services
      const scheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]')
      console.log('Current scheduled services:', scheduledServices)
      console.log('Looking for service with ID:', taskId)
      
      const updatedServices = scheduledServices.map((service: any) => {
        if (service.id === taskId) {
          console.log('Found service to update:', service)
          console.log('Updating status from', service.status, 'to', status)
          return { ...service, status }
        }
        return service
      })
      
      localStorage.setItem('scheduled-services', JSON.stringify(updatedServices))
      console.log('✅ Event status updated:', taskId, 'to', status)
      
      // Trigger a refresh of components that depend on scheduled services
      setRefreshTrigger(prev => prev + 1)
      
    } catch (error) {
      console.error('❌ Error updating event status:', error)
    }
  }

  const handleTimeSlotClick = (date: Date, hour?: number) => {
    setModalInitialDate(date)
    setModalInitialTime(hour ? `${hour.toString().padStart(2, '0')}:00` : '09:00')
    setEditingEvent(null)
    setShowEventModal(true)
  }

  // Conflict resolution handlers
  const handleAcceptConflict = async (conflictId: string) => {
    console.log(`🔥🔥🔥 ========== ACCEPTING CONFLICT ==========`)
    console.log(`🔥 Conflict ID being accepted: ${conflictId}`)
    console.log(`🔥 Pending event: ${pendingEvent?.title}`)
    console.log(`🔥 Current conflicts count: ${conflicts?.conflicts.length}`)

    // Just remove this specific conflict from the modal, but don't create the event yet
    // The user should resolve all conflicts before the event is created
    if (conflicts && pendingEvent) {
      const conflictBeingAccepted = conflicts.conflicts.find(c => c.id === conflictId)
      console.log(`🔥 Conflict being accepted details:`, {
        id: conflictBeingAccepted?.id,
        type: conflictBeingAccepted?.type,
        message: conflictBeingAccepted?.message,
        conflictingEventTitle: conflictBeingAccepted?.conflictingEvent?.title,
        conflictingEventId: conflictBeingAccepted?.conflictingEvent?.id
      })

      const updatedConflicts = {
        ...conflicts,
        conflicts: conflicts.conflicts.filter(c => c.id !== conflictId)
      }
      setConflicts(updatedConflicts)

      // Conflict resolution is now handled by database persistence via server actions
      console.log(`✅ Conflict ${conflictId} accepted and will be persisted via database`)

      console.log(`✅ Conflict ${conflictId} accepted. Remaining conflicts: ${updatedConflicts.conflicts.length}`)
      console.log(`🔥 Remaining conflict IDs: ${updatedConflicts.conflicts.map(c => c.id).join(', ')}`)
      console.log(`🔥🔥🔥 ========== END ACCEPTING CONFLICT ==========`)
    }
  }

  const handleDeleteEvent = async (conflictId: string, eventId: string) => {
    try {
      console.log(`🔥🔥🔥 ========== DELETING EVENT ==========`)
      console.log(`🗑️ TimeManager handleDeleteEvent called with conflictId: ${conflictId}, eventId: ${eventId}`)
      console.log(`🔥 Event being deleted: ${eventId}`)
      console.log(`🔥 Conflict causing deletion: ${conflictId}`)
      console.log(`🔥 deleteEvent function:`, deleteEvent)
      console.log(`🔥 About to call deleteEvent with eventId: ${eventId}`)

      // Try deleting from unified events first
      const result = await deleteEvent(eventId)
      console.log(`🔥 deleteEvent returned:`, result)

      // Also try deleting from legacy localStorage systems
      let deletedFromLegacy = false

      // Try deleting from scheduled-services
      const scheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]')
      const filteredScheduledServices = scheduledServices.filter((service: any) => service.id !== eventId)
      if (filteredScheduledServices.length < scheduledServices.length) {
        localStorage.setItem('scheduled-services', JSON.stringify(filteredScheduledServices))
        deletedFromLegacy = true
        console.log(`🔥 Deleted from scheduled-services: ${eventId}`)
      }

      // Try deleting from calendar-events
      const calendarEvents = JSON.parse(localStorage.getItem('calendar-events') || '[]')
      const filteredCalendarEvents = calendarEvents.filter((event: any) => event.id !== eventId)
      if (filteredCalendarEvents.length < calendarEvents.length) {
        localStorage.setItem('calendar-events', JSON.stringify(filteredCalendarEvents))
        deletedFromLegacy = true
        console.log(`🔥 Deleted from calendar-events: ${eventId}`)
      }

      if (result || deletedFromLegacy) {
        console.log(`✅ Successfully deleted event: ${eventId} (unified: ${result}, legacy: ${deletedFromLegacy})`)
      } else {
        console.warn(`⚠️  Event ${eventId} not found in any storage system`)
      }

      // Recalculate conflicts for the modal after deletion
      if (pendingEvent) {
        console.log(`🔥 Recalculating conflicts for pending event: ${pendingEvent.title}`)
        const updatedExistingEvents = getAllExistingEvents()
        console.log(`🔥 Updated existing events count: ${updatedExistingEvents.length}`)

        console.log(`🔥🔥🔥 ========== RE-DETECTION AFTER DELETE ==========`)
        console.log(`🔥 Pending event: ${pendingEvent.title}`)
        console.log(`🔥 Updated existing events count: ${updatedExistingEvents.length}`)
        console.log(`🔥 Current conflicts before re-detection: ${conflicts?.conflicts.length}`)
        console.log(`🔥 Current conflict IDs: ${conflicts?.conflicts.map(c => c.id).join(', ')}`)

        const freshConflictResult = conflictDetector.detectConflicts(pendingEvent, updatedExistingEvents)
        console.log(`🔥 Fresh conflict detection found: ${freshConflictResult.conflicts.length} conflicts`)
        freshConflictResult.conflicts.forEach((conflict, index) => {
          console.log(`🔥 Fresh conflict ${index + 1}: ${conflict.message} (ID: ${conflict.id})`)
        })

        // Keep track of previously accepted conflicts by comparing with current conflicts state
        const currentConflictIds = conflicts?.conflicts.map(c => c.id) || []
        const originalConflictIds = conflictDetector.detectConflicts(pendingEvent, getAllExistingEvents()).conflicts.map(c => c.id)
        const acceptedConflictIds = originalConflictIds.filter(id => !currentConflictIds.includes(id))

        console.log(`🔥 Current conflict IDs in state: ${currentConflictIds.join(', ')}`)
        console.log(`🔥 Original conflict IDs (full re-detection): ${originalConflictIds.join(', ')}`)
        console.log(`🔥 Calculated accepted conflict IDs: ${acceptedConflictIds.join(', ')}`)

        // Filter out conflicts that were previously accepted (mainly business rules)
        const filteredConflicts = freshConflictResult.conflicts.filter(conflict => {
          const isAccepted = acceptedConflictIds.includes(conflict.id)
          console.log(`🔥 Filtering conflict ${conflict.id} (${conflict.message}): accepted=${isAccepted}`)
          return !isAccepted
        })

        const updatedConflictResult = {
          ...freshConflictResult,
          conflicts: filteredConflicts,
          hasConflicts: filteredConflicts.length > 0
        }

        console.log(`🔥 After filtering accepted conflicts: ${updatedConflictResult.conflicts.length} remaining`)

        // Log the remaining conflicts
        updatedConflictResult.conflicts.forEach((conflict, index) => {
          console.log(`🔥 Final remaining conflict ${index + 1}: ${conflict.message} (ID: ${conflict.id})`)
        })

        setConflicts(updatedConflictResult)
        console.log(`🔥🔥🔥 ========== END RE-DETECTION AFTER DELETE ==========`)
      }

      // Force refresh to update conflict indicators and calendar
      console.log(`🔥 Setting refresh trigger`)
      setRefreshTrigger(prev => prev + 1)
      console.log(`🔥🔥🔥 ========== END DELETING EVENT ==========`)

      // DO NOT auto-create the pending event after deletion
      // The user should manually close the modal and create the event when all conflicts are resolved
      console.log(`🔥 Skipping auto-creation of pending event to allow user to resolve remaining conflicts`)
    } catch (error) {
      console.error(`❌ Failed to delete event ${eventId}:`, error)
    }
  }

  const handleRescheduleEvent = async (conflictId: string, eventId: string) => {
    console.log(`📅 Rescheduling event: ${eventId} for conflict: ${conflictId}`)
    // TODO: Implement rescheduling logic - for now just create the pending event
    if (pendingEvent) {
      await createEvent(pendingEvent)
      console.log('✅ Event created, modal remains open for additional actions')

      // Force refresh to update conflict indicators and calendar views
      setRefreshTrigger(prev => prev + 1)
    }
  }

  const handleConflictAcceptSave = async () => {
    console.log(`🔥🔥🔥 ========== CONFLICT MODAL ACCEPT/SAVE ==========`)
    console.log(`🔥 Accepting/Saving conflict resolution`)
    console.log(`🔥 Current pending event: ${pendingEvent?.title}`)
    console.log(`🔥 Current conflicts: ${conflicts?.conflicts.length}`)

    // Check if there are any remaining conflicts
    if (conflicts && conflicts.conflicts.length === 0 && pendingEvent) {
      // No remaining conflicts - create the event
      console.log(`✅ No remaining conflicts. Creating pending event: ${pendingEvent.title}`)
      try {
        const createdEvent = await createEvent(pendingEvent)
        console.log(`✅ Event "${pendingEvent.title}" created successfully`)

        // Track this event as recently created to prevent immediate conflict re-detection
        if (createdEvent && createdEvent.id) {
          console.log(`🔥 Adding event ${createdEvent.id} to recently created events exclusion list`)
          setRecentlyCreatedEvents(prev => new Set([...prev, createdEvent.id]))

          // Conflict resolution is now managed by database persistence

          // Remove from exclusion list after 5 seconds
          setTimeout(() => {
            console.log(`🔥 Removing event ${createdEvent.id} from recently created events exclusion list`)
            setRecentlyCreatedEvents(prev => {
              const newSet = new Set(prev)
              newSet.delete(createdEvent.id)
              return newSet
            })
          }, 5000)
        }

        // Trigger refresh of all calendar views
        setRefreshTrigger(prev => prev + 1)

        // Close the modal after successful creation
        setShowConflictModal(false)
        setPendingEvent(null)
        setConflicts(null)
      } catch (error) {
        console.error(`❌ Failed to create pending event:`, error)
      }
    } else if (conflicts && conflicts.conflicts.length > 0) {
      console.log(`⚠️  Cannot save event. ${conflicts.conflicts.length} unresolved conflicts remaining.`)
      // Don't close modal, user needs to resolve remaining conflicts
    }

    console.log(`🔥🔥🔥 ========== END CONFLICT MODAL ACCEPT/SAVE ==========`)
  }

  const handleConflictCancel = async () => {
    console.log(`🔥🔥🔥 ========== CONFLICT MODAL CANCEL ==========`)
    console.log(`🔥 Canceling conflict modal`)
    console.log(`🔥 Current pending event: ${pendingEvent?.title}`)
    console.log(`🔥 Current conflicts: ${conflicts?.conflicts.length}`)

    // Just close the modal without creating events
    // Event creation should be handled by separate "Save" action
    console.log(`🔥 Closing conflict modal - no automatic event creation`)

    setShowConflictModal(false)
    setPendingEvent(null)
    setConflicts(null)
    console.log(`🔥🔥🔥 ========== END CONFLICT MODAL CANCEL ==========`)
  }

  const handleExistingEventConflictClick = (event: UnifiedEvent, conflicts: ConflictResult) => {
    console.log(`🔥🔥🔥 ========== EXISTING EVENT CONFLICT CLICK ==========`)
    console.log(`🔥 Event clicked: ${event.title}`)
    console.log(`🔥 Event ID: ${event.id}`)
    console.log(`🔥 Conflicts passed in: ${conflicts.conflicts.length}`)
    conflicts.conflicts.forEach((conflict, index) => {
      console.log(`🔥 Existing event conflict ${index + 1}: ${conflict.message} (ID: ${conflict.id})`)
    })
    console.log(`🔥 This will REPLACE current conflicts state!`)
    console.log(`🔥 Current pending event: ${pendingEvent?.title}`)
    console.log(`🔥 Current conflicts count: ${conflicts?.conflicts.length}`)

    setPendingEvent(event)
    setConflicts(conflicts)
    setShowConflictModal(true)
    console.log(`🔥🔥🔥 ========== END EXISTING EVENT CONFLICT CLICK ==========`)
  }

  const handleDayClick = (date: Date) => {
    // Navigate to daily view for the selected date
    setSelectedDate(date)
    setCurrentView('day')
  }

  const renderCurrentView = () => {
    switch (state.currentView) {
      case 'day':
        return <DailyPlanner
          date={state.selectedDate}
          onEventView={handleEventView}
          refreshTrigger={refreshTrigger}
          onRefreshTrigger={() => setRefreshTrigger(prev => prev + 1)}
          onTaskStatusChange={handleTaskStatusChange}
          onConflictClick={handleExistingEventConflictClick}
          activeConflicts={pendingEvent && conflicts ? { [pendingEvent.id]: conflicts } : undefined}
          excludeFromConflictDetection={recentlyCreatedEvents}
        />
      case 'week':
        return (
          <WeekView 
            onTaskClick={(task) => {
              // Convert task to UnifiedEvent and show details
              if ('startTime' in task && 'endTime' in task) {
                const startDate = task.startTime instanceof Date ? task.startTime : new Date(task.startTime)
                const endDate = task.endTime instanceof Date ? task.endTime : new Date(task.endTime)
                
                const event: UnifiedEvent = {
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
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
                handleEventView(event)
              }
            }}
            onTimeSlotClick={handleTimeSlotClick}
            enableEventCreation={true}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
            onTaskStatusChange={handleTaskStatusChange}
            onDayNavigation={handleDayClick}
            refreshTrigger={refreshTrigger}
          />
        )
      case 'month':
        return (
          <ScheduleCalendar 
            selectedDate={state.selectedDate} 
            enableEditing={true}
            onDayClick={handleDayClick}
            onEventEdit={handleEventEdit}
            onEventView={handleEventView}
            onEventDelete={handleTaskDelete}
            onEventStatusChange={handleTaskStatusChange}
            refreshTrigger={refreshTrigger}
          />
        )
      case 'year':
        return (
          <YearView
            onMonthClick={(date) => console.log('Month clicked:', date)}
            onDayClick={handleDayClick}
            refreshTrigger={refreshTrigger}
          />
        )
      case 'agenda':
        return (
          <AgendaView 
            onItemClick={(item) => console.log('Agenda item clicked:', item)}
            onEventView={handleEventView}
            onAddEvent={() => {
              setModalInitialDate(state.selectedDate)
              setModalInitialTime('09:00')
              setEditingEvent(null)
              setShowEventModal(true)
            }}
            viewRange="week"
            refreshTrigger={refreshTrigger}
          />
        )
      case 'objectives':
        return (
          <EnhancedMissionObjectives
            date={state.selectedDate}
            onObjectiveComplete={(objective) => {
              console.log('Objective completed:', objective)
            }}
            onObjectiveCreate={(objective) => {
              console.log('Objective created:', objective)
            }}
          />
        )
      default:
        return <DailyPlanner
          date={state.selectedDate}
          onRefreshTrigger={() => setRefreshTrigger(prev => prev + 1)}
          excludeFromConflictDetection={recentlyCreatedEvents}
        />
    }
  }

  return (
    <CRMLayout>
      <div>
        <TimeManagerNavigation showTitle={true} />
        <div className="p-6">
          {renderCurrentView()}
        </div>
        
        {/* Global Event Creation Modal */}
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
        
        {/* Event Details Modal */}
        <EventDetailsModal
          event={selectedEvent}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedEvent(null)
          }}
          onEdit={handleEditFromDetails}
          onDelete={handleEventDelete}
        />

        {/* Conflict Resolution Modal */}
        {pendingEvent && conflicts && (
          <ConflictResolutionModal
            isOpen={showConflictModal}
            proposedEvent={pendingEvent}
            conflicts={conflicts}
            onAcceptConflict={handleAcceptConflict}
            onDeleteEvent={handleDeleteEvent}
            onRescheduleEvent={handleRescheduleEvent}
            onAcceptSave={handleConflictAcceptSave}
            onCancel={handleConflictCancel}
            onClose={handleConflictCancel}
          />
        )}
      </div>
    </CRMLayout>
  )
}

const TimeManagerPage = () => {
  return (
    <Suspense fallback={
      <CRMLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-hud-border-accent border-t-transparent mx-auto mb-4"></div>
            <p className="text-medium-grey font-primary uppercase tracking-wide">Loading Time Manager...</p>
          </div>
        </div>
      </CRMLayout>
    }>
      <ViewManagerProvider>
        <TimeManagerContent />
      </ViewManagerProvider>
    </Suspense>
  )
}

export default TimeManagerPage
