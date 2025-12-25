/**
 * Client Growth Chart Component
 * Displays client acquisition trends over time
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme, ThemeTokens } from '../../theme/ThemeContext';
import NeomorphicCard from '../NeomorphicCard';

interface ClientGrowthDataPoint {
  date: string;
  label: string;
  newClients: number;
  totalClients: number;
}

interface ClientGrowthChartProps {
  data: ClientGrowthDataPoint[];
  loading?: boolean;
  title?: string;
}

const screenWidth = Dimensions.get('window').width;

export default function ClientGrowthChart({
  data,
  loading = false,
  title = 'Client Growth',
}: ClientGrowthChartProps) {
  const { tokens } = useTheme();
  const styles = createStyles(tokens);

  if (loading) {
    return (
      <NeomorphicCard style={styles.container} contentStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={tokens.accent} />
          <Text style={styles.loadingText}>Loading chart...</Text>
        </View>
      </NeomorphicCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <NeomorphicCard style={styles.container} contentStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No growth data available</Text>
        </View>
      </NeomorphicCard>
    );
  }

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        data: data.map(d => d.totalClients),
        color: (opacity = 1) => `rgba(92, 147, 255, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: data.map(d => d.newClients),
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Total Clients', 'New Clients'],
  };

  const chartConfig = {
    backgroundGradientFrom: tokens.surface,
    backgroundGradientTo: tokens.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(92, 147, 255, ${opacity})`,
    labelColor: (opacity = 1) => tokens.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '3',
      strokeWidth: '2',
      stroke: tokens.accent,
    },
    propsForBackgroundLines: {
      strokeDasharray: '5, 5',
      stroke: tokens.border,
      strokeWidth: 1,
    },
  };

  // Calculate summary stats
  const totalNew = data.reduce((sum, d) => sum + d.newClients, 0);
  const latestTotal = data.length > 0 ? data[data.length - 1].totalClients : 0;

  return (
    <NeomorphicCard style={styles.container} contentStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{latestTotal}</Text>
          <Text style={styles.summaryLabel}>Total Clients</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
            +{totalNew}
          </Text>
          <Text style={styles.summaryLabel}>New This Period</Text>
        </View>
      </View>

      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          width={screenWidth - 80}
          height={180}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          withDots={true}
          withInnerLines={true}
          withOuterLines={false}
          fromZero={true}
        />
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#5c93ff' }]} />
          <Text style={styles.legendText}>Total Clients</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>New Clients</Text>
        </View>
      </View>
    </NeomorphicCard>
  );
}

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
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    summaryItem: {
      alignItems: 'center',
      flex: 1,
    },
    summaryDivider: {
      width: 1,
      height: 40,
      backgroundColor: tokens.border,
      marginHorizontal: 16,
    },
    summaryValue: {
      fontSize: 24,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    summaryLabel: {
      fontSize: 11,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    chartWrapper: {
      alignItems: 'center',
      marginHorizontal: -8,
    },
    chart: {
      borderRadius: 16,
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
      fontSize: 14,
      color: tokens.textSecondary,
    },
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 12,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 12,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    legendText: {
      fontSize: 12,
      color: tokens.textSecondary,
    },
  });
