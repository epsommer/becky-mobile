import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(request: NextRequest) {
  try {
    const { 
      accessToken, 
      refreshToken, 
      calendarId,
      event
    } = await request.json()

    if (!accessToken || !calendarId || !event) {
      return NextResponse.json(
        { error: 'Missing required credentials or event data' },
        { status: 400 }
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Convert our event format to Google Calendar format
    const googleEvent = {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: {
        dateTime: event.isAllDay ? undefined : event.startTime,
        date: event.isAllDay ? event.startTime.split('T')[0] : undefined,
        timeZone: 'America/New_York' // Default timezone, should be configurable
      },
      end: {
        dateTime: event.isAllDay ? undefined : event.endTime,
        date: event.isAllDay ? event.endTime.split('T')[0] : undefined,
        timeZone: 'America/New_York'
      },
      attendees: event.attendees?.map((email: string) => ({ email })) || undefined,
      reminders: {
        useDefault: false,
        overrides: event.metadata?.reminderMinutesBefore ? [
          { method: 'email', minutes: event.metadata.reminderMinutesBefore },
          { method: 'popup', minutes: event.metadata.reminderMinutesBefore }
        ] : [
          { method: 'email', minutes: 10 },
          { method: 'popup', minutes: 10 }
        ]
      },
      visibility: event.metadata?.visibility || 'default'
    }

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: googleEvent
    })

    return NextResponse.json({
      success: true,
      googleEventId: response.data.id,
      event: {
        ...event,
        metadata: {
          ...event.metadata,
          googleEventId: response.data.id,
          googleCalendarId: calendarId
        }
      }
    })

  } catch (error) {
    console.error('Google Calendar create event error:', error)
    
    if ((error as any)?.code === 401) {
      return NextResponse.json(
        { error: 'Token expired', requiresReauth: true },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create Google Calendar event' },
      { status: 500 }
    )
  }
}