import { NextRequest, NextResponse } from 'next/server'
import ClaudeAIService from '@/lib/claude-ai-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { objectives, context, sortingStrategy } = body

    if (!objectives || !Array.isArray(objectives)) {
      return NextResponse.json(
        { error: 'Invalid objectives data' },
        { status: 400 }
      )
    }

    const result = await ClaudeAIService.sortObjectives({
      objectives,
      context,
      sortingStrategy
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI sorting API error:', error)
    return NextResponse.json(
      { error: 'Failed to sort objectives' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'AI Objectives Sorting API' })
}