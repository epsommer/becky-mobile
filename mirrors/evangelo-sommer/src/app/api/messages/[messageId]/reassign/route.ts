import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const { targetConversationId, sourceConversationId } = await request.json();

    if (!targetConversationId || !sourceConversationId) {
      return NextResponse.json(
        { error: 'Both targetConversationId and sourceConversationId are required' },
        { status: 400 }
      );
    }

    // Verify the message exists and belongs to the source conversation
    if (!prisma) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            client: true
          }
        }
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.conversationId !== sourceConversationId) {
      return NextResponse.json(
        { error: 'Message does not belong to the specified source conversation' },
        { status: 400 }
      );
    }

    // Verify the target conversation exists and belongs to the same client
    const targetConversation = await prisma.conversation.findUnique({
      where: { id: targetConversationId },
      include: {
        client: true
      }
    });

    if (!targetConversation) {
      return NextResponse.json(
        { error: 'Target conversation not found' },
        { status: 404 }
      );
    }

    // Ensure both conversations belong to the same client
    if (message.conversation.clientId !== targetConversation.clientId) {
      return NextResponse.json(
        { error: 'Cannot reassign messages between different clients' },
        { status: 400 }
      );
    }

    // Perform the reassignment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the message's conversationId
      const updatedMessage = await tx.message.update({
        where: { id: messageId },
        data: {
          conversationId: targetConversationId
        }
      });

      // Update the source conversation's updatedAt timestamp
      await tx.conversation.update({
        where: { id: sourceConversationId },
        data: {
          updatedAt: new Date()
        }
      });

      // Update the target conversation's updatedAt timestamp
      await tx.conversation.update({
        where: { id: targetConversationId },
        data: {
          updatedAt: new Date()
        }
      });

      return updatedMessage;
    });

    return NextResponse.json({
      success: true,
      message: result,
      sourceConversationId,
      targetConversationId
    });

  } catch (error) {
    console.error('Error reassigning message:', error);
    return NextResponse.json(
      { error: 'Failed to reassign message' },
      { status: 500 }
    );
  }
}

// Bulk reassignment endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await params; // Consume params even though we don't use it for bulk endpoint

    const { messageIds, targetConversationId } = await request.json();

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'messageIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!targetConversationId) {
      return NextResponse.json(
        { error: 'targetConversationId is required' },
        { status: 400 }
      );
    }

    // Verify target conversation exists
    if (!prisma) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const targetConversation = await prisma.conversation.findUnique({
      where: { id: targetConversationId },
      include: { client: true }
    });

    if (!targetConversation) {
      return NextResponse.json(
        { error: 'Target conversation not found' },
        { status: 404 }
      );
    }

    // Fetch all messages to be reassigned
    const messages = await prisma.message.findMany({
      where: {
        id: { in: messageIds }
      },
      include: {
        conversation: {
          include: {
            client: true
          }
        }
      }
    });

    // Verify all messages exist and belong to the same client
    if (messages.length !== messageIds.length) {
      return NextResponse.json(
        { error: 'Some messages were not found' },
        { status: 404 }
      );
    }

    const allSameClient = messages.every(
      msg => msg.conversation.clientId === targetConversation.clientId
    );

    if (!allSameClient) {
      return NextResponse.json(
        { error: 'All messages must belong to conversations with the same client' },
        { status: 400 }
      );
    }

    // Get unique source conversation IDs
    const sourceConversationIds = [
      ...new Set(messages.map(msg => msg.conversationId))
    ];

    // Perform bulk reassignment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update all messages
      const updatedMessages = await tx.message.updateMany({
        where: {
          id: { in: messageIds }
        },
        data: {
          conversationId: targetConversationId
        }
      });

      // Update all source conversations' timestamps
      await tx.conversation.updateMany({
        where: {
          id: { in: sourceConversationIds }
        },
        data: {
          updatedAt: new Date()
        }
      });

      // Update target conversation's timestamp
      await tx.conversation.update({
        where: { id: targetConversationId },
        data: {
          updatedAt: new Date()
        }
      });

      return updatedMessages;
    });

    return NextResponse.json({
      success: true,
      reassignedCount: result.count,
      targetConversationId,
      sourceConversationIds
    });

  } catch (error) {
    console.error('Error performing bulk reassignment:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk reassignment' },
      { status: 500 }
    );
  }
}
