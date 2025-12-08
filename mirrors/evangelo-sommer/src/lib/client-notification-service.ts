// Client-side notification service that calls server-side APIs
import type { UnifiedEvent } from '@/components/EventCreationModal'

interface RescheduleNotificationData {
  originalEvent: UnifiedEvent
  newEvent: UnifiedEvent
  participants: string[]
  reason?: string
}

interface NotificationResult {
  success: boolean
  results?: {
    successful: number
    failed: number
    errors: string[]
    totalSent: number
  }
  error?: string
}

export class ClientNotificationService {
  /**
   * Send reschedule notifications via server-side API
   */
  static async sendRescheduleNotification(data: RescheduleNotificationData): Promise<NotificationResult> {
    try {
      const { originalEvent, newEvent, participants, reason } = data
      
      // Convert UnifiedEvent to Appointment format for the API
      const originalAppointment = {
        id: originalEvent.id,
        title: originalEvent.title,
        description: originalEvent.description || '',
        startTime: originalEvent.startDateTime,
        endTime: originalEvent.endDateTime || new Date(new Date(originalEvent.startDateTime).getTime() + originalEvent.duration * 60000).toISOString(),
        location: originalEvent.location,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const newAppointment = {
        ...originalAppointment,
        startTime: newEvent.startDateTime,
        endTime: newEvent.endDateTime || new Date(new Date(newEvent.startDateTime).getTime() + newEvent.duration * 60000).toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const response = await fetch('/api/notifications/reschedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalAppointment,
          newAppointment,
          participants,
          reason
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }
      
      return result
      
    } catch (error) {
      console.error('❌ Error sending reschedule notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notifications'
      }
    }
  }
  
  /**
   * Extract participant emails from an event
   */
  static extractParticipants(event: UnifiedEvent): string[] {
    const participants: string[] = []
    
    // Add participants from the participants array
    if ((event as any).participants && Array.isArray((event as any).participants)) {
      participants.push(...(event as any).participants)
    }
    
    // Add client email if it exists and isn't already included
    if (event.clientName && !participants.includes(event.clientName)) {
      // Try to find client email from localStorage
      try {
        const clients = JSON.parse(localStorage.getItem('clients') || '[]')
        const client = clients.find((c: any) => c.name === event.clientName)
        if (client && client.email && !participants.includes(client.email)) {
          participants.push(client.email)
        } else if (event.clientName.includes('@')) {
          // If client name looks like an email, use it directly
          participants.push(event.clientName)
        }
      } catch (error) {
        console.warn('Error loading clients for notification:', error)
      }
    }
    
    // Filter out invalid emails and duplicates
    return Array.from(new Set(participants.filter(email => 
      email && typeof email === 'string' && email.includes('@')
    )))
  }
}