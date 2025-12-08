"use client";

import { useState, useEffect } from 'react';
import { Sparkles, Send, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { Conversation, Client, Message } from '../types/client';

interface MasterTimelineDraftAIProps {
  conversations: Conversation[];
  allMessages: (Message & { conversationId: string; conversationTitle: string })[];
  client: Client;
  selectedMessage?: (Message & { conversationId: string }) | null;
  onMessageSent: () => void;
}

type ContextMode = 'full' | 'reply' | 'new';
type Tone = 'professional' | 'friendly' | 'formal' | 'casual';
type MessageType = 'response' | 'follow-up' | 'inquiry';

export default function MasterTimelineDraftAI({
  conversations,
  allMessages,
  client,
  selectedMessage,
  onMessageSent
}: MasterTimelineDraftAIProps) {
  const [contextMode, setContextMode] = useState<ContextMode>('full');
  const [tone, setTone] = useState<Tone>('professional');
  const [messageType, setMessageType] = useState<MessageType>('response');
  const [customInstructions, setCustomInstructions] = useState('');
  const [draftedMessage, setDraftedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Auto-select target conversation
  const [targetConversationId, setTargetConversationId] = useState<string>('');

  // Auto-detect conversation when a message is selected for reply
  useEffect(() => {
    if (selectedMessage && selectedMessage.conversationId) {
      setTargetConversationId(selectedMessage.conversationId);
      setContextMode('reply');
    } else if (conversations.length > 0) {
      // Default to most recent conversation
      const mostRecent = [...conversations].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      setTargetConversationId(mostRecent.id);
    }
  }, [selectedMessage, conversations]);

  const targetConversation = conversations.find(c => c.id === targetConversationId);

  const getContextDescription = () => {
    switch (contextMode) {
      case 'full':
        return 'Using complete conversation history for context';
      case 'reply':
        if (selectedMessage && 'conversationTitle' in selectedMessage) {
          return `Replying to message in "${(selectedMessage as any).conversationTitle}"`;
        }
        return 'Select a message to reply to';
      case 'new':
        return 'Starting fresh conversation';
      default:
        return '';
    }
  };

  const handleGenerateDraft = async () => {
    if (!targetConversationId) {
      setError('Please select a target conversation');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const targetConv = conversations.find(c => c.id === targetConversationId);
      if (!targetConv) throw new Error('Target conversation not found');

      // Build context based on mode
      let contextMessages = targetConv.messages || [];

      if (contextMode === 'reply' && selectedMessage) {
        // Include messages up to and including the selected message
        const selectedIndex = contextMessages.findIndex(m => m.id === selectedMessage.id);
        if (selectedIndex >= 0) {
          contextMessages = contextMessages.slice(0, selectedIndex + 1);
        }
      } else if (contextMode === 'new') {
        contextMessages = [];
      }

      const response = await fetch('/api/ai/draft-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: targetConversationId,
          clientName: client.name,
          conversationContext: contextMessages,
          tone,
          messageType,
          specificInstructions: customInstructions.trim() || undefined,
          replyToMessage: contextMode === 'reply' && selectedMessage ? selectedMessage.content : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate draft');
      }

      const data = await response.json();
      setDraftedMessage(data.draftedMessage || '');
      setIsEditing(true);
    } catch (err) {
      console.error('Error generating draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate draft');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!draftedMessage.trim() || !targetConversationId) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${targetConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: draftedMessage.trim(),
          role: 'you',
          timestamp: new Date().toISOString(),
          type: 'text',
          metadata: {
            generatedByAI: true,
            tone,
            messageType
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Reset form
      setDraftedMessage('');
      setIsEditing(false);
      setCustomInstructions('');
      onMessageSent();
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="flex items-center space-x-2 mb-2">
        <Sparkles className="w-5 h-5 text-[var(--neomorphic-accent)]" />
        <h3 className="text-lg font-bold font-primary uppercase text-foreground">Draft AI</h3>
      </div>

      {/* Target Conversation Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide font-primary">
          Target Conversation
        </label>
        <div className="flex items-center gap-2">
          <select
            value={targetConversationId}
            onChange={(e) => setTargetConversationId(e.target.value)}
            className="flex-1 neo-button px-3 py-2 text-xs font-primary uppercase text-foreground"
          >
            <option value="">Select conversation...</option>
            {conversations
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map(conv => (
                <option key={conv.id} value={conv.id}>
                  {conv.title || 'Untitled'} ({conv.messages?.length || 0} msgs)
                </option>
              ))}
          </select>
          {targetConversation && (
            <span className="neo-badge text-xs px-2 py-1 bg-accent/20 text-foreground">
              {targetConversation.status}
            </span>
          )}
        </div>
        {selectedMessage && 'conversationTitle' in selectedMessage && (
          <div className="neo-inset p-2 text-xs text-muted-foreground font-primary flex items-start gap-2">
            <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>Auto-selected based on your message selection from &quot;{String((selectedMessage as any).conversationTitle)}&quot;</span>
          </div>
        )}
      </div>

      {/* Context Mode */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide font-primary">
          Context Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['full', 'reply', 'new'] as ContextMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setContextMode(mode)}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wide font-primary transition-all ${
                contextMode === mode ? 'neo-button-active' : 'neo-button'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground font-primary italic">
          {getContextDescription()}
        </p>
      </div>

      {/* Tone */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide font-primary">
          Tone
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['professional', 'friendly', 'formal', 'casual'] as Tone[]).map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wide font-primary transition-all ${
                tone === t ? 'neo-button-active' : 'neo-button'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Message Type */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide font-primary">
          Message Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['response', 'follow-up', 'inquiry'] as MessageType[]).map((type) => (
            <button
              key={type}
              onClick={() => setMessageType(type)}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wide font-primary transition-all ${
                messageType === type ? 'neo-button-active' : 'neo-button'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide font-primary">
          Custom Instructions (Optional)
        </label>
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="E.g., mention upcoming project deadline, ask about budget..."
          className="w-full neo-inset p-3 text-sm font-primary text-foreground min-h-[80px] resize-none"
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerateDraft}
        disabled={isGenerating || !targetConversationId}
        className="w-full neo-button px-4 py-3 font-bold uppercase tracking-wide font-primary transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating Draft...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Draft
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="neo-inset p-3 border-l-4 border-red-500">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-red-600 font-primary">{error}</span>
          </div>
        </div>
      )}

      {/* Draft Preview & Edit */}
      {draftedMessage && (
        <div className="space-y-3 pt-4 border-t border-foreground/10">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide font-primary">
            Draft Message {isEditing && '(Editable)'}
          </label>

          {isEditing ? (
            <textarea
              value={draftedMessage}
              onChange={(e) => setDraftedMessage(e.target.value)}
              className="w-full neo-inset p-3 text-sm font-primary text-foreground min-h-[120px] resize-none"
            />
          ) : (
            <div className="neo-inset p-3">
              <p className="text-sm font-primary text-foreground whitespace-pre-wrap">
                {draftedMessage}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex-1 neo-button px-4 py-2 text-xs font-bold uppercase tracking-wide font-primary"
            >
              {isEditing ? 'Preview' : 'Edit'}
            </button>
            <button
              onClick={handleSendMessage}
              disabled={isSending || !draftedMessage.trim()}
              className="flex-1 neo-button-active px-4 py-2 text-xs font-bold uppercase tracking-wide font-primary transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send to {targetConversation?.title || 'Conversation'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
