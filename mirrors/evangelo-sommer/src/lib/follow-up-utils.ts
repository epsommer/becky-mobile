// Follow-up system utility functions
import { 
  RecurrencePattern, 
  FollowUpStatus, 
  FollowUpCategory,
  PriorityLevel
} from '@prisma/client';
import {
  RecurrenceConfig,
  BusinessHours,
  SchedulingConflict,
  AlternativeTimeSlot,
  FollowUpSystemConfig
} from '@/types/follow-up';

// Timezone handling utilities
export class TimezoneUtils {
  static convertToTimezone(date: Date, timezone: string): Date {
    return new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  }

  static getTimezoneOffset(timezone: string): number {
    const date = new Date();
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    const tzDate = new Date(utcDate.toLocaleString("en-US", { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / 60000; // Return offset in minutes
  }

  static formatDateForTimezone(date: Date, timezone: string): string {
    return date.toLocaleString("en-US", { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}

// Business hours validation
export class BusinessHoursValidator {
  static isWithinBusinessHours(
    date: Date, 
    businessHours: BusinessHours[], 
    timezone: string = 'America/Toronto'
  ): boolean {
    const localDate = TimezoneUtils.convertToTimezone(date, timezone);
    const dayName = localDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    
    const dayConfig = businessHours.find(bh => bh.day === dayName);
    if (!dayConfig || !dayConfig.isWorkingDay) {
      return false;
    }

    const timeStr = localDate.toTimeString().substring(0, 5); // Get HH:MM format
    return timeStr >= dayConfig.startTime && timeStr <= dayConfig.endTime;
  }

  static getNextBusinessSlot(
    requestedDate: Date,
    duration: number,
    businessHours: BusinessHours[],
    timezone: string = 'America/Toronto'
  ): Date | null {
    let checkDate = new Date(requestedDate);
    const maxDaysToCheck = 30; // Prevent infinite loop
    
    for (let i = 0; i < maxDaysToCheck; i++) {
      if (this.isWithinBusinessHours(checkDate, businessHours, timezone)) {
        // Check if the full duration fits within business hours
        const endTime = new Date(checkDate.getTime() + duration * 60000);
        if (this.isWithinBusinessHours(endTime, businessHours, timezone)) {
          return checkDate;
        }
      }
      
      // Move to next business day start
      checkDate.setDate(checkDate.getDate() + 1);
      checkDate.setHours(9, 0, 0, 0); // Default to 9 AM
    }
    
    return null;
  }
}

// Recurrence pattern generation
export class RecurrenceGenerator {
  static generateRecurrencePattern(
    startDate: Date,
    config: RecurrenceConfig,
    maxOccurrences: number = 50,
    customInterval?: number,
    customIntervalUnit?: string
  ): Date[] {
    const occurrences: Date[] = [];
    let currentDate = new Date(startDate);
    let count = 0;

    while (count < maxOccurrences) {
      if (config.maxOccurrences && count >= config.maxOccurrences) break;
      if (config.endDate && currentDate > new Date(config.endDate)) break;

      occurrences.push(new Date(currentDate));
      currentDate = this.getNextOccurrence(currentDate, config, customInterval, customIntervalUnit);
      count++;
    }

    return occurrences;
  }

  private static getNextOccurrence(date: Date, config: RecurrenceConfig, customInterval?: number, customIntervalUnit?: string): Date {
    const nextDate = new Date(date);
    const interval = config.interval || 1;

    switch (config.pattern) {
      case RecurrencePattern.DAILY:
        nextDate.setDate(nextDate.getDate() + interval);
        break;

      case RecurrencePattern.WEEKLY:
        nextDate.setDate(nextDate.getDate() + (7 * interval));
        break;

      case RecurrencePattern.BI_WEEKLY:
        nextDate.setDate(nextDate.getDate() + 14);
        break;

      case RecurrencePattern.MONTHLY:
        if (config.monthlyType === 'DAY_OF_MONTH') {
          nextDate.setMonth(nextDate.getMonth() + interval);
        } else {
          // Day of week (e.g., 2nd Tuesday of month)
          nextDate.setMonth(nextDate.getMonth() + interval);
          // Complex logic for nth weekday would go here
        }
        break;

      case RecurrencePattern.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + (3 * interval));
        break;

      case RecurrencePattern.SEMI_ANNUALLY:
        nextDate.setMonth(nextDate.getMonth() + (6 * interval));
        break;

      case RecurrencePattern.ANNUALLY:
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;

      case RecurrencePattern.SEASONAL:
        // Move to next seasonal month
        if (config.seasonalMonths) {
          const currentMonth = nextDate.getMonth() + 1; // 1-based
          const nextSeasonalMonth = config.seasonalMonths.find(m => m > currentMonth) ||
                                   config.seasonalMonths[0]; // Wrap to next year
          
          if (nextSeasonalMonth > currentMonth) {
            nextDate.setMonth(nextSeasonalMonth - 1); // Convert back to 0-based
          } else {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            nextDate.setMonth(nextSeasonalMonth - 1);
          }
        }
        break;

      case RecurrencePattern.CUSTOM:
        // Handle custom recurrence with flexible intervals
        if (customInterval && customIntervalUnit) {
          switch (customIntervalUnit) {
            case 'days':
              nextDate.setDate(nextDate.getDate() + customInterval);
              break;
            case 'weeks':
              nextDate.setDate(nextDate.getDate() + (customInterval * 7));
              break;
            case 'months':
              nextDate.setMonth(nextDate.getMonth() + customInterval);
              break;
          }
        }
        break;

      default:
        // NONE - no automatic recurrence
        break;
    }

    return nextDate;
  }
}

// Conflict detection
export class ConflictDetector {
  static async detectConflicts(
    proposedStart: Date,
    proposedEnd: Date,
    clientId: string,
    excludeId?: string
  ): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = [];
    
    // This would integrate with your existing appointment and follow-up data
    // For now, returning empty array - actual implementation would query database
    
    return conflicts;
  }

  static generateAlternatives(
    originalStart: Date,
    duration: number,
    conflicts: SchedulingConflict[],
    businessHours: BusinessHours[],
    timezone: string = 'America/Toronto'
  ): AlternativeTimeSlot[] {
    const alternatives: AlternativeTimeSlot[] = [];
    const baseDate = new Date(originalStart);
    
    // Generate alternatives for the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDate = new Date(baseDate);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      
      // Generate hourly slots during business hours
      for (let hour = 9; hour <= 17; hour++) {
        checkDate.setHours(hour, 0, 0, 0);
        const endTime = new Date(checkDate.getTime() + duration * 60000);
        
        if (BusinessHoursValidator.isWithinBusinessHours(checkDate, businessHours, timezone) &&
            BusinessHoursValidator.isWithinBusinessHours(endTime, businessHours, timezone)) {
          
          const hasConflict = conflicts.some(conflict => 
            checkDate < conflict.endTime && endTime > conflict.startTime
          );
          
          if (!hasConflict) {
            alternatives.push({
              startTime: new Date(checkDate),
              endTime: new Date(endTime),
              reason: dayOffset === 0 ? 'Same day alternative' : `${dayOffset} days later`,
              score: Math.max(100 - (dayOffset * 10) - Math.abs(hour - originalStart.getHours()), 1)
            });
          }
        }
      }
    }
    
    // Sort by score (highest first)
    return alternatives.sort((a, b) => b.score - a.score).slice(0, 10);
  }
}

// Status management
export class FollowUpStatusManager {
  static canTransitionTo(currentStatus: FollowUpStatus, newStatus: FollowUpStatus): boolean {
    const allowedTransitions: Record<FollowUpStatus, FollowUpStatus[]> = {
      [FollowUpStatus.SCHEDULED]: [
        FollowUpStatus.CONFIRMED,
        FollowUpStatus.CANCELLED,
        FollowUpStatus.RESCHEDULED,
        FollowUpStatus.MISSED
      ],
      [FollowUpStatus.CONFIRMED]: [
        FollowUpStatus.IN_PROGRESS,
        FollowUpStatus.CANCELLED,
        FollowUpStatus.RESCHEDULED,
        FollowUpStatus.MISSED
      ],
      [FollowUpStatus.IN_PROGRESS]: [
        FollowUpStatus.COMPLETED,
        FollowUpStatus.CANCELLED
      ],
      [FollowUpStatus.COMPLETED]: [], // Terminal state
      [FollowUpStatus.CANCELLED]: [
        FollowUpStatus.RESCHEDULED
      ],
      [FollowUpStatus.MISSED]: [
        FollowUpStatus.RESCHEDULED,
        FollowUpStatus.CANCELLED
      ],
      [FollowUpStatus.RESCHEDULED]: [
        FollowUpStatus.SCHEDULED
      ]
    };

    return allowedTransitions[currentStatus]?.includes(newStatus) || false;
  }

  static getNextStatuses(currentStatus: FollowUpStatus): FollowUpStatus[] {
    const transitions: Record<FollowUpStatus, FollowUpStatus[]> = {
      [FollowUpStatus.SCHEDULED]: [FollowUpStatus.CONFIRMED, FollowUpStatus.CANCELLED],
      [FollowUpStatus.CONFIRMED]: [FollowUpStatus.IN_PROGRESS, FollowUpStatus.CANCELLED],
      [FollowUpStatus.IN_PROGRESS]: [FollowUpStatus.COMPLETED],
      [FollowUpStatus.COMPLETED]: [],
      [FollowUpStatus.CANCELLED]: [FollowUpStatus.RESCHEDULED],
      [FollowUpStatus.MISSED]: [FollowUpStatus.RESCHEDULED],
      [FollowUpStatus.RESCHEDULED]: [FollowUpStatus.SCHEDULED]
    };

    return transitions[currentStatus] || [];
  }
}

// Notification timing calculation
export class NotificationScheduler {
  static calculateReminderTimes(
    followUpDate: Date,
    reminderDays: number[],
    timezone: string = 'America/Toronto'
  ): Date[] {
    return reminderDays.map(days => {
      const reminderDate = new Date(followUpDate);
      reminderDate.setDate(reminderDate.getDate() - days);
      reminderDate.setHours(10, 0, 0, 0); // Default to 10 AM for reminders
      return reminderDate;
    });
  }

  static shouldSendReminder(
    scheduledTime: Date,
    followUpDate: Date,
    lastSentTimes: Date[]
  ): boolean {
    const now = new Date();
    
    // Don't send if reminder time hasn't arrived
    if (now < scheduledTime) return false;
    
    // Don't send if follow-up has passed
    if (now > followUpDate) return false;
    
    // Don't send if already sent within the last 24 hours
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return !lastSentTimes.some(sentTime => sentTime > oneDayAgo);
  }
}

// Priority and category helpers
export class FollowUpClassifier {
  static determinePriority(
    category: FollowUpCategory,
    clientImportance: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM',
    daysOverdue: number = 0
  ): PriorityLevel {
    // Base priority by category (updated for Woodgreen Landscaping workflow)
    const categoryPriorities: Record<FollowUpCategory, PriorityLevel> = {
      [FollowUpCategory.COMPLAINT_RESOLUTION]: PriorityLevel.URGENT,
      [FollowUpCategory.PAYMENT_FOLLOW_UP]: PriorityLevel.HIGH,
      [FollowUpCategory.CONTRACT_RENEWAL]: PriorityLevel.HIGH,
      [FollowUpCategory.SERVICE_CHECK]: PriorityLevel.MEDIUM,
      [FollowUpCategory.MAINTENANCE_REMINDER]: PriorityLevel.MEDIUM, // Regular lawn care, weeding
      [FollowUpCategory.PROJECT_UPDATE]: PriorityLevel.MEDIUM,
      [FollowUpCategory.SEASONAL_PLANNING]: PriorityLevel.MEDIUM, // Tree trimming, leaf removal - time-sensitive
      [FollowUpCategory.RELATIONSHIP_BUILDING]: PriorityLevel.LOW,
      [FollowUpCategory.UPSELL_OPPORTUNITY]: PriorityLevel.LOW,
      [FollowUpCategory.GENERAL]: PriorityLevel.MEDIUM
    };

    let priority = categoryPriorities[category];

    // Adjust for client importance
    if (clientImportance === 'HIGH' && priority === PriorityLevel.LOW) {
      priority = PriorityLevel.MEDIUM;
    } else if (clientImportance === 'HIGH' && priority === PriorityLevel.MEDIUM) {
      priority = PriorityLevel.HIGH;
    }

    // Escalate for overdue items
    if (daysOverdue > 7) {
      if (priority === PriorityLevel.LOW) priority = PriorityLevel.MEDIUM;
      else if (priority === PriorityLevel.MEDIUM) priority = PriorityLevel.HIGH;
      else if (priority === PriorityLevel.HIGH) priority = PriorityLevel.URGENT;
    }

    return priority;
  }

  static suggestCategory(
    serviceType?: string,
    previousInteractions?: string[],
    timeFromLastService?: number
  ): FollowUpCategory {
    // Simple heuristics for category suggestion
    if (timeFromLastService && timeFromLastService > 90) {
      return FollowUpCategory.SERVICE_CHECK;
    }

    if (serviceType) {
      const lowerServiceType = serviceType.toLowerCase();
      
      // Woodgreen Landscaping specific mappings
      if (['tree_trimming', 'hedge_trimming', 'mulching', 'dethatching', 'leaf_removal'].some(s => lowerServiceType.includes(s))) {
        return FollowUpCategory.SEASONAL_PLANNING;
      }
      
      if (['lawn_mowing', 'weeding', 'gardening_planting', 'gardening_seeding'].some(s => lowerServiceType.includes(s))) {
        return FollowUpCategory.MAINTENANCE_REMINDER;
      }
      
      if (lowerServiceType.includes('gutter_cleaning')) {
        return FollowUpCategory.SEASONAL_PLANNING;
      }
      
      // Original mappings
      if (lowerServiceType.includes('maintenance')) {
        return FollowUpCategory.MAINTENANCE_REMINDER;
      }

      if (lowerServiceType.includes('seasonal')) {
        return FollowUpCategory.SEASONAL_PLANNING;
      }
    }

    return FollowUpCategory.GENERAL;
  }
}

// Validation utilities
export class FollowUpValidator {
  // Woodgreen Landscaping service types
  static readonly WOODGREEN_SERVICE_TYPES = [
    'TREE_TRIMMING',
    'LAWN_MOWING',
    'HEDGE_TRIMMING',
    'WEEDING',
    'GARDENING_PLANTING',
    'GARDENING_SEEDING',
    'MULCHING',
    'GUTTER_CLEANING',
    'DETHATCHING',
    'LEAF_REMOVAL',
    // Include original service types for backward compatibility
    'LAWN_CARE',
    'LANDSCAPING',
    'MAINTENANCE',
    'SNOW_REMOVAL',
    'EMERGENCY',
    'CONSULTATION',
    'DESIGN',
    'INSTALLATION'
  ];

  static validateScheduleRequest(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.clientId) {
      errors.push('Client ID is required');
    }

    if (!data.scheduledDate) {
      errors.push('Scheduled date is required');
    } else {
      const scheduledDate = new Date(data.scheduledDate);
      if (isNaN(scheduledDate.getTime())) {
        errors.push('Invalid scheduled date format');
      } else if (scheduledDate <= new Date()) {
        errors.push('Scheduled date must be in the future');
      }
    }

    if (data.duration && (data.duration < 15 || data.duration > 480)) {
      errors.push('Duration must be between 15 and 480 minutes');
    }

    // Validate service type if provided
    if (data.serviceId && !this.WOODGREEN_SERVICE_TYPES.includes(data.serviceId)) {
      errors.push('Invalid service type for Woodgreen Landscaping');
    }

    // Validate custom recurrence
    if (data.recurrencePattern === RecurrencePattern.CUSTOM) {
      if (!data.customInterval || !data.customIntervalUnit) {
        errors.push('Custom interval and interval unit are required for custom recurrence patterns');
      }
      
      if (data.customInterval && (data.customInterval < 1 || data.customInterval > 365)) {
        errors.push('Custom interval must be between 1 and 365');
      }
      
      if (data.customIntervalUnit && !['days', 'weeks', 'months'].includes(data.customIntervalUnit)) {
        errors.push('Custom interval unit must be days, weeks, or months');
      }
    }

    if (data.recurrencePattern === RecurrencePattern.CUSTOM && !data.recurrenceData && !data.customInterval) {
      errors.push('Either recurrence data or custom interval is required for custom patterns');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateUpdateRequest(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.scheduledDate) {
      const scheduledDate = new Date(data.scheduledDate);
      if (isNaN(scheduledDate.getTime())) {
        errors.push('Invalid scheduled date format');
      }
    }

    if (data.duration && (data.duration < 15 || data.duration > 480)) {
      errors.push('Duration must be between 15 and 480 minutes');
    }

    if (data.actionItems && !Array.isArray(data.actionItems)) {
      errors.push('Action items must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Default system configuration
export const DEFAULT_FOLLOW_UP_CONFIG: FollowUpSystemConfig = {
  businessHours: [
    { day: 'MONDAY', startTime: '09:00', endTime: '17:00', isWorkingDay: true },
    { day: 'TUESDAY', startTime: '09:00', endTime: '17:00', isWorkingDay: true },
    { day: 'WEDNESDAY', startTime: '09:00', endTime: '17:00', isWorkingDay: true },
    { day: 'THURSDAY', startTime: '09:00', endTime: '17:00', isWorkingDay: true },
    { day: 'FRIDAY', startTime: '09:00', endTime: '17:00', isWorkingDay: true },
    { day: 'SATURDAY', startTime: '10:00', endTime: '14:00', isWorkingDay: false },
    { day: 'SUNDAY', startTime: '10:00', endTime: '14:00', isWorkingDay: false }
  ],
  timezone: 'America/Toronto',
  defaultDuration: 60,
  defaultReminderDays: [7, 1],
  maxAdvanceBookingDays: 365,
  enableCalendarIntegration: true,
  enableSMSNotifications: true,
  enableEmailNotifications: true,
  notificationTemplates: []
};