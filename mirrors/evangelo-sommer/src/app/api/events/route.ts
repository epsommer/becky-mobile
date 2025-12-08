// Integrated Event Creation API with Database Persistence and Participant Notifications
import { NextRequest, NextResponse } from 'next/server'
import { participantManagementService } from '@/lib/participant-management'
import { UnifiedEventsManager } from '@/lib/unified-events'
import { ParticipantRole, ServiceType } from '@/types/participant-management'
import { getPrismaClient } from '@/lib/prisma'
import type { UnifiedEvent } from '@/components/EventCreationModal'
import type { EventType, Priority, GoalTimeframe } from '@prisma/client'

// Default organizer configuration - you should customize this
const DEFAULT_ORGANIZER = {
  name: 'Evangelo Sommer',
  email: 'epsommer@gmail.com',
  role: ParticipantRole.SERVICE_PROVIDER
}

// Helper function to convert Prisma Event to UnifiedEvent format
function convertToUnifiedEvent(dbEvent: any): UnifiedEvent {
  return {
    id: dbEvent.id,
    type: dbEvent.type.toLowerCase(),
    title: dbEvent.title,
    description: dbEvent.description || '',
    startDateTime: dbEvent.startDateTime,
    endDateTime: dbEvent.endDateTime,
    duration: dbEvent.duration || 60,
    priority: dbEvent.priority || 'medium',
    clientId: dbEvent.clientId,
    clientName: dbEvent.clientName,
    location: dbEvent.location,
    notes: dbEvent.notes,
    isAllDay: dbEvent.isAllDay || false,
    isMultiDay: dbEvent.isMultiDay || false,
    isRecurring: dbEvent.isRecurring || false,
    parentEventId: dbEvent.parentEventId,
    status: dbEvent.status || 'scheduled',
    service: dbEvent.service || dbEvent.title,
    scheduledDate: dbEvent.scheduledDate || dbEvent.startDateTime,
    progressTarget: dbEvent.progressTarget,
    currentProgress: dbEvent.currentProgress,
    deadline: dbEvent.deadline,
    createdAt: dbEvent.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: dbEvent.updatedAt?.toISOString() || new Date().toISOString(),
    notifications: dbEvent.notifications ? JSON.parse(JSON.stringify(dbEvent.notifications)) : undefined
  } as UnifiedEvent
}

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

