// src/types/goals.ts
// Comprehensive Goal and Milestone System Types

import { CalendarEvent } from './scheduling'

// Core Goal System Types
export type GoalTimeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
export type GoalStatus = 'not-started' | 'in-progress' | 'completed' | 'overdue' | 'cancelled' | 'paused'
export type MilestoneType = 'checkpoint' | 'deadline' | 'review' | 'deliverable'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type GoalCategory = 'business' | 'personal' | 'client' | 'project' | 'health' | 'learning' | 'financial'

// Quarter definitions
export interface Quarter {
  id: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  name: string
  startMonth: number // 0-based (0 = January)
  endMonth: number
  startDate: (year: number) => Date
  endDate: (year: number) => Date
}

// Custom timeframe definition
export interface CustomTimeframe {
  id: string
  name: string
  startDate: string // ISO date string
  endDate: string // ISO date string
  description?: string
  recurring?: {
    enabled: boolean
    interval: number // days
    endAfter?: number // occurrences
    endDate?: string // ISO date string
  }
}

// Progress tracking
export interface ProgressEntry {
  id: string
  goalId: string
  date: string // ISO date string
  progress: number // 0-100
  notes?: string
  attachments?: string[] // file paths or URLs
  timeSpent?: number // minutes
  createdAt: string
  createdBy?: string
}

// Milestone definition
export interface Milestone {
  id: string
  goalId: string
  title: string
  description?: string
  type: MilestoneType
  dueDate: string // ISO date string
  completedDate?: string // ISO date string
  priority: Priority
  status: GoalStatus
  progress: number // 0-100
  dependencies: string[] // other milestone IDs
  estimatedHours?: number
  actualHours?: number
  assignedTo?: string
  tags: string[]
  
  // Visual properties
  color?: string
  icon?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy?: string
}

// Main Goal interface
export interface Goal {
  id: string
  title: string
  description?: string
  category: GoalCategory
  timeframe: GoalTimeframe
  customTimeframe?: CustomTimeframe
  priority: Priority
  status: GoalStatus
  
  // Progress tracking
  progress: number // 0-100
  progressTarget: number // target value (default 100)
  progressUnit: string // 'percentage', 'tasks', 'hours', 'items', etc.
  currentValue: number // current achievement value
  targetValue: number // target achievement value
  
  // Dates
  startDate: string // ISO date string
  endDate: string // ISO date string
  completedDate?: string // ISO date string
  
  // Relationships
  parentGoalId?: string // for hierarchical goals
  childGoalIds: string[] // sub-goals
  milestoneIds: string[] // associated milestones
  dependencies: string[] // other goal IDs this depends on
  
  // Client/Project association
  clientId?: string
  projectId?: string
  conversationId?: string
  
  // Scheduling integration
  calendarEventIds: string[] // related calendar events
  reminderIds: string[] // scheduled reminders
  
  // Progress tracking
  progressHistory: ProgressEntry[]
  lastProgressUpdate?: string // ISO date string
  progressUpdateFrequency?: 'daily' | 'weekly' | 'monthly' // how often to track
  
  // Notifications and reminders
  reminderSettings: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
    customDays?: number[] // days of week (0=Sunday)
    time?: string // HH:MM format
    advanceNotice?: number // days before deadline
  }
  
  // Visual and organizational
  color?: string
  tags: string[]
  notes?: string
  attachments: string[] // file paths or URLs
  
  // Analytics and insights
  estimatedHours?: number
  actualHours?: number
  difficultyRating?: 1 | 2 | 3 | 4 | 5
  successMetrics?: string[]
  
  // Recurring goals
  recurring?: {
    enabled: boolean
    pattern: GoalTimeframe
    interval: number // every X periods
    endAfter?: number // number of occurrences
    endDate?: string // ISO date string
    nextOccurrenceDate?: string
  }
  
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy?: string
  lastModifiedBy?: string
}

// Objective (higher-level strategic goal)
export interface Objective {
  id: string
  title: string
  description?: string
  category: GoalCategory
  priority: Priority
  status: GoalStatus
  
