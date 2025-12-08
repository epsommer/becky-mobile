import { useState, useEffect, useCallback } from 'react'
import { Conversation, Message } from '@/types/client'

interface ConversationResponse {
  success: boolean
  data?: Conversation[]
  error?: string
  total?: number
  page?: number
  limit?: number
}

interface CreateConversationResponse {
  success: boolean
  data?: Conversation
  error?: string
}

export const useConversations = (clientId: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch conversations from database
  const fetchConversations = useCallback(async () => {
    if (!clientId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/conversations?clientId=${clientId}`)
      const data: ConversationResponse = await response.json()

      if (data.success && data.data) {
        setConversations(data.data)
      } else {
        setError(data.error || 'Failed to fetch conversations')
        setConversations([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(errorMessage)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  // Add new conversation
  const addConversation = useCallback(async (conversationData: Partial<Conversation>) => {
    try {
      const payload = {
        ...conversationData,
        clientId,
      }

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data: CreateConversationResponse = await response.json()

      if (data.success && data.data) {
        // Add to local state
        setConversations(prev => [data.data!, ...prev])
        return data.data
      } else {
        throw new Error(data.error || 'Failed to create conversation')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [clientId])

  // Update conversation
  const updateConversation = useCallback(async (conversationId: string, updates: Partial<Conversation>) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      const data: CreateConversationResponse = await response.json()

      if (data.success && data.data) {
        // Update local state
        setConversations(prev => 
          prev.map(conv => conv.id === conversationId ? data.data! : conv)
        )
        return data.data
      } else {
        throw new Error(data.error || 'Failed to update conversation')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update conversation'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove from local state
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete conversation')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  // Add message to conversation
  const addMessage = useCallback(async (conversationId: string, messageData: Partial<Message>) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      })

      const data = await response.json()

      if (data.success && data.data) {
        // Update conversation in local state with new message
        setConversations(prev => 
          prev.map(conv => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: [...(conv.messages || []), data.data],
                updatedAt: new Date().toISOString()
              }
            }
            return conv
          })
        )
        return data.data
      } else {
        throw new Error(data.error || 'Failed to add message')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add message'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  // Load conversations on mount and when clientId changes
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Refresh conversations manually
  const refreshConversations = useCallback(() => {
    return fetchConversations()
  }, [fetchConversations])

  return {
    conversations,
    loading,
    error,
    addConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    refreshConversations
  }
}