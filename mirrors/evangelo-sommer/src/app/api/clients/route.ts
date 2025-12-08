import { NextRequest, NextResponse } from 'next/server';
import { ClientStatus, ServiceType } from '@prisma/client';
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma';
import { JsonFieldParsers, JsonFieldSerializers, transformClientRecordForResponse } from '@/lib/json-fields';
import { createClientSchema, validateRequest, sanitizeError } from '@/lib/validation';

// Get Prisma client instance
const prisma = getPrismaClient();
const isDatabaseAvailable = isPrismaAvailable();


export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status') as ClientStatus | null;
    const search = url.searchParams.get('search');

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

    // Database is available - use Prisma queries
    console.log('Database available - querying clients');

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count (simplified for debugging)
    const total = await prisma.clientRecord.count();

    // Get clients with pagination (simplified query for debugging)
    const skip = (page - 1) * limit;
    const clients = await prisma.clientRecord.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        serviceId: true,
        status: true,
        tags: true,
        notes: true,
        projectType: true,
        serviceTypes: true,
        budget: true,
        timeline: true,
        seasonalContract: true,
        recurringService: true,
        address: true,
        metadata: true,
        contactPreferences: true,
        personalInfo: true,
        serviceProfile: true,
        billingInfo: true,
        relationshipData: true,
        createdAt: true,
        updatedAt: true,
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit
    });

    // Transform clients for response
    const transformedClients = clients.map(transformClientRecordForResponse);

    return NextResponse.json({
      success: true,
      data: transformedClients,
      total,
      page,
      limit
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Clients listing error:', error);
    
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve clients'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if database is available
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available - client creation requires database connection'
      }, { status: 503 });
    }

    const body = await request.json();

    // Validate request body with Zod
    const validation = validateRequest(createClientSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        errors: validation.errors
      }, { status: 400 });
    }

    const validatedData = validation.data!;

    // Convert status to uppercase for Prisma enum
    const statusMap: Record<string, ClientStatus> = {
      'active': ClientStatus.ACTIVE,
      'inactive': ClientStatus.INACTIVE,
      'prospect': ClientStatus.PROSPECT,
      'completed': ClientStatus.COMPLETED
    };
    const prismaStatus: ClientStatus = validatedData.status ? statusMap[validatedData.status.toLowerCase()] || ClientStatus.ACTIVE : ClientStatus.ACTIVE;

    // Handle household creation or assignment
    let householdId = null;
    let isPrimaryContact = false;
    let relationshipRole = null;

    // Check if adding to existing household
    if (body.existingHouseholdId) {
      householdId = body.existingHouseholdId;
      isPrimaryContact = body.isPrimaryContact || false;
      relationshipRole = body.relationshipRole || null;
    }
    // Otherwise, create new household if requested
    else if (body.household) {
      const householdData = body.household;

      // Create household first
      const household = await prisma.household.create({
        data: {
          name: householdData.name,
          accountType: householdData.accountType || 'PERSONAL',
          address: householdData.address ? JsonFieldSerializers.serializeAddress(householdData.address) : undefined,
          notes: householdData.notes || null,
          tags: householdData.tags ? JsonFieldSerializers.serializeStringArray(householdData.tags) : undefined,
          billingPreferences: householdData.billingPreferences ? JsonFieldSerializers.serializeObject(householdData.billingPreferences) : undefined,
        }
      });

      householdId = household.id;
      isPrimaryContact = householdData.isPrimaryContact || false;
      relationshipRole = householdData.relationshipRole || null;
    }

    // Clean phone and email - only use if non-empty (already validated by Zod)
    const cleanPhone = validatedData.phone && validatedData.phone.trim() ? validatedData.phone.trim() : null;
    const cleanEmail = validatedData.email && validatedData.email.trim() ? validatedData.email.trim() : null;

    // Try to find existing participant with same phone or email
    let participant = null;
    if (cleanPhone || cleanEmail) {
      const searchConditions = [];
      if (cleanPhone) searchConditions.push({ phone: cleanPhone });
      if (cleanEmail) searchConditions.push({ email: cleanEmail });

      participant = await prisma.participant.findFirst({
        where: {
          OR: searchConditions
        }
      });
    }

    // Create participant if not found
    if (!participant) {
      participant = await prisma.participant.create({
        data: {
          name: validatedData.name,
          email: cleanEmail,
          phone: cleanPhone,
          company: validatedData.company || null,
          role: 'CLIENT',
          services: validatedData.services ? JsonFieldSerializers.serializeStringArray(validatedData.services) : undefined,
          contactPreferences: undefined // Not in validation schema yet
        }
      });
    }

    // Create client record (using validated data for core fields)
    const client = await prisma.clientRecord.create({
      data: {
        id: body.id, // Use provided ID if available (not validated - internal use)
        participantId: participant.id,
        name: validatedData.name,
        email: cleanEmail,
        phone: cleanPhone,
        company: validatedData.company || null,
        serviceId: body.serviceId || `client_${Date.now()}`,
        status: prismaStatus,
        tags: body.tags ? JsonFieldSerializers.serializeStringArray(body.tags) : undefined,
        notes: validatedData.notes || null,
        projectType: body.projectType || null,
        serviceTypes: body.serviceTypes ? JsonFieldSerializers.serializeStringArray(body.serviceTypes) : undefined,
        budget: body.budget || null,
        timeline: body.timeline || null,
        seasonalContract: body.seasonalContract || false,
        recurringService: body.recurringService || 'ONE_TIME',
        address: body.address ? JsonFieldSerializers.serializeAddress(body.address) : undefined,
        metadata: body.metadata ? JsonFieldSerializers.serializeObject(body.metadata) : undefined,
        contactPreferences: body.contactPreferences ? JsonFieldSerializers.serializeContactPreferences(body.contactPreferences) : undefined,
        personalInfo: body.personalInfo ? JsonFieldSerializers.serializeObject(body.personalInfo) : undefined,
        serviceProfile: body.serviceProfile ? JsonFieldSerializers.serializeObject(body.serviceProfile) : undefined,
        billingInfo: body.billingInfo ? JsonFieldSerializers.serializeObject(body.billingInfo) : undefined,
        relationshipData: body.relationshipData ? JsonFieldSerializers.serializeObject(body.relationshipData) : undefined,
        // Household relationship fields
        householdId: householdId,
        isPrimaryContact: isPrimaryContact,
        relationshipRole: relationshipRole
      },
      include: {
        participant: true,
        household: true
      }
    });

    // If this client is marked as primary contact, update the household
    if (householdId && isPrimaryContact) {
      await prisma.household.update({
        where: { id: householdId },
        data: { primaryContactId: client.id }
      });
    }

    // Transform for response
    const transformedClient = transformClientRecordForResponse(client);

    return NextResponse.json({
      success: true,
      data: transformedClient
    }, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Client creation error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json({
      success: false,
      error: 'Failed to create client',
      // Only include error details in development
      ...(isDevelopment && {
        details: error instanceof Error ? error.message : String(error)
      })
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}