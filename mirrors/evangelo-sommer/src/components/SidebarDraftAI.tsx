"use client";

import { useState, useMemo } from 'react';
import { Sparkles, Send, MessageSquare, Plus } from 'lucide-react';
import { Conversation, Client, Message } from '../types/client';

interface SidebarDraftAIProps {
  conversation: Conversation;
  client: Client;
  conversationId: string;
  selectedMessageId?: string | null;
  onSelectMessage?: (messageId: string | null) => void;
}

type ContextMode = 'full' | 'specific' | 'new';

export default function SidebarDraftAI({
  conversation,
  client,
  conversationId,
  selectedMessageId,
  onSelectMessage
}: SidebarDraftAIProps) {
  const [contextMode, setContextMode] = useState<ContextMode>('full');
  const [newClientMessage, setNewClientMessage] = useState('');
  const [draftOptions, setDraftOptions] = useState({
    tone: 'professional' as 'professional' | 'friendly' | 'formal' | 'casual',
    messageType: 'response' as 'response' | 'follow-up' | 'inquiry',
    specificInstructions: '',
  });
  const [draftedMessage, setDraftedMessage] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Get recent client messages for context selection
  const recentClientMessages = useMemo(() => {
    return conversation.messages
      .filter(msg => msg.role === 'CLIENT')
      .slice(-10)
      .reverse();
  }, [conversation.messages]);

  const handleGenerateDraft = async () => {
    // Validate context based on mode
    if (contextMode === 'specific' && !selectedMessageId) {
      alert('Please click a client message in the conversation to select it');
      return;
    }
    if (contextMode === 'new' && !newClientMessage.trim()) {
      alert('Please enter the new client message');
      return;
    }

    setIsDrafting(true);
    try {
      // For 'new' mode, first add the client message to the conversation
      if (contextMode === 'new') {
        const addMessageResponse = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: newClientMessage,
            role: 'CLIENT',
            type: 'text',
            timestamp: new Date().toISOString(),
          }),
        });

        if (!addMessageResponse.ok) {
          throw new Error('Failed to add client message');
        }
      }

      // Build conversation context based on mode
      let conversationContext;
      let contextMessage = '';

      if (contextMode === 'full') {
        // Use full conversation history
        conversationContext = conversation.messages.map(msg => ({
          role: msg.role === 'YOU' ? 'assistant' : 'user',
          content: msg.content,
        }));
      } else if (contextMode === 'specific') {
        // Find the selected message and include context around it
        const selectedMsg = conversation.messages.find(m => m.id === selectedMessageId);
        const msgIndex = conversation.messages.findIndex(m => m.id === selectedMessageId);

        if (selectedMsg && msgIndex !== -1) {
          // Include 3 messages before and after for context
          const startIdx = Math.max(0, msgIndex - 3);
          const endIdx = Math.min(conversation.messages.length, msgIndex + 1);
          const contextMessages = conversation.messages.slice(startIdx, endIdx);

          conversationContext = contextMessages.map(msg => ({
            role: msg.role === 'YOU' ? 'assistant' : 'user',
            content: msg.content,
          }));
          contextMessage = selectedMsg.content;
        }
      } else if (contextMode === 'new') {
        // Use recent conversation + new client message
        const recentMessages = conversation.messages.slice(-5);
        conversationContext = [
          ...recentMessages.map(msg => ({
            role: msg.role === 'YOU' ? 'assistant' : 'user',
            content: msg.content,
          })),
          {
            role: 'user',
            content: newClientMessage,
          }
        ];
        contextMessage = newClientMessage;
      }

      const response = await fetch('/api/ai/draft-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationContext,
          clientName: client.name,
          tone: draftOptions.tone,
          messageType: draftOptions.messageType,
          specificInstructions: draftOptions.specificInstructions || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to draft message');
      }

      const result = await response.json();
      if (result.success && result.draftedMessage) {
        setDraftedMessage(result.draftedMessage);
      } else {
        throw new Error(result.error || 'No drafted message received');
      }
    } catch (err) {
      console.error('Draft error:', err);
      alert('Failed to draft message with AI. Please try again.');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleAddToConversation = async () => {
    if (!draftedMessage.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: draftedMessage,
          role: 'YOU',
          type: 'text',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to add message');

      // Clear the drafted message and show success
      setDraftedMessage('');
      setDraftOptions({
        tone: 'professional',
        messageType: 'response',
        specificInstructions: '',
      });

      // Reload conversation to show new message
      window.location.reload();
    } catch (err) {
      console.error('Add message error:', err);
      alert('Failed to add message to conversation');
    } finally {
      setIsAdding(false);
    }
  };

  const handleReset = () => {
    setDraftedMessage('');
    setContextMode('full');
    onSelectMessage?.(null);
    setNewClientMessage('');
    setDraftOptions({
      tone: 'professional',
      messageType: 'response',
      specificInstructions: '',
    });
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header Info */}
      <div className="neo-card bg-[var(--neomorphic-accent)]/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[var(--neomorphic-accent)]" />
          <h3 className="font-primary font-bold text-sm uppercase tracking-wide text-[var(--neomorphic-text)]">
            AI Message Assistant
          </h3>
        </div>
        <p className="text-xs text-[var(--neomorphic-icon)] font-primary">
          Generate contextual message drafts powered by Claude AI
        </p>
      </div>

      {/* Context Mode Selection */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide">
          Context Mode
        </label>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              setContextMode('full');
              onSelectMessage?.(null);
            }}
            className={`neo-button text-left px-3 py-2 text-xs font-primary ${
              contextMode === 'full' ? 'neo-button-active' : ''
            }`}
            disabled={isDrafting || isAdding}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              <span>Full Conversation</span>
            </div>
            <p className="text-[10px] text-[var(--neomorphic-icon)] mt-1">
              Use entire conversation history
            </p>
          </button>

          <button
            onClick={() => setContextMode('specific')}
            className={`neo-button text-left px-3 py-2 text-xs font-primary ${
              contextMode === 'specific' ? 'neo-button-active' : ''
            }`}
            disabled={isDrafting || isAdding}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              <span>Reply to Specific Message</span>
            </div>
            <p className="text-[10px] text-[var(--neomorphic-icon)] mt-1">
              Click a message in the conversation to select it
            </p>
          </button>

          <button
            onClick={() => {
              setContextMode('new');
              onSelectMessage?.(null);
            }}
            className={`neo-button text-left px-3 py-2 text-xs font-primary ${
              contextMode === 'new' ? 'neo-button-active' : ''
            }`}
            disabled={isDrafting || isAdding}
          >
            <div className="flex items-center gap-2">
              <Plus className="w-3 h-3" />
              <span>Reply to New Message</span>
            </div>
            <p className="text-[10px] text-[var(--neomorphic-icon)] mt-1">
              Add new client message and draft reply
            </p>
          </button>
        </div>

        {/* Selected Message Display */}
        {contextMode === 'specific' && selectedMessageId && (
          <div className="mt-3 neo-card bg-[var(--neomorphic-accent)]/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                Selected Message
              </label>
              <button
                onClick={() => onSelectMessage?.(null)}
                className="text-xs text-[var(--neomorphic-icon)] hover:text-[var(--neomorphic-text)]"
              >
                Clear
              </button>
            </div>
            {(() => {
              const msg = conversation.messages.find(m => m.id === selectedMessageId);
              return msg ? (
                <div className="text-xs text-[var(--neomorphic-text)]">
                  <div className="text-[10px] text-[var(--neomorphic-icon)] mb-1">
                    {formatTimestamp(msg.timestamp)}
                  </div>
                  <p className="line-clamp-3">{msg.content}</p>
                </div>
              ) : (
                <p className="text-xs text-[var(--neomorphic-icon)]">Message not found</p>
              );
            })()}
          </div>
        )}

        {contextMode === 'specific' && !selectedMessageId && (
          <div className="mt-3 neo-card bg-[var(--neomorphic-bg)] p-3 border border-[var(--neomorphic-dark-shadow)]">
            <p className="text-xs text-[var(--neomorphic-icon)] font-primary">
              👈 Click a client message in the conversation to select it
            </p>
          </div>
        )}

        {/* New Message Input */}
        {contextMode === 'new' && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide">
              New Client Message
            </label>
            <textarea
              value={newClientMessage}
              onChange={(e) => setNewClientMessage(e.target.value)}
              placeholder={`Paste the new message from ${client.name}...`}
              rows={4}
              className="neomorphic-input w-full resize-none text-sm"
              disabled={isDrafting || isAdding}
            />
            <p className="text-[10px] text-[var(--neomorphic-icon)] font-primary mt-1">
              This message will be added to the conversation, then AI will draft your reply
            </p>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide">
            Tone
          </label>
          <select
            value={draftOptions.tone}
            onChange={(e) => setDraftOptions({ ...draftOptions, tone: e.target.value as any })}
            className="neomorphic-input w-full text-sm"
            disabled={isDrafting || isAdding}
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide">
            Message Type
          </label>
          <select
            value={draftOptions.messageType}
            onChange={(e) => setDraftOptions({ ...draftOptions, messageType: e.target.value as any })}
            className="neomorphic-input w-full text-sm"
            disabled={isDrafting || isAdding}
          >
            <option value="response">Response</option>
            <option value="follow-up">Follow-up</option>
            <option value="inquiry">Inquiry</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide">
            Instructions (Optional)
          </label>
          <textarea
            value={draftOptions.specificInstructions}
            onChange={(e) => setDraftOptions({ ...draftOptions, specificInstructions: e.target.value })}
            placeholder="E.g., Include pricing, mention next meeting..."
            rows={3}
            className="neomorphic-input w-full resize-none text-sm"
            disabled={isDrafting || isAdding}
          />
        </div>
      </div>

      {/* Generate Button */}
      {!draftedMessage && (
        <button
          className="neo-button-active w-full font-primary uppercase tracking-wide flex items-center justify-center gap-2 py-3"
          onClick={handleGenerateDraft}
          disabled={isDrafting || isAdding}
        >
          {isDrafting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Draft
            </>
          )}
        </button>
      )}

      {/* Draft Preview */}
      {draftedMessage && (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
            AI-Generated Draft
          </label>
          <textarea
            value={draftedMessage}
            onChange={(e) => setDraftedMessage(e.target.value)}
            rows={10}
            className="neomorphic-input w-full resize-none text-sm border-[var(--neomorphic-accent)]"
            disabled={isAdding}
          />
          <p className="text-xs text-[var(--neomorphic-icon)] font-primary">
            Edit the draft above before adding it to the conversation
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              className="neo-button flex-1 font-primary uppercase tracking-wide text-sm py-2"
              onClick={handleReset}
              disabled={isAdding}
            >
              Reset
            </button>
            <button
              className="neo-button-active flex-1 font-primary uppercase tracking-wide flex items-center justify-center gap-2 text-sm py-2"
              onClick={handleAddToConversation}
              disabled={isAdding || !draftedMessage.trim()}
            >
              {isAdding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Add to Chat
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!draftedMessage && !isDrafting && (
        <div className="neo-card bg-[var(--neomorphic-bg)] p-3 border border-[var(--neomorphic-dark-shadow)]">
          <p className="text-xs text-[var(--neomorphic-icon)] font-primary leading-relaxed">
            AI will analyze the conversation history with <span className="font-semibold text-[var(--neomorphic-text)]">{client.name}</span> and draft an appropriate message based on your preferences.
          </p>
        </div>
      )}
    </div>
  );
}
