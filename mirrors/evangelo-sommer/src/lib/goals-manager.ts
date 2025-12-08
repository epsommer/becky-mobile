// src/lib/goals-manager.ts
// Comprehensive Goals and Milestones Management System

import { 
  Goal, 
  Milestone, 
  Objective, 
  GoalTemplate,
  GoalAnalytics,
  GoalVisualizationSettings,
  ProgressEntry,
  GoalTimeframe,
  GoalStatus,
  GoalCategory,
  Priority,
  QUARTERS
} from '@/types/goals'

export class GoalsManager {
  private static readonly STORAGE_KEYS = {
    GOALS: 'time-manager-goals',
    MILESTONES: 'time-manager-milestones',
    OBJECTIVES: 'time-manager-objectives',
    TEMPLATES: 'time-manager-goal-templates',
    SETTINGS: 'time-manager-goal-settings',
    PROGRESS_HISTORY: 'time-manager-progress-history'
  }

  // ============================================================================
  // STORAGE UTILITIES
  // ============================================================================

  private static saveToStorage<T>(key: string, data: T[]): void {
    // SSR safety check
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error(`Failed to save to ${key}:`, error)
      throw new Error(`Storage error: ${error}`)
    }
  }

  private static loadFromStorage<T>(key: string): T[] {
    // SSR safety check
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error(`Failed to load from ${key}:`, error)
      return []
    }
  }

  private static generateId(): string {
    return `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private static getCurrentTimestamp(): string {
    return new Date().toISOString()
  }

  // ============================================================================
  // TIMEFRAME CALCULATIONS
  // ============================================================================

  static getCurrentQuarter(date: Date = new Date()): { quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; year: number } {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    const quarter = QUARTERS.find(q => month >= q.startMonth && month <= q.endMonth)
    return { quarter: quarter?.id || 'Q1', year }
  }

  static getTimeframeDates(timeframe: GoalTimeframe, date: Date = new Date(), customStart?: string, customEnd?: string): { start: Date; end: Date } {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    switch (timeframe) {
      case 'daily':
        return {
          start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
        }
      
      case 'weekly':
        const dayOfWeek = date.getDay()
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - dayOfWeek)
        weekStart.setHours(0, 0, 0, 0)
        
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)
        
        return { start: weekStart, end: weekEnd }
      
      case 'monthly':
        return {
          start: new Date(year, month, 1),
          end: new Date(year, month + 1, 0, 23, 59, 59)
        }
      
      case 'quarterly':
        const { quarter } = this.getCurrentQuarter(date)
        const q = QUARTERS.find(q => q.id === quarter)!
        return {
          start: q.startDate(year),
          end: q.endDate(year)
        }
      
      case 'yearly':
        return {
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31, 23, 59, 59)
        }
      
      case 'custom':
        if (customStart && customEnd) {
          return {
            start: new Date(customStart),
            end: new Date(customEnd)
          }
        }
        throw new Error('Custom timeframe requires start and end dates')
      
      default:
        throw new Error(`Unknown timeframe: ${timeframe}`)
    }
  }

  static isGoalInTimeframe(goal: Goal, timeframe: GoalTimeframe, referenceDate: Date = new Date()): boolean {
    const { start, end } = this.getTimeframeDates(timeframe, referenceDate)
    const goalStart = new Date(goal.startDate)
    const goalEnd = new Date(goal.endDate)
    
    // Check if goal overlaps with timeframe
    return goalStart <= end && goalEnd >= start
  }

  // ============================================================================
  // GOAL MANAGEMENT
  // ============================================================================

  static getAllGoals(): Goal[] {
    return this.loadFromStorage<Goal>(this.STORAGE_KEYS.GOALS)
  }

  static getGoalById(id: string): Goal | null {
    const goals = this.getAllGoals()
    return goals.find(goal => goal.id === id) || null
  }

  static createGoal(goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Goal {
    const newGoal: Goal = {
      ...goalData,
      id: this.generateId(),
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
      progressHistory: [],
      calendarEventIds: [],
      reminderIds: [],
      childGoalIds: [],
      milestoneIds: [],
      dependencies: [],
      tags: goalData.tags || [],
      attachments: goalData.attachments || []
    }

    // Validate goal data
    this.validateGoal(newGoal)

    // Set timeframe dates if not provided
    if (!goalData.startDate || !goalData.endDate) {
      const dates = this.getTimeframeDates(
        goalData.timeframe,
        new Date(),
        goalData.customTimeframe?.startDate,
        goalData.customTimeframe?.endDate
      )
      newGoal.startDate = newGoal.startDate || dates.start.toISOString()
      newGoal.endDate = newGoal.endDate || dates.end.toISOString()
    }

    const goals = this.getAllGoals()
    goals.push(newGoal)
    this.saveToStorage(this.STORAGE_KEYS.GOALS, goals)

    return newGoal
  }

  static updateGoal(id: string, updates: Partial<Goal>): Goal | null {
    const goals = this.getAllGoals()
    const goalIndex = goals.findIndex(goal => goal.id === id)
    
    if (goalIndex === -1) return null

    const updatedGoal = {
      ...goals[goalIndex],
      ...updates,
      updatedAt: this.getCurrentTimestamp()
    }

    this.validateGoal(updatedGoal)
    
    goals[goalIndex] = updatedGoal
    this.saveToStorage(this.STORAGE_KEYS.GOALS, goals)

    return updatedGoal
  }

  static deleteGoal(id: string): boolean {
    const goals = this.getAllGoals()
    const originalLength = goals.length
    const filteredGoals = goals.filter(goal => goal.id !== id)
    
    if (filteredGoals.length < originalLength) {
      this.saveToStorage(this.STORAGE_KEYS.GOALS, filteredGoals)
      
      // Also delete associated milestones
      const milestones = this.getAllMilestones()
      const filteredMilestones = milestones.filter(milestone => milestone.goalId !== id)
      this.saveToStorage(this.STORAGE_KEYS.MILESTONES, filteredMilestones)
      
      return true
    }
    
    return false
  }

  // ============================================================================
  // MILESTONE MANAGEMENT
  // ============================================================================

  static getAllMilestones(): Milestone[] {
    return this.loadFromStorage<Milestone>(this.STORAGE_KEYS.MILESTONES)
  }

  static getMilestoneById(id: string): Milestone | null {
    const milestones = this.getAllMilestones()
    return milestones.find(milestone => milestone.id === id) || null
  }

  static getMilestonesByGoalId(goalId: string): Milestone[] {
    const milestones = this.getAllMilestones()
    return milestones.filter(milestone => milestone.goalId === goalId)
  }

  static createMilestone(milestoneData: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>): Milestone {
    const newMilestone: Milestone = {
      ...milestoneData,
      id: this.generateId(),
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
      dependencies: milestoneData.dependencies || [],
      tags: milestoneData.tags || []
    }

    this.validateMilestone(newMilestone)

    const milestones = this.getAllMilestones()
    milestones.push(newMilestone)
    this.saveToStorage(this.STORAGE_KEYS.MILESTONES, milestones)

    // Update parent goal's milestone list
    const goal = this.getGoalById(newMilestone.goalId)
    if (goal) {
      this.updateGoal(goal.id, {
        milestoneIds: [...goal.milestoneIds, newMilestone.id]
      })
    }

    return newMilestone
  }

  static updateMilestone(id: string, updates: Partial<Milestone>): Milestone | null {
    const milestones = this.getAllMilestones()
    const milestoneIndex = milestones.findIndex(milestone => milestone.id === id)
    
    if (milestoneIndex === -1) return null

    const updatedMilestone = {
      ...milestones[milestoneIndex],
      ...updates,
      updatedAt: this.getCurrentTimestamp()
    }

    this.validateMilestone(updatedMilestone)
    
    milestones[milestoneIndex] = updatedMilestone
    this.saveToStorage(this.STORAGE_KEYS.MILESTONES, milestones)

    return updatedMilestone
  }

  static deleteMilestone(id: string): boolean {
    const milestones = this.getAllMilestones()
    const milestone = milestones.find(m => m.id === id)
    
    if (!milestone) return false

    const filteredMilestones = milestones.filter(milestone => milestone.id !== id)
    this.saveToStorage(this.STORAGE_KEYS.MILESTONES, filteredMilestones)

    // Update parent goal's milestone list
    const goal = this.getGoalById(milestone.goalId)
    if (goal) {
      this.updateGoal(goal.id, {
        milestoneIds: goal.milestoneIds.filter(mId => mId !== id)
      })
    }

    return true
  }

  // ============================================================================
  // PROGRESS TRACKING
  // ============================================================================

  static updateProgress(goalId: string, progress: number, notes?: string, timeSpent?: number): ProgressEntry {
    const goal = this.getGoalById(goalId)
    if (!goal) throw new Error('Goal not found')

    // Validate progress value
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100')
    }

    const progressEntry: ProgressEntry = {
      id: this.generateId(),
      goalId,
      date: this.getCurrentTimestamp(),
      progress,
      notes,
      timeSpent,
      createdAt: this.getCurrentTimestamp()
    }

    // Update goal progress
    const updatedGoal = this.updateGoal(goalId, {
      progress,
      currentValue: Math.round((progress / 100) * goal.targetValue),
      lastProgressUpdate: this.getCurrentTimestamp(),
      progressHistory: [...goal.progressHistory, progressEntry]
    })

    // Update status based on progress
    if (updatedGoal) {
      let newStatus: GoalStatus = updatedGoal.status
      
      if (progress === 100) {
        newStatus = 'completed'
      } else if (progress > 0 && updatedGoal.status === 'not-started') {
        newStatus = 'in-progress'
      }

      // Check if overdue
      const now = new Date()
      const endDate = new Date(updatedGoal.endDate)
      if (endDate < now && progress < 100) {
        newStatus = 'overdue'
      }

      if (newStatus !== updatedGoal.status) {
        this.updateGoal(goalId, { status: newStatus })
      }
    }

    return progressEntry
  }

  static getProgressHistory(goalId: string): ProgressEntry[] {
    const goal = this.getGoalById(goalId)
    return goal ? goal.progressHistory : []
  }

  static calculateProgressVelocity(goalId: string, days: number = 7): number {
    const history = this.getProgressHistory(goalId)
    if (history.length < 2) return 0

    const now = new Date()
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    
    const recentEntries = history
      .filter(entry => new Date(entry.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    if (recentEntries.length < 2) return 0

    const firstEntry = recentEntries[0]
    const lastEntry = recentEntries[recentEntries.length - 1]
    
    const progressDiff = lastEntry.progress - firstEntry.progress
    const timeDiff = new Date(lastEntry.date).getTime() - new Date(firstEntry.date).getTime()
    const daysDiff = timeDiff / (24 * 60 * 60 * 1000)

    return daysDiff > 0 ? progressDiff / daysDiff : 0
  }

  // ============================================================================
  // QUERYING AND FILTERING
  // ============================================================================

  static getGoalsByTimeframe(timeframe: GoalTimeframe, year?: number): Goal[] {
    const goals = this.getAllGoals()
    const referenceDate = year ? new Date(year, 0, 1) : new Date()
    
    return goals.filter(goal => this.isGoalInTimeframe(goal, timeframe, referenceDate))
  }

  static getGoalsByStatus(status: GoalStatus): Goal[] {
    const goals = this.getAllGoals()
    return goals.filter(goal => goal.status === status)
  }

  static getGoalsByCategory(category: GoalCategory): Goal[] {
    const goals = this.getAllGoals()
    return goals.filter(goal => goal.category === category)
  }

  static getGoalsByPriority(priority: Priority): Goal[] {
    const goals = this.getAllGoals()
    return goals.filter(goal => goal.priority === priority)
  }

  static getOverdueGoals(): Goal[] {
    const goals = this.getAllGoals()
    const now = new Date()
    
    return goals.filter(goal => {
      const endDate = new Date(goal.endDate)
      return endDate < now && goal.status !== 'completed' && goal.status !== 'cancelled'
    })
  }

  static getUpcomingDeadlines(days: number = 7): (Goal | Milestone)[] {
    const now = new Date()
    const cutoffDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000))
    
    const goals = this.getAllGoals()
    const milestones = this.getAllMilestones()
    
    const upcomingGoals = goals
      .filter(goal => {
        const endDate = new Date(goal.endDate)
        return endDate >= now && endDate <= cutoffDate && goal.status !== 'completed'
      })
      .map(goal => ({ ...goal, type: 'goal' as const }))
    
    const upcomingMilestones = milestones
      .filter(milestone => {
        const dueDate = new Date(milestone.dueDate)
        return dueDate >= now && dueDate <= cutoffDate && milestone.status !== 'completed'
      })
      .map(milestone => ({ ...milestone, type: 'milestone' as const }))
    
    return ([...upcomingGoals, ...upcomingMilestones] as (Goal | Milestone)[])
      .sort((a, b) => {
        const dateA = new Date('endDate' in a ? a.endDate : a.dueDate)
        const dateB = new Date('endDate' in b ? b.endDate : b.dueDate)
        return dateA.getTime() - dateB.getTime()
      })
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  static generateGoalAnalytics(goalId: string): GoalAnalytics {
    const goal = this.getGoalById(goalId)
    if (!goal) throw new Error('Goal not found')

    const now = new Date()
    const startDate = new Date(goal.startDate)
    const endDate = new Date(goal.endDate)
    const milestones = this.getMilestonesByGoalId(goalId)
    
    // Calculate progress velocity
    const velocity = this.calculateProgressVelocity(goalId)
    
    // Estimate completion date based on velocity
    let estimatedCompletionDate: string | undefined
    if (velocity > 0 && goal.progress < 100) {
      const remainingProgress = 100 - goal.progress
      const daysToComplete = remainingProgress / velocity
      const completionDate = new Date(now.getTime() + (daysToComplete * 24 * 60 * 60 * 1000))
      estimatedCompletionDate = completionDate.toISOString()
    }

    // Calculate time metrics
    const timeToDeadline = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    
    // Calculate risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (timeToDeadline < 0) {
      riskLevel = 'high' // Overdue
    } else if (estimatedCompletionDate && new Date(estimatedCompletionDate) > endDate) {
      riskLevel = 'high' // Won't meet deadline
    } else if (velocity < 1 && timeToDeadline < 30) {
      riskLevel = 'medium' // Slow progress with approaching deadline
    }

    // Milestone analysis
    const completedMilestones = milestones.filter(m => m.status === 'completed')
    const milestoneCompletionRate = milestones.length > 0 ? completedMilestones.length / milestones.length : 0

    // Time tracking
    const totalTimeSpent = goal.progressHistory.reduce((total, entry) => {
      return total + (entry.timeSpent || 0)
    }, 0)

    // Generate insights
    const insights: GoalAnalytics['insights'] = []
    
    if (riskLevel === 'high') {
      insights.push({
        type: 'error',
        message: timeToDeadline < 0 ? 'Goal is overdue' : 'Goal unlikely to meet deadline at current pace',
        actionable: true,
        suggestedAction: 'Consider extending deadline or increasing effort'
      })
    }
    
    if (velocity < 0.5 && goal.status === 'in-progress') {
      insights.push({
        type: 'warning',
        message: 'Progress has been slow recently',
        actionable: true,
        suggestedAction: 'Review blockers and consider adjusting approach'
      })
    }
    
    if (milestoneCompletionRate > 0.8) {
      insights.push({
        type: 'success',
        message: 'Excellent milestone completion rate',
        actionable: false
      })
    }

    return {
      goalId,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      progressVelocity: velocity,
      estimatedCompletionDate,
      timeToDeadline,
      riskLevel,
      timeSpent: Math.round(totalTimeSpent / 60), // Convert to hours
      timeRemaining: goal.estimatedHours ? goal.estimatedHours - Math.round(totalTimeSpent / 60) : undefined,
      efficiencyRating: goal.estimatedHours && totalTimeSpent > 0 
        ? Math.min(1, (goal.progress / 100) / (Math.round(totalTimeSpent / 60) / goal.estimatedHours))
        : 0,
      milestonesCompleted: completedMilestones.length,
      milestonesTotal: milestones.length,
      milestoneCompletionRate,
      averageMilestoneCompletion: completedMilestones.length > 0
        ? completedMilestones.reduce((avg, milestone) => {
            if (milestone.completedDate) {
              const created = new Date(milestone.createdAt)
              const completed = new Date(milestone.completedDate)
              const days = (completed.getTime() - created.getTime()) / (24 * 60 * 60 * 1000)
              return avg + days
            }
            return avg
          }, 0) / completedMilestones.length
        : 0,
      blockedBy: goal.dependencies,
      blocking: this.getAllGoals().filter(g => g.dependencies.includes(goalId)).map(g => g.id),
      historicalData: goal.progressHistory.map(entry => ({
        date: entry.date,
        progress: entry.progress,
        velocity: this.calculateProgressVelocity(goalId, 1), // Daily velocity
        hoursSpent: entry.timeSpent ? Math.round(entry.timeSpent / 60) : 0
      })),
      insights,
      calculatedAt: now.toISOString()
    }
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  private static validateGoal(goal: Goal): void {
    if (!goal.title || goal.title.trim().length === 0) {
      throw new Error('Goal title is required')
    }

    if (goal.progress < 0 || goal.progress > 100) {
      throw new Error('Progress must be between 0 and 100')
    }

    if (goal.targetValue <= 0) {
      throw new Error('Target value must be greater than 0')
    }

    if (new Date(goal.startDate) >= new Date(goal.endDate)) {
      throw new Error('End date must be after start date')
    }

    if (goal.timeframe === 'custom' && !goal.customTimeframe) {
      throw new Error('Custom timeframe details are required for custom timeframe goals')
    }
  }

  private static validateMilestone(milestone: Milestone): void {
    if (!milestone.title || milestone.title.trim().length === 0) {
      throw new Error('Milestone title is required')
    }

    if (!milestone.goalId) {
      throw new Error('Milestone must be associated with a goal')
    }

    if (milestone.progress < 0 || milestone.progress > 100) {
      throw new Error('Progress must be between 0 and 100')
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  static estimateCompletion(goalId: string): Date | null {
    const velocity = this.calculateProgressVelocity(goalId)
    const goal = this.getGoalById(goalId)
    
    if (!goal || velocity <= 0 || goal.progress >= 100) return null

    const remainingProgress = 100 - goal.progress
    const daysToComplete = remainingProgress / velocity
    
    return new Date(Date.now() + (daysToComplete * 24 * 60 * 60 * 1000))
  }

  static checkDependencies(goalId: string): { canStart: boolean; blockedBy: string[] } {
    const goal = this.getGoalById(goalId)
    if (!goal) return { canStart: true, blockedBy: [] }

    const blockedBy: string[] = []
    
    for (const depId of goal.dependencies) {
      const dependency = this.getGoalById(depId)
      if (dependency && dependency.status !== 'completed') {
        blockedBy.push(depId)
      }
    }

    return {
      canStart: blockedBy.length === 0,
      blockedBy
    }
  }

  static getGoalStatistics() {
    const goals = this.getAllGoals()
    const milestones = this.getAllMilestones()
    const now = new Date()
    
    return {
      total: goals.length,
      byStatus: {
        'not-started': goals.filter(g => g.status === 'not-started').length,
        'in-progress': goals.filter(g => g.status === 'in-progress').length,
        'completed': goals.filter(g => g.status === 'completed').length,
        'overdue': goals.filter(g => g.status === 'overdue').length,
        'cancelled': goals.filter(g => g.status === 'cancelled').length,
        'paused': goals.filter(g => g.status === 'paused').length
      },
      byTimeframe: {
        'daily': goals.filter(g => g.timeframe === 'daily').length,
        'weekly': goals.filter(g => g.timeframe === 'weekly').length,
        'monthly': goals.filter(g => g.timeframe === 'monthly').length,
        'quarterly': goals.filter(g => g.timeframe === 'quarterly').length,
        'yearly': goals.filter(g => g.timeframe === 'yearly').length,
        'custom': goals.filter(g => g.timeframe === 'custom').length
      },
      milestones: {
        total: milestones.length,
        completed: milestones.filter(m => m.status === 'completed').length,
        overdue: milestones.filter(m => {
          const dueDate = new Date(m.dueDate)
          return dueDate < now && m.status !== 'completed'
        }).length
      },
      averageProgress: goals.length > 0 
        ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) 
        : 0
    }
  }

  // ============================================================================
  // IMPORT/EXPORT
  // ============================================================================

  static exportData() {
    return {
      goals: this.getAllGoals(),
      milestones: this.getAllMilestones(),
      exportedAt: this.getCurrentTimestamp(),
      version: '1.0'
    }
  }

  static importData(data: { goals: Goal[]; milestones: Milestone[]; version?: string }) {
    // Validate import data
    if (!Array.isArray(data.goals) || !Array.isArray(data.milestones)) {
      throw new Error('Invalid import data format')
    }

    // Save imported data
    this.saveToStorage(this.STORAGE_KEYS.GOALS, data.goals)
    this.saveToStorage(this.STORAGE_KEYS.MILESTONES, data.milestones)
    
    return {
      goalsImported: data.goals.length,
      milestonesImported: data.milestones.length
    }
  }
}