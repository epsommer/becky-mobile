// React Hook for Unified Events Management

import { useState, useEffect, useCallback } from 'react'
import { UnifiedEventsManager } from '@/lib/unified-events'
import type { UnifiedEvent, EventType, Priority, GoalTimeframe } from '@/components/EventCreationModal'

interface UseUnifiedEventsOptions {
  autoLoad?: boolean
  syncWithLegacy?: boolean
  refreshTrigger?: number
}

interface UseUnifiedEventsReturn {
  // Data
  events: UnifiedEvent[]
  isLoading: boolean
  error: string | null
  
  // Statistics
  statistics: ReturnType<typeof UnifiedEventsManager.getEventStatistics>
  
  // Actions
  createEvent: (eventData: Omit<UnifiedEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UnifiedEvent>
  updateEvent: (id: string, updates: Partial<UnifiedEvent>) => Promise<UnifiedEvent | null>
  deleteEvent: (id: string) => Promise<boolean>
  refreshEvents: () => Promise<void>
  
  // Filtered getters
  getEventsByType: (type: EventType) => UnifiedEvent[]
  getEventsByPriority: (priority: Priority) => UnifiedEvent[]
  getEventsByClient: (clientId: string) => UnifiedEvent[]
  getEventsForDate: (date: Date) => UnifiedEvent[]
  getUpcomingEvents: (limit?: number) => UnifiedEvent[]
  getOverdueEvents: () => UnifiedEvent[]
  getActiveGoals: () => UnifiedEvent[]
  searchEvents: (query: string) => UnifiedEvent[]
}

export const useUnifiedEvents = (options: UseUnifiedEventsOptions = {}): UseUnifiedEventsReturn => {
  const { autoLoad = true, syncWithLegacy = false, refreshTrigger } = options
  
  const [events, setEvents] = useState<UnifiedEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Load events from both localStorage and database with sync check
  const loadEvents = useCallback(async () => {
    console.log('🔥 useUnifiedEvents.loadEvents - Starting load process...')
    setIsLoading(true)
    setError(null)

    try {
      // Import from legacy storage if requested and no unified events exist
      if (syncWithLegacy) {
        console.log('🔥 useUnifiedEvents.loadEvents - Checking for legacy sync...')
        const existingEvents = UnifiedEventsManager.getAllEvents()
        console.log('🔥 useUnifiedEvents.loadEvents - Existing events in localStorage:', existingEvents.length)
        if (existingEvents.length === 0) {
          console.log('🔥 useUnifiedEvents.loadEvents - Importing from legacy storage...')
          UnifiedEventsManager.importFromLegacyStorage()
        }
      }

      // Try to load from API first (includes both localStorage and database)
      try {
        console.log('🔥 useUnifiedEvents.loadEvents - Making API call to /api/events?source=both')

        // Add timeout to fetch call
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          console.error('🔥 useUnifiedEvents.loadEvents - API call timeout after 10 seconds')
          controller.abort()
        }, 10000)

        const response = await fetch('/api/events?source=both', {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        })

        clearTimeout(timeoutId)
        console.log('🔥 useUnifiedEvents.loadEvents - API response:', response.status, response.ok)

        if (response.ok) {
          const result = await response.json()
          console.log('🔥 useUnifiedEvents.loadEvents - API result:', result)

          if (result.success) {
            console.log('🔥 useUnifiedEvents.loadEvents - Setting events:', result.events.length)

            // Debug individual event data
            result.events.forEach((event: any, index: number) => {
              console.log(`🔍 EVENT ${index + 1} RAW DATA:`, {
                title: event.title,
                startDateTime: event.startDateTime,
                endDateTime: event.endDateTime,
                duration: event.duration,
                id: event.id,
                type: event.type,
                fullEvent: event
              })
            })

            setEvents(result.events)
            console.log(`✅ Loaded ${result.events.length} events from API (${result.source})`)

            // Check if sync is needed in background
            checkSyncStatus()
            return
          }
        }
      } catch (apiError) {
        if (apiError instanceof Error && apiError.name === 'AbortError') {
          console.error('❌ API call was aborted due to timeout')
        } else {
          console.error('❌ API load failed:', apiError)
        }
        console.log('🔥 useUnifiedEvents.loadEvents - Falling back to localStorage...')
      }

      // Fallback to localStorage only
      const loadedEvents = UnifiedEventsManager.getAllEvents()
      setEvents(loadedEvents)
      console.log(`⚠️ Loaded ${loadedEvents.length} events from localStorage only`)
      setError('Warning: Displaying local events only - database may be unavailable')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load events'
      setError(errorMessage)
      console.error('Error loading events:', err)
    } finally {
      setIsLoading(false)
    }
  }, [syncWithLegacy])

  // Check sync status and auto-sync if needed
  const checkSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/events/sync')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const { status, recommendations } = result

          // Auto-sync if there are localStorage-only events
          if (status.localOnlyEvents > 0 && status.localOnlyEvents <= 10) {
            console.log(`🔄 Auto-syncing ${status.localOnlyEvents} localStorage events to database...`)
            try {
              const syncResponse = await fetch('/api/events/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'migrate-to-database' })
              })
              if (syncResponse.ok) {
                const syncResult = await syncResponse.json()
                console.log('✅ Auto-sync completed:', syncResult.message)
              }
            } catch (syncError) {
              console.warn('⚠️ Auto-sync failed:', syncError)
            }
          }

          // Log sync recommendations
          if (recommendations.length > 0) {
            console.log('📋 Sync recommendations:', recommendations)
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Sync status check failed:', error)
    }
  }, [])
  
  // Auto-load events on mount
  useEffect(() => {
    if (autoLoad) {
      loadEvents()
    }
  }, [autoLoad, loadEvents])

  // Refresh events when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      console.log(`🔥 useUnifiedEvents - refreshTrigger changed to ${refreshTrigger}, reloading events...`)
      loadEvents()
    }
  }, [refreshTrigger, loadEvents])

  // Debug: Log events state changes
  useEffect(() => {
    console.log('🔥 useUnifiedEvents - events state changed, count:', events.length)
    if (events.length > 0) {
      console.log('🔥 useUnifiedEvents - events:', events.map(e => ({ id: e.id, title: e.title, startDateTime: e.startDateTime })))
    } else {
      console.log('🔥 useUnifiedEvents - events array is empty, checking loading states...')
      console.log('🔥 useUnifiedEvents - isLoading:', isLoading)
      console.log('🔥 useUnifiedEvents - error:', error)
    }
  }, [events, isLoading, error])
  
  // Create new event with database-first approach and optional participant notifications
  const createEvent = useCallback(async (eventData: Omit<UnifiedEvent, 'id' | 'createdAt' | 'updatedAt'> & { participants?: string[] }): Promise<UnifiedEvent> => {
    setError(null)

    try {
      // Validate event data
      const validation = UnifiedEventsManager.validateEvent(eventData)
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }

      console.log('🔄 Creating event via database-first API...')

      // Always use the integrated API for database persistence
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create event' }))
        throw new Error(errorData.error || 'Failed to create event')
      }

      const result = await response.json()

      if (!result.success) {
        // Handle warning case (event created but some features failed)
        if (result.warning) {
          console.warn('⚠️', result.warning)
          setError(`Warning: ${result.warning}`)
        } else {
          throw new Error(result.error || 'Failed to create event')
        }
      }

      // Log success details
      const hasParticipants = eventData.participants && eventData.participants.length > 0
      if (hasParticipants && result.appointment) {
        console.log('✅ Event created with notifications:', result.appointment.participantCount, 'participants notified')
      }
      if (result.database?.persisted) {
        console.log('✅ Event persisted to database:', result.database.eventId)
      }

      const newEvent = result.event
      console.log(`🔥 useUnifiedEvents - Adding new event to local state:`, { id: newEvent.id, title: newEvent.title, startDateTime: newEvent.startDateTime })
      setEvents(prev => {
        const updated = [...prev, newEvent]
        console.log(`🔥 useUnifiedEvents - Local events count after creation: ${updated.length}`)
        return updated
      })

      return newEvent
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event'
      setError(errorMessage)
      console.error('❌ Event creation error:', err)

      // Fallback to localStorage if API fails
      console.log('⚠️ Falling back to localStorage-only creation...')
      try {
        const newEvent = UnifiedEventsManager.createEvent(eventData)
        setEvents(prev => [...prev, newEvent])
        setError('Warning: Event created locally only - database unavailable')
        return newEvent
      } catch (fallbackErr) {
        throw new Error(errorMessage)
      }
    }
  }, [])
  
  // Update existing event with database-first approach
  const updateEvent = useCallback(async (id: string, updates: Partial<UnifiedEvent>): Promise<UnifiedEvent | null> => {
    setError(null)

    try {
      // Validate updates if they affect critical fields
      if (updates.title !== undefined || updates.startDateTime !== undefined || updates.endDateTime !== undefined) {
        const currentEvent = events.find(e => e.id === id)
        if (!currentEvent) {
          throw new Error('Event not found')
        }

        const updatedEventData = { ...currentEvent, ...updates }
        const validation = UnifiedEventsManager.validateEvent(updatedEventData)
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '))
        }
      }

      console.log('🔄 ========== UPDATE EVENT API CALL STARTED ==========')
      console.log('🔄 Updating event via database-first API...')
      console.log('🔄 Event ID:', id)
      console.log('🔄 Updates payload:', updates)

      // Try API first
      try {
        console.log('🔄 Making PUT request to /api/events?id=' + id)
        const response = await fetch(`/api/events?id=${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })

        console.log('🔄 API response status:', response.status)
        console.log('🔄 API response ok:', response.ok)

        if (response.ok) {
          const result = await response.json()
          console.log('🔄 API response result:', result)

          if (result.success) {
            const updatedEvent = result.event
            console.log('🔄 Updated event from API:', updatedEvent)

            setEvents(prev => {
              const newEvents = prev.map(event => event.id === id ? updatedEvent : event)
              console.log('🔄 Local events updated, count:', newEvents.length)
              console.log('🔄 Updated event in local state:', newEvents.find(e => e.id === id))
              return newEvents
            })

            if (result.database?.persisted) {
              console.log('✅ Event updated in database:', result.database.eventId)
            } else {
              console.log('⚠️ Event not persisted to database')
            }

            console.log('🔄 ========== UPDATE EVENT API CALL SUCCESS ==========')
            return updatedEvent
          } else {
            console.error('❌ API returned success=false:', result)
          }
        } else {
          const errorText = await response.text()
          console.error('❌ API response not ok:', response.status, errorText)
        }
      } catch (apiError) {
        console.error('❌ API update failed, falling back to localStorage:', apiError)
      }

      // Fallback to localStorage
      const updatedEvent = UnifiedEventsManager.updateEvent(id, updates)
      if (updatedEvent) {
        setEvents(prev => prev.map(event => event.id === id ? updatedEvent : event))
        setError('Warning: Event updated locally only - database may be unavailable')
      }

      return updatedEvent
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update event'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [events])
  
  // Delete event with database-first approach
  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    console.log(`🗑️ useUnifiedEvents deleteEvent called with id: ${id}`)

    try {
      console.log('🔄 Deleting event via database-first API...')

      // Try API first
      let apiSuccess = false
      try {
        const response = await fetch(`/api/events?id=${id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            apiSuccess = true
            if (result.database?.deleted) {
              console.log('✅ Event deleted from database:', id)
            }
          }
        }
      } catch (apiError) {
        console.warn('⚠️ API deletion failed, falling back to localStorage:', apiError)
      }

      // Always attempt localStorage deletion for consistency
      console.log(`🔥 Calling UnifiedEventsManager.deleteEvent with id: ${id}`)
      const localSuccess = UnifiedEventsManager.deleteEvent(id)
      console.log(`🔥 UnifiedEventsManager.deleteEvent returned: ${localSuccess}`)

      // Update local state if either API or localStorage deletion succeeded
      if (apiSuccess || localSuccess) {
        console.log(`🔥 Filtering events to remove id: ${id} (apiSuccess: ${apiSuccess}, localSuccess: ${localSuccess})`)
        setEvents(prev => {
          const filtered = prev.filter(event => event.id !== id)
          console.log(`🔥 Events before filter: ${prev.length}, after filter: ${filtered.length}`)
          return filtered
        })
      }

      if (apiSuccess && !localSuccess) {
        console.log('✅ Event deleted from database only (localStorage may not have contained the event)')
      } else if (!apiSuccess && localSuccess) {
        setError('Warning: Event deleted locally only - database may be unavailable')
      }

      return apiSuccess || localSuccess
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete event'
      console.error(`🔥 Error in deleteEvent:`, err)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])
  
  // Refresh events from storage
  const refreshEvents = useCallback(async () => {
    await loadEvents()
  }, [loadEvents])
  
  // Filtered getters - using local state for better performance
  const getEventsByType = useCallback((type: EventType): UnifiedEvent[] => {
    return events.filter(event => event.type === type)
  }, [events])
  
  const getEventsByPriority = useCallback((priority: Priority): UnifiedEvent[] => {
    return events.filter(event => event.priority === priority)
  }, [events])
  
  const getEventsByClient = useCallback((clientId: string): UnifiedEvent[] => {
    return events.filter(event => event.clientId === clientId)
  }, [events])
  
  const getEventsForDate = useCallback((date: Date): UnifiedEvent[] => {
    // Create date string in local timezone format (YYYY-MM-DD)
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    console.log('🔥 getEventsForDate DEBUG - Input date:', date)
    console.log('🔥 getEventsForDate DEBUG - Generated dateStr:', dateStr)

    const filteredEvents = events.filter(event => {
      const eventDateStr = event.startDateTime.split('T')[0]
      const matches = eventDateStr === dateStr
      console.log('🔥 getEventsForDate DEBUG - Event comparison:', {
        eventTitle: event.title,
        eventDateStr,
        targetDateStr: dateStr,
        matches
      })
      return matches
    })

    console.log('🔥 getEventsForDate DEBUG - Filtered results:', filteredEvents.length, 'events')
    return filteredEvents
  }, [events])
  
  const getUpcomingEvents = useCallback((limit?: number): UnifiedEvent[] => {
    const now = new Date()
    const upcomingEvents = events
      .filter(event => new Date(event.startDateTime) > now)
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
    
    return limit ? upcomingEvents.slice(0, limit) : upcomingEvents
  }, [events])
  
  const getOverdueEvents = useCallback((): UnifiedEvent[] => {
    const now = new Date()
    return events.filter(event => {
      const eventDate = new Date(event.startDateTime)
      return eventDate < now && (event.type === 'task' || event.type === 'milestone')
    })
  }, [events])
  
  const getActiveGoals = useCallback((): UnifiedEvent[] => {
    const goals = events.filter(event => event.type === 'goal')
    const now = new Date()
    
    return goals.filter(goal => {
      if (!goal.goalTimeframe) return false
      
      const goalDate = new Date(goal.startDateTime)
      
      switch (goal.goalTimeframe) {
        case 'daily':
          return goalDate.toDateString() === now.toDateString()
        case 'weekly':
          // Check if within same week
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          return goalDate >= weekStart && goalDate <= weekEnd
        case 'monthly':
          return goalDate.getMonth() === now.getMonth() && goalDate.getFullYear() === now.getFullYear()
        case 'quarterly':
          const currentQuarter = Math.floor(now.getMonth() / 3)
          const goalQuarter = Math.floor(goalDate.getMonth() / 3)
          return goalQuarter === currentQuarter && goalDate.getFullYear() === now.getFullYear()
        case 'yearly':
          return goalDate.getFullYear() === now.getFullYear()
        default:
          return true // Custom timeframes are always considered active
      }
    })
  }, [events])
  
  const searchEvents = useCallback((query: string): UnifiedEvent[] => {
    const searchTerm = query.toLowerCase().trim()
    if (!searchTerm) return events
    
    return events.filter(event => 
      event.title.toLowerCase().includes(searchTerm) ||
      (event.description && event.description.toLowerCase().includes(searchTerm)) ||
      (event.location && event.location.toLowerCase().includes(searchTerm)) ||
      (event.clientName && event.clientName.toLowerCase().includes(searchTerm)) ||
      (event.notes && event.notes.toLowerCase().includes(searchTerm))
    )
  }, [events])
  
  // Calculate statistics
  const statistics = useCallback(() => {
    const now = new Date()
    
    return {
      total: events.length,
      byType: {
        events: events.filter(e => e.type === 'event').length,
        tasks: events.filter(e => e.type === 'task').length,
        goals: events.filter(e => e.type === 'goal').length,
        milestones: events.filter(e => e.type === 'milestone').length
      },
      byPriority: {
        low: events.filter(e => e.priority === 'low').length,
        medium: events.filter(e => e.priority === 'medium').length,
        high: events.filter(e => e.priority === 'high').length,
        urgent: events.filter(e => e.priority === 'urgent').length
      },
      upcoming: events.filter(e => new Date(e.startDateTime) > now).length,
      overdue: events.filter(e => {
        const eventDate = new Date(e.startDateTime)
        return eventDate < now && (e.type === 'task' || e.type === 'milestone')
      }).length,
      today: events.filter(e => {
        const eventDate = new Date(e.startDateTime)
        return eventDate.toDateString() === now.toDateString()
      }).length
    }
  }, [events])
  
  return {
    events,
    isLoading,
    error,
    statistics: statistics(),
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents,
    getEventsByType,
    getEventsByPriority,
    getEventsByClient,
    getEventsForDate,
    getUpcomingEvents,
    getOverdueEvents,
    getActiveGoals,
    searchEvents
  }
}

export default useUnifiedEvents