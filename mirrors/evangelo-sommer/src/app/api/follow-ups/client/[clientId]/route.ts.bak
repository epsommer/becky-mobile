import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { 
  FollowUpListResponse,
  ClientFollowUpHistory,
  FollowUpSearchParams 
} from '@/types/follow-up';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params;
    const url = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const includeHistory = url.searchParams.get('includeHistory') === 'true';
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const upcomingOnly = url.searchParams.get('upcomingOnly') === 'true';
    const overdueOnly = url.searchParams.get('overdueOnly') === 'true';

    // Verify client exists
    const client = await prisma.clientRecord.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true
      }
    });

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    const skip = (page - 1) * limit;
    const now = new Date();

    // Build where clause
    const where: any = {
      clientId: clientId
    };
    
    if (status) {
      where.status = { in: status.split(',') };
    }
    
    if (category) {
      where.category = { in: category.split(',') };
    }

    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) where.scheduledDate.gte = new Date(dateFrom);
      if (dateTo) where.scheduledDate.lte = new Date(dateTo);
    }

    if (upcomingOnly) {
      where.scheduledDate = { gte: now };
      where.status = { in: ['SCHEDULED', 'CONFIRMED'] };
    }

    if (overdueOnly) {
      where.scheduledDate = { lt: now };
      where.status = { in: ['SCHEDULED', 'CONFIRMED'] };
    }

    // Get total count
    const total = await prisma.followUp.count({ where });

    // Get follow-ups
    const followUps = await prisma.followUp.findMany({
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
        notifications: {
          orderBy: { scheduledAt: 'desc' },
          take: 5 // Latest 5 notifications
        },
        childFollowUps: {
          select: {
            id: true,
            scheduledDate: true,
            status: true,
            title: true
          },
          orderBy: { scheduledDate: 'asc' }
        },
        parentFollowUp: {
          select: {
            id: true,
            title: true,
            scheduledDate: true
          }
        }
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { priority: 'desc' }
      ],
      skip,
      take: limit
    });

    let history: ClientFollowUpHistory | undefined;

    if (includeHistory) {
      // Calculate follow-up history metrics
      const allFollowUps = await prisma.followUp.findMany({
        where: { clientId },
        select: {
          id: true,
          status: true,
          scheduledDate: true,
          createdAt: true
        }
      });

      const totalFollowUps = allFollowUps.length;
      const completedFollowUps = allFollowUps.filter(fu => fu.status === 'COMPLETED').length;
      const missedFollowUps = allFollowUps.filter(fu => fu.status === 'MISSED').length;
      
      const lastFollowUp = allFollowUps
        .filter(fu => fu.status === 'COMPLETED')
        .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime())[0];

      const nextFollowUp = allFollowUps
        .filter(fu => ['SCHEDULED', 'CONFIRMED'].includes(fu.status))
        .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())[0];

      history = {
        clientId,
        clientName: client.name,
        totalFollowUps,
        completedFollowUps,
        missedFollowUps,
        lastFollowUpDate: lastFollowUp?.scheduledDate || null,
        nextFollowUpDate: nextFollowUp?.scheduledDate || null,
        averageResponseRate: totalFollowUps > 0 ? 
          Math.round((completedFollowUps / totalFollowUps) * 100) / 100 : 0,
        recentFollowUps: followUps.slice(0, 5) // Most recent 5
      };
    }

    const response: FollowUpListResponse & { history?: ClientFollowUpHistory } = {
      success: true,
      data: followUps,
      total,
      page,
      limit,
      history
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Client follow-ups error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve client follow-ups'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params;
    const body = await request.json();

    // Verify client exists
    const client = await prisma.clientRecord.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    // Create follow-up using the main schedule endpoint logic
    // This delegates to the main POST /api/follow-ups/schedule endpoint
    const scheduleResponse = await fetch(
      new URL('/api/follow-ups/schedule', request.url).toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...body, clientId })
      }
    );

    const result = await scheduleResponse.json();
    return NextResponse.json(result, { status: scheduleResponse.status });

  } catch (error) {
    console.error('Client follow-up creation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create follow-up'
    }, { status: 500 });
  }
}

