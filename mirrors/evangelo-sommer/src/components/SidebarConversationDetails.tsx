"use client";

import { useState } from 'react';
import { Info, Edit, Calendar, Tag, MessageSquare, BarChart3, Star, TrendingUp, Clock, Send } from 'lucide-react';
import { Conversation, Client } from '../types/client';

interface SidebarConversationDetailsProps {
  conversation: Conversation;
  client: Client;
  onEditClick?: () => void;
  onTestimonialClick?: () => void;
}

type TabMode = 'info' | 'stats';

export default function SidebarConversationDetails({
  conversation,
  client,
  onEditClick,
  onTestimonialClick
}: SidebarConversationDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('info');

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate conversation stats
  const totalMessages = conversation.messages?.length || 0;
  const yourMessages = conversation.messages?.filter(m => m.role === 'YOU').length || 0;
  const clientMessages = conversation.messages?.filter(m => m.role === 'CLIENT').length || 0;
  const responseRate = totalMessages > 0 ? ((yourMessages / totalMessages) * 100).toFixed(0) : '0';

  // Calculate average response time (mock for now - would need actual timestamps)
  const avgResponseTime = '2.5 hours';

  // Get most recent activity
  const lastMessage = conversation.messages?.[conversation.messages.length - 1];
  const lastMessageDate = lastMessage ? formatShortDate(lastMessage.timestamp) : 'N/A';

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="neo-card bg-[var(--neomorphic-accent)]/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-[var(--neomorphic-accent)]" />
          <h3 className="font-primary font-bold text-sm uppercase tracking-wide text-[var(--neomorphic-text)]">
            Conversation Details
          </h3>
        </div>
        <p className="text-xs text-[var(--neomorphic-icon)] font-primary">
          View info, stats, and request testimonials
        </p>
      </div>

      {/* Tab Selection */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 neo-button text-xs font-primary uppercase tracking-wide py-2 flex items-center justify-center gap-2 ${
            activeTab === 'info' ? 'neo-button-active' : ''
          }`}
        >
          <Info className="w-3 h-3" />
          Info
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 neo-button text-xs font-primary uppercase tracking-wide py-2 flex items-center justify-center gap-2 ${
            activeTab === 'stats' ? 'neo-button-active' : ''
          }`}
        >
          <BarChart3 className="w-3 h-3" />
          Stats
        </button>
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide">
              Title
            </label>
            <div className="neo-inset p-3">
              <p className="text-sm font-primary text-[var(--neomorphic-text)]">
                {conversation.title || 'Untitled Conversation'}
              </p>
            </div>
          </div>

          {/* Client */}
          <div>
            <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide">
              Client
            </label>
            <div className="neo-inset p-3">
              <p className="text-sm font-primary text-[var(--neomorphic-text)]">
                {client.name}
              </p>
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide">
                Status
              </label>
              <div className="neo-inset p-3">
                <p className="text-sm font-primary text-[var(--neomorphic-text)] uppercase">
                  {conversation.status || 'Active'}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide">
                Priority
              </label>
              <div className="neo-inset p-3">
                <p className="text-sm font-primary text-[var(--neomorphic-text)] uppercase">
                  {conversation.priority || 'Medium'}
                </p>
              </div>
            </div>
          </div>

          {/* Message Count */}
          <div>
            <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              Messages
            </label>
            <div className="neo-inset p-3">
              <p className="text-sm font-primary text-[var(--neomorphic-text)]">
                {totalMessages} messages
              </p>
            </div>
          </div>

          {/* Dates */}
          <div>
            <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Timeline
            </label>
            <div className="neo-inset p-3 space-y-2">
              <div>
                <p className="text-xs text-[var(--neomorphic-icon)] font-primary">Created</p>
                <p className="text-sm font-primary text-[var(--neomorphic-text)]">
                  {formatDate(conversation.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--neomorphic-icon)] font-primary">Last Updated</p>
                <p className="text-sm font-primary text-[var(--neomorphic-text)]">
                  {formatDate(conversation.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Tags */}
          {conversation.tags && conversation.tags.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide flex items-center gap-2">
                <Tag className="w-3 h-3" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {conversation.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="neo-badge-accent px-2 py-1 text-xs font-primary uppercase tracking-wide"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source */}
          {conversation.source && (
            <div>
              <label className="block text-xs font-semibold text-[var(--neomorphic-text)] mb-2 font-primary uppercase tracking-wide">
                Source
              </label>
              <div className="neo-inset p-3">
                <p className="text-sm font-primary text-[var(--neomorphic-text)] uppercase">
                  {conversation.source}
                </p>
              </div>
            </div>
          )}

          {/* Edit Button */}
          {onEditClick && (
            <button
              className="neo-button-active w-full font-primary uppercase tracking-wide flex items-center justify-center gap-2 py-3"
              onClick={onEditClick}
            >
              <Edit className="w-4 h-4" />
              Edit Conversation
            </button>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {/* Message Breakdown */}
          <div className="neo-card bg-[var(--neomorphic-bg)] p-4 border border-[var(--neomorphic-dark-shadow)]">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-[var(--neomorphic-accent)]" />
              <h4 className="font-primary font-semibold text-sm text-[var(--neomorphic-text)] uppercase tracking-wide">
                Message Breakdown
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--neomorphic-accent)] font-primary">
                  {totalMessages}
                </p>
                <p className="text-xs text-[var(--neomorphic-icon)] font-primary uppercase tracking-wide mt-1">
                  Total
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500 font-primary">
                  {yourMessages}
                </p>
                <p className="text-xs text-[var(--neomorphic-icon)] font-primary uppercase tracking-wide mt-1">
                  You
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500 font-primary">
                  {clientMessages}
                </p>
                <p className="text-xs text-[var(--neomorphic-icon)] font-primary uppercase tracking-wide mt-1">
                  Client
                </p>
              </div>
            </div>
          </div>

          {/* Response Rate */}
          <div className="neo-card bg-[var(--neomorphic-bg)] p-4 border border-[var(--neomorphic-dark-shadow)]">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[var(--neomorphic-accent)]" />
              <h4 className="font-primary font-semibold text-sm text-[var(--neomorphic-text)] uppercase tracking-wide">
                Engagement
              </h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--neomorphic-icon)] font-primary uppercase tracking-wide">
                  Response Rate
                </span>
                <span className="text-sm font-bold text-[var(--neomorphic-text)] font-primary">
                  {responseRate}%
                </span>
              </div>
              <div className="w-full bg-[var(--neomorphic-dark-shadow)] rounded-full h-2">
                <div
                  className="bg-[var(--neomorphic-accent)] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${responseRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="neo-card bg-[var(--neomorphic-bg)] p-4 border border-[var(--neomorphic-dark-shadow)]">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[var(--neomorphic-accent)]" />
              <h4 className="font-primary font-semibold text-sm text-[var(--neomorphic-text)] uppercase tracking-wide">
                Activity
              </h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--neomorphic-icon)] font-primary">
                  Last Message
                </span>
                <span className="text-sm font-primary text-[var(--neomorphic-text)]">
                  {lastMessageDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--neomorphic-icon)] font-primary">
                  Avg Response Time
                </span>
                <span className="text-sm font-primary text-[var(--neomorphic-text)]">
                  {avgResponseTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Testimonial Request Section - Always Visible */}
      {onTestimonialClick && (
        <div className="pt-4 border-t border-[var(--neomorphic-dark-shadow)]">
          <div className="neo-card bg-[var(--neomorphic-accent)]/10 p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-[var(--neomorphic-accent)]" />
              <h4 className="font-primary font-semibold text-sm text-[var(--neomorphic-text)] uppercase tracking-wide">
                Request Testimonial
              </h4>
            </div>
            <p className="text-xs text-[var(--neomorphic-icon)] font-primary">
              Ask {client.name} for a review of your work
            </p>
          </div>

          <button
            className="neo-button-active w-full font-primary uppercase tracking-wide flex items-center justify-center gap-2 py-3"
            onClick={onTestimonialClick}
          >
            <Send className="w-4 h-4" />
            Request Testimonial
          </button>

          <div className="neo-card bg-[var(--neomorphic-bg)] p-3 border border-[var(--neomorphic-dark-shadow)] mt-3">
            <p className="text-xs text-[var(--neomorphic-icon)] font-primary leading-relaxed">
              A testimonial request will be sent to {client.name} via their preferred contact method.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
