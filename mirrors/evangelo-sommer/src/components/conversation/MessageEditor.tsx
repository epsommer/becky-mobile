// src/components/conversation/MessageEditor.tsx
"use client";

import { useState, useCallback, useMemo } from "react";
import { Message } from "../../types/client";

interface MessageEditorProps {
  messages: Message[];
  onMessagesUpdated: (messages: Message[]) => void;
  onComplete: (messages: Message[]) => void;
}

interface EditableMessage extends Message {
  isEditing?: boolean;
  isSelected?: boolean;
}

type SortOrder = 'chronological' | 'reverse-chronological' | 'by-role';

export default function MessageEditor({ messages, onMessagesUpdated, onComplete }: MessageEditorProps) {
  const [editableMessages, setEditableMessages] = useState<EditableMessage[]>(
    messages.map(msg => ({ ...msg, isEditing: false, isSelected: false }))
  );
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>('chronological');
  const [filterRole, setFilterRole] = useState<'all' | 'you' | 'client'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort messages
  const filteredAndSortedMessages = useMemo(() => {
    let filtered = editableMessages;

    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(msg => msg.role === filterRole);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (sortOrder) {
      case 'chronological':
        sorted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        break;
      case 'reverse-chronological':
        sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        break;
      case 'by-role':
        sorted.sort((a, b) => {
          if (a.role !== b.role) {
            return a.role === 'you' ? -1 : 1;
          }
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
        break;
    }

    return sorted;
  }, [editableMessages, filterRole, searchTerm, sortOrder]);

  // Update message
  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setEditableMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Delete messages
  const deleteMessages = useCallback((messageIds: string[]) => {
    setEditableMessages(prev => prev.filter(msg => !messageIds.includes(msg.id)));
    setSelectedMessages(prev => {
      const newSelected = new Set(prev);
      messageIds.forEach(id => newSelected.delete(id));
      return newSelected;
    });
  }, []);

  // Toggle message selection
  const toggleMessageSelection = useCallback((messageId: string) => {
    setSelectedMessages(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId);
      } else {
        newSelected.add(messageId);
      }
      return newSelected;
    });
  }, []);

  // Select all filtered messages
  const selectAllFiltered = useCallback(() => {
    const allFilteredIds = filteredAndSortedMessages.map(msg => msg.id);
    setSelectedMessages(new Set(allFilteredIds));
  }, [filteredAndSortedMessages]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedMessages(new Set());
  }, []);

  // Bulk operations
  const bulkDeleteSelected = useCallback(() => {
    deleteMessages(Array.from(selectedMessages));
  }, [deleteMessages, selectedMessages]);

  const bulkChangeRole = useCallback((newRole: 'you' | 'client') => {
    selectedMessages.forEach(messageId => {
      updateMessage(messageId, { role: newRole });
    });
    clearSelection();
  }, [selectedMessages, updateMessage, clearSelection]);

  // Auto-adjust timestamps
  const autoAdjustTimestamps = useCallback(() => {
    const sortedMessages = [...editableMessages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const startDate = new Date('2024-12-08T19:00:03Z');
    const endDate = new Date('2025-08-16T20:44:26Z');
    const totalTime = endDate.getTime() - startDate.getTime();
    const timePerMessage = totalTime / sortedMessages.length;

    sortedMessages.forEach((msg, index) => {
      const newTimestamp = new Date(startDate.getTime() + (index * timePerMessage)).toISOString();
      updateMessage(msg.id, { timestamp: newTimestamp });
    });
  }, [editableMessages, updateMessage]);

  // Handle completion
  const handleComplete = useCallback(() => {
    const finalMessages = editableMessages.map(msg => ({
      ...msg,
      isEditing: false,
      isSelected: false
    }));
    onMessagesUpdated(finalMessages);
    onComplete(finalMessages);
  }, [editableMessages, onMessagesUpdated, onComplete]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-light-grey bg-opacity-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
              Search Messages
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search content..."
              className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
            />
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as typeof filterRole)}
              className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
            >
              <option value="all">All Messages</option>
              <option value="you">Your Messages</option>
              <option value="client">Client Messages</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
              Sort Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
            >
              <option value="chronological">Chronological</option>
              <option value="reverse-chronological">Reverse Chronological</option>
              <option value="by-role">By Role</option>
            </select>
          </div>

          {/* Message Count */}
          <div>
            <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
              Message Count
            </label>
            <div className="px-3 py-2 border-2 border-hud-border bg-white font-primary font-bold text-gold">
              {filteredAndSortedMessages.length} / {editableMessages.length}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Operations */}
      {selectedMessages.size > 0 && (
        <div className="bg-tactical-gold bg-opacity-10 border-2 border-hud-border-accent p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-primary font-bold text-hud-text-primary">
              {selectedMessages.size} messages selected
            </span>
            <div className="space-x-2">
              <button
                onClick={() => bulkChangeRole('you')}
                className="px-3 py-1 bg-tactical-gold-muted text-tactical-brown-dark font-primary font-bold text-xs uppercase tracking-wide rounded hover:bg-tactical-gold-light"
              >
                Set as You
              </button>
              <button
                onClick={() => bulkChangeRole('client')}
                className="px-3 py-1 bg-green-100 text-green-800 font-primary font-bold text-xs uppercase tracking-wide rounded hover:bg-green-200"
              >
                Set as Client
              </button>
              <button
                onClick={bulkDeleteSelected}
                className="px-3 py-1 bg-red-100 text-red-800 font-primary font-bold text-xs uppercase tracking-wide rounded hover:bg-red-200"
              >
                Delete
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 bg-tactical-grey-200 text-tactical-grey-700 font-primary font-bold text-xs uppercase tracking-wide rounded hover:bg-tactical-grey-300"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Utility Actions */}
      <div className="flex items-center justify-between">
        <div className="space-x-4">
          <button
            onClick={selectAllFiltered}
            className="text-gold hover:text-gold-dark font-primary font-bold text-sm uppercase tracking-wide"
          >
            Select All Visible
          </button>
          <button
            onClick={autoAdjustTimestamps}
            className="text-gold hover:text-gold-dark font-primary font-bold text-sm uppercase tracking-wide"
          >
            Auto-Adjust Timestamps
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {filteredAndSortedMessages.map((message) => (
          <MessageEditRow
            key={message.id}
            message={message}
            isSelected={selectedMessages.has(message.id)}
            onToggleSelection={() => toggleMessageSelection(message.id)}
            onUpdate={(updates) => updateMessage(message.id, updates)}
            onDelete={() => deleteMessages([message.id])}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t-2 border-hud-border">
        <div className="text-medium-grey font-primary">
          <strong>{editableMessages.length}</strong> messages ready for preview
        </div>
        
        <button
          onClick={handleComplete}
          disabled={editableMessages.length === 0}
          className={`px-6 py-2 font-primary font-bold uppercase tracking-wide transition-colors ${
            editableMessages.length > 0
              ? 'bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light'
              : 'bg-light-grey text-medium-grey cursor-not-allowed'
          }`}
        >
          Continue to Preview
        </button>
      </div>
    </div>
  );
}

// Individual message editing row
interface MessageEditRowProps {
  message: EditableMessage;
  isSelected: boolean;
  onToggleSelection: () => void;
  onUpdate: (updates: Partial<Message>) => void;
  onDelete: () => void;
}

function MessageEditRow({ 
  message, 
  isSelected, 
  onToggleSelection, 
  onUpdate, 
  onDelete 
}: MessageEditRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [editTimestamp, setEditTimestamp] = useState(
    new Date(message.timestamp).toISOString().slice(0, 16)
  );

  const handleSave = () => {
    onUpdate({
      content: editContent,
      timestamp: new Date(editTimestamp).toISOString()
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(message.content);
    setEditTimestamp(new Date(message.timestamp).toISOString().slice(0, 16));
    setIsEditing(false);
  };

  const toggleRole = () => {
    onUpdate({ role: message.role === 'you' ? 'client' : 'you' });
  };

  return (
    <div className={`border-2 rounded-lg p-4 transition-colors ${
      isSelected ? 'border-hud-border-accent bg-tactical-gold bg-opacity-5' : 'border-hud-border bg-white'
    }`}>
      <div className="flex items-start space-x-3">
        {/* Selection Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className="mt-1 w-4 h-4 text-gold focus:ring-gold border-tactical-grey-400 rounded"
        />

        {/* Role Badge */}
        <button
          onClick={toggleRole}
          className={`px-2 py-1 rounded text-xs font-bold font-primary uppercase tracking-wide ${
            message.role === 'you'
              ? 'bg-tactical-gold-muted text-tactical-brown-dark hover:bg-tactical-gold-light'
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          }`}
        >
          {message.role === 'you' ? 'You' : 'Client'}
        </button>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary resize-none"
                rows={3}
              />
              <input
                type="datetime-local"
                value={editTimestamp}
                onChange={(e) => setEditTimestamp(e.target.value)}
                className="px-3 py-1 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary text-sm"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-tactical-gold text-hud-text-primary font-primary font-bold text-xs uppercase tracking-wide rounded hover:bg-tactical-gold-light"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-tactical-grey-300 text-tactical-grey-700 font-primary font-bold text-xs uppercase tracking-wide rounded hover:bg-tactical-grey-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-primary text-hud-text-primary">{message.content}</p>
              <div className="flex items-center space-x-4 text-xs text-medium-grey font-primary">
                <span>{new Date(message.timestamp).toLocaleString()}</span>
                {'importMethod' in (message.metadata || {}) && message.metadata && (
                  <span className="px-2 py-0.5 bg-tactical-grey-200 text-tactical-grey-600 rounded uppercase tracking-wide">
                    {(message.metadata as any).importMethod}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gold hover:text-gold-dark"
                title="Edit message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-red-500 hover:text-red-600"
                title="Delete message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}