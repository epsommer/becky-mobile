// Client-side Event Sync Service
// This replaces the server-side EventSyncManager for frontend use

import { UnifiedEventsManager } from './unified-events'
import type { UnifiedEvent } from '@/components/EventCreationModal'

export interface SyncResult {
  success: boolean
  localStorageEvents: number
  databaseEvents: number
  migrated: number
  conflicts: number
  errors: string[]
}

export interface SyncStatus {
  localStorageCount: number
  databaseCount: number
  commonEvents: number
  localOnlyEvents: number
  databaseOnlyEvents: number
  lastChecked: string
}

export class EventSyncClient {
  /**
   * Migrate localStorage events to database
   */
  static async migrateToDatabase(): Promise<SyncResult> {
    try {
      const localEvents = UnifiedEventsManager.getAllEvents()

      const response = await fetch('/api/events/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrate-to-database',
          localStorageEvents: localEvents
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Migration failed')
      }

      return result.result
    } catch (error) {
      console.error('Migration to database failed:', error)
      throw error
    }
  }

  /**
   * Sync database events to localStorage
   */
  static async syncFromDatabase(): Promise<SyncResult & { events: UnifiedEvent[] }> {
    try {
      const response = await fetch('/api/events/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync-from-database'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Sync from database failed')
      }

      // If successful, get the database events and add them to localStorage
      const eventsResponse = await fetch('/api/events?source=database')
      let events: UnifiedEvent[] = []

      if (eventsResponse.ok) {
        const eventsResult = await eventsResponse.json()
        if (eventsResult.success) {
          events = eventsResult.events

          // Add new events to localStorage (avoiding duplicates)
          const existingIds = new Set(UnifiedEventsManager.getAllEvents().map(e => e.id))
          const newEvents = events.filter(e => !existingIds.has(e.id))

          newEvents.forEach(event => {
            try {
              const { id, createdAt, updatedAt, ...eventData } = event
              UnifiedEventsManager.createEvent(eventData as any)
            } catch (error) {
              console.error('Error adding event to localStorage:', error)
            }
          })
        }
      }

      return {
        ...result.result,
        events
      }
    } catch (error) {
      console.error('Sync from database failed:', error)
      throw error
    }
  }

  /**
   * Perform bidirectional sync
   */
  static async bidirectionalSync(): Promise<{
    toDatabase: SyncResult
    fromDatabase: SyncResult & { events: UnifiedEvent[] }
  }> {
    try {
      const localEvents = UnifiedEventsManager.getAllEvents()

      const response = await fetch('/api/events/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bidirectional-sync',
          localStorageEvents: localEvents
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Bidirectional sync failed')
      }

      // Sync database events to localStorage after migration
      const fromDbResult = await this.syncFromDatabase()

      return {
        toDatabase: result.result.toDatabase,
        fromDatabase: fromDbResult
      }
    } catch (error) {
      console.error('Bidirectional sync failed:', error)
      throw error
    }
  }

  /**
   * Check sync status between localStorage and database
   */
  static async checkSyncStatus(): Promise<SyncStatus & { recommendations: string[] }> {
    try {
      const localEvents = UnifiedEventsManager.getAllEvents()
      const encodedEvents = encodeURIComponent(JSON.stringify(localEvents))

      const response = await fetch(`/api/events/sync?localStorageEvents=${encodedEvents}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Sync status check failed')
      }

      return {
        ...result.status,
        recommendations: result.recommendations || []
      }
    } catch (error) {
      console.error('Sync status check failed:', error)
      throw error
    }
  }

  /**
   * Auto-sync events (smart sync based on status)
   */
  static async autoSync(): Promise<{
    action: string
    result: any
    recommendations: string[]
  }> {
    try {
      const status = await this.checkSyncStatus()

      // Determine the best sync strategy
      if (status.databaseCount === 0 && status.localStorageCount > 0) {
        // Migrate to database
        console.log('📤 Auto-sync: Migrating localStorage events to database...')
        const result = await this.migrateToDatabase()
        return {
          action: 'migrate-to-database',
          result,
          recommendations: ['Successfully migrated localStorage events to database']
        }
      } else if (status.localStorageCount === 0 && status.databaseCount > 0) {
        // Sync from database
        console.log('📥 Auto-sync: Syncing database events to localStorage...')
        const result = await this.syncFromDatabase()
        return {
          action: 'sync-from-database',
          result,
          recommendations: ['Successfully synced database events to localStorage']
        }
      } else if (status.localOnlyEvents > 0 || status.databaseOnlyEvents > 0) {
        // Bidirectional sync needed
        console.log('🔄 Auto-sync: Performing bidirectional sync...')
        const result = await this.bidirectionalSync()
        return {
          action: 'bidirectional-sync',
          result,
          recommendations: ['Successfully performed bidirectional sync']
        }
      } else {
        // Already synchronized
        return {
          action: 'none',
          result: status,
          recommendations: ['Events are already synchronized']
        }
      }
    } catch (error) {
      console.error('Auto-sync failed:', error)
      throw error
    }
  }
}

export default EventSyncClient