// src/types/participant-management.ts
// Enhanced types for participant management and appointment booking system

import { ServiceType } from './crm-integration';

// Core Participant Management Types
export interface Participant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role: ParticipantRole;
  services: ServiceType[];
  contactPreferences?: ContactPreferences;
  
  // External system integration
  bixbyContactId?: string;
  googleContactId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ContactPreferences {
  sms: boolean;
  email: boolean;
  voiceCall: boolean;
  preferredMethod: 'sms' | 'email' | 'voiceCall';
  timezone?: string;
  availableHours?: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
  availableDays?: number[]; // [1,2,3,4,5] for Mon-Fri
}

export enum ParticipantRole {
  CLIENT = 'CLIENT',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  ADMIN = 'ADMIN',
  TEAM_MEMBER = 'TEAM_MEMBER'
}

// Appointment Management Types
export interface Appointment {
  id: string;
  title: string;
  description?: string;
  
  // Timing
  startTime: string; // ISO string
  endTime: string;   // ISO string
  timezone: string;
  
  // Service details
  service: ServiceType;
  location?: string;
  
  // Status and management
  status: AppointmentStatus;
  
  // Organizer (main service provider)
  organizerId: string;
  organizer: Participant;
  
  // Multiple participants
  participants: AppointmentParticipant[];
  
  // External calendar integration
  googleCalendarEventId?: string;
  outlookCalendarEventId?: string;
  
  // Notifications
  notifications: NotificationLog[];
  
  // Voice command metadata
  voiceCommandData?: VoiceCommandMetadata;
  
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentParticipant {
  id: string;
  appointmentId: string;
  participantId: string;
  participant: Participant;
  
  responseStatus: ParticipantResponseStatus;
  role: ParticipantAppointmentRole;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
  NO_SHOW = 'NO_SHOW'
}

export enum ParticipantResponseStatus {
  NEEDS_ACTION = 'NEEDS_ACTION',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  TENTATIVE = 'TENTATIVE'
}

export enum ParticipantAppointmentRole {
  ORGANIZER = 'ORGANIZER',
  ATTENDEE = 'ATTENDEE',
  OPTIONAL = 'OPTIONAL'
}

// Notification System Types
export interface NotificationLog {
  id: string;
  appointmentId: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string; // phone number or email
  
  status: NotificationStatus;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  
  content: string;
  templateUsed?: string;
  
  // Error handling
  errorMessage?: string;
  retryCount: number;
  
  createdAt: string;
  updatedAt: string;
}

export enum NotificationType {
  CONFIRMATION = 'CONFIRMATION',
  REMINDER_24H = 'REMINDER_24H',
  REMINDER_1H = 'REMINDER_1H',
  CANCELLATION = 'CANCELLATION',
  RESCHEDULE = 'RESCHEDULE',
  FOLLOW_UP = 'FOLLOW_UP'
}

export enum NotificationChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  VOICE_CALL = 'VOICE_CALL',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION'
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

// Voice Command Integration Types
export interface VoiceCommand {
  id: string;
  
  // Voice processing
  transcript: string;
  intent: VoiceIntent;
  confidence: number;
  
  // Extracted entities
  participantName?: string;
  participantPhone?: string;
  service?: ServiceType;
  requestedDateTime?: string;
  
  // Processing results
  status: VoiceCommandStatus;
  appointmentId?: string;
  
  // Error handling
  errorMessage?: string;
  
  // Metadata
  voiceProvider?: string; // 'retell_ai', 'synthflow', etc.
  sessionId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface VoiceCommandMetadata {
  originalTranscript?: string;
  confidence?: number;
  voiceProvider?: string;
  sessionId?: string;
  processingNotes?: string[];
}

export enum VoiceIntent {
  BOOK_APPOINTMENT = 'BOOK_APPOINTMENT',
  CHECK_CALENDAR = 'CHECK_CALENDAR',
  CANCEL_APPOINTMENT = 'CANCEL_APPOINTMENT',
  RESCHEDULE_APPOINTMENT = 'RESCHEDULE_APPOINTMENT',
  GET_AVAILABILITY = 'GET_AVAILABILITY',
  UNKNOWN = 'UNKNOWN'
}

export enum VoiceCommandStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REQUIRES_CLARIFICATION = 'REQUIRES_CLARIFICATION'
}

// Calendar Integration Types
export interface CalendarIntegration {
  id: string;
  participantId: string;
  provider: CalendarProvider;
  externalId: string;
  accessToken: string;
  refreshToken?: string;
  
