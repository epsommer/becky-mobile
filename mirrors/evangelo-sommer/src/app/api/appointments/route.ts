// src/app/api/appointments/route.ts
// API endpoints for appointment management

import { NextRequest, NextResponse } from 'next/server';
import { participantManagementService } from '../../../lib/participant-management';
import {
  CreateAppointmentRequest,
  AppointmentSearchFilters,
  ServiceType,
  AppointmentStatus,
} from '../../../types/participant-management';

/**
 * GET /api/appointments - Search appointments with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract search filters from query parameters
    const filters: AppointmentSearchFilters = {};
    
    if (searchParams.get('startDate')) {
      filters.startDate = searchParams.get('startDate')!;
    }
    if (searchParams.get('endDate')) {
      filters.endDate = searchParams.get('endDate')!;
    }
    if (searchParams.get('service')) {
      filters.service = searchParams.get('service') as ServiceType;
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status') as AppointmentStatus;
    }
    if (searchParams.get('organizerId')) {
      filters.organizerId = searchParams.get('organizerId')!;
    }
    if (searchParams.get('participantId')) {
      filters.participantId = searchParams.get('participantId')!;
    }
    if (searchParams.get('location')) {
      filters.location = searchParams.get('location')!;
    }

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await participantManagementService.searchAppointments(
      filters,
      page,
      limit
    );

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Error searching appointments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/appointments - Create a new appointment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title is required',
        },
        { status: 400 }
      );
    }
    if (!body.startTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Start time is required',
        },
        { status: 400 }
      );
    }
    if (!body.endTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'End time is required',
        },
        { status: 400 }
      );
    }
    if (!body.service) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service is required',
        },
        { status: 400 }
      );
    }
    if (!body.organizerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organizer ID is required',
        },
        { status: 400 }
      );
    }
    if (!body.participantIds || !Array.isArray(body.participantIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Participant IDs array is required',
        },
        { status: 400 }
      );
    }

    const createRequest: CreateAppointmentRequest = {
      title: body.title,
      description: body.description,
      startTime: body.startTime,
      endTime: body.endTime,
      timezone: body.timezone,
      service: body.service,
      location: body.location,
      organizerId: body.organizerId,
      participantIds: body.participantIds,
      voiceCommandData: body.voiceCommandData,
    };

    const appointment = await participantManagementService.createAppointment(createRequest);

    return NextResponse.json({
      success: true,
      data: appointment,
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
