/**
 * Sync Service for Offline-First Data Management
 * Handles synchronization between local WatermelonDB and server API
 * @module services/sync
 */

import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database, Client, Event, Receipt } from '../lib/database';
import { clientsApi } from '../lib/api/endpoints/clients';
import { eventsApi } from '../lib/api/endpoints/events';
import { billingApi } from '../lib/api/endpoints/billing';

// ============================================================================
// Types
// ============================================================================

export type EntityType = 'clients' | 'events' | 'receipts';
export type SyncStatus = 'synced' | 'pending' | 'conflict';
export type SyncAction = 'create' | 'update' | 'delete';

export interface SyncResult {
  success: boolean;
  entitiesProcessed: number;
  errors: SyncError[];
  conflictsFound: number;
}

export interface SyncError {
  entityType: EntityType;
  entityId: string;
  action: SyncAction;
  error: string;
}

export interface ConflictResolution {
  entityType: EntityType;
  entityId: string;
  resolution: 'keep_local' | 'keep_server' | 'merge';
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  hasError: boolean;
  errorMessage: string | null;
}

// ============================================================================
// Sync Service Class
// ============================================================================

class SyncService {
  private static instance: SyncService;
  private isSyncing = false;
  private syncListeners: ((state: SyncState) => void)[] = [];
  private networkCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastOnlineState = true;

