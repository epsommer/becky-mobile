// src/lib/goal-calendar-integration.ts
// Integration between goals system and calendar events

import { UnifiedEventsManager } from './unified-events'
import { GoalsManager } from './goals-manager'
import { Goal, Milestone, GoalCalendarEvent } from '@/types/goals'
import { CalendarEvent } from '@/types/scheduling'
import { UnifiedEvent } from '@/components/EventCreationModal'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'

export class GoalCalendarIntegration {
  
  // ============================================================================
  // GOAL TO CALENDAR EVENT CONVERSION
  // ============================================================================

  /**
   * Convert a goal to calendar events (start, milestones, deadline)
   */
  static createCalendarEventsForGoal(goal: Goal): UnifiedEvent[] {
    const events: UnifiedEvent[] = []
    
    // Create goal start event
    const startEvent: UnifiedEvent = {
      id: `goal-start-${goal.id}`,
      type: 'goal',
      title: `🎯 Start: ${goal.title}`,
      description: `Goal started: ${goal.description || 'No description'}`,
      startDateTime: goal.startDate,
      endDateTime: goal.startDate,
      duration: 60, // 1 hour
      priority: goal.priority,
      clientId: goal.clientId,
      clientName: goal.clientId ? 'Client' : undefined, // Would need to fetch actual client name
      location: undefined,
      notes: `Goal Category: ${goal.category}\nTimeframe: ${goal.timeframe}`,
      goalTimeframe: goal.timeframe,
      progressTarget: goal.targetValue,
      currentProgress: goal.currentValue,
      deadline: goal.endDate,
      dependencies: goal.dependencies,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt
    }
    
    events.push(startEvent)
    
    // Create goal deadline event
    const deadlineEvent: UnifiedEvent = {
      id: `goal-deadline-${goal.id}`,
      type: 'milestone',
      title: `🏁 Due: ${goal.title}`,
      description: `Goal deadline: ${goal.description || 'No description'}`,
      startDateTime: goal.endDate,
      endDateTime: goal.endDate,
      duration: 30, // 30 minutes
      priority: 'urgent', // Deadlines are always urgent
      clientId: goal.clientId,
      clientName: goal.clientId ? 'Client' : undefined,
      location: undefined,
      notes: `Goal Progress: ${goal.progress}%\nTarget: ${goal.targetValue} ${goal.progressUnit}`,
      goalTimeframe: goal.timeframe,
      progressTarget: goal.targetValue,
      currentProgress: goal.currentValue,
      deadline: goal.endDate,
      dependencies: [],
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt
    }
    
    events.push(deadlineEvent)
    
    return events
  }

  /**
   * Convert a milestone to a calendar event
   */
  static createCalendarEventForMilestone(milestone: Milestone, goal?: Goal): UnifiedEvent {
    return {
      id: `milestone-${milestone.id}`,
      type: 'milestone',
      title: `💎 ${milestone.title}`,
      description: `Milestone: ${milestone.description || 'No description'}${goal ? `\nGoal: ${goal.title}` : ''}`,
      startDateTime: milestone.dueDate,
      endDateTime: milestone.dueDate,
      duration: milestone.estimatedHours ? milestone.estimatedHours * 60 : 60,
      priority: milestone.priority,
      clientId: goal?.clientId,
      clientName: goal?.clientId ? 'Client' : undefined,
      location: undefined,
      notes: `Milestone Type: ${milestone.type}\nProgress: ${milestone.progress}%`,
      goalTimeframe: goal?.timeframe,
      progressTarget: 100,
      currentProgress: milestone.progress,
      deadline: milestone.dueDate,
      dependencies: milestone.dependencies,
      createdAt: milestone.createdAt,
      updatedAt: milestone.updatedAt
    }
  }

  // ============================================================================
  // CALENDAR INTEGRATION SYNC
  // ============================================================================

  /**
   * Sync all goals and milestones to calendar events
   */
  static syncGoalsToCalendar(): { created: number; updated: number; errors: string[] } {
    const results = { created: 0, updated: 0, errors: [] as string[] }
    
    try {
      const goals = GoalsManager.getAllGoals()
      const milestones = GoalsManager.getAllMilestones()
      
      // Clear existing goal-related events
      this.clearGoalEventsFromCalendar()
      
      // Create events for goals
      goals.forEach(goal => {
        try {
          const goalEvents = this.createCalendarEventsForGoal(goal)
          goalEvents.forEach(event => {
            UnifiedEventsManager.createEvent(event)
            results.created++
          })
          
          // Update goal with calendar event IDs
          const eventIds = goalEvents.map(e => e.id)
          GoalsManager.updateGoal(goal.id, { calendarEventIds: eventIds })
          
        } catch (error) {
          results.errors.push(`Failed to create events for goal ${goal.title}: ${error}`)
        }
      })
      
      // Create events for milestones
      milestones.forEach(milestone => {
        try {
          const goal = goals.find(g => g.id === milestone.goalId)
          const milestoneEvent = this.createCalendarEventForMilestone(milestone, goal)
          
          UnifiedEventsManager.createEvent(milestoneEvent)
          results.created++
          
        } catch (error) {
          results.errors.push(`Failed to create event for milestone ${milestone.title}: ${error}`)
        }
      })
      
    } catch (error) {
      results.errors.push(`Sync failed: ${error}`)
    }
    
    return results
  }

