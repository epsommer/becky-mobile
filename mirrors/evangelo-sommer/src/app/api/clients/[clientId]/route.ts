import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma';
import { transformClientRecordForResponse } from '@/lib/json-fields';
import { Client } from "../../../../types/client";
import { isValidEmail, isValidPhone } from "../../../../lib/client-profile-utils";

// Get Prisma client instance
const prisma = getPrismaClient();
const isDatabaseAvailable = isPrismaAvailable();

// GET /api/clients/[clientId]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await context.params;
    
    // If database is not available, return error
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 });
    }

    // Database is available - use Prisma query
    console.log(`Database available - querying client: ${clientId}`);

    const clientRecord = await prisma.clientRecord.findUnique({
      where: { id: clientId },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true
          }
        },
        serviceHistory: {
          take: 10,
          orderBy: { serviceDate: 'desc' },
          select: {
            id: true,
            serviceDate: true,
            serviceType: true,
            completionStatus: true,
            amount: true
          }
        },
        serviceContracts: {
          orderBy: [
            { isPrimary: 'desc' },
            { isActive: 'desc' },
            { createdAt: 'asc' }
          ],
          select: {
            id: true,
            serviceId: true,
            serviceLineId: true,
            serviceLine: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                color: true,
                isActive: true
              }
            },
            serviceName: true,
            serviceCategory: true,
            status: true,
            period: true,
            startDate: true,
            endDate: true,
            contractValue: true,
            frequency: true,
            notes: true,
            isActive: true,
            isPrimary: true,
            nextScheduled: true,
            lastCompleted: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    if (!clientRecord) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    // Transform client for response
    const transformedClient = transformClientRecordForResponse(clientRecord);

    return NextResponse.json({
      success: true,
      data: transformedClient
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch client"
    }, { status: 500 });
  }
}

// PATCH /api/clients/[clientId]
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await context.params;
    const updates = await request.json();

    // Validate required fields if they're being updated
    if (updates.email !== undefined && updates.email && !isValidEmail(updates.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (updates.phone !== undefined && updates.phone && !isValidPhone(updates.phone)) {
      return NextResponse.json(
        { error: "Invalid phone format" },
        { status: 400 }
      );
    }

    // If database is not available, return error
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 });
    }

    // Update client in database
    const updatedClient = await prisma.clientRecord.update({
      where: { id: clientId },
      data: {
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        company: updates.company,
        status: updates.status ? updates.status.toUpperCase() : undefined,
        projectType: updates.projectType,
        budget: updates.budget,
        timeline: updates.timeline,
        serviceTypes: updates.serviceTypes ? JSON.stringify(updates.serviceTypes) : undefined,
        notes: updates.notes,
        address: updates.address ? JSON.stringify(updates.address) : undefined,
        contactPreferences: updates.contactPreferences ? JSON.stringify(updates.contactPreferences) : undefined,
      },
      include: {
        participant: true
      }
    });

    const transformedClient = transformClientRecordForResponse(updatedClient);

    return NextResponse.json({
      success: true,
      data: transformedClient,
      message: "Client profile updated successfully"
    });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[clientId]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await context.params;

    // If database is not available, return error
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 });
    }

    // Delete client from database
    await prisma.clientRecord.delete({
      where: { id: clientId }
    });

    return NextResponse.json({
      success: true,
      message: "Client deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
