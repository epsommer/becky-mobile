import { NextRequest, NextResponse } from 'next/server';
import { getRecentActivities, getClientActivities, logActivity } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const clientId = searchParams.get('clientId');

    let result;
    if (clientId) {
      result = await getClientActivities(clientId, limit);
    } else {
      result = await getRecentActivities(limit);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      activities: result.activities,
    });
  } catch (error) {
    console.error('Activity log API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await logActivity({
      activityType: body.activityType,
      action: body.action,
      entityType: body.entityType,
      entityId: body.entityId,
      clientId: body.clientId,
      description: body.description,
      metadata: body.metadata,
      userId: body.userId,
      userName: body.userName,
      userRole: body.userRole,
      deploymentInfo: body.deploymentInfo,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to log activity' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      activity: result.activity,
    });
  } catch (error) {
    console.error('Activity log POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
