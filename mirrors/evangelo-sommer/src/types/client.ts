// src/types/client.ts
// Enhanced Service Record interface for detailed service tracking
export interface ClientServiceRecord {
  id: string;
  serviceId: string; // e.g., 'woodgreen', 'whiteknight'
  serviceName: string; // e.g., 'Woodgreen Landscaping', 'White Knight'
  serviceCategory: string; // e.g., 'Lawn Maintenance', 'Snow Removal', 'Salting/De-Icing'
  status: "ongoing" | "completed" | "paused" | "cancelled" | "scheduled";
  period?: string; // e.g., 'Winter 2024-2025', 'Spring-Fall 2024', 'Ongoing'
  startDate?: string;
  endDate?: string;
  contractValue?: number;
  frequency?: "one-time" | "daily" | "weekly" | "bi-weekly" | "monthly" | "seasonal" | "as-needed";
  notes?: string;
  isActive: boolean;
  isPrimary?: boolean; // indicates if this is the primary service
  nextScheduled?: string; // next scheduled service date
  lastCompleted?: string; // last completed service date
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string; // Only name remains required
  email?: string; // Made optional
  phone?: string;
  company?: string;
  serviceId: string; // Keep required to know primary service
  status: "active" | "inactive" | "prospect" | "completed";
  tags: string[];
  createdAt: string;
  updatedAt: string;
  notes?: string;

  // Enhanced service tracking
  services?: ClientServiceRecord[]; // Detailed service records
  serviceContracts?: ClientServiceRecord[]; // Database service contracts
  
  // Legacy service fields (kept for backwards compatibility)
  projectType?: string;
  serviceTypes: string[]; // Keep as array but can be empty
  budget?: number;
  timeline?: string;
  seasonalContract?: boolean;
  recurringService?: "one-time" | "daily" | "weekly" | "bi-weekly" | "monthly"; // Updated options

  // Location (important for landscaping/snow/pet services)
  address?: {
    street?: string; // Made all address fields optional
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  };

  // Service-specific metadata
  metadata?: {
    propertySize?: number;
    snowContractValue?: number;
    petInfo?: {
      petNames: string[];
      petTypes: string[];
      specialInstructions: string;
    };
    techStack?: string[];
  };

  // Contact preferences and capabilities
  contactPreferences?: {
    preferredMethod: "email" | "phone" | "text" | "in-person";
    canReceiveEmails: boolean;
    canReceiveTexts: boolean;
    autoInvoicing: boolean; // Whether they can receive auto-generated invoices
    autoReceipts: boolean; // Whether they can receive auto-generated receipts
  };

  // Personal information
  occupation?: string;
  hobbies?: string[]; // Array of hobby strings
  dateOfBirth?: string; // ISO date string (optional)
}

// Enhanced Document interface
export interface Document {
  id: string;
  clientId: string;
  name: string;
  type:
    | "invoice"
    | "quote"
    | "receipt"
    | "contract"
    | "proposal"
    | "estimate"
    | "statement"
    | "other";
  status:
    | "draft"
    | "sent"
    | "viewed"
    | "approved"
    | "paid"
    | "expired"
    | "cancelled";
  fileUrl?: string;
  content: string; // AI-generated content or actual content
  amount?: number;
  currency?: string;
  dueDate?: string;
  sentDate?: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    sentViaEmail?: boolean;
    emailSubject?: string;
    paymentMethod?: string;
    notes?: string;
    invoiceNumber?: string;
    quoteNumber?: string;
    taxAmount?: number;
    discountAmount?: number;
    items?: Array<{
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
  };
}

// Enhanced Conversation interface
export interface Conversation {
  id: string;
  clientId: string;
  title?: string; // Custom title for the conversation thread
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  summary?: string; // AI-generated summary
  nextActions?: string[]; // AI-suggested follow-ups
  sentiment?: "positive" | "neutral" | "negative" | "urgent";
  priority?: "low" | "medium" | "high" | "urgent";
  tags?: string[];
  status?: "active" | "resolved" | "pending" | "archived";
  source?: "email" | "text" | "phone" | "meeting" | "import" | "manual";
  participants?: string[]; // Other people involved in the conversation
  relatedDocuments?: string[]; // IDs of related documents
}

// Enhanced Message interface
export interface Message {
  id: string;
  role: "CLIENT" | "YOU" | "AI_DRAFT" | "client" | "you" | "ai-draft";
  content: string;
  timestamp: string;
  type:
    | "email"
    | "text"
    | "call-notes"
    | "meeting-notes"
    | "voice-memo"
    | "file-upload";
  metadata?: {
    subject?: string; // for emails
    attachments?: string[];
    location?: string; // for meetings
    duration?: number; // for calls/meetings in minutes
    participants?: string[]; // for meetings
    phoneNumber?: string; // for texts/calls
    emailAddress?: string; // for emails
    fileSize?: number; // for file uploads
    fileName?: string; // for file uploads
    urgency?: "low" | "medium" | "high" | "urgent";
  };
}

// AI Context interface
export interface AIContext {
  clientSummary: string;
  recentInteractions: string;
  currentProjects: string[];
  preferences: string[];
  communicationStyle: string;
  keyPoints: string[];
}

