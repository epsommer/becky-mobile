// src/app/api/participants/[participantId]/route.ts
// API endpoints for individual participant management

import { NextRequest, NextResponse } from 'next/server';
import { participantManagementService } from '../../../../lib/participant-management';
import { UpdateParticipantRequest } from '../../../../types/participant-management';

/**
 * GET /api/participants/[participantId] - Get participant by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await context.params;

    const participant = await participantManagementService.getParticipant(participantId);

    if (!participant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Participant not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: participant,
    });

  } catch (error) {
    console.error('Error getting participant:', error);
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
 * PUT /api/participants/[participantId] - Update participant
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await context.params;
    const body = await request.json();

    const updateRequest: UpdateParticipantRequest = {
      id: participantId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      role: body.role,
      services: body.services,
      contactPreferences: body.contactPreferences,
    };

    const participant = await participantManagementService.updateParticipant(updateRequest);

    return NextResponse.json({
      success: true,
      data: participant,
    });

  } catch (error) {
    console.error('Error updating participant:', error);
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
 * DELETE /api/participants/[participantId] - Delete participant
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await context.params;

    await participantManagementService.deleteParticipant(participantId);

    return NextResponse.json({
      success: true,
      message: 'Participant deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting participant:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
