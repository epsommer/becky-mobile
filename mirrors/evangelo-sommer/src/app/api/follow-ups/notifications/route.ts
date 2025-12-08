import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { 
  ScheduleNotificationRequest,
  NotificationTemplate 
} from '@/types/follow-up';
import { NotificationScheduler } from '@/lib/follow-up-utils';

const prisma = new PrismaClient();

// Default notification templates
const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    type: 'REMINDER_7_DAYS',
    channel: 'EMAIL',
    subject: 'Follow-up Reminder - 1 Week Notice',
    content: `Hi {{clientName}},

This is a friendly reminder that you have a follow-up scheduled for {{followUpDate}} at {{followUpTime}}.

Follow-up Details:
- Title: {{followUpTitle}}
- Date: {{followUpDate}}
- Duration: {{duration}} minutes
{{#if notes}}
- Notes: {{notes}}
{{/if}}

If you need to reschedule, please contact us as soon as possible.

Best regards,
{{companyName}}`,
    variables: ['clientName', 'followUpDate', 'followUpTime', 'followUpTitle', 'duration', 'notes', 'companyName']
  },
  {
    type: 'REMINDER_24_HOURS',
    channel: 'SMS',
    content: 'Hi {{clientName}}, reminder: You have a follow-up tomorrow ({{followUpDate}}) at {{followUpTime}}. {{followUpTitle}}',
    variables: ['clientName', 'followUpDate', 'followUpTime', 'followUpTitle']
  },
  {
    type: 'REMINDER_1_HOUR',
    channel: 'SMS',
    content: 'Hi {{clientName}}, your follow-up "{{followUpTitle}}" is starting in 1 hour. See you soon!',
    variables: ['clientName', 'followUpTitle']
  },
  {
    type: 'COMPLETION_REQUEST',
    channel: 'EMAIL',
    subject: 'Follow-up Completion Required',
    content: `Hi Team,

The follow-up with {{clientName}} scheduled for {{followUpDate}} requires completion.

Follow-up Details:
- Client: {{clientName}}
- Date: {{followUpDate}}
- Title: {{followUpTitle}}

Please update the follow-up status and outcome in the system.

Thank you.`,
    variables: ['clientName', 'followUpDate', 'followUpTitle']
  }
];

// Schedule or trigger notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'schedule') {
      return await scheduleNotification(body);
    } else if (action === 'trigger') {
      return await triggerImmediateNotification(body);
    } else if (action === 'process-pending') {
      return await processPendingNotifications();
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use: schedule, trigger, or process-pending'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Notification handling error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to handle notification request'
    }, { status: 500 });
  }
}

// Get notification status and history
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const followUpId = url.searchParams.get('followUpId');
    const clientId = url.searchParams.get('clientId');
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (followUpId) {
      where.followUpId = followUpId;
    }
    
    if (clientId) {
      where.followUp = {
        clientId: clientId
      };
    }
    
    if (status) {
      where.status = { in: status.split(',') };
    }
    
    if (type) {
      where.type = { in: type.split(',') };
    }

    // Get notifications with follow-up and client info
    const notifications = await prisma.followUpNotification.findMany({
      where,
      include: {
        followUp: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { scheduledAt: 'desc' },
      skip,
      take: limit
    });

    // Get total count
    const total = await prisma.followUpNotification.count({ where });

    // Calculate statistics
    const stats = await prisma.followUpNotification.groupBy({
      by: ['status'],
      where: clientId ? {
        followUp: { clientId }
      } : followUpId ? {
        followUpId
      } : {},
      _count: true
    });

    const statistics = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: notifications,
      total,
      page,
      limit,
      statistics
    });

  } catch (error) {
    console.error('Notification retrieval error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve notifications'
    }, { status: 500 });
  }
}

