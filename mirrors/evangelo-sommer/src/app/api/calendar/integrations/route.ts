// API endpoint to list calendar integrations for current user
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { getPrismaClient } from '@/lib/prisma';

/**
 * Get authenticated user's email from either NextAuth session or mobile Bearer token
 */
async function getAuthenticatedEmail(request: NextRequest): Promise<string | null> {
  // Try NextAuth session first (web app)
  const nextAuthToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (nextAuthToken?.email) {
    return nextAuthToken.email as string;
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
      const decoded = jwt.verify(token, secret) as { email?: string; userId?: string };
      return decoded.email || null;
    } catch (err) {
      console.error('[calendar/integrations] Invalid mobile JWT:', err);
      return null;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from either NextAuth or mobile JWT
    const email = await getAuthenticatedEmail(request);

    if (!email) {
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

    // Find participant
    const participant = await prisma.participant.findUnique({
      where: { email }
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch all integrations for this user
    const integrations = await prisma.calendarIntegration.findMany({
      where: {
        participantId: participant.id,
      },
      select: {
        id: true,
        provider: true,
        externalId: true,
        calendarName: true,
        calendarEmail: true,
        isActive: true,
        expiresAt: true,
        lastSyncAt: true,
        lastSyncError: true,
        createdAt: true,
        updatedAt: true,
        // SECURITY: accessToken and refreshToken are NOT included
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: integrations
    });
  } catch (error) {
    console.error('Failed to list calendar integrations:', error);

    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list integrations',
        ...(isDevelopment && {
          details: error instanceof Error ? error.message : String(error)
        })
      },
      { status: 500 }
    );
  }
}