export async function POST(request: NextRequest) {
  try {
    const eventData: UnifiedEvent & { participants?: string[] } = await request.json()

    console.log('🎯 Creating integrated event:', eventData.title)

    // 1. Create event in local storage (existing unified events system)
    const newEvent = UnifiedEventsManager.createEvent(eventData)
    console.log('✅ Local event created:', newEvent.id)

    // 2. Persist to database if available
    const prisma = getPrismaClient()
    let dbEvent = null
    if (prisma) {
      try {
        const prismaEventData = convertToPrismaEvent(newEvent)
        dbEvent = await prisma.event.create({
          data: prismaEventData
        })
        console.log('✅ Database event created:', dbEvent.id)
      } catch (dbError) {
        console.error('⚠️ Database persistence failed:', dbError)
        // Continue with localStorage-only operation
      }
    }
    
    // 3. If participants exist, create appointment with notifications
    if (eventData.participants && eventData.participants.length > 0) {
      console.log('👥 Processing participants:', eventData.participants)
      
      try {
        // Ensure organizer exists in participant system
        let organizer = await participantManagementService.findParticipantByContact(
          undefined, 
          DEFAULT_ORGANIZER.email
        )
        
        if (!organizer) {
          console.log('🔧 Creating organizer participant')
          organizer = await participantManagementService.createParticipant({
            name: DEFAULT_ORGANIZER.name,
            email: DEFAULT_ORGANIZER.email,
            role: DEFAULT_ORGANIZER.role,
            services: ['consultation', 'maintenance', 'lawn_care'] as ServiceType[],
            contactPreferences: {
              sms: false,
              email: true,
              voiceCall: false,
              preferredMethod: 'email'
            }
          })
        }
        
        // Find or create participant records
        const participantIds: string[] = [organizer.id] // Include organizer
        const participantEmails: string[] = []
        
        for (const email of eventData.participants) {
          if (!email.trim()) continue
          
          participantEmails.push(email.trim())
          let participant = await participantManagementService.findParticipantByContact(
            undefined, 
            email.trim()
          )
          
          if (!participant) {
            console.log('➕ Creating new participant:', email)
            const name = email.split('@')[0].replace(/[._-]/g, ' ')
            participant = await participantManagementService.createParticipant({
              name: name,
              email: email.trim(),
              role: ParticipantRole.CLIENT,
              services: [],
              contactPreferences: {
                sms: false,
                email: true,
                voiceCall: false,
                preferredMethod: 'email'
              }
            })
          }
          
          participantIds.push(participant.id)
        }
        
        // Determine service type based on event details
        const serviceType: ServiceType = eventData.service as ServiceType || 'consultation'
        
        // Create appointment with automatic notifications
        console.log('📅 Creating appointment with participants:', participantIds.length)
        const appointment = await participantManagementService.createAppointment({
          title: eventData.title,
          description: eventData.description || `Scheduled appointment: ${eventData.title}`,
          startTime: eventData.startDateTime,
          endTime: eventData.endDateTime || eventData.startDateTime,
          timezone: 'America/New_York', // Default timezone
          service: serviceType,
          location: eventData.location,
          organizerId: organizer.id,
          participantIds: participantIds,
          voiceCommandData: {
            originalTranscript: `Event created via web interface`,
            confidence: 1.0,
            processingNotes: ['Web interface creation', 'Automated participant notification']
          }
        })
        
        console.log('✅ Appointment created:', appointment.id)
        
        // Send confirmation notifications to participants
        try {
          await participantManagementService.sendAppointmentNotifications(
            appointment.id, 
            'CONFIRMATION' as any
          )
          console.log('📧 Confirmation notifications sent for appointment:', appointment.id)
        } catch (notificationError) {
          console.error('⚠️ Failed to send notifications:', notificationError)
        }
        
        // Update the local event with appointment reference
        // Note: metadata property doesn't exist in UnifiedEvent type
        const updatedEvent = UnifiedEventsManager.updateEvent(newEvent.id, {
          ...newEvent
        })
        
        return NextResponse.json({
          success: true,
          event: updatedEvent || newEvent,
          appointment: {
            id: appointment.id,
            participantCount: appointment.participants.length,
            notificationsSent: true
          },
          database: {
            persisted: dbEvent !== null,
            eventId: dbEvent?.id
          },
          message: `Event created with ${participantEmails.length} participant notifications sent${dbEvent ? ' and persisted to database' : ''}`
        })
        
      } catch (participantError) {
        console.error('⚠️ Participant system error:', participantError)
        
        // Event created locally but participant notifications failed
        // Return success but with warning
        return NextResponse.json({
          success: true,
          event: newEvent,
          warning: 'Event created but participant notifications failed',
          error: participantError instanceof Error ? participantError.message : 'Participant system error',
          participantSystemAvailable: false,
          database: {
            persisted: dbEvent !== null,
            eventId: dbEvent?.id
          }
        })
      }
    } else {
      console.log('📝 Event created without participants')
      
      // No participants - just return the event
      return NextResponse.json({
        success: true,
        event: newEvent,
        database: {
          persisted: dbEvent !== null,
          eventId: dbEvent?.id
        },
        message: `Event created successfully${dbEvent ? ' and persisted to database' : ''}`
      })
    }
    
  } catch (error) {
    console.error('❌ Event creation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event',
        details: 'Check server logs for more information'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeAppointments = searchParams.get('includeAppointments') === 'true'
    const source = searchParams.get('source') || 'both' // 'localStorage', 'database', or 'both'

    let events: UnifiedEvent[] = []

    // Get events from localStorage
    if (source === 'localStorage' || source === 'both') {
      events = UnifiedEventsManager.getAllEvents()
    }

    // Get events from database and merge if available
    if (source === 'database' || source === 'both') {
      const prisma = getPrismaClient()
      if (prisma) {
        try {
          const dbEvents = await prisma.event.findMany({
            orderBy: { startDateTime: 'asc' }
          })
          const convertedDbEvents = dbEvents.map(convertFromPrismaEvent)

          if (source === 'database') {
            events = convertedDbEvents
          } else {
            // Merge database events with localStorage events, avoiding duplicates
            const localStorageIds = new Set(events.map(e => e.id))
            const uniqueDbEvents = convertedDbEvents.filter(e => !localStorageIds.has(e.id))
            events = [...events, ...uniqueDbEvents]
          }
        } catch (dbError) {
          console.error('⚠️ Database fetch failed:', dbError)
          // Continue with localStorage events only
        }
      }
    }

    if (!includeAppointments) {
      return NextResponse.json({
        success: true,
        events,
        source: source,
        count: events.length
      })
    }
    
    // Note: Appointment enrichment disabled as UnifiedEvent doesn't have metadata property
    // If needed in the future, add metadata property to UnifiedEvent interface
    const enrichedEvents = events
    
    return NextResponse.json({
      success: true,
      events: enrichedEvents,
      source: source,
      count: enrichedEvents.length
    })
    
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      )
    }

    const eventData: Partial<UnifiedEvent> = await request.json()
    console.log('🔄 API PUT - Updating event:', eventId)
    console.log('🔄 API PUT - Update data:', eventData)

    // Debug: Check what events are in localStorage
    const allEvents = UnifiedEventsManager.getAllEvents()
    console.log('🔄 API PUT - All events in localStorage:', allEvents.length)
    console.log('🔄 API PUT - Event IDs in localStorage:', allEvents.map(e => e.id))
    console.log('🔄 API PUT - Looking for event ID:', eventId)

    console.log('🔄 API PUT - Starting event update process...')

    // First, try to update in localStorage
    let updatedEvent = null
    try {
      updatedEvent = UnifiedEventsManager.updateEvent(eventId, eventData)
      console.log('🔄 API PUT - localStorage update result:', updatedEvent ? 'SUCCESS' : 'NOT_FOUND')
    } catch (localStorageError) {
      console.log('🔄 API PUT - localStorage not available (server-side), continuing with database-only approach')
    }

    // Check if event exists in database and update there
    const prisma = getPrismaClient()
    let dbEvent = null
    if (prisma) {
      try {
        // Check if event exists in database
        const existingDbEvent = await prisma.event.findUnique({ where: { id: eventId } })
        if (existingDbEvent) {
          console.log('🔄 API PUT - Found event in database, updating directly...')

          // Convert update data to Prisma format
          const prismaUpdateData = {
            startDateTime: eventData.startDateTime,
            endDateTime: eventData.endDateTime,
            notes: eventData.notes,
            updatedAt: new Date()
          }

          // Update in database
          dbEvent = await prisma.event.update({
            where: { id: eventId },
            data: prismaUpdateData
          })

          console.log('🔄 API PUT - Database update successful:', dbEvent.id)

          // Convert back to UnifiedEvent format for response
          if (!updatedEvent) {
            updatedEvent = convertToUnifiedEvent(dbEvent)
            console.log('🔄 API PUT - Created response from database event')
          }
        } else {
          console.log('🔄 API PUT - Event not found in database')
        }
      } catch (dbError) {
        console.error('🔄 API PUT - Database update failed:', dbError)
      }
    }

    if (!updatedEvent) {
      console.error('❌ API PUT - Event not found in localStorage or database')
      console.log('🔄 API PUT - Available events in localStorage:', allEvents.map(e => ({ id: e.id, title: e.title })))
      return NextResponse.json(
        { success: false, error: 'Event not found in localStorage or database' },
        { status: 404 }
      )
    }

    console.log('🔄 API PUT - Event update completed successfully')

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      database: {
        persisted: dbEvent !== null,
        eventId: dbEvent?.id
      },
      message: `Event updated successfully${dbEvent ? ' and persisted to database' : ''}`
    })

  } catch (error) {
    console.error('❌ Event update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update event'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      )
    }

    console.log('🗑️ Deleting event:', eventId)

    // Delete from localStorage (attempt even if not found)
    const localStorageDeleted = UnifiedEventsManager.deleteEvent(eventId)
    console.log(`🔄 LocalStorage deletion result: ${localStorageDeleted}`)

    // Delete from database if available
    const prisma = getPrismaClient()
    let dbDeleted = false
    if (prisma) {
      try {
        await prisma.event.delete({
          where: { id: eventId }
        })
        dbDeleted = true
        console.log('✅ Database event deleted:', eventId)
      } catch (dbError) {
        console.error('⚠️ Database deletion failed:', dbError)
        // Continue - maybe event only existed in localStorage
      }
    }

    // Consider success if deleted from either source
    if (!localStorageDeleted && !dbDeleted) {
      return NextResponse.json(
        { success: false, error: 'Event not found in either localStorage or database' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      localStorage: {
        deleted: localStorageDeleted
      },
      database: {
        deleted: dbDeleted
      },
      message: `Event deleted successfully${
        localStorageDeleted && dbDeleted ? ' from both localStorage and database' :
        localStorageDeleted ? ' from localStorage only' :
        dbDeleted ? ' from database only' : ''
      }`
    })

  } catch (error) {
    console.error('❌ Event deletion error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete event'
      },
      { status: 500 }
    )
  }
}