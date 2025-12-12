// API endpoint to create/update events in a calendar integration
// Uses stored encrypted tokens - mobile doesn't need to handle tokens
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { getPrismaClient } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { google } from 'googleapis';

/**
 * Get authenticated user's email from either NextAuth session or mobile Bearer token
 */
async function getAuthenticatedUser(request: NextRequest): Promise<{ email: string; role?: string } | null> {
  // Try NextAuth session first (web app)
  const nextAuthToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (nextAuthToken?.email) {
    return { email: nextAuthToken.email as string, role: nextAuthToken.role as string | undefined };
  }

  // Try mobile Bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
      if (!secret) {
        console.error('[calendar/events] No JWT secret configured');
        return null;
      }
      const decoded = jwt.verify(token, secret) as { email?: string; role?: string };
      if (decoded.email) {
        return { email: decoded.email, role: decoded.role };
      }
    } catch (err) {
      console.error('[calendar/events] Invalid mobile JWT:', err);
      return null;
    }
  }

  return null;
}

// Create event in external calendar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await params;

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Integration ID required' },
        { status: 400 }
      );
    }

    // Get authenticated user from either NextAuth or mobile JWT
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      );
    }

    // Fetch integration with tokens
    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId },
      include: {
        participant: true
      }
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Authorization check
    if (integration.participant.email !== authUser.email && authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (!integration.isActive) {
      return NextResponse.json(
        { success: false, error: 'Integration is not active' },
        { status: 400 }
      );
    }

    // Parse event data from request body
    const eventData = await request.json();

    if (!eventData.title || !eventData.startTime || !eventData.endTime) {
      return NextResponse.json(
        { success: false, error: 'title, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    // Handle based on provider
    if (integration.provider === 'GOOGLE') {
      return await createGoogleCalendarEvent(integration, eventData, prisma);
    } else {
      return NextResponse.json(
        { success: false, error: `Provider ${integration.provider} not supported` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Create calendar event error:', error);

    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create calendar event',
        ...(isDevelopment && {
          details: error instanceof Error ? error.message : String(error)
        })
      },
      { status: 500 }
    );
  }
}

// Update event in external calendar
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await params;

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Integration ID required' },
        { status: 400 }
      );
    }

    // Get authenticated user from either NextAuth or mobile JWT
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      );
    }

    // Fetch integration with tokens
    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId },
      include: {
        participant: true
      }
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Authorization check
    if (integration.participant.email !== authUser.email && authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Parse event data from request body
    const eventData = await request.json();

    if (!eventData.googleCalendarEventId) {
      return NextResponse.json(
        { success: false, error: 'googleCalendarEventId is required for updates' },
        { status: 400 }
      );
    }

    // Handle based on provider
    if (integration.provider === 'GOOGLE') {
      return await updateGoogleCalendarEvent(integration, eventData, prisma);
    } else {
      return NextResponse.json(
        { success: false, error: `Provider ${integration.provider} not supported` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Update calendar event error:', error);

    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update calendar event',
        ...(isDevelopment && {
          details: error instanceof Error ? error.message : String(error)
        })
      },
      { status: 500 }
    );
  }
}

async function getGoogleOAuthClient(integration: any, prisma: any) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Missing Google OAuth environment variables');
  }

  // Decrypt tokens
  const accessToken = decrypt(integration.accessToken);
  const refreshToken = integration.refreshToken ? decrypt(integration.refreshToken) : null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      try {
        const { encrypt } = await import('@/lib/encryption');
        const encryptedAccessToken = encrypt(tokens.access_token);
        const encryptedRefreshToken = tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : undefined;

        await prisma.calendarIntegration.update({
          where: { id: integration.id },
          data: {
            accessToken: encryptedAccessToken,
            ...(encryptedRefreshToken && { refreshToken: encryptedRefreshToken }),
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          }
        });
      } catch (error) {
        console.error('Failed to store refreshed tokens:', error);
      }
    }
  });

  return oauth2Client;
}

async function createGoogleCalendarEvent(integration: any, eventData: any, prisma: any) {
  try {
    const oauth2Client = await getGoogleOAuthClient(integration, prisma);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: eventData.isAllDay
        ? { date: eventData.startTime.split('T')[0] }
        : { dateTime: eventData.startTime, timeZone: eventData.timezone || 'America/New_York' },
      end: eventData.isAllDay
        ? { date: eventData.endTime.split('T')[0] }
        : { dateTime: eventData.endTime, timeZone: eventData.timezone || 'America/New_York' },
      attendees: eventData.participants?.map((p: any) => ({
        email: p.email,
        displayName: p.name
      })),
      reminders: {
        useDefault: true
      }
    };

    const response = await calendar.events.insert({
      calendarId: integration.externalId || 'primary',
      requestBody: event,
      sendUpdates: 'all'
    });

    return NextResponse.json({
      success: true,
      data: {
        id: `gcal-${response.data.id}`,
        googleCalendarEventId: response.data.id,
        title: response.data.summary,
        startTime: response.data.start?.dateTime || response.data.start?.date,
        endTime: response.data.end?.dateTime || response.data.end?.date,
        htmlLink: response.data.htmlLink
      }
    });

  } catch (error: any) {
    console.error('Google Calendar create event error:', error);

    if (error?.code === 401 || error?.response?.status === 401) {
      return NextResponse.json(
        { success: false, error: 'Token expired', requiresReauth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create Google Calendar event' },
      { status: 500 }
    );
  }
}

async function updateGoogleCalendarEvent(integration: any, eventData: any, prisma: any) {
  try {
    const oauth2Client = await getGoogleOAuthClient(integration, prisma);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event: any = {};

    if (eventData.title) event.summary = eventData.title;
    if (eventData.description !== undefined) event.description = eventData.description;
    if (eventData.location !== undefined) event.location = eventData.location;

    if (eventData.startTime) {
      event.start = eventData.isAllDay
        ? { date: eventData.startTime.split('T')[0] }
        : { dateTime: eventData.startTime, timeZone: eventData.timezone || 'America/New_York' };
    }

    if (eventData.endTime) {
      event.end = eventData.isAllDay
        ? { date: eventData.endTime.split('T')[0] }
        : { dateTime: eventData.endTime, timeZone: eventData.timezone || 'America/New_York' };
    }

    const response = await calendar.events.patch({
      calendarId: integration.externalId || 'primary',
      eventId: eventData.googleCalendarEventId,
      requestBody: event,
      sendUpdates: 'all'
    });

    return NextResponse.json({
      success: true,
      data: {
        id: `gcal-${response.data.id}`,
        googleCalendarEventId: response.data.id,
        title: response.data.summary,
        startTime: response.data.start?.dateTime || response.data.start?.date,
        endTime: response.data.end?.dateTime || response.data.end?.date,
        htmlLink: response.data.htmlLink
      }
    });

  } catch (error: any) {
    console.error('Google Calendar update event error:', error);

    if (error?.code === 401 || error?.response?.status === 401) {
      return NextResponse.json(
        { success: false, error: 'Token expired', requiresReauth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update Google Calendar event' },
      { status: 500 }
    );
  }
}
