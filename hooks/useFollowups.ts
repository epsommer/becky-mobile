/**
 * useFollowups Hook
 *
 * React hook for managing follow-ups in the Becky CRM mobile app.
 *
 * Features:
 * - Follow-up list management
 * - CRUD operations
 * - Filtering and search
 * - Quick stats calculation
 * - Notification scheduling
 *
 * @module hooks/useFollowups
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  followUpService,
  FollowUp,
  FollowUpFilters,
  FollowUpMetrics,
  FollowUpQuickStats,
  CreateFollowUpRequest,
  UpdateFollowUpRequest,
  CompleteFollowUpRequest,
  PriorityLevel,
  FollowUpStatus,
  FollowUpCategory,
} from '../services/followups';

export interface UseFollowupsResult {
  // State
  followUps: FollowUp[];
  metrics: FollowUpMetrics | null;
  quickStats: FollowUpQuickStats;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  initialized: boolean;

  // Filtered views
  todayFollowUps: FollowUp[];
  overdueFollowUps: FollowUp[];
  thisWeekFollowUps: FollowUp[];
  upcomingFollowUps: FollowUp[];
  completedFollowUps: FollowUp[];

  // Filters
  filters: FollowUpFilters;
  setFilters: (filters: FollowUpFilters) => void;
  clearFilters: () => void;

  // Actions
  initialize: () => Promise<boolean>;
  refresh: () => Promise<void>;
  fetchFollowUps: (filters?: FollowUpFilters) => Promise<void>;
  fetchMetrics: (clientId?: string) => Promise<void>;
  createFollowUp: (request: CreateFollowUpRequest) => Promise<FollowUp | null>;
  updateFollowUp: (id: string, updates: UpdateFollowUpRequest) => Promise<FollowUp | null>;
  completeFollowUp: (id: string, request: CompleteFollowUpRequest) => Promise<FollowUp | null>;
  rescheduleFollowUp: (id: string, newDate: string) => Promise<FollowUp | null>;
  cancelFollowUp: (id: string) => Promise<boolean>;
  deleteFollowUp: (id: string) => Promise<boolean>;
  getFollowUpById: (id: string) => FollowUp | undefined;
  getClientFollowUps: (clientId: string) => FollowUp[];

  // Helpers
  getPriorityColor: (priority: PriorityLevel) => string;
  getStatusColor: (status: FollowUpStatus) => string;
  formatCategoryName: (category: FollowUpCategory) => string;
  isOverdue: (followUp: FollowUp) => boolean;
}

/**
 * Hook for managing follow-ups
 *
 * @example
 * ```typescript
 * const {
 *   followUps,
 *   quickStats,
 *   loading,
 *   todayFollowUps,
 *   overdueFollowUps,
 *   createFollowUp,
 *   completeFollowUp,
 * } = useFollowups();
 *
 * // Create a new follow-up
 * await createFollowUp({
 *   clientId: 'client-id',
 *   title: 'Follow up call',
 *   scheduledDate: new Date().toISOString(),
 *   priority: 'HIGH',
 *   category: 'SERVICE_CHECK',
 * });
 * ```
 */
