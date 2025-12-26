/**
 * Client Model for WatermelonDB
 * Offline-first CRM client entity
 * @module lib/database/models/Client
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, json } from '@nozbe/watermelondb/decorators';

export type ClientSyncStatus = 'synced' | 'pending' | 'conflict';
export type ClientStatus = 'active' | 'prospect' | 'completed' | 'inactive';

export interface ClientAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface ContactPreferences {
  autoInvoicing?: boolean;
  autoReceipts?: boolean;
  canReceiveEmails?: boolean;
  canReceiveTexts?: boolean;
}

// Sanitizer for JSON fields
const sanitizeJson = (json: any) => json || null;

export class Client extends Model {
  static table = 'clients';

  // Server-assigned ID (maps to id from API)
  @field('server_id') serverId!: string;

  // Core fields
  @field('name') name!: string;
  @field('email') email?: string;
  @field('phone') phone?: string;
  @field('company') company?: string;
  @field('status') status?: ClientStatus | string;
  @field('status_color') statusColor?: string;
  @field('note') note?: string;
  @json('tags', sanitizeJson) tags?: string[];
  @field('budget') budget?: number;
  @field('project_type') projectType?: string;
  @field('service_id') serviceId?: string;
  @json('service_types', sanitizeJson) serviceTypes?: string[];
  @field('timeline') timeline?: string;
  @field('seasonal_contract') seasonalContract?: boolean;
  @field('recurring_service') recurringService?: boolean;

  // Complex nested objects (stored as JSON)
  @json('address', sanitizeJson) address?: ClientAddress;
  @json('metadata', sanitizeJson) metadata?: Record<string, any>;
  @json('contact_preferences', sanitizeJson) contactPreferences?: ContactPreferences;
  @json('personal_info', sanitizeJson) personalInfo?: Record<string, any>;
  @json('service_profile', sanitizeJson) serviceProfile?: Record<string, any>;
  @json('billing_info', sanitizeJson) billingInfo?: Record<string, any>;
  @json('relationship_data', sanitizeJson) relationshipData?: Record<string, any>;

  // Sync metadata
  @field('sync_status') syncStatus!: ClientSyncStatus;
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

  /** Check if client needs syncing */
  get needsSync(): boolean {
    return this.syncStatus === 'pending' || this.syncStatus === 'conflict';
  }

  /** Check if client has pending local changes */
  get hasPendingChanges(): boolean {
    return this.syncStatus === 'pending';
  }

  /** Check if client has a sync conflict */
  get hasConflict(): boolean {
    return this.syncStatus === 'conflict';
  }

  /** Get display name with company */
  get displayName(): string {
    if (this.company) {
      return `${this.name} (${this.company})`;
    }
    return this.name;
  }

  /** Check if client is active */
  get isActive(): boolean {
    return this.status === 'active';
  }

  /** Get formatted address */
  get formattedAddress(): string | null {
    if (!this.address) return null;
    const parts = [
      this.address.street,
      this.address.city,
      this.address.state,
      this.address.zip,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * Convert to API-compatible object
   * Used when syncing to server
   */
  toApiObject(): Record<string, any> {
    return {
      id: this.serverId || undefined,
      name: this.name,
      email: this.email,
      phone: this.phone,
      company: this.company,
      status: this.status,
      statusColor: this.statusColor,
      note: this.note,
      tags: this.tags,
      budget: this.budget,
      projectType: this.projectType,
      serviceId: this.serviceId,
      serviceTypes: this.serviceTypes,
      timeline: this.timeline,
      seasonalContract: this.seasonalContract,
      recurringService: this.recurringService,
      address: this.address,
      metadata: this.metadata,
      contactPreferences: this.contactPreferences,
      personalInfo: this.personalInfo,
      serviceProfile: this.serviceProfile,
      billingInfo: this.billingInfo,
      relationshipData: this.relationshipData,
    };
  }

  /**
   * Create database record from API response
   * @static
   */
  static fromApiObject(apiClient: any): Record<string, any> {
    const now = Date.now();
    return {
      server_id: apiClient.id,
      name: apiClient.name,
      email: apiClient.email || null,
      phone: apiClient.phone || null,
      company: apiClient.company || null,
      status: apiClient.status || null,
      status_color: apiClient.statusColor || null,
      note: apiClient.note || null,
      tags: apiClient.tags ? JSON.stringify(apiClient.tags) : null,
      budget: apiClient.budget || null,
      project_type: apiClient.projectType || null,
      service_id: apiClient.serviceId || null,
      service_types: apiClient.serviceTypes ? JSON.stringify(apiClient.serviceTypes) : null,
      timeline: apiClient.timeline || null,
      seasonal_contract: apiClient.seasonalContract || false,
      recurring_service: apiClient.recurringService || false,
      address: apiClient.address ? JSON.stringify(apiClient.address) : null,
      metadata: apiClient.metadata ? JSON.stringify(apiClient.metadata) : null,
      contact_preferences: apiClient.contactPreferences ? JSON.stringify(apiClient.contactPreferences) : null,
      personal_info: apiClient.personalInfo ? JSON.stringify(apiClient.personalInfo) : null,
      service_profile: apiClient.serviceProfile ? JSON.stringify(apiClient.serviceProfile) : null,
      billing_info: apiClient.billingInfo ? JSON.stringify(apiClient.billingInfo) : null,
      relationship_data: apiClient.relationshipData ? JSON.stringify(apiClient.relationshipData) : null,
      sync_status: 'synced',
      is_deleted: false,
      local_version: 1,
      server_version: 1,
      last_synced_at: now,
      server_created_at: apiClient.createdAt ? new Date(apiClient.createdAt).getTime() : now,
      server_updated_at: apiClient.updatedAt ? new Date(apiClient.updatedAt).getTime() : now,
      created_at: now,
      updated_at: now,
    };
  }
}
