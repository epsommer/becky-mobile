"use client"

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { MessageSquare, Phone, Mail, Video, MapPin, Clock, Plus, Edit, Trash2, Tag, User, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Conversation, Message } from '@/types/client'
import { Client } from '@/types/client'
import { useConversations } from '@/hooks/useConversations'
import MessageImporter from './MessageImporter'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ClientConversationsSectionProps {
  clientId: string
  client: Client
}

const ClientConversationsSection: React.FC<ClientConversationsSectionProps> = ({ clientId, client }) => {
  const router = useRouter()
  const { conversations, loading, error, addConversation, updateConversation, deleteConversation, addMessage } = useConversations(clientId)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [viewMode, setViewMode] = useState<'individual' | 'compacted'>('individual')


  const getStatusColor = (status: Conversation['status']) => {
    const colors = {
      active: 'bg-tactical-gold text-hud-text-primary',
      resolved: 'bg-green-600 text-white',
      archived: 'bg-medium-grey text-white',
      pending: 'bg-yellow-600 text-white'
    }
    return colors[status || 'active']
  }

  const getPriorityColor = (priority: Conversation['priority']) => {
    const colors = {
      low: 'bg-light-grey text-medium-grey',
      medium: 'bg-tactical-gold text-hud-text-primary',
      high: 'bg-dark-grey text-white',
      urgent: 'bg-red-600 text-white'
    }
    return colors[priority || 'medium']
  }

  const getMessageTypeIcon = (type: Message['type']) => {
    const icons = {
      'call-notes': <Phone className="h-4 w-4" />,
      'email': <Mail className="h-4 w-4" />,
      'text': <MessageSquare className="h-4 w-4" />,
      'meeting-notes': <MapPin className="h-4 w-4" />,
      'voice-memo': <Video className="h-4 w-4" />,
      'file-upload': <Tag className="h-4 w-4" />
    }
    return icons[type] || <MessageSquare className="h-4 w-4" />
  }

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        await deleteConversation(conversationId)
      } catch (error) {
        console.error('Failed to delete conversation:', error)
        alert('Failed to delete conversation. Please try again.')
      }
    }
  }

  const handleAddMessage = async (conversationId: string, content: string, type: Message['type'] = 'text') => {
    try {
      await addMessage(conversationId, {
        role: 'you',
        content: content.trim(),
        type: type,
        timestamp: new Date().toISOString(),
        metadata: {}
      })
    } catch (error) {
      console.error('Failed to add message:', error)
      alert('Failed to add message. Please try again.')
    }
  }

  // Get compacted messages (up to 9 most recent across all conversations)
  const getCompactedMessages = () => {
    const allMessages: Array<Message & { conversationId: string; conversationTitle: string }> = []

    conversations.forEach(conversation => {
      if (conversation.messages && Array.isArray(conversation.messages)) {
        conversation.messages.forEach(message => {
          allMessages.push({
            ...message,
            conversationId: conversation.id,
            conversationTitle: conversation.title || 'Untitled Conversation'
          })
        })
      }
    })

    // Sort by timestamp (newest first) and take top 9
    return allMessages
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 9)
  }

  return (
    <div className="neo-container transition-transform hover:scale-[1.01]">
      <div className="neo-inset border-b border-foreground/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground uppercase tracking-wide font-primary">
            Conversations with {client.name}
          </h2>
          <div className="flex items-center space-x-2">
            <Link
              href={`/clients/${clientId}/master`}
              className="neo-button-active px-4 py-2 font-bold uppercase text-sm tracking-wide font-primary transition-transform hover:scale-[1.02] flex items-center gap-2"
              title="View complete message history in master timeline"
            >
              <History className="h-4 w-4" />
              Full Timeline
            </Link>
            <Link
              href={`/conversations?client=${clientId}`}
              className="neo-button-circle w-10 h-10 flex items-center justify-center transition-transform hover:scale-[1.1] text-foreground"
              title="View All Conversations"
            >
              <MessageSquare className="h-4 w-4" />
            </Link>
            <button
              className="neo-button px-4 py-2 font-bold uppercase text-sm tracking-wide font-primary transition-transform hover:scale-[1.02]"
              onClick={() => router.push(`/conversations/create?client=${clientId}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Conversation
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground font-primary uppercase tracking-wide mr-2">View:</span>
          <button
            onClick={() => setViewMode('individual')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide font-primary transition-all ${
              viewMode === 'individual' ? 'neo-button-active' : 'neo-button'
            }`}
          >
            <MessageSquare className="h-3 w-3 inline mr-2" />
            Conversations
          </button>
          <button
            onClick={() => setViewMode('compacted')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide font-primary transition-all ${
              viewMode === 'compacted' ? 'neo-button-active' : 'neo-button'
            }`}
          >
            <Clock className="h-3 w-3 inline mr-2" />
            Recent Messages
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Error Display */}
        {error && (
          <div className="neo-inset p-4 border-l-4 border-red-500 mb-4">
            <div className="font-bold font-primary uppercase tracking-wide text-red-700">Error</div>
            <div className="text-sm font-primary text-red-600">{error}</div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-foreground/20 border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground font-primary uppercase tracking-wide">Loading conversations...</p>
          </div>
        )}

        {/* Content - Conditional based on view mode */}
        {!loading && (
          <div className="space-y-4">
            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-bold text-foreground mb-2 font-primary uppercase tracking-wide">
                  No Conversations Yet
                </h3>
                <p className="text-muted-foreground font-primary mb-4">
                  Start a conversation to track communications with this client.
                </p>
                <button
                  className="neo-button px-4 py-2 font-primary text-sm uppercase tracking-wide font-bold transition-transform hover:scale-[1.02]"
                  onClick={() => router.push(`/conversations/create?client=${clientId}`)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Start Conversation
                </button>
              </div>
            ) : viewMode === 'individual' ? (
              // Individual Conversations View
              conversations.map(conversation => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  onEdit={setEditingConversation}
                  onDelete={handleDeleteConversation}
                  onAddMessage={(conv) => {
                    setSelectedConversation(conv)
                    setShowMessageModal(true)
                  }}
                  getStatusColor={getStatusColor}
                  getPriorityColor={getPriorityColor}
                  getMessageTypeIcon={getMessageTypeIcon}
                />
              ))
            ) : (
              // Compacted Messages View
              <CompactedMessagesView
                messages={getCompactedMessages()}
                clientName={client.name}
                clientId={clientId}
                getMessageTypeIcon={getMessageTypeIcon}
                router={router}
              />
            )}
          </div>
        )}

        {/* Add/Edit Conversation Modal */}
        <ConversationModal 
        isOpen={showAddModal || editingConversation !== null}
        conversation={editingConversation}
        clientId={clientId}
        client={client}
        onClose={() => {
          setShowAddModal(false)
          setEditingConversation(null)
        }}
        onSave={async (conversationData) => {
          try {
            if (editingConversation) {
              await updateConversation(editingConversation.id, conversationData)
            } else {
              await addConversation(conversationData)
            }
            setShowAddModal(false)
            setEditingConversation(null)
          } catch (error) {
            console.error('Failed to save conversation:', error)
            alert('Failed to save conversation. Please try again.')
          }
        }}
      />

        {/* Add Message Modal */}
        <MessageModal
          isOpen={showMessageModal}
          conversation={selectedConversation}
          onClose={() => {
            setShowMessageModal(false)
            setSelectedConversation(null)
          }}
          onSave={(messageData) => {
            if (selectedConversation) {
              handleAddMessage(selectedConversation.id, messageData)
            }
            setShowMessageModal(false)
            setSelectedConversation(null)
          }}
        />
      </div>
    </div>
  )
}

interface ConversationItemProps {
  conversation: Conversation
  onEdit: (conversation: Conversation) => void
  onDelete: (conversationId: string) => void
  onAddMessage: (conversation: Conversation) => void
  getStatusColor: (status: Conversation['status']) => string
  getPriorityColor: (priority: Conversation['priority']) => string
  getMessageTypeIcon: (type: Message['type']) => React.ReactNode
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  onEdit,
  onDelete,
  onAddMessage,
  getStatusColor,
  getPriorityColor,
  getMessageTypeIcon
}) => {
  const lastMessage = conversation.messages[conversation.messages.length - 1]

  return (
    <Link href={`/conversations/${conversation.id}`}>
      <div className="neo-container p-4 hover:scale-[1.01] transition-transform cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <h4 className="font-bold text-foreground font-primary uppercase">
              {conversation.title || 'Untitled Conversation'}
            </h4>
            <Badge className={`${getStatusColor(conversation.status)} text-xs font-bold uppercase tracking-wide neo-badge`}>
              {conversation.status || 'active'}
            </Badge>
            <Badge className={`${getPriorityColor(conversation.priority)} text-xs font-bold uppercase tracking-wide neo-badge`}>
              {conversation.priority || 'medium'}
            </Badge>
          </div>

          <div className="flex items-center space-x-2" onClick={(e) => e.preventDefault()}>
            <button
              className="neo-button-sm px-2 py-1 text-xs font-bold uppercase font-primary transition-transform hover:scale-[1.1]"
              onClick={(e) => {
                e.stopPropagation()
                onAddMessage(conversation)
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Message
            </button>
            <button
              className="neo-button-sm px-2 py-1 text-xs font-bold uppercase font-primary transition-transform hover:scale-[1.1]"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(conversation)
              }}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </button>
            <button
              className="neo-button-sm px-2 py-1 text-xs font-bold uppercase font-primary transition-transform hover:scale-[1.1] bg-red-600 text-white"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(conversation.id)
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </button>
          </div>
        </div>
        
        {/* Messages Preview */}
        <div className="space-y-2 mb-3">
          {conversation.messages.slice(-2).map(message => (
            <MessageItem 
              key={message.id}
              message={message}
              getMessageTypeIcon={getMessageTypeIcon}
            />
          ))}
        </div>

        {/* Conversation Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground font-primary neo-inset p-3">
          <div className="flex items-center space-x-4">
            <span className="uppercase">{conversation.messages.length} Messages</span>
            <span className="uppercase">Last: {format(new Date(conversation.updatedAt), 'MMM dd, HH:mm')}</span>
            {conversation.source && (
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span className="uppercase">{conversation.source}</span>
              </div>
            )}
          </div>

          {conversation.tags && conversation.tags.length > 0 && (
            <div className="flex items-center space-x-1">
              <Tag className="h-3 w-3" />
              <span className="uppercase">{conversation.tags.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

interface MessageItemProps {
  message: Message
  getMessageTypeIcon: (type: Message['type']) => React.ReactNode
}

const MessageItem: React.FC<MessageItemProps> = ({ message, getMessageTypeIcon }) => (
  <div
    className={`flex items-start space-x-3 p-3 rounded-lg ${
      message.role === 'client' || message.role === 'CLIENT'
        ? 'bg-[var(--neomorphic-accent)]/12 border-l-4 border-l-[var(--neomorphic-accent)]'
        : 'bg-[var(--neomorphic-text)]/10 border-l-4 border-l-[var(--neomorphic-text)]'
    } text-foreground`}
  >
    <div className="flex items-center space-x-2">
      {getMessageTypeIcon(message.type)}
      <Badge className={`text-xs font-bold uppercase neo-badge ${
        (message.role === 'client' || message.role === 'CLIENT')
          ? 'bg-[var(--neomorphic-accent)]/20 text-foreground'
          : 'bg-[var(--neomorphic-text)]/20 text-foreground'
      }`}>
        {(message.role === 'client' || message.role === 'CLIENT') ? 'Client' : 'You'}
      </Badge>
    </div>
    <div className="flex-1">
      <p className="text-sm text-foreground font-primary">
        {message.content}
      </p>
      <div className="flex items-center space-x-2 text-xs text-muted-foreground font-primary mt-1">
        <Clock className="h-3 w-3" />
        <span className="uppercase">{format(new Date(message.timestamp), 'MMM dd, HH:mm')}</span>
        {message.metadata?.duration && (
          <span>• {message.metadata.duration}min</span>
        )}
      </div>
    </div>
  </div>
)

// Functional conversation modal
const ConversationModal: React.FC<{
  isOpen: boolean
  conversation: Conversation | null
  clientId: string
  client: Client
  onClose: () => void
  onSave: (data: Conversation) => void
}> = ({ isOpen, conversation, clientId, client, onClose, onSave }) => {
  const [creationType, setCreationType] = useState<'manual' | 'import'>('manual')
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Conversation['priority']>('medium')
  const [status, setStatus] = useState<Conversation['status']>('active')
  const [source, setSource] = useState<Conversation['source']>('email')
  const [initialMessage, setInitialMessage] = useState('')
  const [tags, setTags] = useState('')
  const [importedMessages, setImportedMessages] = useState<Message[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (creationType === 'manual' && (!title.trim() || !initialMessage.trim())) {
      alert('Please provide both a title and initial message')
      return
    }
    
    if (creationType === 'import' && (!title.trim() || importedMessages.length === 0)) {
      alert('Please provide a title and import some messages')
      return
    }

    let messages: Message[]
    if (creationType === 'manual') {
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: 'client',
        content: initialMessage.trim(),
        timestamp: new Date().toISOString(),
        type: source === 'phone' ? 'call-notes' : source === 'meeting' ? 'meeting-notes' : 'text',
        metadata: {}
      }
      messages = [message]
    } else {
      messages = importedMessages
    }

    const newConversation: Conversation = {
      id: conversation?.id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      clientId,
      title: title.trim(),
      messages,
      createdAt: conversation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source,
      priority,
      status,
      tags: tags.trim() ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      summary: `${source} conversation with ${messages.length} message${messages.length !== 1 ? 's' : ''}`
    }

    onSave(newConversation)
    
    // Reset form
    resetForm()
  }

  const resetForm = () => {
    setCreationType('manual')
    setTitle('')
    setInitialMessage('')
    setTags('')
    setPriority('medium')
    setStatus('active')
    setSource('email')
    setImportedMessages([])
  }

  const handleMessagesImported = (messages: Message[]) => {
    setImportedMessages(messages)
    if (messages.length > 0 && !title.trim()) {
      // Auto-generate title based on first message
      const firstMessage = messages[0]
      const preview = firstMessage.content.substring(0, 50)
      setTitle(`${source} conversation: ${preview}...`)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[min(90vw,800px)] max-h-[90vh] overflow-y-auto bg-white border-2 border-hud-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-hud-text-primary uppercase tracking-wide font-primary">
            {conversation ? 'EDIT CONVERSATION' : 'NEW CONVERSATION'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Creation Type Selection */}
          <div>
            <label className="block text-sm font-bold text-hud-text-primary mb-3 uppercase tracking-wide font-primary">
              HOW WOULD YOU LIKE TO CREATE THIS CONVERSATION?
            </label>
            <div className="space-y-3">
              <label className="flex items-start p-3 border-2 border-hud-border cursor-pointer hover:bg-hud-background-secondary transition-colors">
                <input
                  type="radio"
                  value="manual"
                  checked={creationType === 'manual'}
                  onChange={(e) => setCreationType(e.target.value as 'manual' | 'import')}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                    MANUAL ENTRY
                  </div>
                  <div className="text-sm text-medium-grey font-primary">
                    ENTER CONVERSATION DETAILS AND FIRST MESSAGE
                  </div>
                </div>
              </label>
              <label className="flex items-start p-3 border-2 border-hud-border cursor-pointer hover:bg-hud-background-secondary transition-colors">
                <input
                  type="radio"
                  value="import"
                  checked={creationType === 'import'}
                  onChange={(e) => setCreationType(e.target.value as 'manual' | 'import')}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                    IMPORT MESSAGES
                  </div>
                  <div className="text-sm text-medium-grey font-primary">
                    IMPORT FROM EXCEL FILE, PASTE TEXT, OR CRM INTEGRATION
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-hud-text-primary mb-2 uppercase tracking-wide font-primary">
              CONVERSATION TITLE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.G., LANDSCAPING QUOTE DISCUSSION"
              className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-hud-text-primary mb-2 uppercase tracking-wide font-primary">
                SOURCE
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as Conversation['source'])}
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary text-sm uppercase tracking-wide"
              >
                <option value="email">EMAIL</option>
                <option value="text">TEXT</option>
                <option value="phone">PHONE</option>
                <option value="meeting">MEETING</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-hud-text-primary mb-2 uppercase tracking-wide font-primary">
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Conversation['priority'])}
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary text-sm uppercase tracking-wide"
              >
                <option value="low">LOW</option>
                <option value="medium">MEDIUM</option>
                <option value="high">HIGH</option>
                <option value="urgent">URGENT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-hud-text-primary mb-2 uppercase tracking-wide font-primary">
                STATUS
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Conversation['status'])}
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary text-sm uppercase tracking-wide"
              >
                <option value="active">ACTIVE</option>
                <option value="pending">PENDING</option>
                <option value="resolved">RESOLVED</option>
                <option value="archived">ARCHIVED</option>
              </select>
            </div>
          </div>

          {/* Manual Entry Fields */}
          {creationType === 'manual' && (
            <div>
              <label className="block text-sm font-bold text-hud-text-primary mb-2 uppercase tracking-wide font-primary">
                INITIAL MESSAGE
              </label>
              <textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="ENTER THE FIRST MESSAGE IN THIS CONVERSATION..."
                rows={4}
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary"
                required
              />
            </div>
          )}

          {/* Import Fields */}
          {creationType === 'import' && (
            <div className="border-2 border-hud-border p-4 max-h-[60vh] overflow-y-auto">
              <MessageImporter
                onMessagesDetected={handleMessagesImported}
                clientName={client.name}
                userName="You"
              />
              {importedMessages.length > 0 && (
                <div className="mt-4 p-3 bg-tactical-gold-light border border-hud-border-accent">
                  <div className="text-sm font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                    ✅ {importedMessages.length} MESSAGES IMPORTED
                  </div>
                  <div className="text-xs text-medium-grey font-primary mt-1">
                    MESSAGES ARE READY TO BE ADDED TO THE CONVERSATION
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-hud-text-primary mb-2 uppercase tracking-wide font-primary">
              TAGS (COMMA SEPARATED)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="QUOTE, URGENT, FOLLOW-UP"
              className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t-2 border-hud-border">
            <Button 
              type="button"
              variant="outline" 
              onClick={onClose}
              className="border-2 border-hud-border text-hud-text-primary hover:bg-light-grey font-primary font-bold uppercase tracking-wide"
            >
              CANCEL
            </Button>
            <Button 
              type="submit"
              className="bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-primary font-bold uppercase tracking-wide"
              disabled={creationType === 'import' && importedMessages.length === 0}
            >
              {conversation ? 'UPDATE' : 'CREATE'} CONVERSATION
              {creationType === 'import' && importedMessages.length > 0 && ` (${importedMessages.length} MESSAGES)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const MessageModal: React.FC<{
  isOpen: boolean
  conversation: Conversation | null
  onClose: () => void
  onSave: (data: string) => void
}> = ({ isOpen, conversation, onClose, onSave }) => {
  const [message, setMessage] = useState('')

  const handleSave = () => {
    if (message.trim()) {
      onSave(message.trim())
      setMessage('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white border-2 border-hud-border">
        <DialogHeader className="bg-hud-background-secondary border-b-2 border-hud-border-accent p-6">
          <DialogTitle className="text-xl font-bold text-hud-text-primary uppercase tracking-wide font-primary">
            ADD MESSAGE
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="TYPE YOUR MESSAGE..."
            className="w-full h-32 p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary"
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-2 border-hud-border text-hud-text-primary hover:bg-light-grey font-primary font-bold uppercase tracking-wide"
            >
              CANCEL
            </Button>
            <Button 
              className="bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-primary font-bold uppercase tracking-wide"
              onClick={handleSave}
              disabled={!message.trim()}
            >
              SEND
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Compacted Messages View Component
interface CompactedMessagesViewProps {
  messages: Array<Message & { conversationId: string; conversationTitle: string }>
  clientName: string
  clientId: string
  getMessageTypeIcon: (type: Message['type']) => React.ReactNode
  router: ReturnType<typeof useRouter>
}

const CompactedMessagesView: React.FC<CompactedMessagesViewProps> = ({
  messages,
  clientName,
  clientId,
  getMessageTypeIcon,
  router
}) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 neo-inset">
        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-bold text-foreground mb-2 font-primary uppercase tracking-wide">
          No Messages Yet
        </h3>
        <p className="text-muted-foreground font-primary">
          Start a conversation to see recent messages here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4 neo-inset p-3">
        <div className="text-sm font-primary text-muted-foreground uppercase tracking-wide">
          Showing {messages.length} most recent message{messages.length !== 1 ? 's' : ''}
        </div>
        <div className="text-xs text-muted-foreground font-primary">
          Click message to view full conversation
        </div>
      </div>

      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null
        const showDateDivider = !prevMessage ||
          new Date(message.timestamp).toDateString() !== new Date(prevMessage.timestamp).toDateString()

        return (
          <div key={`${message.conversationId}-${message.id}`}>
            {/* Date Divider */}
            {showDateDivider && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-foreground/10"></div>
                <span className="text-xs font-primary uppercase tracking-wide text-muted-foreground px-3 py-1 neo-badge">
                  {format(new Date(message.timestamp), 'EEE, MMM dd, yyyy')}
                </span>
                <div className="flex-1 h-px bg-foreground/10"></div>
              </div>
            )}

            {/* Message */}
            <div
              onClick={() => router.push(`/conversations/${message.conversationId}`)}
              className="neo-container p-4 hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <Badge className={`text-xs font-bold uppercase neo-badge ${
                    (message.role === 'client' || message.role === 'CLIENT')
                      ? 'bg-muted-foreground/20 text-foreground'
                      : 'bg-foreground/10 text-foreground'
                  }`}>
                    {(message.role === 'client' || message.role === 'CLIENT') ? clientName : 'You'}
                  </Badge>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    {getMessageTypeIcon(message.type)}
                    <span className="font-primary uppercase">{message.type}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground font-primary">
                  {format(new Date(message.timestamp), 'HH:mm')}
                </div>
              </div>

              <p className="text-sm text-foreground font-primary mb-3 line-clamp-3">
                {message.content}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
                <div className="flex items-center space-x-2 text-xs text-muted-foreground font-primary">
                  <MessageSquare className="h-3 w-3" />
                  <span className="uppercase">{message.conversationTitle}</span>
                </div>
                <button className="text-xs text-accent hover:underline font-primary uppercase tracking-wide flex items-center gap-1">
                  View Conversation
                  <MessageSquare className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {messages.length === 9 && (
        <div className="text-center py-4 neo-inset">
          <p className="text-sm text-muted-foreground font-primary mb-3">
            Showing 9 most recent messages
          </p>
          <Link
            href={`/clients/${clientId}/master`}
            className="neo-button px-4 py-2 text-xs uppercase tracking-wide font-primary font-bold transition-transform hover:scale-[1.02] inline-flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            View All in Full Timeline
          </Link>
        </div>
      )}
    </div>
  )
}

export default ClientConversationsSection
