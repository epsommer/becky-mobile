// Unified Events Management - Sharp Modern ServicePro CRM

import { format, parseISO, isAfter, isBefore, isToday, isThisWeek, isThisMonth, isThisQuarter, isThisYear } from 'date-fns'
import type { UnifiedEvent, EventType, Priority, GoalTimeframe } from '@/components/EventCreationModal'
import type { CalendarEvent } from '@/types/scheduling'
import type { DailyTask } from '@/types/daily-planner'

// Storage keys for different event types
export const STORAGE_KEYS = {
  UNIFIED_EVENTS: 'unified-events',
  DAILY_TASKS: 'daily-tasks',
  CALENDAR_EVENTS: 'calendar-events',
  GOALS: 'goals',
  MILESTONES: 'milestones'
} as const

// Conversion utilities for backward compatibility
export const convertCalendarEventToUnified = (calendarEvent: CalendarEvent): UnifiedEvent => {
  return {
    id: calendarEvent.id,
    type: 'event' as EventType,
    title: calendarEvent.title,
    description: calendarEvent.description,
    startDateTime: calendarEvent.startTime,
    endDateTime: calendarEvent.endTime,
    duration: Math.round((new Date(calendarEvent.endTime).getTime() - new Date(calendarEvent.startTime).getTime()) / (1000 * 60)),
    priority: 'medium' as Priority, // Default priority for calendar events
    clientId: calendarEvent.clientId,
    location: calendarEvent.location,
    notes: calendarEvent.metadata?.meetingLink ? `Meeting Link: ${calendarEvent.metadata.meetingLink}` : undefined,
    createdAt: calendarEvent.createdAt,
    updatedAt: calendarEvent.updatedAt
  }
}

export const convertDailyTaskToUnified = (task: DailyTask): UnifiedEvent => {
  // Convert Date objects to local timezone format (YYYY-MM-DDTHH:MM:SS)
  const startDateTime = `${task.startTime.getFullYear()}-${(task.startTime.getMonth() + 1).toString().padStart(2, '0')}-${task.startTime.getDate().toString().padStart(2, '0')}T${task.startTime.getHours().toString().padStart(2, '0')}:${task.startTime.getMinutes().toString().padStart(2, '0')}:${task.startTime.getSeconds().toString().padStart(2, '0')}`
  const endDateTime = `${task.endTime.getFullYear()}-${(task.endTime.getMonth() + 1).toString().padStart(2, '0')}-${task.endTime.getDate().toString().padStart(2, '0')}T${task.endTime.getHours().toString().padStart(2, '0')}:${task.endTime.getMinutes().toString().padStart(2, '0')}:${task.endTime.getSeconds().toString().padStart(2, '0')}`
  const createdAt = `${task.createdAt.getFullYear()}-${(task.createdAt.getMonth() + 1).toString().padStart(2, '0')}-${task.createdAt.getDate().toString().padStart(2, '0')}T${task.createdAt.getHours().toString().padStart(2, '0')}:${task.createdAt.getMinutes().toString().padStart(2, '0')}:${task.createdAt.getSeconds().toString().padStart(2, '0')}`
  const updatedAt = `${task.updatedAt.getFullYear()}-${(task.updatedAt.getMonth() + 1).toString().padStart(2, '0')}-${task.updatedAt.getDate().toString().padStart(2, '0')}T${task.updatedAt.getHours().toString().padStart(2, '0')}:${task.updatedAt.getMinutes().toString().padStart(2, '0')}:${task.updatedAt.getSeconds().toString().padStart(2, '0')}`
  
  return {
    id: task.id,
    type: 'task' as EventType,
    title: task.title,
    description: task.description,
    startDateTime: startDateTime,
    endDateTime: endDateTime,
    duration: task.estimatedDuration,
    priority: task.priority,
    clientId: task.clientId,
    location: task.location,
    notes: task.notes,
    createdAt: createdAt,
    updatedAt: updatedAt
  }
}

export const convertUnifiedToCalendarEvent = (unifiedEvent: UnifiedEvent): CalendarEvent => {
  return {
    id: unifiedEvent.id,
    title: unifiedEvent.title,
    description: unifiedEvent.description,
    startTime: unifiedEvent.startDateTime,
    endTime: unifiedEvent.endDateTime || unifiedEvent.startDateTime,
    clientId: unifiedEvent.clientId || '',
    type: 'appointment',
    status: 'scheduled',
    location: unifiedEvent.location,
    isAllDay: false,
    createdAt: unifiedEvent.createdAt,
    updatedAt: unifiedEvent.updatedAt
  }
}

