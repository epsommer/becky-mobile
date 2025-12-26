/**
 * Goals Service for Becky CRM Mobile
 *
 * Handles:
 * - Goal CRUD operations
 * - Milestone management
 * - Progress tracking
 * - Goal analytics
 * - Local storage with API sync
 *
 * @module services/goals
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../lib/api/client';

// Storage keys
const STORAGE_KEYS = {
  GOALS: 'goals_cache',
  MILESTONES: 'milestones_cache',
  LAST_SYNC: 'goals_last_sync',
};

// Goal timeframe
export type GoalTimeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

// Goal status
export type GoalStatus = 'not-started' | 'in-progress' | 'completed' | 'overdue' | 'cancelled' | 'paused';

// Milestone type
export type MilestoneType = 'checkpoint' | 'deadline' | 'review' | 'deliverable';

// Priority level
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// Goal category
export type GoalCategory = 'business' | 'personal' | 'client' | 'project' | 'health' | 'learning' | 'financial';

// Progress entry
export interface ProgressEntry {
  id: string;
  goalId: string;
  date: string;
  progress: number;
  notes?: string;
  timeSpent?: number;
  createdAt: string;
}

// Milestone
export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  type: MilestoneType;
  dueDate: string;
  completedDate?: string;
  priority: Priority;
  status: GoalStatus;
  progress: number;
  dependencies: string[];
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  color?: string;
  createdAt: string;
  updatedAt: string;
}

// Custom timeframe
export interface CustomTimeframe {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
}

// Reminder settings
export interface ReminderSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  customDays?: number[];
  time?: string;
  advanceNotice?: number;
}

// Recurring settings
export interface RecurringSettings {
  enabled: boolean;
  pattern: GoalTimeframe;
  interval: number;
  endAfter?: number;
  endDate?: string;
  nextOccurrenceDate?: string;
}

// Goal
export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  timeframe: GoalTimeframe;
  customTimeframe?: CustomTimeframe;
  priority: Priority;
  status: GoalStatus;
  progress: number;
  progressTarget: number;
  progressUnit: string;
  currentValue: number;
  targetValue: number;
  startDate: string;
  endDate: string;
  completedDate?: string;
  parentGoalId?: string;
  childGoalIds: string[];
  milestoneIds: string[];
  dependencies: string[];
  clientId?: string;
  projectId?: string;
  calendarEventIds: string[];
  reminderIds: string[];
  progressHistory: ProgressEntry[];
  lastProgressUpdate?: string;
  progressUpdateFrequency?: 'daily' | 'weekly' | 'monthly';
  reminderSettings: ReminderSettings;
  color?: string;
  tags: string[];
  notes?: string;
  attachments: string[];
  estimatedHours?: number;
  actualHours?: number;
  recurring?: RecurringSettings;
  createdAt: string;
  updatedAt: string;
}

// Goal statistics
export interface GoalStatistics {
  total: number;
  byStatus: Record<GoalStatus, number>;
  byTimeframe: Record<GoalTimeframe, number>;
  byCategory: Record<GoalCategory, number>;
  milestones: {
    total: number;
    completed: number;
    overdue: number;
  };
  averageProgress: number;
}

// Goal analytics
export interface GoalAnalytics {
  goalId: string;
  progressVelocity: number;
  estimatedCompletionDate?: string;
  timeToDeadline: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeSpent: number;
  timeRemaining?: number;
  efficiencyRating: number;
  milestonesCompleted: number;
  milestonesTotal: number;
  milestoneCompletionRate: number;
  insights: {
    type: 'warning' | 'success' | 'info' | 'error';
    message: string;
    actionable: boolean;
    suggestedAction?: string;
  }[];
}

// Quick stats
export interface GoalQuickStats {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
  upcoming: number;
  averageProgress: number;
}

// Create goal request
export interface CreateGoalRequest {
  title: string;
  description?: string;
  category: GoalCategory;
  timeframe: GoalTimeframe;
  customTimeframe?: Omit<CustomTimeframe, 'id'>;
  priority: Priority;
  status?: GoalStatus;
  startDate: string;
  endDate: string;
  targetValue: number;
  progressUnit?: string;
  clientId?: string;
  projectId?: string;
  tags?: string[];
  color?: string;
  reminderSettings?: ReminderSettings;
  recurring?: RecurringSettings;
  estimatedHours?: number;
}

// Update goal request
export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  category?: GoalCategory;
  timeframe?: GoalTimeframe;
  customTimeframe?: CustomTimeframe;
  priority?: Priority;
  status?: GoalStatus;
  startDate?: string;
  endDate?: string;
  progress?: number;
  currentValue?: number;
  targetValue?: number;
  tags?: string[];
  color?: string;
  notes?: string;
  reminderSettings?: ReminderSettings;
  recurring?: RecurringSettings;
}

// Create milestone request
export interface CreateMilestoneRequest {
  goalId: string;
  title: string;
  description?: string;
  type: MilestoneType;
  dueDate: string;
  priority: Priority;
  estimatedHours?: number;
  tags?: string[];
  color?: string;
}

// Update milestone request
export interface UpdateMilestoneRequest {
  title?: string;
  description?: string;
  type?: MilestoneType;
  dueDate?: string;
  priority?: Priority;
  status?: GoalStatus;
  progress?: number;
  completedDate?: string;
  tags?: string[];
  color?: string;
}

// Filter options
export interface GoalFilters {
  status?: GoalStatus[];
  category?: GoalCategory[];
  timeframe?: GoalTimeframe[];
  priority?: Priority[];
  clientId?: string;
  overdueOnly?: boolean;
  upcomingDays?: number;
  searchQuery?: string;
}

// Category colors
export const GOAL_CATEGORIES: { value: GoalCategory; label: string; color: string }[] = [
  { value: 'business', label: 'Business', color: '#D4AF37' },
  { value: 'personal', label: 'Personal', color: '#10B981' },
  { value: 'client', label: 'Client', color: '#F59E0B' },
  { value: 'project', label: 'Project', color: '#8B5CF6' },
  { value: 'health', label: 'Health', color: '#EF4444' },
  { value: 'learning', label: 'Learning', color: '#3B82F6' },
  { value: 'financial', label: 'Financial', color: '#84CC16' },
];

// Priority colors
export const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#6B7280',
  medium: '#F59E0B',
  high: '#EF4444',
  urgent: '#DC2626',
};

// Status colors
export const STATUS_COLORS: Record<GoalStatus, string> = {
  'not-started': '#6B7280',
  'in-progress': '#D4AF37',
  'completed': '#10B981',
  'overdue': '#EF4444',
  'cancelled': '#9CA3AF',
  'paused': '#F59E0B',
};

/**
 * GoalService - Singleton service for managing goals
 */
