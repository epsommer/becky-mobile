import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { ConversationStatus, MessageRole, MessageType, SentimentLevel, PriorityLevel, RecurringServiceType, ConversationSource } from '@prisma/client';
import { JsonFieldSerializers } from '@/lib/json-fields';

const prisma = getPrismaClient();

interface LocalStorageClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  serviceId: string;
  status: string;
  tags: string[];
  notes?: string;
  projectType?: string;
  serviceTypes: string[];
  budget?: number;
  timeline?: string;
  seasonalContract?: boolean;
  recurringService?: string;
  address?: any;
  contactPreferences?: any;
  createdAt: string;
  updatedAt: string;
}

interface LocalStorageMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  type: string;
  metadata?: any;
}

interface LocalStorageConversation {
  id: string;
  clientId: string;
  title?: string;
  summary?: string;
  nextActions?: string[];
  sentiment?: string;
  priority?: string;
  tags?: string[];
  status: string;
  source?: string;
  participants?: string[];
  relatedDocuments?: string[];
  createdAt: string;
  updatedAt: string;
  messages: LocalStorageMessage[];
}

// Helper function to map localStorage values to Prisma enum values
const mapToConversationStatus = (status: string): ConversationStatus => {
  const statusMap: Record<string, ConversationStatus> = {
    'active': 'ACTIVE',
    'resolved': 'RESOLVED', 
    'pending': 'PENDING',
    'archived': 'ARCHIVED'
  };
  return statusMap[status?.toLowerCase()] || 'ACTIVE';
};

const mapToMessageRole = (role: string): MessageRole => {
  const roleMap: Record<string, MessageRole> = {
    'client': 'CLIENT',
    'you': 'YOU',
    'system': 'AI_DRAFT', // Map system to AI_DRAFT as SYSTEM is not a valid MessageRole
    'ai_draft': 'AI_DRAFT'
  };
  return roleMap[role?.toLowerCase()] || 'CLIENT';
};

const mapToMessageType = (type: string): MessageType => {
  const typeMap: Record<string, MessageType> = {
    'email': 'EMAIL',
    'text': 'TEXT',
    'call_notes': 'CALL_NOTES',
    'meeting_notes': 'MEETING_NOTES',
    'file_attachment': 'FILE_UPLOAD', // Map file_attachment to FILE_UPLOAD (correct enum value)
    'file_upload': 'FILE_UPLOAD',
    'voice_memo': 'VOICE_MEMO'
  };
  return typeMap[type?.toLowerCase()] || 'MEETING_NOTES';
};

const mapToSentiment = (sentiment?: string): SentimentLevel => {
  if (!sentiment) return 'NEUTRAL';
  const sentimentMap: Record<string, SentimentLevel> = {
    'positive': 'POSITIVE',
    'negative': 'NEGATIVE',
    'neutral': 'NEUTRAL'
  };
  return sentimentMap[sentiment.toLowerCase()] || 'NEUTRAL';
};

const mapToPriority = (priority?: string): PriorityLevel => {
  if (!priority) return 'MEDIUM';
  const priorityMap: Record<string, PriorityLevel> = {
    'urgent': 'URGENT',
    'high': 'HIGH',
    'medium': 'MEDIUM',
    'low': 'LOW'
  };
  return priorityMap[priority.toLowerCase()] || 'MEDIUM';
};

