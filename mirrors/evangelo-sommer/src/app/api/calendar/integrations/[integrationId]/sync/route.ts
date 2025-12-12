// API endpoint to sync events from a calendar integration
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
        console.error('[calendar/sync] No JWT secret configured');
        return null;
      }
      const decoded = jwt.verify(token, secret) as { email?: string; role?: string };
      if (decoded.email) {
        return { email: decoded.email, role: decoded.role };
      }
    } catch (err) {
      console.error('[calendar/sync] Invalid mobile JWT:', err);
      return null;
    }
  }

  return null;
}

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

    // Parse request body for date range
    let startDate: Date;
    let endDate: Date;
    try {
      const body = await request.json();
      startDate = body.startDate ? new Date(body.startDate) : new Date();
      endDate = body.endDate ? new Date(body.endDate) : new Date();

      // Default to last 30 days and next 90 days if not specified
      if (!body.startDate) {
        startDate.setDate(startDate.getDate() - 30);
      }
      if (!body.endDate) {
        endDate.setDate(endDate.getDate() + 90);
      }
    } catch {
      // Default date range if no body
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 90);
    }

    // Handle based on provider
    if (integration.provider === 'GOOGLE') {
      return await syncGoogleCalendar(integration, startDate, endDate, prisma);
    } else {
      return NextResponse.json(
        { success: false, error: `Provider ${integration.provider} not supported` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Calendar sync error:', error);

    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync calendar',
        ...(isDevelopment && {
          details: error instanceof Error ? error.message : String(error)
        })
      },
      { status: 500 }
    );
  }
}

async function syncGoogleCalendar(
  integration: any,
  startDate: Date,
  endDate: Date,
  prisma: any
) {
  // Validate Google OAuth credentials
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Missing Google OAuth environment variables');
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Decrypt tokens
  let accessToken: string;
  let refreshToken: string | null = null;

  try {
    accessToken = decrypt(integration.accessToken);
    if (integration.refreshToken) {
      refreshToken = decrypt(integration.refreshToken);
    }
  } catch (error) {
    console.error('Failed to decrypt tokens:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to decrypt credentials', requiresReauth: true },
      { status: 401 }
    );
  }

  // Create OAuth client
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
        console.log('Refreshed and stored new tokens for integration:', integration.id);
      } catch (error) {
        console.error('Failed to store refreshed tokens:', error);
      }
    }
  });

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: integration.externalId || 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items?.map(event => ({
      id: `gcal-${event.id}`,
      googleCalendarEventId: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description || undefined,
      startTime: event.start?.dateTime || event.start?.date,
      endTime: event.end?.dateTime || event.end?.date,
      isAllDay: !event.start?.dateTime,
      location: event.location || undefined,
      status: event.status === 'cancelled' ? 'cancelled' : 'scheduled',
      type: 'event' as const,
      participants: event.attendees?.map(attendee => ({
        id: attendee.email || '',
        name: attendee.displayName || attendee.email || '',
        email: attendee.email || '',
        responseStatus: attendee.responseStatus
      })) || [],
      source: 'google' as const,
      createdAt: event.created || new Date().toISOString(),
      updatedAt: event.updated || new Date().toISOString()
    })) || [];

    // Update last sync time
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: null
      }
    });

    return NextResponse.json({
      success: true,
      data: events,
      syncedAt: new Date().toISOString(),
      count: events.length
    });

  } catch (error: any) {
    console.error('Google Calendar API error:', error);

    // Update sync error
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncError: error.message || 'Unknown error'
      }
    });

    // Handle token expiry
    if (error?.code === 401 || error?.response?.status === 401) {
      return NextResponse.json(
        { success: false, error: 'Token expired', requiresReauth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch Google Calendar events' },
      { status: 500 }
    );
  }
}
