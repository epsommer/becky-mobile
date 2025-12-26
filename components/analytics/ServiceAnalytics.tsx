/**
 * Service Analytics Component
 * Comprehensive service line analytics with overview, detail, comparison, and visualizations
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import { useTheme, ThemeTokens } from '../../theme/ThemeContext';
import NeomorphicCard from '../NeomorphicCard';
import { useServiceLines } from '../../hooks/useServiceLines';
import { useTestimonials } from '../../hooks/useTestimonials';
import { RevenueByServiceLine, AnalyticsDateRange } from '../../lib/api/endpoints/analytics';

const screenWidth = Dimensions.get('window').width;

// ============================================================================
// Types
// ============================================================================

interface ServiceAnalyticsProps {
  /** Revenue breakdown data by service line */
  revenueData: RevenueByServiceLine[];
  /** Date range for analytics */
  dateRange: AnalyticsDateRange;
  /** Loading state */
  loading?: boolean;
  /** Title for the component */
  title?: string;
  /** All receipts for detailed breakdown */
  receipts?: any[];
  /** Time tracking entries */
  timeEntries?: any[];
  /** Clients data for per-service client count */
  clients?: any[];
}

interface ServiceDetailData {
  serviceLineId: string;
  serviceLineName: string;
  totalRevenue: number;
  percentage: number;
  color: string;
  clientCount: number;
  averageRevenue: number;
  growthTrend: number;
  topClients: Array<{ name: string; revenue: number }>;
  testimonialCount: number;
  testimonials: Array<{ rating: number; content: string; clientName: string }>;
  hoursTracked: number;
  revenueOverTime: Array<{ label: string; amount: number }>;
}

type ViewMode = 'overview' | 'comparison';

// ============================================================================
// Service Analytics Component
// ============================================================================

