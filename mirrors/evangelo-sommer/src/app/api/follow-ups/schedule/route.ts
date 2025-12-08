import { NextRequest, NextResponse } from 'next/server';
import { 
  CreateFollowUpRequest, 
  FollowUpResponse,
  FollowUpError 
} from '@/types/follow-up';
import {
  BusinessHoursValidator,
  ConflictDetector,
  RecurrenceGenerator,
  FollowUpValidator,
  FollowUpClassifier,
  NotificationScheduler,
  DEFAULT_FOLLOW_UP_CONFIG
} from '@/lib/follow-up-utils';
import { getPrismaClient, isPrismaAvailable, testPrismaConnection } from '@/lib/prisma';
import { checkDatabaseHealth, withDatabaseRetry } from '@/lib/db-health';
import { JsonFieldSerializers, transformFollowUpForResponse } from '@/lib/json-fields';

// Get Prisma client instance
const prisma = getPrismaClient();
const isDatabaseAvailable = isPrismaAvailable();

export async function POST(request: NextRequest) {
  try {
    // Comprehensive database health check
    const dbHealth = await checkDatabaseHealth();
    
    if (!dbHealth.isConnected || !isDatabaseAvailable || !prisma) {
      console.error('Database health check failed:', {
        isConnected: dbHealth.isConnected,
        status: dbHealth.status,
        error: dbHealth.error,
        responseTime: dbHealth.responseTime,
        prismaAvailable: isDatabaseAvailable
      });

      return NextResponse.json({
        success: false,
        error: 'Database not available - follow-up scheduling requires database connection',
        details: {
          status: dbHealth.status,
          error: dbHealth.error,
          responseTime: dbHealth.responseTime
        }
      }, { status: 503 });
    }

    const body = await request.json() as CreateFollowUpRequest;
    
    // Validate the request
    const validation = FollowUpValidator.validateScheduleRequest(body);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }

    const {
      clientId,
      serviceId,
      scheduledDate,
      timezone = 'America/Toronto',
      duration = 60,
      title,
      notes,
      priority,
      category,
      recurrencePattern,
      recurrenceData,
      reminderDays = [7, 1],
      customInterval,
      customIntervalUnit
    } = body;

    // Verify client exists with retry logic
    const client = await withDatabaseRetry(async () => {
      return await prisma!.clientRecord.findUnique({
        where: { id: clientId },
        include: { participant: true }
      });
    });

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    const followUpDate = new Date(scheduledDate);
    const endTime = new Date(followUpDate.getTime() + duration * 60000);

    // Check business hours
    if (!BusinessHoursValidator.isWithinBusinessHours(
      followUpDate, 
      DEFAULT_FOLLOW_UP_CONFIG.businessHours, 
      timezone
    )) {
      const nextSlot = BusinessHoursValidator.getNextBusinessSlot(
        followUpDate,
        duration,
        DEFAULT_FOLLOW_UP_CONFIG.businessHours,
        timezone
      );

      return NextResponse.json({
        success: false,
        error: 'Requested time is outside business hours',
        conflicts: [{
          type: 'BUSINESS_HOURS' as const,
          conflictId: 'business-hours',
          conflictTitle: 'Outside business hours',
          startTime: followUpDate,
          endTime: endTime,
          severity: 'HIGH' as const,
          suggestions: nextSlot ? [{
            startTime: nextSlot,
            endTime: new Date(nextSlot.getTime() + duration * 60000),
            reason: 'Next available business hours slot',
            score: 90
          }] : []
        }]
      } as FollowUpResponse, { status: 409 });
    }

    // Check for conflicts
    const conflicts = await ConflictDetector.detectConflicts(
      followUpDate,
      endTime,
      clientId
    );

    if (conflicts.length > 0) {
      const alternatives = ConflictDetector.generateAlternatives(
        followUpDate,
        duration,
        conflicts,
        DEFAULT_FOLLOW_UP_CONFIG.businessHours,
        timezone
      );

      return NextResponse.json({
        success: false,
        error: 'Scheduling conflicts detected',
        conflicts,
        alternatives
      } as any, { status: 409 });
    }

    // Determine priority if not provided
    const finalPriority = priority || FollowUpClassifier.determinePriority(
      category || 'GENERAL',
      'MEDIUM' // This could be derived from client data
    );

    // Suggest category if not provided
    const finalCategory = category || FollowUpClassifier.suggestCategory(
      serviceId,
      [], // Previous interactions could be passed here
      undefined // Time from last service
    );

    // Create the follow-up
    const followUp = await prisma.followUp.create({
      data: {
        clientId,
        serviceId,
        scheduledDate: followUpDate,
        timezone,
        duration,
        title: title || `Follow-up with ${client.name}`,
        notes,
        priority: finalPriority,
        category: finalCategory,
        recurrencePattern: recurrencePattern || 'NONE',
        recurrenceData: recurrenceData ? JsonFieldSerializers.serializeObject(recurrenceData) : undefined,
        customInterval,
        customIntervalUnit,
        actionItems: JsonFieldSerializers.serializeStringArray([])
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
        notifications: true
      }
    });

    // Schedule reminder notifications
    const reminderTimes = NotificationScheduler.calculateReminderTimes(
      followUpDate,
      reminderDays,
      timezone
    );

    const notifications = [];
    for (const reminderTime of reminderTimes) {
      const daysBefore = Math.ceil((followUpDate.getTime() - reminderTime.getTime()) / (1000 * 60 * 60 * 24));
      
      // Create email notification
      if (client.email && DEFAULT_FOLLOW_UP_CONFIG.enableEmailNotifications) {
        const emailNotification = await prisma.followUpNotification.create({
          data: {
            followUpId: followUp.id,
            type: daysBefore === 7 ? 'REMINDER_7_DAYS' : 'REMINDER_24_HOURS',
            channel: 'EMAIL',
            recipient: client.email,
            scheduledAt: reminderTime,
            content: `Reminder: You have a follow-up scheduled for ${followUpDate.toLocaleDateString()}`
          }
        });
        notifications.push(emailNotification);
      }

      // Create SMS notification if phone available
      if (client.phone && DEFAULT_FOLLOW_UP_CONFIG.enableSMSNotifications) {
        const smsNotification = await prisma.followUpNotification.create({
          data: {
            followUpId: followUp.id,
            type: daysBefore === 7 ? 'REMINDER_7_DAYS' : 'REMINDER_24_HOURS',
            channel: 'SMS',
            recipient: client.phone,
            scheduledAt: reminderTime,
            content: `Hi ${client.name}, reminder: Follow-up on ${followUpDate.toLocaleDateString()}`
          }
        });
        notifications.push(smsNotification);
      }
    }

    // Handle recurring follow-ups
    if (recurrencePattern && recurrencePattern !== 'NONE') {
      // For custom recurrence, create a basic config if recurrenceData is not provided
      let effectiveRecurrenceData = recurrenceData;
      
      if (!effectiveRecurrenceData) {
        effectiveRecurrenceData = {
          pattern: recurrencePattern,
          interval: customInterval || 1
        };
      }
      
      // Validate custom recurrence parameters for CUSTOM pattern
      if (recurrencePattern === 'CUSTOM' && (!customInterval || !customIntervalUnit)) {
        return NextResponse.json({
          success: false,
          error: 'Custom recurrence requires customInterval and customIntervalUnit parameters'
        }, { status: 400 });
      }
      
      const recurrenceDates = RecurrenceGenerator.generateRecurrencePattern(
        followUpDate,
        effectiveRecurrenceData,
        10, // Limit to next 10 occurrences
        customInterval,
        customIntervalUnit
      );

      // Create child follow-ups for recurring series
      for (let i = 1; i < recurrenceDates.length; i++) {
        await prisma.followUp.create({
          data: {
            clientId,
            serviceId,
            scheduledDate: recurrenceDates[i],
            timezone,
            duration,
            title: title || `Follow-up with ${client.name}`,
            notes,
            priority: finalPriority,
            category: finalCategory,
            recurrencePattern: 'NONE', // Child follow-ups are not recursive
            parentFollowUpId: followUp.id,
            customInterval,
            customIntervalUnit,
            actionItems: JsonFieldSerializers.serializeStringArray([])
          }
        });
      }
    }

    // Update the follow-up with next reminder time
    const nextReminderTime = reminderTimes.find(time => time > new Date());
    if (nextReminderTime) {
      await prisma.followUp.update({
        where: { id: followUp.id },
        data: {
          nextReminderAt: nextReminderTime,
          notificationsSent: JsonFieldSerializers.serializeObject({
            scheduled: notifications.length,
            lastScheduledAt: new Date()
          })
        }
      });
    }

    // Transform the follow-up data for response
    const transformedFollowUp = transformFollowUpForResponse(followUp);

    const response: FollowUpResponse = {
      success: true,
      data: {
        ...transformedFollowUp,
        notifications,
        // Include custom recurrence information in response
        customRecurrence: customInterval && customIntervalUnit ? {
          interval: customInterval,
          unit: customIntervalUnit,
          description: `Every ${customInterval} ${customIntervalUnit}${customInterval > 1 ? 's' : ''}`
        } : undefined
      }
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Follow-up scheduling error:', error);
    
    if (error instanceof FollowUpError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error.details
      }, { 
        status: error.code === 'NOT_FOUND' ? 404 : 
               error.code === 'CONFLICT' ? 409 :
               error.code === 'VALIDATION' ? 400 : 500 
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if database is available
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const clientId = url.searchParams.get('clientId');
    const upcomingOnly = url.searchParams.get('upcomingOnly') === 'true';
    const overdueOnly = url.searchParams.get('overdueOnly') === 'true';

    const skip = (page - 1) * limit;
    const now = new Date();

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (category) {
      where.category = category;
    }
    
    if (clientId) {
      where.clientId = clientId;
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

    // Get follow-ups with pagination
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
          where: {
            status: { in: ['PENDING', 'SENT'] }
          }
        },
        childFollowUps: {
          select: {
            id: true,
            scheduledDate: true,
            status: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' },
      skip,
      take: limit
    });

    // Transform all follow-ups for response
    const transformedFollowUps = followUps.map(followUp => 
      transformFollowUpForResponse(followUp)
    );

    return NextResponse.json({
      success: true,
      data: transformedFollowUps,
      total,
      page,
      limit
    });

  } catch (error) {
    console.error('Follow-up listing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve follow-ups'
    }, { status: 500 });
  }
}