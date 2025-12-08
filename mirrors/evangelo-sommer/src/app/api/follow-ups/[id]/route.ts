import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { 
  UpdateFollowUpRequest,
  CompleteFollowUpRequest,
  FollowUpResponse,
  FollowUpError 
} from '@/types/follow-up';
import {
  FollowUpValidator,
  FollowUpStatusManager,
  BusinessHoursValidator,
  ConflictDetector,
  DEFAULT_FOLLOW_UP_CONFIG
} from '@/lib/follow-up-utils';

const prisma = new PrismaClient();

// Get a specific follow-up
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const followUp = await prisma.followUp.findUnique({
      where: { id },
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
          orderBy: { scheduledAt: 'desc' }
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
            scheduledDate: true,
            recurrencePattern: true
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

    return NextResponse.json({
      success: true,
      data: followUp
    });

  } catch (error) {
    console.error('Follow-up retrieval error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve follow-up'
    }, { status: 500 });
  }
}

// Update a follow-up
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json() as UpdateFollowUpRequest;

    // Validate the update request
    const validation = FollowUpValidator.validateUpdateRequest(body);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }

    // Get current follow-up
    const existingFollowUp = await prisma.followUp.findUnique({
      where: { id },
      include: {
        client: true
      }
    });

    if (!existingFollowUp) {
      return NextResponse.json({
        success: false,
        error: 'Follow-up not found'
      }, { status: 404 });
    }

    // Validate status transition if status is being updated
    if (body.status && !FollowUpStatusManager.canTransitionTo(existingFollowUp.status, body.status)) {
      return NextResponse.json({
        success: false,
        error: `Cannot transition from ${existingFollowUp.status} to ${body.status}`
      }, { status: 400 });
    }

    // If rescheduling, validate new time
    if (body.scheduledDate) {
      const newScheduledDate = new Date(body.scheduledDate);
      const duration = body.duration || existingFollowUp.duration;
      const endTime = new Date(newScheduledDate.getTime() + duration * 60000);
      const timezone = body.timezone || existingFollowUp.timezone;

      // Check business hours
      if (!BusinessHoursValidator.isWithinBusinessHours(
        newScheduledDate, 
        DEFAULT_FOLLOW_UP_CONFIG.businessHours, 
        timezone
      )) {
        return NextResponse.json({
          success: false,
          error: 'New time is outside business hours'
        }, { status: 409 });
      }

      // Check for conflicts
      const conflicts = await ConflictDetector.detectConflicts(
        newScheduledDate,
        endTime,
        existingFollowUp.clientId,
        id // Exclude current follow-up from conflict check
      );

      if (conflicts.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Scheduling conflicts detected',
          conflicts
        } as any, { status: 409 });
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (body.scheduledDate) updateData.scheduledDate = new Date(body.scheduledDate);
    if (body.timezone) updateData.timezone = body.timezone;
    if (body.duration) updateData.duration = body.duration;
    if (body.title) updateData.title = body.title;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.outcome !== undefined) updateData.outcome = body.outcome;
    if (body.actionItems) updateData.actionItems = body.actionItems;
    if (body.priority) updateData.priority = body.priority;
    if (body.category) updateData.category = body.category;
    if (body.status) updateData.status = body.status;

    // Update the follow-up
    const updatedFollowUp = await prisma.followUp.update({
      where: { id },
      data: updateData,
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
        notifications: true,
        childFollowUps: {
          select: {
            id: true,
            scheduledDate: true,
            status: true,
            title: true
          }
        }
      }
    });

    // If status changed to COMPLETED, create follow-up notification
    if (body.status === 'COMPLETED' && existingFollowUp.status !== 'COMPLETED') {
      await prisma.followUpNotification.create({
        data: {
          followUpId: id,
          type: 'OUTCOME_SUMMARY',
          channel: 'EMAIL',
          recipient: existingFollowUp.client.email || 'admin@company.com',
          scheduledAt: new Date(),
          content: `Follow-up completed: ${updatedFollowUp.title}\nOutcome: ${body.outcome || 'No outcome specified'}`
        }
      });
    }

    // If rescheduled, update child follow-ups for recurring series
    if (body.scheduledDate && updatedFollowUp.recurrencePattern !== 'NONE') {
      // This would update the recurring series - implementation depends on business logic
      // For now, we'll leave child follow-ups as-is
    }

    const response: FollowUpResponse = {
      success: true,
      data: updatedFollowUp as any // Type cast needed due to partial childFollowUps selection
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Follow-up update error:', error);
    
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
      error: 'Failed to update follow-up'
    }, { status: 500 });
  }
}

