import { UnifiedEvent } from '@/components/EventCreationModal'
import { DailyTask } from '@/types/daily-planner'
import { parseISO, addMinutes, isBefore, isAfter, isEqual } from 'date-fns'
import { ConflictResolutionClientService } from '@/lib/conflict-resolution-client'

export type ConflictType = 'temporal_overlap' | 'resource_conflict' | 'buffer_violation' | 'business_rule' | 'client_preference'
export type ConflictSeverity = 'warning' | 'error' | 'critical'
export type ResolutionStrategy = 'cancel' | 'allow' | 'reschedule' | 'override' | 'auto_reschedule' | 'split_event' | 'notify_client' | 'waitlist'

export interface ConflictRule {
  id: string
  name: string
  type: ConflictType
  enabled: boolean
  severity: ConflictSeverity
  bufferTimeMinutes?: number
  applyToEventTypes?: string[]
  customValidator?: (event: UnifiedEvent, existingEvents: UnifiedEvent[]) => boolean
}

export interface ConflictResult {
  hasConflicts: boolean
  conflicts: ConflictDetail[]
  suggestions: ResolutionSuggestion[]
  canProceed: boolean
}

export interface ConflictDetail {
  id: string
  type: ConflictType
  severity: ConflictSeverity
  message: string
  conflictingEvent: UnifiedEvent
  proposedEvent: UnifiedEvent
  timeOverlap?: {
    start: Date
    end: Date
    durationMinutes: number
  }
  affectedResources?: string[]
}

export interface ResolutionSuggestion {
  strategy: ResolutionStrategy
  description: string
  alternativeTimeSlots?: {
    start: Date
    end: Date
    confidence: number
  }[]
  estimatedImpact: string
  requiresClientNotification: boolean
}

export interface ConflictDetectionConfig {
  rules: ConflictRule[]
  defaultBufferTimeMinutes: number
  workHours: {
    start: string // HH:mm format
    end: string   // HH:mm format
  }
  workDays: number[] // 0=Sunday, 1=Monday, etc.
  blackoutPeriods: {
    start: Date
    end: Date
    reason: string
  }[]
  priorityClients: string[]
  maxConflictsPerDay: number
}

/**
 * Comprehensive schedule conflict detection system
 * Implements multi-dimensional conflict analysis for CRM scheduling
 */
export class ConflictDetector {
  private config: ConflictDetectionConfig

  constructor(config?: Partial<ConflictDetectionConfig>) {
    this.config = {
      rules: this.getDefaultRules(),
      defaultBufferTimeMinutes: 30,
      workHours: { start: '08:00', end: '18:00' },
      workDays: [1, 2, 3, 4, 5], // Monday-Friday
      blackoutPeriods: [],
      priorityClients: [],
      maxConflictsPerDay: 3,
      ...config
    }
  }

