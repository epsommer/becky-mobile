// Event Synchronization API Endpoint
import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/prisma'
import type { UnifiedEvent } from '@/components/EventCreationModal'
import type { EventType, Priority, GoalTimeframe } from '@prisma/client'

// Helper function to convert UnifiedEvent to Prisma Event format
function convertToPrismaEvent(event: UnifiedEvent): any {
  return {
    id: event.id,
    type: event.type.toUpperCase() as EventType,
    title: event.title,
    description: event.description,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    duration: event.duration,
    priority: event.priority.toUpperCase() as Priority,
    clientId: event.clientId,
    clientName: event.clientName,
    location: event.location,
    notes: event.notes,
    isAllDay: event.isAllDay || false,
    isMultiDay: event.isMultiDay || false,
    notifications: event.notifications ? JSON.stringify(event.notifications) : null,
    recurrence: event.recurrence ? JSON.stringify(event.recurrence) : null,
    isRecurring: event.isRecurring || false,
    parentEventId: event.parentEventId,
    status: event.status,
    service: event.service,
    scheduledDate: event.scheduledDate,
    goalTimeframe: event.goalTimeframe ? event.goalTimeframe.toUpperCase() as GoalTimeframe : null,
    progressTarget: event.progressTarget,
    currentProgress: event.currentProgress,
    deadline: event.deadline,
    dependencies: event.dependencies ? JSON.stringify(event.dependencies) : null,
  }
}

// Helper function to convert Prisma Event to UnifiedEvent format
function convertFromPrismaEvent(prismaEvent: any): UnifiedEvent {
  return {
    id: prismaEvent.id,
    type: prismaEvent.type.toLowerCase(),
    title: prismaEvent.title,
    description: prismaEvent.description,
    startDateTime: prismaEvent.startDateTime,
    endDateTime: prismaEvent.endDateTime,
    duration: prismaEvent.duration,
    priority: prismaEvent.priority.toLowerCase(),
    clientId: prismaEvent.clientId,
    clientName: prismaEvent.clientName,
    location: prismaEvent.location,
    notes: prismaEvent.notes,
    isAllDay: prismaEvent.isAllDay,
    isMultiDay: prismaEvent.isMultiDay,
    notifications: prismaEvent.notifications ? JSON.parse(prismaEvent.notifications) : undefined,
    recurrence: prismaEvent.recurrence ? JSON.parse(prismaEvent.recurrence) : undefined,
    isRecurring: prismaEvent.isRecurring,
    parentEventId: prismaEvent.parentEventId,
    status: prismaEvent.status,
    service: prismaEvent.service,
    scheduledDate: prismaEvent.scheduledDate,
    goalTimeframe: prismaEvent.goalTimeframe?.toLowerCase(),
    progressTarget: prismaEvent.progressTarget,
    currentProgress: prismaEvent.currentProgress,
    deadline: prismaEvent.deadline,
    dependencies: prismaEvent.dependencies ? JSON.parse(prismaEvent.dependencies) : undefined,
    createdAt: prismaEvent.createdAt.toISOString(),
    updatedAt: prismaEvent.updatedAt.toISOString(),
  }
}

interface SyncResult {
  success: boolean
  localStorageEvents: number
  databaseEvents: number
  migrated: number
  conflicts: number
  errors: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { action, localStorageEvents } = await request.json()

