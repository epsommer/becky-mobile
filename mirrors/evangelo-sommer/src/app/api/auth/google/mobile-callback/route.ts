/**
 * Mobile-specific Google OAuth callback endpoint
 * Handles the OAuth callback and redirects to the mobile app with the integration ID
 *
 * This endpoint:
 * 1. Receives the OAuth code from Google
 * 2. Exchanges it for tokens
 * 3. Stores the integration in the database
 * 4. Redirects to the mobile app with the integration ID
 */
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import * as jwt from 'jsonwebtoken'
import { encrypt } from '@/lib/encryption'
import { getPrismaClient } from '@/lib/prisma'

// Mobile app URL scheme for deep linking
const MOBILE_APP_SCHEME = 'beckycrm'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  // Use the mobile callback URL
  `${process.env.NEXTAUTH_URL}/api/auth/google/mobile-callback`
)

/**
 * Get authenticated user from mobile JWT token
 */
async function getAuthenticatedUser(request: NextRequest): Promise<{ email: string; role?: string } | null> {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
      if (!secret) {
        console.error('[google/mobile-callback] No JWT secret configured')
        return null
      }
      const decoded = jwt.verify(token, secret) as { email?: string; role?: string }
      if (decoded.email) {
        return { email: decoded.email, role: decoded.role }
      }
    } catch (err) {
      console.error('[google/mobile-callback] Invalid mobile JWT:', err)
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Build the redirect URL for the mobile app
    const buildMobileRedirect = (params: Record<string, string>) => {
      const queryString = new URLSearchParams(params).toString()
      // Use the mobile app's URL scheme for deep linking
      return `${MOBILE_APP_SCHEME}://oauth/google/callback?${queryString}`
    }

    if (error) {
      console.error('[google/mobile-callback] OAuth error:', error)
      return NextResponse.redirect(
        buildMobileRedirect({ error: 'google_auth_failed', message: error })
      )
    }

    if (!code) {
      return NextResponse.redirect(
        buildMobileRedirect({ error: 'missing_code' })
      )
    }

    // For mobile OAuth, we get the user email from the state parameter
    // The mobile app encodes the user's email in the state for verification
    let userEmail: string | null = null
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        userEmail = stateData.email
      } catch (err) {
        console.log('[google/mobile-callback] Could not parse state:', err)
      }
    }

    if (!userEmail) {
      console.warn('[google/mobile-callback] No user email in state')
      return NextResponse.redirect(
        buildMobileRedirect({ error: 'missing_user_email' })
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
        buildMobileRedirect({ error: 'no_primary_calendar' })
      )
    }

    const prisma = getPrismaClient()
    if (!prisma) {
      console.error('[google/mobile-callback] Database not available')
      return NextResponse.redirect(
        buildMobileRedirect({ error: 'database_unavailable' })
      )
    }

    // Encrypt sensitive tokens before storage
    const encryptedAccessToken = encrypt(tokens.access_token || '')
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null

    try {
      // Find or create participant for the authenticated user
      let participant = await prisma.participant.findFirst({
        where: { email: userEmail }
      })

      if (!participant) {
        participant = await prisma.participant.create({
          data: {
            name: userEmail.split('@')[0],
            email: userEmail,
            role: 'TEAM_MEMBER',
          }
        })
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
      })

      console.log('[google/mobile-callback] Integration created/updated:', integration.id)

      // Redirect to mobile app with success
      return NextResponse.redirect(
        buildMobileRedirect({
          success: 'true',
          provider: 'google',
          integrationId: integration.id,
          state: state || ''
        })
      )
    } catch (dbError) {
      console.error('[google/mobile-callback] Database error:', dbError)
      return NextResponse.redirect(
        buildMobileRedirect({ error: 'storage_failed' })
      )
    }
  } catch (error) {
    console.error('[google/mobile-callback] Error:', error)
    return NextResponse.redirect(
      `${MOBILE_APP_SCHEME}://oauth/google/callback?error=callback_failed&message=${encodeURIComponent((error as Error).message)}`
    )
  }
}
