// src/app/api/availability/route.ts
// API endpoint for checking participant availability

import { NextRequest, NextResponse } from 'next/server';
import { participantManagementService } from '../../../lib/participant-management';
import { AvailabilityRequest } from '../../../types/participant-management';

/**
 * POST /api/availability - Check availability for participants
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.participantIds || !Array.isArray(body.participantIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Participant IDs array is required',
        },
        { status: 400 }
      );
    }
    if (!body.startDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Start date is required',
        },
        { status: 400 }
      );
    }
    if (!body.endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'End date is required',
        },
        { status: 400 }
      );
    }
    if (!body.duration || typeof body.duration !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Duration (in minutes) is required',
        },
        { status: 400 }
      );
    }

    const availabilityRequest: AvailabilityRequest = {
      participantIds: body.participantIds,
      startDate: body.startDate,
      endDate: body.endDate,
      duration: body.duration,
      service: body.service,
    };

    const result = await participantManagementService.checkAvailability(availabilityRequest);

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
