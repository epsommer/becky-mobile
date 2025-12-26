/**
 * Offline Indicator Component
 * Shows offline status, sync state, and pending changes
 * @module components/common/OfflineIndicator
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../../hooks/useOffline';
import { useTheme } from '../../theme/ThemeContext';

// ============================================================================
// Types
// ============================================================================

interface OfflineIndicatorProps {
  /** Position of the indicator */
  position?: 'top' | 'bottom';
  /** Whether to show detailed information */
  showDetails?: boolean;
  /** Callback when sync is triggered */
  onSyncPressed?: () => void;
}

interface OfflineBannerProps {
  /** Whether to auto-hide when online */
  autoHide?: boolean;
  /** Custom message to display */
  message?: string;
}

interface SyncStatusBadgeProps {
  /** Size of the badge */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show the pending count */
  showCount?: boolean;
}

// ============================================================================
// Offline Indicator Component
// ============================================================================

export function OfflineIndicator({
  position = 'top',
  showDetails = false,
  onSyncPressed,
}: OfflineIndicatorProps) {
  const { colors } = useTheme();
  const {
    isOnline,
    isSyncing,
    pendingChanges,
    lastSyncTimeAgo,
    hasError,
    syncAll,
  } = useOffline();

  const [expanded, setExpanded] = useState(false);

  const handleSyncPress = async () => {
    if (onSyncPressed) {
      onSyncPressed();
    } else {
      await syncAll();
    }
  };

  // Don't show if online with no pending changes
  if (isOnline && pendingChanges === 0 && !isSyncing && !showDetails) {
    return null;
  }

  const backgroundColor = isOnline
    ? pendingChanges > 0
      ? colors.warning
      : colors.success
    : colors.error;

  const statusText = isOnline
    ? pendingChanges > 0
      ? `${pendingChanges} pending`
      : 'Online'
    : 'Offline';

  const iconName = isOnline
    ? pendingChanges > 0
      ? 'cloud-upload-outline'
      : 'cloud-done-outline'
    : 'cloud-offline-outline';

  return (
    <View
      style={[
        styles.container,
        position === 'top' ? styles.topPosition : styles.bottomPosition,
        { backgroundColor },
      ]}
    >
      <TouchableOpacity
        style={styles.mainContent}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={styles.leftSection}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name={iconName} size={18} color="#FFFFFF" />
          )}
          <Text style={styles.statusText}>
            {isSyncing ? 'Syncing...' : statusText}
          </Text>
        </View>

        {!isOnline || pendingChanges > 0 ? (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncPress}
            disabled={isSyncing || !isOnline}
          >
            <Text style={styles.syncButtonText}>
              {isSyncing ? 'Syncing' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detailsSection}>
          <Text style={styles.detailText}>Last sync: {lastSyncTimeAgo}</Text>
          {hasError && (
            <Text style={[styles.detailText, styles.errorText]}>
              Sync error occurred
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Offline Banner Component
// ============================================================================

export function OfflineBanner({ autoHide = true, message }: OfflineBannerProps) {
  const { colors } = useTheme();
  const { isOnline, pendingChanges } = useOffline();
  const [opacity] = useState(new Animated.Value(1));

  React.useEffect(() => {
    if (autoHide && isOnline && pendingChanges === 0) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, pendingChanges, autoHide, opacity]);

  if (autoHide && isOnline && pendingChanges === 0) {
    return null;
  }

  const bannerMessage = message || (
    isOnline
      ? `${pendingChanges} changes waiting to sync`
      : 'You are offline. Changes will sync when connected.'
  );

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: isOnline ? colors.warning : colors.error,
          opacity,
        },
      ]}
    >
      <Ionicons
        name={isOnline ? 'cloud-upload-outline' : 'cloud-offline-outline'}
        size={16}
        color="#FFFFFF"
      />
      <Text style={styles.bannerText}>{bannerMessage}</Text>
    </Animated.View>
  );
}

// ============================================================================
// Sync Status Badge Component
// ============================================================================

export function SyncStatusBadge({
  size = 'medium',
  showCount = true,
}: SyncStatusBadgeProps) {
  const { colors } = useTheme();
  const { isOnline, isSyncing, pendingChanges, syncAll } = useOffline();

  const sizeStyles = {
    small: { width: 24, height: 24, iconSize: 14 },
    medium: { width: 32, height: 32, iconSize: 18 },
    large: { width: 40, height: 40, iconSize: 24 },
  };

  const { width, height, iconSize } = sizeStyles[size];

  const backgroundColor = isOnline
    ? pendingChanges > 0
      ? colors.warning
      : colors.success
    : colors.error;

  const iconName = isOnline
    ? pendingChanges > 0
      ? 'cloud-upload-outline'
      : 'cloud-done-outline'
    : 'cloud-offline-outline';

  return (
    <TouchableOpacity
      style={[styles.badge, { width, height, backgroundColor }]}
      onPress={() => syncAll()}
      disabled={isSyncing || !isOnline}
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Ionicons name={iconName} size={iconSize} color="#FFFFFF" />
      )}
      {showCount && pendingChanges > 0 && (
        <View style={styles.badgeCount}>
          <Text style={styles.badgeCountText}>
            {pendingChanges > 99 ? '99+' : pendingChanges}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// Pending Changes Indicator Component
// ============================================================================

export function PendingChangesIndicator() {
  const { colors } = useTheme();
  const { pendingChanges, isSyncing } = useOffline();

  if (pendingChanges === 0 && !isSyncing) {
    return null;
  }

  return (
    <View style={[styles.pendingIndicator, { backgroundColor: colors.warning }]}>
      {isSyncing ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          <Ionicons name="time-outline" size={14} color="#FFFFFF" />
          <Text style={styles.pendingText}>{pendingChanges} pending</Text>
        </>
      )}
    </View>
  );
}

// ============================================================================
// Last Sync Time Component
// ============================================================================

export function LastSyncTime() {
  const { colors } = useTheme();
  const { lastSyncTimeAgo, isStale } = useOffline();

  return (
    <View style={styles.lastSyncContainer}>
      <Ionicons
        name="time-outline"
        size={14}
        color={isStale ? colors.warning : colors.textSecondary}
      />
      <Text
        style={[
          styles.lastSyncText,
          { color: isStale ? colors.warning : colors.textSecondary },
        ]}
      >
        {lastSyncTimeAgo}
      </Text>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  topPosition: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  bottomPosition: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  detailText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  errorText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 4,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 8,
  },
  badge: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  lastSyncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastSyncText: {
    fontSize: 12,
    marginLeft: 4,
  },
});

export default OfflineIndicator;
