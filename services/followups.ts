/**
 * Follow-up Service for Becky CRM Mobile
 *
 * Handles:
 * - Follow-up CRUD operations
 * - Scheduling and rescheduling
 * - Status management
 * - Client follow-up history
 * - Notification integration
 *
 * @module services/followups
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../lib/api/client';
import { notificationService } from './notifications';

// Storage keys
const STORAGE_KEYS = {
  FOLLOW_UPS: 'follow_ups_cache',
  FOLLOW_UP_METRICS: 'follow_up_metrics',
  LAST_SYNC: 'follow_ups_last_sync',
};

// Priority levels
export type PriorityLevel = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

// Follow-up status
export type FollowUpStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'MISSED';

// Follow-up category
export type FollowUpCategory =
  | 'SERVICE_CHECK'
  | 'MAINTENANCE_REMINDER'
  | 'COMPLAINT_RESOLUTION'
  | 'CONTRACT_RENEWAL'
  | 'SEASONAL_PLANNING'
  | 'GENERAL';

// Recurrence pattern
export type RecurrencePattern =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'BI_WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEASONAL'
  | 'CUSTOM';

// Client info included with follow-up
export interface FollowUpClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

// Notification info
export interface FollowUpNotification {
  id: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  scheduledAt: string;
  sentAt?: string;
}

// Core follow-up type
export interface FollowUp {
  id: string;
  clientId: string;
  client: FollowUpClient;
  serviceId?: string;
  title: string;
  notes?: string;
  outcome?: string;
  actionItems?: string[];
  scheduledDate: string;
  duration: number; // in minutes
  priority: PriorityLevel;
  category: FollowUpCategory;
  status: FollowUpStatus;
  recurrencePattern: RecurrencePattern;
  recurrenceData?: RecurrenceConfig;
  notifications: FollowUpNotification[];
  parentFollowUpId?: string;
  childFollowUps?: FollowUp[];
  createdAt: string;
  updatedAt: string;
}

// Recurrence configuration
export interface RecurrenceConfig {
  pattern: RecurrencePattern;
  interval?: number;
  endDate?: string;
  maxOccurrences?: number;
  weeklyDays?: string[];
  monthlyType?: 'DAY_OF_MONTH' | 'DAY_OF_WEEK';
}

// Create follow-up request
export interface CreateFollowUpRequest {
  clientId: string;
  serviceId?: string;
  title?: string;
  notes?: string;
  scheduledDate: string;
  timezone?: string;
  duration?: number;
  priority?: PriorityLevel;
  category?: FollowUpCategory;
  recurrencePattern?: RecurrencePattern;
  recurrenceData?: RecurrenceConfig;
  reminderDays?: number[];
}

// Update follow-up request
export interface UpdateFollowUpRequest {
  title?: string;
  notes?: string;
  outcome?: string;
  actionItems?: string[];
  scheduledDate?: string;
  duration?: number;
  priority?: PriorityLevel;
  category?: FollowUpCategory;
  status?: FollowUpStatus;
}

// Complete follow-up request
export interface CompleteFollowUpRequest {
  outcome: string;
  actionItems?: string[];
  notes?: string;
  scheduleNext?: boolean;
  nextFollowUpDate?: string;
  nextFollowUpNotes?: string;
}

// Filter options
export interface FollowUpFilters {
  clientId?: string;
  status?: FollowUpStatus[];
  category?: FollowUpCategory[];
  priority?: PriorityLevel[];
  dateFrom?: string;
  dateTo?: string;
  overdueOnly?: boolean;
  upcomingOnly?: boolean;
  recurringOnly?: boolean;
}

// Metrics
export interface FollowUpMetrics {
  totalScheduled: number;
  totalCompleted: number;
  totalMissed: number;
  completionRate: number;
  averageResponseTime: number;
  categoryBreakdown: Record<string, number>;
  upcomingCount: number;
  overdueCount: number;
}

// Quick stats for dashboard
export interface FollowUpQuickStats {
  total: number;
  today: number;
  upcoming: number;
  overdue: number;
  completed: number;
}

/**
 * FollowUpService - Singleton service for managing follow-ups
 */
