"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  Goal, 
  Milestone, 
  Objective, 
  GoalTemplate, 
  GoalVisualizationSettings,
  GoalContextType,
  GoalStatus,
  GoalTimeframe,
  GoalCategory,
  Priority,
  ProgressEntry,
  GoalAnalytics
} from '@/types/goals'

const defaultSettings: GoalVisualizationSettings = {
  userId: 'default-user',
  defaultView: 'timeline',
  showProgress: true,
  showMilestones: true,
  showDependencies: true,
  compactMode: false,
  timelineZoom: 'week',
  showPastGoals: false,
  groupBy: 'category',
  colorScheme: 'category',
  customColors: {},
  showDeadlineWarnings: true,
  deadlineWarningDays: 7,
  showProgressReminders: true,
  progressReminderFrequency: 'weekly',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

// Mock data for demonstration
const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    title: 'Expand Client Base',
    description: 'Acquire 10 new landscaping clients by end of Q2',
    category: 'business',
    timeframe: 'quarterly',
    priority: 'high',
    status: 'in-progress',
    progress: 65,
    progressTarget: 100,
    progressUnit: 'percentage',
    currentValue: 6.5,
    targetValue: 10,
    startDate: new Date(2024, 0, 1).toISOString(),
    endDate: new Date(2024, 5, 30).toISOString(),
    parentGoalId: undefined,
    childGoalIds: [],
    milestoneIds: ['milestone-1', 'milestone-2'],
    dependencies: [],
    clientId: undefined,
    projectId: undefined,
    conversationId: undefined,
    calendarEventIds: [],
    reminderIds: [],
    progressHistory: [],
    reminderSettings: {
      enabled: true,
      frequency: 'weekly',
      time: '09:00',
      advanceNotice: 3
    },
    color: '#D4AF37',
    tags: ['growth', 'sales', 'marketing'],
    notes: 'Focus on residential properties in affluent neighborhoods',
    attachments: [],
    estimatedHours: 120,
    actualHours: 78,
    difficultyRating: 3,
    successMetrics: ['10 signed contracts', 'Revenue increase by 30%'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'goal-2',
    title: 'Complete Certification Course',
    description: 'Finish advanced horticulture certification program',
    category: 'learning',
    timeframe: 'monthly',
    priority: 'medium',
    status: 'in-progress',
    progress: 80,
    progressTarget: 100,
    progressUnit: 'percentage',
    currentValue: 8,
    targetValue: 10,
    startDate: new Date(2024, 2, 1).toISOString(),
    endDate: new Date(2024, 4, 31).toISOString(),
    parentGoalId: undefined,
    childGoalIds: [],
    milestoneIds: ['milestone-3'],
    dependencies: [],
    clientId: undefined,
    projectId: undefined,
    conversationId: undefined,
    calendarEventIds: [],
    reminderIds: [],
    progressHistory: [],
    reminderSettings: {
      enabled: true,
      frequency: 'weekly',
      time: '18:00',
      advanceNotice: 7
    },
    color: '#D4AF37',
    tags: ['education', 'professional-development'],
    notes: 'Online course with practical assignments',
    attachments: [],
    estimatedHours: 60,
    actualHours: 48,
    difficultyRating: 2,
    successMetrics: ['Pass final exam', 'Complete all modules'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'goal-3',
    title: 'Daily Exercise Routine',
    description: 'Maintain daily 30-minute exercise routine',
    category: 'health',
    timeframe: 'daily',
    priority: 'medium',
    status: 'in-progress',
    progress: 75,
    progressTarget: 100,
    progressUnit: 'percentage',
    currentValue: 22,
    targetValue: 30,
    startDate: new Date(2024, 2, 1).toISOString(),
    endDate: new Date(2024, 11, 31).toISOString(),
    parentGoalId: undefined,
    childGoalIds: [],
    milestoneIds: [],
    dependencies: [],
    clientId: undefined,
    projectId: undefined,
    conversationId: undefined,
    calendarEventIds: [],
    reminderIds: [],
    progressHistory: [],
    reminderSettings: {
      enabled: true,
      frequency: 'daily',
      time: '07:00',
      advanceNotice: 0
    },
    color: '#EF4444',
    tags: ['fitness', 'health', 'routine'],
    notes: 'Mix of cardio and strength training',
    attachments: [],
    estimatedHours: 365,
    actualHours: 120,
    difficultyRating: 2,
    successMetrics: ['30 days streak', 'Improved fitness metrics'],
    recurring: {
      enabled: true,
      pattern: 'daily',
      interval: 1
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

const mockMilestones: Milestone[] = [
  {
    id: 'milestone-1',
    goalId: 'goal-1',
    title: 'Complete Marketing Campaign',
    description: 'Launch social media and local advertising campaign',
    type: 'checkpoint',
    dueDate: new Date(2024, 3, 15).toISOString(),
    priority: 'high',
    status: 'completed',
    progress: 100,
    dependencies: [],
    estimatedHours: 20,
    actualHours: 18,
    tags: ['marketing', 'advertising'],
    color: '#10B981',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'milestone-2',
    goalId: 'goal-1',
    title: 'Secure 5 Initial Clients',
    description: 'Sign contracts with first 5 new clients',
    type: 'deliverable',
    dueDate: new Date(2024, 4, 30).toISOString(),
    priority: 'high',
    status: 'in-progress',
    progress: 60,
    dependencies: ['milestone-1'],
    estimatedHours: 40,
    actualHours: 25,
    tags: ['sales', 'contracts'],
    color: '#D4AF37',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'milestone-3',
    goalId: 'goal-2',
    title: 'Final Certification Exam',
    description: 'Pass the final exam with 85% or higher',
    type: 'deadline',
    dueDate: new Date(2024, 4, 25).toISOString(),
    priority: 'high',
    status: 'not-started',
    progress: 0,
    dependencies: [],
    estimatedHours: 10,
    tags: ['exam', 'certification'],
    color: '#F59E0B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

const GoalContext = createContext<GoalContextType | undefined>(undefined)

interface GoalProviderProps {
  children: ReactNode
}

export const GoalProvider: React.FC<GoalProviderProps> = ({ children }) => {
  const [goals, setGoals] = useState<Goal[]>(mockGoals)
  const [milestones, setMilestones] = useState<Milestone[]>(mockMilestones)
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [templates, setTemplates] = useState<GoalTemplate[]>([])
  const [settings, setSettings] = useState<GoalVisualizationSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const storedGoals = localStorage.getItem('goals')
      const storedMilestones = localStorage.getItem('milestones')
      const storedSettings = localStorage.getItem('goal-settings')

      if (storedGoals) {
        setGoals(JSON.parse(storedGoals))
      }
      if (storedMilestones) {
        setMilestones(JSON.parse(storedMilestones))
      }
      if (storedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(storedSettings) })
      }
    } catch (error) {
      console.error('Error loading goals from localStorage:', error)
    }
  }, [])

  // Save to localStorage when data changes
  useEffect(() => {
    try {
      localStorage.setItem('goals', JSON.stringify(goals))
    } catch (error) {
      console.error('Error saving goals to localStorage:', error)
    }
  }, [goals])

  useEffect(() => {
    try {
      localStorage.setItem('milestones', JSON.stringify(milestones))
    } catch (error) {
      console.error('Error saving milestones to localStorage:', error)
    }
  }, [milestones])

  useEffect(() => {
    try {
      localStorage.setItem('goal-settings', JSON.stringify(settings))
    } catch (error) {
      console.error('Error saving goal settings to localStorage:', error)
    }
  }, [settings])

  // Goal CRUD operations
  const createGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> => {
    const newGoal: Goal = {
      ...goalData,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setGoals(prev => [...prev, newGoal])
    return newGoal
  }

  const updateGoal = async (id: string, updates: Partial<Goal>): Promise<Goal> => {
    const updatedGoal = { ...updates, updatedAt: new Date().toISOString() }
    
    setGoals(prev => prev.map(goal => 
      goal.id === id ? { ...goal, ...updatedGoal } : goal
    ))
    
    const goal = goals.find(g => g.id === id)
    return { ...goal!, ...updatedGoal }
  }

  const deleteGoal = async (id: string): Promise<void> => {
    setGoals(prev => prev.filter(goal => goal.id !== id))
    // Also remove associated milestones
    setMilestones(prev => prev.filter(milestone => milestone.goalId !== id))
  }

  // Milestone CRUD operations
  const createMilestone = async (milestoneData: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>): Promise<Milestone> => {
    const newMilestone: Milestone = {
      ...milestoneData,
      id: `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setMilestones(prev => [...prev, newMilestone])
    return newMilestone
  }

  const updateMilestone = async (id: string, updates: Partial<Milestone>): Promise<Milestone> => {
    const updatedMilestone = { ...updates, updatedAt: new Date().toISOString() }
    
    setMilestones(prev => prev.map(milestone => 
      milestone.id === id ? { ...milestone, ...updatedMilestone } : milestone
    ))
    
    const milestone = milestones.find(m => m.id === id)
    return { ...milestone!, ...updatedMilestone }
  }

  const deleteMilestone = async (id: string): Promise<void> => {
    setMilestones(prev => prev.filter(milestone => milestone.id !== id))
  }

  // Objective operations (placeholder)
  const createObjective = async (objectiveData: Omit<Objective, 'id' | 'createdAt' | 'updatedAt'>): Promise<Objective> => {
    throw new Error('Objectives not implemented yet')
  }

  const updateObjective = async (id: string, updates: Partial<Objective>): Promise<Objective> => {
    throw new Error('Objectives not implemented yet')
  }

  const deleteObjective = async (id: string): Promise<void> => {
    throw new Error('Objectives not implemented yet')
  }

  // Progress tracking
  const updateProgress = async (goalId: string, progress: number, notes?: string): Promise<void> => {
    const progressEntry: ProgressEntry = {
      id: `progress-${Date.now()}`,
      goalId,
      date: new Date().toISOString(),
      progress,
      notes,
      createdAt: new Date().toISOString()
    }

    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        return {
          ...goal,
          progress,
          progressHistory: [...goal.progressHistory, progressEntry],
          lastProgressUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
      return goal
    }))
  }

  // Query functions
  const getGoalsByTimeframe = (timeframe: GoalTimeframe, year?: number): Goal[] => {
    const currentYear = year || new Date().getFullYear()
    
    return goals.filter(goal => {
      if (goal.timeframe !== timeframe) return false
      
      const startDate = new Date(goal.startDate)
      const endDate = new Date(goal.endDate)
      
      return (startDate.getFullYear() === currentYear) || 
             (endDate.getFullYear() === currentYear)
    })
  }

  const getGoalsByStatus = (status: GoalStatus): Goal[] => {
    return goals.filter(goal => goal.status === status)
  }

  const getGoalsByCategory = (category: GoalCategory): Goal[] => {
    return goals.filter(goal => goal.category === category)
  }

  const getOverdueGoals = (): Goal[] => {
    const now = new Date()
    return goals.filter(goal => 
      goal.status !== 'completed' && 
      goal.status !== 'cancelled' && 
      new Date(goal.endDate) < now
    )
  }

  const getUpcomingDeadlines = (days: number): (Goal | Milestone)[] => {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(now.getDate() + days)

    const upcomingGoals = goals.filter(goal => {
      const endDate = new Date(goal.endDate)
      return endDate >= now && endDate <= futureDate && goal.status !== 'completed'
    })

    const upcomingMilestones = milestones.filter(milestone => {
      const dueDate = new Date(milestone.dueDate)
      return dueDate >= now && dueDate <= futureDate && milestone.status !== 'completed'
    })

    return [...upcomingGoals, ...upcomingMilestones].sort((a, b) => {
      const aDate = new Date('endDate' in a ? a.endDate : a.dueDate)
      const bDate = new Date('endDate' in b ? b.endDate : b.dueDate)
      return aDate.getTime() - bDate.getTime()
    })
  }

  const getGoalAnalytics = async (goalId: string): Promise<GoalAnalytics> => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) throw new Error('Goal not found')

    const goalMilestones = milestones.filter(m => m.goalId === goalId)
    const now = new Date()
    const endDate = new Date(goal.endDate)
    const timeToDeadline = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Calculate progress velocity
    const progressHistory = goal.progressHistory.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    let progressVelocity = 0
    if (progressHistory.length > 1) {
      const firstEntry = progressHistory[0]
      const lastEntry = progressHistory[progressHistory.length - 1]
      const days = Math.ceil(
        (new Date(lastEntry.date).getTime() - new Date(firstEntry.date).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (days > 0) {
        progressVelocity = (lastEntry.progress - firstEntry.progress) / days
      }
    }

    return {
      goalId,
      period: {
        start: goal.startDate,
        end: goal.endDate
      },
      progressVelocity,
      timeToDeadline: timeToDeadline > 0 ? timeToDeadline : undefined,
      riskLevel: timeToDeadline < 7 && goal.progress < 80 ? 'high' : 
                 timeToDeadline < 14 && goal.progress < 60 ? 'medium' : 'low',
      timeSpent: goal.actualHours || 0,
      timeRemaining: goal.estimatedHours ? goal.estimatedHours - (goal.actualHours || 0) : undefined,
      efficiencyRating: goal.estimatedHours ? Math.min(1, goal.progress / 100) : 0,
      milestonesCompleted: goalMilestones.filter(m => m.status === 'completed').length,
      milestonesTotal: goalMilestones.length,
      milestoneCompletionRate: goalMilestones.length ? 
        goalMilestones.filter(m => m.status === 'completed').length / goalMilestones.length : 0,
      averageMilestoneCompletion: 0, // TODO: Calculate from milestone history
      blockedBy: [],
      blocking: [],
      historicalData: progressHistory.map(entry => ({
        date: entry.date,
        progress: entry.progress,
        velocity: progressVelocity,
        hoursSpent: entry.timeSpent || 0
      })),
      insights: [],
      calculatedAt: new Date().toISOString()
    }
  }

  // Utility functions
  const calculateProgress = (goalId: string): number => {
    const goal = goals.find(g => g.id === goalId)
    return goal?.progress || 0
  }

  const estimateCompletion = (goalId: string): Date | null => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal || goal.progress >= 100) return null

    const progressHistory = goal.progressHistory.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    if (progressHistory.length < 2) return null

    const firstEntry = progressHistory[0]
    const lastEntry = progressHistory[progressHistory.length - 1]
    const days = Math.ceil(
      (new Date(lastEntry.date).getTime() - new Date(firstEntry.date).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (days <= 0) return null

    const progressVelocity = (lastEntry.progress - firstEntry.progress) / days
    if (progressVelocity <= 0) return null

    const remainingProgress = 100 - goal.progress
    const daysToCompletion = Math.ceil(remainingProgress / progressVelocity)
    
    const estimatedDate = new Date()
    estimatedDate.setDate(estimatedDate.getDate() + daysToCompletion)
    
    return estimatedDate
  }

  const checkDependencies = (goalId: string): { canStart: boolean; blockedBy: string[] } => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal || !goal.dependencies.length) {
      return { canStart: true, blockedBy: [] }
    }

    const blockedBy = goal.dependencies.filter(depId => {
      const depGoal = goals.find(g => g.id === depId)
      return depGoal && depGoal.status !== 'completed'
    })

    return {
      canStart: blockedBy.length === 0,
      blockedBy
    }
  }

  const generateInsights = async (goalId?: string): Promise<GoalAnalytics['insights']> => {
    // Placeholder for AI-generated insights
    return []
  }

  const contextValue: GoalContextType = {
    goals,
    milestones,
    objectives,
    templates,
    settings,
    isLoading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    createObjective,
    updateObjective,
    deleteObjective,
    updateProgress,
    getGoalsByTimeframe,
    getGoalsByStatus,
    getGoalsByCategory,
    getOverdueGoals,
    getUpcomingDeadlines,
    getGoalAnalytics,
    calculateProgress,
    estimateCompletion,
    checkDependencies,
    generateInsights
  }

  return (
    <GoalContext.Provider value={contextValue}>
      {children}
    </GoalContext.Provider>
  )
}

export const useGoals = (): GoalContextType => {
  const context = useContext(GoalContext)
  if (context === undefined) {
    throw new Error('useGoals must be used within a GoalProvider')
  }
  return context
}