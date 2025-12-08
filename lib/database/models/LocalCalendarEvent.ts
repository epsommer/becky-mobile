import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export type SyncStatus = 'pending' | 'synced' | 'failed';

export class LocalCalendarEvent extends Model {
  static table = 'local_calendar_events';

  @field('device_event_id') deviceEventId!: string;
  @field('calendar_id') calendarId!: string;
  @field('title') title!: string;
  @date('start_date') startDate!: Date;
  @date('end_date') endDate!: Date;
  @field('location') location?: string;
  @field('notes') notes?: string;
  @field('all_day') allDay!: boolean;
  @field('recurrence_rule') recurrenceRule?: string;
  @field('attendees') attendees?: string; // JSON string array
  @field('participant_id') participantId?: string;
  @field('event_id') eventId?: string;
  @field('sync_status') syncStatus!: SyncStatus;
  @date('synced_at') syncedAt?: Date;
  @date('imported_at') importedAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Helper to get parsed attendees
  get attendeesList(): string[] {
    if (!this.attendees) return [];
    try {
      return JSON.parse(this.attendees);
    } catch {
      return [];
    }
  }

  // Helper to check if event needs syncing
  get needsSync(): boolean {
    return this.syncStatus === 'pending' || this.syncStatus === 'failed';
  }

  // Helper to check if event is recurring
  get isRecurring(): boolean {
    return !!this.recurrenceRule;
  }
}
