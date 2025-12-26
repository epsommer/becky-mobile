/**
 * Analytics Dashboard Screen
 * Main analytics view with KPIs, charts, and metrics
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeTokens } from '../../theme/ThemeContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import {
  MetricCard,
  DateRangeSelector,
  RevenueChart,
  ServiceLineBreakdown,
  ServiceAnalytics,
  ClientStatusChart,
  ClientGrowthChart,
  TopClientsCard,
} from '../analytics';
import { ExportButton, ExportFormat } from '../ExportButton';
import { useExport, AnalyticsExportData } from '../../services/export';

export default function AnalyticsDashboardScreen() {
  const { tokens } = useTheme();
  const styles = createStyles(tokens);

  const {
    data,
    loading,
    error,
    dateRange,
    setDateRangeType,
    setCustomDateRange,
    refetch,
  } = useAnalytics('this_month');

  const [refreshing, setRefreshing] = React.useState(false);
  const { exporting, exportAnalyticsCSV } = useExport();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleExport = async (format: ExportFormat) => {
    if (!data) {
      Alert.alert('No Data', 'No analytics data to export.');
      return;
    }

    const exportData: AnalyticsExportData = {
      dateRange: {
        start: dateRange.startDate || '',
        end: dateRange.endDate || '',
      },
      revenue: {
        total: data.revenue?.totalRevenue || 0,
        byServiceLine: data.revenue?.revenueByServiceLine?.map(item => ({
          name: item.serviceLineName,
          amount: item.amount,
          percentage: item.percentage,
        })) || [],
      },
      clients: {
        total: data.clients?.totalClients || 0,
        active: data.clients?.activeClients || 0,
        prospect: data.clients?.prospectClients || 0,
        completed: data.clients?.completedClients || 0,
        inactive: data.clients?.inactiveClients || 0,
      },
      billing: {
        pendingInvoices: data.billing?.pendingInvoices || 0,
        pendingAmount: data.billing?.totalOutstanding || 0,
        overdueCount: data.billing?.overdueCount || 0,
        overdueAmount: data.billing?.overdueAmount || 0,
      },
    };

    await exportAnalyticsCSV(exportData);
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toLocaleString()}`;
  };

  if (loading && !data) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.textSecondary} />
          <Text style={styles.errorText}>Failed to load analytics</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={styles.headerActions}>
            <ExportButton
              variant="icon"
              formats={['csv']}
              onExport={handleExport}
              loading={exporting}
              showFormatSelector={false}
              icon="download-outline"
              size="small"
            />
            <DateRangeSelector
              currentRange={dateRange}
              onRangeChange={setDateRangeType}
              onCustomRangeSelect={setCustomDateRange}
            />
          </View>
        </View>
        {data?.lastUpdated && (
          <Text style={styles.lastUpdated}>
            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tokens.accent}
            colors={[tokens.accent]}
          />
        }
      >
        {/* KPI Cards Row 1 */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsRow}>
          <MetricCard
            title="Revenue"
            value={data?.revenue?.totalRevenue || 0}
            format="currency"
            change={data?.revenue?.revenueChangePercent}
            changeLabel="vs last period"
            icon="cash-outline"
            iconColor="#4CAF50"
            loading={loading}
          />
          <MetricCard
            title="Active Clients"
            value={data?.clients?.activeClients || 0}
            format="number"
            change={data?.clients?.newClientChangePercent}
            changeLabel="growth"
            icon="people-outline"
            iconColor="#2196F3"
            loading={loading}
          />
        </View>

        {/* KPI Cards Row 2 */}
        <View style={styles.metricsRow}>
          <MetricCard
            title="Pending"
            value={data?.billing?.totalOutstanding || 0}
            subtitle={`${data?.billing?.pendingInvoices || 0} invoices`}
            format="currency"
            icon="receipt-outline"
            iconColor="#FF9800"
            loading={loading}
          />
          <MetricCard
            title="Events"
            value={data?.activity?.upcomingEvents || 0}
            subtitle="upcoming"
            format="number"
            icon="calendar-outline"
            iconColor="#9C27B0"
            loading={loading}
          />
        </View>

        {/* Outstanding Billing Alert */}
        {data?.billing && data.billing.overdueCount > 0 && (
          <View style={styles.alertCard}>
            <Ionicons name="warning" size={20} color="#F44336" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Overdue Invoices</Text>
              <Text style={styles.alertText}>
                {data.billing.overdueCount} invoice{data.billing.overdueCount !== 1 ? 's' : ''} overdue totaling {formatCurrency(data.billing.overdueAmount)}
              </Text>
            </View>
          </View>
        )}

        {/* Revenue Trend Chart */}
        <Text style={styles.sectionTitle}>Revenue Trends</Text>
        <RevenueChart
          data={data?.revenue?.revenueOverTime || []}
          loading={loading}
          title="Revenue Over Time"
        />

        {/* Revenue by Service Line */}
        <ServiceLineBreakdown
          data={data?.revenue?.revenueByServiceLine || []}
          loading={loading}
          title="Revenue by Service"
        />

        {/* Service Line Analytics - Detailed Performance */}
        <Text style={styles.sectionTitle}>Service Line Analytics</Text>
        <ServiceAnalytics
          revenueData={data?.revenue?.revenueByServiceLine || []}
          dateRange={dateRange}
          loading={loading}
          title="Service Performance"
        />

        {/* Client Metrics Section */}
        <Text style={styles.sectionTitle}>Client Analytics</Text>

        {/* Client Status Distribution */}
        <ClientStatusChart
          data={data?.clients?.clientsByStatus || []}
          loading={loading}
          title="Clients by Status"
        />

        {/* Client Growth Chart */}
        <ClientGrowthChart
          data={data?.clients?.clientsOverTime || []}
          loading={loading}
          title="Client Growth"
        />

        {/* Top Clients */}
        <TopClientsCard
          data={data?.clients?.topClientsByRevenue || []}
          loading={loading}
          title="Top Clients by Revenue"
          maxItems={5}
        />

        {/* Activity Metrics */}
        <Text style={styles.sectionTitle}>Activity Overview</Text>
        <View style={styles.metricsRow}>
          <MetricCard
            title="Completed"
            value={data?.activity?.completedEvents || 0}
            subtitle="events"
            format="number"
            icon="checkmark-circle-outline"
            iconColor="#4CAF50"
            loading={loading}
            small
          />
          <MetricCard
            title="Completion"
            value={data?.activity?.eventCompletionRate || 0}
            subtitle="rate"
            format="percent"
            icon="stats-chart-outline"
            iconColor="#2196F3"
            loading={loading}
            small
          />
          <MetricCard
            title="Billable"
            value={data?.activity?.billableHours || 0}
            subtitle="hours"
            format="number"
            icon="time-outline"
            iconColor="#FF9800"
            loading={loading}
            small
          />
        </View>

        {/* Retention Rate */}
        {data?.clients?.retentionRate !== undefined && (
          <View style={styles.retentionCard}>
            <View style={styles.retentionHeader}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#4CAF50" />
              <Text style={styles.retentionTitle}>Client Retention Rate</Text>
            </View>
            <View style={styles.retentionContent}>
              <Text style={styles.retentionValue}>
                {data.clients.retentionRate.toFixed(1)}%
              </Text>
              <View style={styles.retentionBar}>
                <View
                  style={[
                    styles.retentionFill,
                    { width: `${Math.min(data.clients.retentionRate, 100)}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      backgroundColor: tokens.background,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    lastUpdated: {
      fontSize: 11,
      color: tokens.textSecondary,
      marginTop: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: tokens.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorText: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    errorSubtext: {
      marginTop: 4,
      fontSize: 13,
      color: tokens.textSecondary,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginTop: 20,
      marginBottom: 12,
      marginHorizontal: 16,
    },
    metricsRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
    },
    alertCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F4433615',
      borderWidth: 1,
      borderColor: '#F4433630',
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 16,
      marginTop: 12,
    },
    alertContent: {
      marginLeft: 12,
      flex: 1,
    },
    alertTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#F44336',
    },
    alertText: {
      fontSize: 12,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    retentionCard: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      borderRadius: 16,
      padding: 16,
    },
    retentionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    retentionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginLeft: 10,
    },
    retentionContent: {
      alignItems: 'center',
    },
    retentionValue: {
      fontSize: 36,
      fontWeight: '700',
      color: '#4CAF50',
      marginBottom: 8,
    },
    retentionBar: {
      width: '100%',
      height: 8,
      backgroundColor: tokens.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    retentionFill: {
      height: '100%',
      backgroundColor: '#4CAF50',
      borderRadius: 4,
    },
    bottomSpacer: {
      height: 40,
    },
  });
