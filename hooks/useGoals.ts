/**
 * useGoals Hook
 *
 * React hook for managing goals and milestones in the Becky CRM mobile app.
 *
 * Features:
 * - Goal list management with filtering
 * - Milestone management
 * - Progress tracking
 * - Goal analytics
 * - Quick stats calculation
 *
 * @module hooks/useGoals
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  goalService,
  Goal,
  Milestone,
  GoalFilters,
  GoalStatistics,
  GoalQuickStats,
  GoalAnalytics,
  CreateGoalRequest,
  UpdateGoalRequest,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  GoalStatus,
  GoalTimeframe,
  GoalCategory,
  Priority,
  GOAL_CATEGORIES,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from '../services/goals';

export interface UseGoalsResult {
  // State
  goals: Goal[];
  milestones: Milestone[];
  statistics: GoalStatistics;
  quickStats: GoalQuickStats;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  initialized: boolean;

  // Filtered views
  activeGoals: Goal[];
  completedGoals: Goal[];
  overdueGoals: Goal[];
  pausedGoals: Goal[];
  upcomingDeadlines: (Goal | Milestone)[];

  // Filters
  filters: GoalFilters;
  setFilters: (filters: GoalFilters) => void;
  clearFilters: () => void;

  // Goal Actions
  initialize: () => Promise<boolean>;
  refresh: () => Promise<void>;
  fetchGoals: (filters?: GoalFilters) => Promise<void>;
  fetchMilestones: (goalId?: string) => Promise<void>;
  createGoal: (request: CreateGoalRequest) => Promise<Goal | null>;
  updateGoal: (id: string, updates: UpdateGoalRequest) => Promise<Goal | null>;
  deleteGoal: (id: string) => Promise<boolean>;
  updateProgress: (goalId: string, progress: number, notes?: string, timeSpent?: number) => Promise<Goal | null>;

  // Milestone Actions
  createMilestone: (request: CreateMilestoneRequest) => Promise<Milestone | null>;
  updateMilestone: (id: string, updates: UpdateMilestoneRequest) => Promise<Milestone | null>;
  deleteMilestone: (id: string) => Promise<boolean>;

  // Queries
  getGoalById: (id: string) => Goal | undefined;
  getMilestonesByGoalId: (goalId: string) => Milestone[];
  getGoalsByStatus: (status: GoalStatus) => Goal[];
  getGoalsByCategory: (category: GoalCategory) => Goal[];
  getGoalsByTimeframe: (timeframe: GoalTimeframe) => Goal[];
  searchGoals: (query: string) => Goal[];
  getGoalAnalytics: (goalId: string) => GoalAnalytics | null;

  // Helpers
  getPriorityColor: (priority: Priority) => string;
  getStatusColor: (status: GoalStatus) => string;
  getCategoryColor: (category: GoalCategory) => string;
  formatStatusName: (status: GoalStatus) => string;
  formatTimeframeName: (timeframe: GoalTimeframe) => string;
  isOverdue: (goal: Goal) => boolean;
  calculateProgressVelocity: (goalId: string, days?: number) => number;
  estimateCompletion: (goalId: string) => Date | null;
}

/**
 * Hook for managing goals
 *
 * @example
 * ```typescript
 * const {
 *   goals,
 *   quickStats,
 *   loading,
 *   activeGoals,
 *   overdueGoals,
 *   createGoal,
 *   updateProgress,
 * } = useGoals();
 *
 * // Create a new goal
 * await createGoal({
 *   title: 'Increase Revenue',
 *   category: 'business',
 *   timeframe: 'quarterly',
 *   priority: 'high',
 *   startDate: new Date().toISOString(),
 *   endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
 *   targetValue: 100000,
 * });
 *
 * // Update progress
 * await updateProgress('goal-id', 50, 'Halfway there!');
 * ```
 */
