export interface ClientMessage {
  id: string
  content: string
  timestamp: Date
  sender: 'client' | 'business'
  type: 'phone' | 'email' | 'sms' | 'in_person' | 'video_call'
  status: 'sent' | 'delivered' | 'read' | 'replied'
  attachments?: string[]
  metadata?: {
    phoneNumber?: string
    emailAddress?: string
    duration?: number // for calls in minutes
    location?: string // for in-person meetings
  }
}

export interface ClientConversation {
  id: string
  clientId: string
  subject: string
  status: 'active' | 'resolved' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  serviceType?: 'landscaping' | 'snow_removal' | 'pet_services' | 'creative_development'
  messages: ClientMessage[]
  createdAt: Date
  updatedAt: Date
  lastMessageAt: Date
  tags: string[]
  assignedTo?: string
}

export interface ConversationFormData {
  subject: string
  priority: ClientConversation['priority']
  serviceType?: ClientConversation['serviceType']
  initialMessage: {
    content: string
    type: ClientMessage['type']
    metadata?: ClientMessage['metadata']
  }
  tags: string[]
}

export interface MessageFormData {
  content: string
  type: ClientMessage['type']
  attachments?: string[]
  metadata?: ClientMessage['metadata']
}