    if (!localStorageEvents && action !== 'sync-from-database') {
      return NextResponse.json(
        { success: false, error: 'localStorageEvents data is required for migration operations' },
        { status: 400 }
      )
    }

    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      )
    }

    switch (action) {
      case 'migrate-to-database':
        console.log('🔄 Starting localStorage to database migration...')
        const migrateResult = await migrateToDatabase(localStorageEvents, prisma)

        return NextResponse.json({
          success: true,
          action: 'migrate-to-database',
          result: migrateResult,
          message: `Migration completed: ${migrateResult.migrated} events migrated, ${migrateResult.conflicts} conflicts, ${migrateResult.errors.length} errors`
        })

      case 'sync-from-database':
        console.log('🔄 Starting database to localStorage sync...')
        const syncResult = await syncFromDatabase(prisma)

        return NextResponse.json({
          success: true,
          action: 'sync-from-database',
          result: syncResult,
          message: `Sync completed: ${syncResult.migrated} events synced, ${syncResult.conflicts} conflicts, ${syncResult.errors.length} errors`
        })

      case 'bidirectional-sync':
        console.log('🔄 Starting bidirectional sync...')
        const toDatabase = await migrateToDatabase(localStorageEvents, prisma)
        const fromDatabase = await syncFromDatabase(prisma)

        return NextResponse.json({
          success: true,
          action: 'bidirectional-sync',
          result: { toDatabase, fromDatabase },
          message: `Bidirectional sync completed: ${toDatabase.migrated + fromDatabase.migrated} total events synchronized`
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Supported actions: migrate-to-database, sync-from-database, bidirectional-sync' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('❌ Sync operation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync operation failed'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const localStorageEventsParam = searchParams.get('localStorageEvents')
    let localStorageEvents: UnifiedEvent[] = []

    if (localStorageEventsParam) {
      try {
        localStorageEvents = JSON.parse(decodeURIComponent(localStorageEventsParam))
      } catch (parseError) {
        console.error('Error parsing localStorage events:', parseError)
        // Continue with empty array if parsing fails
      }
    }

    console.log('📊 Checking sync status...')
    const prisma = getPrismaClient()

    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const status = await checkSyncStatus(localStorageEvents, prisma)

    return NextResponse.json({
      success: true,
      status,
      recommendations: generateRecommendations(status),
      note: localStorageEvents.length === 0 ? 'No localStorage events provided. Status shows database-only information.' : undefined
    })
  } catch (error) {
    console.error('❌ Sync status check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check sync status'
      },
      { status: 500 }
    )
  }
}

// Server-side sync functions
async function migrateToDatabase(localEvents: UnifiedEvent[], prisma: any): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    localStorageEvents: localEvents.length,
    databaseEvents: 0,
    migrated: 0,
    conflicts: 0,
    errors: []
  }

  try {
    if (localEvents.length === 0) {
      result.success = true
      return result
    }

    // Get existing database events to check for conflicts
    const existingDbEvents = await prisma.event.findMany()
    result.databaseEvents = existingDbEvents.length
    const existingIds = new Set(existingDbEvents.map((e: any) => e.id))

    // Migrate each localStorage event
    for (const event of localEvents) {
      try {
        if (existingIds.has(event.id)) {
          result.conflicts++
          console.log(`⚠️ Conflict: Event ${event.id} already exists in database`)
          continue
        }

        const prismaEventData = convertToPrismaEvent(event)
        await prisma.event.create({ data: prismaEventData })
        result.migrated++
        console.log(`✅ Migrated event: ${event.title}`)
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

async function syncFromDatabase(prisma: any): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    localStorageEvents: 0,
    databaseEvents: 0,
    migrated: 0,
    conflicts: 0,
    errors: []
  }

  try {
    // Get database events
    const dbEvents = await prisma.event.findMany()
    result.databaseEvents = dbEvents.length

    const convertedEvents = dbEvents.map(convertFromPrismaEvent)
    result.migrated = convertedEvents.length
    result.success = true

    return result
  } catch (error) {
    result.errors.push(`Sync from database failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return result
  }
}

async function checkSyncStatus(localEvents: UnifiedEvent[], prisma: any): Promise<{
  localStorageCount: number
  databaseCount: number
  commonEvents: number
  localOnlyEvents: number
  databaseOnlyEvents: number
  lastChecked: string
}> {
  try {
    const localIds = new Set(localEvents.map(e => e.id))

    // Get database events
    const dbEvents = await prisma.event.findMany()
    const dbIds = new Set(dbEvents.map((e: any) => e.id))

    // Calculate overlap
    const commonEvents = localEvents.filter(e => dbIds.has(e.id)).length
    const localOnlyEvents = localEvents.filter(e => !dbIds.has(e.id)).length
    const databaseOnlyEvents = dbEvents.filter((e: any) => !localIds.has(e.id)).length

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

function generateRecommendations(status: any): string[] {
  const recommendations: string[] = []

  if (status.localOnlyEvents > 0) {
    recommendations.push(`${status.localOnlyEvents} events exist only in localStorage - consider migrating to database`)
  }

  if (status.databaseOnlyEvents > 0) {
    recommendations.push(`${status.databaseOnlyEvents} events exist only in database - consider syncing to localStorage`)
  }

  if (status.localStorageCount === 0 && status.databaseCount > 0) {
    recommendations.push('No localStorage events found - sync from database recommended')
  }

  if (status.databaseCount === 0 && status.localStorageCount > 0) {
    recommendations.push('No database events found - migration to database recommended')
  }

  if (status.commonEvents === status.localStorageCount && status.commonEvents === status.databaseCount) {
    recommendations.push('✅ LocalStorage and database are fully synchronized')
  }

  return recommendations
}