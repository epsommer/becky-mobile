import { NextRequest, NextResponse } from 'next/server';
import { integrateSMSDataToCRM } from '../../../../lib/crm-integration';
import { CRMIntegrationRequest } from '../../../../types/crm-integration';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const crmRequest: CRMIntegrationRequest = body;

    // Process the CRM integration on the server side
    const result = await integrateSMSDataToCRM(crmRequest);

    return NextResponse.json(result);
  } catch (error) {
    console.error('CRM Integration API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          processedAt: new Date().toISOString(),
          messagesProcessed: 0,
          clientsIdentified: 0,
          servicesDetected: 0,
          communicationsLogged: 0,
          processingTimeMs: 0,
          confidence: 0,
        },
      },
      { status: 500 }
    );
  }
}
