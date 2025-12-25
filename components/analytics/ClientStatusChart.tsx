/**
 * Client Status Chart Component
 * Displays client distribution by status using a bar chart
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useTheme, ThemeTokens } from '../../theme/ThemeContext';
import NeomorphicCard from '../NeomorphicCard';

interface ClientStatusData {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface ClientStatusChartProps {
  data: ClientStatusData[];
  loading?: boolean;
  title?: string;
}

const screenWidth = Dimensions.get('window').width;

export default function ClientStatusChart({
  data,
  loading = false,
  title = 'Clients by Status',
}: ClientStatusChartProps) {
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
          <Text style={styles.emptyText}>No client data available</Text>
        </View>
      </NeomorphicCard>
    );
  }

  // Use horizontal bar chart representation with custom bars
  const totalClients = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <NeomorphicCard style={styles.container} contentStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.totalText}>
        {totalClients} Total Clients
      </Text>

      <View style={styles.barsContainer}>
        {data.map((item) => (
          <View key={item.status} style={styles.barRow}>
            <View style={styles.barLabel}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={styles.statusLabel}>{item.status}</Text>
            </View>
            <View style={styles.barWrapper}>
              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.countLabel}>{item.count}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.legendContainer}>
        {data.map((item) => (
          <View key={item.status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>
              {item.status}: {item.percentage.toFixed(1)}%
            </Text>
          </View>
        ))}
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
      marginBottom: 4,
    },
    totalText: {
      fontSize: 12,
      color: tokens.textSecondary,
      marginBottom: 16,
    },
    loadingContainer: {
      height: 160,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 8,
      fontSize: 12,
      color: tokens.textSecondary,
    },
    emptyContainer: {
      height: 160,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: tokens.textSecondary,
    },
    barsContainer: {
      marginBottom: 16,
    },
    barRow: {
      marginBottom: 12,
    },
    barLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    colorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    statusLabel: {
      fontSize: 13,
      color: tokens.textPrimary,
      fontWeight: '500',
    },
    barWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    barBackground: {
      flex: 1,
      height: 20,
      backgroundColor: tokens.border,
      borderRadius: 10,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 10,
    },
    countLabel: {
      marginLeft: 8,
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textPrimary,
      minWidth: 30,
    },
    legendContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingTop: 12,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
      marginBottom: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 4,
    },
    legendText: {
      fontSize: 11,
      color: tokens.textSecondary,
    },
  });
