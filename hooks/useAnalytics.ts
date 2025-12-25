/**
 * Analytics data fetching hooks
 * @module hooks/useAnalytics
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  analyticsApi,
  DateRangeType,
  AnalyticsDateRange,
  DashboardAnalytics,
  RevenueAnalytics,
  ClientAnalytics,
  ActivityMetrics,
  OutstandingBilling,
  KPISummary,
} from '../lib/api/endpoints';
import { clientsApi, billingApi, eventsApi } from '../lib/api/endpoints';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears } from 'date-fns';

/**
 * Get date range boundaries based on range type
 */
function getDateRangeBounds(rangeType: DateRangeType, customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
  const now = new Date();

  switch (rangeType) {
    case 'this_week':
      return {
        startDate: format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      };
    case 'this_month':
      return {
        startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    case 'this_year':
      return {
        startDate: format(startOfYear(now), 'yyyy-MM-dd'),
        endDate: format(endOfYear(now), 'yyyy-MM-dd'),
      };
    case 'custom':
      return {
        startDate: customStart || format(subDays(now, 30), 'yyyy-MM-dd'),
        endDate: customEnd || format(now, 'yyyy-MM-dd'),
      };
    default:
      return {
        startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
  }
}

/**
 * Get previous period boundaries for comparison
 */
function getPreviousPeriodBounds(rangeType: DateRangeType, startDate: string, endDate: string): { startDate: string; endDate: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration = end.getTime() - start.getTime();

  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);

  return {
    startDate: format(prevStart, 'yyyy-MM-dd'),
    endDate: format(prevEnd, 'yyyy-MM-dd'),
  };
}

interface UseAnalyticsResult {
  data: DashboardAnalytics | null;
  loading: boolean;
  error: string | null;
  dateRange: AnalyticsDateRange;
  setDateRangeType: (type: DateRangeType) => void;
  setCustomDateRange: (startDate: string, endDate: string) => void;
  refetch: () => Promise<void>;
}

/**
 * Main analytics hook that fetches all dashboard data
 */
export function useAnalytics(initialRangeType: DateRangeType = 'this_month'): UseAnalyticsResult {
  const [rangeType, setRangeType] = useState<DateRangeType>(initialRangeType);
  const [customStart, setCustomStart] = useState<string | undefined>();
  const [customEnd, setCustomEnd] = useState<string | undefined>();
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateRange = useMemo<AnalyticsDateRange>(() => {
    const bounds = getDateRangeBounds(rangeType, customStart, customEnd);
    return {
      rangeType,
      startDate: bounds.startDate,
      endDate: bounds.endDate,
    };
  }, [rangeType, customStart, customEnd]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from dedicated analytics endpoint first
      const response = await analyticsApi.getDashboard(dateRange);

      if (response.success && response.data) {
        setData(response.data);
      } else {
        // Fall back to aggregating from individual endpoints
        const aggregatedData = await aggregateAnalyticsData(dateRange);
        setData(aggregatedData);
      }
    } catch (err) {
      console.log('[useAnalytics] Analytics endpoint not available, falling back to aggregated data');
      try {
        const aggregatedData = await aggregateAnalyticsData(dateRange);
        setData(aggregatedData);
        setError(null);
      } catch (aggErr) {
        setError(aggErr instanceof Error ? aggErr.message : 'Failed to load analytics');
        console.error('[useAnalytics] Error fetching analytics:', aggErr);
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const setDateRangeType = useCallback((type: DateRangeType) => {
    setRangeType(type);
    if (type !== 'custom') {
      setCustomStart(undefined);
      setCustomEnd(undefined);
    }
  }, []);

  const setCustomDateRange = useCallback((startDate: string, endDate: string) => {
    setRangeType('custom');
    setCustomStart(startDate);
    setCustomEnd(endDate);
  }, []);

  return {
    data,
    loading,
    error,
    dateRange,
    setDateRangeType,
    setCustomDateRange,
    refetch: fetchAnalytics,
  };
}

/**
 * Aggregate analytics data from individual endpoints when dedicated analytics API is not available
 */
async function aggregateAnalyticsData(dateRange: AnalyticsDateRange): Promise<DashboardAnalytics> {
  const { startDate, endDate } = getDateRangeBounds(dateRange.rangeType, dateRange.startDate, dateRange.endDate);
  const previousPeriod = getPreviousPeriodBounds(dateRange.rangeType, startDate!, endDate!);

  // Fetch data in parallel
  const [
    clientsResponse,
    receiptsResponse,
    invoicesResponse,
    eventsResponse,
  ] = await Promise.all([
    clientsApi.getClients().catch(() => ({ success: true, data: [] })),
    billingApi.getReceipts().catch(() => ({ success: true, data: [] })),
    billingApi.getInvoices().catch(() => ({ success: true, data: [] })),
    eventsApi.getEvents({ startDate, endDate }).catch(() => ({ success: true, data: [] })),
  ]);

  const clients = clientsResponse.data || [];
  const receipts = (receiptsResponse.data || []) as any[];
  const invoices = (invoicesResponse.data || []) as any[];
  const events = eventsResponse.data || [];

  // Calculate revenue metrics
  const paidReceipts = receipts.filter((r: any) => r.status === 'paid' || r.status === 'PAID');
  const totalRevenue = paidReceipts.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  // Calculate revenue by service line
  const revenueByServiceLine: { [key: string]: { name: string; amount: number } } = {};
  paidReceipts.forEach((receipt: any) => {
    const serviceLine = receipt.serviceLine || receipt.service || 'Other';
    if (!revenueByServiceLine[serviceLine]) {
      revenueByServiceLine[serviceLine] = { name: serviceLine, amount: 0 };
    }
    revenueByServiceLine[serviceLine].amount += receipt.amount || 0;
  });

  const serviceLineBreakdown = Object.entries(revenueByServiceLine).map(([id, data], index) => ({
    serviceLineId: id,
    serviceLineName: data.name,
    amount: data.amount,
    percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
    color: getServiceLineColor(index),
  }));

  // Client metrics
  const activeClients = clients.filter((c: any) => c.status === 'active' || c.status === 'ACTIVE').length;
  const prospectClients = clients.filter((c: any) => c.status === 'prospect' || c.status === 'PROSPECT').length;
  const completedClients = clients.filter((c: any) => c.status === 'completed' || c.status === 'COMPLETED').length;
  const inactiveClients = clients.filter((c: any) => c.status === 'inactive' || c.status === 'INACTIVE').length;

  // Calculate new clients in period
  const newClientsInPeriod = clients.filter((c: any) => {
    const createdAt = c.createdAt ? new Date(c.createdAt) : null;
    if (!createdAt) return false;
    const start = new Date(startDate!);
    const end = new Date(endDate!);
    return createdAt >= start && createdAt <= end;
  }).length;

  // Outstanding billing
  const pendingInvoices = invoices.filter((i: any) =>
    i.status === 'pending' || i.status === 'PENDING' ||
    i.status === 'sent' || i.status === 'SENT'
  );
  const pendingReceipts = receipts.filter((r: any) =>
    r.status === 'pending' || r.status === 'PENDING' ||
    r.status === 'draft' || r.status === 'DRAFT'
  );

  const pendingInvoicesAmount = pendingInvoices.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
  const pendingReceiptsAmount = pendingReceipts.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  // Overdue items
  const now = new Date();
  const overdueInvoices = pendingInvoices.filter((i: any) => {
    const dueDate = i.dueDate ? new Date(i.dueDate) : null;
    return dueDate && dueDate < now;
  });
  const overdueAmount = overdueInvoices.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

  // Events metrics
  const upcomingEvents = events.filter((e: any) => {
    const start = e.startTime ? new Date(e.startTime) : null;
    return start && start >= now;
  }).length;

  const completedEvents = events.filter((e: any) =>
    e.status === 'completed' || e.status === 'COMPLETED'
  ).length;

  // Top clients by revenue
  const clientRevenue: { [clientId: string]: { name: string; revenue: number; services: number } } = {};
  paidReceipts.forEach((receipt: any) => {
    const clientId = receipt.clientId;
    if (!clientId) return;

    if (!clientRevenue[clientId]) {
      const client = clients.find((c: any) => c.id === clientId);
      clientRevenue[clientId] = {
        name: client?.name || 'Unknown',
        revenue: 0,
        services: 0,
      };
    }
    clientRevenue[clientId].revenue += receipt.amount || 0;
    clientRevenue[clientId].services += 1;
  });

  const topClientsByRevenue = Object.entries(clientRevenue)
    .map(([id, data]) => ({
      clientId: id,
      clientName: data.name,
      revenue: data.revenue,
      servicesCount: data.services,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    dateRange,
    revenue: {
      totalRevenue,
      previousPeriodRevenue: 0, // Would need historical data
      revenueChange: 0,
      revenueChangePercent: 0,
      revenueOverTime: generateRevenueOverTime(paidReceipts, dateRange.rangeType, startDate!, endDate!),
      revenueByServiceLine: serviceLineBreakdown,
      averageTransactionValue: paidReceipts.length > 0 ? totalRevenue / paidReceipts.length : 0,
      topClients: topClientsByRevenue.map(c => ({
        clientId: c.clientId,
        clientName: c.clientName,
        totalRevenue: c.revenue,
      })),
    },
    clients: {
      totalClients: clients.length,
      activeClients,
      prospectClients,
      completedClients,
      inactiveClients,
      newClientsThisPeriod: newClientsInPeriod,
      previousPeriodNewClients: 0,
      newClientChange: 0,
      newClientChangePercent: 0,
      clientsOverTime: generateClientsOverTime(clients, dateRange.rangeType, startDate!, endDate!),
      clientsByStatus: [
        { status: 'Active', count: activeClients, percentage: clients.length > 0 ? (activeClients / clients.length) * 100 : 0, color: '#4CAF50' },
        { status: 'Prospect', count: prospectClients, percentage: clients.length > 0 ? (prospectClients / clients.length) * 100 : 0, color: '#2196F3' },
        { status: 'Completed', count: completedClients, percentage: clients.length > 0 ? (completedClients / clients.length) * 100 : 0, color: '#9C27B0' },
        { status: 'Inactive', count: inactiveClients, percentage: clients.length > 0 ? (inactiveClients / clients.length) * 100 : 0, color: '#757575' },
      ].filter(s => s.count > 0),
      topClientsByRevenue,
      retentionRate: clients.length > 0 ? (activeClients / clients.length) * 100 : 0,
      previousRetentionRate: 0,
    },
    activity: {
      totalConversations: 0, // Would need conversations API
      conversationsByType: [],
      upcomingEvents,
      completedEvents,
      eventCompletionRate: events.length > 0 ? (completedEvents / events.length) * 100 : 0,
      billableHours: 0, // Would need time tracking data
      previousPeriodBillableHours: 0,
      billableHoursChange: 0,
    },
    billing: {
      pendingInvoices: pendingInvoices.length,
      pendingInvoicesAmount,
      pendingReceipts: pendingReceipts.length,
      pendingReceiptsAmount,
      totalOutstanding: pendingInvoicesAmount + pendingReceiptsAmount,
      overdueAmount,
      overdueCount: overdueInvoices.length,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generate revenue over time data points
 */
function generateRevenueOverTime(
  receipts: any[],
  rangeType: DateRangeType,
  startDate: string,
  endDate: string
): Array<{ date: string; label: string; amount: number }> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dataPoints: { [key: string]: number } = {};

  // Initialize data points based on range type
  if (rangeType === 'this_week') {
    // Daily for week
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = format(d, 'yyyy-MM-dd');
      dataPoints[key] = 0;
    }
  } else if (rangeType === 'this_month') {
    // Weekly for month
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
      const key = format(d, 'yyyy-MM-dd');
      dataPoints[key] = 0;
    }
  } else {
    // Monthly for year
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const key = format(d, 'yyyy-MM');
      dataPoints[key] = 0;
    }
  }

  // Aggregate receipt amounts
  receipts.forEach(receipt => {
    const paidDate = receipt.paidDate || receipt.createdAt;
    if (!paidDate) return;

    const date = new Date(paidDate);
    let key: string;

    if (rangeType === 'this_week') {
      key = format(date, 'yyyy-MM-dd');
    } else if (rangeType === 'this_month') {
      // Find the week start
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      key = format(weekStart, 'yyyy-MM-dd');
    } else {
      key = format(date, 'yyyy-MM');
    }

    if (key in dataPoints) {
      dataPoints[key] += receipt.amount || 0;
    }
  });

  return Object.entries(dataPoints).map(([date, amount]) => ({
    date,
    label: rangeType === 'this_year'
      ? format(new Date(date + '-01'), 'MMM')
      : format(new Date(date), rangeType === 'this_week' ? 'EEE' : 'MM/dd'),
    amount,
  }));
}

/**
 * Generate clients over time data
 */
function generateClientsOverTime(
  clients: any[],
  rangeType: DateRangeType,
  startDate: string,
  endDate: string
): Array<{ date: string; label: string; newClients: number; totalClients: number }> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dataPoints: { [key: string]: { new: number; total: number } } = {};

  // Initialize data points
  if (rangeType === 'this_week') {
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = format(d, 'yyyy-MM-dd');
      dataPoints[key] = { new: 0, total: 0 };
    }
  } else if (rangeType === 'this_month') {
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
      const key = format(d, 'yyyy-MM-dd');
      dataPoints[key] = { new: 0, total: 0 };
    }
  } else {
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const key = format(d, 'yyyy-MM');
      dataPoints[key] = { new: 0, total: 0 };
    }
  }

  // Count clients
  clients.forEach(client => {
    if (!client.createdAt) return;
    const createdDate = new Date(client.createdAt);

    let key: string;
    if (rangeType === 'this_week') {
      key = format(createdDate, 'yyyy-MM-dd');
    } else if (rangeType === 'this_month') {
      const weekStart = startOfWeek(createdDate, { weekStartsOn: 0 });
      key = format(weekStart, 'yyyy-MM-dd');
    } else {
      key = format(createdDate, 'yyyy-MM');
    }

    if (key in dataPoints) {
      dataPoints[key].new += 1;
    }
  });

  // Calculate running total
  let runningTotal = clients.filter(c => {
    if (!c.createdAt) return true;
    return new Date(c.createdAt) < start;
  }).length;

  return Object.entries(dataPoints).map(([date, counts]) => {
    runningTotal += counts.new;
    return {
      date,
      label: rangeType === 'this_year'
        ? format(new Date(date + '-01'), 'MMM')
        : format(new Date(date), rangeType === 'this_week' ? 'EEE' : 'MM/dd'),
      newClients: counts.new,
      totalClients: runningTotal,
    };
  });
}

