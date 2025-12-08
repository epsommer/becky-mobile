import { CalendarEvent, CalendarIntegration } from '@/types/scheduling'

export class CalendarService {
  private integrations: Map<string, CalendarIntegration> = new Map()
  private readonly STORAGE_KEY = 'calendar-integrations'

  constructor() {
    this.loadFromStorage()
  }

  // Load integrations from localStorage
  private loadFromStorage() {
    if (typeof window === 'undefined') return // SSR safety
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const integrations: CalendarIntegration[] = JSON.parse(stored)
        integrations.forEach(integration => {
          this.integrations.set(integration.id, integration)
        })
      }
    } catch (error) {
      console.error('Failed to load calendar integrations from storage:', error)
    }
  }

  // Save integrations to localStorage
  private saveToStorage() {
    if (typeof window === 'undefined') return // SSR safety
    
    try {
      const integrations = Array.from(this.integrations.values())
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(integrations))
    } catch (error) {
      console.error('Failed to save calendar integrations to storage:', error)
    }
  }

  // Add integration
  addIntegration(integration: CalendarIntegration) {
    this.integrations.set(integration.id, integration)
    this.saveToStorage()
  }

  // Remove integration
  removeIntegration(integrationId: string) {
    this.integrations.delete(integrationId)
    this.saveToStorage()
  }

  // Get integration
  getIntegration(integrationId: string): CalendarIntegration | undefined {
    return this.integrations.get(integrationId)
  }

  // Get all integrations
  getAllIntegrations(): CalendarIntegration[] {
    return Array.from(this.integrations.values())
  }

  // Clear all integrations (useful for debugging/resetting)
  clearAllIntegrations() {
    this.integrations.clear()
    this.saveToStorage()
  }

  // Initiate OAuth for a provider
  async initiateOAuth(provider: string, state?: string): Promise<{ authUrl: string }> {
    const response = await fetch(`/api/auth/${provider}?${new URLSearchParams({ 
      state: state || '' 
    })}`)
    
    if (!response.ok) {
      throw new Error(`Failed to initiate ${provider} OAuth`)
    }
    
    return response.json()
  }

  // Sync events from external calendar
  async syncEvents(integrationId: string): Promise<CalendarEvent[]> {
    const integration = this.getIntegration(integrationId)
    if (!integration) {
      throw new Error('Integration not found')
    }

    const response = await fetch(`/api/calendar/${integration.provider}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: integration.credentials?.accessToken,
        refreshToken: integration.credentials?.refreshToken,
        calendarId: integration.calendarId,
        databaseId: (integration.provider as string) === 'notion' && integration.calendarId ? integration.calendarId : undefined
      })
    })

    if (!response.ok) {
      const error = await response.json()
      if (error.requiresReauth) {
        throw new Error('REAUTH_REQUIRED')
      }
      throw new Error(`Sync failed: ${error.error}`)
    }

    const data = await response.json()
    return data.events
  }

  // Sync recurring events to external calendar
  async syncRecurringEvents(integrationId: string, events: CalendarEvent[]): Promise<{ successful: CalendarEvent[], failed: CalendarEvent[] }> {
    const successful: CalendarEvent[] = []
    const failed: CalendarEvent[] = []

    for (const event of events) {
      try {
        const syncedEvent = await this.createEvent(integrationId, event)
        successful.push(syncedEvent)
      } catch (error) {
        console.error(`Failed to sync event ${event.id}:`, error)
        failed.push(event)
      }
    }

    return { successful, failed }
  }

  // Create event in external calendar
  async createEvent(integrationId: string, event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent> {
    const integration = this.getIntegration(integrationId)
    if (!integration) {
      throw new Error('Integration not found')
    }

    const response = await fetch(`/api/calendar/${integration.provider}/create-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: integration.credentials?.accessToken,
        refreshToken: integration.credentials?.refreshToken,
        calendarId: integration.calendarId,
        databaseId: (integration.provider as string) === 'notion' ? integration.calendarId : undefined,
        event
      })
    })

    if (!response.ok) {
      const error = await response.json()
      if (error.requiresReauth) {
        throw new Error('REAUTH_REQUIRED')
      }
      throw new Error(`Create event failed: ${error.error}`)
    }

    const data = await response.json()
    return data.event
  }

  // Handle OAuth callback data
  handleOAuthCallback(provider: string, data: any): CalendarIntegration {
    const integration: CalendarIntegration = {
      id: `${provider}-${Date.now()}`,
      provider: provider as any,
      accountId: data.accountId,
      calendarId: data.calendarId,
      isActive: true,
      syncEnabled: true,
      syncSettings: {
        syncDirection: 'bidirectional',
        autoCreateEvents: true,
        defaultVisibility: 'private'
      },
      credentials: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.addIntegration(integration)
    return integration
  }

  // Get provider display info
  getProviderInfo(provider: string) {
    const providers = {
      google: {
        id: 'google',
        name: 'Google Calendar',
        icon: '📅',
        color: 'bg-tactical-gold',
        description: 'Sync with Google Calendar for seamless scheduling'
      },
      outlook: {
        id: 'outlook',
        name: 'Microsoft Outlook',
        icon: '📆',
        color: 'bg-tactical-brown',
        description: 'Connect with Outlook calendar and email'
      },
      notion: {
        id: 'notion',
        name: 'Notion Calendar',
        icon: '📝',
        color: 'bg-tactical-grey-800',
        description: 'Integrate with Notion databases as calendars'
      },
      apple: {
        id: 'apple',
        name: 'Apple Calendar',
        icon: '🍎',
        color: 'bg-tactical-grey-700',
        description: 'Integrate with Apple Calendar (iCloud)'
      },
      custom: {
        id: 'custom',
        name: 'Custom Webhook',
        icon: '🔗',
        color: 'bg-green-500',
        description: 'Custom integration via webhooks'
      }
    }

    return providers[provider as keyof typeof providers]
  }

  // Get all available providers
  getAvailableProviders() {
    return [
      this.getProviderInfo('google'),
      this.getProviderInfo('notion'),
      this.getProviderInfo('outlook'),
      this.getProviderInfo('apple'),
      this.getProviderInfo('custom')
    ]
  }
}

// Singleton instance
export const calendarService = new CalendarService()