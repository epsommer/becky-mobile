/**
 * BaseConfirmationModal - Reusable base modal for confirmation dialogs
 *
 * Features:
 * - Generic confirmation modal with optional radio options
 * - Supports destructive action styling
 * - Backdrop with dimming
 * - Slide-up animation
 * - Accessible focus management
 * - Loading and error states
 *
 * Used as base for:
 * - EditRecurringEventModal
 * - DeleteRecurringEventModal
 * - MultidayConflictModal
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import RadioOptionList, { RadioOption } from './RadioOptionList';

export interface BaseConfirmationModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Modal title */
  title: string;
  /** Optional message/description below title */
  message?: string;
  /** Optional list of radio options for selection */
  options?: RadioOption[];
  /** Default selected option id */
  defaultSelectedOption?: string;
  /** Label for confirm button */
  confirmLabel: string;
  /** Label for cancel button */
  cancelLabel?: string;
  /** Whether confirm action is destructive (red styling) */
  isDestructive?: boolean;
  /** Icon to show in header */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icon color (defaults to accent or red for destructive) */
  iconColor?: string;
  /** Callback when confirmed - receives selected option id if options provided */
  onConfirm: (selectedOption?: string) => void | Promise<void>;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Optional custom content to render */
  children?: React.ReactNode;
  /** Whether to show loading state during confirm */
  showLoading?: boolean;
  /** Optional warning message to show */
  warningMessage?: string;
}

export default function BaseConfirmationModal({
  visible,
  title,
  message,
  options,
  defaultSelectedOption,
  confirmLabel,
  cancelLabel = 'Cancel',
  isDestructive = false,
  icon = 'help-circle-outline',
  iconColor,
  onConfirm,
  onCancel,
  children,
  showLoading = true,
  warningMessage,
}: BaseConfirmationModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [selectedOption, setSelectedOption] = useState<string | undefined>(
    defaultSelectedOption || (options && options.length > 0 ? options[0].id : undefined)
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedOption(defaultSelectedOption || (options && options.length > 0 ? options[0].id : undefined));
      setIsProcessing(false);
      setError(null);
    }
  }, [visible, defaultSelectedOption, options]);

  // Announce modal to screen readers
  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(`${title} dialog opened`);
    }
  }, [visible, title]);

  // Handle confirm action
  const handleConfirm = useCallback(async () => {
    setError(null);
    if (showLoading) {
      setIsProcessing(true);
    }

    try {
      await onConfirm(selectedOption);
    } catch (err) {
      console.error('[BaseConfirmationModal] Confirm failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      setIsProcessing(false);
    }
  }, [onConfirm, selectedOption, showLoading]);

  // Handle cancel/close
  const handleClose = useCallback(() => {
    if (!isProcessing) {
      onCancel();
    }
  }, [isProcessing, onCancel]);

  // Determine icon color
  const effectiveIconColor = iconColor || (isDestructive ? '#ef4444' : tokens.accent);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View
          style={styles.container}
          accessible
          accessibilityLabel={`${title} dialog`}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                isDestructive && styles.iconContainerDestructive,
                !isDestructive && { backgroundColor: tokens.accent + '20' },
              ]}
            >
              <Ionicons name={icon} size={24} color={effectiveIconColor} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isProcessing}
              accessibilityLabel="Close dialog"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={tokens.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentInner}
          >
            {/* Message */}
            {message && (
              <Text style={styles.message}>{message}</Text>
            )}

            {/* Custom children content */}
            {children}

            {/* Radio options */}
            {options && options.length > 0 && (
              <RadioOptionList
                options={options}
                selectedId={selectedOption}
                onSelect={setSelectedOption}
                isDestructive={isDestructive}
                disabled={isProcessing}
              />
            )}

            {/* Warning message */}
            {warningMessage && (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={20} color="#f59e0b" />
                <Text style={styles.warningText}>{warningMessage}</Text>
              </View>
            )}

            {/* Error display */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isProcessing}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                isDestructive ? styles.destructiveButton : styles.confirmButton,
                isProcessing && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={isProcessing}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              {isProcessing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.confirmButtonText}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    container: {
      backgroundColor: tokens.background,
      borderRadius: 16,
      width: '100%',
      maxWidth: 400,
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconContainerDestructive: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
      flex: 1,
    },
    closeButton: {
      padding: 4,
    },
    content: {
      maxHeight: 400,
    },
    contentInner: {
      padding: 20,
    },
    message: {
      fontSize: 15,
      lineHeight: 22,
      color: tokens.textSecondary,
      marginBottom: 16,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderRadius: 10,
      padding: 14,
      marginTop: 16,
      gap: 12,
      borderLeftWidth: 3,
      borderLeftColor: '#f59e0b',
    },
    warningText: {
      fontSize: 13,
      lineHeight: 18,
      color: '#b45309',
      flex: 1,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: 10,
      padding: 14,
      marginTop: 16,
      gap: 12,
      borderLeftWidth: 3,
      borderLeftColor: '#ef4444',
    },
    errorText: {
      fontSize: 13,
      lineHeight: 18,
      color: '#dc2626',
      flex: 1,
    },
    actions: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    confirmButton: {
      backgroundColor: tokens.accent,
    },
    destructiveButton: {
      backgroundColor: '#ef4444',
    },
    confirmButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });
