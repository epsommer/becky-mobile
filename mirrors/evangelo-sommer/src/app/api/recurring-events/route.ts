import { NextRequest, NextResponse } from 'next/server'
import RecurringEventGenerator, { EventGenerationOptions } from '@/lib/recurring-event-generator'
import { RecurringEvent, ScheduleRule, CalendarEvent } from '@/types/scheduling'

// In-memory storage for demo purposes - in production, use a database
let recurringEvents: RecurringEvent[] = []
let scheduleRules: ScheduleRule[] = []
let generatedEvents: CalendarEvent[] = []

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const clientId = searchParams.get('clientId')

    switch (action) {
      case 'list':
        const filtered = clientId 
          ? recurringEvents.filter(re => re.clientId === clientId)
          : recurringEvents
        
        return NextResponse.json({
          success: true,
          recurringEvents: filtered,
          scheduleRules: scheduleRules.filter(sr => 
            filtered.some(re => re.scheduleRuleId === sr.id)
          )
        })

      case 'events':
        const recurringEventId = searchParams.get('recurringEventId')
        const eventsForRecurring = recurringEventId
          ? generatedEvents.filter(e => e.recurringEventId === recurringEventId)
          : generatedEvents

        return NextResponse.json({
          success: true,
          events: eventsForRecurring
        })

      default:
        return NextResponse.json({
          success: true,
          recurringEvents,
          scheduleRules,
          generatedEvents: generatedEvents.slice(0, 20) // Limit for overview
        })
    }
  } catch (error) {
    console.error('Error in recurring events GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()

    switch (action) {
      case 'create':
        return handleCreateRecurring(data)
      
      case 'generate':
        return handleGenerateEvents(data)
      
      case 'create-biweekly':
        return handleCreateBiweekly(data)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in recurring events POST:', error)
    return NextResponse.json(
      { error: 'Failed to process recurring events request' },
      { status: 500 }
    )
  }
}

async function handleCreateRecurring(data: {
  recurringEvent: Omit<RecurringEvent, 'id' | 'createdAt' | 'updatedAt'>
  scheduleRule: Omit<ScheduleRule, 'id' | 'createdAt' | 'updatedAt'>
  generateEvents?: boolean
  generationOptions?: EventGenerationOptions
}) {
  const now = new Date().toISOString()
  
  // Create schedule rule
  const scheduleRule: ScheduleRule = {
    ...data.scheduleRule,
    id: `schedule_${Date.now()}`,
    createdAt: now,
    updatedAt: now
  }
  
  // Create recurring event
  const recurringEvent: RecurringEvent = {
    ...data.recurringEvent,
    id: `recurring_${Date.now()}`,
    scheduleRuleId: scheduleRule.id,
    createdAt: now,
    updatedAt: now
  }

  scheduleRules.push(scheduleRule)
  recurringEvents.push(recurringEvent)

  // Generate initial events if requested
  let generatedBatch = null
  if (data.generateEvents) {
    const batch = RecurringEventGenerator.generateEventsFromRecurring(
      recurringEvent,
      scheduleRule,
      data.generationOptions
    )
    
    generatedEvents.push(...batch.events)
    generatedBatch = batch

    // Update recurring event with progress
    const updatedRecurring = RecurringEventGenerator.updateRecurringEventProgress(
      recurringEvent,
      batch
    )
    
    const index = recurringEvents.findIndex(re => re.id === recurringEvent.id)
    if (index !== -1) {
      recurringEvents[index] = updatedRecurring
    }
  }

  return NextResponse.json({
    success: true,
    recurringEvent,
    scheduleRule,
    generatedBatch,
    summary: RecurringEventGenerator.getGenerationSummary(
      recurringEvent,
      scheduleRule,
      data.generationOptions
    )
  })
}

async function handleGenerateEvents(data: {
  recurringEventId?: string
  generationOptions?: EventGenerationOptions
}) {
  if (data.recurringEventId) {
    // Generate for specific recurring event
    const recurringEvent = recurringEvents.find(re => re.id === data.recurringEventId)
    const scheduleRule = recurringEvent ? scheduleRules.find(sr => sr.id === recurringEvent.scheduleRuleId) : null
    
    if (!recurringEvent || !scheduleRule) {
      return NextResponse.json(
        { error: 'Recurring event or schedule rule not found' },
        { status: 404 }
      )
    }

    const batch = RecurringEventGenerator.generateEventsFromRecurring(
      recurringEvent,
      scheduleRule,
      data.generationOptions
    )
    
    generatedEvents.push(...batch.events)

    // Update recurring event
    const updatedRecurring = RecurringEventGenerator.updateRecurringEventProgress(
      recurringEvent,
      batch
    )
    
    const index = recurringEvents.findIndex(re => re.id === recurringEvent.id)
    if (index !== -1) {
      recurringEvents[index] = updatedRecurring
    }

    return NextResponse.json({
      success: true,
      batch,
      updatedRecurringEvent: updatedRecurring
    })
  } else {
    // Generate for all active recurring events
    const activeRecurringEvents = recurringEvents
      .filter(re => re.isActive)
      .map(re => ({
        recurringEvent: re,
        scheduleRule: scheduleRules.find(sr => sr.id === re.scheduleRuleId)!
      }))
      .filter(({ scheduleRule }) => scheduleRule) // Filter out any without rules

    const result = RecurringEventGenerator.generateEventsForMultipleRecurring(
      activeRecurringEvents,
      data.generationOptions
    )

    // Update stored events and recurring events
    generatedEvents.push(...result.allEvents)
    result.updatedRecurringEvents.forEach(updated => {
      const index = recurringEvents.findIndex(re => re.id === updated.id)
      if (index !== -1) {
        recurringEvents[index] = updated
      }
    })

    return NextResponse.json({
      success: true,
      totalEventsGenerated: result.allEvents.length,
      batches: result.batches,
      updatedRecurringEvents: result.updatedRecurringEvents
    })
  }
}

async function handleCreateBiweekly(data: {
  title: string
  clientId: string
  daysOfWeek?: number[]
  startDate?: string
  endAfterOccurrences?: number
  generateEvents?: boolean
  generationOptions?: EventGenerationOptions
}) {
  const { recurringEvent, scheduleRule } = RecurringEventGenerator.createBiWeeklyRecurringEvent(
    data.title,
    data.clientId,
    data.daysOfWeek,
    data.startDate,
    data.endAfterOccurrences
  )

  scheduleRules.push(scheduleRule)
  recurringEvents.push(recurringEvent)

  // Generate initial events if requested
  let generatedBatch = null
  if (data.generateEvents) {
    const batch = RecurringEventGenerator.generateEventsFromRecurring(
      recurringEvent,
      scheduleRule,
      data.generationOptions
    )
    
    generatedEvents.push(...batch.events)
    generatedBatch = batch

    // Update recurring event
    const updatedRecurring = RecurringEventGenerator.updateRecurringEventProgress(
      recurringEvent,
      batch
    )
    
    const index = recurringEvents.findIndex(re => re.id === recurringEvent.id)
    if (index !== -1) {
      recurringEvents[index] = updatedRecurring
    }
  }

  return NextResponse.json({
    success: true,
    recurringEvent,
    scheduleRule,
    generatedBatch,
    summary: RecurringEventGenerator.getGenerationSummary(
      recurringEvent,
      scheduleRule,
      data.generationOptions
    )
  })
}

export async function PUT(request: NextRequest) {
  try {
    const { id, updates } = await request.json()
    
    const index = recurringEvents.findIndex(re => re.id === id)
    if (index === -1) {
      return NextResponse.json(
        { error: 'Recurring event not found' },
        { status: 404 }
      )
    }

    recurringEvents[index] = {
      ...recurringEvents[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      recurringEvent: recurringEvents[index]
    })
  } catch (error) {
    console.error('Error updating recurring event:', error)
    return NextResponse.json(
      { error: 'Failed to update recurring event' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing recurring event ID' },
        { status: 400 }
      )
    }

    const index = recurringEvents.findIndex(re => re.id === id)
    if (index === -1) {
      return NextResponse.json(
        { error: 'Recurring event not found' },
        { status: 404 }
      )
    }

    const recurringEvent = recurringEvents[index]
    
    // Remove recurring event
    recurringEvents.splice(index, 1)
    
    // Remove associated schedule rule
    const ruleIndex = scheduleRules.findIndex(sr => sr.id === recurringEvent.scheduleRuleId)
    if (ruleIndex !== -1) {
      scheduleRules.splice(ruleIndex, 1)
    }
    
    // Remove generated events (optional - you might want to keep historical events)
    generatedEvents = generatedEvents.filter(e => e.recurringEventId !== id)

    return NextResponse.json({
      success: true,
      message: 'Recurring event deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting recurring event:', error)
    return NextResponse.json(
      { error: 'Failed to delete recurring event' },
      { status: 500 }
    )
  }
}