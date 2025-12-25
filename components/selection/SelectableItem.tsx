/**
 * SelectableItem - Wrapper for items that can be selected
 *
 * Features:
 * - Long-press to enter selection mode
 * - Tap to toggle selection (when in selection mode)
 * - Visual checkbox indicator
 * - Selection highlight
 * - Works with any child content
 *
 * Usage:
 * ```tsx
 * <SelectableItem
 *   id={receipt.id}
 *   onPress={() => openDetails(receipt.id)}
 * >
 *   <ReceiptCard receipt={receipt} />
 * </SelectableItem>
 * ```
 */
import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import { useSelection, useSelectionOptional } from './SelectionProvider';

export interface SelectableItemProps {
  /** Unique ID for this item */
  id: string;
  /** Child content to render */
  children: React.ReactNode;
  /** Handler for normal tap (when not in selection mode) */
  onPress?: () => void;
  /** Handler for long press (can customize selection behavior) */
  onLongPress?: () => void;
  /** Custom container style */
  style?: ViewStyle;
  /** Whether this item is currently disabled */
  disabled?: boolean;
  /** Whether to show the checkbox always (not just in selection mode) */
  alwaysShowCheckbox?: boolean;
  /** Position of the checkbox */
  checkboxPosition?: 'left' | 'right';
}

export default function SelectableItem({
  id,
  children,
  onPress,
  onLongPress,
  style,
  disabled = false,
  alwaysShowCheckbox = false,
  checkboxPosition = 'right',
}: SelectableItemProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const selection = useSelectionOptional();

  // If no selection context, just render as a normal touchable
  if (!selection) {
    return (
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  const {
    isSelectionMode,
    isSelected,
    toggleSelection,
    selectItem,
    enterSelectionMode,
  } = selection;

  const selected = isSelected(id);
  const showCheckbox = isSelectionMode || alwaysShowCheckbox;

  // Handle tap
  const handlePress = useCallback(() => {
    if (disabled) return;

    if (isSelectionMode) {
      // In selection mode, toggle this item's selection
      toggleSelection(id);
    } else if (onPress) {
      // Normal mode, trigger the onPress handler
      onPress();
    }
  }, [disabled, isSelectionMode, toggleSelection, id, onPress]);

  // Handle long press
  const handleLongPress = useCallback(() => {
    if (disabled) return;

    if (onLongPress) {
      // Custom long press handler provided
      onLongPress();
    } else if (!isSelectionMode) {
      // Enter selection mode and select this item
      enterSelectionMode();
      selectItem(id);
    }
  }, [disabled, onLongPress, isSelectionMode, enterSelectionMode, selectItem, id]);

  // Checkbox component
  const checkbox = (
    <View
      style={[
        styles.checkboxContainer,
        checkboxPosition === 'left' ? styles.checkboxLeft : styles.checkboxRight,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.checkbox,
          selected && styles.checkboxSelected,
        ]}
        onPress={() => {
          if (!isSelectionMode) {
            enterSelectionMode();
          }
          toggleSelection(id);
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {selected ? (
          <Ionicons name="checkmark" size={16} color={tokens.background} />
        ) : (
          <View style={styles.checkboxEmpty} />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && styles.containerSelected,
        style,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={disabled}
      activeOpacity={0.7}
      delayLongPress={400}
    >
      {showCheckbox && checkboxPosition === 'left' && checkbox}
      <View style={styles.content}>
        {children}
      </View>
      {showCheckbox && checkboxPosition === 'right' && checkbox}
    </TouchableOpacity>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    containerSelected: {
      backgroundColor: `${tokens.accent}10`, // 10% opacity accent
    },
    content: {
      flex: 1,
    },
    checkboxContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxLeft: {
      marginRight: 12,
    },
    checkboxRight: {
      marginLeft: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: tokens.border,
      backgroundColor: tokens.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      backgroundColor: tokens.accent,
      borderColor: tokens.accent,
    },
    checkboxEmpty: {
      width: 12,
      height: 12,
      borderRadius: 3,
    },
  });