  // Time-bound
  timeframe: 'quarterly' | 'yearly' | 'multi-year' | 'custom'
  startDate: string
  endDate: string
  
  // Associated goals
  goalIds: string[]
  keyResults: KeyResult[]
  
  // Progress (calculated from associated goals)
  progress: number // 0-100
  
  // Strategic alignment
  strategicThemes: string[]
  stakeholders: string[]
  
  // Success criteria
  successCriteria: string[]
  measurements: ObjectiveMeasurement[]
  
  // Visual
  color?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
}

// Key Result (OKR-style)
export interface KeyResult {
  id: string
  objectiveId: string
  title: string
  description?: string
  targetValue: number
  currentValue: number
  unit: string // 'percentage', 'count', 'currency', etc.
  measurementType: 'increase' | 'decrease' | 'maintain'
  dueDate: string
  status: GoalStatus
  confidence: number // 1-10 scale
  
  // Progress tracking
  progressHistory: {
    date: string
    value: number
    notes?: string
  }[]
  
  // Metadata
  createdAt: string
  updatedAt: string
}

// Objective measurement
export interface ObjectiveMeasurement {
  id: string
  objectiveId: string
  metric: string
  currentValue: number
  targetValue: number
  unit: string
  measurementDate: string
  notes?: string
}

// Goal template for quick creation
export interface GoalTemplate {
  id: string
  name: string
  description?: string
  category: GoalCategory
  defaultTimeframe: GoalTimeframe
  defaultPriority: Priority
  
  // Template structure
  goalStructure: {
    title: string
    description?: string
    milestones?: {
      title: string
      description?: string
      type: MilestoneType
      daysFromStart: number
      estimatedHours?: number
    }[]
    estimatedHours?: number
    successMetrics?: string[]
    tags?: string[]
  }
  
  // Usage tracking
  useCount: number
  lastUsed?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  isPublic: boolean
  createdBy?: string
}

// Goal analytics and insights
export interface GoalAnalytics {
  goalId: string
  period: {
    start: string
    end: string
  }
  
  // Progress metrics
  progressVelocity: number // progress per day
  estimatedCompletionDate?: string
  timeToDeadline?: number // days
  riskLevel: 'low' | 'medium' | 'high'
  
  // Effort tracking
  timeSpent: number // hours
  timeRemaining?: number // estimated hours
  efficiencyRating: number // 0-1 scale
  
  // Milestone analysis
  milestonesCompleted: number
  milestonesTotal: number
  milestoneCompletionRate: number // 0-1
  averageMilestoneCompletion: number // days
  
  // Dependency analysis
  blockedBy: string[] // goal IDs
  blocking: string[] // goal IDs
  
  // Historical performance
  historicalData: {
    date: string
    progress: number
    velocity: number
    hoursSpent: number
  }[]
  
  // Insights
  insights: {
    type: 'warning' | 'success' | 'info' | 'error'
    message: string
    actionable: boolean
    suggestedAction?: string
  }[]
  
  // Calculated at
  calculatedAt: string
}

// Goal visualization settings
export interface GoalVisualizationSettings {
  userId: string
  
  // Display preferences
  defaultView: 'timeline' | 'kanban' | 'calendar' | 'analytics'
  showProgress: boolean
  showMilestones: boolean
  showDependencies: boolean
  compactMode: boolean
  
  // Timeline settings
  timelineZoom: 'day' | 'week' | 'month' | 'quarter' | 'year'
  showPastGoals: boolean
  groupBy: 'category' | 'priority' | 'timeframe' | 'status'
  
  // Color coding
  colorScheme: 'category' | 'priority' | 'status' | 'custom'
  customColors: Record<string, string>
  
  // Notifications
  showDeadlineWarnings: boolean
  deadlineWarningDays: number
  showProgressReminders: boolean
  progressReminderFrequency: 'daily' | 'weekly' | 'monthly'
  