export function useGoals(): UseGoalsResult {
  // State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [filters, setFilters] = useState<GoalFilters>({});

  /**
   * Initialize the service
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    if (initialized) {
      return true;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await goalService.initialize();
      if (success) {
        // Load initial data from cache
        setGoals(goalService.getGoals());
        setMilestones(goalService.getMilestones());
        setInitialized(true);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  /**
   * Fetch goals from API
   */
  const fetchGoals = useCallback(async (filterOverrides?: GoalFilters): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const appliedFilters = { ...filters, ...filterOverrides };
      const data = await goalService.fetchGoals(appliedFilters);
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Fetch milestones
   */
  const fetchMilestones = useCallback(async (goalId?: string): Promise<void> => {
    try {
      const data = await goalService.fetchMilestones(goalId);
      if (goalId) {
        // Update only this goal's milestones
        setMilestones((prev) => [
          ...prev.filter((m) => m.goalId !== goalId),
          ...data,
        ]);
      } else {
        setMilestones(data);
      }
    } catch (err) {
      console.error('[useGoals] Error fetching milestones:', err);
    }
  }, []);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.all([fetchGoals(), fetchMilestones()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchGoals, fetchMilestones]);

  /**
   * Create a new goal
   */
  const createGoal = useCallback(
    async (request: CreateGoalRequest): Promise<Goal | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await goalService.createGoal(request);
        if (result) {
          setGoals(goalService.getGoals());
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create goal');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update a goal
   */
  const updateGoal = useCallback(
    async (id: string, updates: UpdateGoalRequest): Promise<Goal | null> => {
      setError(null);

      try {
        const result = await goalService.updateGoal(id, updates);
        if (result) {
          setGoals(goalService.getGoals());
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update goal');
        return null;
      }
    },
    []
  );

  /**
   * Delete a goal
   */
  const deleteGoal = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const success = await goalService.deleteGoal(id);
      if (success) {
        setGoals(goalService.getGoals());
        setMilestones(goalService.getMilestones());
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
      return false;
    }
  }, []);

  /**
   * Update goal progress
   */
  const updateProgress = useCallback(
    async (
      goalId: string,
      progress: number,
      notes?: string,
      timeSpent?: number
    ): Promise<Goal | null> => {
      setError(null);

      try {
        const result = await goalService.updateProgress(goalId, progress, notes, timeSpent);
        if (result) {
          setGoals(goalService.getGoals());
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update progress');
        return null;
      }
    },
    []
  );

  /**
   * Create a milestone
   */
  const createMilestone = useCallback(
    async (request: CreateMilestoneRequest): Promise<Milestone | null> => {
      setError(null);

      try {
        const result = await goalService.createMilestone(request);
        if (result) {
          setMilestones(goalService.getMilestones());
          setGoals(goalService.getGoals());
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create milestone');
        return null;
      }
    },
    []
  );

  /**
   * Update a milestone
   */
  const updateMilestone = useCallback(
    async (id: string, updates: UpdateMilestoneRequest): Promise<Milestone | null> => {
      setError(null);

      try {
        const result = await goalService.updateMilestone(id, updates);
        if (result) {
          setMilestones(goalService.getMilestones());
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update milestone');
        return null;
      }
    },
    []
  );

  /**
   * Delete a milestone
   */
  const deleteMilestone = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const success = await goalService.deleteMilestone(id);
      if (success) {
        setMilestones(goalService.getMilestones());
        setGoals(goalService.getGoals());
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete milestone');
      return false;
    }
  }, []);

  /**
   * Get goal by ID
   */
  const getGoalById = useCallback((id: string): Goal | undefined => {
    return goalService.getGoalById(id);
  }, []);

  /**
   * Get milestones for a goal
   */
  const getMilestonesByGoalId = useCallback((goalId: string): Milestone[] => {
    return goalService.getMilestonesByGoalId(goalId);
  }, []);

  /**
   * Get goals by status
   */
  const getGoalsByStatus = useCallback((status: GoalStatus): Goal[] => {
    return goalService.getGoalsByStatus(status);
  }, []);

  /**
   * Get goals by category
   */
  const getGoalsByCategory = useCallback((category: GoalCategory): Goal[] => {
    return goalService.getGoalsByCategory(category);
  }, []);

  /**
   * Get goals by timeframe
   */
  const getGoalsByTimeframe = useCallback((timeframe: GoalTimeframe): Goal[] => {
    return goalService.getGoalsByTimeframe(timeframe);
  }, []);

  /**
   * Search goals
   */
  const searchGoals = useCallback((query: string): Goal[] => {
    return goalService.searchGoals(query);
  }, []);

  /**
   * Get goal analytics
   */
  const getGoalAnalytics = useCallback((goalId: string): GoalAnalytics | null => {
    return goalService.getGoalAnalytics(goalId);
  }, []);

  /**
   * Clear filters
   */
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  /**
   * Check if a goal is overdue
   */
  const isOverdue = useCallback((goal: Goal): boolean => {
    const now = new Date();
    return (
      new Date(goal.endDate) < now &&
      goal.status !== 'completed' &&
      goal.status !== 'cancelled'
    );
  }, []);

  /**
   * Get priority color
   */
  const getPriorityColor = useCallback((priority: Priority): string => {
    return goalService.getPriorityColor(priority);
  }, []);

  /**
   * Get status color
   */
  const getStatusColor = useCallback((status: GoalStatus): string => {
    return goalService.getStatusColor(status);
  }, []);

  /**
   * Get category color
   */
  const getCategoryColor = useCallback((category: GoalCategory): string => {
    return goalService.getCategoryColor(category);
  }, []);

  /**
   * Format status name
   */
  const formatStatusName = useCallback((status: GoalStatus): string => {
    return goalService.formatStatusName(status);
  }, []);

  /**
   * Format timeframe name
   */
  const formatTimeframeName = useCallback((timeframe: GoalTimeframe): string => {
    return goalService.formatTimeframeName(timeframe);
  }, []);

  /**
   * Calculate progress velocity
   */
  const calculateProgressVelocity = useCallback((goalId: string, days: number = 7): number => {
    return goalService.calculateProgressVelocity(goalId, days);
  }, []);

  /**
   * Estimate completion date
   */
  const estimateCompletion = useCallback((goalId: string): Date | null => {
    return goalService.estimateCompletion(goalId);
  }, []);

  // Calculate statistics
  const statistics = useMemo((): GoalStatistics => {
    return goalService.getStatistics();
  }, [goals, milestones]);

  // Calculate quick stats
  const quickStats = useMemo((): GoalQuickStats => {
    return goalService.getQuickStats();
  }, [goals]);

  // Filtered views
  const activeGoals = useMemo((): Goal[] => {
    return goals.filter((g) => g.status === 'in-progress');
  }, [goals]);

  const completedGoals = useMemo((): Goal[] => {
    return goals.filter((g) => g.status === 'completed');
  }, [goals]);

  const overdueGoals = useMemo((): Goal[] => {
    return goalService.getOverdueGoals();
  }, [goals]);

  const pausedGoals = useMemo((): Goal[] => {
    return goals.filter((g) => g.status === 'paused');
  }, [goals]);

  const upcomingDeadlines = useMemo((): (Goal | Milestone)[] => {
    return goalService.getUpcomingDeadlines(7);
  }, [goals, milestones]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Fetch data when filters change
  useEffect(() => {
    if (initialized && Object.keys(filters).length > 0) {
      fetchGoals();
    }
  }, [initialized, filters, fetchGoals]);

  return {
    // State
    goals,
    milestones,
    statistics,
    quickStats,
    loading,
    refreshing,
    error,
    initialized,

    // Filtered views
    activeGoals,
    completedGoals,
    overdueGoals,
    pausedGoals,
    upcomingDeadlines,

    // Filters
    filters,
    setFilters,
    clearFilters,

    // Goal Actions
    initialize,
    refresh,
    fetchGoals,
    fetchMilestones,
    createGoal,
    updateGoal,
    deleteGoal,
    updateProgress,

    // Milestone Actions
    createMilestone,
    updateMilestone,
    deleteMilestone,

    // Queries
    getGoalById,
    getMilestonesByGoalId,
    getGoalsByStatus,
    getGoalsByCategory,
    getGoalsByTimeframe,
    searchGoals,
    getGoalAnalytics,

    // Helpers
    getPriorityColor,
    getStatusColor,
    getCategoryColor,
    formatStatusName,
    formatTimeframeName,
    isOverdue,
    calculateProgressVelocity,
    estimateCompletion,
  };
}

// Re-export types for convenience
export type {
  Goal,
  Milestone,
  GoalFilters,
  GoalStatistics,
  GoalQuickStats,
  GoalAnalytics,
  CreateGoalRequest,
  UpdateGoalRequest,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  GoalStatus,
  GoalTimeframe,
  GoalCategory,
  Priority,
};

export { GOAL_CATEGORIES, PRIORITY_COLORS, STATUS_COLORS };
