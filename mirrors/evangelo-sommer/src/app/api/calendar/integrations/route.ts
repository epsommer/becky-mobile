// API endpoint to list calendar integrations for current user
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getPrismaClient } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.email) {
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
      where: { email: token.email }
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
