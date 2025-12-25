/**
 * React hook for AI-powered draft message generation
 * Provides state management for draft generation, editing, and sending
 *
 * @module hooks/useAIDraft
 */

import { useState, useCallback, useMemo } from 'react';
import { Alert, Platform, Clipboard as RNClipboard, Vibration } from 'react-native';
import {
  aiApi,
  MessageTone,
  MessageType,
  DraftMessageResponse,
} from '../lib/api/endpoints';
import { AIDraftService, ConversationMessage } from '../lib/services/AIDraftService';

// Optional: Try to use expo-clipboard and expo-haptics if available
let Clipboard: { setStringAsync?: (text: string) => Promise<void> } = {};
let Haptics: {
  notificationAsync?: (type: any) => Promise<void>;
  impactAsync?: (style: any) => Promise<void>;
  NotificationFeedbackType?: { Success: string; Error: string };
  ImpactFeedbackStyle?: { Light: string };
} = {};

try {
  Clipboard = require('expo-clipboard');
} catch (e) {
  // Fall back to React Native's Clipboard
}

try {
  Haptics = require('expo-haptics');
} catch (e) {
  // Fall back to Vibration
}

/**
 * Configuration options for the useAIDraft hook
 */
export interface UseAIDraftConfig {
  /** Name of the client for context */
  clientName: string;
  /** Conversation messages for context */
  messages: ConversationMessage[];
  /** Use backend API (true) or direct Anthropic API (false) */
  useBackendApi?: boolean;
  /** Enable haptic feedback */
  enableHaptics?: boolean;
  /** Callback when draft is generated */
  onDraftGenerated?: (draft: string) => void;
  /** Callback when draft is sent/used */
  onDraftSent?: (draft: string) => void;
  /** Callback for errors */
  onError?: (error: string) => void;
}

/**
 * State returned by the useAIDraft hook
 */
export interface UseAIDraftState {
  /** Currently generated draft */
  draft: string | null;
  /** Draft in edit mode */
  editableDraft: string;
  /** Whether currently editing the draft */
  isEditing: boolean;
  /** Whether draft is being generated */
  isGenerating: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Selected message tone */
  selectedTone: MessageTone;
  /** Selected message type */
  selectedType: MessageType;
  /** Custom instructions for AI */
  customInstructions: string;
  /** ID of message being replied to */
  selectedMessageId: string | null;
  /** Whether in message selection mode */
  isSelectingMessage: boolean;
  /** Token usage from last generation */
  usage: { inputTokens: number; outputTokens: number } | null;
}

/**
 * Actions returned by the useAIDraft hook
 */
export interface UseAIDraftActions {
  /** Generate a new draft */
  generateDraft: () => Promise<void>;
  /** Regenerate the current draft */
  regenerateDraft: () => Promise<void>;
  /** Accept and use the current draft */
  useDraft: () => void;
  /** Dismiss/clear the current draft */
  dismissDraft: () => void;
  /** Start editing the draft */
  startEditing: () => void;
  /** Cancel editing without saving */
  cancelEditing: () => void;
  /** Save edits to the draft */
  saveEdit: () => void;
  /** Copy draft to clipboard */
  copyDraft: () => Promise<void>;
  /** Set the message tone */
  setTone: (tone: MessageTone) => void;
  /** Set the message type */
  setType: (type: MessageType) => void;
  /** Set custom instructions */
  setInstructions: (instructions: string) => void;
  /** Select a message to reply to */
  selectMessage: (messageId: string | null) => void;
  /** Enter message selection mode */
  startMessageSelection: () => void;
  /** Exit message selection mode */
  cancelMessageSelection: () => void;
  /** Update editable draft text */
  updateEditableDraft: (text: string) => void;
  /** Clear any error */
  clearError: () => void;
}

