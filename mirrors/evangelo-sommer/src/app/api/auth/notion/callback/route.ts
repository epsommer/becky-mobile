import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=notion_auth_failed&message=${encodeURIComponent(error)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=missing_code`
      )
    }

    // Exchange code for access token
    const notionClientId = process.env.NOTION_CLIENT_ID
    const notionClientSecret = process.env.NOTION_CLIENT_SECRET

    if (!notionClientId || !notionClientSecret) {
      console.error('Missing Notion OAuth credentials')
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=missing_credentials`
      )
    }
    
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${notionClientId}:${notionClientSecret}`).toString('base64')}`,
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.NOTION_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/notion/callback`
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Notion token exchange failed:', errorData)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=notion_token_failed`
      )
    }

    const tokenData = await tokenResponse.json()

    // Get workspace and user info
    const workspaceInfo = tokenData.workspace_name || 'Unknown Workspace'
    const userId = tokenData.owner?.user?.id || 'unknown'

    // For Notion Calendar, we need to find calendar databases
    // This is a simplified approach - in practice, you'd search for calendar-type databases
    const integrationData = {
      provider: 'notion',
      accountId: userId,
      workspaceName: workspaceInfo,
      accessToken: tokenData.access_token,
      botId: tokenData.bot_id,
      workspaceId: tokenData.workspace_id,
      calendarId: null // Let sync search for available databases
    }

    const params = new URLSearchParams({
      success: 'true',
      provider: 'notion',
      data: JSON.stringify(integrationData)
    })

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/time-manager?${params.toString()}`
    )
  } catch (error) {
    console.error('Notion OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/time-manager?error=notion_callback_failed&message=${encodeURIComponent((error as Error).message)}`
    )
  }
}