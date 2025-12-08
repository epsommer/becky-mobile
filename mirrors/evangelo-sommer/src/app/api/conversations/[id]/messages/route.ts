import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma'
import { JsonFieldSerializers } from '@/lib/json-fields'

const prisma = getPrismaClient()
const isDatabaseAvailable = isPrismaAvailable()

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 })
    }

    const { id } = await context.params
    const body = await request.json()

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { id: true }
    })

    if (!conversation) {
      return NextResponse.json({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 })
    }

    // Normalize enum values to uppercase (Prisma enums are uppercase)
    const normalizedRole = (body.role || 'CLIENT').toUpperCase().replace('-', '_')
    const normalizedType = (body.type || 'TEXT').toUpperCase().replace('-', '_')

    // Validate role enum
    const validRoles = ['CLIENT', 'YOU', 'AI_DRAFT']
    if (!validRoles.includes(normalizedRole)) {
      return NextResponse.json({
        success: false,
        error: `Invalid role: ${body.role}. Must be one of: ${validRoles.join(', ')}`
      }, { status: 400 })
    }

    // Validate type enum
    const validTypes = ['EMAIL', 'TEXT', 'CALL_NOTES', 'MEETING_NOTES', 'VOICE_MEMO', 'FILE_UPLOAD']
    if (!validTypes.includes(normalizedType)) {
      return NextResponse.json({
        success: false,
        error: `Invalid type: ${body.type}. Must be one of: ${validTypes.join(', ')}`
      }, { status: 400 })
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        role: normalizedRole as 'CLIENT' | 'YOU' | 'AI_DRAFT',
        content: body.content,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        type: normalizedType as 'EMAIL' | 'TEXT' | 'CALL_NOTES' | 'MEETING_NOTES' | 'VOICE_MEMO' | 'FILE_UPLOAD',
        metadata: body.metadata ? JsonFieldSerializers.serializeObject(body.metadata) : undefined
      }
    })

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() }
    })

    // Transform message for response
    const transformedMessage = {
      id: message.id,
      role: message.role.toLowerCase(),
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      type: message.type.toLowerCase(),
      metadata: message.metadata ? JSON.parse(message.metadata as string) : null
    }

    return NextResponse.json({
      success: true,
      data: transformedMessage
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create message'
    }, { status: 500 })
  }
}