import { UnifiedEvent } from '@/components/EventCreationModal'
import { ConflictResult, ConflictDetail } from '@/lib/conflict-detector'

export type DebugLogLevel = 'debug' | 'info' | 'warn' | 'error'
export type DebugCategory = 'event' | 'conflict' | 'drag' | 'api' | 'ui' | 'performance'

export interface DebugLogEntry {
  id: string
  timestamp: Date
  level: DebugLogLevel
  category: DebugCategory
  message: string
  data?: any
  component?: string
  userId?: string
  sessionId?: string
}

export interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: any
}

export interface EventOperation {
  id: string
  type: 'create' | 'update' | 'delete' | 'reschedule' | 'drag'
  event: UnifiedEvent
  timestamp: Date
  result: 'success' | 'error' | 'conflict'
  error?: string
  conflicts?: ConflictResult
  metadata?: any
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  summary: string
}

/**
 * Comprehensive debugging and monitoring system for calendar events
 */
export class EventDebugger {
  private static instance: EventDebugger | null = null
  private logs: DebugLogEntry[] = []
  private operations: EventOperation[] = []
  private performanceMetrics: PerformanceMetric[] = []
  private isEnabled: boolean = true
  private maxLogEntries: number = 1000
  private sessionId: string

  constructor() {
    this.sessionId = this.generateSessionId()
    this.setupPerformanceObserver()
  }

