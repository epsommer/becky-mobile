/**
 * TypeScript type definitions for Becky Mobile API
 * @module lib/api/types
 */

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * Pagination parameters for list requests
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * API request configuration extending native RequestInit
 */
export interface ApiRequestConfig extends RequestInit {
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Initial retry delay in milliseconds */
  retryDelay?: number;
  /** Skip authentication header injection */
  skipAuth?: boolean;
  /** Skip request/response interceptors */
  skipInterceptors?: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API error type enumeration
 */
export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ============================================================================
// Domain Model Types
// ============================================================================

/**
 * Client record from CRM
 */
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: 'active' | 'prospect' | 'completed' | string;
  statusColor?: string;
  note?: string;
  tags?: string[];
  budget?: number;
  projectType?: string;
  serviceId?: string;
  serviceTypes?: string[];
  timeline?: string;
  seasonalContract?: boolean;
  recurringService?: boolean;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  metadata?: Record<string, any>;
  contactPreferences?: {
    autoInvoicing?: boolean;
    autoReceipts?: boolean;
    canReceiveEmails?: boolean;
    canReceiveTexts?: boolean;
  };
  personalInfo?: Record<string, any>;
  serviceProfile?: Record<string, any>;
  billingInfo?: Record<string, any>;
  relationshipData?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Conversation thread
 */
export interface Conversation {
  id: string;
  clientId: string;
  title?: string;
  messages?: Message[];
  createdAt?: string;
  updatedAt?: string;
  summary?: string;
  nextActions?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  status?: 'active' | 'resolved' | 'pending' | 'archived';
  source?: 'email' | 'text' | 'phone' | 'meeting' | 'import' | 'manual';
  participants?: string[];
  relatedDocuments?: string[];
  client?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  };
}

/**
 * Message within a conversation
 */
export interface Message {
  id: string;
  conversationId?: string;
  role: 'CLIENT' | 'YOU' | 'AI_DRAFT' | 'client' | 'you' | 'ai-draft';
  content: string;
  timestamp: string;
  type: 'email' | 'text' | 'call-notes' | 'meeting-notes' | 'voice-memo' | 'file-upload' | 'EMAIL' | 'TEXT' | 'CALL_NOTES' | 'MEETING_NOTES' | 'VOICE_MEMO' | 'FILE_UPLOAD';
  metadata?: {
    subject?: string;
    attachments?: string[];
    location?: string;
    duration?: number;
    participants?: string[];
    phoneNumber?: string;
    emailAddress?: string;
    fileSize?: number;
    fileName?: string;
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
  };
}

/**
 * Event priority levels
 */
export type EventPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Event type classification
 */
export type EventType = 'event' | 'task' | 'goal' | 'milestone';

/**
 * Notification trigger types
 */
export type NotificationTrigger = 'minutes' | 'hours' | 'days' | 'weeks';

/**
 * Notification rule for event reminders
 */
export interface NotificationRule {
  id: string;
  value: number;
  trigger: NotificationTrigger;
  enabled: boolean;
}

/**
 * Recurrence frequency types
 */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

/**
 * Recurrence rule for repeating events
 */
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  intervalType?: 'days' | 'weeks' | 'months' | 'years';
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  dayOfMonth?: number; // 1-31 or -1 for last day
  endDate?: string;
  occurrences?: number;
}

/**
 * Participant/Attendee for an event
 */
export interface EventParticipant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: 'organizer' | 'attendee' | 'optional';
  responseStatus?: 'needs_action' | 'accepted' | 'declined' | 'tentative';
}

/**
 * Calendar event
 */
export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  clientId?: string;
  clientName?: string;
  location?: string;
  service?: string;
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  type?: EventType;
  priority?: EventPriority;
  isAllDay?: boolean;
  isMultiDay?: boolean;
  isRecurring?: boolean;
  recurrence?: RecurrenceRule;
  parentEventId?: string;
  recurrenceGroupId?: string;
  notifications?: NotificationRule[];
  participants?: EventParticipant[];
  googleCalendarEventId?: string;
  outlookCalendarEventId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Billing document (invoice, receipt, quote)
 */
export interface BillingDocument {
  id: string;
  clientId: string;
  type: 'invoice' | 'receipt' | 'quote';
  amount: number;
  status: string;
  dueDate?: string;
  paidDate?: string;
  items?: BillingLineItem[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Line item within a billing document
 */
export interface BillingLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

/**
 * Testimonial from a client
 */
export interface Testimonial {
  id: string;
  clientId: string;
  content: string;
  rating?: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Service line offering
 */
export interface ServiceLine {
  id: string;
  name: string;
  description?: string;
  category?: string;
  pricing?: {
    min?: number;
    max?: number;
    unit?: string;
  };
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Activity log entry
 */
export interface ActivityLog {
  id: string;
  activityType: string;
  action: string;
  entityType: string;
  entityId?: string;
  clientId?: string;
  description: string;
  metadata?: Record<string, any>;
  userId?: string;
  userName?: string;
  userRole?: string;
  timestamp: string;
}

/**
 * User/Participant record
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Authentication response from login
 */
export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  message?: string;
}

// ============================================================================
// Request Payload Types
// ============================================================================

/**
 * Query parameters for fetching clients
 */
export interface ClientsQuery extends PaginationParams {
  status?: string;
  search?: string;
  serviceType?: string;
}

/**
 * Payload for creating a new client
 */
export interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  tags?: string[];
  serviceTypes?: string[];
  note?: string;
  projectType?: string;
  budget?: number;
}

/**
 * Payload for updating an existing client
 */
export interface UpdateClientData extends Partial<CreateClientData> {
  id: string;
}

/**
 * Query parameters for fetching conversations
 */
export interface ConversationsQuery extends PaginationParams {
  clientId?: string;
  status?: 'active' | 'resolved' | 'pending' | 'archived' | string;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | string;
  search?: string;
}

/**
 * Payload for creating a new conversation
 */
export interface CreateConversationData {
  clientId: string;
  title?: string;
  summary?: string;
  messages?: CreateMessageData[];
  status?: 'active' | 'resolved' | 'pending' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent';
  source?: 'email' | 'text' | 'phone' | 'meeting' | 'import' | 'manual';
  tags?: string[];
  nextActions?: string[];
  participants?: string[];
  relatedDocuments?: string[];
}

/**
 * Payload for sending a message
 */
export interface CreateMessageData {
  role: 'CLIENT' | 'YOU' | 'AI_DRAFT' | 'client' | 'you' | 'ai-draft';
  content: string;
  timestamp?: string;
  type: 'email' | 'text' | 'call-notes' | 'meeting-notes' | 'voice-memo' | 'file-upload';
  metadata?: {
    subject?: string;
    attachments?: string[];
    location?: string;
    duration?: number;
    participants?: string[];
    phoneNumber?: string;
    emailAddress?: string;
    fileSize?: number;
    fileName?: string;
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
  };
}

/**
 * Query parameters for fetching events
 */
export interface EventsQuery extends PaginationParams {
  clientId?: string;
  startDate?: string;
  endDate?: string;
  source?: 'database' | 'localStorage' | 'both' | 'google' | 'outlook';
}

/**
 * Payload for creating an event
 */
export interface CreateEventData {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  clientId?: string;
  clientName?: string;
  location?: string;
  service?: string;
  type?: EventType;
  priority?: EventPriority;
  isAllDay?: boolean;
  isMultiDay?: boolean;
  isRecurring?: boolean;
  recurrence?: RecurrenceRule;
  notifications?: NotificationRule[];
  participants?: EventParticipant[];
}

/**
 * Payload for user login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}