// Delete/Cancel a follow-up
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const reason = url.searchParams.get('reason') || 'Cancelled by user';
    const cancelRecurring = url.searchParams.get('cancelRecurring') === 'true';

    // Get the follow-up
    const followUp = await prisma.followUp.findUnique({
      where: { id },
      include: {
        childFollowUps: true,
        client: true
      }
    });

    if (!followUp) {
      return NextResponse.json({
        success: false,
        error: 'Follow-up not found'
      }, { status: 404 });
    }

    // Start a transaction to handle cancellation
    await prisma.$transaction(async (tx) => {
      // Update the follow-up status to cancelled
      await tx.followUp.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: followUp.notes ? `${followUp.notes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`
        }
      });

      // Cancel pending notifications
      await tx.followUpNotification.updateMany({
        where: {
          followUpId: id,
          status: 'PENDING'
        },
        data: {
          status: 'FAILED',
          errorMessage: 'Follow-up cancelled'
        }
      });

      // If this is a recurring follow-up and user wants to cancel the series
      if (cancelRecurring && followUp.childFollowUps.length > 0) {
        const futureChildIds = followUp.childFollowUps
          .filter(child => child.scheduledDate > new Date() && child.status === 'SCHEDULED')
          .map(child => child.id);

        if (futureChildIds.length > 0) {
          await tx.followUp.updateMany({
            where: {
              id: { in: futureChildIds }
            },
            data: {
              status: 'CANCELLED',
              notes: `Cancelled as part of recurring series: ${reason}`
            }
          });

          // Cancel notifications for child follow-ups
          await tx.followUpNotification.updateMany({
            where: {
              followUpId: { in: futureChildIds },
              status: 'PENDING'
            },
            data: {
              status: 'FAILED',
              errorMessage: 'Recurring series cancelled'
            }
          });
        }
      }

      // Create cancellation notification
      if (followUp.client.email) {
        await tx.followUpNotification.create({
          data: {
            followUpId: id,
            type: 'RESCHEDULE_REQUEST',
            channel: 'EMAIL',
            recipient: followUp.client.email,
            scheduledAt: new Date(),
            content: `Your follow-up "${followUp.title}" scheduled for ${followUp.scheduledDate.toLocaleDateString()} has been cancelled.\nReason: ${reason}`
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: cancelRecurring ? 'Follow-up and recurring series cancelled' : 'Follow-up cancelled'
    });

  } catch (error) {
    console.error('Follow-up deletion error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cancel follow-up'
    }, { status: 500 });
  }
}

// Complete a follow-up with outcome
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json() as CompleteFollowUpRequest;

    if (!body.outcome) {
      return NextResponse.json({
        success: false,
        error: 'Outcome is required to complete follow-up'
      }, { status: 400 });
    }

    // Get the follow-up
    const followUp = await prisma.followUp.findUnique({
      where: { id },
      include: { client: true }
    });

    if (!followUp) {
      return NextResponse.json({
        success: false,
        error: 'Follow-up not found'
      }, { status: 404 });
    }

    // Validate status transition
    if (!FollowUpStatusManager.canTransitionTo(followUp.status, 'COMPLETED')) {
      return NextResponse.json({
        success: false,
        error: `Cannot mark follow-up as completed from ${followUp.status} status`
      }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Update the follow-up
      await tx.followUp.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          outcome: body.outcome,
          actionItems: body.actionItems || [],
          notes: body.notes ? 
            (followUp.notes ? `${followUp.notes}\n\nCompletion Notes: ${body.notes}` : body.notes) :
            followUp.notes
        }
      });

      // Create completion notification
      if (followUp.client.email) {
        await tx.followUpNotification.create({
          data: {
            followUpId: id,
            type: 'OUTCOME_SUMMARY',
            channel: 'EMAIL',
            recipient: followUp.client.email,
            scheduledAt: new Date(),
            content: `Follow-up completed: ${followUp.title}\n\nOutcome: ${body.outcome}\n\n${body.actionItems && body.actionItems.length > 0 ? `Action Items:\n${body.actionItems.map(item => `• ${item}`).join('\n')}` : ''}`
          }
        });
      }

      // Schedule next follow-up if requested
      if (body.scheduleNext && body.nextFollowUpDate) {
        const nextDate = new Date(body.nextFollowUpDate);
        
        await tx.followUp.create({
          data: {
            clientId: followUp.clientId,
            serviceId: followUp.serviceId,
            scheduledDate: nextDate,
            timezone: followUp.timezone,
            duration: followUp.duration,
            title: `Follow-up: ${followUp.client.name}`,
            notes: body.nextFollowUpNotes,
            priority: followUp.priority,
            category: followUp.category,
            recurrencePattern: 'NONE',
            actionItems: []
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Follow-up completed successfully',
      nextScheduled: body.scheduleNext && body.nextFollowUpDate
    });

  } catch (error) {
    console.error('Follow-up completion error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to complete follow-up'
    }, { status: 500 });
  }
}