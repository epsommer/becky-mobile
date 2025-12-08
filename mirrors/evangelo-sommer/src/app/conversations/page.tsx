"use client"

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Search, Filter, MessageSquare, Phone, Mail, Calendar, Users, Plus, Clock, Tag, User, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import CRMLayout from '@/components/CRMLayout'
import { clientManager } from '@/lib/client-config'
import { Client, Conversation, Message } from '@/types/client'

function ConversationsPageContent() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterClient, setFilterClient] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('updated')

  // Initialize client filter from URL parameters
  useEffect(() => {
    const clientParam = searchParams?.get('client')
    if (clientParam) {
      setFilterClient(clientParam)
    }
  }, [searchParams])

  const loadData = useCallback(async () => {
    try {
      // Fetch conversations from database API
      const conversationResponse = await fetch('/api/conversations')
      let allConversations: Conversation[] = []
      
      if (conversationResponse.ok) {
        const conversationData = await conversationResponse.json()
        allConversations = conversationData.success ? conversationData.data : []
      }
      
      // Load clients from clientManager (now uses database API)
      const allClients = await clientManager.getClients()
    
    
    // Apply filters
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      allConversations = allConversations.filter(conv =>
        conv.title?.toLowerCase().includes(searchLower) ||
        conv.messages.some(msg => msg.content.toLowerCase().includes(searchLower)) ||
        allClients.find(c => c.id === conv.clientId)?.name?.toLowerCase().includes(searchLower)
      )
    }

    if (filterStatus !== 'all') {
      allConversations = allConversations.filter(conv => conv.status === filterStatus)
    }

    if (filterClient !== 'all') {
      allConversations = allConversations.filter(conv => conv.clientId === filterClient)
    }

    if (filterPriority !== 'all') {
      allConversations = allConversations.filter(conv => conv.priority === filterPriority)
    }

    // Apply sorting
    allConversations.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'messages':
          return b.messages.length - a.messages.length
        case 'client':
          const clientA = allClients.find(c => c.id === a.clientId)?.name || ''
          const clientB = allClients.find(c => c.id === b.clientId)?.name || ''
          return clientA.localeCompare(clientB)
        default:
          return 0
      }
    })

      setConversations(allConversations)
      setClients(allClients)
    } catch (error) {
      console.error('Error loading conversations:', error)
      setConversations([])
      // Still load clients from database as fallback
      setClients(await clientManager.getClients())
    }
  }, [searchQuery, filterStatus, filterClient, filterPriority, sortBy])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getClient = (clientId: string): Client | null => {
    return clients.find(client => client.id === clientId) || null
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-accent text-foreground',
      resolved: 'bg-green-600 text-white',
      archived: 'bg-medium-grey text-white',
      pending: 'bg-yellow-600 text-white'
    }
    return colors[status as keyof typeof colors] || colors.active
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-muted text-muted-foreground',
      medium: 'bg-accent text-foreground',
      high: 'bg-dark-grey text-white',
      urgent: 'bg-red-600 text-white'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const getMessageTypeIcon = (type: Message['type']) => {
    const icons = {
      'call-notes': <Phone className="h-4 w-4" />,
      'email': <Mail className="h-4 w-4" />,
      'text': <MessageSquare className="h-4 w-4" />,
      'meeting-notes': <MapPin className="h-4 w-4" />,
      'voice-memo': <Phone className="h-4 w-4" />,
      'file-upload': <Tag className="h-4 w-4" />
    }
    return icons[type] || <MessageSquare className="h-4 w-4" />
  }

  const getLastMessage = (conversation: Conversation): Message | null => {
    return conversation.messages.length > 0 
      ? conversation.messages[conversation.messages.length - 1] 
      : null
  }

  const getUnreadCount = (conversation: Conversation): number => {
    // In a real implementation, this would check for unread messages
    // For now, we'll simulate based on recent activity
    const lastMessage = getLastMessage(conversation)
    if (!lastMessage) return 0
    
    const daysSinceLastMessage = Math.floor(
      (new Date().getTime() - new Date(lastMessage.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // Simulate unread messages for recent conversations from clients
    return (daysSinceLastMessage < 3 && (lastMessage.role === 'client' || lastMessage.role === 'CLIENT')) ? 1 : 0
  }

  if (status === 'loading') {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-border-accent"></div>
        </div>
      </CRMLayout>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  const stats = {
    total: conversations.length,
    active: conversations.filter(c => c.status === 'active').length,
    pending: conversations.filter(c => c.status === 'pending').length,
    unread: conversations.reduce((sum, conv) => sum + getUnreadCount(conv), 0)
  }

  const filteredClient = filterClient !== 'all' ? clients.find(c => c.id === filterClient) : null

  return (
    <CRMLayout>
      <div className="p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
        {/* Page Header */}
        <div className="neo-container p-4 sm:p-5 md:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground uppercase tracking-wide font-primary mb-2">
                {filteredClient ? `${filteredClient.name.toUpperCase()} CONVERSATIONS` : 'ALL CONVERSATIONS'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-primary">
                {filteredClient
                  ? `VIEW AND MANAGE CONVERSATIONS FOR ${filteredClient.name.toUpperCase()}`
                  : 'VIEW AND MANAGE ALL CLIENT COMMUNICATIONS'
                }
              </p>
              {filteredClient && (
                <div className="mt-2">
                  <button
                    onClick={() => {
                      setFilterClient('all')
                      router.push('/conversations')
                    }}
                    className="neo-button text-accent hover:text-accent/80 text-sm font-primary uppercase tracking-wide"
                  >
                    ← VIEW ALL CONVERSATIONS
                  </button>
                </div>
              )}
            </div>
            <button
              className="neo-button-active font-primary text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2 w-full sm:w-auto justify-center"
              onClick={() => router.push('/conversations/create')}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">NEW CONVERSATION</span>
              <span className="sm:hidden">NEW</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="neo-card p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground font-primary">
              {stats.total}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground font-primary uppercase tracking-wide">
              TOTAL
            </div>
          </div>
          <div className="neo-card p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-accent font-primary">
              {stats.active}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground font-primary uppercase tracking-wide">
              ACTIVE
            </div>
          </div>
          <div className="neo-card p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600 font-primary">
              {stats.pending}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground font-primary uppercase tracking-wide">
              PENDING
            </div>
          </div>
          <div className="neo-card p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-red-600 font-primary">
              {stats.unread}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground font-primary uppercase tracking-wide">
              UNREAD
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="neo-container p-4 sm:p-5 md:p-6 mb-4 sm:mb-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="SEARCH CONVERSATIONS, CLIENTS, OR MESSAGE CONTENT..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="neomorphic-input w-full pl-10 font-primary text-sm uppercase tracking-wide"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="neomorphic-input px-4 py-2 font-primary text-sm uppercase tracking-wide"
              >
                <option value="all">ALL STATUS</option>
                <option value="active">ACTIVE</option>
                <option value="pending">PENDING</option>
                <option value="resolved">RESOLVED</option>
                <option value="archived">ARCHIVED</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="neomorphic-input px-4 py-2 font-primary text-sm uppercase tracking-wide"
              >
                <option value="all">ALL CLIENTS</option>
                {(clients || []).map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name.toUpperCase()}
                  </option>
                ))}
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="neomorphic-input px-4 py-2 font-primary text-sm uppercase tracking-wide"
              >
                <option value="all">ALL PRIORITIES</option>
                <option value="urgent">URGENT</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="neomorphic-input px-4 py-2 font-primary text-sm uppercase tracking-wide"
              >
                <option value="updated">SORT BY UPDATED</option>
                <option value="created">SORT BY CREATED</option>
                <option value="messages">SORT BY MESSAGE COUNT</option>
                <option value="client">SORT BY CLIENT NAME</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <div className="neo-container p-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2 font-primary uppercase tracking-wide">
              NO CONVERSATIONS FOUND
            </h3>
            <p className="text-muted-foreground mb-4 font-primary">
              {searchQuery || filterStatus !== 'all' || filterClient !== 'all' || filterPriority !== 'all'
                ? 'TRY ADJUSTING YOUR SEARCH TERMS OR FILTERS.'
                : 'START BY ADDING CLIENTS AND CREATING CONVERSATIONS.'}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                className="neo-button-active font-primary text-sm uppercase tracking-wide flex items-center gap-2"
                onClick={() => router.push('/conversations/create')}
              >
                <Plus className="h-4 w-4" />
                CREATE CONVERSATION
              </button>
              <button
                className="neo-button font-primary text-sm uppercase tracking-wide flex items-center gap-2"
                onClick={() => router.push('/clients')}
              >
                <Users className="h-4 w-4" />
                MANAGE CLIENTS
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map(conversation => {
              const client = getClient(conversation.clientId)
              const lastMessage = getLastMessage(conversation)
              const unreadCount = getUnreadCount(conversation)
              
              return (
                <Link
                  key={conversation.id}
                  href={`/conversations/${conversation.id}`}
                  className="block"
                >
                  <div className="neo-container p-4 sm:p-5 md:p-6 hover:bg-card transition-colors cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-bold text-foreground font-primary">
                              {client?.name?.toUpperCase() || 'UNKNOWN CLIENT'}
                            </span>
                          </div>
                          <Badge className={`${getStatusColor(conversation.status || 'active')} text-xs font-bold uppercase tracking-wide`}>
                            {conversation.status || 'ACTIVE'}
                          </Badge>
                          <Badge className={`${getPriorityColor(conversation.priority || 'medium')} text-xs font-bold uppercase tracking-wide`}>
                            {conversation.priority || 'MEDIUM'}
                          </Badge>
                          {unreadCount > 0 && (
                            <Badge className="bg-red-600 text-white text-xs font-bold">
                              {unreadCount} NEW
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-bold text-foreground mb-2 font-primary">
                          {(conversation.title || 'UNTITLED CONVERSATION').toUpperCase()}
                        </h3>
                        
                        {lastMessage && (
                          <div className="mb-3">
                            <div className="flex items-center space-x-2 mb-1">
                              {getMessageTypeIcon(lastMessage.type)}
                              <span className="text-xs text-muted-foreground font-primary uppercase">
                                LAST MESSAGE FROM {(lastMessage.role === 'client' || lastMessage.role === 'CLIENT') ? client?.name?.toUpperCase() || 'CLIENT' : 'YOU'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground font-primary line-clamp-2">
                              {lastMessage.content}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-primary">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center space-x-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{conversation.messages.length} MESSAGES</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>UPDATED: {format(new Date(conversation.updatedAt), 'MMM dd, HH:mm').toUpperCase()}</span>
                            </span>
                            {conversation.source && (
                              <span className="flex items-center space-x-1">
                                <Tag className="h-3 w-3" />
                                <span>SOURCE: {conversation.source.toUpperCase()}</span>
                              </span>
                            )}
                          </div>
                          
                          {conversation.tags && conversation.tags.length > 0 && (
                            <div className="flex items-center space-x-1">
                              {conversation.tags.slice(0, 2).map((tag, index) => (
                                <Badge 
                                  key={index}
                                  className="bg-muted text-muted-foreground text-xs font-bold uppercase"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {conversation.tags.length > 2 && (
                                <Badge className="bg-muted text-muted-foreground text-xs font-bold uppercase">
                                  +{conversation.tags.length - 2} MORE
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </CRMLayout>
  )
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-border-accent"></div>
        </div>
      </CRMLayout>
    }>
      <ConversationsPageContent />
    </Suspense>
  )
}