  /**
   * Main conflict detection method (synchronous version)
   */
  detectConflicts(proposedEvent: UnifiedEvent, existingEvents: UnifiedEvent[]): ConflictResult {
    const conflicts: ConflictDetail[] = []
    const enabledRules = this.config.rules.filter(rule => rule.enabled)

    // Run all enabled conflict detection rules
    for (const rule of enabledRules) {
      const ruleConflicts = this.runConflictRule(rule, proposedEvent, existingEvents)
      conflicts.push(...ruleConflicts)
    }

    // Generate resolution suggestions
    const suggestions = this.generateResolutionSuggestions(proposedEvent, conflicts, existingEvents)

    // Determine if we can proceed (no critical conflicts)
    const canProceed = !conflicts.some(conflict => conflict.severity === 'critical')

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      suggestions,
      canProceed
    }
  }

  /**
   * Enhanced conflict detection method that filters out resolved conflicts
   * This should be used for UI conflict detection where user resolutions need to be respected
   */
  async detectConflictsWithResolutions(proposedEvent: UnifiedEvent, existingEvents: UnifiedEvent[]): Promise<ConflictResult> {
    // First, detect all potential conflicts
    const initialResult = this.detectConflicts(proposedEvent, existingEvents)

    if (initialResult.conflicts.length === 0) {
      return initialResult
    }

    console.log(`🔥 ConflictDetector: Initial conflicts found: ${initialResult.conflicts.length}`)

    // Filter out conflicts that have been resolved by the user
    const unresolvedConflicts = await ConflictResolutionClientService.filterResolvedConflicts(initialResult.conflicts)

    console.log(`🔥 ConflictDetector: After filtering resolved conflicts: ${unresolvedConflicts.length}`)

    // Regenerate suggestions based on unresolved conflicts
    const suggestions = this.generateResolutionSuggestions(proposedEvent, unresolvedConflicts, existingEvents)

    // Determine if we can proceed (no critical unresolved conflicts)
    const canProceed = !unresolvedConflicts.some(conflict => conflict.severity === 'critical')

    return {
      hasConflicts: unresolvedConflicts.length > 0,
      conflicts: unresolvedConflicts,
      suggestions,
      canProceed
    }
  }

  /**
   * Real-time conflict checking during drag operations
   */
  checkDragConflicts(
    draggedEvent: UnifiedEvent,
    newStartTime: Date,
    newEndTime: Date,
    existingEvents: UnifiedEvent[]
  ): ConflictResult {
    // Create a temporary event with new timing
    const tempEvent: UnifiedEvent = {
      ...draggedEvent,
      startDateTime: newStartTime.toISOString(),
      endDateTime: newEndTime.toISOString(),
      duration: Math.round((newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60))
    }

    // Exclude the original event from conflict detection
    const otherEvents = existingEvents.filter(event => event.id !== draggedEvent.id)
    
    return this.detectConflicts(tempEvent, otherEvents)
  }

  /**
   * Batch conflict detection for multiple events
   */
  detectBatchConflicts(events: UnifiedEvent[]): Map<string, ConflictResult> {
    const results = new Map<string, ConflictResult>()
    
    for (let i = 0; i < events.length; i++) {
      const currentEvent = events[i]
      const otherEvents = events.filter((_, index) => index !== i)
      
      const conflictResult = this.detectConflicts(currentEvent, otherEvents)
      results.set(currentEvent.id, conflictResult)
    }
    
    return results
  }

  /**
   * Run a specific conflict detection rule
   */
  private runConflictRule(
    rule: ConflictRule,
    proposedEvent: UnifiedEvent,
    existingEvents: UnifiedEvent[]
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = []

    switch (rule.type) {
      case 'temporal_overlap':
        conflicts.push(...this.detectTemporalOverlaps(rule, proposedEvent, existingEvents))
        break
      
      case 'buffer_violation':
        conflicts.push(...this.detectBufferViolations(rule, proposedEvent, existingEvents))
        break
      
      case 'resource_conflict':
        conflicts.push(...this.detectResourceConflicts(rule, proposedEvent, existingEvents))
        break
      
      case 'business_rule':
        conflicts.push(...this.detectBusinessRuleViolations(rule, proposedEvent, existingEvents))
        break
      
      case 'client_preference':
        conflicts.push(...this.detectClientPreferenceViolations(rule, proposedEvent, existingEvents))
        break
    }

    return conflicts
  }

  /**
   * Detect direct time overlaps between events
   */
  private detectTemporalOverlaps(
    rule: ConflictRule,
    proposedEvent: UnifiedEvent,
    existingEvents: UnifiedEvent[]
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = []

    // Validate proposedEvent has required fields
    if (!proposedEvent.startDateTime) {
      console.warn('Proposed event missing startDateTime:', proposedEvent)
      return conflicts
    }

    const proposedStart = parseISO(proposedEvent.startDateTime)
    const proposedEnd = proposedEvent.endDateTime
      ? parseISO(proposedEvent.endDateTime)
      : addMinutes(proposedStart, proposedEvent.duration || 60)

    for (const existingEvent of existingEvents) {
      // Validate existingEvent has required fields
      if (!existingEvent.startDateTime) {
        console.warn('Existing event missing startDateTime:', existingEvent)
        continue
      }

      const existingStart = parseISO(existingEvent.startDateTime)
      const existingEnd = existingEvent.endDateTime
        ? parseISO(existingEvent.endDateTime)
        : addMinutes(existingStart, existingEvent.duration || 60)

      // Check for overlap: events overlap if one starts before the other ends
      const hasOverlap = (
        (isBefore(proposedStart, existingEnd) && isAfter(proposedEnd, existingStart)) ||
        (isEqual(proposedStart, existingStart) || isEqual(proposedEnd, existingEnd))
      )

      if (hasOverlap) {
        const overlapStart = proposedStart > existingStart ? proposedStart : existingStart
        const overlapEnd = proposedEnd < existingEnd ? proposedEnd : existingEnd
        const overlapDuration = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60))

        conflicts.push({
          id: `temporal_${existingEvent.id}`,
          type: 'temporal_overlap',
          severity: rule.severity,
          message: `Event overlaps with "${existingEvent.title}" by ${overlapDuration} minutes`,
          conflictingEvent: existingEvent,
          proposedEvent,
          timeOverlap: {
            start: overlapStart,
            end: overlapEnd,
            durationMinutes: overlapDuration
          }
        })
      }
    }

    return conflicts
  }

  /**
   * Detect buffer time violations between events
   */
  private detectBufferViolations(
    rule: ConflictRule,
    proposedEvent: UnifiedEvent,
    existingEvents: UnifiedEvent[]
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = []
    const bufferTime = rule.bufferTimeMinutes || this.config.defaultBufferTimeMinutes
    const proposedStart = parseISO(proposedEvent.startDateTime)
    const proposedEnd = proposedEvent.endDateTime 
      ? parseISO(proposedEvent.endDateTime)
      : addMinutes(proposedStart, proposedEvent.duration || 60)

    for (const existingEvent of existingEvents) {
      const existingStart = parseISO(existingEvent.startDateTime)
      const existingEnd = existingEvent.endDateTime
        ? parseISO(existingEvent.endDateTime)
        : addMinutes(existingStart, existingEvent.duration || 60)

      // Check buffer time before proposed event
      const timeBefore = Math.abs(proposedStart.getTime() - existingEnd.getTime()) / (1000 * 60)
      if (existingEnd <= proposedStart && timeBefore < bufferTime) {
        conflicts.push({
          id: `buffer_before_${existingEvent.id}`,
          type: 'buffer_violation',
          severity: rule.severity,
          message: `Insufficient buffer time (${Math.round(timeBefore)}min) between "${existingEvent.title}" and proposed event. Required: ${bufferTime}min`,
          conflictingEvent: existingEvent,
          proposedEvent
        })
      }

      // Check buffer time after proposed event
      const timeAfter = Math.abs(existingStart.getTime() - proposedEnd.getTime()) / (1000 * 60)
      if (proposedEnd <= existingStart && timeAfter < bufferTime) {
        conflicts.push({
          id: `buffer_after_${existingEvent.id}`,
          type: 'buffer_violation',
          severity: rule.severity,
          message: `Insufficient buffer time (${Math.round(timeAfter)}min) between proposed event and "${existingEvent.title}". Required: ${bufferTime}min`,
          conflictingEvent: existingEvent,
          proposedEvent
        })
      }
    }

    return conflicts
  }

  /**
   * Detect resource conflicts (same client, equipment, etc.)
   */
  private detectResourceConflicts(
    rule: ConflictRule,
    proposedEvent: UnifiedEvent,
    existingEvents: UnifiedEvent[]
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = []

    for (const existingEvent of existingEvents) {
      const affectedResources: string[] = []

      // Check client conflicts
      if (proposedEvent.clientName && existingEvent.clientName && 
          proposedEvent.clientName === existingEvent.clientName) {
        affectedResources.push(`Client: ${proposedEvent.clientName}`)
      }

      // Check location conflicts (same location might indicate resource conflict)
      if (proposedEvent.location && existingEvent.location && 
          proposedEvent.location === existingEvent.location) {
        affectedResources.push(`Location: ${proposedEvent.location}`)
      }

      if (affectedResources.length > 0) {
        conflicts.push({
          id: `resource_${existingEvent.id}`,
          type: 'resource_conflict',
          severity: rule.severity,
          message: `Resource conflict with "${existingEvent.title}": ${affectedResources.join(', ')}`,
          conflictingEvent: existingEvent,
          proposedEvent,
          affectedResources
        })
      }
    }

    return conflicts
  }

  /**
   * Detect business rule violations
   */
  private detectBusinessRuleViolations(
    rule: ConflictRule,
    proposedEvent: UnifiedEvent,
    existingEvents: UnifiedEvent[]
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = []
    const proposedStart = parseISO(proposedEvent.startDateTime)

    // Check work hours
    const proposedHour = proposedStart.getHours()
    const proposedMinutes = proposedStart.getMinutes()
    const proposedTimeStr = `${proposedHour.toString().padStart(2, '0')}:${proposedMinutes.toString().padStart(2, '0')}`
    
    if (proposedTimeStr < this.config.workHours.start || proposedTimeStr > this.config.workHours.end) {
      conflicts.push({
        id: 'business_work_hours',
        type: 'business_rule',
        severity: rule.severity,
        message: `Event scheduled outside work hours (${this.config.workHours.start}-${this.config.workHours.end})`,
        conflictingEvent: proposedEvent, // Self-reference for business rule violations
        proposedEvent
      })
    }

    // Check work days
    const proposedDay = proposedStart.getDay()
    if (!this.config.workDays.includes(proposedDay)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      conflicts.push({
        id: 'business_work_days',
        type: 'business_rule',
        severity: rule.severity,
        message: `Event scheduled on non-work day (${dayNames[proposedDay]})`,
        conflictingEvent: proposedEvent,
        proposedEvent
      })
    }

    // Check blackout periods
    for (const blackout of this.config.blackoutPeriods) {
      if (proposedStart >= blackout.start && proposedStart <= blackout.end) {
        conflicts.push({
          id: `business_blackout_${blackout.reason}`,
          type: 'business_rule',
          severity: rule.severity,
          message: `Event scheduled during blackout period: ${blackout.reason}`,
          conflictingEvent: proposedEvent,
          proposedEvent
        })
      }
    }

    return conflicts
  }

  /**
   * Detect client preference violations
   */
  private detectClientPreferenceViolations(
    rule: ConflictRule,
    proposedEvent: UnifiedEvent,
    existingEvents: UnifiedEvent[]
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = []

    // Check if scheduling too many events for priority clients
    if (proposedEvent.clientName && this.config.priorityClients.includes(proposedEvent.clientName)) {
      const sameClientEvents = existingEvents.filter(event => 
        event.clientName === proposedEvent.clientName &&
        parseISO(event.startDateTime).toDateString() === parseISO(proposedEvent.startDateTime).toDateString()
      )

      if (sameClientEvents.length >= this.config.maxConflictsPerDay) {
        conflicts.push({
          id: 'client_max_per_day',
          type: 'client_preference',
          severity: rule.severity,
          message: `Too many appointments for priority client "${proposedEvent.clientName}" on this day`,
          conflictingEvent: proposedEvent,
          proposedEvent
        })
      }
    }

    return conflicts
  }

  /**
   * Generate resolution suggestions based on conflicts
   */
  private generateResolutionSuggestions(
    proposedEvent: UnifiedEvent,
    conflicts: ConflictDetail[],
    existingEvents: UnifiedEvent[]
  ): ResolutionSuggestion[] {
    const suggestions: ResolutionSuggestion[] = []

    if (conflicts.length === 0) return suggestions

    // Always offer cancel option
    suggestions.push({
      strategy: 'cancel',
      description: 'Cancel this event and do not schedule',
      estimatedImpact: 'Event will not be created',
      requiresClientNotification: false
    })

    // Always offer allow option for non-critical conflicts
    const hasCriticalConflicts = conflicts.some(c => c.severity === 'critical')
    if (!hasCriticalConflicts) {
      suggestions.push({
        strategy: 'allow',
        description: 'Allow scheduling despite conflicts',
        estimatedImpact: 'May cause scheduling issues that need manual resolution',
        requiresClientNotification: true
      })
    }

    // Suggest reschedule with alternative time slots
    const alternativeSlots = this.findAlternativeTimeSlots(proposedEvent, existingEvents)
    if (alternativeSlots.length > 0) {
      suggestions.push({
        strategy: 'reschedule',
        description: 'Reschedule to a different time',
        alternativeTimeSlots: alternativeSlots,
        estimatedImpact: 'Choose from available alternative time slots',
        requiresClientNotification: true
      })
    }

    return suggestions
  }

  /**
   * Check if an event has conflicts without generating suggestions (prevents infinite recursion)
   */
  private hasConflictsOnly(proposedEvent: UnifiedEvent, existingEvents: UnifiedEvent[]): boolean {
    const enabledRules = this.config.rules.filter(rule => rule.enabled)

    for (const rule of enabledRules) {
      const ruleConflicts = this.runConflictRule(rule, proposedEvent, existingEvents)
      if (ruleConflicts.length > 0) {
        return true
      }
    }

    return false
  }

  /**
   * Find alternative time slots that avoid conflicts
   */
  private findAlternativeTimeSlots(
    proposedEvent: UnifiedEvent,
    existingEvents: UnifiedEvent[]
  ): { start: Date; end: Date; confidence: number }[] {
    const alternatives: { start: Date; end: Date; confidence: number }[] = []
    const duration = proposedEvent.duration || 60
    const originalStart = parseISO(proposedEvent.startDateTime)
    
    // Try slots within the same day, +/- 2 hours from original time
    for (let offsetHours = -2; offsetHours <= 2; offsetHours += 0.5) {
      if (offsetHours === 0) continue // Skip original time
      
      const newStart = addMinutes(originalStart, offsetHours * 60)
      const newEnd = addMinutes(newStart, duration)
      
      // Check if this slot has conflicts (without generating suggestions to prevent recursion)
      const tempEvent = { ...proposedEvent, startDateTime: newStart.toISOString(), endDateTime: newEnd.toISOString() }
      const hasConflicts = this.hasConflictsOnly(tempEvent, existingEvents)
      
      if (!hasConflicts) {
        const confidence = 1 - Math.abs(offsetHours) / 4 // Closer to original time = higher confidence
        alternatives.push({ start: newStart, end: newEnd, confidence })
      }
    }
    
    return alternatives.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
  }

  /**
   * Get default conflict detection rules
   */
  private getDefaultRules(): ConflictRule[] {
    return [
      {
        id: 'temporal_overlap',
        name: 'Prevent Time Overlaps',
        type: 'temporal_overlap',
        enabled: true,
        severity: 'error'
      },
      {
        id: 'buffer_time',
        name: 'Enforce Buffer Time',
        type: 'buffer_violation',
        enabled: true,
        severity: 'warning',
        bufferTimeMinutes: 30
      },
      {
        id: 'client_double_booking',
        name: 'Prevent Client Double Booking',
        type: 'resource_conflict',
        enabled: true,
        severity: 'error'
      },
      {
        id: 'work_hours',
        name: 'Enforce Work Hours',
        type: 'business_rule',
        enabled: true,
        severity: 'warning'
      },
      {
        id: 'priority_client_limits',
        name: 'Priority Client Scheduling Limits',
        type: 'client_preference',
        enabled: true,
        severity: 'warning'
      }
    ]
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ConflictDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): ConflictDetectionConfig {
    return { ...this.config }
  }
}

// Export singleton instance with default configuration
export const conflictDetector = new ConflictDetector()