export const convertUnifiedToDailyTask = (unifiedEvent: UnifiedEvent): DailyTask => {
  return {
    id: unifiedEvent.id,
    title: unifiedEvent.title,
    description: unifiedEvent.description,
    startTime: parseISO(unifiedEvent.startDateTime),
    endTime: parseISO(unifiedEvent.endDateTime || unifiedEvent.startDateTime),
    priority: unifiedEvent.priority,
    status: 'pending',
    clientId: unifiedEvent.clientId,
    location: unifiedEvent.location,
    estimatedDuration: unifiedEvent.duration,
    notes: unifiedEvent.notes,
    createdAt: parseISO(unifiedEvent.createdAt),
    updatedAt: parseISO(unifiedEvent.updatedAt)
  }
}

// Unified Events Management Class
export class UnifiedEventsManager {
  // Get all events from localStorage
  static getAllEvents(): UnifiedEvent[] {
    // SSR safety check
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.UNIFIED_EVENTS)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error loading unified events:', error)
      return []
    }
  }

  // Save all events to localStorage
  static saveAllEvents(events: UnifiedEvent[]): void {
    // SSR safety check
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(STORAGE_KEYS.UNIFIED_EVENTS, JSON.stringify(events))
      
      // Also sync to legacy storage for backward compatibility
      this.syncToLegacyStorage(events)
    } catch (error) {
      console.error('Error saving unified events:', error)
    }
  }

  // Sync to legacy storage systems for backward compatibility
  static syncToLegacyStorage(events: UnifiedEvent[]): void {
    // SSR safety check
    if (typeof window === 'undefined') return
    
    try {
      // Separate events by type
      const calendarEvents: CalendarEvent[] = []
      const dailyTasks: DailyTask[] = []
      const goals: UnifiedEvent[] = []
      const milestones: UnifiedEvent[] = []

      events.forEach(event => {
        switch (event.type) {
          case 'event':
            calendarEvents.push(convertUnifiedToCalendarEvent(event))
            break
          case 'task':
            dailyTasks.push(convertUnifiedToDailyTask(event))
            break
          case 'goal':
            goals.push(event)
            break
          case 'milestone':
            milestones.push(event)
            break
        }
      })

      // Save to respective storage keys
      localStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(calendarEvents))
      localStorage.setItem(STORAGE_KEYS.DAILY_TASKS, JSON.stringify(dailyTasks))
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals))
      localStorage.setItem(STORAGE_KEYS.MILESTONES, JSON.stringify(milestones))
      
    } catch (error) {
      console.error('Error syncing to legacy storage:', error)
    }
  }

  // Create a new event
  static createEvent(eventData: Omit<UnifiedEvent, 'id' | 'createdAt' | 'updatedAt'>): UnifiedEvent {
    const newEvent: UnifiedEvent = {
      ...eventData,
      id: `${eventData.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Add legacy compatibility fields
      status: eventData.status || 'scheduled',
      service: eventData.service || eventData.title,
      scheduledDate: eventData.scheduledDate || eventData.startDateTime
    }

    const existingEvents = this.getAllEvents()
    const updatedEvents = [...existingEvents, newEvent]
    this.saveAllEvents(updatedEvents)

    return newEvent
  }

  // Update an existing event
  static updateEvent(id: string, updates: Partial<UnifiedEvent>): UnifiedEvent | null {
    const events = this.getAllEvents()
    const eventIndex = events.findIndex(event => event.id === id)
    
    if (eventIndex === -1) {
      return null
    }

    const updatedEvent: UnifiedEvent = {
      ...events[eventIndex],
      ...updates,
      id: events[eventIndex].id, // Ensure ID doesn't change
      createdAt: events[eventIndex].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    }

    events[eventIndex] = updatedEvent
    this.saveAllEvents(events)

    return updatedEvent
  }

  // Delete an event
  static deleteEvent(id: string): boolean {
    const events = this.getAllEvents()
    const filteredEvents = events.filter(event => event.id !== id)
    
    if (filteredEvents.length === events.length) {
      return false // Event not found
    }

    this.saveAllEvents(filteredEvents)
    return true
  }

  // Get events by type
  static getEventsByType(type: EventType): UnifiedEvent[] {
    return this.getAllEvents().filter(event => event.type === type)
  }

  // Get events by date range
  static getEventsByDateRange(startDate: Date, endDate: Date): UnifiedEvent[] {
    return this.getAllEvents().filter(event => {
      const eventDate = parseISO(event.startDateTime)
      return isAfter(eventDate, startDate) && isBefore(eventDate, endDate)
    })
  }

  // Get events for a specific date
  static getEventsForDate(date: Date): UnifiedEvent[] {
    // Create date string in local timezone format (YYYY-MM-DD)
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    return this.getAllEvents().filter(event => {
      const eventDateStr = event.startDateTime.split('T')[0]
      return eventDateStr === dateStr
    })
  }

  // Get events by priority
  static getEventsByPriority(priority: Priority): UnifiedEvent[] {
    return this.getAllEvents().filter(event => event.priority === priority)
  }

  // Get events by client
  static getEventsByClient(clientId: string): UnifiedEvent[] {
    return this.getAllEvents().filter(event => event.clientId === clientId)
  }

  // Get upcoming events
  static getUpcomingEvents(limit?: number): UnifiedEvent[] {
    const now = new Date()
    const upcomingEvents = this.getAllEvents()
      .filter(event => isAfter(parseISO(event.startDateTime), now))
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
    
    return limit ? upcomingEvents.slice(0, limit) : upcomingEvents
  }

  // Get overdue events/tasks
  static getOverdueEvents(): UnifiedEvent[] {
    const now = new Date()
    return this.getAllEvents().filter(event => {
      const eventDate = parseISO(event.startDateTime)
      return isBefore(eventDate, now) && (event.type === 'task' || event.type === 'milestone')
    })
  }

  // Get goals by timeframe
  static getGoalsByTimeframe(timeframe: GoalTimeframe): UnifiedEvent[] {
    const goals = this.getEventsByType('goal')
    return goals.filter(goal => goal.goalTimeframe === timeframe)
  }

  // Get active goals (within their timeframe)
  static getActiveGoals(): UnifiedEvent[] {
    const goals = this.getEventsByType('goal')
    const now = new Date()
    
    return goals.filter(goal => {
      if (!goal.goalTimeframe) return false
      
      const goalDate = parseISO(goal.startDateTime)
      
      switch (goal.goalTimeframe) {
        case 'daily':
          return isToday(goalDate)
        case 'weekly':
          return isThisWeek(goalDate)
        case 'monthly':
          return isThisMonth(goalDate)
        case 'quarterly':
          return isThisQuarter(goalDate)
        case 'yearly':
          return isThisYear(goalDate)
        default:
          return true // Custom timeframes are always considered active
      }
    })
  }

  // Search events
  static searchEvents(query: string): UnifiedEvent[] {
    const searchTerm = query.toLowerCase()
    return this.getAllEvents().filter(event => 
      event.title.toLowerCase().includes(searchTerm) ||
      (event.description && event.description.toLowerCase().includes(searchTerm)) ||
      (event.location && event.location.toLowerCase().includes(searchTerm)) ||
      (event.clientName && event.clientName.toLowerCase().includes(searchTerm)) ||
      (event.notes && event.notes.toLowerCase().includes(searchTerm))
    )
  }

  // Get event statistics
  static getEventStatistics() {
    const events = this.getAllEvents()
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
      upcoming: events.filter(e => isAfter(parseISO(e.startDateTime), now)).length,
      overdue: events.filter(e => {
        const eventDate = parseISO(e.startDateTime)
        return isBefore(eventDate, now) && (e.type === 'task' || e.type === 'milestone')
      }).length,
      today: events.filter(e => isToday(parseISO(e.startDateTime))).length
    }
  }

  // Import from legacy storage
  static importFromLegacyStorage(): void {
    // SSR safety check
    if (typeof window === 'undefined') return
    
    try {
      const events: UnifiedEvent[] = []
      
      // Import calendar events
      const calendarEvents = JSON.parse(localStorage.getItem(STORAGE_KEYS.CALENDAR_EVENTS) || '[]')
      calendarEvents.forEach((event: CalendarEvent) => {
        events.push(convertCalendarEventToUnified(event))
      })
      
      // Import daily tasks
      const dailyTasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_TASKS) || '[]')
      dailyTasks.forEach((task: DailyTask) => {
        events.push(convertDailyTaskToUnified(task))
      })
      
      // Import existing goals and milestones
      const goals = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS) || '[]')
      const milestones = JSON.parse(localStorage.getItem(STORAGE_KEYS.MILESTONES) || '[]')
      
      events.push(...goals, ...milestones)
      
      // Save to unified storage
      this.saveAllEvents(events)
      
    } catch (error) {
      console.error('Error importing from legacy storage:', error)
    }
  }

  // Validate event data
  static validateEvent(event: Partial<UnifiedEvent>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!event.title || event.title.trim() === '') {
      errors.push('Title is required')
    }
    
    if (!event.startDateTime) {
      errors.push('Start date/time is required')
    }
    
    if (!event.type) {
      errors.push('Event type is required')
    }
    
    if (!event.priority) {
      errors.push('Priority is required')
    }
    
    if (event.endDateTime && event.startDateTime) {
      const startDate = new Date(event.startDateTime)
      const endDate = new Date(event.endDateTime)
      if (endDate <= startDate) {
        errors.push('End date/time must be after start date/time')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export default UnifiedEventsManager