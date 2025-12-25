/**
 * Metric Card Component
 * Displays a single KPI metric with optional change indicator
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeTokens } from '../../theme/ThemeContext';
import NeomorphicCard from '../NeomorphicCard';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  loading?: boolean;
  format?: 'currency' | 'number' | 'percent' | 'none';
  small?: boolean;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  iconColor,
  loading = false,
  format = 'none',
  small = false,
}: MetricCardProps) {
  const { tokens } = useTheme();
  const styles = createStyles(tokens, small);

  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        if (val >= 1000000) {
          return `$${(val / 1000000).toFixed(1)}M`;
        }
        if (val >= 1000) {
          return `$${(val / 1000).toFixed(1)}k`;
        }
        return `$${val.toLocaleString()}`;
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'number':
        return val.toLocaleString();
      default:
        return val.toString();
    }
  };

  const isPositiveChange = change !== undefined && change >= 0;

  if (loading) {
    return (
      <NeomorphicCard style={styles.container} contentStyle={styles.content}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={tokens.accent} />
        </View>
      </NeomorphicCard>
    );
  }

  return (
    <NeomorphicCard style={styles.container} contentStyle={styles.content}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, iconColor ? { borderColor: iconColor } : {}]}>
            <Ionicons
              name={icon}
              size={small ? 16 : 20}
              color={iconColor || tokens.accent}
            />
          </View>
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.valueContainer}>
        <Text style={styles.value}>{formatValue(value)}</Text>
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>

      {change !== undefined && (
        <View style={styles.changeContainer}>
          <Ionicons
            name={isPositiveChange ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={isPositiveChange ? '#4CAF50' : '#F44336'}
          />
          <Text
            style={[
              styles.changeText,
              { color: isPositiveChange ? '#4CAF50' : '#F44336' },
            ]}
          >
            {Math.abs(change).toFixed(1)}%
          </Text>
          {changeLabel && (
            <Text style={styles.changeLabel}>{changeLabel}</Text>
          )}
        </View>
      )}
    </NeomorphicCard>
  );
}

const createStyles = (tokens: ThemeTokens, small: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      margin: 4,
      minWidth: small ? 100 : 140,
    },
    content: {
      padding: small ? 12 : 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    loadingContainer: {
      height: small ? 60 : 80,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: small ? 8 : 12,
    },
    iconContainer: {
      width: small ? 28 : 32,
      height: small ? 28 : 32,
      borderRadius: small ? 14 : 16,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    title: {
      flex: 1,
      fontSize: small ? 11 : 12,
      fontWeight: '500',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    valueContainer: {
      marginBottom: 4,
    },
    value: {
      fontSize: small ? 20 : 28,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    subtitle: {
      fontSize: 11,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    changeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    changeText: {
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 2,
    },
    changeLabel: {
      fontSize: 11,
      color: tokens.textSecondary,
      marginLeft: 4,
    },
  });
