// src/app/api/voice/booking/route.ts
// API endpoint for voice-command appointment booking

import { NextRequest, NextResponse } from 'next/server';
import { participantManagementService } from '../../../../lib/participant-management';
import { VoiceBookingRequest } from '../../../../types/participant-management';

/**
 * POST /api/voice/booking - Process voice booking request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.transcript) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transcript is required',
        },
        { status: 400 }
      );
    }

    const voiceRequest: VoiceBookingRequest = {
      transcript: body.transcript,
      voiceProvider: body.voiceProvider,
      sessionId: body.sessionId,
    };

    const result = await participantManagementService.processVoiceBooking(voiceRequest);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error processing voice booking:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