  static getInstance(): EventDebugger {
    if (!EventDebugger.instance) {
      EventDebugger.instance = new EventDebugger()
    }
    return EventDebugger.instance
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private setupPerformanceObserver(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name.includes('calendar') || entry.name.includes('event')) {
              this.recordPerformance(entry.name, entry.startTime, entry.startTime + entry.duration)
            }
          })
        })
        observer.observe({ entryTypes: ['measure', 'navigation'] })
      } catch (error) {
        console.warn('Performance Observer not supported:', error)
      }
    }
  }

  /**
   * Log a debug message
   */
  log(
    level: DebugLogLevel,
    category: DebugCategory,
    message: string,
    data?: any,
    component?: string
  ): void {
    if (!this.isEnabled) return

    const logEntry: DebugLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined, // Deep clone to prevent mutations
      component,
      sessionId: this.sessionId
    }

    this.logs.push(logEntry)
    this.trimLogs()

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
      console[consoleMethod](`[${category}:${component || 'unknown'}] ${message}`, data)
    }
  }

  /**
   * Log an event operation
   */
  logEventOperation(operation: Omit<EventOperation, 'id' | 'timestamp'>): void {
    const op: EventOperation = {
      ...operation,
      id: this.generateId(),
      timestamp: new Date()
    }

    this.operations.push(op)
    this.log('info', 'event', `Event ${operation.type}: ${operation.event.title}`, {
      eventId: operation.event.id,
      result: operation.result,
      hasConflicts: operation.conflicts?.hasConflicts || false
    })
  }

  /**
   * Record performance metrics
   */
  recordPerformance(name: string, startTime: number, endTime?: number): void {
    const metric: PerformanceMetric = {
      name,
      startTime,
      endTime,
      duration: endTime ? endTime - startTime : undefined
    }

    this.performanceMetrics.push(metric)
    
    if (metric.duration && metric.duration > 100) { // Log slow operations
      this.log('warn', 'performance', `Slow operation detected: ${name}`, {
        duration: metric.duration,
        threshold: 100
      })
    }
  }

  /**
   * Start a performance timer
   */
  startTimer(name: string): () => void {
    const startTime = performance.now()
    this.log('debug', 'performance', `Timer started: ${name}`)

    return () => {
      const endTime = performance.now()
      this.recordPerformance(name, startTime, endTime)
      this.log('debug', 'performance', `Timer ended: ${name}`, {
        duration: endTime - startTime
      })
    }
  }

  /**
   * Validate event data integrity
   */
  validateEvent(event: UnifiedEvent): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Required fields validation
    if (!event.id) errors.push('Event ID is required')
    if (!event.title) errors.push('Event title is required')
    if (!event.startDateTime) errors.push('Event start date/time is required')

    // Date/time validation
    try {
      const startDate = new Date(event.startDateTime)
      if (isNaN(startDate.getTime())) {
        errors.push('Invalid start date/time format')
      } else {
        // Check for reasonable date range
        const now = new Date()
        const maxFutureDate = new Date(now.getFullYear() + 2, 11, 31)
        const minPastDate = new Date(now.getFullYear() - 1, 0, 1)
        
        if (startDate > maxFutureDate) {
          warnings.push('Event scheduled more than 2 years in the future')
        }
        if (startDate < minPastDate) {
          warnings.push('Event scheduled more than 1 year in the past')
        }
      }

      if (event.endDateTime) {
        const endDate = new Date(event.endDateTime)
        if (isNaN(endDate.getTime())) {
          errors.push('Invalid end date/time format')
        } else if (endDate <= startDate) {
          errors.push('End date/time must be after start date/time')
        }
      }
    } catch (error) {
      errors.push('Error parsing event dates')
    }

    // Duration validation
    if (event.duration !== undefined) {
      if (event.duration <= 0) {
        errors.push('Event duration must be positive')
      }
      if (event.duration > 24 * 60) { // More than 24 hours
        warnings.push('Event duration exceeds 24 hours')
      }
    }

    // Priority validation
    const validPriorities = ['low', 'medium', 'high', 'urgent']
    if (event.priority && !validPriorities.includes(event.priority)) {
      errors.push(`Invalid priority: ${event.priority}`)
    }

    const isValid = errors.length === 0
    const summary = isValid 
      ? `Event validation passed${warnings.length > 0 ? ` with ${warnings.length} warnings` : ''}`
      : `Event validation failed with ${errors.length} errors`

    this.log(isValid ? 'info' : 'error', 'event', summary, {
      eventId: event.id,
      errors,
      warnings
    }, 'EventValidator')

    return {
      isValid,
      errors,
      warnings,
      summary
    }
  }

  /**
   * Validate conflict detection results
   */
  validateConflictResult(result: ConflictResult, context: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!result) {
      errors.push('Conflict result is null or undefined')
      return {
        isValid: false,
        errors,
        warnings,
        summary: 'Conflict result validation failed'
      }
    }

    // Validate conflict structure
    if (typeof result.hasConflicts !== 'boolean') {
      errors.push('hasConflicts must be a boolean')
    }

    if (!Array.isArray(result.conflicts)) {
      errors.push('conflicts must be an array')
    } else {
      result.conflicts.forEach((conflict, index) => {
        if (!conflict.id) errors.push(`Conflict ${index}: missing ID`)
        if (!conflict.type) errors.push(`Conflict ${index}: missing type`)
        if (!conflict.severity) errors.push(`Conflict ${index}: missing severity`)
        if (!conflict.message) errors.push(`Conflict ${index}: missing message`)
      })
    }

    if (!Array.isArray(result.suggestions)) {
      errors.push('suggestions must be an array')
    }

    if (typeof result.canProceed !== 'boolean') {
      errors.push('canProceed must be a boolean')
    }

    // Logical validation
    if (result.hasConflicts && result.conflicts.length === 0) {
      warnings.push('hasConflicts is true but conflicts array is empty')
    }

    if (!result.hasConflicts && result.conflicts.length > 0) {
      warnings.push('hasConflicts is false but conflicts array is not empty')
    }

    const isValid = errors.length === 0
    const summary = `Conflict result validation ${isValid ? 'passed' : 'failed'} for ${context}`

    this.log(isValid ? 'info' : 'error', 'conflict', summary, {
      context,
      hasConflicts: result.hasConflicts,
      conflictCount: result.conflicts?.length || 0,
      errors,
      warnings
    }, 'ConflictValidator')

    return {
      isValid,
      errors,
      warnings,
      summary
    }
  }

  /**
   * Get debug statistics
   */
  getStatistics(): any {
    return {
      sessionId: this.sessionId,
      totalLogs: this.logs.length,
      totalOperations: this.operations.length,
      totalMetrics: this.performanceMetrics.length,
      logsByLevel: this.groupByField(this.logs, 'level'),
      logsByCategory: this.groupByField(this.logs, 'category'),
      operationsByType: this.groupByField(this.operations, 'type'),
      operationsByResult: this.groupByField(this.operations, 'result'),
      averagePerformance: this.calculateAveragePerformance(),
      recentErrors: this.logs.filter(log => log.level === 'error').slice(-10),
      recentConflicts: this.operations.filter(op => op.conflicts?.hasConflicts).slice(-5)
    }
  }

  /**
   * Export debug data for analysis
   */
  exportDebugData(): string {
    const data = {
      metadata: {
        sessionId: this.sessionId,
        exportTime: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      },
      logs: this.logs,
      operations: this.operations,
      performanceMetrics: this.performanceMetrics,
      statistics: this.getStatistics()
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * Clear all debug data
   */
  clear(): void {
    this.logs = []
    this.operations = []
    this.performanceMetrics = []
    this.log('info', 'ui', 'Debug data cleared', {}, 'EventDebugger')
  }

  /**
   * Enable or disable debugging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    this.log('info', 'ui', `Debugging ${enabled ? 'enabled' : 'disabled'}`, {}, 'EventDebugger')
  }

  /**
   * Get filtered logs
   */
  getLogs(filters?: {
    level?: DebugLogLevel
    category?: DebugCategory
    component?: string
    startTime?: Date
    endTime?: Date
  }): DebugLogEntry[] {
    let filteredLogs = [...this.logs]

    if (filters) {
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level)
      }
      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category)
      }
      if (filters.component) {
        filteredLogs = filteredLogs.filter(log => log.component === filters.component)
      }
      if (filters.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startTime!)
      }
      if (filters.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endTime!)
      }
    }

    return filteredLogs
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private trimLogs(): void {
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries)
    }
  }

  private groupByField(array: any[], field: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const key = item[field] || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }

  private calculateAveragePerformance(): Record<string, number> {
    const grouped = this.performanceMetrics.reduce((acc, metric) => {
      if (metric.duration) {
        if (!acc[metric.name]) {
          acc[metric.name] = { total: 0, count: 0 }
        }
        acc[metric.name].total += metric.duration
        acc[metric.name].count += 1
      }
      return acc
    }, {} as Record<string, { total: number; count: number }>)

    return Object.entries(grouped).reduce((acc, [name, data]) => {
      acc[name] = data.total / data.count
      return acc
    }, {} as Record<string, number>)
  }
}

// Export singleton instance
export const eventDebugger = EventDebugger.getInstance()

// Global debug helpers for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).eventDebugger = eventDebugger
}