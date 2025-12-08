// Migration script to transfer localStorage conversation data to Prisma database
import { PrismaClient } from '@prisma/client';
import { ConversationStatus, MessageRole, MessageType, SentimentLevel, PriorityLevel } from '@prisma/client';

const prisma = new PrismaClient();

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

// This script should be run in the browser console to extract localStorage data
export const extractLocalStorageData = () => {
  if (typeof window === 'undefined') {
    console.error('This function must be run in the browser console');
    return null;
  }

  const clients = JSON.parse(localStorage.getItem('crm-clients') || '[]') as LocalStorageClient[];
  const conversations = JSON.parse(localStorage.getItem('crm-conversations') || '[]') as LocalStorageConversation[];
  const documents = JSON.parse(localStorage.getItem('crm-documents') || '[]');

  console.log(`Found ${clients.length} clients, ${conversations.length} conversations, ${documents.length} documents`);
  
  const data = {
    clients,
    conversations,
    documents
  };

  // Create a downloadable JSON file
  const dataStr = JSON.stringify(data, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `localStorage-backup-${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();

  return data;
};

// Helper function to map localStorage values to Prisma enum values
const mapToConversationStatus = (status: string): ConversationStatus => {
  const statusMap: Record<string, ConversationStatus> = {
    'active': 'ACTIVE',
    'resolved': 'RESOLVED', 
    'pending': 'PENDING',
    'archived': 'ARCHIVED'
  };
  return statusMap[status.toLowerCase()] || 'ACTIVE';
};

const mapToMessageRole = (role: string): MessageRole => {
  const roleMap: Record<string, MessageRole> = {
    'client': 'CLIENT',
    'you': 'YOU',
    'ai_draft': 'AI_DRAFT',
    'ai-draft': 'AI_DRAFT'
  };
  return roleMap[role.toLowerCase()] || 'CLIENT';
};

const mapToMessageType = (type: string): MessageType => {
  const typeMap: Record<string, MessageType> = {
    'email': 'EMAIL',
    'text': 'TEXT',
    'call_notes': 'CALL_NOTES',
    'call-notes': 'CALL_NOTES',
    'meeting_notes': 'MEETING_NOTES',
    'meeting-notes': 'MEETING_NOTES',
    'voice_memo': 'VOICE_MEMO',
    'voice-memo': 'VOICE_MEMO',
    'file_upload': 'FILE_UPLOAD',
    'file-upload': 'FILE_UPLOAD'
  };
  return typeMap[type.toLowerCase()] || 'MEETING_NOTES';
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

// Function to import the exported data into the database
export async function importLocalStorageData(backupFilePath: string) {
  try {
    console.log('🚀 Starting localStorage to database migration...');

    // Read the backup file
    const fs = require('fs');
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    
    const { clients, conversations } = backupData;
    
    console.log(`📊 Found ${clients.length} clients and ${conversations.length} conversations to migrate`);

    // Step 1: Migrate clients
    console.log('👥 Migrating clients...');
    const clientMigrationMap = new Map<string, string>(); // oldId -> newId
    
    for (const localClient of clients) {
      try {
        // First create a participant
        const participant = await prisma.participant.create({
          data: {
            name: localClient.name,
            email: localClient.email || null,
            phone: localClient.phone || null,
            company: localClient.company || null,
            role: 'CLIENT',
            services: localClient.serviceTypes.length > 0 ? JSON.stringify(localClient.serviceTypes) : undefined,
            contactPreferences: localClient.contactPreferences ? JSON.stringify(localClient.contactPreferences) : undefined
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
            tags: localClient.tags.length > 0 ? JSON.stringify(localClient.tags) : undefined,
            notes: localClient.notes || null,
            projectType: localClient.projectType || null,
            serviceTypes: localClient.serviceTypes.length > 0 ? JSON.stringify(localClient.serviceTypes) : undefined,
            budget: localClient.budget || null,
            timeline: localClient.timeline || null,
            seasonalContract: localClient.seasonalContract || false,
            recurringService: localClient.recurringService || 'ONE_TIME',
            address: localClient.address ? JSON.stringify(localClient.address) : undefined,
            contactPreferences: localClient.contactPreferences ? JSON.stringify(localClient.contactPreferences) : undefined,
            metadata: JSON.stringify({}),
            personalInfo: JSON.stringify({}),
            serviceProfile: JSON.stringify({}),
            billingInfo: JSON.stringify({}),
            relationshipData: JSON.stringify({})
          }
        });

        clientMigrationMap.set(localClient.id, clientRecord.id);
        console.log(`✅ Migrated client: ${localClient.name} (${localClient.id} -> ${clientRecord.id})`);
      } catch (error) {
        console.error(`❌ Failed to migrate client ${localClient.name}:`, error);
      }
    }

    // Step 2: Migrate conversations
    console.log('💬 Migrating conversations...');
    let conversationCount = 0;
    let messageCount = 0;

    for (const localConv of conversations) {
      try {
        const newClientId = clientMigrationMap.get(localConv.clientId);
        if (!newClientId) {
          console.warn(`⚠️ Skipping conversation ${localConv.id} - client ${localConv.clientId} not found`);
          continue;
        }

        // Create the conversation
        const conversation = await prisma.conversation.create({
          data: {
            clientId: newClientId,
            title: localConv.title || `Conversation ${conversationCount + 1}`,
            summary: localConv.summary || null,
            nextActions: localConv.nextActions ? JSON.stringify(localConv.nextActions) : undefined,
            sentiment: mapToSentiment(localConv.sentiment),
            priority: mapToPriority(localConv.priority),
            tags: localConv.tags ? JSON.stringify(localConv.tags) : undefined,
            status: mapToConversationStatus(localConv.status),
            source: localConv.source || 'MANUAL',
            participants: localConv.participants ? JSON.stringify(localConv.participants) : undefined,
            relatedDocuments: localConv.relatedDocuments ? JSON.stringify(localConv.relatedDocuments) : undefined,
            createdAt: new Date(localConv.createdAt),
            updatedAt: new Date(localConv.updatedAt)
          }
        });

        // Create messages for this conversation
        for (const localMsg of localConv.messages) {
          try {
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                role: mapToMessageRole(localMsg.role),
                content: localMsg.content,
                timestamp: new Date(localMsg.timestamp),
                type: mapToMessageType(localMsg.type),
                metadata: localMsg.metadata ? JSON.stringify(localMsg.metadata) : undefined
              }
            });
            messageCount++;
          } catch (error) {
            console.error(`❌ Failed to migrate message ${localMsg.id}:`, error);
          }
        }

        conversationCount++;
        console.log(`✅ Migrated conversation: ${localConv.title || localConv.id} (${localConv.messages.length} messages)`);
        
        // Special logging for Mark Levy
        if (localConv.clientId === 'client_udpu1m387') {
          console.log(`🎉 FOUND MARK LEVY CONVERSATION: ${localConv.messages.length} messages migrated!`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate conversation ${localConv.id}:`, error);
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`📈 Summary:`);
    console.log(`   • ${clientMigrationMap.size} clients migrated`);
    console.log(`   • ${conversationCount} conversations migrated`);
    console.log(`   • ${messageCount} messages migrated`);

    // Verify the migration
    const totalConversations = await prisma.conversation.count();
    const totalMessages = await prisma.message.count();
    const totalClients = await prisma.clientRecord.count();

    console.log(`\n🔍 Database verification:`);
    console.log(`   • Total clients in database: ${totalClients}`);
    console.log(`   • Total conversations in database: ${totalConversations}`);
    console.log(`   • Total messages in database: ${totalMessages}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Node.js script version for command line execution
if (require.main === module) {
  const backupFile = process.argv[2];
  if (!backupFile) {
    console.error('Usage: tsx migrate-localstorage-to-database.ts <backup-file.json>');
    process.exit(1);
  }
  importLocalStorageData(backupFile);
}