/**
 * Hook for AI-powered draft message generation
 *
 * Provides complete state management for:
 * - Generating drafts with customizable tone and type
 * - Editing drafts before use
 * - Selecting specific messages to reply to
 * - Copying drafts to clipboard
 * - Haptic feedback on key actions
 *
 * @param config - Configuration options
 * @returns State and actions for managing AI drafts
 *
 * @example
 * ```tsx
 * function MessageComposer({ clientName, messages }) {
 *   const { state, actions } = useAIDraft({
 *     clientName,
 *     messages,
 *     onDraftSent: (draft) => sendMessage(draft),
 *   });
 *
 *   return (
 *     <View>
 *       <Button
 *         title="Generate Draft"
 *         onPress={actions.generateDraft}
 *         disabled={state.isGenerating}
 *       />
 *       {state.draft && (
 *         <View>
 *           <Text>{state.draft}</Text>
 *           <Button title="Use Draft" onPress={actions.useDraft} />
 *           <Button title="Regenerate" onPress={actions.regenerateDraft} />
 *         </View>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useAIDraft(config: UseAIDraftConfig): {
  state: UseAIDraftState;
  actions: UseAIDraftActions;
} {
  const {
    clientName,
    messages,
    useBackendApi = true,
    enableHaptics = true,
    onDraftGenerated,
    onDraftSent,
    onError,
  } = config;

  // Draft state
  const [draft, setDraft] = useState<string | null>(null);
  const [editableDraft, setEditableDraft] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration state
  const [selectedTone, setSelectedTone] = useState<MessageTone>('professional');
  const [selectedType, setSelectedType] = useState<MessageType>('response');
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isSelectingMessage, setIsSelectingMessage] = useState(false);

  // Usage tracking
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number } | null>(null);

  // Haptic feedback helper
  const triggerHaptic = useCallback(async (type: 'success' | 'error' | 'light' = 'light') => {
    if (!enableHaptics || Platform.OS === 'web') return;

    try {
      // Try expo-haptics first
      if (Haptics.notificationAsync && Haptics.NotificationFeedbackType && Haptics.impactAsync && Haptics.ImpactFeedbackStyle) {
        switch (type) {
          case 'success':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'error':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
          default:
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        // Fall back to Vibration
        Vibration.vibrate(type === 'error' ? [0, 50, 50, 50] : 10);
      }
    } catch (e) {
      // Haptics not available, try vibration
      try {
        Vibration.vibrate(10);
      } catch (vibError) {
        // Vibration not available either
      }
    }
  }, [enableHaptics]);

  // Generate draft
  const generateDraft = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setDraft(null);

    await triggerHaptic('light');

    try {
      let response: DraftMessageResponse;

      if (useBackendApi) {
        // Use backend API
        const apiResponse = await aiApi.generateDraft({
          conversationContext: messages,
          clientName,
          messageType: selectedType,
          tone: selectedTone,
          specificInstructions: customInstructions || undefined,
          selectedMessageId: selectedMessageId || undefined,
        });

        if (!apiResponse.success || !apiResponse.data) {
          throw new Error(apiResponse.error || 'Failed to generate draft');
        }

        response = apiResponse.data;
      } else {
        // Use direct Anthropic API
        response = await AIDraftService.generateDraft({
          conversationContext: messages,
          clientName,
          messageType: selectedType,
          tone: selectedTone,
          specificInstructions: customInstructions || undefined,
          selectedMessageId: selectedMessageId || undefined,
        });
      }

      if (response.success && response.draftedMessage) {
        setDraft(response.draftedMessage);
        setUsage(response.usage || null);
        onDraftGenerated?.(response.draftedMessage);
        await triggerHaptic('success');
      } else {
        throw new Error(response.error || 'No draft generated');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate draft';
      setError(errorMessage);
      onError?.(errorMessage);
      await triggerHaptic('error');
    } finally {
      setIsGenerating(false);
    }
  }, [
    isGenerating,
    useBackendApi,
    messages,
    clientName,
    selectedType,
    selectedTone,
    customInstructions,
    selectedMessageId,
    onDraftGenerated,
    onError,
    triggerHaptic,
  ]);

  // Regenerate draft (same as generate but clears current)
  const regenerateDraft = useCallback(async () => {
    setDraft(null);
    await generateDraft();
  }, [generateDraft]);

  // Use the current draft
  const useDraft = useCallback(() => {
    const finalDraft = isEditing ? editableDraft : draft;
    if (finalDraft) {
      onDraftSent?.(finalDraft);
      setDraft(null);
      setEditableDraft('');
      setIsEditing(false);
      setSelectedMessageId(null);
      triggerHaptic('success');
    }
  }, [draft, editableDraft, isEditing, onDraftSent, triggerHaptic]);

  // Dismiss draft
  const dismissDraft = useCallback(() => {
    setDraft(null);
    setEditableDraft('');
    setIsEditing(false);
    setError(null);
    triggerHaptic('light');
  }, [triggerHaptic]);

  // Start editing
  const startEditing = useCallback(() => {
    if (draft) {
      setEditableDraft(draft);
      setIsEditing(true);
    }
  }, [draft]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditableDraft('');
  }, []);

  // Save edit
  const saveEdit = useCallback(() => {
    if (editableDraft.trim()) {
      setDraft(editableDraft.trim());
      setIsEditing(false);
    }
  }, [editableDraft]);

  // Copy draft to clipboard
  const copyDraft = useCallback(async () => {
    const textToCopy = isEditing ? editableDraft : draft;
    if (textToCopy) {
      try {
        // Try expo-clipboard first, then fall back to RN Clipboard
        if (Clipboard.setStringAsync) {
          await Clipboard.setStringAsync(textToCopy);
        } else {
          RNClipboard.setString(textToCopy);
        }
        await triggerHaptic('success');
        Alert.alert('Copied', 'Draft copied to clipboard');
      } catch (e) {
        // Try RN Clipboard as last resort
        try {
          RNClipboard.setString(textToCopy);
          await triggerHaptic('success');
          Alert.alert('Copied', 'Draft copied to clipboard');
        } catch (rnError) {
          await triggerHaptic('error');
          Alert.alert('Error', 'Failed to copy to clipboard');
        }
      }
    }
  }, [draft, editableDraft, isEditing, triggerHaptic]);

  // Configuration setters
  const setTone = useCallback((tone: MessageTone) => {
    setSelectedTone(tone);
  }, []);

  const setType = useCallback((type: MessageType) => {
    setSelectedType(type);
  }, []);

  const setInstructions = useCallback((instructions: string) => {
    setCustomInstructions(instructions);
  }, []);

  const selectMessage = useCallback((messageId: string | null) => {
    setSelectedMessageId(messageId);
    setIsSelectingMessage(false);
  }, []);

  const startMessageSelection = useCallback(() => {
    setIsSelectingMessage(true);
  }, []);

  const cancelMessageSelection = useCallback(() => {
    setIsSelectingMessage(false);
  }, []);

  const updateEditableDraft = useCallback((text: string) => {
    setEditableDraft(text);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoized state
  const state: UseAIDraftState = useMemo(() => ({
    draft,
    editableDraft,
    isEditing,
    isGenerating,
    error,
    selectedTone,
    selectedType,
    customInstructions,
    selectedMessageId,
    isSelectingMessage,
    usage,
  }), [
    draft,
    editableDraft,
    isEditing,
    isGenerating,
    error,
    selectedTone,
    selectedType,
    customInstructions,
    selectedMessageId,
    isSelectingMessage,
    usage,
  ]);

  // Memoized actions
  const actions: UseAIDraftActions = useMemo(() => ({
    generateDraft,
    regenerateDraft,
    useDraft,
    dismissDraft,
    startEditing,
    cancelEditing,
    saveEdit,
    copyDraft,
    setTone,
    setType,
    setInstructions,
    selectMessage,
    startMessageSelection,
    cancelMessageSelection,
    updateEditableDraft,
    clearError,
  }), [
    generateDraft,
    regenerateDraft,
    useDraft,
    dismissDraft,
    startEditing,
    cancelEditing,
    saveEdit,
    copyDraft,
    setTone,
    setType,
    setInstructions,
    selectMessage,
    startMessageSelection,
    cancelMessageSelection,
    updateEditableDraft,
    clearError,
  ]);

  return { state, actions };
}

/**
 * Default message tone options with labels and icons
 */
export const TONE_OPTIONS: Array<{
  key: MessageTone;
  label: string;
  icon: string;
}> = [
  { key: 'professional', label: 'Professional', icon: 'briefcase-outline' },
  { key: 'friendly', label: 'Friendly', icon: 'happy-outline' },
  { key: 'formal', label: 'Formal', icon: 'document-text-outline' },
  { key: 'casual', label: 'Casual', icon: 'chatbubble-outline' },
];

/**
 * Default message type options with labels
 */
export const MESSAGE_TYPE_OPTIONS: Array<{
  key: MessageType;
  label: string;
}> = [
  { key: 'response', label: 'Response' },
  { key: 'follow-up', label: 'Follow-up' },
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'thank-you', label: 'Thank You' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'meeting-confirmation', label: 'Meeting Confirmation' },
  { key: 'general-outreach', label: 'General Outreach' },
];
