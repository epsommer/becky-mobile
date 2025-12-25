/**
 * DeleteConfirmationModal - Reusable modal for confirming destructive actions
 *
 * Features:
 * - Generic confirmation modal for delete operations
 * - Neomorphic styling matching app design system
 * - Optional item name display
 * - Customizable button text
 * - Loading state support
 * - Error display
 *
 * Usage:
 * - For simple confirmations, prefer using showDeleteConfirmation() utility
 * - For complex cases or when needing progress/error states, use this modal
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';

export interface DeleteConfirmationModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Title of the confirmation dialog (e.g., "Delete Client?") */
  title: string;
  /** Message explaining the action (e.g., "This action cannot be undone.") */
  message: string;
  /** Optional name of the item being deleted for display */
  itemName?: string;
  /** Callback when user confirms deletion - can be async */
  onConfirm: () => void | Promise<void>;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Text for confirm button (default: "Delete") */
  confirmText?: string;
  /** Text for cancel button (default: "Cancel") */
  cancelText?: string;
  /** Whether to style the confirm button as destructive (default: true) */
  destructive?: boolean;
  /** Icon to show in header (default: "trash-outline") */
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Utility function to show a simple delete confirmation using React Native Alert
 * Use this for straightforward confirmations without custom UI needs
 */
export function showDeleteConfirmation(options: {
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  const {
    title,
    message,
    itemName,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
  } = options;

  const fullMessage = itemName ? `${message}\n\n"${itemName}"` : message;

  Alert.alert(
    title,
    fullMessage,
    [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: 'destructive',
        onPress: onConfirm,
      },
    ]
  );
}

export default function DeleteConfirmationModal({
  visible,
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  destructive = true,
  icon = 'trash-outline',
}: DeleteConfirmationModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle confirm with loading state
  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
    } catch (err) {
      console.error('[DeleteConfirmationModal] Delete failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete. Please try again.');
      setIsDeleting(false);
    }
  }, [onConfirm]);

  // Handle close
  const handleClose = useCallback(() => {
    if (!isDeleting) {
      setError(null);
      onCancel();
    }
  }, [isDeleting, onCancel]);

  // Reset state when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setIsDeleting(false);
      setError(null);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, destructive && styles.iconContainerDestructive]}>
              <Ionicons
                name={icon}
                size={24}
                color={destructive ? '#ef4444' : tokens.accent}
              />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.message}>{message}</Text>

            {/* Item name display */}
            {itemName && (
              <View style={styles.itemNameContainer}>
                <Text style={styles.itemNameLabel}>Item:</Text>
                <Text style={styles.itemName} numberOfLines={2}>
                  {itemName}
                </Text>
              </View>
            )}

            {/* Warning notice */}
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={18} color="#f59e0b" />
              <Text style={styles.warningText}>
                This action cannot be undone.
              </Text>
            </View>

            {/* Error Display */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                destructive ? styles.deleteButton : styles.confirmButton,
                isDeleting && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              {isDeleting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.deleteButtonText}>Deleting...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name={icon} size={18} color="#ffffff" />
                  <Text style={styles.deleteButtonText}>{confirmText}</Text>
                </View>
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
      maxWidth: 340,
      // Neomorphic shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    header: {
      alignItems: 'center',
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: tokens.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      // Neomorphic inset shadow
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    iconContainerDestructive: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
      textAlign: 'center',
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    message: {
      fontSize: 15,
      lineHeight: 22,
      color: tokens.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    itemNameContainer: {
      backgroundColor: tokens.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    itemNameLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    itemName: {
      fontSize: 15,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderRadius: 8,
      padding: 12,
      gap: 10,
    },
    warningText: {
      fontSize: 13,
      color: '#b45309',
      flex: 1,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      gap: 10,
    },
    errorText: {
      fontSize: 13,
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
      paddingHorizontal: 16,
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
    deleteButton: {
      backgroundColor: '#ef4444',
    },
    confirmButton: {
      backgroundColor: tokens.accent,
    },
    deleteButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });
