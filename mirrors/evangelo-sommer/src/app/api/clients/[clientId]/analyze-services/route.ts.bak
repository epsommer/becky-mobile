import { NextRequest, NextResponse } from 'next/server';
import { ServiceType } from '@prisma/client';
import { clientManager } from '@/lib/client-config';
import { getPrismaClient } from '@/lib/prisma';
import { 
  ServiceDetector, 
  DetectedService, 
  ServiceRecommendation,
  ServiceDetectionUtils 
} from '@/lib/service-detection';
import { ServiceMapper } from '@/lib/service-type-mapping';

// Response interfaces
export interface ServiceAnalysisResponse {
  success: boolean;
  data?: {
    clientId: string;
    clientName: string;
    analysisResults: {
      totalMessages: number;
      messagesAnalyzed: number;
      detectedServices: DetectedService[];
      newServices: DetectedService[];
      recommendations: ServiceRecommendation[];
      currentServices: string[];
    };
    analysis: {
      confidenceDistribution: Record<string, number>;
      serviceFrequency: Record<string, number>;
      timeRange: {
        earliest: string;
        latest: string;
      };
    };
  };
  error?: string;
}

// GET /api/clients/[clientId]/analyze-services
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
      } as ServiceAnalysisResponse, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get client information
    const client = clientManager.getClient(clientId);
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      } as ServiceAnalysisResponse, { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all conversations for this client from database
    const prisma = getPrismaClient();
    let conversations: any[] = [];
    
    if (prisma) {
      try {
        const dbConversations = await prisma.conversation.findMany({
          where: { clientId },
          include: {
            messages: {
              orderBy: { timestamp: 'asc' }
            }
          }
        });
        
        // Transform database conversations to match expected format
        conversations = dbConversations.map(conv => ({
          ...conv,
          messages: conv.messages.map(msg => ({
            ...msg,
            role: msg.role.toLowerCase(),
            type: msg.type.toLowerCase(),
            metadata: msg.metadata ? JSON.parse(msg.metadata as string) : {}
          }))
        }));
      } catch (dbError) {
        console.error('Database error fetching conversations:', dbError);
      }
    }
    
    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No conversations found for this client'
      } as ServiceAnalysisResponse, { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Collect all messages from all conversations
    const allMessages: any[] = [];
    conversations.forEach(conversation => {
      allMessages.push(...conversation.messages);
    });

    // Sort messages by timestamp for analysis
    allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log(`Analyzing ${allMessages.length} messages for client ${clientId} (${client.name})`);

    // Analyze messages for service mentions
    const detectedServices = ServiceDetector.analyzeConversation(allMessages);
    
    // Get current services from client profile
    const currentServices = client.serviceTypes || [];
    
    // Filter new services (not in current profile)
    const newServices = ServiceDetector.filterNewServices(detectedServices, currentServices);
    
    // Generate recommendations
    const recommendations = ServiceDetector.generateServiceRecommendations(detectedServices, currentServices);

    // Calculate analysis metrics
    const confidenceDistribution = calculateConfidenceDistribution(detectedServices);
    const serviceFrequency = calculateServiceFrequency(detectedServices);
    const timeRange = calculateTimeRange(allMessages);

    // Map detected services to business service IDs
    const detectedServiceTypes = detectedServices.map(s => s.serviceType);
    const recommendedBusinessIds = ServiceMapper.mapServiceTypesToBusinessIds(detectedServiceTypes);
    const currentBusinessIds = [client.serviceId, ...client.serviceTypes];
    const newBusinessIds = recommendedBusinessIds.filter(id => !currentBusinessIds.includes(id));

    // Log analysis findings
    console.log(`=== SERVICE ANALYSIS FOR ${client.name} ===`);
    console.log(`Total messages analyzed: ${allMessages.length}`);
    console.log(`Detected services: ${detectedServices.length}`);
    console.log('Detected services:', detectedServices.map(s => `${s.serviceName} (${(s.confidence * 100).toFixed(1)}%)`));
    console.log(`New services found: ${newServices.length}`);
    console.log('Service type mapping:');
    detectedServices.forEach(service => {
      const businessId = ServiceMapper.getBusinessIdForServiceType(service.serviceType);
      console.log(`  ${service.serviceName} (${service.serviceType}) → ${businessId}`);
    });
    console.log(`Recommended business services: [${recommendedBusinessIds.join(', ')}]`);
    console.log(`Current business services: [${currentBusinessIds.join(', ')}]`);
    console.log(`NEW business services to add: [${newBusinessIds.join(', ')}]`);
    
    if (newServices.length > 0) {
      console.log('New services:', newServices.map(s => s.serviceName));
      
      // Check for high-confidence new services
      newServices.filter(s => s.confidence > 0.7).forEach(service => {
        const businessId = ServiceMapper.getBusinessIdForServiceType(service.serviceType);
        console.log(`🚨 HIGH CONFIDENCE SERVICE DETECTED: ${service.serviceName}`);
        console.log(`Confidence: ${(service.confidence * 100).toFixed(1)}%`);
        console.log(`Business Service: ${businessId}`);
        console.log(`Mentions: ${service.mentions.length}`);
        service.mentions.forEach((mention, index) => {
          console.log(`  ${index + 1}. ${mention.context} (${mention.matchedKeywords.join(', ')})`);
        });
      });
      
      // Auto-recommend business service assignments for high-confidence detections
      if (newBusinessIds.length > 0) {
        console.log(`💡 RECOMMENDATION: Add ${client.name} to these business services: [${newBusinessIds.join(', ')}]`);
        console.log('Example update command:');
        console.log(`client.serviceTypes = [...client.serviceTypes, ${newBusinessIds.map(id => `'${id}'`).join(', ')}];`);
      }
    }
    console.log('=== END ANALYSIS ===');

    const response: ServiceAnalysisResponse = {
      success: true,
      data: {
        clientId: client.id,
        clientName: client.name,
        analysisResults: {
          totalMessages: allMessages.length,
          messagesAnalyzed: allMessages.length,
          detectedServices,
          newServices,
          recommendations,
          currentServices
        },
        analysis: {
          confidenceDistribution,
          serviceFrequency,
          timeRange
        }
      }
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Service analysis error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze services from conversation history'
    } as ServiceAnalysisResponse, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/clients/[clientId]/analyze-services (Apply recommendations)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const body = await request.json();

    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'Client ID is required'
      } as ServiceAnalysisResponse, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get client information
    const client = clientManager.getClient(clientId);
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      } as ServiceAnalysisResponse, { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract services to add from request body
    const { servicesToAdd, autoApply, serviceType = 'business' } = body;
    
    if (!servicesToAdd || !Array.isArray(servicesToAdd)) {
      return NextResponse.json({
        success: false,
        error: 'servicesToAdd array is required'
      } as ServiceAnalysisResponse, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let validatedServices: string[] = [];

    if (serviceType === 'business') {
      // Adding business service IDs (woodgreen, whiteknight, etc.)
      const validBusinessIds = ['woodgreen', 'whiteknight', 'pupawalk', 'creative'];
      const invalidServices = servicesToAdd.filter(service => 
        !validBusinessIds.includes(service)
      );

      if (invalidServices.length > 0) {
        return NextResponse.json({
          success: false,
          error: `Invalid business service IDs: ${invalidServices.join(', ')}. Valid options: ${validBusinessIds.join(', ')}`
        } as ServiceAnalysisResponse, { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      validatedServices = servicesToAdd;
    } else {
      // Legacy: Adding ServiceType enums
      const validServiceTypes = Object.values(ServiceType);
      const invalidServices = servicesToAdd.filter(service => 
        !validServiceTypes.includes(service as ServiceType)
      );

      if (invalidServices.length > 0) {
        return NextResponse.json({
          success: false,
          error: `Invalid service types: ${invalidServices.join(', ')}`
        } as ServiceAnalysisResponse, { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      validatedServices = servicesToAdd;
    }

    // Update client service types
    const currentServices = client.serviceTypes || [];
    const newServices = validatedServices.filter(service => 
      !currentServices.includes(service)
    );

    if (newServices.length > 0) {
      client.serviceTypes = [...currentServices, ...newServices];
      client.updatedAt = new Date().toISOString();
      
      // Save updated client
      clientManager.saveClient(client);

      console.log(`Updated services for ${client.name}: added ${newServices.join(', ')}`);
      
      // Log service assignments with business context
      newServices.forEach(service => {
        if (serviceType === 'business') {
          const businessName = service === 'woodgreen' ? 'Woodgreen Landscaping' :
                              service === 'whiteknight' ? 'White Knight Snow Removal' :
                              service === 'pupawalk' ? 'Pupawalk Pet Services' :
                              service === 'creative' ? 'Creative Development' : service;
          console.log(`✅ Successfully added ${client.name} to ${businessName} (${service}) service line!`);
        } else {
          console.log(`✅ Successfully added ${service} service to ${client.name}'s profile!`);
        }
      });
    }

    // Return success response with updated client info
    return NextResponse.json({
      success: true,
      data: {
        clientId: client.id,
        clientName: client.name,
        analysisResults: {
          totalMessages: 0,
          messagesAnalyzed: 0,
          detectedServices: [],
          newServices: [],
          recommendations: [],
          currentServices: client.serviceTypes
        },
        analysis: {
          confidenceDistribution: {},
          serviceFrequency: {},
          timeRange: { earliest: '', latest: '' }
        }
      }
    } as ServiceAnalysisResponse, { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Service update error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update client services'
    } as ServiceAnalysisResponse, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper functions
function calculateConfidenceDistribution(services: DetectedService[]): Record<string, number> {
  const distribution = {
    'high': 0,    // >= 0.8
    'medium': 0,  // 0.5 - 0.79
    'low': 0      // < 0.5
  };

  services.forEach(service => {
    if (service.confidence >= 0.8) {
      distribution.high++;
    } else if (service.confidence >= 0.5) {
      distribution.medium++;
    } else {
      distribution.low++;
    }
  });

  return distribution;
}

function calculateServiceFrequency(services: DetectedService[]): Record<string, number> {
  const frequency: Record<string, number> = {};
  
  services.forEach(service => {
    const serviceType = service.serviceType;
    frequency[serviceType] = (frequency[serviceType] || 0) + service.mentions.length;
  });

  return frequency;
}

function calculateTimeRange(messages: any[]): { earliest: string; latest: string } {
  if (messages.length === 0) {
    return { earliest: '', latest: '' };
  }

  const timestamps = messages.map(m => new Date(m.timestamp).getTime());
  const earliest = new Date(Math.min(...timestamps)).toISOString();
  const latest = new Date(Math.max(...timestamps)).toISOString();

  return { earliest, latest };
}