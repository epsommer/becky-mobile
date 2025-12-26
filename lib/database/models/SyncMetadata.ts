/**
 * SyncMetadata Model for WatermelonDB
 * Tracks sync state for offline-first operations
 * @module lib/database/models/SyncMetadata
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export type EntityType = 'clients' | 'events' | 'receipts';

export class SyncMetadata extends Model {
  static table = 'sync_metadata';

  @field('entity_type') entityType!: EntityType;
  @date('last_full_sync') lastFullSync?: Date;
  @date('last_partial_sync') lastPartialSync?: Date;
  @field('pending_changes_count') pendingChangesCount!: number;
  @field('sync_in_progress') syncInProgress!: boolean;
  @field('last_sync_error') lastSyncError?: string;
  @field('server_cursor') serverCursor?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties

  /** Check if a full sync has been performed */
  get hasFullSynced(): boolean {
    return !!this.lastFullSync;
  }

  /** Check if there are pending changes to sync */
  get hasPendingChanges(): boolean {
    return this.pendingChangesCount > 0;
  }

  /** Check if sync is currently in progress */
  get isSyncing(): boolean {
    return this.syncInProgress;
  }

  /** Check if last sync had an error */
  get hasError(): boolean {
    return !!this.lastSyncError;
  }

  /** Get time since last sync in minutes */
  get minutesSinceLastSync(): number | null {
    const lastSync = this.lastFullSync || this.lastPartialSync;
    if (!lastSync) return null;
    return Math.round((Date.now() - lastSync.getTime()) / (1000 * 60));
  }

  /** Check if data is stale (more than 30 minutes old) */
  get isStale(): boolean {
    const minutes = this.minutesSinceLastSync;
    return minutes === null || minutes > 30;
  }

  /** Get human-readable last sync time */
  get lastSyncTimeAgo(): string {
    const lastSync = this.lastFullSync || this.lastPartialSync;
    if (!lastSync) return 'Never synced';

    const minutes = this.minutesSinceLastSync!;
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;

    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }
}
