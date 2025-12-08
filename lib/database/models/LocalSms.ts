import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export type SmsType = 'inbox' | 'sent';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export class LocalSms extends Model {
  static table = 'local_sms';

  @field('device_sms_id') deviceSmsId!: string;
  @field('thread_id') threadId!: string;
  @field('address') address!: string;
  @field('normalized_address') normalizedAddress!: string;
  @field('body') body!: string;
  @date('timestamp') timestamp!: Date;
  @field('type') type!: SmsType;
  @field('contact_id') contactId?: string;
  @field('participant_id') participantId?: string;
  @field('conversation_id') conversationId?: string;
  @field('sync_status') syncStatus!: SyncStatus;
  @date('synced_at') syncedAt?: Date;
  @date('imported_at') importedAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Helper to check if SMS needs syncing
  get needsSync(): boolean {
    return this.syncStatus === 'pending' || this.syncStatus === 'failed';
  }

  // Helper to check if SMS is from user (sent)
  get isSent(): boolean {
    return this.type === 'sent';
  }

  // Helper to check if SMS is received (inbox)
  get isReceived(): boolean {
    return this.type === 'inbox';
  }
}
