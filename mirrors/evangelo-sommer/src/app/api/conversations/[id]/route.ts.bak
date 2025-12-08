import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma'
import { JsonFieldSerializers, transformConversationForResponse } from '@/lib/json-fields'

const prisma = getPrismaClient()
const isDatabaseAvailable = isPrismaAvailable()

export async function GET(
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

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true
          }
        },
        messages: {
          orderBy: { timestamp: 'asc' }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 })
    }

    const transformedConversation = transformConversationForResponse(conversation)

    return NextResponse.json({
      success: true,
      data: transformedConversation
    })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch conversation'
    }, { status: 500 })
  }
}

export async function PATCH(
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

    const conversation = await prisma.conversation.update({
      where: { id: params.id },
      data: {
        title: body.title,
        summary: body.summary,
        nextActions: body.nextActions ? JsonFieldSerializers.serializeStringArray(body.nextActions) : undefined,
        sentiment: body.sentiment,
        priority: body.priority,
        tags: body.tags ? JsonFieldSerializers.serializeStringArray(body.tags) : undefined,
        status: body.status,
        source: body.source,
        participants: body.participants ? JsonFieldSerializers.serializeStringArray(body.participants) : undefined,
        relatedDocuments: body.relatedDocuments ? JsonFieldSerializers.serializeStringArray(body.relatedDocuments) : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true
          }
        },
        messages: {
          orderBy: { timestamp: 'asc' }
        }
      }
    })

    const transformedConversation = transformConversationForResponse(conversation)

    return NextResponse.json({
      success: true,
      data: transformedConversation
    })
  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update conversation'
    }, { status: 500 })
  }
}

export async function DELETE(
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

    await prisma.conversation.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete conversation'
    }, { status: 500 })
  }
}