export async function POST(request: NextRequest) {
  try {
    if (!prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 });
    }

    const { clients, conversations } = await request.json();
    
    console.log(`🚀 Starting migration: ${clients.length} clients, ${conversations.length} conversations`);

    const migrationResults = {
      clientsMigrated: 0,
      conversationsMigrated: 0,
      messagesMigrated: 0,
      errors: [] as string[]
    };

    // Step 1: Migrate clients
    const clientMigrationMap = new Map<string, string>(); // oldId -> newId
    
    for (const localClient of clients as LocalStorageClient[]) {
      try {
        // Check if client already exists by name and email to avoid duplicates
        const existingClient = await prisma.clientRecord.findFirst({
          where: {
            OR: [
              { name: localClient.name, email: localClient.email || null },
              { name: localClient.name, phone: localClient.phone || null }
            ]
          }
        });

        if (existingClient) {
          clientMigrationMap.set(localClient.id, existingClient.id);
          console.log(`📋 Client ${localClient.name} already exists, using existing ID`);
          continue;
        }

        // First create a participant
        const participant = await prisma.participant.create({
          data: {
            name: localClient.name,
            email: localClient.email || null,
            phone: localClient.phone || null,
            company: localClient.company || null,
            role: 'CLIENT',
            services: localClient.serviceTypes.length > 0 ? JsonFieldSerializers.serializeStringArray(localClient.serviceTypes) : undefined,
            contactPreferences: localClient.contactPreferences ? JsonFieldSerializers.serializeContactPreferences(localClient.contactPreferences) : undefined
          }
        });

        // Then create the client record
        const clientRecord = await prisma.clientRecord.create({
          data: {
            participantId: participant.id,
            name: localClient.name,
            email: localClient.email || null,
            phone: localClient.phone || null,
            company: localClient.company || null,
            serviceId: localClient.serviceId,
            status: localClient.status === 'active' ? 'ACTIVE' : 'INACTIVE',
            tags: localClient.tags.length > 0 ? JsonFieldSerializers.serializeStringArray(localClient.tags) : undefined,
            notes: localClient.notes || null,
            projectType: localClient.projectType || null,
            serviceTypes: localClient.serviceTypes.length > 0 ? JsonFieldSerializers.serializeStringArray(localClient.serviceTypes) : undefined,
            budget: localClient.budget || null,
            timeline: localClient.timeline || null,
            seasonalContract: localClient.seasonalContract || false,
            recurringService: (localClient.recurringService as RecurringServiceType) || RecurringServiceType.ONE_TIME,
            address: localClient.address ? JsonFieldSerializers.serializeAddress(localClient.address) : undefined,
            contactPreferences: localClient.contactPreferences ? JsonFieldSerializers.serializeContactPreferences(localClient.contactPreferences) : undefined,
            metadata: JsonFieldSerializers.serializeObject({}),
            personalInfo: JsonFieldSerializers.serializeObject({}),
            serviceProfile: JsonFieldSerializers.serializeObject({}),
            billingInfo: JsonFieldSerializers.serializeObject({}),
            relationshipData: JsonFieldSerializers.serializeObject({})
          }
        });

        clientMigrationMap.set(localClient.id, clientRecord.id);
        migrationResults.clientsMigrated++;
        
        console.log(`✅ Migrated client: ${localClient.name} (${localClient.id} -> ${clientRecord.id})`);
        
        // Special logging for Mark Levy
        if (localClient.id === 'client_udpu1m387') {
          console.log(`🎉 MARK LEVY CLIENT MIGRATED: ${localClient.name} -> ${clientRecord.id}`);
        }
      } catch (error) {
        const errorMsg = `Failed to migrate client ${localClient.name}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        migrationResults.errors.push(errorMsg);
      }
    }

    // Step 2: Migrate conversations
    for (const localConv of conversations as LocalStorageConversation[]) {
      try {
        const newClientId = clientMigrationMap.get(localConv.clientId);
        if (!newClientId) {
          const errorMsg = `Skipping conversation ${localConv.id} - client ${localConv.clientId} not found`;
          console.warn(`⚠️ ${errorMsg}`);
          migrationResults.errors.push(errorMsg);
          continue;
        }

        // Check if conversation already exists to avoid duplicates
        const existingConv = await prisma.conversation.findFirst({
          where: {
            clientId: newClientId,
            title: localConv.title || `Conversation ${migrationResults.conversationsMigrated + 1}`,
            createdAt: new Date(localConv.createdAt)
          }
        });

        if (existingConv) {
          console.log(`📋 Conversation already exists: ${localConv.title || localConv.id}`);
          continue;
        }

        // Create the conversation
        const conversation = await prisma.conversation.create({
          data: {
            clientId: newClientId,
            title: localConv.title || `Conversation ${migrationResults.conversationsMigrated + 1}`,
            summary: localConv.summary || null,
            nextActions: localConv.nextActions ? JsonFieldSerializers.serializeStringArray(localConv.nextActions) : undefined,
            sentiment: mapToSentiment(localConv.sentiment),
            priority: mapToPriority(localConv.priority),
            tags: localConv.tags ? JsonFieldSerializers.serializeStringArray(localConv.tags) : undefined,
            status: mapToConversationStatus(localConv.status),
            source: (localConv.source as ConversationSource) || ConversationSource.MANUAL,
            participants: localConv.participants ? JsonFieldSerializers.serializeStringArray(localConv.participants) : undefined,
            relatedDocuments: localConv.relatedDocuments ? JsonFieldSerializers.serializeStringArray(localConv.relatedDocuments) : undefined,
            createdAt: new Date(localConv.createdAt),
            updatedAt: new Date(localConv.updatedAt)
          }
        });

        // Create messages for this conversation
        let conversationMessageCount = 0;
        for (const localMsg of localConv.messages || []) {
          try {
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                role: mapToMessageRole(localMsg.role),
                content: localMsg.content,
                timestamp: new Date(localMsg.timestamp),
                type: mapToMessageType(localMsg.type),
                metadata: localMsg.metadata ? JsonFieldSerializers.serializeObject(localMsg.metadata) : undefined
              }
            });
            conversationMessageCount++;
            migrationResults.messagesMigrated++;
          } catch (error) {
            const errorMsg = `Failed to migrate message ${localMsg.id}: ${error}`;
            console.error(`❌ ${errorMsg}`);
            migrationResults.errors.push(errorMsg);
          }
        }

        migrationResults.conversationsMigrated++;
        console.log(`✅ Migrated conversation: ${localConv.title || localConv.id} (${conversationMessageCount} messages)`);
        
        // Special logging for Mark Levy conversations
        if (localConv.clientId === 'client_udpu1m387') {
          console.log(`🎉 MARK LEVY CONVERSATION MIGRATED: ${conversationMessageCount} messages!`);
        }
      } catch (error) {
        const errorMsg = `Failed to migrate conversation ${localConv.id}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        migrationResults.errors.push(errorMsg);
      }
    }

    // Final verification
    const totalConversations = await prisma.conversation.count();
    const totalMessages = await prisma.message.count();
    const totalClients = await prisma.clientRecord.count();

    console.log('\n🎉 Migration completed!');
    console.log(`📈 Summary:`);
    console.log(`   • ${migrationResults.clientsMigrated} clients migrated`);
    console.log(`   • ${migrationResults.conversationsMigrated} conversations migrated`);
    console.log(`   • ${migrationResults.messagesMigrated} messages migrated`);
    console.log(`\n🔍 Database totals:`);
    console.log(`   • Total clients: ${totalClients}`);
    console.log(`   • Total conversations: ${totalConversations}`);
    console.log(`   • Total messages: ${totalMessages}`);

    return NextResponse.json({
      success: true,
      summary: `Migrated ${migrationResults.clientsMigrated} clients, ${migrationResults.conversationsMigrated} conversations, ${migrationResults.messagesMigrated} messages`,
      details: migrationResults,
      databaseTotals: {
        clients: totalClients,
        conversations: totalConversations,
        messages: totalMessages
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: `Migration failed: ${error}`
    }, { status: 500 });
  }
}