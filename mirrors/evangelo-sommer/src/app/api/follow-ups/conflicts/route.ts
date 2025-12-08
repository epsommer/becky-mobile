import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { 
  ConflictCheckResponse,
  SchedulingConflict,
  AlternativeTimeSlot 
} from '@/types/follow-up';
import {
  BusinessHoursValidator,
  ConflictDetector,
  TimezoneUtils,
  DEFAULT_FOLLOW_UP_CONFIG
} from '@/lib/follow-up-utils';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');
    const startTime = url.searchParams.get('startTime');
    const duration = parseInt(url.searchParams.get('duration') || '60');
    const timezone = url.searchParams.get('timezone') || 'America/Toronto';
    const excludeId = url.searchParams.get('excludeId'); // For updates

    if (!clientId || !startTime) {
      return NextResponse.json({
        success: false,
        error: 'clientId and startTime are required'
      }, { status: 400 });
    }

    const proposedStart = new Date(startTime);
    const proposedEnd = new Date(proposedStart.getTime() + duration * 60000);

    if (isNaN(proposedStart.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid startTime format'
      }, { status: 400 });
    }

    // Check if client exists
    const client = await prisma.clientRecord.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    const conflicts: SchedulingConflict[] = [];

    // 1. Check business hours
    if (!BusinessHoursValidator.isWithinBusinessHours(
      proposedStart, 
      DEFAULT_FOLLOW_UP_CONFIG.businessHours, 
      timezone
    ) || !BusinessHoursValidator.isWithinBusinessHours(
      proposedEnd,
      DEFAULT_FOLLOW_UP_CONFIG.businessHours,
      timezone
    )) {
      conflicts.push({
        type: 'BUSINESS_HOURS',
        conflictId: 'business-hours',
        conflictTitle: 'Outside business hours',
        startTime: proposedStart,
        endTime: proposedEnd,
        severity: 'HIGH',
        suggestions: []
      });
    }

    // 2. Check existing follow-ups for this client
    const existingFollowUps = await prisma.followUp.findMany({
      where: {
        clientId,
        id: excludeId ? { not: excludeId } : undefined,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        OR: [
          {
            AND: [
              { scheduledDate: { lte: proposedEnd } },
              { 
                scheduledDate: { 
                  gte: new Date(proposedStart.getTime() - 60 * 60000) // 1 hour buffer
                }
              }
            ]
          }
        ]
      },
      include: {
        client: {
          select: { name: true }
        }
      }
    });

    for (const existingFollowUp of existingFollowUps) {
      const existingEnd = new Date(
        existingFollowUp.scheduledDate.getTime() + existingFollowUp.duration * 60000
      );
      
      // Check for time overlap
      if (proposedStart < existingEnd && proposedEnd > existingFollowUp.scheduledDate) {
        conflicts.push({
          type: 'FOLLOW_UP',
          conflictId: existingFollowUp.id,
          conflictTitle: `Existing follow-up: ${existingFollowUp.title}`,
          startTime: existingFollowUp.scheduledDate,
          endTime: existingEnd,
          severity: 'HIGH',
          suggestions: []
        });
      }
    }

    // 3. Check existing appointments for this client
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        participants: {
          some: {
            participant: {
              clientRecords: {
                some: {
                  id: clientId
                }
              }
            }
          }
        },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        OR: [
          {
            AND: [
              { startTime: { lte: proposedEnd } },
              { endTime: { gte: proposedStart } }
            ]
          }
        ]
      }
    });

    for (const appointment of existingAppointments) {
      if (proposedStart < appointment.endTime && proposedEnd > appointment.startTime) {
        conflicts.push({
          type: 'APPOINTMENT',
          conflictId: appointment.id,
          conflictTitle: `Existing appointment: ${appointment.title}`,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          severity: 'HIGH',
          suggestions: []
        });
      }
    }

    // 4. Check for high-frequency follow-ups (more than 2 in the same day)
    const sameDay = new Date(proposedStart);
    sameDay.setHours(0, 0, 0, 0);
    const nextDay = new Date(sameDay);
    nextDay.setDate(nextDay.getDate() + 1);

    const sameDayFollowUps = await prisma.followUp.count({
      where: {
        clientId,
        id: excludeId ? { not: excludeId } : undefined,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledDate: {
          gte: sameDay,
          lt: nextDay
        }
      }
    });

    if (sameDayFollowUps >= 2) {
      conflicts.push({
        type: 'FOLLOW_UP',
        conflictId: 'frequency-warning',
        conflictTitle: 'Multiple follow-ups scheduled for same day',
        startTime: sameDay,
        endTime: nextDay,
        severity: 'MEDIUM',
        suggestions: []
      });
    }

    // 5. Generate alternative time slots if conflicts exist
    const alternatives: AlternativeTimeSlot[] = [];
    
    if (conflicts.length > 0) {
      // Generate alternatives for the next 14 days
      const baseDate = new Date(proposedStart);
      const generatedAlternatives: AlternativeTimeSlot[] = [];

      for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const checkDate = new Date(baseDate);
        checkDate.setDate(checkDate.getDate() + dayOffset);
        
        // Try different hours of the day
        const businessHours = DEFAULT_FOLLOW_UP_CONFIG.businessHours;
        const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        const dayConfig = businessHours.find(bh => bh.day === dayName);
        
        if (dayConfig && dayConfig.isWorkingDay) {
          const startHour = parseInt(dayConfig.startTime.split(':')[0]);
          const endHour = parseInt(dayConfig.endTime.split(':')[0]);
          
          for (let hour = startHour; hour <= endHour - Math.ceil(duration / 60); hour++) {
            const slotStart = new Date(checkDate);
            slotStart.setHours(hour, 0, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            
            // Check if this slot conflicts with existing items
            const hasConflictWithFollowUps = existingFollowUps.some(fu => {
              const fuEnd = new Date(fu.scheduledDate.getTime() + fu.duration * 60000);
              return slotStart < fuEnd && slotEnd > fu.scheduledDate;
            });

            const hasConflictWithAppointments = existingAppointments.some(apt => 
              slotStart < apt.endTime && slotEnd > apt.startTime
            );

            if (!hasConflictWithFollowUps && !hasConflictWithAppointments) {
              const score = Math.max(
                100 - (dayOffset * 5) - (Math.abs(hour - proposedStart.getHours()) * 2),
                1
              );

              generatedAlternatives.push({
                startTime: slotStart,
                endTime: slotEnd,
                reason: dayOffset === 0 ? 
                  `Same day, ${hour}:00` : 
                  `${dayOffset} day${dayOffset > 1 ? 's' : ''} later, ${hour}:00`,
                score
              });
            }
          }
        }
      }

      // Sort by score and take top 10
      alternatives.push(...generatedAlternatives
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
      );
    }

    const response: ConflictCheckResponse = {
      success: true,
      conflicts,
      alternatives
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Conflict check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check for conflicts',
      conflicts: [],
      alternatives: []
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      clientId, 
      startTime, 
      endTime, 
      duration, 
      timezone = 'America/Toronto',
      checkAppointments = true,
      checkBusinessHours = true,
      bufferMinutes = 15
    } = body;

    if (!clientId || !startTime) {
      return NextResponse.json({
        success: false,
        error: 'clientId and startTime are required'
      }, { status: 400 });
    }

    const proposedStart = new Date(startTime);
    let proposedEnd: Date;

    if (endTime) {
      proposedEnd = new Date(endTime);
    } else if (duration) {
      proposedEnd = new Date(proposedStart.getTime() + duration * 60000);
    } else {
      proposedEnd = new Date(proposedStart.getTime() + 60 * 60000); // Default 1 hour
    }

    const conflicts: SchedulingConflict[] = [];

    // Advanced conflict detection with custom parameters
    if (checkBusinessHours) {
      const isStartInHours = BusinessHoursValidator.isWithinBusinessHours(
        proposedStart, 
        DEFAULT_FOLLOW_UP_CONFIG.businessHours, 
        timezone
      );
      const isEndInHours = BusinessHoursValidator.isWithinBusinessHours(
        proposedEnd,
        DEFAULT_FOLLOW_UP_CONFIG.businessHours,
        timezone
      );

      if (!isStartInHours || !isEndInHours) {
        const nextSlot = BusinessHoursValidator.getNextBusinessSlot(
          proposedStart,
          (proposedEnd.getTime() - proposedStart.getTime()) / 60000,
          DEFAULT_FOLLOW_UP_CONFIG.businessHours,
          timezone
        );

        conflicts.push({
          type: 'BUSINESS_HOURS',
          conflictId: 'business-hours',
          conflictTitle: 'Outside business hours',
          startTime: proposedStart,
          endTime: proposedEnd,
          severity: 'HIGH',
          suggestions: nextSlot ? [{
            startTime: nextSlot,
            endTime: new Date(nextSlot.getTime() + (proposedEnd.getTime() - proposedStart.getTime())),
            reason: 'Next available business hours',
            score: 85
          }] : []
        });
      }
    }

    // Check with buffer time
    const bufferStart = new Date(proposedStart.getTime() - bufferMinutes * 60000);
    const bufferEnd = new Date(proposedEnd.getTime() + bufferMinutes * 60000);

    // Check follow-ups with buffer
    const followUpConflicts = await prisma.followUp.findMany({
      where: {
        clientId,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        scheduledDate: {
          gte: bufferStart,
          lte: bufferEnd
        }
      }
    });

    for (const conflict of followUpConflicts) {
      const conflictEnd = new Date(conflict.scheduledDate.getTime() + conflict.duration * 60000);
      conflicts.push({
        type: 'FOLLOW_UP',
        conflictId: conflict.id,
        conflictTitle: `Follow-up: ${conflict.title}`,
        startTime: conflict.scheduledDate,
        endTime: conflictEnd,
        severity: 'HIGH',
        suggestions: []
      });
    }

    // Check appointments if requested
    if (checkAppointments) {
      const appointmentConflicts = await prisma.appointment.findMany({
        where: {
          participants: {
            some: {
              participant: {
                clientRecords: {
                  some: {
                    id: clientId
                  }
                }
              }
            }
          },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
          startTime: { lte: bufferEnd },
          endTime: { gte: bufferStart }
        }
      });

      for (const conflict of appointmentConflicts) {
        conflicts.push({
          type: 'APPOINTMENT',
          conflictId: conflict.id,
          conflictTitle: `Appointment: ${conflict.title}`,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          severity: 'HIGH',
          suggestions: []
        });
      }
    }

    return NextResponse.json({
      success: true,
      conflicts,
      alternatives: [] // Could generate alternatives here if needed
    });

  } catch (error) {
    console.error('Advanced conflict check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform conflict check',
      conflicts: [],
      alternatives: []
    }, { status: 500 });
  }
}