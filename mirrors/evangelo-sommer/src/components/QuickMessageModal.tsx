"use client"

import React, { useState, useEffect } from 'react'
import { X, MessageSquare, Calendar, Clock, Plus } from 'lucide-react'
import { Client, Message, Conversation } from '@/types/client'
import { lockScroll, unlockScroll } from '@/lib/modal-scroll-lock'

interface QuickMessageModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onSave: (conversation: Conversation, scheduleAppointment?: boolean, isNewConversation?: boolean) => void
  onScheduleAppointment?: () => void
}

const QuickMessageModal: React.FC<QuickMessageModalProps> = ({
  isOpen,
  onClose,
  client,
  onSave,
  onScheduleAppointment
}) => {
  const [messageContent, setMessageContent] = useState('')
  const [messageType, setMessageType] = useState<'text' | 'email' | 'phone' | 'meeting'>('text')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [scheduleAppointment, setScheduleAppointment] = useState(false)
  const [customTimestamp, setCustomTimestamp] = useState('')
  const [existingConversations, setExistingConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string>('new')
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)

  // Load existing conversations for this client
  useEffect(() => {
    if (isOpen && client.id) {
      loadConversations()
    }
  }, [isOpen, client.id])

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockScroll()
    } else {
      unlockScroll()
    }

    // Cleanup function to restore scroll on unmount
    return () => {
      unlockScroll()
    }
  }, [isOpen])

  // Auto-detect message type from selected conversation
  useEffect(() => {
    if (selectedConversationId !== 'new') {
      const conversation = existingConversations.find(c => c.id === selectedConversationId)
      if (conversation) {
        // Auto-set message type based on conversation source
        if (conversation.source === 'text') {
          setMessageType('text')
        } else if (conversation.source === 'email') {
          setMessageType('email')
        } else if (conversation.source === 'phone') {
          setMessageType('phone')
        } else if (conversation.source === 'meeting') {
          setMessageType('meeting')
        }

        // Auto-set priority from conversation
        if (conversation.priority) {
          setPriority(conversation.priority)
        }
      }
    }
  }, [selectedConversationId, existingConversations])

  const loadConversations = async () => {
    setIsLoadingConversations(true)
    try {
      const response = await fetch(`/api/conversations?clientId=${client.id}`)
      if (response.ok) {
        const data = await response.json()
        const conversations = data.conversations || []

        // Filter active conversations
        const activeConvos = conversations.filter((c: Conversation) =>
          c.status === 'active' || c.status === 'pending'
        )

        setExistingConversations(activeConvos)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!messageContent.trim()) {
      alert('Please enter a message')
      return
    }

    // Create new message from client
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: 'client',
      content: messageContent.trim(),
      timestamp: customTimestamp || new Date().toISOString(),
      type: messageType === 'phone' ? 'call-notes' : messageType === 'meeting' ? 'meeting-notes' : messageType,
      metadata: {}
    }

    let conversation: Conversation
    let isNewConversation = false

    if (selectedConversationId === 'new') {
      // Create new conversation
      isNewConversation = true
      conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        clientId: client.id,
        title: `${messageType.toUpperCase()} from ${client.name}`,
        messages: [message],
        createdAt: message.timestamp,
        updatedAt: message.timestamp,
        source: messageType,
        priority,
        status: scheduleAppointment ? 'pending' : 'active',
        tags: scheduleAppointment ? ['appointment-request'] : [],
        summary: `Incoming ${messageType} message`
      }
    } else {
      // Append to existing conversation
      const existingConvo = existingConversations.find(c => c.id === selectedConversationId)
      if (!existingConvo) {
        alert('Selected conversation not found')
        return
      }

      conversation = {
        ...existingConvo,
        messages: [...existingConvo.messages, message],
        updatedAt: message.timestamp,
        status: scheduleAppointment ? 'pending' : existingConvo.status,
        tags: scheduleAppointment
          ? [...(existingConvo.tags || []), 'appointment-request']
          : existingConvo.tags
      }
    }

    onSave(conversation, scheduleAppointment, isNewConversation)

    // Reset form
    setMessageContent('')
    setMessageType('text')
    setPriority('medium')
    setScheduleAppointment(false)
    setCustomTimestamp('')
    setSelectedConversationId('new')
    onClose()

    // If scheduling appointment, trigger that flow
    if (scheduleAppointment && onScheduleAppointment) {
      onScheduleAppointment()
    }
  }

  const getConversationLabel = (conv: Conversation) => {
    const messageCount = conv.messages?.length || 0
    const lastMessage = conv.messages?.[messageCount - 1]
    const preview = lastMessage?.content?.substring(0, 40) || 'No messages'
    return `${conv.title} (${messageCount} msgs) - ${preview}...`
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={onClose} />

      {/* Modal container - accounts for sidebar on desktop */}
      <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-[101] flex items-start justify-center p-4 sm:p-6 md:p-8 overflow-y-auto pointer-events-none">
        <div className="neo-container max-w-2xl w-full max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-16rem)] mt-16 sm:mt-20 md:mt-16 mb-8 overflow-y-auto pointer-events-auto">
        {/* Header */}
        <div className="neo-inset border-b border-foreground/10 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-foreground" />
            <h2 className="text-xl font-bold text-foreground uppercase tracking-wide font-primary">
              Quick Message from {client.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="neo-button-circle w-8 h-8 flex items-center justify-center transition-transform hover:scale-[1.1]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Conversation Selection */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
              Add to Conversation
            </label>
            <select
              value={selectedConversationId}
              onChange={(e) => setSelectedConversationId(e.target.value)}
              className="w-full px-3 py-2 neo-inset text-foreground font-primary text-sm"
              disabled={isLoadingConversations}
            >
              <option value="new">
                ✨ Create New Conversation
              </option>
              {existingConversations.length > 0 && (
                <optgroup label="─── Existing Conversations ───">
                  {existingConversations.map(conv => (
                    <option key={conv.id} value={conv.id}>
                      {getConversationLabel(conv)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {isLoadingConversations && (
              <p className="text-xs text-muted-foreground font-primary mt-1">
                Loading conversations...
              </p>
            )}
            {selectedConversationId !== 'new' && (
              <p className="text-xs text-tactical-gold font-primary mt-1">
                Message will be added to existing conversation. Message type will match conversation type.
              </p>
            )}
          </div>

          {/* Message Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                Message Type
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as typeof messageType)}
                className="w-full px-3 py-2 neo-inset text-foreground font-primary text-sm uppercase tracking-wide"
                disabled={selectedConversationId !== 'new'}
              >
                <option value="text">Text Message</option>
                <option value="email">Email</option>
                <option value="phone">Phone Call</option>
                <option value="meeting">In-Person Meeting</option>
              </select>
              {selectedConversationId !== 'new' && (
                <p className="text-xs text-muted-foreground font-primary mt-1">
                  Auto-detected from conversation
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full px-3 py-2 neo-inset text-foreground font-primary text-sm uppercase tracking-wide"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Custom Timestamp (Optional) */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
              Message Timestamp (Optional)
            </label>
            <input
              type="datetime-local"
              value={customTimestamp ? new Date(customTimestamp).toISOString().slice(0, 16) : ''}
              onChange={(e) => setCustomTimestamp(e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full px-3 py-2 neo-inset text-foreground font-primary text-sm"
              placeholder="Leave empty for current time"
            />
            <p className="text-xs text-muted-foreground font-primary mt-1">
              Leave empty to use current time
            </p>
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
              Message Content
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Enter what the client said..."
              rows={6}
              className="w-full px-3 py-2 neo-inset text-foreground font-primary resize-none"
              required
            />
          </div>

          {/* Schedule Appointment Option */}
          <div className="neo-inset p-4 space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleAppointment}
                onChange={(e) => setScheduleAppointment(e.target.checked)}
                className="w-4 h-4"
              />
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-foreground" />
                <span className="text-sm font-bold text-foreground uppercase tracking-wide font-primary">
                  Client wants to schedule an appointment
                </span>
              </div>
            </label>

            {scheduleAppointment && (
              <div className="neo-inset p-3 border-l-4 border-tactical-gold">
                <div className="flex items-start space-x-2">
                  <Clock className="h-4 w-4 text-tactical-gold mt-0.5" />
                  <div className="text-xs text-muted-foreground font-primary">
                    After saving this message, you'll be redirected to the calendar to schedule an appointment for this client.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-foreground/10">
            <button
              type="button"
              onClick={onClose}
              className="neo-button px-6 py-2 uppercase tracking-wide transition-transform hover:scale-[1.02] font-primary font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="neo-button-active px-6 py-2 uppercase tracking-wide transition-transform hover:scale-[1.02] font-primary font-bold"
            >
              {scheduleAppointment ? 'Save & Schedule' : 'Save Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

export default QuickMessageModal