  /**
   * Clear all goal-related events from calendar
   */
  static clearGoalEventsFromCalendar(): void {
    const allEvents = UnifiedEventsManager.getAllEvents()
    const goalEvents = allEvents.filter(event => 
      event.type === 'goal' || 
      event.type === 'milestone' ||
      event.id.startsWith('goal-') ||
      event.id.startsWith('milestone-')
    )
    
    goalEvents.forEach(event => {
      UnifiedEventsManager.deleteEvent(event.id)
    })
  }

  // ============================================================================
  // CALENDAR EVENT TO GOAL CONVERSION
  // ============================================================================

  /**
   * Create a goal from a calendar event
   */
  static createGoalFromCalendarEvent(event: UnifiedEvent): Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> {
    // Determine timeframe based on duration
    let timeframe: Goal['timeframe'] = 'custom'
    const startDate = new Date(event.startDateTime)
    const endDate = event.endDateTime ? new Date(event.endDateTime) : addDays(startDate, 1)
    
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    
    if (durationDays <= 1) {
      timeframe = 'daily'
    } else if (durationDays <= 7) {
      timeframe = 'weekly'
    } else if (durationDays <= 31) {
      timeframe = 'monthly'
    } else if (durationDays <= 93) {
      timeframe = 'quarterly'
    } else {
      timeframe = 'yearly'
    }

    return {
      title: event.title.replace(/🎯|🏁|💎/g, '').trim(),
      description: event.description,
      category: 'business', // Default category
      timeframe,
      priority: event.priority,
      status: 'not-started',
      progress: event.currentProgress || 0,
      progressTarget: event.progressTarget || 100,
      progressUnit: 'percentage',
      currentValue: event.currentProgress || 0,
      targetValue: event.progressTarget || 100,
      startDate: event.startDateTime,
      endDate: event.endDateTime || addDays(new Date(event.startDateTime), 1).toISOString(),
      parentGoalId: undefined,
      childGoalIds: [],
      milestoneIds: [],
      dependencies: event.dependencies || [],
      clientId: event.clientId,
      projectId: undefined,
      conversationId: undefined,
      calendarEventIds: [event.id],
      reminderIds: [],
      progressHistory: [],
      reminderSettings: {
        enabled: false,
        frequency: 'weekly' as const,
        time: '09:00',
        advanceNotice: 3
      },
      color: undefined,
      tags: [],
      notes: event.notes,
      attachments: [],
      estimatedHours: event.duration ? Math.round(event.duration / 60) : undefined,
      actualHours: undefined,
      difficultyRating: undefined,
      successMetrics: undefined,
      recurring: undefined
    }
  }

  // ============================================================================
  // VIEW INTEGRATION HELPERS
  // ============================================================================

  /**
   * Get goal-related events for a specific date range
   */
  static getGoalEventsForDateRange(startDate: Date, endDate: Date): UnifiedEvent[] {
    const allEvents = UnifiedEventsManager.getAllEvents()
    
    return allEvents.filter(event => {
      if (event.type !== 'goal' && event.type !== 'milestone') return false
      
      const eventDate = new Date(event.startDateTime)
      return eventDate >= startOfDay(startDate) && eventDate <= endOfDay(endDate)
    })
  }

  /**
   * Get goals that have events on a specific date
   */
  static getGoalsForDate(date: Date): Goal[] {
    const goals = GoalsManager.getAllGoals()
    const dateStr = format(date, 'yyyy-MM-dd')
    
    return goals.filter(goal => {
      const goalStartDate = format(new Date(goal.startDate), 'yyyy-MM-dd')
      const goalEndDate = format(new Date(goal.endDate), 'yyyy-MM-dd')
      
      return dateStr >= goalStartDate && dateStr <= goalEndDate
    })
  }

  /**
   * Get milestones for a specific date
   */
  static getMilestonesForDate(date: Date): Milestone[] {
    const milestones = GoalsManager.getAllMilestones()
    const dateStr = format(date, 'yyyy-MM-dd')
    
    return milestones.filter(milestone => {
      const milestoneDate = format(new Date(milestone.dueDate), 'yyyy-MM-dd')
      return milestoneDate === dateStr
    })
  }

  // ============================================================================
  // PROGRESS TRACKING INTEGRATION
  // ============================================================================

