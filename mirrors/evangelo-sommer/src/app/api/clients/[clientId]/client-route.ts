import { NextRequest, NextResponse } from 'next/server';
import { ClientStatus } from '@prisma/client';
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma';
import { JsonFieldParsers, JsonFieldSerializers, transformClientRecordForResponse } from '@/lib/json-fields';

// Get Prisma client instance
const prisma = getPrismaClient();
const isDatabaseAvailable = isPrismaAvailable();


export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params;

    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'Client ID is required'
      }, { status: 400 });
    }

    // If database is not available, return error
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { 
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    // Database is available - use Prisma query
    console.log(`Database available - querying for client: ${clientId}`);
    
    const client = await prisma.clientRecord.findUnique({
      where: { id: clientId },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            services: true,
            contactPreferences: true
          }
        },
        serviceHistory: {
          orderBy: { serviceDate: 'desc' },
          take: 10,
          select: {
            id: true,
            serviceDate: true,
            serviceType: true,
            serviceArea: true,
            completionStatus: true,
            amount: true,
            currency: true,
            notes: true
          }
        },
        communications: {
          orderBy: { timestamp: 'desc' },
          take: 5,
          select: {
            id: true,
            timestamp: true,
            direction: true,
            channel: true,
            content: true,
            purpose: true,
            sentiment: true
          }
        },
        conversations: {
          where: { status: 'ACTIVE' },
          orderBy: { updatedAt: 'desc' },
          take: 3,
          select: {
            id: true,
            title: true,
            summary: true,
            status: true,
            priority: true,
            updatedAt: true
          }
        },
        followUps: {
          where: { 
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
            scheduledDate: { gte: new Date() }
          },
          orderBy: { scheduledDate: 'asc' },
          take: 5,
          select: {
            id: true,
            scheduledDate: true,
            title: true,
            category: true,
            priority: true,
            status: true
          }
        }
      }
    });

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    // Transform for response
    const transformedClient = transformClientRecordForResponse(client);

    return NextResponse.json({
      success: true,
      data: transformedClient
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Client retrieval error:', error);
    
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve client'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params;

    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'Client ID is required'
      }, { status: 400 });
    }

    // Check if database is available
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available - client updates require database connection'
      }, { status: 503 });
    }

    const body = await request.json();

    // Check if client exists
    const existingClient = await prisma.clientRecord.findUnique({
      where: { id: clientId },
      include: { participant: true }
    });

    if (!existingClient) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    // Update participant if needed
    const participantUpdateData: any = {};
    if (body.name) participantUpdateData.name = body.name;
    if (body.email !== undefined) participantUpdateData.email = body.email;
    if (body.phone !== undefined) participantUpdateData.phone = body.phone;
    if (body.company !== undefined) participantUpdateData.company = body.company;
    if (body.serviceTypes) participantUpdateData.services = JsonFieldSerializers.serializeStringArray(body.serviceTypes);
    if (body.contactPreferences) participantUpdateData.contactPreferences = JsonFieldSerializers.serializeContactPreferences(body.contactPreferences);

    if (Object.keys(participantUpdateData).length > 0) {
      await prisma.participant.update({
        where: { id: existingClient.participantId },
        data: participantUpdateData
      });
    }

    // Update client record
    const clientUpdateData: any = {};
    if (body.name) clientUpdateData.name = body.name;
    if (body.email !== undefined) clientUpdateData.email = body.email;
    if (body.phone !== undefined) clientUpdateData.phone = body.phone;
    if (body.company !== undefined) clientUpdateData.company = body.company;
    if (body.status) clientUpdateData.status = body.status;
    if (body.tags) clientUpdateData.tags = JsonFieldSerializers.serializeStringArray(body.tags);
    if (body.notes !== undefined) clientUpdateData.notes = body.notes;
    if (body.projectType !== undefined) clientUpdateData.projectType = body.projectType;
    if (body.serviceTypes) clientUpdateData.serviceTypes = JsonFieldSerializers.serializeStringArray(body.serviceTypes);
    if (body.budget !== undefined) clientUpdateData.budget = body.budget;
    if (body.timeline !== undefined) clientUpdateData.timeline = body.timeline;
    if (body.seasonalContract !== undefined) clientUpdateData.seasonalContract = body.seasonalContract;
    if (body.recurringService) clientUpdateData.recurringService = body.recurringService;
    if (body.address) clientUpdateData.address = JsonFieldSerializers.serializeAddress(body.address);
    if (body.metadata) clientUpdateData.metadata = JsonFieldSerializers.serializeObject(body.metadata);
    if (body.contactPreferences) clientUpdateData.contactPreferences = JsonFieldSerializers.serializeContactPreferences(body.contactPreferences);
    if (body.personalInfo) clientUpdateData.personalInfo = JsonFieldSerializers.serializeObject(body.personalInfo);
    if (body.serviceProfile) clientUpdateData.serviceProfile = JsonFieldSerializers.serializeObject(body.serviceProfile);
    if (body.billingInfo) clientUpdateData.billingInfo = JsonFieldSerializers.serializeObject(body.billingInfo);
    if (body.relationshipData) clientUpdateData.relationshipData = JsonFieldSerializers.serializeObject(body.relationshipData);

    const updatedClient = await prisma.clientRecord.update({
      where: { id: clientId },
      data: clientUpdateData,
      include: {
        participant: true
      }
    });

    // Transform for response
    const transformedClient = transformClientRecordForResponse(updatedClient);

    return NextResponse.json({
      success: true,
      data: transformedClient
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Client update error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update client'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params;

    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'Client ID is required'
      }, { status: 400 });
    }

    // Check if database is available
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available - client deletion requires database connection'
      }, { status: 503 });
    }

    // Check if client exists
    const existingClient = await prisma.clientRecord.findUnique({
      where: { id: clientId },
      select: { id: true, participantId: true, name: true }
    });

    if (!existingClient) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    // Delete client record (this will cascade to related records due to foreign key constraints)
    await prisma.clientRecord.delete({
      where: { id: clientId }
    });

    // Delete associated participant
    await prisma.participant.delete({
      where: { id: existingClient.participantId }
    });

    return NextResponse.json({
      success: true,
      message: `Client ${existingClient.name} has been deleted successfully`
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Client deletion error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete client'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}