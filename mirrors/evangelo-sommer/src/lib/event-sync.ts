// Event Synchronization Utility for localStorage to Database Migration
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

export class EventSyncManager {
  /**
   * Migrate all localStorage events to database
   */
  static async migrateToDatabase(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      localStorageEvents: 0,
      databaseEvents: 0,
      migrated: 0,
      conflicts: 0,
      errors: []
    }

    try {
      // Get all events from localStorage
      const localEvents = UnifiedEventsManager.getAllEvents()
      result.localStorageEvents = localEvents.length

      if (localEvents.length === 0) {
        result.success = true
        return result
      }

      // Get existing database events to check for conflicts
      const dbResponse = await fetch('/api/events?source=database')
      let existingDbEvents: UnifiedEvent[] = []

      if (dbResponse.ok) {
        const dbResult = await dbResponse.json()
        if (dbResult.success) {
          existingDbEvents = dbResult.events
          result.databaseEvents = existingDbEvents.length
        }
      }

      // Create a set of existing database event IDs
      const existingIds = new Set(existingDbEvents.map(e => e.id))

      // Migrate each localStorage event
      for (const event of localEvents) {
        try {
          if (existingIds.has(event.id)) {
            result.conflicts++
            console.log(`⚠️ Conflict: Event ${event.id} already exists in database`)
            continue
          }

          // Create event in database
          const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
          })

          if (response.ok) {
            const createResult = await response.json()
            if (createResult.success) {
              result.migrated++
              console.log(`✅ Migrated event: ${event.title}`)
            } else {
              result.errors.push(`Failed to migrate ${event.title}: ${createResult.error}`)
            }
          } else {
            result.errors.push(`HTTP error ${response.status} for event ${event.title}`)
          }
        } catch (error) {
          result.errors.push(`Exception migrating ${event.title}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      result.success = result.errors.length === 0 || result.migrated > 0
      return result

    } catch (error) {
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Sync database events back to localStorage (useful for offline mode)
   */
  static async syncFromDatabase(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      localStorageEvents: 0,
      databaseEvents: 0,
      migrated: 0,
      conflicts: 0,
      errors: []
    }

    try {
      // Get existing localStorage events
      const localEvents = UnifiedEventsManager.getAllEvents()
      result.localStorageEvents = localEvents.length
      const localIds = new Set(localEvents.map(e => e.id))

      // Get database events
      const response = await fetch('/api/events?source=database')
      if (!response.ok) {
        result.errors.push(`Failed to fetch database events: HTTP ${response.status}`)
        return result
      }

      const dbResult = await response.json()
      if (!dbResult.success) {
        result.errors.push(`Database query failed: ${dbResult.error}`)
        return result
      }

      const dbEvents: UnifiedEvent[] = dbResult.events
      result.databaseEvents = dbEvents.length

      // Add database events that don't exist in localStorage
      for (const event of dbEvents) {
        if (!localIds.has(event.id)) {
          try {
            UnifiedEventsManager.createEvent(event)
            result.migrated++
            console.log(`✅ Synced from database: ${event.title}`)
          } catch (error) {
            result.errors.push(`Failed to sync ${event.title} to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        } else {
          result.conflicts++
        }
      }

      result.success = true
      return result

    } catch (error) {
      result.errors.push(`Sync from database failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Perform bidirectional sync (localStorage <-> Database)
   */
  static async bidirectionalSync(): Promise<{
    toDatabase: SyncResult,
    fromDatabase: SyncResult
  }> {
    console.log('🔄 Starting bidirectional sync...')

    const toDatabase = await this.migrateToDatabase()
    console.log('📤 LocalStorage -> Database sync completed')

    const fromDatabase = await this.syncFromDatabase()
    console.log('📥 Database -> LocalStorage sync completed')

    return { toDatabase, fromDatabase }
  }

  /**
   * Check sync status between localStorage and database
   */
  static async checkSyncStatus(): Promise<{
    localStorageCount: number
    databaseCount: number
    commonEvents: number
    localOnlyEvents: number
    databaseOnlyEvents: number
    lastChecked: string
  }> {
    try {
      // Get localStorage events
      const localEvents = UnifiedEventsManager.getAllEvents()
      const localIds = new Set(localEvents.map(e => e.id))

      // Get database events
      const response = await fetch('/api/events?source=database')
      let dbEvents: UnifiedEvent[] = []

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          dbEvents = result.events
        }
      }

      const dbIds = new Set(dbEvents.map(e => e.id))

      // Calculate overlap
      const commonEvents = localEvents.filter(e => dbIds.has(e.id)).length
      const localOnlyEvents = localEvents.filter(e => !dbIds.has(e.id)).length
      const databaseOnlyEvents = dbEvents.filter(e => !localIds.has(e.id)).length

      return {
        localStorageCount: localEvents.length,
        databaseCount: dbEvents.length,
        commonEvents,
        localOnlyEvents,
        databaseOnlyEvents,
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      throw new Error(`Failed to check sync status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export default EventSyncManager