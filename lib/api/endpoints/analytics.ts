/**
 * Analytics API endpoints
 * @module lib/api/endpoints/analytics
 */

import { apiClient } from '../client';
import { ApiResponse } from '../types';

/**
 * Date range for analytics queries
 */
export type DateRangeType = 'this_week' | 'this_month' | 'this_year' | 'custom';

/**
 * Analytics date range parameters
 */
export interface AnalyticsDateRange {
  rangeType: DateRangeType;
  startDate?: string;
  endDate?: string;
}

/**
 * Revenue data point for charts
 */
export interface RevenueDataPoint {
  date: string;
  label: string;
  amount: number;
}

/**
 * Revenue by service line breakdown
 */
export interface RevenueByServiceLine {
  serviceLineId: string;
  serviceLineName: string;
  amount: number;
  percentage: number;
  color?: string;
}

/**
 * Revenue analytics response
 */
export interface RevenueAnalytics {
  totalRevenue: number;
  previousPeriodRevenue: number;
  revenueChange: number;
  revenueChangePercent: number;
  revenueOverTime: RevenueDataPoint[];
  revenueByServiceLine: RevenueByServiceLine[];
  averageTransactionValue: number;
  topClients: Array<{
    clientId: string;
    clientName: string;
    totalRevenue: number;
  }>;
}

/**
 * Client analytics data
 */
export interface ClientAnalytics {
  totalClients: number;
  activeClients: number;
  prospectClients: number;
  completedClients: number;
  inactiveClients: number;
  newClientsThisPeriod: number;
  previousPeriodNewClients: number;
  newClientChange: number;
  newClientChangePercent: number;
  clientsOverTime: Array<{
    date: string;
    label: string;
    newClients: number;
    totalClients: number;
  }>;
  clientsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  topClientsByRevenue: Array<{
    clientId: string;
    clientName: string;
    revenue: number;
    servicesCount: number;
  }>;
  retentionRate: number;
  previousRetentionRate: number;
}

/**
 * Activity metrics data
 */
export interface ActivityMetrics {
  totalConversations: number;
  conversationsByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  averageResponseTime?: number;
  upcomingEvents: number;
  completedEvents: number;
  eventCompletionRate: number;
  billableHours: number;
  previousPeriodBillableHours: number;
  billableHoursChange: number;
}

/**
 * Outstanding billing data
 */
export interface OutstandingBilling {
  pendingInvoices: number;
  pendingInvoicesAmount: number;
  pendingReceipts: number;
  pendingReceiptsAmount: number;
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
}

/**
 * Complete dashboard analytics
 */
export interface DashboardAnalytics {
  dateRange: AnalyticsDateRange;
  revenue: RevenueAnalytics;
  clients: ClientAnalytics;
  activity: ActivityMetrics;
  billing: OutstandingBilling;
  lastUpdated: string;
}

/**
 * KPI summary for quick metrics cards
 */
export interface KPISummary {
  totalRevenue: number;
  revenueChange: number;
  activeClients: number;
  clientChange: number;
  pendingInvoices: number;
  pendingAmount: number;
  upcomingEvents: number;
  completedEvents: number;
  billableHours: number;
  hoursChange: number;
}

/**
 * Analytics API methods
 *
 * @example
 * ```typescript
 * import { analyticsApi } from '@/lib/api/endpoints';
 *
 * // Get dashboard analytics
 * const response = await analyticsApi.getDashboard({
 *   rangeType: 'this_month'
 * });
 *
 * // Get revenue breakdown
 * const revenue = await analyticsApi.getRevenue({
 *   rangeType: 'this_year'
 * });
 * ```
 */
export const analyticsApi = {
  /**
   * Get complete dashboard analytics
   *
   * @param dateRange - Date range for analytics
   * @returns Dashboard analytics data
   */
  getDashboard: async (
    dateRange: AnalyticsDateRange
  ): Promise<ApiResponse<DashboardAnalytics>> => {
    return apiClient.get<DashboardAnalytics>('/api/analytics/dashboard', {
      rangeType: dateRange.rangeType,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  },

  /**
   * Get KPI summary for quick metrics
   *
   * @param dateRange - Date range for analytics
   * @returns KPI summary data
   */
  getKPISummary: async (
    dateRange: AnalyticsDateRange
  ): Promise<ApiResponse<KPISummary>> => {
    return apiClient.get<KPISummary>('/api/analytics/kpi-summary', {
      rangeType: dateRange.rangeType,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  },

  /**
   * Get revenue analytics
   *
   * @param dateRange - Date range for analytics
   * @returns Revenue analytics data
   */
  getRevenue: async (
    dateRange: AnalyticsDateRange
  ): Promise<ApiResponse<RevenueAnalytics>> => {
    return apiClient.get<RevenueAnalytics>('/api/analytics/revenue', {
      rangeType: dateRange.rangeType,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  },

  /**
   * Get client analytics
   *
   * @param dateRange - Date range for analytics
   * @returns Client analytics data
   */
  getClients: async (
    dateRange: AnalyticsDateRange
  ): Promise<ApiResponse<ClientAnalytics>> => {
    return apiClient.get<ClientAnalytics>('/api/analytics/clients', {
      rangeType: dateRange.rangeType,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  },

  /**
   * Get growth metrics
   *
   * @param dateRange - Date range for analytics
   * @returns Growth metrics data
   */
  getGrowth: async (
    dateRange: AnalyticsDateRange
  ): Promise<ApiResponse<{
    newClients: number;
    clientRetention: number;
    revenueGrowth: number;
    clientGrowthOverTime: Array<{ date: string; count: number }>;
    revenueGrowthOverTime: Array<{ date: string; amount: number }>;
  }>> => {
    return apiClient.get('/api/analytics/growth', {
      rangeType: dateRange.rangeType,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  },

  /**
   * Get activity metrics
   *
   * @param dateRange - Date range for analytics
   * @returns Activity metrics data
   */
  getActivity: async (
    dateRange: AnalyticsDateRange
  ): Promise<ApiResponse<ActivityMetrics>> => {
    return apiClient.get<ActivityMetrics>('/api/analytics/activity', {
      rangeType: dateRange.rangeType,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  },

  /**
   * Get outstanding billing summary
   *
   * @returns Outstanding billing data
   */
  getOutstandingBilling: async (): Promise<ApiResponse<OutstandingBilling>> => {
    return apiClient.get<OutstandingBilling>('/api/analytics/outstanding-billing');
  },
};
