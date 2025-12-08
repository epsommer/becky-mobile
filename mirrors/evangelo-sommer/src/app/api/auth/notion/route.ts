import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state') // client integration ID for callback

    const notionClientId = process.env.NOTION_CLIENT_ID

    if (!notionClientId) {
      return NextResponse.json(
        { error: 'Missing NOTION_CLIENT_ID configuration' },
        { status: 500 }
      )
    }

    // Notion OAuth URL construction
    const notionAuthUrl = new URL('https://api.notion.com/v1/oauth/authorize')
    notionAuthUrl.searchParams.set('client_id', notionClientId)
    notionAuthUrl.searchParams.set('response_type', 'code')
    notionAuthUrl.searchParams.set('owner', 'user')
    notionAuthUrl.searchParams.set(
      'redirect_uri', 
      process.env.NOTION_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/notion/callback`
    )
    
    if (state) {
      notionAuthUrl.searchParams.set('state', state)
    }

    return NextResponse.json({ authUrl: notionAuthUrl.toString() })
  } catch (error) {
    console.error('Notion OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Notion OAuth' },
      { status: 500 }
    )
  }
}