/**
 * Get color for service line
 */
function getServiceLineColor(index: number): string {
  const colors = [
    '#5c93ff', // Blue
    '#4CAF50', // Green
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
    '#E91E63', // Pink
    '#795548', // Brown
    '#607D8B', // Blue Grey
  ];
  return colors[index % colors.length];
}

interface UseKPISummaryResult {
  data: KPISummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching KPI summary data
 */
export function useKPISummary(dateRange: AnalyticsDateRange): UseKPISummaryResult {
  const [data, setData] = useState<KPISummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsApi.getKPISummary(dateRange);

      if (response.success && response.data) {
        setData(response.data);
      } else {
        // Generate from aggregated data
        const bounds = getDateRangeBounds(dateRange.rangeType, dateRange.startDate, dateRange.endDate);
        const aggregated = await aggregateAnalyticsData({
          ...dateRange,
          startDate: bounds.startDate,
          endDate: bounds.endDate,
        });

        setData({
          totalRevenue: aggregated.revenue.totalRevenue,
          revenueChange: aggregated.revenue.revenueChangePercent,
          activeClients: aggregated.clients.activeClients,
          clientChange: aggregated.clients.newClientChangePercent,
          pendingInvoices: aggregated.billing.pendingInvoices,
          pendingAmount: aggregated.billing.totalOutstanding,
          upcomingEvents: aggregated.activity.upcomingEvents,
          completedEvents: aggregated.activity.completedEvents,
          billableHours: aggregated.activity.billableHours,
          hoursChange: 0,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load KPI data');
      console.error('[useKPISummary] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  return {
    data,
    loading,
    error,
    refetch: fetchKPIs,
  };
}

interface UseRevenueAnalyticsResult {
  data: RevenueAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching revenue analytics
 */
export function useRevenueAnalytics(dateRange: AnalyticsDateRange): UseRevenueAnalyticsResult {
  const [data, setData] = useState<RevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsApi.getRevenue(dateRange);

      if (response.success && response.data) {
        setData(response.data);
      } else {
        const bounds = getDateRangeBounds(dateRange.rangeType, dateRange.startDate, dateRange.endDate);
        const aggregated = await aggregateAnalyticsData({
          ...dateRange,
          startDate: bounds.startDate,
          endDate: bounds.endDate,
        });
        setData(aggregated.revenue);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue data');
      console.error('[useRevenueAnalytics] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  return {
    data,
    loading,
    error,
    refetch: fetchRevenue,
  };
}

interface UseClientAnalyticsResult {
  data: ClientAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching client analytics
 */
export function useClientAnalytics(dateRange: AnalyticsDateRange): UseClientAnalyticsResult {
  const [data, setData] = useState<ClientAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsApi.getClients(dateRange);

      if (response.success && response.data) {
        setData(response.data);
      } else {
        const bounds = getDateRangeBounds(dateRange.rangeType, dateRange.startDate, dateRange.endDate);
        const aggregated = await aggregateAnalyticsData({
          ...dateRange,
          startDate: bounds.startDate,
          endDate: bounds.endDate,
        });
        setData(aggregated.clients);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load client data');
      console.error('[useClientAnalytics] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    data,
    loading,
    error,
    refetch: fetchClients,
  };
}
