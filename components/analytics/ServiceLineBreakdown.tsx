/**
 * Service Line Breakdown Component
 * Displays revenue breakdown by service line using a pie chart
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useTheme, ThemeTokens } from '../../theme/ThemeContext';
import NeomorphicCard from '../NeomorphicCard';
import { RevenueByServiceLine } from '../../lib/api/endpoints/analytics';

interface ServiceLineBreakdownProps {
  data: RevenueByServiceLine[];
  loading?: boolean;
  title?: string;
}

const screenWidth = Dimensions.get('window').width;

export default function ServiceLineBreakdown({
  data,
  loading = false,
  title = 'Revenue by Service',
}: ServiceLineBreakdownProps) {
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
          <Text style={styles.emptyText}>No service line data available</Text>
        </View>
      </NeomorphicCard>
    );
  }

  const chartData = data.map((item, index) => ({
    name: item.serviceLineName.length > 12
      ? item.serviceLineName.substring(0, 12) + '...'
      : item.serviceLineName,
    amount: item.amount,
    color: item.color || getDefaultColor(index),
    legendFontColor: tokens.textSecondary,
    legendFontSize: 11,
  }));

  const chartConfig = {
    backgroundGradientFrom: tokens.surface,
    backgroundGradientTo: tokens.surface,
    color: (opacity = 1) => `rgba(92, 147, 255, ${opacity})`,
    labelColor: (opacity = 1) => tokens.textSecondary,
  };

  return (
    <NeomorphicCard style={styles.container} contentStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartWrapper}>
        <PieChart
          data={chartData}
          width={screenWidth - 80}
          height={180}
          chartConfig={chartConfig}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="0"
          absolute={false}
          hasLegend={true}
        />
      </View>
      <View style={styles.detailsList}>
        {data.map((item, index) => (
          <View key={item.serviceLineId} style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: item.color || getDefaultColor(index) },
                ]}
              />
              <Text style={styles.detailName} numberOfLines={1}>
                {item.serviceLineName}
              </Text>
            </View>
            <View style={styles.detailRight}>
              <Text style={styles.detailAmount}>
                ${item.amount.toLocaleString()}
              </Text>
              <Text style={styles.detailPercent}>
                {item.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </NeomorphicCard>
  );
}

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
      marginBottom: 8,
    },
    loadingContainer: {
      height: 180,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 8,
      fontSize: 12,
      color: tokens.textSecondary,
    },
    emptyContainer: {
      height: 180,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: tokens.textSecondary,
    },
    detailsList: {
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingTop: 12,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    detailLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    colorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    detailName: {
      fontSize: 13,
      color: tokens.textPrimary,
      flex: 1,
    },
    detailRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailAmount: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginRight: 8,
      minWidth: 70,
      textAlign: 'right',
    },
    detailPercent: {
      fontSize: 12,
      color: tokens.textSecondary,
      minWidth: 40,
      textAlign: 'right',
    },
  });
