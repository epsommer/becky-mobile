import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { generateCSRFToken, generateOAuthState } from '@/lib/csrf'
import { getToken } from 'next-auth/jwt'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
)

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientData = searchParams.get('state') // Optional client-specific data

    // Get session for CSRF token binding
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // Generate CSRF token
    const csrfToken = generateCSRFToken(token?.sub);

    // Create signed state parameter with CSRF protection
    const stateData = clientData ? { clientData } : undefined;
    const secureState = generateOAuthState(csrfToken, stateData);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: secureState,
      prompt: 'consent'
    })

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Google OAuth initiation error:', error)
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Failed to initiate Google OAuth',
        ...(isDevelopment && {
          details: error instanceof Error ? error.message : String(error)
        })
      },
      { status: 500 }
    )
  }
}