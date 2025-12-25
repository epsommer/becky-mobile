/**
 * BatchActionBar - Floating action bar for batch operations
 *
 * Features:
 * - Appears when items are selected
 * - Entity-specific action buttons
 * - Animated appearance/disappearance
 * - Selection count display
 * - Select all / deselect all buttons
 * - Exit selection mode
 *
 * Usage:
 * ```tsx
 * <BatchActionBar
 *   onBatchDelete={handleBatchDelete}
 *   onBatchSend={handleBatchSend}
 *   availableIds={receipts.map(r => r.id)}
 * />
 * ```
 */
import React, { useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import { useSelection, EntityType } from './SelectionProvider';

export interface BatchAction {
  /** Unique key for the action */
  key: string;
  /** Display label */
  label: string;
  /** Icon name from Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Action handler - receives array of selected IDs */
  onPress: (selectedIds: string[]) => void | Promise<void>;
  /** Whether this is a destructive action (styled in red) */
  destructive?: boolean;
  /** Whether the action is currently loading */
  loading?: boolean;
  /** Whether the action is disabled */
  disabled?: boolean;
}

export interface BatchActionBarProps {
  /** Array of all selectable item IDs (for select all) */
  availableIds: string[];
  /** Custom actions to display (overrides default entity actions) */
  actions?: BatchAction[];
  /** Handler for batch delete */
  onBatchDelete?: (ids: string[]) => void | Promise<void>;
  /** Handler for batch send (receipts/invoices) */
  onBatchSend?: (ids: string[]) => void | Promise<void>;
  /** Handler for batch mark as paid (receipts/invoices) */
  onBatchMarkPaid?: (ids: string[]) => void | Promise<void>;
  /** Handler for batch archive */
  onBatchArchive?: (ids: string[]) => void | Promise<void>;
  /** Handler for batch export */
  onBatchExport?: (ids: string[]) => void | Promise<void>;
  /** Whether any batch operation is in progress */
  loading?: boolean;
  /** Specific action that is loading */
  loadingAction?: string;
}

export default function BatchActionBar({
  availableIds,
  actions: customActions,
  onBatchDelete,
  onBatchSend,
  onBatchMarkPaid,
  onBatchArchive,
  onBatchExport,
  loading = false,
  loadingAction,
}: BatchActionBarProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const {
    entityType,
    isSelectionMode,
    selectedCount,
    allSelected,
    selectAll,
    deselectAll,
    exitSelectionMode,
    getSelectedIds,
    setTotalCount,
  } = useSelection();

  // Animation for bar appearance
  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Update total count when available IDs change
  useEffect(() => {
    setTotalCount(availableIds.length);
  }, [availableIds.length, setTotalCount]);

  // Animate bar in/out based on selection count
  useEffect(() => {
    if (selectedCount > 0 && isSelectionMode) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedCount, isSelectionMode, slideAnim, fadeAnim]);

  // Build default actions based on entity type
  const defaultActions = useMemo((): BatchAction[] => {
    const actions: BatchAction[] = [];

    // Common actions
    if (onBatchExport) {
      actions.push({
        key: 'export',
        label: 'Export',
        icon: 'download-outline',
        onPress: onBatchExport,
        loading: loadingAction === 'export',
      });
    }

    // Entity-specific actions
    switch (entityType) {
      case 'receipts':
      case 'invoices':
        if (onBatchSend) {
          actions.push({
            key: 'send',
            label: 'Send',
            icon: 'send-outline',
            onPress: onBatchSend,
            loading: loadingAction === 'send',
          });
        }
        if (onBatchMarkPaid) {
          actions.push({
            key: 'markPaid',
            label: 'Mark Paid',
            icon: 'checkmark-circle-outline',
            onPress: onBatchMarkPaid,
            loading: loadingAction === 'markPaid',
          });
        }
        if (onBatchArchive) {
          actions.push({
            key: 'archive',
            label: 'Archive',
            icon: 'archive-outline',
            onPress: onBatchArchive,
            loading: loadingAction === 'archive',
          });
        }
        break;

      case 'clients':
        // Clients have simpler actions - just export and delete
        break;

      case 'messages':
      case 'conversations':
        if (onBatchArchive) {
          actions.push({
            key: 'archive',
            label: 'Archive',
            icon: 'archive-outline',
            onPress: onBatchArchive,
            loading: loadingAction === 'archive',
          });
        }
        break;
    }

    // Delete action (always last, always available)
    if (onBatchDelete) {
      actions.push({
        key: 'delete',
        label: 'Delete',
        icon: 'trash-outline',
        onPress: onBatchDelete,
        destructive: true,
        loading: loadingAction === 'delete',
      });
    }

    return actions;
  }, [
    entityType,
    onBatchDelete,
    onBatchSend,
    onBatchMarkPaid,
    onBatchArchive,
    onBatchExport,
    loadingAction,
  ]);

  const displayActions = customActions || defaultActions;

  // Handle action press
  const handleActionPress = async (action: BatchAction) => {
    if (action.loading || action.disabled || loading) return;
    const ids = getSelectedIds();
    if (ids.length === 0) return;
    await action.onPress(ids);
  };

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll(availableIds);
    }
  };

  // Don't render if no items selected
  if (selectedCount === 0 || !isSelectionMode) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Selection info section */}
      <View style={styles.selectionInfo}>
        <View style={styles.countContainer}>
          <Text style={styles.countText}>{selectedCount}</Text>
          <Text style={styles.selectedLabel}>selected</Text>
        </View>

        {/* Select all / Clear buttons */}
        <View style={styles.selectionControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleSelectAllToggle}
            disabled={loading}
          >
            <Ionicons
              name={allSelected ? 'checkbox' : 'checkbox-outline'}
              size={18}
              color={tokens.accent}
            />
            <Text style={styles.controlButtonText}>
              {allSelected ? 'Deselect' : 'All'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={exitSelectionMode}
            disabled={loading}
          >
            <Ionicons name="close" size={18} color={tokens.textSecondary} />
            <Text style={[styles.controlButtonText, { color: tokens.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions section */}
      <View style={styles.actionsContainer}>
        {displayActions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={[
              styles.actionButton,
              action.destructive && styles.actionButtonDestructive,
              (action.loading || action.disabled || loading) && styles.actionButtonDisabled,
            ]}
            onPress={() => handleActionPress(action)}
            disabled={action.loading || action.disabled || loading}
            activeOpacity={0.7}
          >
            {action.loading ? (
              <ActivityIndicator
                size="small"
                color={action.destructive ? '#ef4444' : tokens.accent}
              />
            ) : (
              <Ionicons
                name={action.icon}
                size={18}
                color={action.destructive ? '#ef4444' : tokens.accent}
              />
            )}
            <Text
              style={[
                styles.actionButtonText,
                action.destructive && styles.actionButtonTextDestructive,
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: tokens.surface,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 28, // Extra padding for safe area
      // Neomorphic shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 16,
    },
    selectionInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    countContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    countText: {
      fontSize: 24,
      fontWeight: '700',
      color: tokens.accent,
      fontFamily: 'Bytesized-Regular',
    },
    selectedLabel: {
      fontSize: 14,
      color: tokens.textSecondary,
      fontFamily: 'lores-9-wide',
    },
    selectionControls: {
      flexDirection: 'row',
      gap: 12,
    },
    controlButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: tokens.background,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    controlButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.accent,
    },
    actionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: tokens.background,
      borderWidth: 1,
      borderColor: tokens.border,
      minWidth: 90,
      justifyContent: 'center',
    },
    actionButtonDestructive: {
      borderColor: 'rgba(239, 68, 68, 0.3)',
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.accent,
    },
    actionButtonTextDestructive: {
      color: '#ef4444',
    },
  });
