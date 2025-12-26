/**
 * Event Model for WatermelonDB
 * Offline-first calendar event entity
 * @module lib/database/models/Event
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, json } from '@nozbe/watermelondb/decorators';

export type EventSyncStatus = 'synced' | 'pending' | 'conflict';
export type EventStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
export type EventType = 'event' | 'task' | 'goal' | 'milestone';
export type EventPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  intervalType?: 'days' | 'weeks' | 'months' | 'years';
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  occurrences?: number;
}

export interface NotificationRule {
  id: string;
  value: number;
  trigger: 'minutes' | 'hours' | 'days' | 'weeks';
  enabled: boolean;
}

export interface EventParticipant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: 'organizer' | 'attendee' | 'optional';
  responseStatus?: 'needs_action' | 'accepted' | 'declined' | 'tentative';
}

// Sanitizer for JSON fields
const sanitizeJson = (json: any) => json || null;

export class Event extends Model {
  static table = 'events';

  // Server-assigned ID (maps to id from API)
  @field('server_id') serverId!: string;

  // Core fields
  @field('title') title!: string;
  @field('description') description?: string;
  @date('start_time') startTime!: Date;
  @date('end_time') endTime!: Date;
  @field('timezone') timezone?: string;
  @field('client_id') clientId?: string; // Local client ID
  @field('client_server_id') clientServerId?: string; // Server client ID
  @field('client_name') clientName?: string;
  @field('location') location?: string;
  @field('service') service?: string;
  @field('status') status?: EventStatus | string;
  @field('type') type?: EventType | string;
  @field('priority') priority?: EventPriority;
  @field('is_all_day') isAllDay?: boolean;
  @field('is_multi_day') isMultiDay?: boolean;
  @field('is_recurring') isRecurring?: boolean;

  // Complex fields (stored as JSON)
  @json('recurrence', sanitizeJson) recurrence?: RecurrenceRule;
  @field('parent_event_id') parentEventId?: string;
  @field('recurrence_group_id') recurrenceGroupId?: string;
  @json('notifications', sanitizeJson) notifications?: NotificationRule[];
  @json('participants', sanitizeJson) participants?: EventParticipant[];

  // External calendar IDs
  @field('google_calendar_event_id') googleCalendarEventId?: string;
  @field('outlook_calendar_event_id') outlookCalendarEventId?: string;

  // Sync metadata
  @field('sync_status') syncStatus!: EventSyncStatus;
  @field('is_deleted') isDeleted!: boolean;
  @field('local_version') localVersion!: number;
  @field('server_version') serverVersion?: number;
  @date('last_synced_at') lastSyncedAt?: Date;
  @date('server_created_at') serverCreatedAt?: Date;
  @date('server_updated_at') serverUpdatedAt?: Date;

  // Local timestamps
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties

  /** Check if event needs syncing */
  get needsSync(): boolean {
    return this.syncStatus === 'pending' || this.syncStatus === 'conflict';
  }

  /** Check if event has pending local changes */
  get hasPendingChanges(): boolean {
    return this.syncStatus === 'pending';
  }

  /** Check if event has a sync conflict */
  get hasConflict(): boolean {
    return this.syncStatus === 'conflict';
  }

  /** Get event duration in minutes */
  get durationMinutes(): number {
    return Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
  }

  /** Check if event is in the past */
  get isPast(): boolean {
    return this.endTime < new Date();
  }

  /** Check if event is happening now */
  get isNow(): boolean {
    const now = new Date();
    return this.startTime <= now && now <= this.endTime;
  }

  /** Check if event is in the future */
  get isFuture(): boolean {
    return this.startTime > new Date();
  }

  /** Check if event is cancelled */
  get isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  /** Check if event has external calendar sync */
  get hasExternalSync(): boolean {
    return !!(this.googleCalendarEventId || this.outlookCalendarEventId);
  }

  /**
   * Convert to API-compatible object
   * Used when syncing to server
   */
  toApiObject(): Record<string, any> {
    return {
      id: this.serverId || undefined,
      title: this.title,
      description: this.description,
      startTime: this.startTime.toISOString(),
      endTime: this.endTime.toISOString(),
      timezone: this.timezone,
      clientId: this.clientServerId,
      clientName: this.clientName,
      location: this.location,
      service: this.service,
      status: this.status,
      type: this.type,
      priority: this.priority,
      isAllDay: this.isAllDay,
      isMultiDay: this.isMultiDay,
      isRecurring: this.isRecurring,
      recurrence: this.recurrence,
      parentEventId: this.parentEventId,
      recurrenceGroupId: this.recurrenceGroupId,
      notifications: this.notifications,
      participants: this.participants,
      googleCalendarEventId: this.googleCalendarEventId,
      outlookCalendarEventId: this.outlookCalendarEventId,
    };
  }

  /**
   * Create database record from API response
   * @static
   */
  static fromApiObject(apiEvent: any, localClientId?: string): Record<string, any> {
    const now = Date.now();
    return {
      server_id: apiEvent.id,
      title: apiEvent.title,
      description: apiEvent.description || null,
      start_time: new Date(apiEvent.startTime || apiEvent.startDateTime).getTime(),
      end_time: new Date(apiEvent.endTime || apiEvent.endDateTime).getTime(),
      timezone: apiEvent.timezone || null,
      client_id: localClientId || null,
      client_server_id: apiEvent.clientId || null,
      client_name: apiEvent.clientName || null,
      location: apiEvent.location || null,
      service: apiEvent.service || null,
      status: apiEvent.status || null,
      type: apiEvent.type || 'event',
      priority: apiEvent.priority || null,
      is_all_day: apiEvent.isAllDay || false,
      is_multi_day: apiEvent.isMultiDay || false,
      is_recurring: apiEvent.isRecurring || false,
      recurrence: apiEvent.recurrence ? JSON.stringify(apiEvent.recurrence) : null,
      parent_event_id: apiEvent.parentEventId || null,
      recurrence_group_id: apiEvent.recurrenceGroupId || null,
      notifications: apiEvent.notifications ? JSON.stringify(apiEvent.notifications) : null,
      participants: apiEvent.participants ? JSON.stringify(apiEvent.participants) : null,
      google_calendar_event_id: apiEvent.googleCalendarEventId || null,
      outlook_calendar_event_id: apiEvent.outlookCalendarEventId || null,
      sync_status: 'synced',
      is_deleted: false,
      local_version: 1,
      server_version: 1,
      last_synced_at: now,
      server_created_at: apiEvent.createdAt ? new Date(apiEvent.createdAt).getTime() : now,
      server_updated_at: apiEvent.updatedAt ? new Date(apiEvent.updatedAt).getTime() : now,
      created_at: now,
      updated_at: now,
    };
  }
}
