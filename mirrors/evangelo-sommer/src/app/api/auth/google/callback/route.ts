import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { verifyOAuthState, validateCSRFToken } from '@/lib/csrf'
import { getToken } from 'next-auth/jwt'
import { encrypt } from '@/lib/encryption'
import { getPrismaClient } from '@/lib/prisma'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=google_auth_failed&message=${encodeURIComponent(error)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=missing_code`
      )
    }

    // Verify CSRF protection via state parameter
    if (!state) {
      console.warn('OAuth callback missing state parameter');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=csrf_missing`
      )
    }

    const stateData = verifyOAuthState(state);
    if (!stateData) {
      console.warn('OAuth callback state verification failed');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=csrf_invalid`
      )
    }

    // Get session for CSRF token validation
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // Validate CSRF token
    const isValidCSRF = validateCSRFToken(stateData.csrf as string, token?.sub);
    if (!isValidCSRF) {
      console.warn('OAuth callback CSRF token validation failed');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=csrf_validation_failed`
      )
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    // Set credentials to get user info
    oauth2Client.setCredentials(tokens)
    
    // Get user's calendar info
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const calendarList = await calendar.calendarList.list()
    
    const primaryCalendar = calendarList.data.items?.find(
      (cal) => cal.primary === true
    )

    if (!primaryCalendar) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=no_primary_calendar`
      )
    }

    // SECURE: Store encrypted tokens in database
    if (!token?.sub) {
      console.warn('OAuth callback: no authenticated user');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=not_authenticated`
      )
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      console.error('OAuth callback: database not available');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=database_unavailable`
      )
    }

    // Encrypt sensitive tokens before storage
    const encryptedAccessToken = encrypt(tokens.access_token || '');
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    try {
      // Find or create participant for the authenticated user
      let participant = await prisma.participant.findFirst({
        where: { email: token.email || undefined }
      });

      if (!participant) {
        participant = await prisma.participant.create({
          data: {
            name: token.name || token.email || 'User',
            email: token.email || undefined,
            role: 'TEAM_MEMBER',
          }
        });
      }

      // Upsert calendar integration with encrypted tokens
      const integration = await prisma.calendarIntegration.upsert({
        where: {
          participantId_provider: {
            participantId: participant.id,
            provider: 'GOOGLE'
          }
        },
        update: {
          externalId: primaryCalendar.id || '',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          calendarName: primaryCalendar.summary || null,
          calendarEmail: primaryCalendar.id || null,
          isActive: true,
          lastSyncAt: new Date(),
          lastSyncError: null,
        },
        create: {
          participantId: participant.id,
          provider: 'GOOGLE',
          externalId: primaryCalendar.id || '',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          calendarName: primaryCalendar.summary || null,
          calendarEmail: primaryCalendar.id || null,
          isActive: true,
          lastSyncAt: new Date(),
        }
      });

      // Redirect with only integration ID (safe to pass in URL)
      const params = new URLSearchParams({
        success: 'true',
        provider: 'google',
        integrationId: integration.id
      });

      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?${params.toString()}`
      );
    } catch (error) {
      console.error('Failed to store calendar integration:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=storage_failed`
      );
    }
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/time-manager?error=google_callback_failed&message=${encodeURIComponent((error as Error).message)}`
    )
  }
}