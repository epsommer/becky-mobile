/**
 * Mobile-specific Google OAuth initiation endpoint
 * Returns an OAuth URL that will redirect back to the mobile app
 *
 * This endpoint:
 * 1. Authenticates the mobile user via JWT
 * 2. Generates a Google OAuth URL with mobile-specific callback
 * 3. Includes user email in state for callback verification
 */
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import * as jwt from 'jsonwebtoken'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
]

/**
 * Get authenticated user from mobile JWT token
 */
async function getAuthenticatedUser(request: NextRequest): Promise<{ email: string; userId?: string } | null> {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
      if (!secret) {
        console.error('[google/mobile] No JWT secret configured')
        return null
      }
      const decoded = jwt.verify(token, secret) as { email?: string; userId?: string }
      if (decoded.email) {
        return { email: decoded.email, userId: decoded.userId }
      }
    } catch (err) {
      console.error('[google/mobile] Invalid mobile JWT:', err)
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the mobile user
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('[google/mobile] Missing Google OAuth credentials')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create OAuth client with mobile-specific redirect URI
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/google/mobile-callback`
    )

    // Encode user email in state for callback verification
    // This allows the callback to know which user initiated the request
    const stateData = {
      email: user.email,
      timestamp: Date.now(),
      source: 'mobile'
    }
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64')

    // Generate the auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: state,
      prompt: 'consent'
    })

    console.log('[google/mobile] Generated OAuth URL for user:', user.email)

    return NextResponse.json({
      success: true,
      data: {
        authUrl,
        state
      }
    })
  } catch (error) {
    console.error('[google/mobile] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initiate Google OAuth',
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : String(error))
          : undefined
      },
      { status: 500 }
    )
  }
}
