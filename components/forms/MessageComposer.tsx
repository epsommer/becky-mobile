/**
 * MessageComposer Component
 * Comprehensive message composition panel with rich text editing and file attachments
 *
 * Integrates:
 * - RichTextEditor for formatted text
 * - FileUploader for attachments
 * - Message type selection
 * - Send/cancel actions
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Shadow } from 'react-native-shadow-2';
import { useTheme, ThemeTokens } from '../../theme/ThemeContext';
import RichTextEditor, { markdownToPlainText } from './RichTextEditor';
import FileUploader, { FileInfo } from './FileUploader';
import { useFileUpload } from '../../services/fileUpload';

// ============================================================================
// Types
// ============================================================================

export type MessageFormat = 'email' | 'sms' | 'note' | 'general';

export interface MessageComposerProps {
  /** Initial message content */
  initialContent?: string;
  /** Initial attachments */
  initialAttachments?: FileInfo[];
  /** Message format/type */
  format?: MessageFormat;
  /** Callback when message is sent */
  onSend: (content: string, attachments: FileInfo[], format: MessageFormat) => Promise<void>;
  /** Callback when composer is closed */
  onClose?: () => void;
  /** Recipient name for context */
  recipientName?: string;
  /** Client ID for file association */
  clientId?: string;
  /** Conversation ID for file association */
  conversationId?: string;
  /** Show format selector */
  showFormatSelector?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Placeholder text */
  placeholder?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Compact mode (less padding, smaller heights) */
  compact?: boolean;
}

// ============================================================================
// Format Options
// ============================================================================

const FORMAT_OPTIONS: { key: MessageFormat; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'email', label: 'Email', icon: 'mail-outline' },
  { key: 'sms', label: 'Text', icon: 'chatbubble-outline' },
  { key: 'note', label: 'Note', icon: 'document-text-outline' },
  { key: 'general', label: 'General', icon: 'create-outline' },
];

// ============================================================================
// Main Component
// ============================================================================

