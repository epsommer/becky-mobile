import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma'

const prisma = getPrismaClient()
const isDatabaseAvailable = isPrismaAvailable()

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 })
    }

    const { id, messageId } = await context.params
    const body = await request.json()

    // Verify message exists and belongs to the conversation
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId: id
      }
    })

    if (!existingMessage) {
      return NextResponse.json({
        success: false,
        error: 'Message not found'
      }, { status: 404 })
    }

    // Update message
    const message = await prisma.message.update({
      where: { id: messageId },
      data: {
        role: body.role || existingMessage.role,
        content: body.content !== undefined ? body.content : existingMessage.content,
        timestamp: body.timestamp ? new Date(body.timestamp) : existingMessage.timestamp,
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
    })
  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update message'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 })
    }

    const { id, messageId } = await context.params

    // Verify message exists and belongs to the conversation
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId: id
      }
    })

    if (!existingMessage) {
      return NextResponse.json({
        success: false,
        error: 'Message not found'
      }, { status: 404 })
    }

    // Delete message
    await prisma.message.delete({
      where: { id: messageId }
    })

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete message'
    }, { status: 500 })
  }
}
