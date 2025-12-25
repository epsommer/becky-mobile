/**
 * AI Draft Generator Component
 *
 * A standalone, reusable component for generating AI-powered message drafts.
 * Can be used in a bottom sheet, modal, or inline within any view.
 *
 * Features:
 * - Tone selection (professional, friendly, formal, casual)
 * - Message type selection (response, follow-up, etc.)
 * - Custom instructions input
 * - Message selection for context
 * - Draft preview with edit capability
 * - Copy, regenerate, and use actions
 * - Haptic feedback
 * - Loading and error states
 *
 * @module components/ai/AIDraftGenerator
 */

import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import {
  useAIDraft,
  UseAIDraftConfig,
  TONE_OPTIONS,
  MESSAGE_TYPE_OPTIONS,
} from '../../hooks/useAIDraft';
import { ConversationMessage } from '../../lib/services/AIDraftService';
import { MessageTone, MessageType } from '../../lib/api/endpoints';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Props for the AIDraftGenerator component
 */
export interface AIDraftGeneratorProps {
  /** Name of the client for context */
  clientName: string;
  /** Conversation messages for context */
  messages: ConversationMessage[];
  /** Callback when draft is used/accepted */
  onUseDraft?: (draft: string) => void;
  /** Callback when draft is generated */
  onDraftGenerated?: (draft: string) => void;
  /** Callback when component is dismissed */
  onDismiss?: () => void;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Use backend API instead of direct Anthropic API */
  useBackendApi?: boolean;
  /** Enable haptic feedback */
  enableHaptics?: boolean;
  /** Pre-selected message ID to reply to */
  selectedMessageId?: string | null;
  /** Callback when message selection is requested */
  onRequestMessageSelection?: () => void;
  /** Callback to clear external message selection */
  onClearSelection?: () => void;
}

/**
 * Standalone AI Draft Generator component
 *
 * @example
 * ```tsx
 * <AIDraftGenerator
 *   clientName="John Doe"
 *   messages={conversationMessages}
 *   onUseDraft={(draft) => sendMessage(draft)}
 *   onDismiss={() => setShowDraftGenerator(false)}
 * />
 * ```
 */
