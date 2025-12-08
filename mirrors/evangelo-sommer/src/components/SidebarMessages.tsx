"use client";

import { useState } from 'react';
import { Send, Plus } from 'lucide-react';
import { Client } from '../types/client';

interface SidebarMessagesProps {
  conversationId: string;
  client: Client;
  onMessageAdded?: () => void;
}

export default function SidebarMessages({
  conversationId,
  client,
  onMessageAdded
}: SidebarMessagesProps) {
  const [newMessage, setNewMessage] = useState('');
  const [messageRole, setMessageRole] = useState<'YOU' | 'CLIENT'>('YOU');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddMessage = async () => {
    if (!newMessage.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage.trim(),
          role: messageRole,
          type: 'text',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add message');
      }

      setNewMessage('');
      onMessageAdded?.();

      // Reload to show new message
      window.location.reload();
    } catch (err) {
      console.error('Add message error:', err);
      alert('Failed to add message');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="neo-card bg-[var(--neomorphic-accent)]/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="w-4 h-4 text-[var(--neomorphic-accent)]" />
          <h3 className="font-primary font-bold text-sm uppercase tracking-wide text-[var(--neomorphic-text)]">
            Quick Add Message
          </h3>
        </div>
        <p className="text-xs text-[var(--neomorphic-icon)] font-primary">
          Add a message to this conversation with {client.name}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide">
            Message From
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setMessageRole('YOU')}
              className={`flex-1 neo-button text-xs font-primary uppercase tracking-wide py-2 ${
                messageRole === 'YOU' ? 'neo-button-active' : ''
              }`}
            >
              You
            </button>
            <button
              onClick={() => setMessageRole('CLIENT')}
              className={`flex-1 neo-button text-xs font-primary uppercase tracking-wide py-2 ${
                messageRole === 'CLIENT' ? 'neo-button-active' : ''
              }`}
            >
              {client.name}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide">
            Message Content
          </label>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Enter message ${messageRole === 'CLIENT' ? 'from ' + client.name : 'to ' + client.name}...`}
            rows={6}
            className="neomorphic-input w-full resize-none text-sm"
            disabled={isAdding}
          />
        </div>

        <button
          className="neo-button-active w-full font-primary uppercase tracking-wide flex items-center justify-center gap-2 py-3"
          onClick={handleAddMessage}
          disabled={isAdding || !newMessage.trim()}
        >
          {isAdding ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Adding...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Add Message
            </>
          )}
        </button>
      </div>

      <div className="neo-card bg-[var(--neomorphic-bg)] p-3 border border-[var(--neomorphic-dark-shadow)]">
        <p className="text-xs text-[var(--neomorphic-icon)] font-primary leading-relaxed">
          Messages added here will appear in the conversation timeline with the current timestamp.
        </p>
      </div>
    </div>
  );
}
