/**
 * Top Clients Card Component
 * Displays top clients by revenue
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, ThemeTokens } from '../../theme/ThemeContext';
import NeomorphicCard from '../NeomorphicCard';

interface TopClient {
  clientId: string;
  clientName: string;
  revenue: number;
  servicesCount?: number;
}

interface TopClientsCardProps {
  data: TopClient[];
  loading?: boolean;
  title?: string;
  maxItems?: number;
}

export default function TopClientsCard({
  data,
  loading = false,
  title = 'Top Clients',
  maxItems = 5,
}: TopClientsCardProps) {
  const { tokens } = useTheme();
  const styles = createStyles(tokens);

  if (loading) {
    return (
      <NeomorphicCard style={styles.container} contentStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={tokens.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
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

  const displayData = data.slice(0, maxItems);
  const maxRevenue = Math.max(...displayData.map(c => c.revenue));

  return (
    <NeomorphicCard style={styles.container} contentStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.listContainer}>
        {displayData.map((client, index) => (
          <View key={client.clientId} style={styles.clientRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName} numberOfLines={1}>
                {client.clientName}
              </Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${(client.revenue / maxRevenue) * 100}%`,
                      backgroundColor: getBarColor(index, tokens),
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.revenueContainer}>
              <Text style={styles.revenueText}>
                ${client.revenue.toLocaleString()}
              </Text>
              {client.servicesCount !== undefined && (
                <Text style={styles.servicesText}>
                  {client.servicesCount} service{client.servicesCount !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </NeomorphicCard>
  );
}

function getBarColor(index: number, tokens: ThemeTokens): string {
  const colors = [
    tokens.accent,
    '#4CAF50',
    '#FF9800',
    '#9C27B0',
    '#00BCD4',
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
    loadingContainer: {
      height: 150,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 8,
      fontSize: 12,
      color: tokens.textSecondary,
    },
    emptyContainer: {
      height: 150,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: tokens.textSecondary,
    },
    listContainer: {},
    clientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    rankBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    rankText: {
      fontSize: 12,
      fontWeight: '700',
      color: tokens.textSecondary,
    },
    clientInfo: {
      flex: 1,
      marginRight: 12,
    },
    clientName: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textPrimary,
      marginBottom: 4,
    },
    progressBarContainer: {
      height: 4,
      backgroundColor: tokens.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 2,
    },
    revenueContainer: {
      alignItems: 'flex-end',
    },
    revenueText: {
      fontSize: 14,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    servicesText: {
      fontSize: 10,
      color: tokens.textSecondary,
      marginTop: 2,
    },
  });
