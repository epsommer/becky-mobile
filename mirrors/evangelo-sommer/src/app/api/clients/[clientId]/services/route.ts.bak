import { NextRequest, NextResponse } from 'next/server';
import { ServiceType } from '@prisma/client';
import { 
  ClientService, 
  ClientServicesResponse, 
  ClientServicesData 
} from '@/types/client-services';
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma';
import { JsonFieldParsers, transformClientRecordForResponse } from '@/lib/json-fields';

// Get Prisma client instance using the singleton pattern
const prisma = getPrismaClient();
const isDatabaseAvailable = isPrismaAvailable();

// Service type to friendly name mapping
const SERVICE_NAMES: Record<ServiceType, string> = {
  LAWN_CARE: 'Lawn Care',
  LANDSCAPING: 'Landscaping',
  MAINTENANCE: 'Maintenance',
  SNOW_REMOVAL: 'Snow Removal',
  EMERGENCY: 'Emergency Service',
  CONSULTATION: 'Consultation',
  DESIGN: 'Design',
  INSTALLATION: 'Installation',
  TREE_TRIMMING: 'Tree Trimming',
  LAWN_MOWING: 'Lawn Mowing',
  HEDGE_TRIMMING: 'Hedge Trimming',
  WEEDING: 'Weeding',
  GARDENING_PLANTING: 'Gardening (Planting)',
  GARDENING_SEEDING: 'Gardening (Seeding)',
  MULCHING: 'Mulching',
  GUTTER_CLEANING: 'Gutter Cleaning',
  DETHATCHING: 'Dethatching',
  LEAF_REMOVAL: 'Leaf Removal/Fall Cleanup'
};


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'Client ID is required'
      } as ClientServicesResponse, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    // If database is not available, return error
    if (!isDatabaseAvailable || !prisma) {
      console.log(`Database not available for client: ${clientId}`);
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      } as ClientServicesResponse, { 
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    // Database is available - use Prisma queries
    console.log(`Database available - querying for client: ${clientId}`);
    
    let client;
    try {
      client = await prisma.clientRecord.findUnique({
        where: { id: clientId },
        include: {
          serviceHistory: {
            where: {
              serviceDate: {
                gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
              }
            },
            orderBy: { serviceDate: 'desc' },
            take: 50
          }
        }
      });
    } catch (dbError) {
      console.error('Database query failed:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database query failed'
      } as ClientServicesResponse, { 
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      } as ClientServicesResponse, { 
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    let services: ClientService[] = [];

    // Derive services from database data
    const serviceTypesArray = JsonFieldParsers.parseStringArray(client.serviceTypes);
    if (serviceTypesArray && serviceTypesArray.length > 0) {
      // Use serviceTypes from ClientRecord
      services = serviceTypesArray.map((serviceType, index) => {
        const mostRecentService = client.serviceHistory
          .find(record => record.serviceType === serviceType);
        
        return {
          id: `srv_${serviceType.toLowerCase()}_${client.id}_${index}`,
          type: serviceType as ServiceType,
          name: SERVICE_NAMES[serviceType as ServiceType] || serviceType,
          status: (mostRecentService?.completionStatus === 'COMPLETED' ? 'active' : 'pending') as 'active' | 'inactive' | 'pending',
          lastServiceDate: mostRecentService?.serviceDate.toISOString().split('T')[0],
          frequency: 'as-needed'
        };
      });
    } else {
      // Derive from service history if no serviceTypes set
      const uniqueServiceTypes = Array.from(
        new Set(client.serviceHistory.map(record => record.serviceType))
      );

      if (uniqueServiceTypes.length === 0) {
        // If no service history either, provide default landscaping services
        const defaultServices = [
          'LAWN_MOWING',
          'HEDGE_TRIMMING', 
          'TREE_TRIMMING',
          'LEAF_REMOVAL',
          'MULCHING'
        ];
        
        services = defaultServices.map((serviceType, index) => ({
          id: `srv_default_${serviceType.toLowerCase()}_${client.id}_${index}`,
          type: serviceType as ServiceType,
          name: SERVICE_NAMES[serviceType as ServiceType] || serviceType,
          status: 'active' as const,
          frequency: 'as-needed'
        }));
      } else {
        services = uniqueServiceTypes.map((serviceType, index) => {
          const mostRecentService = client.serviceHistory
            .find(record => record.serviceType === serviceType);
          
          const serviceCount = client.serviceHistory
            .filter(record => record.serviceType === serviceType).length;

          // Determine frequency based on historical data
          let frequency = 'as-needed';
          if (serviceCount >= 12) frequency = 'monthly';
          else if (serviceCount >= 4) frequency = 'seasonal';
          else if (serviceCount >= 2) frequency = 'semi-annual';

          return {
            id: `srv_${serviceType.toLowerCase()}_${client.id}_${index}`,
            type: serviceType,
            name: SERVICE_NAMES[serviceType] || serviceType,
            status: mostRecentService?.completionStatus === 'COMPLETED' ? 'active' : 'pending',
            lastServiceDate: mostRecentService?.serviceDate.toISOString().split('T')[0],
            frequency
          };
        });
      }
    }

    // Filter to only return active services for the dropdown
    const activeServices = services.filter(service => service.status === 'active');

    const response: ClientServicesResponse = {
      success: true,
      data: {
        clientId: client.id,
        clientName: client.name,
        services: activeServices
      }
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Client services retrieval error:', error);
    
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve client services'
    } as ClientServicesResponse, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}