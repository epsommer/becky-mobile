// src/types/crm-integration.ts

export interface CRMIntegrationRequest {
  excelFile?: File;
  conversationData?: SMSConversationData;
  serviceId?: string;
  customPrompt?: string;
}

export interface SMSConversationData {
  messages: SMSMessage[];
  participants: Participant[];
  metadata: ConversationMetadata;
}

export interface SMSMessage {
  id: string;
  content: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  sender: string;
  recipient: string;
  type: 'sms' | 'text';
  rawData?: {
    originalType: 'Sent' | 'Received';
    originalNameNumber: string;
    rowIndex?: number;
  };
}

export interface Participant {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'client' | 'service_provider';
}

export interface ConversationMetadata {
  dateRange: {
    start: string;
    end: string;
  };
  totalMessages: number;
  importSource: 'excel_export' | 'manual_entry';
  businessContext?: string;
}

// CRM Output Structure
export interface CRMIntegrationOutput {
  clients: ClientRecord[];
  service_history: ServiceRecord[];
  communications: CommunicationRecord[];
  insights: BusinessInsights;
}

export interface ClientRecord {
  client_id: string;
  personal_info: PersonalInfo;
  service_profile: ServiceProfile;
  billing_info: BillingInfo;
  relationship_data: RelationshipData;
}

export interface PersonalInfo {
  name: string;
  phone: string;
  email?: string;
  preferred_contact: 'sms' | 'email' | 'phone';
}

export interface ServiceProfile {
  service_types: ServiceType[];
  property_details?: string;
  service_frequency: ServiceFrequency;
  special_requirements: string[];
}

export interface BillingInfo {
  payment_method?: string;
  receipt_preference: 'email' | 'paper' | 'text';
  billing_address?: string;
}

export interface RelationshipData {
  client_since: string;
  last_contact: string;
  communication_style: CommunicationStyle;
  satisfaction_indicators: SatisfactionLevel[];
}

export interface ServiceRecord {
  service_id: string;
  client_id: string;
  service_date: string;
  service_type: ServiceType;
  service_area?: string;
  completion_status: CompletionStatus;
  notes?: string;
  follow_up_needed: boolean;
}

export interface CommunicationRecord {
  comm_id: string;
  client_id: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'email' | 'phone';
  content: string;
  purpose: CommunicationPurpose;
  action_items: string[];
  sentiment: SentimentLevel;
}

export interface BusinessInsights {
  lead_quality_score: number; // 1-10
  client_lifetime_value_indicator: ValueIndicator;
  referral_potential: number; // 1-10
  upsell_opportunities: string[];
  retention_risk: RiskLevel;
  next_action_priority: ActionPriority;
}

// Enums and Types
export type ServiceType =
  | 'lawn_care'
  | 'landscaping'
  | 'maintenance'
  | 'snow_removal'
  | 'emergency';

export type ServiceFrequency =
  | 'weekly'
  | 'monthly'
  | 'seasonal'
  | 'one_time'
  | 'as_needed';

export type CommunicationStyle =
  | 'professional'
  | 'casual'
  | 'detailed'
  | 'brief';

export type SatisfactionLevel =
  | 'positive'
  | 'neutral'
  | 'negative';

export type CompletionStatus =
  | 'completed'
  | 'scheduled'
  | 'cancelled'
  | 'pending';

export type CommunicationPurpose =
  | 'scheduling'
  | 'service_update'
  | 'billing'
  | 'general'
  | 'complaint'
  | 'followup';

export type SentimentLevel =
  | 'positive'
  | 'neutral'
  | 'negative';

export type ValueIndicator =
  | 'high'
  | 'medium'
  | 'low';

export type RiskLevel =
  | 'low'
  | 'medium'
  | 'high';

export type ActionPriority =
  | 'immediate'
  | 'this_week'
  | 'this_month'
  | 'low_priority';

// Configuration Types
export interface CRMIntegrationConfig {
  phoneNumberNormalization: boolean;
  timezoneHandling: 'auto' | 'EST' | 'PST' | 'MST' | 'CST';
  serviceClassificationRules: ServiceClassificationRule[];
  sentimentAnalysisEnabled: boolean;
  actionItemExtraction: boolean;
  businessContext: LandscapingBusinessContext;
}

export interface ServiceClassificationRule {
  keywords: string[];
  serviceType: ServiceType;
  confidence: number;
}

export interface LandscapingBusinessContext {
  focusAreas: string[];
  seasonalPatterns: boolean;
  equipmentTracking: boolean;
  weatherDependency: boolean;
  accessConstraints: boolean;
  upsellServices: ServiceType[];
}

// Processing Results
export interface CRMProcessingResult {
  success: boolean;
  data?: CRMIntegrationOutput;
  error?: string;
  metadata: ProcessingMetadata;
}

export interface ProcessingMetadata {
  processedAt: string;
  messagesProcessed: number;
  clientsIdentified: number;
  servicesDetected: number;
  communicationsLogged: number;
  processingTimeMs: number;
  confidence: number;
}

// Database Integration Types
export interface CRMDatabaseOperations {
  insertClients: (clients: ClientRecord[]) => Promise<void>;
  insertServiceHistory: (services: ServiceRecord[]) => Promise<void>;
  insertCommunications: (communications: CommunicationRecord[]) => Promise<void>;
  updateBusinessInsights: (insights: BusinessInsights, clientId: string) => Promise<void>;
  upsertClient: (client: ClientRecord) => Promise<string>;
}

// API Response Types
export interface ClaudeCRMResponse {
  clients: ClientRecord[];
  service_history: ServiceRecord[];
  communications: CommunicationRecord[];
  insights: BusinessInsights;
  metadata: {
    confidence: number;
    processing_notes: string[];
    recommendations: string[];
  };
}

// Validation Types
export interface CRMValidationResult {
  isValid: boolean;
  errors: CRMValidationError[];
  warnings: CRMValidationWarning[];
}

export interface CRMValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  recordId?: string;
}

export interface CRMValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
  recordId?: string;
}

// Export utility types
export type CRMExportFormat = 'json' | 'csv' | 'xlsx';

export interface CRMExportOptions {
  format: CRMExportFormat;
  includeMetadata: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  clientIds?: string[];
}
