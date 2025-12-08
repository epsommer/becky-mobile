import { NextRequest, NextResponse } from 'next/server';
import { ConversationStatus, MessageRole, MessageType, SentimentLevel, PriorityLevel } from '@prisma/client';
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma';
import { JsonFieldSerializers, transformConversationForResponse } from '@/lib/json-fields';

// Get Prisma client instance
const prisma = getPrismaClient();
const isDatabaseAvailable = isPrismaAvailable();


export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status') as ConversationStatus | null;
    const clientId = url.searchParams.get('clientId');
    const priority = url.searchParams.get('priority') as PriorityLevel | null;
    const search = url.searchParams.get('search');

    // If database is not available, return error
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 });
    }

    // Database is available - use Prisma queries
    console.log('Database available - querying conversations');

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (clientId) {
      where.clientId = clientId;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const total = await prisma.conversation.count({ where });

    // Get conversations with pagination
    const skip = (page - 1) * limit;
    const conversations = await prisma.conversation.findMany({
      where,
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
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            timestamp: true,
            type: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit
    });

    // Transform conversations for response
    const transformedConversations = conversations.map(transformConversationForResponse);

    return NextResponse.json({
      success: true,
      data: transformedConversations,
      total,
      page,
      limit
    });

  } catch (error) {
    console.error('Conversations listing error:', error);
    
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve conversations'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if database is available
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available - conversation creation requires database connection'
      }, { status: 503 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.clientId) {
      return NextResponse.json({
        success: false,
        error: 'Client ID is required'
      }, { status: 400 });
    }

    // Verify client exists
    const client = await prisma.clientRecord.findUnique({
      where: { id: body.clientId },
      select: { id: true, name: true }
    });

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        clientId: body.clientId,
        title: body.title || `Conversation with ${client.name}`,
        summary: body.summary || null,
        nextActions: body.nextActions ? JsonFieldSerializers.serializeStringArray(body.nextActions) : undefined,
        sentiment: body.sentiment || 'NEUTRAL',
        priority: body.priority || 'MEDIUM',
        tags: body.tags ? JsonFieldSerializers.serializeStringArray(body.tags) : undefined,
        status: body.status || 'ACTIVE',
        source: body.source || 'MANUAL',
        participants: body.participants ? JsonFieldSerializers.serializeStringArray(body.participants) : undefined,
        relatedDocuments: body.relatedDocuments ? JsonFieldSerializers.serializeStringArray(body.relatedDocuments) : undefined
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
        }
      }
    });

    // Create initial messages if provided
    if (body.messages && Array.isArray(body.messages)) {
      // Helper to validate and map message type to enum
      const validateMessageType = (type: any): MessageType => {
        const validTypes: MessageType[] = ['EMAIL', 'TEXT', 'CALL_NOTES', 'MEETING_NOTES', 'VOICE_MEMO', 'FILE_UPLOAD'];
        const typeStr = String(type || 'TEXT').toUpperCase().replace(/-/g, '_') as MessageType;
        return validTypes.includes(typeStr) ? typeStr : 'TEXT';
      };

      // Helper to validate and map message role to enum
      const validateMessageRole = (role: any): MessageRole => {
        const roleStr = String(role || 'CLIENT').toUpperCase();
        return (roleStr === 'YOU' || roleStr === 'AI_DRAFT') ? roleStr as MessageRole : 'CLIENT';
      };

      for (const message of body.messages) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: validateMessageRole(message.role),
            content: message.content,
            timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
            type: validateMessageType(message.type),
            metadata: message.metadata ? JsonFieldSerializers.serializeObject(message.metadata) : undefined
          }
        });
      }
    }

    // Fetch the complete conversation with messages
    const completeConversation = await prisma.conversation.findUnique({
      where: { id: conversation.id },
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
    });

    // Transform for response
    const transformedConversation = transformConversationForResponse(completeConversation);

    return NextResponse.json({
      success: true,
      data: transformedConversation
    }, { status: 201 });

  } catch (error) {
    console.error('Conversation creation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create conversation'
    }, { status: 500 });
  }
}