  private constructor() {
    this.initNetworkMonitoring();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // ============================================================================
  // Network Monitoring
  // ============================================================================

  private initNetworkMonitoring(): void {
    // Check network status periodically
    this.networkCheckInterval = setInterval(async () => {
      const isOnline = await this.isOnline();
      if (isOnline && !this.lastOnlineState) {
        // We just came back online
        console.log('[SyncService] Network restored, triggering sync');
        this.syncAll().catch(err => {
          console.error('[SyncService] Auto-sync failed:', err);
        });
      }
      this.lastOnlineState = isOnline;
      this.notifyListeners();
    }, 30000); // Check every 30 seconds
  }

  async isOnline(): Promise<boolean> {
    try {
      // Try to fetch a lightweight endpoint to check connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 204;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // State Management
  // ============================================================================

  async getSyncState(): Promise<SyncState> {
    const isOnline = await this.isOnline();
    const pendingChanges = await this.getPendingChangesCount();
    const lastSyncTime = await this.getLastSyncTime();
    const lastError = await AsyncStorage.getItem('sync_last_error');

    return {
      isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime,
      pendingChanges,
      hasError: !!lastError,
      errorMessage: lastError,
    };
  }

  addSyncListener(listener: (state: SyncState) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private async notifyListeners(): Promise<void> {
    const state = await this.getSyncState();
    this.syncListeners.forEach(listener => listener(state));
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Perform full sync for all entity types
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress, skipping');
      return { success: true, entitiesProcessed: 0, errors: [], conflictsFound: 0 };
    }

    const isOnline = await this.isOnline();
    if (!isOnline) {
      console.log('[SyncService] Offline, skipping sync');
      return { success: false, entitiesProcessed: 0, errors: [{
        entityType: 'clients',
        entityId: '',
        action: 'update',
        error: 'Device is offline'
      }], conflictsFound: 0 };
    }

    this.isSyncing = true;
    await this.notifyListeners();

    const results: SyncResult = {
      success: true,
      entitiesProcessed: 0,
      errors: [],
      conflictsFound: 0,
    };

    try {
      // 1. Push local changes to server
      console.log('[SyncService] Pushing local changes...');
      const pushResult = await this.pushLocalChanges();
      results.entitiesProcessed += pushResult.entitiesProcessed;
      results.errors.push(...pushResult.errors);

      // 2. Pull server changes to local
      console.log('[SyncService] Pulling server changes...');
      const pullResult = await this.pullServerChanges();
      results.entitiesProcessed += pullResult.entitiesProcessed;
      results.errors.push(...pullResult.errors);
      results.conflictsFound += pullResult.conflictsFound;

      // 3. Update last sync time
      await AsyncStorage.setItem('sync_last_time', new Date().toISOString());
      await AsyncStorage.removeItem('sync_last_error');

      console.log('[SyncService] Sync completed:', results);
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      await AsyncStorage.setItem('sync_last_error', errorMessage);
      results.success = false;
      results.errors.push({
        entityType: 'clients',
        entityId: '',
        action: 'update',
        error: errorMessage,
      });
    } finally {
      this.isSyncing = false;
      await this.notifyListeners();
    }

    return results;
  }

  /**
   * Sync a specific entity type
   */
  async syncEntityType(entityType: EntityType): Promise<SyncResult> {
    const isOnline = await this.isOnline();
    if (!isOnline) {
      return { success: false, entitiesProcessed: 0, errors: [], conflictsFound: 0 };
    }

    const results: SyncResult = {
      success: true,
      entitiesProcessed: 0,
      errors: [],
      conflictsFound: 0,
    };

    try {
      // Push then pull for this entity type
      const pushResult = await this.pushEntityType(entityType);
      const pullResult = await this.pullEntityType(entityType);

      results.entitiesProcessed = pushResult.entitiesProcessed + pullResult.entitiesProcessed;
      results.errors = [...pushResult.errors, ...pullResult.errors];
      results.conflictsFound = pullResult.conflictsFound;
    } catch (error) {
      console.error(`[SyncService] Sync ${entityType} failed:`, error);
      results.success = false;
    }

    return results;
  }

  // ============================================================================
  // Push Operations (Local -> Server)
  // ============================================================================

  private async pushLocalChanges(): Promise<SyncResult> {
    const results: SyncResult = {
      success: true,
      entitiesProcessed: 0,
      errors: [],
      conflictsFound: 0,
    };

    for (const entityType of ['clients', 'events', 'receipts'] as EntityType[]) {
      const result = await this.pushEntityType(entityType);
      results.entitiesProcessed += result.entitiesProcessed;
      results.errors.push(...result.errors);
    }

    return results;
  }

  private async pushEntityType(entityType: EntityType): Promise<SyncResult> {
    const results: SyncResult = {
      success: true,
      entitiesProcessed: 0,
      errors: [],
      conflictsFound: 0,
    };

    const collection = database.get(entityType);
    const pendingRecords = await collection
      .query(Q.where('sync_status', 'pending'))
      .fetch();

    console.log(`[SyncService] Pushing ${pendingRecords.length} ${entityType}`);

    for (const record of pendingRecords) {
      try {
        await this.pushRecord(entityType, record);
        results.entitiesProcessed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({
          entityType,
          entityId: record.id,
          action: 'update',
          error: errorMessage,
        });
      }
    }

    return results;
  }

  private async pushRecord(entityType: EntityType, record: any): Promise<void> {
    const isNew = !record.serverId;
    const isDeleted = record.isDeleted;

    if (isDeleted && record.serverId) {
      // Delete from server
      await this.deleteFromServer(entityType, record.serverId);
    } else if (isNew) {
      // Create on server
      const serverId = await this.createOnServer(entityType, record);
      await database.write(async () => {
        await record.update((r: any) => {
          r.serverId = serverId;
          r.syncStatus = 'synced';
          r.lastSyncedAt = new Date();
        });
      });
    } else {
      // Update on server
      await this.updateOnServer(entityType, record);
      await database.write(async () => {
        await record.update((r: any) => {
          r.syncStatus = 'synced';
          r.lastSyncedAt = new Date();
        });
      });
    }
  }

  private async createOnServer(entityType: EntityType, record: any): Promise<string> {
    switch (entityType) {
      case 'clients': {
        const client = record as Client;
        const response = await clientsApi.createClient(client.toApiObject());
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to create client');
        }
        return response.data.id;
      }
      case 'events': {
        const event = record as Event;
        const response = await eventsApi.createEvent(event.toApiObject());
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to create event');
        }
        return response.data.id;
      }
      case 'receipts': {
        const receipt = record as Receipt;
        const response = await billingApi.createReceipt(receipt.toApiObject());
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to create receipt');
        }
        return response.data.id;
      }
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private async updateOnServer(entityType: EntityType, record: any): Promise<void> {
    switch (entityType) {
      case 'clients': {
        const client = record as Client;
        const response = await clientsApi.updateClient({
          id: client.serverId,
          ...client.toApiObject(),
        });
        if (!response.success) {
          throw new Error(response.error || 'Failed to update client');
        }
        break;
      }
      case 'events': {
        const event = record as Event;
        const response = await eventsApi.updateEvent(event.serverId, event.toApiObject());
        if (!response.success) {
          throw new Error(response.error || 'Failed to update event');
        }
        break;
      }
      case 'receipts': {
        const receipt = record as Receipt;
        const response = await billingApi.updateReceipt(receipt.serverId, receipt.toApiObject());
        if (!response.success) {
          throw new Error(response.error || 'Failed to update receipt');
        }
        break;
      }
    }
  }

  private async deleteFromServer(entityType: EntityType, serverId: string): Promise<void> {
    switch (entityType) {
      case 'clients':
        await clientsApi.deleteClient(serverId);
        break;
      case 'events':
        await eventsApi.deleteEvent(serverId);
        break;
      case 'receipts':
        await billingApi.deleteReceipt(serverId);
        break;
    }
  }

  // ============================================================================
  // Pull Operations (Server -> Local)
  // ============================================================================

  private async pullServerChanges(): Promise<SyncResult> {
    const results: SyncResult = {
      success: true,
      entitiesProcessed: 0,
      errors: [],
      conflictsFound: 0,
    };

    for (const entityType of ['clients', 'events', 'receipts'] as EntityType[]) {
      const result = await this.pullEntityType(entityType);
      results.entitiesProcessed += result.entitiesProcessed;
      results.errors.push(...result.errors);
      results.conflictsFound += result.conflictsFound;
    }

    return results;
  }

  private async pullEntityType(entityType: EntityType): Promise<SyncResult> {
    const results: SyncResult = {
      success: true,
      entitiesProcessed: 0,
      errors: [],
      conflictsFound: 0,
    };

    try {
      let serverData: any[] = [];

      switch (entityType) {
        case 'clients': {
          const response = await clientsApi.getClients({ limit: 1000 });
          if (response.success && response.data) {
            serverData = response.data;
          }
          break;
        }
        case 'events': {
          const response = await eventsApi.getEvents({ source: 'database' });
          if (response.success && response.data) {
            serverData = response.data;
          }
          break;
        }
        case 'receipts': {
          const response = await billingApi.getReceipts({ limit: 1000 });
          if (response.success && response.data) {
            serverData = response.data;
          }
          break;
        }
      }

      console.log(`[SyncService] Pulled ${serverData.length} ${entityType} from server`);

      // Process each server record
      for (const serverRecord of serverData) {
        try {
          const result = await this.mergeServerRecord(entityType, serverRecord);
          if (result === 'conflict') {
            results.conflictsFound++;
          } else {
            results.entitiesProcessed++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push({
            entityType,
            entityId: serverRecord.id,
            action: 'update',
            error: errorMessage,
          });
        }
      }

    } catch (error) {
      console.error(`[SyncService] Pull ${entityType} failed:`, error);
      results.success = false;
    }

    return results;
  }

  private async mergeServerRecord(
    entityType: EntityType,
    serverRecord: any
  ): Promise<'created' | 'updated' | 'conflict' | 'unchanged'> {
    const collection = database.get(entityType);

    // Find existing local record by server ID
    const existingRecords = await collection
      .query(Q.where('server_id', serverRecord.id))
      .fetch();

    const localRecord = existingRecords[0];

    if (!localRecord) {
      // Create new local record
      await database.write(async () => {
        let recordData: Record<string, any>;

        switch (entityType) {
          case 'clients':
            recordData = Client.fromApiObject(serverRecord);
            break;
          case 'events':
            recordData = Event.fromApiObject(serverRecord);
            break;
          case 'receipts':
            recordData = Receipt.fromApiObject(serverRecord);
            break;
          default:
            throw new Error(`Unknown entity type: ${entityType}`);
        }

        await collection.create((record: any) => {
          Object.assign(record, recordData);
        });
      });
      return 'created';
    }

    // Check for conflicts
    if ((localRecord as any).syncStatus === 'pending') {
      // Local changes exist - mark as conflict
      await database.write(async () => {
        await localRecord.update((r: any) => {
          r.syncStatus = 'conflict';
        });
      });
      return 'conflict';
    }

    // Update local record with server data
    await database.write(async () => {
      let recordData: Record<string, any>;

      switch (entityType) {
        case 'clients':
          recordData = Client.fromApiObject(serverRecord);
          break;
        case 'events':
          recordData = Event.fromApiObject(serverRecord);
          break;
        case 'receipts':
          recordData = Receipt.fromApiObject(serverRecord);
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }

      await localRecord.update((r: any) => {
        // Update all fields from server data
        Object.keys(recordData).forEach(key => {
          if (key !== 'id' && key !== 'created_at') {
            (r as any)[key] = recordData[key];
          }
        });
      });
    });

    return 'updated';
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  async resolveConflict(resolution: ConflictResolution): Promise<void> {
    const { entityType, entityId, resolution: resolutionType } = resolution;
    const collection = database.get(entityType);

    const records = await collection
      .query(Q.where('id', entityId))
      .fetch();

    const record = records[0];
    if (!record) {
      throw new Error('Record not found');
    }

    switch (resolutionType) {
      case 'keep_local':
        // Mark as pending to re-push to server
        await database.write(async () => {
          await record.update((r: any) => {
            r.syncStatus = 'pending';
            r.localVersion = r.localVersion + 1;
          });
        });
        // Re-sync to push local changes
        await this.syncEntityType(entityType);
        break;

      case 'keep_server':
        // Re-fetch from server and overwrite local
        await this.pullEntityType(entityType);
        break;

      case 'merge':
        // For now, just mark as pending and let user handle manually
        await database.write(async () => {
          await record.update((r: any) => {
            r.syncStatus = 'pending';
          });
        });
        break;
    }
  }

  async getConflicts(): Promise<Array<{ entityType: EntityType; record: any }>> {
    const conflicts: Array<{ entityType: EntityType; record: any }> = [];

    for (const entityType of ['clients', 'events', 'receipts'] as EntityType[]) {
      const collection = database.get(entityType);
      const conflictRecords = await collection
        .query(Q.where('sync_status', 'conflict'))
        .fetch();

      conflicts.push(...conflictRecords.map(record => ({ entityType, record })));
    }

    return conflicts;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  async getPendingChangesCount(): Promise<number> {
    let count = 0;

    for (const entityType of ['clients', 'events', 'receipts'] as EntityType[]) {
      const collection = database.get(entityType);
      const pendingCount = await collection
        .query(Q.where('sync_status', Q.notEq('synced')))
        .fetchCount();
      count += pendingCount;
    }

    return count;
  }

  async getLastSyncTime(): Promise<Date | null> {
    const timeStr = await AsyncStorage.getItem('sync_last_time');
    return timeStr ? new Date(timeStr) : null;
  }

  async clearAllData(): Promise<void> {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    await AsyncStorage.removeItem('sync_last_time');
    await AsyncStorage.removeItem('sync_last_error');
  }

  // ============================================================================
  // Optimistic Updates
  // ============================================================================

  /**
   * Create a record locally with optimistic update
   * Returns the local ID immediately, syncs in background
   */
  async createOptimistic<T extends EntityType>(
    entityType: T,
    data: Record<string, any>
  ): Promise<string> {
    const collection = database.get(entityType);
    let localId = '';

    await database.write(async () => {
      const now = Date.now();
      const record = await collection.create((r: any) => {
        Object.keys(data).forEach(key => {
          (r as any)[key] = data[key];
        });
        r.syncStatus = 'pending';
        r.isDeleted = false;
        r.localVersion = 1;
        r.createdAt = now;
        r.updatedAt = now;
      });
      localId = record.id;
    });

    // Trigger background sync
    this.syncEntityType(entityType).catch(err => {
      console.error(`[SyncService] Background sync failed:`, err);
    });

    return localId;
  }

  /**
   * Update a record locally with optimistic update
   */
  async updateOptimistic<T extends EntityType>(
    entityType: T,
    localId: string,
    updates: Record<string, any>
  ): Promise<void> {
    const collection = database.get(entityType);
    const records = await collection.query(Q.where('id', localId)).fetch();
    const record = records[0];

    if (!record) {
      throw new Error('Record not found');
    }

    await database.write(async () => {
      await record.update((r: any) => {
        Object.keys(updates).forEach(key => {
          (r as any)[key] = updates[key];
        });
        r.syncStatus = 'pending';
        r.localVersion = r.localVersion + 1;
        r.updatedAt = Date.now();
      });
    });

    // Trigger background sync
    this.syncEntityType(entityType).catch(err => {
      console.error(`[SyncService] Background sync failed:`, err);
    });
  }

  /**
   * Delete a record with optimistic update (soft delete)
   */
  async deleteOptimistic<T extends EntityType>(
    entityType: T,
    localId: string
  ): Promise<void> {
    const collection = database.get(entityType);
    const records = await collection.query(Q.where('id', localId)).fetch();
    const record = records[0];

    if (!record) {
      throw new Error('Record not found');
    }

    await database.write(async () => {
      await record.update((r: any) => {
        r.isDeleted = true;
        r.syncStatus = 'pending';
        r.localVersion = r.localVersion + 1;
        r.updatedAt = Date.now();
      });
    });

    // Trigger background sync
    this.syncEntityType(entityType).catch(err => {
      console.error(`[SyncService] Background sync failed:`, err);
    });
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
    }
    this.syncListeners = [];
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
