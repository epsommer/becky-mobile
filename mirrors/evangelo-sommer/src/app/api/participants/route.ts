// src/app/api/participants/route.ts
// API endpoints for participant management

import { NextRequest, NextResponse } from 'next/server';
import { participantManagementService } from '../../../lib/participant-management';
import {
  CreateParticipantRequest,
  ParticipantSearchFilters,
} from '../../../types/participant-management';

/**
 * GET /api/participants - Search participants with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract search filters from query parameters
    const filters: ParticipantSearchFilters = {};
    
    if (searchParams.get('name')) {
      filters.name = searchParams.get('name')!;
    }
    if (searchParams.get('email')) {
      filters.email = searchParams.get('email')!;
    }
    if (searchParams.get('phone')) {
      filters.phone = searchParams.get('phone')!;
    }
    if (searchParams.get('role')) {
      filters.role = searchParams.get('role') as any;
    }
    if (searchParams.get('company')) {
      filters.company = searchParams.get('company')!;
    }
    if (searchParams.get('services')) {
      filters.services = searchParams.get('services')!.split(',') as any[];
    }

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await participantManagementService.searchParticipants(
      filters,
      page,
      limit
    );

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Error searching participants:', error);
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
 * POST /api/participants - Create a new participant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name is required',
        },
        { status: 400 }
      );
    }

    const createRequest: CreateParticipantRequest = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      role: body.role,
      services: body.services,
      contactPreferences: body.contactPreferences,
    };

    const participant = await participantManagementService.createParticipant(createRequest);

    return NextResponse.json({
      success: true,
      data: participant,
    });

  } catch (error) {
    console.error('Error creating participant:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
