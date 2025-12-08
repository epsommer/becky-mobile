import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/notifications - Get recent notifications (testimonials received, etc.)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Get recent testimonials received as notifications
    const recentTestimonials = await prisma!.testimonial.findMany({
      where: {
        status: 'SUBMITTED',
        submittedAt: { not: null },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: limit,
    });

    // Transform to notification format
    const notifications = recentTestimonials.map((testimonial) => ({
      id: testimonial.id,
      type: 'TESTIMONIAL_RECEIVED' as const,
      title: `New testimonial from ${testimonial.client?.name}`,
      message: `${testimonial.rating} star${testimonial.rating !== 1 ? 's' : ''} - "${testimonial.content?.substring(0, 100)}..."`,
      clientId: testimonial.clientId,
      clientName: testimonial.client?.name,
      rating: testimonial.rating,
      timestamp: testimonial.submittedAt,
      read: false, // TODO: Track read status in separate table
      link: `/testimonials?clientId=${testimonial.clientId}`,
    }));

    // Get count of unread notifications
    const unreadCount = notifications.length; // TODO: Implement proper read tracking

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/mark-read - Mark notification as read
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body;

    // TODO: Implement read status tracking in database
    // For now, just return success

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