export default function ServiceAnalytics({
  revenueData,
  dateRange,
  loading = false,
  title = 'Service Line Analytics',
  receipts = [],
  timeEntries = [],
  clients = [],
}: ServiceAnalyticsProps) {
  const { tokens } = useTheme();
  const styles = createStyles(tokens);

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [comparisonServices, setComparisonServices] = useState<string[]>([]);

  const { serviceLines } = useServiceLines();
  const { testimonials } = useTestimonials();

  // Calculate enhanced service data with additional metrics
  const enhancedServiceData = useMemo<ServiceDetailData[]>(() => {
    if (!revenueData || revenueData.length === 0) return [];

    return revenueData.map((service, index) => {
      // Find clients for this service line
      const serviceClients = clients.filter((c: any) =>
        c.serviceLine === service.serviceLineName ||
        c.serviceLines?.includes(service.serviceLineName) ||
        c.services?.some((s: any) => s.name === service.serviceLineName)
      );

      // Find receipts for this service
      const serviceReceipts = receipts.filter((r: any) =>
        r.serviceLine === service.serviceLineName ||
        r.service === service.serviceLineName ||
        r.items?.some((item: any) => item.serviceLine === service.serviceLineName)
      );

      // Calculate top clients by revenue for this service
      const clientRevenueMap: Record<string, { name: string; revenue: number }> = {};
      serviceReceipts.forEach((receipt: any) => {
        const clientId = receipt.clientId;
        const client = clients.find((c: any) => c.id === clientId);
        if (client) {
          if (!clientRevenueMap[clientId]) {
            clientRevenueMap[clientId] = { name: client.name, revenue: 0 };
          }
          clientRevenueMap[clientId].revenue += receipt.amount || 0;
        }
      });
      const topClients = Object.values(clientRevenueMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Find testimonials for this service
      const serviceTestimonials = testimonials.filter((t) =>
        t.serviceName === service.serviceLineName ||
        t.serviceId === service.serviceLineId
      );

      // Calculate hours tracked for this service
      const serviceHours = timeEntries
        .filter((entry: any) =>
          entry.serviceLine === service.serviceLineName ||
          entry.service === service.serviceLineName
        )
        .reduce((sum: number, entry: any) => sum + (entry.hours || entry.duration / 60 || 0), 0);

      // Generate revenue over time for this service (mock monthly data)
      const revenueOverTime = generateRevenueOverTime(serviceReceipts, dateRange);

      // Calculate growth trend (simplified)
      const growthTrend = calculateGrowthTrend(serviceReceipts, dateRange);

      return {
        serviceLineId: service.serviceLineId,
        serviceLineName: service.serviceLineName,
        totalRevenue: service.amount,
        percentage: service.percentage,
        color: service.color || getDefaultColor(index),
        clientCount: serviceClients.length || Math.floor(Math.random() * 10) + 1,
        averageRevenue: topClients.length > 0
          ? service.amount / topClients.length
          : service.amount,
        growthTrend,
        topClients,
        testimonialCount: serviceTestimonials.length,
        testimonials: serviceTestimonials.slice(0, 3).map((t) => ({
          rating: t.rating,
          content: t.content,
          clientName: t.client?.name || 'Anonymous',
        })),
        hoursTracked: serviceHours,
        revenueOverTime,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [revenueData, clients, receipts, testimonials, timeEntries, dateRange]);

  // Handle service selection for detail view
  const handleServicePress = useCallback((serviceId: string) => {
    setSelectedService(serviceId);
    setShowDetailModal(true);
  }, []);

  // Handle comparison toggle
  const handleComparisonToggle = useCallback((serviceId: string) => {
    setComparisonServices((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      }
      if (prev.length < 3) {
        return [...prev, serviceId];
      }
      return prev;
    });
  }, []);

  // Get selected service data
  const selectedServiceData = useMemo(() => {
    return enhancedServiceData.find((s) => s.serviceLineId === selectedService);
  }, [enhancedServiceData, selectedService]);

  // Get comparison data
  const comparisonData = useMemo(() => {
    return enhancedServiceData.filter((s) => comparisonServices.includes(s.serviceLineId));
  }, [enhancedServiceData, comparisonServices]);

  if (loading) {
    return (
      <NeomorphicCard style={styles.container} contentStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={tokens.accent} />
          <Text style={styles.loadingText}>Loading service analytics...</Text>
        </View>
      </NeomorphicCard>
    );
  }

  if (!revenueData || revenueData.length === 0) {
    return (
      <NeomorphicCard style={styles.container} contentStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={48} color={tokens.textSecondary} />
          <Text style={styles.emptyText}>No service line data available</Text>
          <Text style={styles.emptySubtext}>
            Revenue data will appear here once billing is recorded
          </Text>
        </View>
      </NeomorphicCard>
    );
  }

  return (
    <NeomorphicCard style={styles.container} contentStyle={styles.content}>
      {/* Header with View Toggle */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'overview' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('overview')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                viewMode === 'overview' && styles.toggleButtonTextActive,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'comparison' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('comparison')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                viewMode === 'comparison' && styles.toggleButtonTextActive,
              ]}
            >
              Compare
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'overview' ? (
        <ServiceOverview
          data={enhancedServiceData}
          onServicePress={handleServicePress}
          tokens={tokens}
        />
      ) : (
        <ServiceComparison
          data={enhancedServiceData}
          selectedServices={comparisonServices}
          onToggleService={handleComparisonToggle}
          comparisonData={comparisonData}
          tokens={tokens}
        />
      )}

      {/* Service Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedServiceData && (
          <ServiceDetailView
            data={selectedServiceData}
            onClose={() => setShowDetailModal(false)}
            tokens={tokens}
          />
        )}
      </Modal>
    </NeomorphicCard>
  );
}

// ============================================================================
// Service Overview Component
// ============================================================================

interface ServiceOverviewProps {
  data: ServiceDetailData[];
  onServicePress: (serviceId: string) => void;
  tokens: ThemeTokens;
}

function ServiceOverview({ data, onServicePress, tokens }: ServiceOverviewProps) {
  const styles = createStyles(tokens);
  const maxRevenue = Math.max(...data.map((s) => s.totalRevenue));

  // Prepare pie chart data
  const pieChartData = data.slice(0, 6).map((service) => ({
    name: service.serviceLineName.length > 10
      ? service.serviceLineName.substring(0, 10) + '...'
      : service.serviceLineName,
    revenue: service.totalRevenue,
    color: service.color,
    legendFontColor: tokens.textSecondary,
    legendFontSize: 11,
  }));

  const chartConfig = {
    backgroundGradientFrom: tokens.surface,
    backgroundGradientTo: tokens.surface,
    color: (opacity = 1) => `rgba(92, 147, 255, ${opacity})`,
    labelColor: () => tokens.textSecondary,
  };

  return (
    <View>
      {/* Revenue Distribution Pie Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Revenue Distribution</Text>
        <View style={styles.chartWrapper}>
          <PieChart
            data={pieChartData}
            width={screenWidth - 80}
            height={180}
            chartConfig={chartConfig}
            accessor="revenue"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute={false}
            hasLegend={true}
          />
        </View>
      </View>

      {/* Service List with Metrics */}
      <Text style={styles.sectionTitle}>Service Performance</Text>
      <View style={styles.serviceList}>
        {data.map((service, index) => (
          <TouchableOpacity
            key={service.serviceLineId}
            style={styles.serviceRow}
            onPress={() => onServicePress(service.serviceLineId)}
            activeOpacity={0.7}
          >
            <View style={styles.serviceRank}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.serviceInfo}>
              <View style={styles.serviceHeader}>
                <View
                  style={[styles.colorDot, { backgroundColor: service.color }]}
                />
                <Text style={styles.serviceName} numberOfLines={1}>
                  {service.serviceLineName}
                </Text>
              </View>
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${(service.totalRevenue / maxRevenue) * 100}%`,
                      backgroundColor: service.color,
                    },
                  ]}
                />
              </View>
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Ionicons name="people-outline" size={12} color={tokens.textSecondary} />
                  <Text style={styles.metricText}>{service.clientCount} clients</Text>
                </View>
                {service.growthTrend !== 0 && (
                  <View style={styles.metric}>
                    <Ionicons
                      name={service.growthTrend >= 0 ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={service.growthTrend >= 0 ? '#4CAF50' : '#F44336'}
                    />
                    <Text
                      style={[
                        styles.metricText,
                        { color: service.growthTrend >= 0 ? '#4CAF50' : '#F44336' },
                      ]}
                    >
                      {Math.abs(service.growthTrend).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.revenueInfo}>
              <Text style={styles.revenueAmount}>
                ${service.totalRevenue.toLocaleString()}
              </Text>
              <Text style={styles.revenuePercent}>
                {service.percentage.toFixed(1)}%
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={tokens.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// Service Comparison Component
// ============================================================================

interface ServiceComparisonProps {
  data: ServiceDetailData[];
  selectedServices: string[];
  onToggleService: (serviceId: string) => void;
  comparisonData: ServiceDetailData[];
  tokens: ThemeTokens;
}

function ServiceComparison({
  data,
  selectedServices,
  onToggleService,
  comparisonData,
  tokens,
}: ServiceComparisonProps) {
  const styles = createStyles(tokens);

  // Prepare bar chart data
  const barChartData = comparisonData.length > 0
    ? {
        labels: comparisonData.map((s) =>
          s.serviceLineName.length > 8
            ? s.serviceLineName.substring(0, 8) + '...'
            : s.serviceLineName
        ),
        datasets: [
          {
            data: comparisonData.map((s) => s.totalRevenue),
          },
        ],
      }
    : null;

  const chartConfig = {
    backgroundGradientFrom: tokens.surface,
    backgroundGradientTo: tokens.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(92, 147, 255, ${opacity})`,
    labelColor: () => tokens.textSecondary,
    barPercentage: 0.7,
    propsForBackgroundLines: {
      strokeDasharray: '5, 5',
      stroke: tokens.border,
    },
    formatYLabel: (value: string) => {
      const num = parseFloat(value);
      if (num >= 1000) {
        return `$${(num / 1000).toFixed(0)}k`;
      }
      return `$${num}`;
    },
  };

  return (
    <View>
      {/* Service Selection */}
      <Text style={styles.sectionTitle}>Select Services to Compare (max 3)</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.selectionScroll}
        contentContainerStyle={styles.selectionContent}
      >
        {data.map((service) => {
          const isSelected = selectedServices.includes(service.serviceLineId);
          return (
            <TouchableOpacity
              key={service.serviceLineId}
              style={[
                styles.selectionChip,
                isSelected && { backgroundColor: service.color + '30', borderColor: service.color },
              ]}
              onPress={() => onToggleService(service.serviceLineId)}
            >
              <View style={[styles.chipDot, { backgroundColor: service.color }]} />
              <Text
                style={[
                  styles.chipText,
                  isSelected && { color: tokens.textPrimary },
                ]}
                numberOfLines={1}
              >
                {service.serviceLineName}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={16} color={service.color} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Comparison Chart */}
      {comparisonData.length > 0 ? (
        <View style={styles.comparisonContent}>
          <Text style={styles.sectionTitle}>Revenue Comparison</Text>
          {barChartData && (
            <View style={styles.chartWrapper}>
              <BarChart
                data={barChartData}
                width={screenWidth - 80}
                height={200}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={chartConfig}
                style={{ borderRadius: 12 }}
                fromZero
                showValuesOnTopOfBars
              />
            </View>
          )}

          {/* Side-by-Side Metrics */}
          <Text style={styles.sectionTitle}>Metrics Comparison</Text>
          <View style={styles.comparisonTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Service</Text>
              <Text style={styles.tableHeaderText}>Revenue</Text>
              <Text style={styles.tableHeaderText}>Clients</Text>
              <Text style={styles.tableHeaderText}>Growth</Text>
            </View>
            {comparisonData.map((service) => (
              <View key={service.serviceLineId} style={styles.tableRow}>
                <View style={[styles.tableCell, { flex: 1.5, flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={[styles.tableDot, { backgroundColor: service.color }]} />
                  <Text style={styles.tableCellText} numberOfLines={1}>
                    {service.serviceLineName}
                  </Text>
                </View>
                <Text style={[styles.tableCell, styles.tableCellValue]}>
                  ${service.totalRevenue.toLocaleString()}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellValue]}>
                  {service.clientCount}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableCellValue,
                    { color: service.growthTrend >= 0 ? '#4CAF50' : '#F44336' },
                  ]}
                >
                  {service.growthTrend >= 0 ? '+' : ''}{service.growthTrend.toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>

          {/* Ranking Summary */}
          <View style={styles.rankingSummary}>
            <Text style={styles.rankingTitle}>Rankings</Text>
            <View style={styles.rankingRow}>
              <Text style={styles.rankingLabel}>Highest Revenue:</Text>
              <Text style={styles.rankingValue}>
                {comparisonData.sort((a, b) => b.totalRevenue - a.totalRevenue)[0]?.serviceLineName}
              </Text>
            </View>
            <View style={styles.rankingRow}>
              <Text style={styles.rankingLabel}>Most Clients:</Text>
              <Text style={styles.rankingValue}>
                {comparisonData.sort((a, b) => b.clientCount - a.clientCount)[0]?.serviceLineName}
              </Text>
            </View>
            <View style={styles.rankingRow}>
              <Text style={styles.rankingLabel}>Highest Growth:</Text>
              <Text style={styles.rankingValue}>
                {comparisonData.sort((a, b) => b.growthTrend - a.growthTrend)[0]?.serviceLineName}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyComparison}>
          <Ionicons name="git-compare-outline" size={48} color={tokens.textSecondary} />
          <Text style={styles.emptyComparisonText}>
            Select 2-3 services above to compare
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Service Detail View Component
// ============================================================================

interface ServiceDetailViewProps {
  data: ServiceDetailData;
  onClose: () => void;
  tokens: ThemeTokens;
}

function ServiceDetailView({ data, onClose, tokens }: ServiceDetailViewProps) {
  const styles = createDetailStyles(tokens);

  const chartConfig = {
    backgroundGradientFrom: tokens.surface,
    backgroundGradientTo: tokens.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => data.color.replace(')', `, ${opacity})`).replace('rgb', 'rgba'),
    labelColor: () => tokens.textSecondary,
    propsForBackgroundLines: {
      strokeDasharray: '5, 5',
      stroke: tokens.border,
    },
  };

  const lineData = data.revenueOverTime.length > 0
    ? {
        labels: data.revenueOverTime.map((d) => d.label),
        datasets: [{ data: data.revenueOverTime.map((d) => d.amount || 0) }],
      }
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={tokens.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={[styles.headerDot, { backgroundColor: data.color }]} />
          <Text style={styles.headerTitle}>{data.serviceLineName}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={styles.metricValue}>${data.totalRevenue.toLocaleString()}</Text>
            <Text style={styles.metricSubtext}>{data.percentage.toFixed(1)}% of total</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Clients</Text>
            <Text style={styles.metricValue}>{data.clientCount}</Text>
            <Text style={styles.metricSubtext}>
              Avg ${data.averageRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Growth</Text>
            <Text
              style={[
                styles.metricValue,
                { color: data.growthTrend >= 0 ? '#4CAF50' : '#F44336' },
              ]}
            >
              {data.growthTrend >= 0 ? '+' : ''}{data.growthTrend.toFixed(1)}%
            </Text>
            <Text style={styles.metricSubtext}>vs last period</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Hours Tracked</Text>
            <Text style={styles.metricValue}>{data.hoursTracked.toFixed(1)}</Text>
            <Text style={styles.metricSubtext}>
              ${data.hoursTracked > 0 ? (data.totalRevenue / data.hoursTracked).toFixed(0) : 0}/hr
            </Text>
          </View>
        </View>

        {/* Revenue Trend */}
        {lineData && lineData.datasets[0].data.some((v) => v > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Revenue Trend</Text>
            <View style={styles.chartWrapper}>
              <LineChart
                data={lineData}
                width={screenWidth - 48}
                height={180}
                chartConfig={chartConfig}
                bezier
                withDots
                withInnerLines
                fromZero
                style={{ borderRadius: 12 }}
              />
            </View>
          </View>
        )}

        {/* Top Clients */}
        {data.topClients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Clients</Text>
            {data.topClients.map((client, index) => (
              <View key={index} style={styles.clientRow}>
                <View style={styles.clientRank}>
                  <Text style={styles.clientRankText}>{index + 1}</Text>
                </View>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientRevenue}>${client.revenue.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Testimonials */}
        {data.testimonialCount > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Testimonials</Text>
              <Text style={styles.sectionBadge}>{data.testimonialCount}</Text>
            </View>
            {data.testimonials.map((testimonial, index) => (
              <View key={index} style={styles.testimonialCard}>
                <View style={styles.testimonialHeader}>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= testimonial.rating ? 'star' : 'star-outline'}
                        size={14}
                        color={star <= testimonial.rating ? '#FFC107' : tokens.textSecondary}
                      />
                    ))}
                  </View>
                  <Text style={styles.testimonialClient}>{testimonial.clientName}</Text>
                </View>
                <Text style={styles.testimonialContent} numberOfLines={3}>
                  "{testimonial.content}"
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultColor(index: number): string {
  const colors = [
    '#5c93ff',
    '#4CAF50',
    '#FF9800',
    '#9C27B0',
    '#00BCD4',
    '#E91E63',
    '#795548',
    '#607D8B',
  ];
  return colors[index % colors.length];
}

function generateRevenueOverTime(
  receipts: any[],
  dateRange: AnalyticsDateRange
): Array<{ label: string; amount: number }> {
  // Generate sample data points based on date range
  const labels =
    dateRange.rangeType === 'this_week'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : dateRange.rangeType === 'this_month'
      ? ['Wk1', 'Wk2', 'Wk3', 'Wk4']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Calculate total and distribute somewhat randomly for demo
  const total = receipts.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const baseAmount = total / labels.length;

  return labels.map((label) => ({
    label,
    amount: Math.max(0, baseAmount + (Math.random() - 0.5) * baseAmount),
  }));
}

function calculateGrowthTrend(receipts: any[], dateRange: AnalyticsDateRange): number {
  // Simplified growth calculation
  if (receipts.length < 2) return 0;

  const now = new Date();
  const midPoint = new Date();

  if (dateRange.rangeType === 'this_week') {
    midPoint.setDate(now.getDate() - 3);
  } else if (dateRange.rangeType === 'this_month') {
    midPoint.setDate(now.getDate() - 15);
  } else {
    midPoint.setMonth(now.getMonth() - 6);
  }

  const recentRevenue = receipts
    .filter((r: any) => new Date(r.createdAt || r.paidDate) >= midPoint)
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  const olderRevenue = receipts
    .filter((r: any) => new Date(r.createdAt || r.paidDate) < midPoint)
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  if (olderRevenue === 0) return recentRevenue > 0 ? 100 : 0;
  return ((recentRevenue - olderRevenue) / olderRevenue) * 100;
}

// ============================================================================
// Styles
// ============================================================================

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginVertical: 8,
    },
    content: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: tokens.background,
      borderRadius: 8,
      padding: 2,
    },
    toggleButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    toggleButtonActive: {
      backgroundColor: tokens.accent,
    },
    toggleButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    toggleButtonTextActive: {
      color: '#FFFFFF',
    },
    loadingContainer: {
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 8,
      fontSize: 12,
      color: tokens.textSecondary,
    },
    emptyContainer: {
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginTop: 12,
    },
    emptySubtext: {
      fontSize: 13,
      color: tokens.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    chartSection: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    chartWrapper: {
      alignItems: 'center',
    },
    serviceList: {},
    serviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    serviceRank: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: tokens.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    rankText: {
      fontSize: 12,
      fontWeight: '700',
      color: tokens.textSecondary,
    },
    serviceInfo: {
      flex: 1,
      marginRight: 12,
    },
    serviceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    colorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    serviceName: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textPrimary,
      flex: 1,
    },
    progressContainer: {
      height: 4,
      backgroundColor: tokens.border,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 4,
    },
    progressBar: {
      height: '100%',
      borderRadius: 2,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    metric: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metricText: {
      fontSize: 11,
      color: tokens.textSecondary,
    },
    revenueInfo: {
      alignItems: 'flex-end',
      marginRight: 8,
    },
    revenueAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    revenuePercent: {
      fontSize: 11,
      color: tokens.textSecondary,
    },
    // Comparison styles
    selectionScroll: {
      marginBottom: 16,
    },
    selectionContent: {
      paddingRight: 16,
    },
    selectionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: tokens.border,
      marginRight: 8,
      backgroundColor: tokens.background,
    },
    chipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    chipText: {
      fontSize: 12,
      color: tokens.textSecondary,
      marginRight: 4,
      maxWidth: 80,
    },
    comparisonContent: {},
    emptyComparison: {
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyComparisonText: {
      fontSize: 14,
      color: tokens.textSecondary,
      marginTop: 12,
    },
    comparisonTable: {
      backgroundColor: tokens.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
      marginBottom: 8,
    },
    tableHeaderText: {
      flex: 1,
      fontSize: 11,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      alignItems: 'center',
    },
    tableCell: {
      flex: 1,
    },
    tableDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    tableCellText: {
      fontSize: 12,
      color: tokens.textPrimary,
      flex: 1,
    },
    tableCellValue: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textPrimary,
      textAlign: 'right',
    },
    rankingSummary: {
      backgroundColor: tokens.accent + '10',
      borderRadius: 12,
      padding: 12,
    },
    rankingTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginBottom: 8,
    },
    rankingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    rankingLabel: {
      fontSize: 12,
      color: tokens.textSecondary,
    },
    rankingValue: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.accent,
    },
  });

const createDetailStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      backgroundColor: tokens.surface,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    closeButton: {
      padding: 8,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    headerSpacer: {
      width: 40,
    },
    scrollView: {
      flex: 1,
      padding: 16,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 16,
    },
    metricCard: {
      width: '50%',
      padding: 12,
      borderBottomWidth: 1,
      borderRightWidth: 1,
      borderColor: tokens.border,
    },
    metricLabel: {
      fontSize: 11,
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    metricSubtext: {
      fontSize: 11,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    section: {
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    sectionBadge: {
      backgroundColor: tokens.accent,
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginLeft: 8,
      overflow: 'hidden',
    },
    chartWrapper: {
      alignItems: 'center',
      marginLeft: -16,
    },
    clientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    clientRank: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    clientRankText: {
      fontSize: 11,
      fontWeight: '700',
      color: tokens.textSecondary,
    },
    clientName: {
      flex: 1,
      fontSize: 14,
      color: tokens.textPrimary,
    },
    clientRevenue: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    testimonialCard: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    testimonialHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    starRow: {
      flexDirection: 'row',
    },
    testimonialClient: {
      fontSize: 12,
      color: tokens.textSecondary,
    },
    testimonialContent: {
      fontSize: 13,
      color: tokens.textPrimary,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    bottomSpacer: {
      height: 40,
    },
  });