export function useFollowups(): UseFollowupsResult {
  // State
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [metrics, setMetrics] = useState<FollowUpMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [filters, setFilters] = useState<FollowUpFilters>({});

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
      const success = await followUpService.initialize();
      if (success) {
        // Load initial data from cache
        setFollowUps(followUpService.getFollowUps());
        setMetrics(followUpService.getMetrics());
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
   * Fetch follow-ups from API
   */
  const fetchFollowUps = useCallback(async (filterOverrides?: FollowUpFilters): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const appliedFilters = { ...filters, ...filterOverrides };
      const data = await followUpService.fetchFollowUps(appliedFilters);
      setFollowUps(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch follow-ups');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Fetch metrics
   */
  const fetchMetrics = useCallback(async (clientId?: string): Promise<void> => {
    try {
      const data = await followUpService.fetchMetrics(clientId);
      setMetrics(data);
    } catch (err) {
      console.error('[useFollowups] Error fetching metrics:', err);
    }
  }, []);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.all([fetchFollowUps(), fetchMetrics()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFollowUps, fetchMetrics]);

  /**
   * Create a new follow-up
   */
  const createFollowUp = useCallback(
    async (request: CreateFollowUpRequest): Promise<FollowUp | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await followUpService.createFollowUp(request);
        if (result) {
          setFollowUps(followUpService.getFollowUps());
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create follow-up');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update a follow-up
   */
  const updateFollowUp = useCallback(
    async (id: string, updates: UpdateFollowUpRequest): Promise<FollowUp | null> => {
      setError(null);

      try {
        const result = await followUpService.updateFollowUp(id, updates);
        if (result) {
          setFollowUps(followUpService.getFollowUps());
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update follow-up');
        return null;
      }
    },
    []
  );

  /**
   * Complete a follow-up
   */
  const completeFollowUp = useCallback(
    async (id: string, request: CompleteFollowUpRequest): Promise<FollowUp | null> => {
      setError(null);

      try {
        const result = await followUpService.completeFollowUp(id, request);
        if (result) {
          setFollowUps(followUpService.getFollowUps());
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete follow-up');
        return null;
      }
    },
    []
  );

  /**
   * Reschedule a follow-up
   */
  const rescheduleFollowUp = useCallback(
    async (id: string, newDate: string): Promise<FollowUp | null> => {
      setError(null);

      try {
        const result = await followUpService.rescheduleFollowUp(id, newDate);
        if (result) {
          setFollowUps(followUpService.getFollowUps());
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reschedule follow-up');
        return null;
      }
    },
    []
  );

  /**
   * Cancel a follow-up
   */
  const cancelFollowUp = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const success = await followUpService.cancelFollowUp(id);
      if (success) {
        setFollowUps(followUpService.getFollowUps());
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel follow-up');
      return false;
    }
  }, []);

  /**
   * Delete a follow-up
   */
  const deleteFollowUp = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const success = await followUpService.deleteFollowUp(id);
      if (success) {
        setFollowUps(followUpService.getFollowUps());
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete follow-up');
      return false;
    }
  }, []);

  /**
   * Get follow-up by ID
   */
  const getFollowUpById = useCallback((id: string): FollowUp | undefined => {
    return followUpService.getFollowUpById(id);
  }, []);

  /**
   * Get follow-ups for a client
   */
  const getClientFollowUps = useCallback((clientId: string): FollowUp[] => {
    return followUpService.getClientFollowUps(clientId);
  }, []);

  /**
   * Clear filters
   */
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  /**
   * Check if a follow-up is overdue
   */
  const isOverdue = useCallback((followUp: FollowUp): boolean => {
    const now = new Date();
    return (
      new Date(followUp.scheduledDate) < now &&
      ['SCHEDULED', 'CONFIRMED'].includes(followUp.status)
    );
  }, []);

  /**
   * Get priority color
   */
  const getPriorityColor = useCallback((priority: PriorityLevel): string => {
    return followUpService.getPriorityColor(priority);
  }, []);

  /**
   * Get status color
   */
  const getStatusColor = useCallback((status: FollowUpStatus): string => {
    return followUpService.getStatusColor(status);
  }, []);

  /**
   * Format category name
   */
  const formatCategoryName = useCallback((category: FollowUpCategory): string => {
    return followUpService.formatCategoryName(category);
  }, []);

  // Calculate quick stats
  const quickStats = useMemo((): FollowUpQuickStats => {
    return followUpService.calculateQuickStats();
  }, [followUps]);

  // Filtered views
  const todayFollowUps = useMemo((): FollowUp[] => {
    return followUpService.getTodayFollowUps();
  }, [followUps]);

  const overdueFollowUps = useMemo((): FollowUp[] => {
    return followUpService.getOverdueFollowUps();
  }, [followUps]);

  const thisWeekFollowUps = useMemo((): FollowUp[] => {
    return followUpService.getThisWeekFollowUps();
  }, [followUps]);

  const upcomingFollowUps = useMemo((): FollowUp[] => {
    const now = new Date();
    return followUps.filter(
      (fu) =>
        new Date(fu.scheduledDate) > now &&
        ['SCHEDULED', 'CONFIRMED'].includes(fu.status)
    );
  }, [followUps]);

  const completedFollowUps = useMemo((): FollowUp[] => {
    return followUps.filter((fu) => fu.status === 'COMPLETED');
  }, [followUps]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Fetch data when filters change
  useEffect(() => {
    if (initialized && Object.keys(filters).length > 0) {
      fetchFollowUps();
    }
  }, [initialized, filters, fetchFollowUps]);

  return {
    // State
    followUps,
    metrics,
    quickStats,
    loading,
    refreshing,
    error,
    initialized,

    // Filtered views
    todayFollowUps,
    overdueFollowUps,
    thisWeekFollowUps,
    upcomingFollowUps,
    completedFollowUps,

    // Filters
    filters,
    setFilters,
    clearFilters,

    // Actions
    initialize,
    refresh,
    fetchFollowUps,
    fetchMetrics,
    createFollowUp,
    updateFollowUp,
    completeFollowUp,
    rescheduleFollowUp,
    cancelFollowUp,
    deleteFollowUp,
    getFollowUpById,
    getClientFollowUps,

    // Helpers
    getPriorityColor,
    getStatusColor,
    formatCategoryName,
    isOverdue,
  };
}

// Re-export types for convenience
export type {
  FollowUp,
  FollowUpFilters,
  FollowUpMetrics,
  FollowUpQuickStats,
  CreateFollowUpRequest,
  UpdateFollowUpRequest,
  CompleteFollowUpRequest,
  PriorityLevel,
  FollowUpStatus,
  FollowUpCategory,
};