export default function MessageComposer({
  initialContent = '',
  initialAttachments = [],
  format: initialFormat = 'email',
  onSend,
  onClose,
  recipientName,
  clientId,
  conversationId,
  showFormatSelector = true,
  style,
  placeholder,
  readOnly = false,
  compact = false,
}: MessageComposerProps) {
  const { tokens } = useTheme();
  const dynamicStyles = useMemo(() => createDynamicStyles(tokens, compact), [tokens, compact]);

  // State
  const [content, setContent] = useState(initialContent);
  const [attachments, setAttachments] = useState<FileInfo[]>(initialAttachments);
  const [selectedFormat, setSelectedFormat] = useState<MessageFormat>(initialFormat);
  const [isSending, setIsSending] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  // File upload hook
  const { uploadFile } = useFileUpload();

  // Calculate character limits based on format
  const characterLimit = useMemo(() => {
    switch (selectedFormat) {
      case 'sms':
        return 160;
      case 'email':
        return 10000;
      default:
        return 5000;
    }
  }, [selectedFormat]);

  // Get plain text length for character count
  const plainTextLength = useMemo(() => {
    return markdownToPlainText(content).length;
  }, [content]);

  const isOverLimit = plainTextLength > characterLimit;
  const hasContent = content.trim().length > 0;
  const canSend = hasContent && !isOverLimit && !isSending && !readOnly;

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: FileInfo): Promise<string> => {
      const result = await uploadFile(file, {
        clientId,
        conversationId,
        category: 'conversation',
      });

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed');
      }

      return result.url;
    },
    [uploadFile, clientId, conversationId]
  );

  // Handle send
  const handleSend = useCallback(async () => {
    if (!canSend) return;

    setIsSending(true);
    try {
      await onSend(content, attachments, selectedFormat);
      // Clear after successful send
      setContent('');
      setAttachments([]);
      setShowAttachments(false);
    } catch (error) {
      console.error('[MessageComposer] Send error:', error);
      Alert.alert('Send Failed', error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [canSend, content, attachments, selectedFormat, onSend]);

  // Handle close
  const handleClose = useCallback(() => {
    if (hasContent || attachments.length > 0) {
      Alert.alert(
        'Discard Message?',
        'You have unsaved content. Are you sure you want to discard it?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose?.();
    }
  }, [hasContent, attachments, onClose]);

  // Get placeholder based on format
  const getPlaceholder = useCallback(() => {
    if (placeholder) return placeholder;
    switch (selectedFormat) {
      case 'email':
        return recipientName ? `Compose email to ${recipientName}...` : 'Compose your email...';
      case 'sms':
        return recipientName ? `Text ${recipientName}...` : 'Type your message...';
      case 'note':
        return 'Add a note...';
      default:
        return 'Start typing...';
    }
  }, [placeholder, selectedFormat, recipientName]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, style]}
    >
      <Shadow
        startColor={tokens.shadowDark}
        finalColor={tokens.surface}
        offset={[4, 4]}
        distance={12}
        style={{ borderRadius: 16, width: '100%' }}
      >
        <Shadow
          startColor={tokens.shadowLight}
          finalColor={tokens.surface}
          offset={[-4, -4]}
          distance={12}
          style={{ borderRadius: 16, width: '100%' }}
        >
          <View style={[dynamicStyles.composerContainer, { backgroundColor: tokens.surface }]}>
            {/* Header */}
            <View style={[dynamicStyles.header, { borderBottomColor: tokens.border }]}>
              <View style={styles.headerLeft}>
                <Ionicons name="create-outline" size={20} color={tokens.accent} />
                <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
                  {recipientName ? `Message to ${recipientName}` : 'Compose Message'}
                </Text>
              </View>
              {onClose && (
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={22} color={tokens.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Format Selector */}
            {showFormatSelector && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={dynamicStyles.formatSelector}
                contentContainerStyle={styles.formatSelectorContent}
              >
                {FORMAT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.formatButton,
                      { backgroundColor: tokens.background, borderColor: tokens.border },
                      selectedFormat === option.key && {
                        backgroundColor: tokens.accent,
                        borderColor: tokens.accent,
                      },
                    ]}
                    onPress={() => setSelectedFormat(option.key)}
                    disabled={readOnly}
                  >
                    <Ionicons
                      name={option.icon}
                      size={14}
                      color={selectedFormat === option.key ? tokens.textPrimary : tokens.textSecondary}
                    />
                    <Text
                      style={[
                        styles.formatButtonText,
                        {
                          color:
                            selectedFormat === option.key ? tokens.textPrimary : tokens.textSecondary,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Rich Text Editor */}
            <View style={dynamicStyles.editorWrapper}>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder={getPlaceholder()}
                readOnly={readOnly || isSending}
                minHeight={compact ? 80 : 120}
                maxHeight={compact ? 150 : 250}
                showToolbar={selectedFormat !== 'sms'} // SMS doesn't support rich text
              />
            </View>

            {/* Character Count */}
            <View style={[styles.characterCount, { borderTopColor: tokens.border }]}>
              <Text
                style={[
                  styles.characterCountText,
                  { color: isOverLimit ? '#ef4444' : tokens.textSecondary },
                ]}
              >
                {plainTextLength} / {characterLimit} characters
              </Text>
              {isOverLimit && (
                <Ionicons name="warning" size={14} color="#ef4444" style={{ marginLeft: 4 }} />
              )}
            </View>

            {/* Attachments Toggle */}
            <View style={[styles.attachmentsSection, { borderTopColor: tokens.border }]}>
              <TouchableOpacity
                style={styles.attachmentsToggle}
                onPress={() => setShowAttachments(!showAttachments)}
                disabled={readOnly}
              >
                <Ionicons
                  name={showAttachments ? 'chevron-down' : 'attach'}
                  size={18}
                  color={tokens.accent}
                />
                <Text style={[styles.attachmentsToggleText, { color: tokens.textPrimary }]}>
                  Attachments
                  {attachments.length > 0 && ` (${attachments.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* File Uploader */}
            {showAttachments && (
              <View style={dynamicStyles.uploaderWrapper}>
                <FileUploader
                  files={attachments}
                  onFilesChange={setAttachments}
                  onUpload={handleFileUpload}
                  disabled={readOnly || isSending}
                  maxFiles={5}
                  compact
                />
              </View>
            )}

            {/* Action Buttons */}
            <View style={[dynamicStyles.actions, { borderTopColor: tokens.border }]}>
              {onClose && (
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: tokens.border }]}
                  onPress={handleClose}
                  disabled={isSending}
                >
                  <Text style={[styles.cancelButtonText, { color: tokens.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: tokens.accent },
                  !canSend && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!canSend}
              >
                {isSending ? (
                  <Ionicons name="hourglass" size={18} color={tokens.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color={tokens.textPrimary} />
                    <Text style={[styles.sendButtonText, { color: tokens.textPrimary }]}>
                      Send {selectedFormat === 'email' ? 'Email' : 'Message'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Shadow>
      </Shadow>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  formatSelectorContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  formatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  formatButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  characterCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  characterCountText: {
    fontSize: 11,
  },
  attachmentsSection: {
    borderTopWidth: 1,
  },
  attachmentsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  attachmentsToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const createDynamicStyles = (tokens: ThemeTokens, compact: boolean) =>
  StyleSheet.create({
    composerContainer: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: compact ? 12 : 16,
      borderBottomWidth: 1,
    },
    formatSelector: {
      maxHeight: 50,
    },
    editorWrapper: {
      padding: compact ? 8 : 12,
    },
    uploaderWrapper: {
      padding: compact ? 8 : 12,
      paddingTop: 0,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      padding: compact ? 12 : 16,
      borderTopWidth: 1,
    },
  });

// ============================================================================
// Exports
// ============================================================================

export { MessageFormat };
