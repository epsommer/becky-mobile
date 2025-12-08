"use client";

import { Info, Edit, Calendar, Tag, MessageSquare } from 'lucide-react';
import { Conversation, Client } from '../types/client';

interface SidebarConversationInfoProps {
  conversation: Conversation;
  client: Client;
  onEditClick?: () => void;
}

export default function SidebarConversationInfo({
  conversation,
  client,
  onEditClick
}: SidebarConversationInfoProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="neo-card bg-[var(--neomorphic-accent)]/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-[var(--neomorphic-accent)]" />
          <h3 className="font-primary font-bold text-sm uppercase tracking-wide text-[var(--neomorphic-text)]">
            Conversation Details
          </h3>
        </div>
      </div>

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
              {conversation.messages?.length || 0} messages
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
    </div>
  );
}