async function scheduleNotification(data: ScheduleNotificationRequest) {
  const {
    followUpId,
    type,
    channel,
    recipient,
    scheduledAt,
    templateId,
    customContent
  } = data;

  // Verify follow-up exists
  const followUp = await prisma.followUp.findUnique({
    where: { id: followUpId },
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

  if (!followUp) {
    return NextResponse.json({
      success: false,
      error: 'Follow-up not found'
    }, { status: 404 });
  }

  // Get content from template or use custom content
  let content = customContent;
  
  if (!content) {
    const template = DEFAULT_TEMPLATES.find(t => t.type === type && t.channel === channel);
    if (template) {
      // Replace template variables
      content = replaceTemplateVariables(template.content, {
        clientName: followUp.client.name,
        followUpDate: followUp.scheduledDate.toLocaleDateString(),
        followUpTime: followUp.scheduledDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        followUpTitle: followUp.title || 'Follow-up',
        duration: followUp.duration.toString(),
        notes: followUp.notes || '',
        companyName: 'Your Company' // This could be configurable
      });
    } else {
      content = `Reminder: ${followUp.title || 'Follow-up'} scheduled for ${followUp.scheduledDate.toLocaleDateString()}`;
    }
  }

  // Create the notification
  const notification = await prisma.followUpNotification.create({
    data: {
      followUpId,
      type,
      channel,
      recipient,
      scheduledAt: new Date(scheduledAt),
      content,
      templateUsed: templateId || 'default'
    }
  });

  return NextResponse.json({
    success: true,
    data: notification,
    message: 'Notification scheduled successfully'
  });
}

async function triggerImmediateNotification(data: any) {
  const { followUpId, type, channel, recipient, content } = data;

  // Create and immediately send notification
  const notification = await prisma.followUpNotification.create({
    data: {
      followUpId,
      type,
      channel,
      recipient,
      scheduledAt: new Date(),
      content,
      status: 'PENDING'
    }
  });

  // Here you would integrate with actual notification services
  // For now, we'll simulate sending
  const sendResult = await simulateSendNotification(notification);
  
  // Update notification status
  await prisma.followUpNotification.update({
    where: { id: notification.id },
    data: {
      status: sendResult.success ? 'SENT' : 'FAILED',
      sentAt: sendResult.success ? new Date() : null,
      deliveredAt: sendResult.delivered ? new Date() : null,
      errorMessage: sendResult.error || null
    }
  });

  return NextResponse.json({
    success: true,
    data: notification,
    sendResult,
    message: 'Notification triggered'
  });
}

async function processPendingNotifications() {
  const now = new Date();
  
  // Get all pending notifications that should be sent
  const pendingNotifications = await prisma.followUpNotification.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: { lte: now }
    },
    include: {
      followUp: {
        include: {
          client: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      }
    },
    take: 100 // Process in batches
  });

  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const notification of pendingNotifications) {
    try {
      results.processed++;

      // Check if follow-up is still valid for notification
      if (notification.followUp.status === 'CANCELLED') {
        await prisma.followUpNotification.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED',
            errorMessage: 'Follow-up was cancelled'
          }
        });
        results.failed++;
        continue;
      }

      // Simulate sending notification
      const sendResult = await simulateSendNotification(notification);
      
      await prisma.followUpNotification.update({
        where: { id: notification.id },
        data: {
          status: sendResult.success ? 'SENT' : 'FAILED',
          sentAt: sendResult.success ? new Date() : null,
          deliveredAt: sendResult.delivered ? new Date() : null,
          errorMessage: sendResult.error || null,
          retryCount: notification.retryCount + 1
        }
      });

      if (sendResult.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`${notification.id}: ${sendResult.error}`);
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`${notification.id}: ${error}`);
      console.error('Notification processing error:', error);
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `Processed ${results.processed} notifications`
  });
}

// Simulate notification sending (replace with actual service integration)
async function simulateSendNotification(notification: any): Promise<{
  success: boolean;
  delivered: boolean;
  error?: string;
}> {
  // Simulate different outcomes based on channel
  if (notification.channel === 'EMAIL') {
    // Simulate email sending
    if (!notification.recipient.includes('@')) {
      return { success: false, delivered: false, error: 'Invalid email address' };
    }
    // 95% success rate for emails
    const success = Math.random() > 0.05;
    return { 
      success, 
      delivered: success && Math.random() > 0.1, // 90% delivery rate if sent
      error: success ? undefined : 'SMTP server error'
    };
  } 
  
  if (notification.channel === 'SMS') {
    // Simulate SMS sending
    if (notification.recipient.length < 10) {
      return { success: false, delivered: false, error: 'Invalid phone number' };
    }
    // 98% success rate for SMS
    const success = Math.random() > 0.02;
    return { 
      success, 
      delivered: success && Math.random() > 0.05, // 95% delivery rate if sent
      error: success ? undefined : 'SMS gateway error'
    };
  }

  return { success: true, delivered: true };
}

// Helper function to replace template variables
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  
  // Handle conditional blocks (basic implementation)
  result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
    return variables[condition] && variables[condition].trim() ? content : '';
  });
  
  return result;
}