export default function AIDraftGenerator({
  clientName,
  messages,
  onUseDraft,
  onDraftGenerated,
  onDismiss,
  compact = false,
  useBackendApi = true,
  enableHaptics = true,
  selectedMessageId: externalSelectedMessageId,
  onRequestMessageSelection,
  onClearSelection,
}: AIDraftGeneratorProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens, compact), [tokens, compact]);

  // Configure the hook
  const hookConfig: UseAIDraftConfig = useMemo(() => ({
    clientName,
    messages,
    useBackendApi,
    enableHaptics,
    onDraftGenerated,
    onDraftSent: onUseDraft,
  }), [clientName, messages, useBackendApi, enableHaptics, onDraftGenerated, onUseDraft]);

  const { state, actions } = useAIDraft(hookConfig);

  // Use external selection if provided
  const effectiveSelectedMessageId = externalSelectedMessageId ?? state.selectedMessageId;

  // Get selected message preview
  const selectedMessagePreview = useMemo(() => {
    if (!effectiveSelectedMessageId) return null;
    const msg = messages.find(m => m.id === effectiveSelectedMessageId);
    if (!msg) return null;
    return msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content;
  }, [effectiveSelectedMessageId, messages]);

  // Handle clearing selection (use external or internal)
  const handleClearSelection = useCallback(() => {
    if (onClearSelection) {
      onClearSelection();
    } else {
      actions.selectMessage(null);
    }
  }, [onClearSelection, actions]);

  // Handle message selection mode
  const handleRequestSelection = useCallback(() => {
    if (onRequestMessageSelection) {
      onRequestMessageSelection();
    } else {
      actions.startMessageSelection();
    }
  }, [onRequestMessageSelection, actions]);

  // Handle use draft and dismiss
  const handleUseDraft = useCallback(() => {
    actions.useDraft();
    onDismiss?.();
  }, [actions, onDismiss]);

  // Client messages for internal selector
  const clientMessages = useMemo(() => {
    return messages.filter(m => m.role === 'CLIENT' || m.role === 'client');
  }, [messages]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={20} color={tokens.accent} />
          <Text style={styles.headerTitle}>Draft with AI</Text>
        </View>
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={tokens.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Reply Context */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Reply Context</Text>
        {effectiveSelectedMessageId ? (
          <View style={styles.selectedMessage}>
            <View style={styles.selectedMessageContent}>
              <Ionicons name="chatbubble" size={14} color={tokens.accent} />
              <Text style={styles.selectedMessageText} numberOfLines={2}>
                {selectedMessagePreview}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClearSelection}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={tokens.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.selectMessageButton}
            onPress={handleRequestSelection}
          >
            <Ionicons name="add-circle-outline" size={18} color={tokens.accent} />
            <Text style={styles.selectMessageText}>
              Tap to select a message (optional)
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tone Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tone</Text>
        <View style={styles.toneGrid}>
          {TONE_OPTIONS.map((tone) => (
            <TouchableOpacity
              key={tone.key}
              style={[
                styles.toneButton,
                state.selectedTone === tone.key && styles.toneButtonActive,
              ]}
              onPress={() => actions.setTone(tone.key as MessageTone)}
            >
              <Ionicons
                name={tone.icon as any}
                size={16}
                color={state.selectedTone === tone.key ? tokens.textPrimary : tokens.textSecondary}
              />
              <Text
                style={[
                  styles.toneButtonText,
                  state.selectedTone === tone.key && styles.toneButtonTextActive,
                ]}
              >
                {tone.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Message Type */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Message Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeScrollContent}
        >
          {MESSAGE_TYPE_OPTIONS.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.typeChip,
                state.selectedType === type.key && styles.typeChipActive,
              ]}
              onPress={() => actions.setType(type.key as MessageType)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  state.selectedType === type.key && styles.typeChipTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Custom Instructions */}
      {!compact && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Additional Instructions (Optional)</Text>
          <TextInput
            style={styles.instructionsInput}
            placeholder="e.g., Mention the upcoming appointment..."
            placeholderTextColor={tokens.textSecondary}
            value={state.customInstructions}
            onChangeText={actions.setInstructions}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>
      )}

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.generateButton, state.isGenerating && styles.generateButtonDisabled]}
        onPress={actions.generateDraft}
        disabled={state.isGenerating}
        activeOpacity={0.7}
      >
        {state.isGenerating ? (
          <ActivityIndicator size="small" color={tokens.textPrimary} />
        ) : (
          <>
            <Ionicons name="sparkles" size={18} color={tokens.textPrimary} />
            <Text style={styles.generateButtonText}>Generate Draft</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Error Display */}
      {state.error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{state.error}</Text>
          <TouchableOpacity onPress={actions.clearError}>
            <Ionicons name="close" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Generated Draft */}
      {state.draft && (
        <View style={styles.draftContainer}>
          <View style={styles.draftHeader}>
            <Text style={styles.draftLabel}>
              {state.isEditing ? 'Edit Draft' : 'Generated Draft'}
            </Text>
            <View style={styles.draftActions}>
              {!state.isEditing && (
                <>
                  <TouchableOpacity onPress={actions.startEditing} style={styles.draftActionButton}>
                    <Ionicons name="create-outline" size={18} color={tokens.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={actions.copyDraft} style={styles.draftActionButton}>
                    <Ionicons name="copy-outline" size={18} color={tokens.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={actions.regenerateDraft} style={styles.draftActionButton}>
                    <Ionicons name="refresh-outline" size={18} color={tokens.accent} />
                  </TouchableOpacity>
                </>
              )}
              {state.isEditing && (
                <>
                  <TouchableOpacity onPress={actions.cancelEditing} style={styles.draftActionButton}>
                    <Ionicons name="close-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={actions.saveEdit} style={styles.draftActionButton}>
                    <Ionicons name="checkmark-outline" size={18} color="#22c55e" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={styles.draftContent}>
            {state.isEditing ? (
              <TextInput
                style={styles.draftEditInput}
                value={state.editableDraft}
                onChangeText={actions.updateEditableDraft}
                multiline
                autoFocus
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.draftText}>{state.draft}</Text>
            )}
          </View>

          {/* Draft Action Buttons */}
          <View style={styles.draftButtonsRow}>
            {!state.isEditing ? (
              <>
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={actions.dismissDraft}
                >
                  <Text style={styles.dismissButtonText}>Dismiss</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.useDraftButton}
                  onPress={handleUseDraft}
                >
                  <Ionicons name="send" size={16} color={tokens.textPrimary} />
                  <Text style={styles.useDraftButtonText}>Use Draft</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={actions.cancelEditing}
                >
                  <Text style={styles.dismissButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveEditButton}
                  onPress={actions.saveEdit}
                >
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                  <Text style={styles.saveEditButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Usage Stats */}
          {state.usage && !compact && (
            <View style={styles.usageContainer}>
              <Text style={styles.usageText}>
                Tokens: {state.usage.inputTokens} in / {state.usage.outputTokens} out
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Info Note */}
      {!compact && (
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={14} color={tokens.textSecondary} />
          <Text style={styles.infoNoteText}>
            AI drafts are generated based on conversation context. Always review before sending.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (tokens: ThemeTokens, compact: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: compact ? 16 : 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    closeButton: {
      padding: 4,
    },
    section: {
      marginBottom: 16,
    },
    sectionLabel: {
      color: tokens.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    selectedMessage: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.accent,
      padding: 12,
    },
    selectedMessageContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    selectedMessageText: {
      flex: 1,
      color: tokens.textPrimary,
      fontSize: 13,
    },
    selectMessageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: tokens.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      padding: 12,
    },
    selectMessageText: {
      color: tokens.textSecondary,
      fontSize: 13,
    },
    toneGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    toneButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: tokens.background,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    toneButtonActive: {
      backgroundColor: tokens.accent,
      borderColor: tokens.accent,
    },
    toneButtonText: {
      color: tokens.textSecondary,
      fontSize: 12,
      fontWeight: '500',
    },
    toneButtonTextActive: {
      color: tokens.textPrimary,
    },
    typeScrollContent: {
      paddingRight: 16,
    },
    typeChip: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: tokens.background,
      borderWidth: 1,
      borderColor: tokens.border,
      marginRight: 8,
    },
    typeChipActive: {
      backgroundColor: tokens.accent,
      borderColor: tokens.accent,
    },
    typeChipText: {
      color: tokens.textSecondary,
      fontSize: 12,
      fontWeight: '500',
    },
    typeChipTextActive: {
      color: tokens.textPrimary,
    },
    instructionsInput: {
      backgroundColor: tokens.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      padding: 12,
      color: tokens.textPrimary,
      fontSize: 13,
      minHeight: 60,
    },
    generateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: tokens.accent,
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 16,
    },
    generateButtonDisabled: {
      opacity: 0.6,
    },
    generateButtonText: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#ef444420',
      padding: 12,
      borderRadius: 10,
      marginBottom: 16,
    },
    errorText: {
      flex: 1,
      color: '#ef4444',
      fontSize: 12,
    },
    draftContainer: {
      backgroundColor: tokens.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.accent,
      marginBottom: 16,
      overflow: 'hidden',
    },
    draftHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    draftLabel: {
      color: tokens.accent,
      fontSize: 12,
      fontWeight: '600',
    },
    draftActions: {
      flexDirection: 'row',
      gap: 8,
    },
    draftActionButton: {
      padding: 4,
    },
    draftContent: {
      padding: 12,
    },
    draftText: {
      color: tokens.textPrimary,
      fontSize: 14,
      lineHeight: 22,
    },
    draftEditInput: {
      color: tokens.textPrimary,
      fontSize: 14,
      lineHeight: 22,
      minHeight: 120,
      padding: 0,
    },
    draftButtonsRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 12,
      paddingTop: 0,
    },
    dismissButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    dismissButtonText: {
      color: tokens.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    useDraftButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: tokens.accent,
      paddingVertical: 12,
      borderRadius: 10,
    },
    useDraftButtonText: {
      color: tokens.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    saveEditButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#22c55e',
      paddingVertical: 12,
      borderRadius: 10,
    },
    saveEditButtonText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '600',
    },
    usageContainer: {
      padding: 12,
      paddingTop: 0,
    },
    usageText: {
      color: tokens.textSecondary,
      fontSize: 10,
      textAlign: 'center',
    },
    infoNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      padding: 12,
      backgroundColor: tokens.background,
      borderRadius: 10,
    },
    infoNoteText: {
      flex: 1,
      color: tokens.textSecondary,
      fontSize: 11,
      lineHeight: 16,
    },
  });
