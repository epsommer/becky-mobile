"use client";

import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { Message } from "../lib/api/types";

export interface MessageActionItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  disabled?: boolean;
}

interface MessageActionsModalProps {
  visible: boolean;
  onClose: () => void;
  message: Message | null;
  isUserMessage: boolean; // Messages sent by the user/employee
  isImportedClientMessage: boolean; // Imported client messages (cannot be deleted/edited)
  onAction: (action: string, message: Message) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MessageActionsModal({
  visible,
  onClose,
  message,
  isUserMessage,
  isImportedClientMessage,
  onAction,
}: MessageActionsModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Define available actions based on message type
  const actions: MessageActionItem[] = useMemo(() => {
    const baseActions: MessageActionItem[] = [
      { key: 'reply', label: 'Reply with AI', icon: 'sparkles-outline' },
      { key: 'forward', label: 'Forward', icon: 'arrow-redo-outline' },
      { key: 'copy', label: 'Copy Text', icon: 'copy-outline' },
      { key: 'pin', label: 'Pin Message', icon: 'pin-outline' },
      { key: 'unread', label: 'Mark Unread', icon: 'mail-unread-outline' },
      { key: 'tag', label: 'Add Tag', icon: 'pricetag-outline' },
    ];

    // Add edit option only for user messages (not imported client messages)
    if (isUserMessage && !isImportedClientMessage) {
      baseActions.unshift({ key: 'edit', label: 'Edit Message', icon: 'create-outline' });
    }

    // Add delete option only for user/employee messages (not imported client messages)
    if (isUserMessage && !isImportedClientMessage) {
      baseActions.push({
        key: 'delete',
        label: 'Delete Message',
        icon: 'trash-outline',
        destructive: true,
      });
    }

    return baseActions;
  }, [isUserMessage, isImportedClientMessage]);

  const handleAction = (action: MessageActionItem) => {
    if (!message) return;

    if (action.destructive) {
      Alert.alert(
        'Delete Message',
        'Are you sure you want to delete this message? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              onAction(action.key, message);
              onClose();
            },
          },
        ]
      );
    } else {
      onAction(action.key, message);
      onClose();
    }
  };

  if (!message) return null;

  // Get message preview
  const messagePreview = message.content.length > 80
    ? message.content.substring(0, 80) + '...'
    : message.content;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          {/* Message Preview */}
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Ionicons
                name={isUserMessage ? 'person' : 'person-circle'}
                size={16}
                color={tokens.accent}
              />
              <Text style={styles.previewRole}>
                {isUserMessage ? 'You' : 'Client'}
              </Text>
              {isImportedClientMessage && (
                <View style={styles.importedBadge}>
                  <Text style={styles.importedBadgeText}>Imported</Text>
                </View>
              )}
            </View>
            <Text style={styles.previewText} numberOfLines={2}>
              {messagePreview}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Action List */}
          <View style={styles.actionsList}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={action.key}
                style={[
                  styles.actionItem,
                  index === actions.length - 1 && styles.actionItemLast,
                  action.disabled && styles.actionItemDisabled,
                ]}
                onPress={() => handleAction(action)}
                disabled={action.disabled}
              >
                <View style={[
                  styles.actionIconContainer,
                  action.destructive && styles.actionIconContainerDestructive,
                ]}>
                  <Ionicons
                    name={action.icon}
                    size={20}
                    color={action.destructive ? '#ef4444' : tokens.accent}
                  />
                </View>
                <Text style={[
                  styles.actionLabel,
                  action.destructive && styles.actionLabelDestructive,
                  action.disabled && styles.actionLabelDisabled,
                ]}>
                  {action.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={action.disabled ? tokens.border : tokens.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: tokens.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 34, // Safe area for home indicator
      maxHeight: SCREEN_HEIGHT * 0.7,
    },
    previewContainer: {
      padding: 16,
      backgroundColor: tokens.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    previewRole: {
      color: tokens.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    importedBadge: {
      backgroundColor: tokens.accent + '30',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    importedBadgeText: {
      color: tokens.accent,
      fontSize: 10,
      fontWeight: '600',
    },
    previewText: {
      color: tokens.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    divider: {
      height: 1,
      backgroundColor: tokens.border,
    },
    actionsList: {
      paddingVertical: 8,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    actionItemLast: {
      borderBottomWidth: 0,
    },
    actionItemDisabled: {
      opacity: 0.5,
    },
    actionIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tokens.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionIconContainerDestructive: {
      backgroundColor: '#ef444420',
    },
    actionLabel: {
      flex: 1,
      color: tokens.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    actionLabelDestructive: {
      color: '#ef4444',
    },
    actionLabelDisabled: {
      color: tokens.textSecondary,
    },
    cancelButton: {
      marginHorizontal: 16,
      marginTop: 8,
      paddingVertical: 14,
      backgroundColor: tokens.background,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: tokens.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
  });
