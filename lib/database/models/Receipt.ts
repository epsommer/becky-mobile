/**
 * Receipt Model for WatermelonDB
 * Offline-first billing document entity
 * @module lib/database/models/Receipt
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, json } from '@nozbe/watermelondb/decorators';

export type ReceiptSyncStatus = 'synced' | 'pending' | 'conflict';
export type ReceiptType = 'invoice' | 'receipt' | 'quote';
export type ReceiptStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface BillingLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// Sanitizer for JSON fields
const sanitizeJson = (json: any) => json || null;

export class Receipt extends Model {
  static table = 'receipts';

  // Server-assigned ID (maps to id from API)
  @field('server_id') serverId!: string;

  // Core fields
  @field('client_id') clientId?: string; // Local client ID
  @field('client_server_id') clientServerId!: string; // Server client ID
  @field('type') type!: ReceiptType;
  @field('amount') amount!: number;
  @field('status') status!: ReceiptStatus | string;
  @date('due_date') dueDate?: Date;
  @date('paid_date') paidDate?: Date;
  @json('items', sanitizeJson) items?: BillingLineItem[];
  @field('notes') notes?: string;

  // Sync metadata
  @field('sync_status') syncStatus!: ReceiptSyncStatus;
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

  /** Check if receipt needs syncing */
  get needsSync(): boolean {
    return this.syncStatus === 'pending' || this.syncStatus === 'conflict';
  }

  /** Check if receipt has pending local changes */
  get hasPendingChanges(): boolean {
    return this.syncStatus === 'pending';
  }

  /** Check if receipt has a sync conflict */
  get hasConflict(): boolean {
    return this.syncStatus === 'conflict';
  }

  /** Check if receipt is paid */
  get isPaid(): boolean {
    return this.status === 'paid';
  }

  /** Check if receipt is overdue */
  get isOverdue(): boolean {
    if (this.status === 'paid') return false;
    if (!this.dueDate) return false;
    return this.dueDate < new Date();
  }

  /** Check if receipt is a draft */
  get isDraft(): boolean {
    return this.status === 'draft';
  }

  /** Get total from line items */
  get calculatedTotal(): number {
    if (!this.items || this.items.length === 0) {
      return this.amount;
    }
    return this.items.reduce((sum, item) => sum + item.amount, 0);
  }

  /** Get item count */
  get itemCount(): number {
    return this.items?.length || 0;
  }

  /** Format amount as currency */
  get formattedAmount(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(this.amount);
  }

  /** Get days until due */
  get daysUntilDue(): number | null {
    if (!this.dueDate) return null;
    const now = new Date();
    const diffTime = this.dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Convert to API-compatible object
   * Used when syncing to server
   */
  toApiObject(): Record<string, any> {
    return {
      id: this.serverId || undefined,
      clientId: this.clientServerId,
      type: this.type,
      amount: this.amount,
      status: this.status,
      dueDate: this.dueDate?.toISOString(),
      paidDate: this.paidDate?.toISOString(),
      items: this.items,
      notes: this.notes,
    };
  }

  /**
   * Create database record from API response
   * @static
   */
  static fromApiObject(apiReceipt: any, localClientId?: string): Record<string, any> {
    const now = Date.now();
    return {
      server_id: apiReceipt.id,
      client_id: localClientId || null,
      client_server_id: apiReceipt.clientId,
      type: apiReceipt.type || 'receipt',
      amount: apiReceipt.amount || 0,
      status: apiReceipt.status || 'draft',
      due_date: apiReceipt.dueDate ? new Date(apiReceipt.dueDate).getTime() : null,
      paid_date: apiReceipt.paidDate ? new Date(apiReceipt.paidDate).getTime() : null,
      items: apiReceipt.items ? JSON.stringify(apiReceipt.items) : null,
      notes: apiReceipt.notes || null,
      sync_status: 'synced',
      is_deleted: false,
      local_version: 1,
      server_version: 1,
      last_synced_at: now,
      server_created_at: apiReceipt.createdAt ? new Date(apiReceipt.createdAt).getTime() : now,
      server_updated_at: apiReceipt.updatedAt ? new Date(apiReceipt.updatedAt).getTime() : now,
      created_at: now,
      updated_at: now,
    };
  }
}
