// src/hooks/useGoals.ts
// React Hook for Goal and Milestone Management

import { useState, useEffect, useCallback } from 'react'
import { GoalsManager } from '@/lib/goals-manager'
import { 
  Goal, 
  Milestone, 
  Objective,
  GoalAnalytics,
  GoalTimeframe,
  GoalStatus,
  GoalCategory,
  Priority
} from '@/types/goals'

interface UseGoalsOptions {
  autoLoad?: boolean
  syncInterval?: number // milliseconds
}

interface UseGoalsReturn {
  // Data
  goals: Goal[]
  milestones: Milestone[]
  isLoading: boolean
  error: string | null
  
  // Statistics
  statistics: ReturnType<typeof GoalsManager.getGoalStatistics>
  
  // Goal Actions
  createGoal: (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Goal>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<Goal | null>
  deleteGoal: (id: string) => Promise<boolean>
  updateProgress: (goalId: string, progress: number, notes?: string, timeSpent?: number) => Promise<void>
  
  // Milestone Actions
  createMilestone: (milestoneData: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Milestone>
  updateMilestone: (id: string, updates: Partial<Milestone>) => Promise<Milestone | null>
  deleteMilestone: (id: string) => Promise<boolean>
  
  // Queries
  getGoalsByTimeframe: (timeframe: GoalTimeframe, year?: number) => Goal[]
  getGoalsByStatus: (status: GoalStatus) => Goal[]
  getGoalsByCategory: (category: GoalCategory) => Goal[]
  getGoalsByPriority: (priority: Priority) => Goal[]
  getOverdueGoals: () => Goal[]
  getUpcomingDeadlines: (days?: number) => (Goal | Milestone)[]
  getMilestonesByGoalId: (goalId: string) => Milestone[]
  
  // Analytics
  getGoalAnalytics: (goalId: string) => GoalAnalytics | null
  calculateProgressVelocity: (goalId: string, days?: number) => number
  estimateCompletion: (goalId: string) => Date | null
  checkDependencies: (goalId: string) => { canStart: boolean; blockedBy: string[] }
  
  // Utilities
  refreshData: () => Promise<void>
  searchGoals: (query: string) => Goal[]
  searchMilestones: (query: string) => Milestone[]
  
  // Import/Export
  exportData: () => object
  importData: (data: any) => Promise<{ goalsImported: number; milestonesImported: number }>
}

export const useGoals = (options: UseGoalsOptions = {}): UseGoalsReturn => {
  const { autoLoad = true, syncInterval } = options
  
  const [goals, setGoals] = useState<Goal[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Load data from storage
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const loadedGoals = GoalsManager.getAllGoals()
      const loadedMilestones = GoalsManager.getAllMilestones()
      
      setGoals(loadedGoals)
      setMilestones(loadedMilestones)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
      console.error('Error loading goals data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Auto-load data on mount
  useEffect(() => {
    if (autoLoad) {
      loadData()
    }
  }, [autoLoad, loadData])
  
  // Optional sync interval
  useEffect(() => {
    if (syncInterval && syncInterval > 0) {
      const interval = setInterval(loadData, syncInterval)
      return () => clearInterval(interval)
    }
  }, [syncInterval, loadData])
  
  // ============================================================================
  // GOAL ACTIONS
  // ============================================================================
  
  const createGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> => {
    setError(null)
    
    try {
      const newGoal = GoalsManager.createGoal(goalData)
      setGoals(prev => [...prev, newGoal])
      return newGoal
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create goal'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])
  
  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>): Promise<Goal | null> => {
    setError(null)
    
    try {
      const updatedGoal = GoalsManager.updateGoal(id, updates)
      if (updatedGoal) {
        setGoals(prev => prev.map(goal => goal.id === id ? updatedGoal : goal))
      }
      return updatedGoal
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update goal'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])
  
  const deleteGoal = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    
    try {
      const success = GoalsManager.deleteGoal(id)
      if (success) {
        setGoals(prev => prev.filter(goal => goal.id !== id))
        // Also remove related milestones from state
        setMilestones(prev => prev.filter(milestone => milestone.goalId !== id))
      }
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete goal'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])
  
  const updateProgress = useCallback(async (
    goalId: string, 
    progress: number, 
    notes?: string, 
    timeSpent?: number
  ): Promise<void> => {
    setError(null)
    
    try {
      GoalsManager.updateProgress(goalId, progress, notes, timeSpent)
      
      // Refresh the specific goal from storage to get updated progress history
      const updatedGoal = GoalsManager.getGoalById(goalId)
      if (updatedGoal) {
        setGoals(prev => prev.map(goal => goal.id === goalId ? updatedGoal : goal))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update progress'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])
  
  // ============================================================================
  // MILESTONE ACTIONS
  // ============================================================================
  
  const createMilestone = useCallback(async (milestoneData: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>): Promise<Milestone> => {
    setError(null)
    
    try {
      const newMilestone = GoalsManager.createMilestone(milestoneData)
      setMilestones(prev => [...prev, newMilestone])
      
      // Update parent goal in state
      const updatedGoal = GoalsManager.getGoalById(newMilestone.goalId)
      if (updatedGoal) {
        setGoals(prev => prev.map(goal => goal.id === newMilestone.goalId ? updatedGoal : goal))
      }
      
      return newMilestone
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create milestone'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])
  
  const updateMilestone = useCallback(async (id: string, updates: Partial<Milestone>): Promise<Milestone | null> => {
    setError(null)
    
    try {
      const updatedMilestone = GoalsManager.updateMilestone(id, updates)
      if (updatedMilestone) {
        setMilestones(prev => prev.map(milestone => milestone.id === id ? updatedMilestone : milestone))
      }
      return updatedMilestone
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update milestone'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])
  
  const deleteMilestone = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    
    try {
      const milestone = milestones.find(m => m.id === id)
      const success = GoalsManager.deleteMilestone(id)
      
      if (success) {
        setMilestones(prev => prev.filter(milestone => milestone.id !== id))
        
        // Update parent goal in state
        if (milestone) {
          const updatedGoal = GoalsManager.getGoalById(milestone.goalId)
          if (updatedGoal) {
            setGoals(prev => prev.map(goal => goal.id === milestone.goalId ? updatedGoal : goal))
          }
        }
      }
      
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete milestone'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [milestones])
  
  // ============================================================================
  // QUERY FUNCTIONS
  // ============================================================================
  
  const getGoalsByTimeframe = useCallback((timeframe: GoalTimeframe, year?: number): Goal[] => {
    return GoalsManager.getGoalsByTimeframe(timeframe, year)
  }, [])
  
  const getGoalsByStatus = useCallback((status: GoalStatus): Goal[] => {
    return goals.filter(goal => goal.status === status)
  }, [goals])
  
  const getGoalsByCategory = useCallback((category: GoalCategory): Goal[] => {
    return goals.filter(goal => goal.category === category)
  }, [goals])
  
  const getGoalsByPriority = useCallback((priority: Priority): Goal[] => {
    return goals.filter(goal => goal.priority === priority)
  }, [goals])
  
  const getOverdueGoals = useCallback((): Goal[] => {
    return GoalsManager.getOverdueGoals()
  }, [])
  
  const getUpcomingDeadlines = useCallback((days: number = 7): (Goal | Milestone)[] => {
    return GoalsManager.getUpcomingDeadlines(days)
  }, [])
  
  const getMilestonesByGoalId = useCallback((goalId: string): Milestone[] => {
    return milestones.filter(milestone => milestone.goalId === goalId)
  }, [milestones])
  
  // ============================================================================
  // ANALYTICS FUNCTIONS
  // ============================================================================
  
  const getGoalAnalytics = useCallback((goalId: string): GoalAnalytics | null => {
    try {
      return GoalsManager.generateGoalAnalytics(goalId)
    } catch (err) {
      console.error('Error generating goal analytics:', err)
      return null
    }
  }, [])
  
  const calculateProgressVelocity = useCallback((goalId: string, days: number = 7): number => {
    return GoalsManager.calculateProgressVelocity(goalId, days)
  }, [])
  
  const estimateCompletion = useCallback((goalId: string): Date | null => {
    return GoalsManager.estimateCompletion(goalId)
  }, [])
  
  const checkDependencies = useCallback((goalId: string): { canStart: boolean; blockedBy: string[] } => {
    return GoalsManager.checkDependencies(goalId)
  }, [])
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const refreshData = useCallback(async (): Promise<void> => {
    await loadData()
  }, [loadData])
  
  const searchGoals = useCallback((query: string): Goal[] => {
    const searchTerm = query.toLowerCase().trim()
    if (!searchTerm) return goals
    
    return goals.filter(goal => 
      goal.title.toLowerCase().includes(searchTerm) ||
      (goal.description && goal.description.toLowerCase().includes(searchTerm)) ||
      goal.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      (goal.notes && goal.notes.toLowerCase().includes(searchTerm))
    )
  }, [goals])
  
  const searchMilestones = useCallback((query: string): Milestone[] => {
    const searchTerm = query.toLowerCase().trim()
    if (!searchTerm) return milestones
    
    return milestones.filter(milestone => 
      milestone.title.toLowerCase().includes(searchTerm) ||
      (milestone.description && milestone.description.toLowerCase().includes(searchTerm)) ||
      milestone.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    )
  }, [milestones])
  
  // ============================================================================
  // IMPORT/EXPORT FUNCTIONS
  // ============================================================================
  
  const exportData = useCallback(() => {
    return GoalsManager.exportData()
  }, [])
  
  const importData = useCallback(async (data: any): Promise<{ goalsImported: number; milestonesImported: number }> => {
    setError(null)
    
    try {
      const result = GoalsManager.importData(data)
      await loadData() // Refresh state
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import data'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [loadData])
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const statistics = useCallback(() => {
    return GoalsManager.getGoalStatistics()
  }, [goals, milestones])
  
  return {
    // Data
    goals,
    milestones,
    isLoading,
    error,
    statistics: statistics(),
    
    // Goal Actions
    createGoal,
    updateGoal,
    deleteGoal,
    updateProgress,
    
    // Milestone Actions
    createMilestone,
    updateMilestone,
    deleteMilestone,
    
    // Queries
    getGoalsByTimeframe,
    getGoalsByStatus,
    getGoalsByCategory,
    getGoalsByPriority,
    getOverdueGoals,
    getUpcomingDeadlines,
    getMilestonesByGoalId,
    
    // Analytics
    getGoalAnalytics,
    calculateProgressVelocity,
    estimateCompletion,
    checkDependencies,
    
    // Utilities
    refreshData,
    searchGoals,
    searchMilestones,
    
    // Import/Export
    exportData,
    importData
  }
}

export default useGoals