class GoalService {
  private static instance: GoalService;
  private goals: Goal[] = [];
  private milestones: Milestone[] = [];
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): GoalService {
    if (!GoalService.instance) {
      GoalService.instance = new GoalService();
    }
    return GoalService.instance;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      console.log('[GoalService] Initializing...');
      await this.loadFromCache();
      this.initialized = true;
      console.log('[GoalService] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[GoalService] Initialization error:', error);
      return false;
    }
  }

  /**
   * Load goals from cache
   */
  private async loadFromCache(): Promise<void> {
    try {
      const cachedGoals = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
      if (cachedGoals) {
        this.goals = JSON.parse(cachedGoals);
      }

      const cachedMilestones = await AsyncStorage.getItem(STORAGE_KEYS.MILESTONES);
      if (cachedMilestones) {
        this.milestones = JSON.parse(cachedMilestones);
      }
    } catch (error) {
      console.error('[GoalService] Error loading from cache:', error);
    }
  }

  /**
   * Save goals to cache
   */
  private async saveToCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(this.goals));
      await AsyncStorage.setItem(STORAGE_KEYS.MILESTONES, JSON.stringify(this.milestones));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('[GoalService] Error saving to cache:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Fetch goals from API
   */
  async fetchGoals(filters?: GoalFilters): Promise<Goal[]> {
    try {
      const queryParams: Record<string, string> = {};

      if (filters?.status?.length) queryParams.status = filters.status.join(',');
      if (filters?.category?.length) queryParams.category = filters.category.join(',');
      if (filters?.timeframe?.length) queryParams.timeframe = filters.timeframe.join(',');
      if (filters?.priority?.length) queryParams.priority = filters.priority.join(',');
      if (filters?.clientId) queryParams.clientId = filters.clientId;
      if (filters?.overdueOnly) queryParams.overdueOnly = 'true';
      if (filters?.upcomingDays) queryParams.upcomingDays = String(filters.upcomingDays);

      const response = await apiClient.get<Goal[]>('/api/goals', queryParams);

      if (response.success && response.data) {
        this.goals = response.data;
        await this.saveToCache();
        return response.data;
      }

      console.log('[GoalService] Using cached goals');
      return this.goals;
    } catch (error) {
      console.log('[GoalService] API not available, using local storage');
      return this.goals;
    }
  }

  /**
   * Fetch milestones from API
   */
  async fetchMilestones(goalId?: string): Promise<Milestone[]> {
    try {
      const endpoint = goalId ? `/api/goals/${goalId}/milestones` : '/api/milestones';
      const response = await apiClient.get<Milestone[]>(endpoint);

      if (response.success && response.data) {
        if (goalId) {
          // Update specific goal's milestones
          const otherMilestones = this.milestones.filter((m) => m.goalId !== goalId);
          this.milestones = [...otherMilestones, ...response.data];
        } else {
          this.milestones = response.data;
        }
        await this.saveToCache();
        return response.data;
      }

      return goalId
        ? this.milestones.filter((m) => m.goalId === goalId)
        : this.milestones;
    } catch (error) {
      console.log('[GoalService] Using cached milestones');
      return goalId
        ? this.milestones.filter((m) => m.goalId === goalId)
        : this.milestones;
    }
  }

  /**
   * Create a new goal
   */
  async createGoal(request: CreateGoalRequest): Promise<Goal | null> {
    const now = new Date().toISOString();
    const newGoal: Goal = {
      id: this.generateId(),
      title: request.title,
      description: request.description,
      category: request.category,
      timeframe: request.timeframe,
      customTimeframe: request.customTimeframe
        ? { ...request.customTimeframe, id: this.generateId() }
        : undefined,
      priority: request.priority,
      status: request.status || 'not-started',
      progress: 0,
      progressTarget: 100,
      progressUnit: request.progressUnit || 'percentage',
      currentValue: 0,
      targetValue: request.targetValue,
      startDate: request.startDate,
      endDate: request.endDate,
      childGoalIds: [],
      milestoneIds: [],
      dependencies: [],
      clientId: request.clientId,
      projectId: request.projectId,
      calendarEventIds: [],
      reminderIds: [],
      progressHistory: [],
      reminderSettings: request.reminderSettings || {
        enabled: false,
        frequency: 'weekly',
      },
      color: request.color,
      tags: request.tags || [],
      attachments: [],
      estimatedHours: request.estimatedHours,
      recurring: request.recurring,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const response = await apiClient.post<Goal>('/api/goals', request);

      if (response.success && response.data) {
        this.goals.unshift(response.data);
        await this.saveToCache();
        return response.data;
      }
    } catch (error) {
      console.log('[GoalService] API not available, saving locally');
    }

    // Save locally if API fails
    this.goals.unshift(newGoal);
    await this.saveToCache();
    return newGoal;
  }

  /**
   * Update a goal
   */
  async updateGoal(id: string, updates: UpdateGoalRequest): Promise<Goal | null> {
    const goalIndex = this.goals.findIndex((g) => g.id === id);
    if (goalIndex === -1) return null;

    const updatedGoal: Goal = {
      ...this.goals[goalIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await apiClient.put<Goal>(`/api/goals/${id}`, updates);

      if (response.success && response.data) {
        this.goals[goalIndex] = response.data;
        await this.saveToCache();
        return response.data;
      }
    } catch (error) {
      console.log('[GoalService] API not available, saving locally');
    }

    // Save locally if API fails
    this.goals[goalIndex] = updatedGoal;
    await this.saveToCache();
    return updatedGoal;
  }

  /**
   * Delete a goal
   */
  async deleteGoal(id: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/api/goals/${id}`);

      if (response.success) {
        this.goals = this.goals.filter((g) => g.id !== id);
        this.milestones = this.milestones.filter((m) => m.goalId !== id);
        await this.saveToCache();
        return true;
      }
    } catch (error) {
      console.log('[GoalService] API not available, deleting locally');
    }

    // Delete locally if API fails
    this.goals = this.goals.filter((g) => g.id !== id);
    this.milestones = this.milestones.filter((m) => m.goalId !== id);
    await this.saveToCache();
    return true;
  }

  /**
   * Update goal progress
   */
  async updateProgress(
    goalId: string,
    progress: number,
    notes?: string,
    timeSpent?: number
  ): Promise<Goal | null> {
    const goal = this.goals.find((g) => g.id === goalId);
    if (!goal) return null;

    // Validate progress
    const validProgress = Math.min(100, Math.max(0, progress));

    const progressEntry: ProgressEntry = {
      id: this.generateId(),
      goalId,
      date: new Date().toISOString(),
      progress: validProgress,
      notes,
      timeSpent,
      createdAt: new Date().toISOString(),
    };

    // Calculate new status
    let newStatus: GoalStatus = goal.status;
    if (validProgress === 100) {
      newStatus = 'completed';
    } else if (validProgress > 0 && goal.status === 'not-started') {
      newStatus = 'in-progress';
    }

    // Check if overdue
    const now = new Date();
    const endDate = new Date(goal.endDate);
    if (endDate < now && validProgress < 100) {
      newStatus = 'overdue';
    }

    const updates: UpdateGoalRequest = {
      progress: validProgress,
      currentValue: Math.round((validProgress / 100) * goal.targetValue),
      status: newStatus,
    };

    const updatedGoal = await this.updateGoal(goalId, updates);

    if (updatedGoal) {
      updatedGoal.progressHistory.push(progressEntry);
      updatedGoal.lastProgressUpdate = new Date().toISOString();
      await this.saveToCache();
    }

    return updatedGoal;
  }

  /**
   * Create a milestone
   */
  async createMilestone(request: CreateMilestoneRequest): Promise<Milestone | null> {
    const now = new Date().toISOString();
    const newMilestone: Milestone = {
      id: this.generateId(),
      goalId: request.goalId,
      title: request.title,
      description: request.description,
      type: request.type,
      dueDate: request.dueDate,
      priority: request.priority,
      status: 'not-started',
      progress: 0,
      dependencies: [],
      estimatedHours: request.estimatedHours,
      tags: request.tags || [],
      color: request.color,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const response = await apiClient.post<Milestone>(
        `/api/goals/${request.goalId}/milestones`,
        request
      );

      if (response.success && response.data) {
        this.milestones.push(response.data);
        // Update goal's milestone IDs
        const goal = this.goals.find((g) => g.id === request.goalId);
        if (goal) {
          goal.milestoneIds.push(response.data.id);
        }
        await this.saveToCache();
        return response.data;
      }
    } catch (error) {
      console.log('[GoalService] API not available, saving locally');
    }

    // Save locally if API fails
    this.milestones.push(newMilestone);
    const goal = this.goals.find((g) => g.id === request.goalId);
    if (goal) {
      goal.milestoneIds.push(newMilestone.id);
    }
    await this.saveToCache();
    return newMilestone;
  }

  /**
   * Update a milestone
   */
  async updateMilestone(id: string, updates: UpdateMilestoneRequest): Promise<Milestone | null> {
    const milestoneIndex = this.milestones.findIndex((m) => m.id === id);
    if (milestoneIndex === -1) return null;

    const updatedMilestone: Milestone = {
      ...this.milestones[milestoneIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await apiClient.put<Milestone>(`/api/milestones/${id}`, updates);

      if (response.success && response.data) {
        this.milestones[milestoneIndex] = response.data;
        await this.saveToCache();
        return response.data;
      }
    } catch (error) {
      console.log('[GoalService] API not available, saving locally');
    }

    // Save locally if API fails
    this.milestones[milestoneIndex] = updatedMilestone;
    await this.saveToCache();
    return updatedMilestone;
  }

  /**
   * Delete a milestone
   */
  async deleteMilestone(id: string): Promise<boolean> {
    const milestone = this.milestones.find((m) => m.id === id);
    if (!milestone) return false;

    try {
      const response = await apiClient.delete(`/api/milestones/${id}`);

      if (response.success) {
        this.milestones = this.milestones.filter((m) => m.id !== id);
        // Update goal's milestone IDs
        const goal = this.goals.find((g) => g.id === milestone.goalId);
        if (goal) {
          goal.milestoneIds = goal.milestoneIds.filter((mId) => mId !== id);
        }
        await this.saveToCache();
        return true;
      }
    } catch (error) {
      console.log('[GoalService] API not available, deleting locally');
    }

    // Delete locally if API fails
    this.milestones = this.milestones.filter((m) => m.id !== id);
    const goal = this.goals.find((g) => g.id === milestone.goalId);
    if (goal) {
      goal.milestoneIds = goal.milestoneIds.filter((mId) => mId !== id);
    }
    await this.saveToCache();
    return true;
  }

  /**
   * Get all goals
   */
  getGoals(): Goal[] {
    return [...this.goals];
  }

  /**
   * Get goal by ID
   */
  getGoalById(id: string): Goal | undefined {
    return this.goals.find((g) => g.id === id);
  }

  /**
   * Get all milestones
   */
  getMilestones(): Milestone[] {
    return [...this.milestones];
  }

  /**
   * Get milestones for a goal
   */
  getMilestonesByGoalId(goalId: string): Milestone[] {
    return this.milestones.filter((m) => m.goalId === goalId);
  }

  /**
   * Get goals by status
   */
  getGoalsByStatus(status: GoalStatus): Goal[] {
    return this.goals.filter((g) => g.status === status);
  }

  /**
   * Get goals by category
   */
  getGoalsByCategory(category: GoalCategory): Goal[] {
    return this.goals.filter((g) => g.category === category);
  }

  /**
   * Get goals by timeframe
   */
  getGoalsByTimeframe(timeframe: GoalTimeframe): Goal[] {
    return this.goals.filter((g) => g.timeframe === timeframe);
  }

  /**
   * Get overdue goals
   */
  getOverdueGoals(): Goal[] {
    const now = new Date();
    return this.goals.filter((g) => {
      const endDate = new Date(g.endDate);
      return endDate < now && g.status !== 'completed' && g.status !== 'cancelled';
    });
  }

  /**
   * Get upcoming deadlines
   */
  getUpcomingDeadlines(days: number = 7): (Goal | Milestone)[] {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const upcomingGoals = this.goals.filter((g) => {
      const endDate = new Date(g.endDate);
      return (
        endDate >= now &&
        endDate <= cutoffDate &&
        g.status !== 'completed' &&
        g.status !== 'cancelled'
      );
    });

    const upcomingMilestones = this.milestones.filter((m) => {
      const dueDate = new Date(m.dueDate);
      return (
        dueDate >= now &&
        dueDate <= cutoffDate &&
        m.status !== 'completed' &&
        m.status !== 'cancelled'
      );
    });

    return [...upcomingGoals, ...upcomingMilestones].sort((a, b) => {
      const dateA = new Date('endDate' in a ? a.endDate : a.dueDate);
      const dateB = new Date('endDate' in b ? b.endDate : b.dueDate);
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * Search goals
   */
  searchGoals(query: string): Goal[] {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return this.goals;

    return this.goals.filter(
      (goal) =>
        goal.title.toLowerCase().includes(searchTerm) ||
        (goal.description && goal.description.toLowerCase().includes(searchTerm)) ||
        goal.tags.some((tag) => tag.toLowerCase().includes(searchTerm)) ||
        (goal.notes && goal.notes.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Calculate goal statistics
   */
  getStatistics(): GoalStatistics {
    const stats: GoalStatistics = {
      total: this.goals.length,
      byStatus: {
        'not-started': 0,
        'in-progress': 0,
        'completed': 0,
        'overdue': 0,
        'cancelled': 0,
        'paused': 0,
      },
      byTimeframe: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        quarterly: 0,
        yearly: 0,
        custom: 0,
      },
      byCategory: {
        business: 0,
        personal: 0,
        client: 0,
        project: 0,
        health: 0,
        learning: 0,
        financial: 0,
      },
      milestones: {
        total: this.milestones.length,
        completed: this.milestones.filter((m) => m.status === 'completed').length,
        overdue: this.milestones.filter((m) => {
          const dueDate = new Date(m.dueDate);
          return dueDate < new Date() && m.status !== 'completed';
        }).length,
      },
      averageProgress:
        this.goals.length > 0
          ? Math.round(this.goals.reduce((sum, g) => sum + g.progress, 0) / this.goals.length)
          : 0,
    };

    this.goals.forEach((goal) => {
      stats.byStatus[goal.status]++;
      stats.byTimeframe[goal.timeframe]++;
      stats.byCategory[goal.category]++;
    });

    return stats;
  }

  /**
   * Calculate quick stats
   */
  getQuickStats(): GoalQuickStats {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      total: this.goals.length,
      inProgress: this.goals.filter((g) => g.status === 'in-progress').length,
      completed: this.goals.filter((g) => g.status === 'completed').length,
      overdue: this.getOverdueGoals().length,
      upcoming: this.goals.filter((g) => {
        const endDate = new Date(g.endDate);
        return (
          endDate >= now &&
          endDate <= weekFromNow &&
          g.status !== 'completed' &&
          g.status !== 'cancelled'
        );
      }).length,
      averageProgress:
        this.goals.length > 0
          ? Math.round(this.goals.reduce((sum, g) => sum + g.progress, 0) / this.goals.length)
          : 0,
    };
  }

  /**
   * Calculate progress velocity
   */
  calculateProgressVelocity(goalId: string, days: number = 7): number {
    const goal = this.goals.find((g) => g.id === goalId);
    if (!goal || goal.progressHistory.length < 2) return 0;

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const recentEntries = goal.progressHistory
      .filter((entry) => new Date(entry.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (recentEntries.length < 2) return 0;

    const firstEntry = recentEntries[0];
    const lastEntry = recentEntries[recentEntries.length - 1];

    const progressDiff = lastEntry.progress - firstEntry.progress;
    const timeDiff = new Date(lastEntry.date).getTime() - new Date(firstEntry.date).getTime();
    const daysDiff = timeDiff / (24 * 60 * 60 * 1000);

    return daysDiff > 0 ? progressDiff / daysDiff : 0;
  }

  /**
   * Estimate completion date
   */
  estimateCompletion(goalId: string): Date | null {
    const goal = this.goals.find((g) => g.id === goalId);
    if (!goal || goal.progress >= 100) return null;

    const velocity = this.calculateProgressVelocity(goalId);
    if (velocity <= 0) return null;

    const remainingProgress = 100 - goal.progress;
    const daysToComplete = remainingProgress / velocity;

    return new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000);
  }

  /**
   * Get goal analytics
   */
  getGoalAnalytics(goalId: string): GoalAnalytics | null {
    const goal = this.goals.find((g) => g.id === goalId);
    if (!goal) return null;

    const now = new Date();
    const endDate = new Date(goal.endDate);
    const timeToDeadline = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    const velocity = this.calculateProgressVelocity(goalId);
    const estimatedCompletion = this.estimateCompletion(goalId);
    const milestones = this.getMilestonesByGoalId(goalId);
    const completedMilestones = milestones.filter((m) => m.status === 'completed').length;

    // Calculate risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (timeToDeadline < 0) {
      riskLevel = 'high';
    } else if (estimatedCompletion && estimatedCompletion > endDate) {
      riskLevel = 'high';
    } else if (velocity < 1 && timeToDeadline < 30) {
      riskLevel = 'medium';
    }

    // Calculate time spent
    const timeSpent = goal.progressHistory.reduce(
      (total, entry) => total + (entry.timeSpent || 0),
      0
    );

    // Generate insights
    const insights: GoalAnalytics['insights'] = [];

    if (riskLevel === 'high') {
      insights.push({
        type: 'error',
        message:
          timeToDeadline < 0
            ? 'Goal is overdue'
            : 'Goal unlikely to meet deadline at current pace',
        actionable: true,
        suggestedAction: 'Consider extending deadline or increasing effort',
      });
    }

    if (velocity < 0.5 && goal.status === 'in-progress') {
      insights.push({
        type: 'warning',
        message: 'Progress has been slow recently',
        actionable: true,
        suggestedAction: 'Review blockers and consider adjusting approach',
      });
    }

    if (completedMilestones / milestones.length > 0.8 && milestones.length > 0) {
      insights.push({
        type: 'success',
        message: 'Excellent milestone completion rate',
        actionable: false,
      });
    }

    return {
      goalId,
      progressVelocity: velocity,
      estimatedCompletionDate: estimatedCompletion?.toISOString(),
      timeToDeadline,
      riskLevel,
      timeSpent: Math.round(timeSpent / 60),
      timeRemaining: goal.estimatedHours ? goal.estimatedHours - Math.round(timeSpent / 60) : undefined,
      efficiencyRating:
        goal.estimatedHours && timeSpent > 0
          ? Math.min(1, (goal.progress / 100) / (Math.round(timeSpent / 60) / goal.estimatedHours))
          : 0,
      milestonesCompleted: completedMilestones,
      milestonesTotal: milestones.length,
      milestoneCompletionRate: milestones.length > 0 ? completedMilestones / milestones.length : 0,
      insights,
    };
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority: Priority): string {
    return PRIORITY_COLORS[priority];
  }

  /**
   * Get status color
   */
  getStatusColor(status: GoalStatus): string {
    return STATUS_COLORS[status];
  }

  /**
   * Get category color
   */
  getCategoryColor(category: GoalCategory): string {
    return GOAL_CATEGORIES.find((c) => c.value === category)?.color || '#6B7280';
  }

  /**
   * Format status name
   */
  formatStatusName(status: GoalStatus): string {
    return status
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format timeframe name
   */
  formatTimeframeName(timeframe: GoalTimeframe): string {
    return timeframe.charAt(0).toUpperCase() + timeframe.slice(1);
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    this.goals = [];
    this.milestones = [];
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.GOALS,
      STORAGE_KEYS.MILESTONES,
      STORAGE_KEYS.LAST_SYNC,
    ]);
  }
}

// Export singleton instance
export const goalService = GoalService.getInstance();

// Export class for testing
export { GoalService };
