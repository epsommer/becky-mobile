import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export type EntityType = 'sms' | 'calendar' | 'email' | 'contact';
export type ActionType = 'create' | 'update' | 'delete';
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export class SyncQueueItem extends Model {
  static table = 'sync_queue_items';

  @field('entity_type') entityType!: EntityType;
  @field('entity_id') entityId!: string;
  @field('action') action!: ActionType;
  @field('payload') payload!: string; // JSON string
  @field('status') status!: QueueStatus;
  @field('retry_count') retryCount!: number;
  @field('error_message') errorMessage?: string;
  @field('server_id') serverId?: string;
  @date('completed_at') completedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Helper to get parsed payload
  get payloadData(): any {
    try {
      return JSON.parse(this.payload);
    } catch {
      return null;
    }
  }

  // Helper to check if item can be retried
  get canRetry(): boolean {
    return this.status === 'failed' && this.retryCount < 3;
  }

  // Helper to check if item is ready to sync
  get isReadyToSync(): boolean {
    return this.status === 'pending' || (this.status === 'failed' && this.canRetry);
  }

  // Helper to check if item is done (completed or permanently failed)
  get isDone(): boolean {
    return this.status === 'completed' || (this.status === 'failed' && !this.canRetry);
  }
}
