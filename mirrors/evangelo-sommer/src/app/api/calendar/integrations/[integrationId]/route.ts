// API endpoint to fetch and manage calendar integration details
// SECURE: Returns integration info WITHOUT exposing OAuth tokens
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { getPrismaClient } from '@/lib/prisma';

/**
 * Get authenticated user's email from either NextAuth session or mobile Bearer token
 */
async function getAuthenticatedUser(request: NextRequest): Promise<{ email: string; role?: string } | null> {
  // Try NextAuth session first (web app)
  const nextAuthToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (nextAuthToken?.email) {
    return { email: nextAuthToken.email as string, role: nextAuthToken.role as string | undefined };
  }

  // Try mobile Bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
      if (!secret) {
        console.error('[calendar/integrations] No JWT secret configured');
        return null;
      }
      const decoded = jwt.verify(token, secret) as { email?: string; role?: string };
      if (decoded.email) {
        return { email: decoded.email, role: decoded.role };
      }
    } catch (err) {
      console.error('[calendar/integrations] Invalid mobile JWT:', err);
      return null;
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await params;

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Integration ID required' },
        { status: 400 }
      );
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      );
    }

    // Fetch integration (note: authenticated via middleware)
    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Return integration details WITHOUT tokens
    // Tokens stay encrypted in database and are never sent to frontend
    return NextResponse.json({
      success: true,
      data: {
        id: integration.id,
        provider: integration.provider,
        externalId: integration.externalId,
        calendarName: integration.calendarName,
        calendarEmail: integration.calendarEmail,
        isActive: integration.isActive,
        expiresAt: integration.expiresAt,
        lastSyncAt: integration.lastSyncAt,
        lastSyncError: integration.lastSyncError,
        participant: integration.participant,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
        // SECURITY: accessToken and refreshToken are NOT included
      }
    });
  } catch (error) {
    console.error('Failed to fetch calendar integration:', error);

    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch integration',
        ...(isDevelopment && {
          details: error instanceof Error ? error.message : String(error)
        })
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await params;

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Integration ID required' },
        { status: 400 }
      );
    }

    // Get authenticated user from either NextAuth or mobile JWT
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      );
    }

    // Verify the integration belongs to the authenticated user
    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId },
      include: {
        participant: true
      }
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Authorization check: ensure user owns this integration
    if (integration.participant.email !== authUser.email && authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete the integration (tokens will be deleted from database)
    await prisma.calendarIntegration.delete({
      where: { id: integrationId }
    });

    return NextResponse.json({
      success: true,
      message: 'Integration deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete calendar integration:', error);

    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete integration',
        ...(isDevelopment && {
          details: error instanceof Error ? error.message : String(error)
        })
      },
      { status: 500 }
    );
  }
}
