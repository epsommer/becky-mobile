/**
 * Revenue Chart Component
 * Displays revenue trends over time using a line chart
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme, ThemeTokens } from '../../theme/ThemeContext';
import NeomorphicCard from '../NeomorphicCard';
import { RevenueDataPoint } from '../../lib/api/endpoints/analytics';

interface RevenueChartProps {
  data: RevenueDataPoint[];
  loading?: boolean;
  title?: string;
}

const screenWidth = Dimensions.get('window').width;

export default function RevenueChart({
  data,
  loading = false,
  title = 'Revenue Trend',
}: RevenueChartProps) {
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
          <Text style={styles.emptyText}>No revenue data available</Text>
        </View>
      </NeomorphicCard>
    );
  }

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        data: data.map(d => d.amount),
        color: (opacity = 1) => `rgba(92, 147, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Revenue'],
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
      r: '4',
      strokeWidth: '2',
      stroke: tokens.accent,
    },
    propsForBackgroundLines: {
      strokeDasharray: '5, 5',
      stroke: tokens.border,
      strokeWidth: 1,
    },
    formatYLabel: (value: string) => {
      const num = parseFloat(value);
      if (num >= 1000) {
        return `$${(num / 1000).toFixed(1)}k`;
      }
      return `$${num}`;
    },
  };

  return (
    <NeomorphicCard style={styles.container} contentStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          width={screenWidth - 80}
          height={200}
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
      marginBottom: 16,
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
  });
