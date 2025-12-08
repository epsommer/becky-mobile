import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { 
      accessToken, 
      databaseId,
      event
    } = await request.json()

    if (!accessToken || !databaseId || !event) {
      return NextResponse.json(
        { error: 'Missing required credentials or event data' },
        { status: 400 }
      )
    }

    // First, get the database structure to understand its properties
    const databaseResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      }
    })

    if (!databaseResponse.ok) {
      const errorText = await databaseResponse.text()
      console.error('Failed to fetch database schema:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch database schema' },
        { status: 500 }
      )
    }

    const databaseData = await databaseResponse.json()
    const properties = databaseData.properties || {}

    // Find relevant properties
    const titleProp = Object.entries(properties).find(([key, prop]: [string, any]) => 
      prop.type === 'title'
    )
    const dateProp = Object.entries(properties).find(([key, prop]: [string, any]) => 
      prop.type === 'date'
    )
    const textProp = Object.entries(properties).find(([key, prop]: [string, any]) => 
      prop.type === 'rich_text'
    )

    // Build the page properties
    const pageProperties: any = {}

    // Add title
    if (titleProp) {
      pageProperties[titleProp[0]] = {
        title: [
          {
            text: { content: event.title }
          }
        ]
      }
    }

    // Add date
    if (dateProp) {
      const dateValue: any = {
        start: event.isAllDay ? event.startTime.split('T')[0] : event.startTime
      }
      
      if (event.endTime && event.endTime !== event.startTime) {
        dateValue.end = event.isAllDay ? event.endTime.split('T')[0] : event.endTime
      }

      pageProperties[dateProp[0]] = {
        date: dateValue
      }
    }

    // Add description if we have a text property
    if (textProp && event.description) {
      pageProperties[textProp[0]] = {
        rich_text: [
          {
            text: { content: event.description }
          }
        ]
      }
    }

    // Create the page in Notion
    const createResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: {
          type: 'database_id',
          database_id: databaseId
        },
        properties: pageProperties
      })
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('Failed to create Notion page:', errorText)
      return NextResponse.json(
        { error: 'Failed to create Notion page' },
        { status: 500 }
      )
    }

    const createdPage = await createResponse.json()

    return NextResponse.json({
      success: true,
      notionPageId: createdPage.id,
      event: {
        ...event,
        metadata: {
          ...event.metadata,
          notionPageId: createdPage.id,
          notionDatabaseId: databaseId,
          notionUrl: createdPage.url
        }
      }
    })

  } catch (error) {
    console.error('Notion Calendar create event error:', error)
    return NextResponse.json(
      { error: 'Failed to create Notion Calendar event' },
      { status: 500 }
    )
  }
}