"use client";

import { useState, useEffect, useCallback } from 'react';
import { Conversation, Message, Client } from '../types/client';
import { BillingSuggestion } from '../types/billing';
// Removed billingManager import - use API endpoints instead

interface ConversationTimelineProps {
  conversation: Conversation;
  client: Client;
  className?: string;
}

interface MessageWithSuggestion extends Message {
  billingSuggestion?: BillingSuggestion;
}

export function ConversationTimeline({ 
  conversation, 
  client, 
  className = "" 
}: ConversationTimelineProps) {
  const [messagesWithSuggestions, setMessagesWithSuggestions] = useState<MessageWithSuggestion[]>([]);

  // Analyze messages for billing opportunities when conversation changes
  useEffect(() => {
    analyzeMessagesForBilling();
  }, [conversation]);

  const analyzeMessagesForBilling = useCallback(() => {
    const analyzed: MessageWithSuggestion[] = conversation.messages.map(message => {
      // Only analyze client messages for billing opportunities
      if (message.role === 'client') {
        // TODO: Move to API endpoint
        const suggestion: BillingSuggestion = {
          type: 'none',
          confidence: 'low',
          serviceType: 'general',
          suggestedAmount: 0,
          reason: 'Billing analysis temporarily disabled'
        };
        return {
          ...message,
          billingSuggestion: suggestion
        };
      }
      return message;
    });
    
    setMessagesWithSuggestions(analyzed);
  }, [conversation, client]);


  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getMessageTypeIcon = (type: Message['type']) => {
    switch (type) {
      case 'email':
        return '📧';
      case 'text':
        return '💬';
      case 'call-notes':
        return '📞';
      case 'meeting-notes':
        return '🤝';
      case 'voice-memo':
        return '🎙️';
      case 'file-upload':
        return '📎';
      default:
        return '💬';
    }
  };

  const getRoleColor = (role: Message['role']) => {
    const normalized = (role || '').toLowerCase();
    if (normalized === 'client') {
      return 'border-l-4 border-l-[#15803d] bg-[#f0f7f2] dark:bg-[#0f2d1f] text-foreground';
    }
    if (normalized === 'you') {
      return 'border-l-4 border-l-[#1d4ed8] bg-[#e4ecff] dark:bg-[#0f172a] text-foreground';
    }
    if (normalized === 'ai-draft') {
      return 'border-l-4 border-l-[#6b7280] bg-[#f4f4f5] dark:bg-[#111827] text-foreground';
    }
    return 'border-l-4 border-l-border bg-background text-foreground';
  };

  return (
    <div className={`space-y-4 font-primary ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-hud-text-primary uppercase tracking-wide">
          Conversation Timeline
        </h2>
        <div className="text-sm text-medium-grey">
          {messagesWithSuggestions.length} messages
        </div>
      </div>

      <div className="space-y-4">
        {messagesWithSuggestions.map((message, index) => (
          <div
            key={message.id}
            data-message-id={message.id}
            className={`
              border-l-4 p-4 relative
              ${getRoleColor(message.role)}
              transition-all duration-200 hover:bg-opacity-80
            `}
          >
            {/* Message Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getMessageTypeIcon(message.type)}</span>
                <div>
                  <span className="text-sm font-semibold text-hud-text-primary uppercase tracking-wide">
                    {message.role === 'client' ? client.name : 'You'}
                  </span>
                  <div className="text-xs text-medium-grey">
                    {formatTimestamp(message.timestamp)} • {message.type.replace('-', ' ')}
                  </div>
                </div>
              </div>

              {/* Billing Indicator */}
              {message.billingSuggestion && message.billingSuggestion.confidence === 'high' && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600 font-primary">
                    Billable
                  </span>
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="text-sm text-hud-text-primary leading-relaxed mb-3">
              {message.content}
            </div>

            {/* Message Metadata */}
            {message.metadata && (
              <div className="space-y-1">
                {message.metadata.subject && (
                  <div className="text-xs text-medium-grey">
                    <span className="font-medium">Subject:</span> {message.metadata.subject}
                  </div>
                )}
                {message.metadata.location && (
                  <div className="text-xs text-medium-grey">
                    <span className="font-medium">Location:</span> {message.metadata.location}
                  </div>
                )}
                {message.metadata.duration && (
                  <div className="text-xs text-medium-grey">
                    <span className="font-medium">Duration:</span> {message.metadata.duration} minutes
                  </div>
                )}
                {message.metadata.urgency && (
                  <div className="inline-block">
                    <span className={`
                      text-xs px-2 py-1 font-medium uppercase tracking-wide
                      ${message.metadata.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                        message.metadata.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                        message.metadata.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-tactical-grey-200 text-tactical-grey-500'
                      }
                    `}>
                      {message.metadata.urgency}
                    </span>
                  </div>
                )}
              </div>
            )}

          </div>
        ))}
      </div>

      {/* Conversation Summary */}
      {conversation.summary && (
        <div className="mt-6 p-4 bg-hud-background-secondary border-2 border-hud-border">
          <h3 className="text-sm font-semibold text-hud-text-primary mb-2 uppercase tracking-wide">
            Conversation Summary
          </h3>
          <p className="text-sm text-medium-grey leading-relaxed">
            {conversation.summary}
          </p>
        </div>
      )}

      {/* Next Actions */}
      {conversation.nextActions && conversation.nextActions.length > 0 && (
        <div className="mt-4 p-4 bg-tactical-gold-light border-2 border-hud-border-accent">
          <h3 className="text-sm font-semibold text-hud-text-primary mb-2 uppercase tracking-wide">
            Suggested Next Actions
          </h3>
          <ul className="space-y-1">
            {conversation.nextActions.map((action, index) => (
              <li key={index} className="text-sm text-hud-text-primary flex items-start space-x-2">
                <span className="text-gold font-bold">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}

export default ConversationTimeline;
