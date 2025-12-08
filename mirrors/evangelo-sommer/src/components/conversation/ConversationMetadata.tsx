// src/components/conversation/ConversationMetadata.tsx
"use client";

import { useState, useCallback, useMemo } from "react";
import { Client } from "../../types/client";

interface ConversationMetadataProps {
  initialData: {
    title: string;
    description: string;
    tags: string[];
    clientId: string;
  };
  clients: Client[];
  messageCount: number;
  onComplete: (metadata: {
    title: string;
    description?: string;
    tags: string[];
    clientId: string;
  }) => void;
  loading?: boolean;
}

const SUGGESTED_TAGS = [
  'consultation', 'follow-up', 'project-planning', 'urgent', 'feedback',
  'meeting-notes', 'proposal', 'contract', 'support', 'billing',
  'general', 'important', 'archived', 'review'
];

export default function ConversationMetadata({
  initialData,
  clients,
  messageCount,
  onComplete,
  loading = false
}: ConversationMetadataProps) {
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [selectedClientId, setSelectedClientId] = useState(initialData.clientId);
  const [tags, setTags] = useState<string[]>(initialData.tags);
  const [newTag, setNewTag] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  // New client form state
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });

  // Find selected client
  const selectedClient = useMemo(
    () => clients.find(client => client.id === selectedClientId),
    [clients, selectedClientId]
  );

  // Auto-generate title if empty
  const autoGenerateTitle = useCallback(() => {
    if (selectedClient) {
      const dateStr = new Date().toLocaleDateString();
      setTitle(`Conversation with ${selectedClient.name} - ${dateStr}`);
    } else {
      const dateStr = new Date().toLocaleDateString();
      setTitle(`Imported Conversation - ${dateStr}`);
    }
  }, [selectedClient]);

  // Tag management
  const addTag = useCallback((tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (normalizedTag && !tags.includes(normalizedTag)) {
      setTags(prev => [...prev, normalizedTag]);
    }
    setNewTag('');
  }, [tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const handleAddNewTag = useCallback(() => {
    if (newTag.trim()) {
      addTag(newTag);
    }
  }, [newTag, addTag]);

  // Client creation
  const handleCreateNewClient = useCallback(async () => {
    if (!newClient.name.trim()) return;

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newClient.name,
          email: newClient.email || undefined,
          phone: newClient.phone || undefined,
          company: newClient.company || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create client');
      }

      const createdClient = await response.json();
      
      // Add to clients list and select
      setSelectedClientId(createdClient.id);
      setShowNewClientForm(false);
      setNewClient({ name: '', email: '', phone: '', company: '' });
      
      // Re-fetch clients to update the list
      window.location.reload(); // Simple refresh - in a real app you'd update state
    } catch (error) {
      console.error('Error creating client:', error);
      // Handle error appropriately
    }
  }, [newClient]);

  // Form validation
  const isValid = useMemo(() => {
    return title.trim().length > 0 && selectedClientId.length > 0;
  }, [title, selectedClientId]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!isValid || loading) return;

    onComplete({
      title: title.trim(),
      description: description.trim() || undefined,
      tags,
      clientId: selectedClientId
    });
  }, [title, description, tags, selectedClientId, isValid, loading, onComplete]);

  return (
    <div className="space-y-6">
      {/* Client Selection */}
      <div className="bg-light-grey bg-opacity-50 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-4">
          Select Client
        </h3>
        
        {!showNewClientForm ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedClientId === client.id
                      ? 'border-hud-border-accent bg-tactical-gold bg-opacity-10'
                      : 'border-hud-border bg-white hover:border-medium-grey'
                  }`}
                >
                  <h4 className="font-bold text-hud-text-primary font-primary">
                    {client.name}
                  </h4>
                  {client.email && (
                    <p className="text-sm text-medium-grey font-primary">
                      {client.email}
                    </p>
                  )}
                  {client.phone && (
                    <p className="text-sm text-medium-grey font-primary">
                      {client.phone}
                    </p>
                  )}
                  {client.company && (
                    <p className="text-sm text-medium-grey font-primary">
                      {client.company}
                    </p>
                  )}
                </div>
              ))}
            </div>
            
            <div className="text-center">
              <button
                onClick={() => setShowNewClientForm(true)}
                className="px-4 py-2 border-2 border-medium-grey text-medium-grey hover:border-dark-grey hover:text-hud-text-primary font-primary font-bold uppercase tracking-wide transition-colors"
              >
                + Create New Client
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-lg border-2 border-hud-border space-y-4">
            <h4 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide">
              Create New Client
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
                  Name *
                </label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
                  placeholder="Client name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
                  placeholder="client@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
                  Company
                </label>
                <input
                  type="text"
                  value={newClient.company}
                  onChange={(e) => setNewClient(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
                  placeholder="Company name"
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleCreateNewClient}
                disabled={!newClient.name.trim()}
                className={`px-4 py-2 font-primary font-bold uppercase tracking-wide transition-colors ${
                  newClient.name.trim()
                    ? 'bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light'
                    : 'bg-light-grey text-medium-grey cursor-not-allowed'
                }`}
              >
                Create Client
              </button>
              <button
                onClick={() => {
                  setShowNewClientForm(false);
                  setNewClient({ name: '', email: '', phone: '', company: '' });
                }}
                className="px-4 py-2 border-2 border-medium-grey text-medium-grey hover:border-dark-grey hover:text-hud-text-primary font-primary font-bold uppercase tracking-wide transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {selectedClient && (
          <div className="mt-4 p-3 bg-tactical-gold bg-opacity-10 border-2 border-hud-border-accent rounded">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gold mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-primary font-bold text-hud-text-primary">
                Selected: {selectedClient.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Conversation Details */}
      <div className="bg-white border-2 border-hud-border p-6 rounded-lg space-y-4">
        <h3 className="text-lg font-bold text-hud-text-primary font-primary uppercase tracking-wide">
          Conversation Details
        </h3>

        {/* Title */}
        <div>
          <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
            Title *
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
              placeholder="Enter conversation title"
            />
            <button
              onClick={autoGenerateTitle}
              className="px-4 py-2 border-2 border-medium-grey text-medium-grey hover:border-dark-grey hover:text-hud-text-primary font-primary font-bold text-sm uppercase tracking-wide transition-colors"
            >
              Auto-Generate
            </button>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary resize-none"
            placeholder="Optional description or notes about this conversation"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
            Tags
          </label>
          
          {/* Current Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 bg-tactical-gold bg-opacity-20 text-hud-text-primary font-primary font-bold text-sm rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-hud-text-primary hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add New Tag */}
          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddNewTag()}
              className="flex-1 px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
              placeholder="Add a tag"
            />
            <button
              onClick={handleAddNewTag}
              disabled={!newTag.trim()}
              className={`px-4 py-2 font-primary font-bold uppercase tracking-wide transition-colors ${
                newTag.trim()
                  ? 'bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light'
                  : 'bg-light-grey text-medium-grey cursor-not-allowed'
              }`}
            >
              Add
            </button>
          </div>

          {/* Suggested Tags */}
          <div>
            <p className="text-sm text-medium-grey font-primary mb-2">Suggested tags:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.filter(tag => !tags.includes(tag)).map((tag) => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  className="px-2 py-1 bg-light-grey text-medium-grey hover:bg-medium-grey hover:text-white font-primary text-sm rounded transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-tactical-gold-muted border-2 border-tactical-grey-300 p-4 rounded-lg">
        <h4 className="font-bold text-tactical-brown-dark font-primary uppercase tracking-wide mb-2">
          Conversation Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-tactical-brown-dark font-primary">
          <div>
            <strong>Messages:</strong> {messageCount}
          </div>
          <div>
            <strong>Client:</strong> {selectedClient?.name || 'Not selected'}
          </div>
          <div>
            <strong>Tags:</strong> {tags.length}
          </div>
          <div>
            <strong>Title:</strong> {title.length > 0 ? '✓' : '✗'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t-2 border-hud-border">
        <div className="text-medium-grey font-primary">
          {isValid ? 'Ready to save conversation to database' : 'Please complete required fields'}
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className={`px-8 py-3 font-primary font-bold uppercase tracking-wide transition-colors ${
            isValid && !loading
              ? 'bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light'
              : 'bg-light-grey text-medium-grey cursor-not-allowed'
          }`}
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-grey mr-2"></div>
              Saving...
            </div>
          ) : (
            'Create Conversation'
          )}
        </button>
      </div>
    </div>
  );
}