import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma'
import { JsonFieldSerializers } from '@/lib/json-fields'

const prisma = getPrismaClient()
const isDatabaseAvailable = isPrismaAvailable()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 })
    }

    const body = await request.json()

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      select: { id: true }
    })

    if (!conversation) {
      return NextResponse.json({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 })
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: params.id,
        role: body.role || 'CLIENT',
        content: body.content,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        type: body.type || 'TEXT',
        metadata: body.metadata ? JsonFieldSerializers.serializeObject(body.metadata) : null
      }
    })

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: params.id },
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