  /**
   * Update calendar event when goal progress changes
   */
  static updateCalendarEventForGoalProgress(goalId: string, progress: number): void {
    try {
      const goal = GoalsManager.getGoalById(goalId)
      if (!goal) return

      // Update related calendar events
      goal.calendarEventIds.forEach(eventId => {
        // TODO: getEventById not available - update directly
        UnifiedEventsManager.updateEvent(eventId, {
          currentProgress: progress,
          notes: `Progress updated: ${progress}%`
        })
      })

      // Update milestone events for this goal
      const milestones = GoalsManager.getMilestonesByGoalId(goalId)
      milestones.forEach(milestone => {
        const milestoneEventId = `milestone-${milestone.id}`
        // TODO: getEventById not available - update directly
        UnifiedEventsManager.updateEvent(milestoneEventId, {
          description: `Goal Progress: ${progress}%`
        })
      })

    } catch (error) {
      console.error('Failed to update calendar events for goal progress:', error)
    }
  }

  // ============================================================================
  // NOTIFICATION INTEGRATION
  // ============================================================================

  /**
   * Create reminder events for goal deadlines
   */
  static createGoalReminders(goal: Goal): UnifiedEvent[] {
    if (!goal.reminderSettings.enabled) return []

    const reminders: UnifiedEvent[] = []
    const deadlineDate = new Date(goal.endDate)

    // Create advance notice reminder
    if (goal.reminderSettings.advanceNotice && goal.reminderSettings.advanceNotice > 0) {
      const reminderDate = addDays(deadlineDate, -goal.reminderSettings.advanceNotice)
      
      const reminderEvent: UnifiedEvent = {
        id: `goal-reminder-${goal.id}`,
        type: 'event',
        title: `⏰ Reminder: ${goal.title}`,
        description: `Goal deadline approaching in ${goal.reminderSettings.advanceNotice} days`,
        startDateTime: reminderDate.toISOString(),
        endDateTime: reminderDate.toISOString(),
        duration: 15, // 15 minutes
        priority: 'medium',
        clientId: goal.clientId,
        clientName: goal.clientId ? 'Client' : undefined,
        location: undefined,
        notes: `Goal: ${goal.title}\nProgress: ${goal.progress}%\nDeadline: ${format(deadlineDate, 'PPP')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      reminders.push(reminderEvent)
    }

    return reminders
  }

  // ============================================================================
  // ANALYTICS INTEGRATION
  // ============================================================================

  /**
   * Get calendar event statistics related to goals
   */
  static getGoalCalendarStatistics() {
    const allEvents = UnifiedEventsManager.getAllEvents()
    const goalEvents = allEvents.filter(event => 
      event.type === 'goal' || event.type === 'milestone'
    )

    const now = new Date()
    
    return {
      totalGoalEvents: goalEvents.length,
      upcomingDeadlines: goalEvents.filter(event => 
        new Date(event.startDateTime) > now && event.type === 'milestone'
      ).length,
      overdueGoals: goalEvents.filter(event => 
        new Date(event.startDateTime) < now && event.type === 'goal' && 
        (event.currentProgress || 0) < 100
      ).length,
      completedGoals: goalEvents.filter(event => 
        event.type === 'goal' && (event.currentProgress || 0) >= 100
      ).length,
      averageProgress: goalEvents.length > 0 
        ? goalEvents.reduce((sum, event) => sum + (event.currentProgress || 0), 0) / goalEvents.length
        : 0
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Check if a calendar event is goal-related
   */
  static isGoalRelatedEvent(event: UnifiedEvent): boolean {
    return event.type === 'goal' || 
           event.type === 'milestone' ||
           event.id.startsWith('goal-') ||
           event.id.startsWith('milestone-') ||
           Boolean(event.goalTimeframe)
  }

  /**
   * Get goal ID from a calendar event
   */
  static getGoalIdFromEvent(event: UnifiedEvent): string | null {
    if (event.id.startsWith('goal-start-') || event.id.startsWith('goal-deadline-')) {
      return event.id.split('-').slice(2).join('-')
    }
    
    if (event.id.startsWith('milestone-')) {
      const milestoneId = event.id.replace('milestone-', '')
      const milestone = GoalsManager.getMilestoneById(milestoneId)
      return milestone ? milestone.goalId : null
    }
    
    return null
  }

  /**
   * Auto-sync goals with calendar (can be called periodically)
   */
  static autoSync(): void {
    try {
      const lastSync = localStorage.getItem('goal-calendar-last-sync')
      const now = new Date()
      
      // Only sync if last sync was more than 1 hour ago
      if (lastSync) {
        const lastSyncDate = new Date(lastSync)
        const hoursSinceLastSync = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceLastSync < 1) {
          return
        }
      }
      
      // Perform sync
      const result = this.syncGoalsToCalendar()
      
      // Update last sync time
      localStorage.setItem('goal-calendar-last-sync', now.toISOString())
      
      console.log('Goal calendar sync completed:', result)
      
    } catch (error) {
      console.error('Auto-sync failed:', error)
    }
  }
}