  isActive: boolean;
  lastSyncAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export enum CalendarProvider {
  GOOGLE = 'GOOGLE',
  OUTLOOK = 'OUTLOOK',
  APPLE = 'APPLE',
  CALDAV = 'CALDAV'
}

// API Request/Response Types
export interface CreateParticipantRequest {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: ParticipantRole;
  services?: ServiceType[];
  contactPreferences?: ContactPreferences;
}

export interface UpdateParticipantRequest extends Partial<CreateParticipantRequest> {
  id: string;
}

export interface CreateAppointmentRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  service: ServiceType;
  location?: string;
  organizerId: string;
  participantIds: string[];
  voiceCommandData?: VoiceCommandMetadata;
}

export interface UpdateAppointmentRequest extends Partial<CreateAppointmentRequest> {
  id: string;
  status?: AppointmentStatus;
}

export interface VoiceBookingRequest {
  transcript: string;
  voiceProvider?: string;
  sessionId?: string;
}

export interface VoiceBookingResponse {
  success: boolean;
  intent: VoiceIntent;
  confidence: number;
  appointmentId?: string;
  appointment?: Appointment;
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  error?: string;
}

// Search and Filter Types
export interface ParticipantSearchFilters {
  name?: string;
  email?: string;
  phone?: string;
  role?: ParticipantRole;
  services?: ServiceType[];
  company?: string;
}

export interface AppointmentSearchFilters {
  startDate?: string;
  endDate?: string;
  service?: ServiceType;
  status?: AppointmentStatus;
  organizerId?: string;
  participantId?: string;
  location?: string;
}

export interface ParticipantSearchResult {
  participants: Participant[];
  total: number;
  page: number;
  limit: number;
}

export interface AppointmentSearchResult {
  appointments: Appointment[];
  total: number;
  page: number;
  limit: number;
}

// Availability and Scheduling Types
export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  available: boolean;
  conflictReason?: string;
}

export interface AvailabilityRequest {
  participantIds: string[];
  startDate: string;
  endDate: string;
  duration: number; // minutes
  service?: ServiceType;
}

export interface AvailabilityResponse {
  availableSlots: AvailabilitySlot[];
  conflicts: AppointmentConflict[];
  suggestions: AvailabilitySlot[];
}

export interface AppointmentConflict {
  participantId: string;
  participantName: string;
  conflictingAppointmentId: string;
  conflictingAppointmentTitle: string;
  conflictTime: {
    start: string;
    end: string;
  };
}

// Notification Templates and Configuration
export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  name: string;
  subject?: string; // for email
  content: string;
  variables: string[]; // available template variables
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface NotificationConfig {
  sms: {
    provider: 'twilio';
    accountSid: string;
    authToken: string;
    fromNumber: string;
    templates: Record<NotificationType, string>;
  };
  email: {
    provider: 'sendgrid' | 'gmail_api';
    apiKey?: string;
    fromEmail: string;
    fromName: string;
    templates: Record<NotificationType, NotificationTemplate>;
  };
  calendar: {
    googleCalendar: boolean;
    outlookCalendar: boolean;
    autoCreateEvents: boolean;
    sendInvites: boolean;
  };
}

// Analytics and Reporting Types
export interface AppointmentAnalytics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  
  appointmentsByService: Record<ServiceType, number>;
  appointmentsByStatus: Record<AppointmentStatus, number>;
  appointmentsByMonth: Array<{
    month: string;
    count: number;
  }>;
  
  averageAppointmentDuration: number;
  mostActiveParticipants: Array<{
    participantId: string;
    participantName: string;
    appointmentCount: number;
  }>;
  
  notificationMetrics: {
    totalSent: number;
    deliveryRate: number;
    readRate: number;
    failureRate: number;
    byChannel: Record<NotificationChannel, {
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    }>;
  };
}

export interface VoiceCommandAnalytics {
  totalCommands: number;
  successfulBookings: number;
  failedCommands: number;
  clarificationRequired: number;
  
  intentDistribution: Record<VoiceIntent, number>;
  confidenceScores: {
    average: number;
    distribution: Array<{
      range: string;
      count: number;
    }>;
  };
  
  providerPerformance: Record<string, {
    totalCommands: number;
    successRate: number;
    averageConfidence: number;
  }>;
}

// Integration and Sync Types
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  errorCount: number;
  errors: Array<{
    itemId: string;
    error: string;
  }>;
  lastSyncAt: string;
}

export interface CalendarSyncRequest {
  participantId: string;
  provider: CalendarProvider;
  startDate?: string;
  endDate?: string;
  forceSync?: boolean;
}

export interface ContactSyncRequest {
  provider: 'google' | 'outlook' | 'bixby';
  participantIds?: string[];
  forceSync?: boolean;
}

// Utility Types
export type AppointmentWithParticipants = Appointment & {
  participants: (AppointmentParticipant & {
    participant: Participant;
  })[];
};

export type ParticipantWithAppointments = Participant & {
  organizedAppointments: Appointment[];
  participantAppointments: AppointmentParticipant[];
};

export type NotificationWithAppointment = NotificationLog & {
  appointment: Appointment;
};

// Export all types for easy importing
export * from './crm-integration';

// Re-export ServiceType explicitly to ensure it's available
export type { ServiceType } from './crm-integration';
