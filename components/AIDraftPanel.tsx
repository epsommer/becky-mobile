"use client";

import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import {
  AIDraftService,
  MessageTone,
  MessageType,
  ConversationMessage,
  DraftResponse,
} from "../lib/services/AIDraftService";

interface AIDraftPanelProps {
  clientName: string;
  messages: ConversationMessage[];
  onDraftGenerated?: (draft: string) => void;
  onSendDraft?: (draft: string) => void;
  // External message selection support
  externalSelectedMessageId?: string | null;
  onClearExternalSelection?: () => void;
  onRequestMessageSelection?: () => void;
}

const TONE_OPTIONS: { key: MessageTone; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'professional', label: 'Professional', icon: 'briefcase-outline' },
  { key: 'friendly', label: 'Friendly', icon: 'happy-outline' },
  { key: 'formal', label: 'Formal', icon: 'document-text-outline' },
  { key: 'casual', label: 'Casual', icon: 'chatbubble-outline' },
];

const MESSAGE_TYPE_OPTIONS: { key: MessageType; label: string }[] = [
  { key: 'response', label: 'Response' },
  { key: 'follow-up', label: 'Follow-up' },
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'thank-you', label: 'Thank You' },
  { key: 'reminder', label: 'Reminder' },
];

export default function AIDraftPanel({
  clientName,
  messages,
  onDraftGenerated,
  onSendDraft,
  externalSelectedMessageId,
  onClearExternalSelection,
  onRequestMessageSelection,
}: AIDraftPanelProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const [selectedTone, setSelectedTone] = useState<MessageTone>('professional');
  const [selectedType, setSelectedType] = useState<MessageType>('response');
  const [internalSelectedMessageId, setInternalSelectedMessageId] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [editableDraft, setEditableDraft] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMessageSelector, setShowMessageSelector] = useState(false);

  // Use external selection if provided, otherwise internal
  const selectedMessageId = externalSelectedMessageId ?? internalSelectedMessageId;
  const hasExternalSelection = externalSelectedMessageId != null;

  // Get client messages only for selection (when no external selection mechanism)
  const clientMessages = messages.filter(
    m => m.role === 'CLIENT' || m.role === 'client'
  );

  const handleGenerateDraft = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedDraft(null);

    try {
      const response: DraftResponse = await AIDraftService.generateDraft({
        conversationContext: messages,
        clientName,
        messageType: selectedType,
        tone: selectedTone,
        specificInstructions: customInstructions || undefined,
        selectedMessageId: selectedMessageId || undefined,
      });

      if (response.success && response.draftedMessage) {
        setGeneratedDraft(response.draftedMessage);
        onDraftGenerated?.(response.draftedMessage);
      } else {
        setError(response.error || 'Failed to generate draft');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  }, [messages, clientName, selectedType, selectedTone, customInstructions, selectedMessageId, onDraftGenerated]);

  const handleSendDraft = useCallback(() => {
    const draftToSend = isEditing ? editableDraft : generatedDraft;
    if (draftToSend) {
      onSendDraft?.(draftToSend);
      setGeneratedDraft(null);
      setEditableDraft('');
      setIsEditing(false);
    }
  }, [generatedDraft, editableDraft, isEditing, onSendDraft]);

  const handleCopyDraft = useCallback(() => {
    // In a real app, use Clipboard.setString(generatedDraft)
    // For now, just show feedback
  }, [generatedDraft]);

  const handleStartEditing = useCallback(() => {
    if (generatedDraft) {
      setEditableDraft(generatedDraft);
      setIsEditing(true);
    }
  }, [generatedDraft]);

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditableDraft('');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editableDraft.trim()) {
      setGeneratedDraft(editableDraft);
      setIsEditing(false);
    }
  }, [editableDraft]);

  const handleSelectMessage = (msg: ConversationMessage) => {
    setInternalSelectedMessageId(msg.id || null);
    setShowMessageSelector(false);
  };

  const handleClearSelection = () => {
    if (hasExternalSelection && onClearExternalSelection) {
      onClearExternalSelection();
    } else {
      setInternalSelectedMessageId(null);
    }
  };

  const getSelectedMessagePreview = () => {
    if (!selectedMessageId) return null;
    const msg = messages.find(m => m.id === selectedMessageId);
    if (!msg) return null;
    return msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* AI Draft Header */}
      <View style={styles.header}>
        <Ionicons name="sparkles" size={20} color={tokens.accent} />
        <Text style={styles.headerTitle}>Draft Reply with AI</Text>
      </View>

      {/* Message Context Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Reply to Message</Text>

        {selectedMessageId ? (
          /* Selected Message Display */
          <View style={styles.messageSelector}>
            <View style={styles.selectedMessage}>
              <Ionicons name="chatbubble" size={14} color={tokens.accent} />
              <Text style={styles.selectedMessageText} numberOfLines={2}>
                {getSelectedMessagePreview()}
              </Text>
              <TouchableOpacity
                onPress={handleClearSelection}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={18} color={tokens.textSecondary} />
              </TouchableOpacity>
            </View>
            {hasExternalSelection && (
              <Text style={styles.selectionHint}>
                Selected from timeline. Tap message in conversation to change.
              </Text>
            )}
          </View>
        ) : onRequestMessageSelection ? (
          /* External Selection Mode - prompt to select from timeline */
          <TouchableOpacity
            style={styles.messageSelector}
            onPress={onRequestMessageSelection}
          >
            <View style={styles.selectorPlaceholder}>
              <Ionicons name="hand-left-outline" size={18} color={tokens.accent} />
              <Text style={styles.selectorPlaceholderText}>
                Tap a message in the conversation to reply
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          /* Internal Selection Mode - show dropdown */
          <>
            <TouchableOpacity
              style={styles.messageSelector}
              onPress={() => setShowMessageSelector(!showMessageSelector)}
            >
              <View style={styles.selectorPlaceholder}>
                <Ionicons name="add-circle-outline" size={18} color={tokens.accent} />
                <Text style={styles.selectorPlaceholderText}>
                  Select a message to reply to (optional)
                </Text>
              </View>
            </TouchableOpacity>

            {/* Message Selector Dropdown */}
            {showMessageSelector && clientMessages.length > 0 && (
              <View style={styles.messageList}>
                <Text style={styles.messageListTitle}>Recent Client Messages</Text>
                {clientMessages.slice(-5).reverse().map((msg, idx) => (
                  <TouchableOpacity
                    key={msg.id || idx}
                    style={[
                      styles.messageOption,
                      selectedMessageId === msg.id && styles.messageOptionSelected,
                    ]}
                    onPress={() => handleSelectMessage(msg)}
                  >
                    <Text style={styles.messageOptionText} numberOfLines={2}>
                      {msg.content}
                    </Text>
                    {msg.timestamp && (
                      <Text style={styles.messageOptionTime}>
                        {new Date(msg.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {showMessageSelector && clientMessages.length === 0 && (
              <View style={styles.noMessages}>
                <Text style={styles.noMessagesText}>No client messages to select</Text>
              </View>
            )}
          </>
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
                selectedTone === tone.key && styles.toneButtonActive,
              ]}
              onPress={() => setSelectedTone(tone.key)}
            >
              <Ionicons
                name={tone.icon}
                size={16}
                color={selectedTone === tone.key ? tokens.textPrimary : tokens.textSecondary}
              />
              <Text
                style={[
                  styles.toneButtonText,
                  selectedTone === tone.key && styles.toneButtonTextActive,
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.typeRow}>
            {MESSAGE_TYPE_OPTIONS.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeChip,
                  selectedType === type.key && styles.typeChipActive,
                ]}
                onPress={() => setSelectedType(type.key)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    selectedType === type.key && styles.typeChipTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Custom Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Additional Instructions (Optional)</Text>
        <TextInput
          style={styles.instructionsInput}
          placeholder="e.g., Mention the upcoming appointment..."
          placeholderTextColor={tokens.textSecondary}
          value={customInstructions}
          onChangeText={setCustomInstructions}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
        onPress={handleGenerateDraft}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator size="small" color={tokens.textPrimary} />
        ) : (
          <>
            <Ionicons name="sparkles" size={18} color={tokens.textPrimary} />
            <Text style={styles.generateButtonText}>Generate Draft</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Generated Draft */}
      {generatedDraft && (
        <View style={styles.draftContainer}>
          <View style={styles.draftHeader}>
            <Text style={styles.draftLabel}>
              {isEditing ? 'Edit Draft' : 'Generated Draft'}
            </Text>
            <View style={styles.draftActions}>
              {!isEditing && (
                <>
                  <TouchableOpacity onPress={handleStartEditing} style={styles.draftActionButton}>
                    <Ionicons name="create-outline" size={18} color={tokens.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCopyDraft} style={styles.draftActionButton}>
                    <Ionicons name="copy-outline" size={18} color={tokens.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleGenerateDraft}
                    style={styles.draftActionButton}
                  >
                    <Ionicons name="refresh-outline" size={18} color={tokens.accent} />
                  </TouchableOpacity>
                </>
              )}
              {isEditing && (
                <>
                  <TouchableOpacity onPress={handleCancelEditing} style={styles.draftActionButton}>
                    <Ionicons name="close-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveEdit} style={styles.draftActionButton}>
                    <Ionicons name="checkmark-outline" size={18} color="#22c55e" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          <View style={styles.draftContent}>
            {isEditing ? (
              <TextInput
                style={styles.draftEditInput}
                value={editableDraft}
                onChangeText={setEditableDraft}
                multiline
                autoFocus
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.draftText}>{generatedDraft}</Text>
            )}
          </View>
          {!isEditing && (
            <View style={styles.draftButtonsRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleStartEditing}
              >
                <Ionicons name="create-outline" size={16} color={tokens.accent} />
                <Text style={styles.editButtonText}>Edit Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendButton} onPress={handleSendDraft}>
                <Ionicons name="send" size={16} color={tokens.textPrimary} />
                <Text style={styles.sendButtonText}>Use This Draft</Text>
              </TouchableOpacity>
            </View>
          )}
          {isEditing && (
            <View style={styles.draftButtonsRow}>
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={handleCancelEditing}
              >
                <Text style={styles.cancelEditButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveEditButton} onPress={handleSaveEdit}>
                <Ionicons name="checkmark" size={16} color={tokens.textPrimary} />
                <Text style={styles.saveEditButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Info Note */}
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={14} color={tokens.textSecondary} />
        <Text style={styles.infoNoteText}>
          AI drafts are generated based on conversation context. Always review before sending.
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    headerTitle: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: '700',
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
    messageSelector: {
      backgroundColor: tokens.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      padding: 12,
    },
    selectedMessage: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    selectedMessageText: {
      flex: 1,
      color: tokens.textPrimary,
      fontSize: 13,
    },
    selectorPlaceholder: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    selectorPlaceholderText: {
      color: tokens.textSecondary,
      fontSize: 13,
    },
    selectionHint: {
      color: tokens.textSecondary,
      fontSize: 11,
      marginTop: 8,
      fontStyle: 'italic',
    },
    messageList: {
      marginTop: 8,
      backgroundColor: tokens.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      overflow: 'hidden',
    },
    messageListTitle: {
      color: tokens.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    messageOption: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    messageOptionSelected: {
      backgroundColor: tokens.accent + '20',
    },
    messageOptionText: {
      color: tokens.textPrimary,
      fontSize: 13,
      lineHeight: 18,
    },
    messageOptionTime: {
      color: tokens.textSecondary,
      fontSize: 10,
      marginTop: 4,
    },
    noMessages: {
      padding: 16,
      alignItems: 'center',
    },
    noMessagesText: {
      color: tokens.textSecondary,
      fontSize: 12,
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
    typeRow: {
      flexDirection: 'row',
      gap: 8,
      paddingRight: 16,
    },
    typeChip: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: tokens.background,
      borderWidth: 1,
      borderColor: tokens.border,
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
      textAlignVertical: 'top',
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
      color: '#ef4444',
      fontSize: 12,
      flex: 1,
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
    editButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tokens.accent,
    },
    editButtonText: {
      color: tokens.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    sendButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: tokens.accent,
      paddingVertical: 12,
      borderRadius: 10,
    },
    sendButtonText: {
      color: tokens.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    cancelEditButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    cancelEditButtonText: {
      color: tokens.textSecondary,
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
    infoNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      padding: 12,
      backgroundColor: tokens.background,
      borderRadius: 10,
      marginBottom: 20,
    },
    infoNoteText: {
      flex: 1,
      color: tokens.textSecondary,
      fontSize: 11,
      lineHeight: 16,
    },
  });
