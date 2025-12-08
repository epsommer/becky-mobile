import { NextRequest, NextResponse } from 'next/server'
import ClaudeAIService from '@/lib/claude-ai-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { objectives, context } = body

    if (!objectives || !Array.isArray(objectives)) {
      return NextResponse.json(
        { error: 'Invalid objectives data' },
        { status: 400 }
      )
    }

    const suggestions = await ClaudeAIService.generateSuggestions(objectives, context)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('AI suggestions API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'AI Objectives Suggestions API' })
}