// Filter and sort interfaces
export interface ConversationFilters {
  status?: string;
  priority?: string;
  sentiment?: string;
  source?: string;
  tags?: string[];
  dateRange?: { start: string; end: string };
  hasNextActions?: boolean;
}

export interface DocumentFilters {
  type?: string;
  status?: string;
  dateRange?: { start: string; end: string };
  amountRange?: { min: number; max: number };
  isPaid?: boolean;
  isOverdue?: boolean;
}

export interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}

// Stats interfaces
export interface ConversationStats {
  total: number;
  active: number;
  resolved: number;
  pending: number;
  urgent: number;
  bySource: Record<string, number>;
  bySentiment: Record<string, number>;
}

export interface DocumentStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  totalValue: number;
  paidValue: number;
  outstandingValue: number;
  overdueCount: number;
}

// Enhanced analytics interfaces for conversation system
export interface ConversationAnalytics {
  responseMetrics: {
    averageResponseTime: number; // in hours
    fastestResponse: number; // in hours
    slowestResponse: number; // in hours
    totalResponseTime: number; // in hours
    responseTimeBySource: Record<string, number>; // average by source type
  };
  engagementData: {
    totalMessages: number;
    messagesFromClient: number;
    messagesFromYou: number;
    lastActivity: string;
    firstActivity: string;
    activeHours: number[]; // hours of day when most active (0-23)
    activeDays: number[]; // days of week when most active (0-6)
    messageLengthAverage: number; // average message length in characters
    conversationGaps: {
      average: number; // average hours between conversations
      longest: number; // longest gap in hours
      shortest: number; // shortest gap in hours
    };
  };
  sentimentTrend: Array<{
    date: string;
    sentiment: number; // -1 to 1 scale
    confidence: number; // 0 to 1 scale
    messageCount: number;
  }>;
  topicAnalysis: {
    keyTopics: Array<{
      topic: string;
      frequency: number;
      sentiment: number;
      lastMentioned: string;
    }>;
    wordCloud: Array<{
      word: string;
      count: number;
      importance: number;
    }>;
    emergingTopics: Array<{
      topic: string;
      trend: "rising" | "declining";
      changeRate: number;
    }>;
  };
  actionItemsTracking: {
    totalActionItems: number;
    completedActionItems: number;
    pendingActionItems: number;
    overdueActionItems: number;
    averageCompletionTime: number; // in hours
    completionRate: number; // percentage
    actionsByPriority: Record<string, number>;
  };
  communicationPatterns: {
    preferredContactMethod: string;
    bestResponseTimes: Array<{
      hour: number;
      responseRate: number;
    }>;
    communicationFrequency: "daily" | "weekly" | "monthly" | "sporadic";
    urgencyIndicators: Array<{
      keyword: string;
      urgencyLevel: number; // 1-5 scale
      frequency: number;
    }>;
  };
}

export interface ConversationInsight {
  id: string;
  type: "pattern" | "anomaly" | "opportunity" | "risk" | "suggestion";
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  confidence: number; // 0 to 1 scale
  actionable: boolean;
  relatedConversations: string[]; // conversation IDs
  metadata: {
    dataPoints: Array<{
      metric: string;
      value: number;
      benchmark?: number;
      trend: "up" | "down" | "stable";
    }>;
    timeframe: {
      start: string;
      end: string;
    };
    affectedMetrics: string[];
  };
  suggestedActions?: Array<{
    action: string;
    description: string;
    effort: "low" | "medium" | "high";
    impact: "low" | "medium" | "high";
  }>;
  createdAt: string;
  expiresAt?: string; // when insight becomes stale
}

export interface MessageAnalysis {
  id: string;
  messageId: string;
  sentiment: {
    score: number; // -1 to 1
    confidence: number; // 0 to 1
    emotions: Array<{
      emotion: string;
      intensity: number; // 0 to 1
    }>;
  };
  topics: Array<{
    topic: string;
    relevance: number; // 0 to 1
    category: string;
  }>;
  urgencyLevel: number; // 1 to 5 scale
  keyPhrases: Array<{
    phrase: string;
    importance: number;
    category: "request" | "concern" | "compliment" | "question" | "other";
  }>;
  entities: Array<{
    text: string;
    type: "person" | "organization" | "location" | "date" | "money" | "other";
    confidence: number;
  }>;
  actionItems: Array<{
    text: string;
    priority: "low" | "medium" | "high" | "urgent";
    deadline?: string;
    assignee?: "client" | "you";
  }>;
  createdAt: string;
}

export interface ConversationHealth {
  overall: number; // 0 to 100 health score
  factors: {
    responseTimeliness: {
      score: number;
      trend: "improving" | "declining" | "stable";
      details: string;
    };
    sentimentTrend: {
      score: number;
      trend: "improving" | "declining" | "stable";
      details: string;
    };
    engagementLevel: {
      score: number;
      trend: "improving" | "declining" | "stable";
      details: string;
    };
    issueResolution: {
      score: number;
      trend: "improving" | "declining" | "stable";
      details: string;
    };
    communicationClarity: {
      score: number;
      trend: "improving" | "declining" | "stable";
      details: string;
    };
  };
  recommendations: Array<{
    category: string;
    suggestion: string;
    priority: "low" | "medium" | "high";
    effort: "low" | "medium" | "high";
  }>;
  riskFactors: Array<{
    factor: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    mitigation: string;
  }>;
  lastCalculated: string;
}