class FollowUpService {
  private static instance: FollowUpService;
  private followUps: FollowUp[] = [];
  private metrics: FollowUpMetrics | null = null;
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): FollowUpService {
    if (!FollowUpService.instance) {
      FollowUpService.instance = new FollowUpService();
    }
    return FollowUpService.instance;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      console.log('[FollowUpService] Initializing...');
      await this.loadFromCache();
      this.initialized = true;
      console.log('[FollowUpService] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[FollowUpService] Initialization error:', error);
      return false;
    }
  }

  /**
   * Load follow-ups from cache
   */
  private async loadFromCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.FOLLOW_UPS);
      if (cached) {
        this.followUps = JSON.parse(cached);
      }

      const cachedMetrics = await AsyncStorage.getItem(STORAGE_KEYS.FOLLOW_UP_METRICS);
      if (cachedMetrics) {
        this.metrics = JSON.parse(cachedMetrics);
      }
    } catch (error) {
      console.error('[FollowUpService] Error loading from cache:', error);
    }
  }

  /**
   * Save follow-ups to cache
   */
  private async saveToCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FOLLOW_UPS, JSON.stringify(this.followUps));
      if (this.metrics) {
        await AsyncStorage.setItem(STORAGE_KEYS.FOLLOW_UP_METRICS, JSON.stringify(this.metrics));
      }
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('[FollowUpService] Error saving to cache:', error);
    }
  }

  /**
   * Fetch follow-ups from API
   */
  async fetchFollowUps(filters?: FollowUpFilters): Promise<FollowUp[]> {
    try {
      const queryParams: Record<string, string> = {};

      if (filters?.clientId) queryParams.clientId = filters.clientId;
      if (filters?.status?.length) queryParams.status = filters.status.join(',');
      if (filters?.category?.length) queryParams.category = filters.category.join(',');
      if (filters?.priority?.length) queryParams.priority = filters.priority.join(',');
      if (filters?.dateFrom) queryParams.dateFrom = filters.dateFrom;
      if (filters?.dateTo) queryParams.dateTo = filters.dateTo;
      if (filters?.overdueOnly) queryParams.overdueOnly = 'true';
      if (filters?.upcomingOnly) queryParams.upcomingOnly = 'true';

      const response = await apiClient.get<FollowUp[]>('/api/follow-ups/schedule', queryParams);

      if (response.success && response.data) {
        this.followUps = response.data;
        await this.saveToCache();
        return response.data;
      }

      console.error('[FollowUpService] Failed to fetch follow-ups:', response);
      return this.followUps; // Return cached data on failure
    } catch (error) {
      console.error('[FollowUpService] Error fetching follow-ups:', error);
      return this.followUps; // Return cached data on error
    }
  }

  /**
   * Fetch follow-up metrics
   */
  async fetchMetrics(clientId?: string): Promise<FollowUpMetrics | null> {
    try {
      const queryParams: Record<string, string> = {};
      if (clientId) queryParams.clientId = clientId;

      const response = await apiClient.get<FollowUpMetrics>('/api/follow-ups/metrics', queryParams);

      if (response.success && response.data) {
        this.metrics = response.data;
        await this.saveToCache();
        return response.data;
      }

      return this.metrics;
    } catch (error) {
      console.error('[FollowUpService] Error fetching metrics:', error);
      return this.metrics;
    }
  }

  /**
   * Create a new follow-up
   */
  async createFollowUp(request: CreateFollowUpRequest): Promise<FollowUp | null> {
    try {
      const response = await apiClient.post<FollowUp>('/api/follow-ups', request);

      if (response.success && response.data) {
        this.followUps.unshift(response.data);
        await this.saveToCache();

        // Schedule notification for the follow-up
        await this.scheduleFollowUpNotification(response.data);

        return response.data;
      }

      console.error('[FollowUpService] Failed to create follow-up:', response);
      return null;
    } catch (error) {
      console.error('[FollowUpService] Error creating follow-up:', error);
      return null;
    }
  }

  /**
   * Update a follow-up
   */
  async updateFollowUp(id: string, updates: UpdateFollowUpRequest): Promise<FollowUp | null> {
    try {
      const response = await apiClient.put<FollowUp>(`/api/follow-ups/${id}`, updates);

      if (response.success && response.data) {
        const index = this.followUps.findIndex((fu) => fu.id === id);
        if (index !== -1) {
          this.followUps[index] = response.data;
        }
        await this.saveToCache();

        // Reschedule notification if date changed
        if (updates.scheduledDate) {
          await this.scheduleFollowUpNotification(response.data);
        }

        return response.data;
      }

      console.error('[FollowUpService] Failed to update follow-up:', response);
      return null;
    } catch (error) {
      console.error('[FollowUpService] Error updating follow-up:', error);
      return null;
    }
  }

  /**
   * Complete a follow-up
   */
  async completeFollowUp(id: string, request: CompleteFollowUpRequest): Promise<FollowUp | null> {
    try {
      const response = await apiClient.post<FollowUp>(`/api/follow-ups/${id}/complete`, request);

      if (response.success && response.data) {
        const index = this.followUps.findIndex((fu) => fu.id === id);
        if (index !== -1) {
          this.followUps[index] = response.data;
        }
        await this.saveToCache();

        // Cancel any pending notifications
        await notificationService.cancelEventReminders(id);

        return response.data;
      }

      return null;
    } catch (error) {
      console.error('[FollowUpService] Error completing follow-up:', error);
      return null;
    }
  }

  /**
   * Reschedule a follow-up
   */
  async rescheduleFollowUp(id: string, newDate: string): Promise<FollowUp | null> {
    return this.updateFollowUp(id, { scheduledDate: newDate });
  }

  /**
   * Cancel a follow-up
   */
  async cancelFollowUp(id: string): Promise<boolean> {
    try {
      const response = await apiClient.put<FollowUp>(`/api/follow-ups/${id}`, {
        status: 'CANCELLED',
      });

      if (response.success) {
        const index = this.followUps.findIndex((fu) => fu.id === id);
        if (index !== -1) {
          this.followUps[index].status = 'CANCELLED';
        }
        await this.saveToCache();

        // Cancel notifications
        await notificationService.cancelEventReminders(id);

        return true;
      }

      return false;
    } catch (error) {
      console.error('[FollowUpService] Error canceling follow-up:', error);
      return false;
    }
  }

  /**
   * Delete a follow-up
   */
  async deleteFollowUp(id: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/api/follow-ups/${id}`);

      if (response.success) {
        this.followUps = this.followUps.filter((fu) => fu.id !== id);
        await this.saveToCache();

        // Cancel notifications
        await notificationService.cancelEventReminders(id);

        return true;
      }

      return false;
    } catch (error) {
      console.error('[FollowUpService] Error deleting follow-up:', error);
      return false;
    }
  }

  /**
   * Get follow-up by ID
   */
  getFollowUpById(id: string): FollowUp | undefined {
    return this.followUps.find((fu) => fu.id === id);
  }

  /**
   * Get all cached follow-ups
   */
  getFollowUps(): FollowUp[] {
    return [...this.followUps];
  }

  /**
   * Get cached metrics
   */
  getMetrics(): FollowUpMetrics | null {
    return this.metrics;
  }

  /**
   * Calculate quick stats from current follow-ups
   */
  calculateQuickStats(): FollowUpQuickStats {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return {
      total: this.followUps.length,
      today: this.followUps.filter((fu) => {
        const date = new Date(fu.scheduledDate);
        return (
          date >= today &&
          date < tomorrow &&
          ['SCHEDULED', 'CONFIRMED'].includes(fu.status)
        );
      }).length,
      upcoming: this.followUps.filter(
        (fu) =>
          new Date(fu.scheduledDate) > now &&
          ['SCHEDULED', 'CONFIRMED'].includes(fu.status)
      ).length,
      overdue: this.followUps.filter(
        (fu) =>
          new Date(fu.scheduledDate) < now &&
          ['SCHEDULED', 'CONFIRMED'].includes(fu.status)
      ).length,
      completed: this.followUps.filter((fu) => fu.status === 'COMPLETED').length,
    };
  }

  /**
   * Get follow-ups for a specific client
   */
  getClientFollowUps(clientId: string): FollowUp[] {
    return this.followUps.filter((fu) => fu.clientId === clientId);
  }

  /**
   * Get overdue follow-ups
   */
  getOverdueFollowUps(): FollowUp[] {
    const now = new Date();
    return this.followUps.filter(
      (fu) =>
        new Date(fu.scheduledDate) < now &&
        ['SCHEDULED', 'CONFIRMED'].includes(fu.status)
    );
  }

  /**
   * Get today's follow-ups
   */
  getTodayFollowUps(): FollowUp[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return this.followUps.filter((fu) => {
      const date = new Date(fu.scheduledDate);
      return (
        date >= today &&
        date < tomorrow &&
        ['SCHEDULED', 'CONFIRMED'].includes(fu.status)
      );
    });
  }

  /**
   * Get this week's follow-ups
   */
  getThisWeekFollowUps(): FollowUp[] {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return this.followUps.filter((fu) => {
      const date = new Date(fu.scheduledDate);
      return (
        date >= startOfWeek &&
        date < endOfWeek &&
        ['SCHEDULED', 'CONFIRMED'].includes(fu.status)
      );
    });
  }

  /**
   * Schedule notification for a follow-up
   */
  private async scheduleFollowUpNotification(followUp: FollowUp): Promise<void> {
    try {
      const scheduledDate = new Date(followUp.scheduledDate);

      // Cancel any existing notifications for this follow-up
      await notificationService.cancelEventReminders(followUp.id);

      // Schedule new reminders
      await notificationService.scheduleEventReminders(
        followUp.id,
        followUp.title,
        scheduledDate,
        followUp.client.name
      );

      console.log('[FollowUpService] Notification scheduled for follow-up:', followUp.id);
    } catch (error) {
      console.error('[FollowUpService] Error scheduling notification:', error);
    }
  }

  /**
   * Convert follow-up to calendar event format
   */
  followUpToEvent(followUp: FollowUp): {
    id: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    clientName: string;
  } {
    const startTime = new Date(followUp.scheduledDate);
    const endTime = new Date(startTime.getTime() + followUp.duration * 60 * 1000);

    return {
      id: followUp.id,
      title: followUp.title,
      description: followUp.notes || '',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      clientName: followUp.client.name,
    };
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority: PriorityLevel): string {
    switch (priority) {
      case 'URGENT':
        return '#EF4444'; // red
      case 'HIGH':
        return '#F97316'; // orange
      case 'MEDIUM':
        return '#F59E0B'; // amber
      case 'LOW':
        return '#6B7280'; // gray
      default:
        return '#6B7280';
    }
  }

  /**
   * Get status color
   */
  getStatusColor(status: FollowUpStatus): string {
    switch (status) {
      case 'SCHEDULED':
        return '#F59E0B'; // amber
      case 'CONFIRMED':
        return '#22C55E'; // green
      case 'COMPLETED':
        return '#6B7280'; // gray
      case 'CANCELLED':
        return '#EF4444'; // red
      case 'MISSED':
        return '#F97316'; // orange
      default:
        return '#6B7280';
    }
  }

  /**
   * Format category name for display
   */
  formatCategoryName(category: FollowUpCategory): string {
    return category
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    this.followUps = [];
    this.metrics = null;
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.FOLLOW_UPS,
      STORAGE_KEYS.FOLLOW_UP_METRICS,
      STORAGE_KEYS.LAST_SYNC,
    ]);
  }
}

// Export singleton instance
export const followUpService = FollowUpService.getInstance();

// Export class for testing
export { FollowUpService };
