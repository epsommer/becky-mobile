/**
 * RadioOptionList - Reusable radio-style option selector for modals
 *
 * Features:
 * - Radio button style selection
 * - Optional descriptions for each option
 * - Destructive styling option
 * - Accessible with proper roles
 * - Disabled state support
 */
import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';

export interface RadioOption {
  /** Unique identifier for the option */
  id: string;
  /** Display label for the option */
  label: string;
  /** Optional description shown below the label */
  description?: string;
  /** Optional icon to show */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Whether this option is disabled */
  disabled?: boolean;
}

interface RadioOptionListProps {
  /** List of options to display */
  options: RadioOption[];
  /** Currently selected option id */
  selectedId?: string;
  /** Callback when an option is selected */
  onSelect: (id: string) => void;
  /** Whether to use destructive (red) styling */
  isDestructive?: boolean;
  /** Whether the entire list is disabled */
  disabled?: boolean;
}

export default function RadioOptionList({
  options,
  selectedId,
  onSelect,
  isDestructive = false,
  disabled = false,
}: RadioOptionListProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens, isDestructive), [tokens, isDestructive]);

  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {options.map((option) => {
        const isSelected = selectedId === option.id;
        const isDisabled = disabled || option.disabled;

        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              isSelected && styles.optionSelected,
              isDisabled && styles.optionDisabled,
            ]}
            onPress={() => !isDisabled && onSelect(option.id)}
            disabled={isDisabled}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled: isDisabled }}
            accessibilityLabel={option.label}
            accessibilityHint={option.description}
          >
            {/* Radio circle */}
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>

            {/* Icon if provided */}
            {option.icon && (
              <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={isSelected ? (isDestructive ? '#ef4444' : tokens.accent) : tokens.textSecondary}
                />
              </View>
            )}

            {/* Label and description */}
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.label,
                  isSelected && styles.labelSelected,
                  isDisabled && styles.labelDisabled,
                ]}
              >
                {option.label}
              </Text>
              {option.description && (
                <Text
                  style={[
                    styles.description,
                    isDisabled && styles.descriptionDisabled,
                  ]}
                >
                  {option.description}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, isDestructive: boolean) => {
  const accentColor = isDestructive ? '#ef4444' : tokens.accent;

  return StyleSheet.create({
    container: {
      gap: 8,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 14,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    optionSelected: {
      borderColor: accentColor,
      backgroundColor: accentColor + '10',
    },
    optionDisabled: {
      opacity: 0.5,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: tokens.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 1,
    },
    radioSelected: {
      borderColor: accentColor,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: accentColor,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: tokens.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    iconContainerSelected: {
      backgroundColor: accentColor + '20',
    },
    textContainer: {
      flex: 1,
    },
    label: {
      fontSize: 15,
      fontWeight: '500',
      color: tokens.textPrimary,
      marginBottom: 2,
    },
    labelSelected: {
      color: accentColor,
      fontWeight: '600',
    },
    labelDisabled: {
      color: tokens.muted,
    },
    description: {
      fontSize: 13,
      lineHeight: 18,
      color: tokens.textSecondary,
    },
    descriptionDisabled: {
      color: tokens.muted,
    },
  });
};
