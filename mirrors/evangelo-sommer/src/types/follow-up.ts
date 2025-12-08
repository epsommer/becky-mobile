// Follow-up system types
import { 
  FollowUp, 
  FollowUpNotification, 
  FollowUpConfiguration,
  RecurrencePattern,
  FollowUpStatus,
  FollowUpCategory,
  FollowUpNotificationType,
  NotificationChannel,
  NotificationStatus,
  PriorityLevel 
} from '@prisma/client';

// Custom recurrence information
export interface CustomRecurrenceInfo {
  interval: number;
  unit: 'days' | 'weeks' | 'months';
  description: string;
}

// Core follow-up types with relationships
export type FollowUpWithRelations = FollowUp & {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  };
  notifications: FollowUpNotification[];
  childFollowUps?: FollowUpWithRelations[];
  parentFollowUp?: FollowUpWithRelations;
  customRecurrence?: CustomRecurrenceInfo;
};

// Follow-up creation request
export interface CreateFollowUpRequest {
  clientId: string;
  serviceId?: string;
  scheduledDate: string; // ISO 8601 datetime string
  timezone?: string;
  duration?: number;
  title?: string;
  notes?: string;
  priority?: PriorityLevel;
  category?: FollowUpCategory;
  recurrencePattern?: RecurrencePattern;
  recurrenceData?: RecurrenceConfig;
  reminderDays?: number[]; // Days before follow-up to send reminders
  
  // Custom recurrence fields for Woodgreen Landscaping
  customInterval?: number; // e.g., 2 for "every 2 weeks"
  customIntervalUnit?: 'days' | 'weeks' | 'months'; // Unit for custom interval
}

// Follow-up update request
export interface UpdateFollowUpRequest {
  scheduledDate?: string;
  timezone?: string;
  duration?: number;
  title?: string;
  notes?: string;
  outcome?: string;
  actionItems?: string[];
  priority?: PriorityLevel;
  category?: FollowUpCategory;
  status?: FollowUpStatus;
}

// Recurrence configuration
export interface RecurrenceConfig {
  pattern: RecurrencePattern;
  interval?: number; // For custom patterns
  endDate?: string;
  maxOccurrences?: number;
  weeklyDays?: string[]; // ['MONDAY', 'WEDNESDAY', 'FRIDAY']
  monthlyType?: 'DAY_OF_MONTH' | 'DAY_OF_WEEK'; // 15th of month vs 2nd Tuesday
  seasonalMonths?: number[]; // [3, 6, 9, 12] for quarterly
}

// Scheduling conflict detection
export interface SchedulingConflict {
  type: 'APPOINTMENT' | 'FOLLOW_UP' | 'BUSINESS_HOURS';
  conflictId: string;
  conflictTitle: string;
  startTime: Date;
  endTime: Date;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestions: AlternativeTimeSlot[];
}

export interface AlternativeTimeSlot {
  startTime: Date;
  endTime: Date;
  reason: string;
  score: number; // 0-100, higher is better
}

// Business hours validation
export interface BusinessHours {
  day: string; // 'MONDAY', 'TUESDAY', etc.
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
  isWorkingDay: boolean;
}

export interface TimeZoneInfo {
  name: string;
  offset: string;
  abbreviation: string;
}

// Follow-up completion
export interface CompleteFollowUpRequest {
  outcome: string;
  actionItems?: string[];
  notes?: string;
  scheduleNext?: boolean;
  nextFollowUpDate?: string;
  nextFollowUpNotes?: string;
}

// Notification management
export interface NotificationTemplate {
  type: FollowUpNotificationType;
  channel: NotificationChannel;
  subject?: string;
  content: string;
  variables: string[]; // Available template variables
}

export interface ScheduleNotificationRequest {
  followUpId: string;
  type: FollowUpNotificationType;
  channel: NotificationChannel;
  recipient: string;
  scheduledAt: string;
  templateId?: string;
  customContent?: string;
}

// Calendar integration
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  reminders: CalendarReminder[];
}

export interface CalendarReminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number; // Minutes before event
}

export interface GoogleCalendarIntegration {
  accessToken: string;
  refreshToken: string;
  calendarId: string;
  enabled: boolean;
}

// Reporting and analytics
export interface FollowUpMetrics {
  totalScheduled: number;
  totalCompleted: number;
  totalMissed: number;
  completionRate: number;
  averageResponseTime: number; // Hours
  categoryBreakdown: Record<FollowUpCategory, number>;
  upcomingCount: number;
  overdueCount: number;
}

export interface ClientFollowUpHistory {
  clientId: string;
  clientName: string;
  totalFollowUps: number;
  completedFollowUps: number;
  missedFollowUps: number;
  lastFollowUpDate: Date | null;
  nextFollowUpDate: Date | null;
  averageResponseRate: number;
  recentFollowUps: FollowUpWithRelations[];
}

// Search and filtering
export interface FollowUpFilters {
  clientId?: string;
  status?: FollowUpStatus[];
  category?: FollowUpCategory[];
  priority?: PriorityLevel[];
  dateFrom?: string;
  dateTo?: string;
  overdueOnly?: boolean;
  upcomingOnly?: boolean;
  recurringOnly?: boolean;
}

export interface FollowUpSearchParams extends FollowUpFilters {
  page?: number;
  limit?: number;
  sortBy?: 'scheduledDate' | 'priority' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  searchTerm?: string; // Search in title, notes, client name
}

// API response types
export interface FollowUpResponse {
  success: boolean;
  data?: FollowUpWithRelations;
  error?: string;
  conflicts?: SchedulingConflict[];
}

export interface FollowUpListResponse {
  success: boolean;
  data?: FollowUpWithRelations[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}

export interface ConflictCheckResponse {
  success: boolean;
  conflicts: SchedulingConflict[];
  alternatives: AlternativeTimeSlot[];
  error?: string;
}

// Mark Levy specific test data structure
export interface MarkLevyTestData {
  client: {
    name: string;
    email: string;
    phone: string;
    company: string;
    serviceTypes: string[];
    preferences: {
      contactMethod: 'SMS' | 'EMAIL' | 'PHONE';
      reminderDays: number[];
      timezone: string;
    };
  };
  followUps: CreateFollowUpRequest[];
  expectedOutcomes: string[];
}

// Error types
export class FollowUpError extends Error {
  constructor(
    message: string,
    public code: 'CONFLICT' | 'VALIDATION' | 'PERMISSION' | 'NOT_FOUND' | 'INTEGRATION',
    public details?: any
  ) {
    super(message);
    this.name = 'FollowUpError';
  }
}

// Configuration types
export interface FollowUpSystemConfig {
  businessHours: BusinessHours[];
  timezone: string;
  defaultDuration: number;
  defaultReminderDays: number[];
  maxAdvanceBookingDays: number;
  enableCalendarIntegration: boolean;
  enableSMSNotifications: boolean;
  enableEmailNotifications: boolean;
  notificationTemplates: NotificationTemplate[];
}