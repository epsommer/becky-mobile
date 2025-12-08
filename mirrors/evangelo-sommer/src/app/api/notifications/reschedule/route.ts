// Server-side API route for sending reschedule notifications
import { NextRequest, NextResponse } from 'next/server'
import { gmailNotificationService } from '@/lib/gmail-notification-service'
import type { Appointment, Participant } from '@/types/participant-management'
import { ParticipantRole } from '@/types/participant-management'

interface RescheduleNotificationRequest {
  originalAppointment: Appointment
  newAppointment: Appointment
  participants: string[] // Array of participant emails
  reason?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RescheduleNotificationRequest = await request.json()
    
    if (!body.originalAppointment || !body.newAppointment || !body.participants || !Array.isArray(body.participants)) {
      return NextResponse.json(
        { error: 'Missing required fields: originalAppointment, newAppointment, participants' },
        { status: 400 }
      )
    }

    const { originalAppointment, newAppointment, participants, reason } = body
    
    // Send notifications to all participants
    const notificationPromises = participants.map(async (participantEmail: string) => {
      const participant: Participant = {
        id: `participant-${Date.now()}-${Math.random()}`,
        name: participantEmail.split('@')[0] || 'Participant',
        email: participantEmail,
        role: ParticipantRole.CLIENT,
        services: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      return gmailNotificationService.sendAppointmentReschedule(
        originalAppointment,
        newAppointment,
        participant,
        reason
      )
    })
    
    const results = await Promise.allSettled(notificationPromises)
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful
    
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason)
    
    const failedResults = results
      .filter((r): r is PromiseFulfilledResult<{success: boolean, error?: string}> => 
        r.status === 'fulfilled' && !r.value.success)
      .map(r => r.value.error)

    console.log(`📧 Reschedule notifications sent: ${successful} successful, ${failed} failed`)
    
    return NextResponse.json({
      success: true,
      results: {
        successful,
        failed,
        errors: [...errors, ...failedResults].filter(Boolean),
        totalSent: participants.length
      }
    })
    
  } catch (error) {
    console.error('❌ Error in reschedule notification API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send reschedule notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}