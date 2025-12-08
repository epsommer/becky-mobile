// src/components/conversation/ConversationPreview.tsx
"use client";

import { useState, useMemo } from "react";
import { Client, Message } from "../../types/client";

interface ConversationPreviewProps {
  messages: Message[];
  clientId?: string;
  clients: Client[];
  onConfirm: () => void;
}

interface ConversationStats {
  totalMessages: number;
  yourMessages: number;
  clientMessages: number;
  dateRange: {
    start: string;
    end: string;
  };
  averageMessageLength: number;
  longestMessage: number;
  shortestMessage: number;
}

export default function ConversationPreview({ 
  messages, 
  clientId, 
  clients, 
  onConfirm 
}: ConversationPreviewProps) {
  const [viewMode, setViewMode] = useState<'conversation' | 'stats' | 'raw'>('conversation');

  // Find selected client with proper type checking
  const selectedClient = useMemo(() => {
    if (!Array.isArray(clients) || !clientId) {
      return null;
    }
    return clients.find(client => client.id === clientId) || null;
  }, [clients, clientId]);

  // Sort messages chronologically for display
  const sortedMessages = useMemo(() => 
    [...messages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ), 
    [messages]
  );

  // Calculate conversation statistics
  const stats = useMemo((): ConversationStats => {
    if (messages.length === 0) {
      return {
        totalMessages: 0,
        yourMessages: 0,
        clientMessages: 0,
        dateRange: { start: '', end: '' },
        averageMessageLength: 0,
        longestMessage: 0,
        shortestMessage: 0
      };
    }

    const yourMessages = messages.filter(m => m.role === 'you').length;
    const clientMessages = messages.filter(m => m.role === 'client').length;
    
    const timestamps = messages.map(m => new Date(m.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    const messageLengths = messages.map(m => m.content.length);
    const avgLength = messageLengths.reduce((sum, len) => sum + len, 0) / messages.length;

    return {
      totalMessages: messages.length,
      yourMessages,
      clientMessages,
      dateRange: {
        start: new Date(minTime).toLocaleDateString(),
        end: new Date(maxTime).toLocaleDateString()
      },
      averageMessageLength: Math.round(avgLength),
      longestMessage: Math.max(...messageLengths),
      shortestMessage: Math.min(...messageLengths)
    };
  }, [messages]);

  // Group messages by date for better display
  const messagesByDate = useMemo(() => {
    const grouped = new Map<string, Message[]>();
    
    sortedMessages.forEach(message => {
      const date = new Date(message.timestamp).toDateString();
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(message);
    });

    return Array.from(grouped.entries()).map(([date, msgs]) => ({
      date,
      messages: msgs
    }));
  }, [sortedMessages]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Client Info */}
      <div className="bg-light-grey bg-opacity-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-hud-text-primary font-primary uppercase tracking-wide">
              Conversation Preview
            </h3>
            {selectedClient && (
              <p className="text-medium-grey font-primary">
                With <strong>{selectedClient.name}</strong>
                {selectedClient.email && ` (${selectedClient.email})`}
              </p>
            )}
          </div>
          
          {/* View Mode Selector */}
          <div className="flex border-2 border-hud-border rounded overflow-hidden">
            {[
              { key: 'conversation', label: 'Preview' },
              { key: 'stats', label: 'Stats' },
              { key: 'raw', label: 'Raw Data' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as typeof viewMode)}
                className={`px-4 py-2 font-primary font-bold text-sm uppercase tracking-wide transition-colors ${
                  viewMode === key
                    ? 'bg-tactical-gold text-hud-text-primary'
                    : 'bg-white text-medium-grey hover:text-hud-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-hud-border p-4 rounded text-center">
          <div className="text-2xl font-bold text-gold font-primary">
            {stats.totalMessages}
          </div>
          <div className="text-xs text-medium-grey font-primary uppercase tracking-wide">
            Total Messages
          </div>
        </div>
        
        <div className="bg-white border-2 border-hud-border p-4 rounded text-center">
          <div className="text-2xl font-bold text-tactical-gold font-primary">
            {stats.yourMessages}
          </div>
          <div className="text-xs text-medium-grey font-primary uppercase tracking-wide">
            Your Messages
          </div>
        </div>
        
        <div className="bg-white border-2 border-hud-border p-4 rounded text-center">
          <div className="text-2xl font-bold text-green-600 font-primary">
            {stats.clientMessages}
          </div>
          <div className="text-xs text-medium-grey font-primary uppercase tracking-wide">
            Client Messages
          </div>
        </div>
        
        <div className="bg-white border-2 border-hud-border p-4 rounded text-center">
          <div className="text-lg font-bold text-purple-600 font-primary">
            {stats.dateRange.start}
          </div>
          <div className="text-xs text-medium-grey font-primary uppercase tracking-wide">
            First Message
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white border-2 border-hud-border rounded-lg">
        {viewMode === 'conversation' && (
          <div className="h-96 overflow-y-auto p-6">
            {messagesByDate.map(({ date, messages: dayMessages }) => (
              <div key={date} className="mb-6">
                {/* Date Header */}
                <div className="text-center mb-4">
                  <span className="bg-light-grey px-3 py-1 rounded-full text-sm font-primary font-bold text-medium-grey">
                    {formatDate(date)}
                  </span>
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {dayMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'you' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-sm px-4 py-3 rounded-lg ${
                        message.role === 'you'
                          ? 'bg-tactical-gold text-hud-text-primary'
                          : 'bg-light-grey text-hud-text-primary'
                      }`}>
                        <div className="font-primary">
                          {message.content}
                        </div>
                        <div className={`text-xs mt-1 font-primary ${
                          message.role === 'you' ? 'text-hud-text-primary opacity-70' : 'text-medium-grey'
                        }`}>
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'stats' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Message Distribution */}
              <div>
                <h4 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-4">
                  Message Distribution
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-primary text-medium-grey">Your Messages</span>
                    <span className="font-primary font-bold text-tactical-gold">
                      {stats.yourMessages} ({Math.round((stats.yourMessages / stats.totalMessages) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-light-grey h-2 rounded">
                    <div 
                      className="bg-tactical-gold h-2 rounded" 
                      style={{ width: `${(stats.yourMessages / stats.totalMessages) * 100}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-primary text-medium-grey">Client Messages</span>
                    <span className="font-primary font-bold text-green-600">
                      {stats.clientMessages} ({Math.round((stats.clientMessages / stats.totalMessages) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-light-grey h-2 rounded">
                    <div 
                      className="bg-green-600 h-2 rounded" 
                      style={{ width: `${(stats.clientMessages / stats.totalMessages) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Message Analytics */}
              <div>
                <h4 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-4">
                  Message Analytics
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-primary text-medium-grey">Date Range</span>
                    <span className="font-primary font-bold">
                      {stats.dateRange.start} - {stats.dateRange.end}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-primary text-medium-grey">Avg Message Length</span>
                    <span className="font-primary font-bold">{stats.averageMessageLength} chars</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-primary text-medium-grey">Longest Message</span>
                    <span className="font-primary font-bold">{stats.longestMessage} chars</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-primary text-medium-grey">Shortest Message</span>
                    <span className="font-primary font-bold">{stats.shortestMessage} chars</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-4">
                Message Timeline
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sortedMessages.slice(0, 20).map((message, index) => (
                  <div key={message.id} className="flex items-center space-x-3 text-sm">
                    <span className="text-xs text-medium-grey font-primary w-16">
                      #{index + 1}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold font-primary ${
                      message.role === 'you' 
                        ? 'bg-tactical-gold-muted text-tactical-brown-dark' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {message.role === 'you' ? 'You' : 'Client'}
                    </span>
                    <span className="text-medium-grey font-primary text-xs">
                      {new Date(message.timestamp).toLocaleString()}
                    </span>
                    <span className="font-primary flex-1 truncate">
                      {message.content.substring(0, 50)}...
                    </span>
                  </div>
                ))}
                {sortedMessages.length > 20 && (
                  <div className="text-center text-medium-grey font-primary text-sm">
                    ... and {sortedMessages.length - 20} more messages
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'raw' && (
          <div className="p-6">
            <div className="bg-tactical-grey-100 border-2 border-tactical-grey-300 rounded p-4 h-80 overflow-auto">
              <pre className="text-xs font-mono text-tactical-grey-700">
                {JSON.stringify(messages, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t-2 border-hud-border">
        <div className="text-medium-grey font-primary">
          Ready to configure conversation details and save to database
        </div>
        
        <button
          onClick={onConfirm}
          className="px-6 py-3 bg-tactical-gold text-hud-text-primary font-primary font-bold uppercase tracking-wide hover:bg-tactical-gold-light transition-colors"
        >
          Configure & Save
        </button>
      </div>
    </div>
  );
}