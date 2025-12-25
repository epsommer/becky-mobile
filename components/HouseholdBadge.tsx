/**
 * HouseholdBadge - Compact badge showing household membership
 *
 * Features:
 * - Lightweight component for showing on client cards
 * - Shows household name and type icon
 * - Lazy loading of household data
 * - Minimal visual footprint
 *
 * @module components/HouseholdBadge
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../theme/ThemeContext';
import { useClientHousehold } from '../hooks/useHouseholds';
import { getHouseholdTypeIcon } from '../services/households';

// ============================================================================
// Props
// ============================================================================

export interface HouseholdBadgeProps {
  /** Client ID to fetch household for */
  clientId: string;
  /** Optional callback when badge is pressed */
  onPress?: () => void;
  /** Show compact version (icon only) */
  compact?: boolean;
  /** Show loading state */
  showLoading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function HouseholdBadge({
  clientId,
  onPress,
  compact = false,
  showLoading = false,
}: HouseholdBadgeProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Fetch household data
  const { household, loading } = useClientHousehold(clientId);

  // Don't render anything if no household
  if (!household && !loading) {
    return null;
  }

  // Loading state
  if (loading && showLoading) {
    return (
      <View style={styles.loadingBadge}>
        <View style={styles.loadingDot} />
      </View>
    );
  }

  // No household
  if (!household) {
    return null;
  }

  const iconName = getHouseholdTypeIcon(household.accountType) as keyof typeof Ionicons.glyphMap;

  // Compact version (icon only)
  if (compact) {
    const CompactWrapper = onPress ? TouchableOpacity : View;
    return (
      <CompactWrapper
        style={styles.compactBadge}
        onPress={onPress}
        {...(onPress && { activeOpacity: 0.7 })}
      >
        <Ionicons name={iconName} size={14} color={tokens.accent} />
      </CompactWrapper>
    );
  }

  // Full badge with name
  const BadgeWrapper = onPress ? TouchableOpacity : View;
  return (
    <BadgeWrapper
      style={styles.badge}
      onPress={onPress}
      {...(onPress && { activeOpacity: 0.7 })}
    >
      <Ionicons name={iconName} size={12} color={tokens.accent} />
      <Text style={styles.badgeText} numberOfLines={1}>
        {household.name}
      </Text>
    </BadgeWrapper>
  );
}

// ============================================================================
// Styles
// ============================================================================

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 3,
      paddingHorizontal: 8,
      backgroundColor: tokens.accent + '15',
      borderRadius: 8,
      maxWidth: 140,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '500',
      color: tokens.accent,
    },
    compactBadge: {
      width: 22,
      height: 22,
      borderRadius: 6,
      backgroundColor: tokens.accent + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingBadge: {
      width: 22,
      height: 22,
      borderRadius: 6,
      backgroundColor: tokens.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: tokens.textSecondary,
      opacity: 0.5,
    },
  });