// Get follow-up metrics and insights for a specific client
export async function PATCH(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'insights') {
      // Get comprehensive follow-up insights for the client
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Get all follow-ups for analysis
      const followUps = await prisma.followUp.findMany({
        where: { clientId },
        include: {
          notifications: {
            where: { status: 'DELIVERED' }
          }
        },
        orderBy: { scheduledDate: 'desc' }
      });

      // Calculate metrics
      const totalFollowUps = followUps.length;
      const recentFollowUps = followUps.filter(fu => fu.scheduledDate >= thirtyDaysAgo);
      const completedFollowUps = followUps.filter(fu => fu.status === 'COMPLETED');
      const missedFollowUps = followUps.filter(fu => fu.status === 'MISSED');
      const overdueFollowUps = followUps.filter(fu => 
        fu.scheduledDate < now && ['SCHEDULED', 'CONFIRMED'].includes(fu.status)
      );

      // Category breakdown
      const categoryBreakdown = followUps.reduce((acc, fu) => {
        acc[fu.category] = (acc[fu.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Response time analysis (time between scheduling and completion)
      const responseTimeData = completedFollowUps
        .filter(fu => fu.updatedAt && fu.createdAt)
        .map(fu => {
          const responseTime = fu.updatedAt.getTime() - fu.scheduledDate.getTime();
          return responseTime / (1000 * 60 * 60); // Convert to hours
        });

      const avgResponseTime = responseTimeData.length > 0 ?
        responseTimeData.reduce((sum, time) => sum + time, 0) / responseTimeData.length : 0;

      // Notification effectiveness
      const totalNotifications = followUps.reduce((sum, fu) => sum + fu.notifications.length, 0);
      const deliveredNotifications = followUps.reduce((sum, fu) => 
        sum + fu.notifications.filter(n => n.status === 'DELIVERED').length, 0
      );

      const insights = {
        totalFollowUps,
        recentFollowUpsCount: recentFollowUps.length,
        completionRate: totalFollowUps > 0 ? completedFollowUps.length / totalFollowUps : 0,
        missedRate: totalFollowUps > 0 ? missedFollowUps.length / totalFollowUps : 0,
        overdueCount: overdueFollowUps.length,
        categoryBreakdown,
        averageResponseTimeHours: Math.round(avgResponseTime * 100) / 100,
        notificationDeliveryRate: totalNotifications > 0 ? 
          deliveredNotifications / totalNotifications : 0,
        trends: {
          last30Days: recentFollowUps.length,
          last90Days: followUps.filter(fu => fu.scheduledDate >= ninetyDaysAgo).length,
          completionTrend: recentFollowUps.filter(fu => fu.status === 'COMPLETED').length,
        },
        recommendations: generateRecommendations({
          totalFollowUps,
          completedFollowUps: completedFollowUps.length,
          missedFollowUps: missedFollowUps.length,
          overdueCount: overdueFollowUps.length,
          avgResponseTime,
          recentActivity: recentFollowUps.length
        })
      };

      return NextResponse.json({
        success: true,
        data: insights
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('Client follow-up insights error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate insights'
    }, { status: 500 });
  }
}

function generateRecommendations(metrics: {
  totalFollowUps: number;
  completedFollowUps: number;
  missedFollowUps: number;
  overdueCount: number;
  avgResponseTime: number;
  recentActivity: number;
}): string[] {
  const recommendations: string[] = [];

  const completionRate = metrics.totalFollowUps > 0 ? 
    metrics.completedFollowUps / metrics.totalFollowUps : 0;

  if (completionRate < 0.6) {
    recommendations.push('Consider adjusting follow-up scheduling or reminder frequency');
  }

  if (metrics.overdueCount > 3) {
    recommendations.push('Multiple overdue follow-ups - prioritize immediate contact');
  }

  if (metrics.avgResponseTime > 72) {
    recommendations.push('Long response times - consider more frequent reminders');
  }

  if (metrics.recentActivity === 0) {
    recommendations.push('No recent follow-up activity - schedule a check-in');
  }

  if (metrics.missedFollowUps / metrics.totalFollowUps > 0.3) {
    recommendations.push('High missed follow-up rate - review client preferences and timing');
  }

  if (recommendations.length === 0) {
    recommendations.push('Follow-up performance is good - maintain current approach');
  }

  return recommendations;
}