  // Metadata
  createdAt: string
  updatedAt: string
}

// Export utility types
export interface GoalContextType {
  // Data
  goals: Goal[]
  milestones: Milestone[]
  objectives: Objective[]
  templates: GoalTemplate[]
  settings: GoalVisualizationSettings
  isLoading: boolean
  error: string | null
  
  // Actions
  createGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Goal>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<Goal>
  deleteGoal: (id: string) => Promise<void>
  
  createMilestone: (milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Milestone>
  updateMilestone: (id: string, updates: Partial<Milestone>) => Promise<Milestone>
  deleteMilestone: (id: string) => Promise<void>
  
  createObjective: (objective: Omit<Objective, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Objective>
  updateObjective: (id: string, updates: Partial<Objective>) => Promise<Objective>
  deleteObjective: (id: string) => Promise<void>
  
  updateProgress: (goalId: string, progress: number, notes?: string) => Promise<void>
  
  // Queries
  getGoalsByTimeframe: (timeframe: GoalTimeframe, year?: number) => Goal[]
  getGoalsByStatus: (status: GoalStatus) => Goal[]
  getGoalsByCategory: (category: GoalCategory) => Goal[]
  getOverdueGoals: () => Goal[]
  getUpcomingDeadlines: (days: number) => (Goal | Milestone)[]
  getGoalAnalytics: (goalId: string) => Promise<GoalAnalytics>
  
  // Utilities
  calculateProgress: (goalId: string) => number
  estimateCompletion: (goalId: string) => Date | null
  checkDependencies: (goalId: string) => { canStart: boolean; blockedBy: string[] }
  generateInsights: (goalId?: string) => Promise<GoalAnalytics['insights']>
}

// Calendar integration types
export interface GoalCalendarEvent extends CalendarEvent {
  goalId?: string
  milestoneId?: string
  isGoalDeadline?: boolean
  isMilestone?: boolean
  goalProgress?: number
}

// Export constants
export const QUARTERS: Quarter[] = [
  {
    id: 'Q1',
    name: 'First Quarter',
    startMonth: 0, // January
    endMonth: 2,   // March
    startDate: (year: number) => new Date(year, 0, 1),
    endDate: (year: number) => new Date(year, 2, 31)
  },
  {
    id: 'Q2',
    name: 'Second Quarter',
    startMonth: 3, // April
    endMonth: 5,   // June
    startDate: (year: number) => new Date(year, 3, 1),
    endDate: (year: number) => new Date(year, 5, 30)
  },
  {
    id: 'Q3',
    name: 'Third Quarter',
    startMonth: 6, // July
    endMonth: 8,   // September
    startDate: (year: number) => new Date(year, 6, 1),
    endDate: (year: number) => new Date(year, 8, 30)
  },
  {
    id: 'Q4',
    name: 'Fourth Quarter',
    startMonth: 9,  // October
    endMonth: 11,   // December
    startDate: (year: number) => new Date(year, 9, 1),
    endDate: (year: number) => new Date(year, 11, 31)
  }
]

export const GOAL_CATEGORIES: { value: GoalCategory; label: string; color: string }[] = [
  { value: 'business', label: 'Business', color: '#D4AF37' },
  { value: 'personal', label: 'Personal', color: '#10B981' },
  { value: 'client', label: 'Client', color: '#F59E0B' },
  { value: 'project', label: 'Project', color: '#8B5CF6' },
  { value: 'health', label: 'Health', color: '#EF4444' },
  { value: 'learning', label: 'Learning', color: '#D4AF37' },
  { value: 'financial', label: 'Financial', color: '#84CC16' }
]

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#6B7280',
  medium: '#F59E0B',
  high: '#EF4444',
  urgent: '#DC2626'
}

export const STATUS_COLORS: Record<GoalStatus, string> = {
  'not-started': '#6B7280',
  'in-progress': '#D4AF37',
  'completed': '#10B981',
  'overdue': '#EF4444',
  'cancelled': '#9CA3AF',
  'paused': '#F59E0B'
}