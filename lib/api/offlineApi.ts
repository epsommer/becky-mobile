/**
 * Offline-Aware API Wrapper
 * Provides offline-first data access with automatic fallback to local database
 * @module lib/api/offlineApi
 */

import { Q } from '@nozbe/watermelondb';
import { database, Client, Event, Receipt } from '../database';
import { syncService } from '../../services/sync';
import { clientsApi } from './endpoints/clients';
import { eventsApi } from './endpoints/events';
import { billingApi, BillingQuery } from './endpoints/billing';
import type {
  Client as ClientType,
  Event as EventType,
  BillingDocument,
  ApiResponse,
  ClientsQuery,
  EventsQuery,
  CreateClientData,
  CreateEventData,
} from './types';
import type { CreateReceiptData } from './endpoints/billing';

// ============================================================================
// Types
// ============================================================================

export interface OfflineApiOptions {
  /** Force online fetch even if cached data exists */
  forceOnline?: boolean;
  /** Skip local cache and only use online data */
  skipCache?: boolean;
}

export interface OfflineApiResult<T> {
  data: T;
  source: 'local' | 'remote';
  isStale: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function isOnline(): Promise<boolean> {
  return syncService.isOnline();
}

function isDataStale(lastSyncTime: Date | null, maxAgeMinutes = 30): boolean {
  if (!lastSyncTime) return true;
  const now = new Date();
  const diffMs = now.getTime() - lastSyncTime.getTime();
  return diffMs > maxAgeMinutes * 60 * 1000;
}

// ============================================================================
// Clients API (Offline-Aware)
// ============================================================================

export const offlineClientsApi = {
  /**
   * Get all clients with offline fallback
   */
  async getClients(
    params?: ClientsQuery,
    options: OfflineApiOptions = {}
  ): Promise<OfflineApiResult<ClientType[]>> {
    const online = await isOnline();
    const lastSyncTime = await syncService.getLastSyncTime();

    // Try online first if available and not using cache only
    if (online && !options.skipCache) {
      try {
        const response = await clientsApi.getClients(params);
        if (response.success && response.data) {
          // Update local cache in background
          updateLocalClients(response.data).catch(console.error);
          return {
            data: response.data,
            source: 'remote',
            isStale: false,
          };
        }
      } catch (error) {
        console.warn('[OfflineApi] Online fetch failed, falling back to local:', error);
      }
    }

    // Fall back to local database
    const collection = database.get<Client>('clients');
    let query = collection.query(Q.where('is_deleted', false));

    // Apply filters
    if (params?.status) {
      query = collection.query(
        Q.and(
          Q.where('is_deleted', false),
          Q.where('status', params.status)
        )
      );
    }

    if (params?.search) {
      const searchTerm = params.search.toLowerCase();
      query = collection.query(
        Q.and(
          Q.where('is_deleted', false),
          Q.or(
            Q.where('name', Q.like(`%${searchTerm}%`)),
            Q.where('email', Q.like(`%${searchTerm}%`)),
            Q.where('phone', Q.like(`%${searchTerm}%`))
          )
        )
      );
    }

    const localClients = await query.fetch();
    const clientData = localClients.map(client => client.toApiObject() as ClientType);

    return {
      data: clientData,
      source: 'local',
      isStale: isDataStale(lastSyncTime),
    };
  },

  /**
   * Get single client by ID
   */
  async getClient(
    clientId: string,
    options: OfflineApiOptions = {}
  ): Promise<OfflineApiResult<ClientType | null>> {
    const online = await isOnline();

    if (online && options.forceOnline) {
      try {
        const response = await clientsApi.getClient(clientId);
        if (response.success && response.data) {
          return {
            data: response.data,
            source: 'remote',
            isStale: false,
          };
        }
      } catch (error) {
        console.warn('[OfflineApi] Online fetch failed:', error);
      }
    }

    // Try local database
    const collection = database.get<Client>('clients');
    const records = await collection
      .query(Q.where('server_id', clientId))
      .fetch();

    if (records.length > 0) {
      return {
        data: records[0].toApiObject() as ClientType,
        source: 'local',
        isStale: false,
      };
    }

    return {
      data: null,
      source: 'local',
      isStale: true,
    };
  },

  /**
   * Create client with optimistic update
   */
  async createClient(data: CreateClientData): Promise<OfflineApiResult<ClientType>> {
    const online = await isOnline();

    if (online) {
      try {
        const response = await clientsApi.createClient(data);
        if (response.success && response.data) {
          // Save to local cache
          await database.write(async () => {
            const collection = database.get<Client>('clients');
            await collection.create((record: any) => {
              Object.assign(record, Client.fromApiObject(response.data));
            });
          });
          return {
            data: response.data,
            source: 'remote',
            isStale: false,
          };
        }
        throw new Error(response.error || 'Failed to create client');
      } catch (error) {
        if (online) {
          // If we thought we were online but failed, fall through to offline mode
          console.warn('[OfflineApi] Online create failed, using optimistic update:', error);
        }
      }
    }

    // Create locally with optimistic update
    const localId = await syncService.createOptimistic('clients', {
      ...Client.fromApiObject({ ...data, id: '' }),
      server_id: '',
    });

    const collection = database.get<Client>('clients');
    const records = await collection.query(Q.where('id', localId)).fetch();
    const client = records[0];

    return {
      data: client.toApiObject() as ClientType,
      source: 'local',
      isStale: true,
    };
  },

  /**
   * Update client with optimistic update
   */
  async updateClient(
    clientId: string,
    data: Partial<ClientType>
  ): Promise<OfflineApiResult<ClientType>> {
    const collection = database.get<Client>('clients');
    const records = await collection
      .query(Q.where('server_id', clientId))
      .fetch();

    if (records.length === 0) {
      throw new Error('Client not found');
    }

    const localRecord = records[0];
    const online = await isOnline();

    if (online) {
      try {
        const response = await clientsApi.updateClient({ id: clientId, ...data });
        if (response.success && response.data) {
          // Update local cache
          await database.write(async () => {
            await localRecord.update((r: any) => {
              Object.assign(r, Client.fromApiObject(response.data));
              r.syncStatus = 'synced';
            });
          });
          return {
            data: response.data,
            source: 'remote',
            isStale: false,
          };
        }
      } catch (error) {
        console.warn('[OfflineApi] Online update failed:', error);
      }
    }

    // Optimistic update
    await syncService.updateOptimistic('clients', localRecord.id, data);

    return {
      data: { ...localRecord.toApiObject(), ...data } as ClientType,
      source: 'local',
      isStale: true,
    };
  },

  /**
   * Delete client with optimistic update
   */
  async deleteClient(clientId: string): Promise<void> {
    const collection = database.get<Client>('clients');
    const records = await collection
      .query(Q.where('server_id', clientId))
      .fetch();

    if (records.length === 0) {
      throw new Error('Client not found');
    }

    const online = await isOnline();

    if (online) {
      try {
        await clientsApi.deleteClient(clientId);
        // Remove from local cache
        await database.write(async () => {
          await records[0].destroyPermanently();
        });
        return;
      } catch (error) {
        console.warn('[OfflineApi] Online delete failed:', error);
      }
    }

    // Soft delete for offline
    await syncService.deleteOptimistic('clients', records[0].id);
  },
};

// ============================================================================
// Events API (Offline-Aware)
// ============================================================================

export const offlineEventsApi = {
  /**
   * Get all events with offline fallback
   */
  async getEvents(
    params?: EventsQuery,
    options: OfflineApiOptions = {}
  ): Promise<OfflineApiResult<EventType[]>> {
    const online = await isOnline();
    const lastSyncTime = await syncService.getLastSyncTime();

    if (online && !options.skipCache) {
      try {
        const response = await eventsApi.getEvents(params);
        if (response.success && response.data) {
          updateLocalEvents(response.data).catch(console.error);
          return {
            data: response.data,
            source: 'remote',
            isStale: false,
          };
        }
      } catch (error) {
        console.warn('[OfflineApi] Online fetch failed:', error);
      }
    }

    // Fall back to local database
    const collection = database.get<Event>('events');
    let query = collection.query(Q.where('is_deleted', false));

    // Apply date filters
    if (params?.startDate) {
      const startTime = new Date(params.startDate).getTime();
      query = collection.query(
        Q.and(
          Q.where('is_deleted', false),
          Q.where('start_time', Q.gte(startTime))
        )
      );
    }

    if (params?.endDate) {
      const endTime = new Date(params.endDate).getTime();
      query = collection.query(
        Q.and(
          Q.where('is_deleted', false),
          Q.where('end_time', Q.lte(endTime))
        )
      );
    }

    const localEvents = await query.fetch();
    const eventData = localEvents.map(event => event.toApiObject() as EventType);

    return {
      data: eventData,
      source: 'local',
      isStale: isDataStale(lastSyncTime),
    };
  },

  /**
   * Create event with optimistic update
   */
  async createEvent(data: CreateEventData): Promise<OfflineApiResult<EventType>> {
    const online = await isOnline();

    if (online) {
      try {
        const response = await eventsApi.createEvent(data);
        if (response.success && response.data) {
          await database.write(async () => {
            const collection = database.get<Event>('events');
            await collection.create((record: any) => {
              Object.assign(record, Event.fromApiObject(response.data));
            });
          });
          return {
            data: response.data,
            source: 'remote',
            isStale: false,
          };
        }
      } catch (error) {
        console.warn('[OfflineApi] Online create failed:', error);
      }
    }

    // Create locally
    const localId = await syncService.createOptimistic('events', {
      ...Event.fromApiObject({ ...data, id: '' }),
      server_id: '',
    });

    const collection = database.get<Event>('events');
    const records = await collection.query(Q.where('id', localId)).fetch();

    return {
      data: records[0].toApiObject() as EventType,
      source: 'local',
      isStale: true,
    };
  },

  /**
   * Update event with optimistic update
   */
  async updateEvent(
    eventId: string,
    data: Partial<EventType>
  ): Promise<OfflineApiResult<EventType>> {
    const collection = database.get<Event>('events');
    const records = await collection
      .query(Q.where('server_id', eventId))
      .fetch();

    if (records.length === 0) {
      throw new Error('Event not found');
    }

    const localRecord = records[0];
    const online = await isOnline();

    if (online) {
      try {
        const response = await eventsApi.updateEvent(eventId, data);
        if (response.success && response.data) {
          await database.write(async () => {
            await localRecord.update((r: any) => {
              Object.assign(r, Event.fromApiObject(response.data));
              r.syncStatus = 'synced';
            });
          });
          return {
            data: response.data,
            source: 'remote',
            isStale: false,
          };
        }
      } catch (error) {
        console.warn('[OfflineApi] Online update failed:', error);
      }
    }

    await syncService.updateOptimistic('events', localRecord.id, data);

    return {
      data: { ...localRecord.toApiObject(), ...data } as EventType,
      source: 'local',
      isStale: true,
    };
  },

  /**
   * Delete event with optimistic update
   */
  async deleteEvent(eventId: string): Promise<void> {
    const collection = database.get<Event>('events');
    const records = await collection
      .query(Q.where('server_id', eventId))
      .fetch();

    if (records.length === 0) {
      throw new Error('Event not found');
    }

    const online = await isOnline();

    if (online) {
      try {
        await eventsApi.deleteEvent(eventId);
        await database.write(async () => {
          await records[0].destroyPermanently();
        });
        return;
      } catch (error) {
        console.warn('[OfflineApi] Online delete failed:', error);
      }
    }

    await syncService.deleteOptimistic('events', records[0].id);
  },
};

// ============================================================================
// Receipts API (Offline-Aware)
// ============================================================================

export const offlineReceiptsApi = {
  /**
   * Get all receipts with offline fallback
   */
  async getReceipts(
    params?: BillingQuery,
    options: OfflineApiOptions = {}
  ): Promise<OfflineApiResult<BillingDocument[]>> {
    const online = await isOnline();
    const lastSyncTime = await syncService.getLastSyncTime();

    if (online && !options.skipCache) {
      try {
        const response = await billingApi.getReceipts(params);
        if (response.success && response.data) {
          updateLocalReceipts(response.data).catch(console.error);
          return {
            data: response.data,
            source: 'remote',
            isStale: false,
          };
        }
      } catch (error) {
        console.warn('[OfflineApi] Online fetch failed:', error);
      }
    }

    // Fall back to local database
    const collection = database.get<Receipt>('receipts');
    let query = collection.query(Q.where('is_deleted', false));

    if (params?.clientId) {
      query = collection.query(
        Q.and(
          Q.where('is_deleted', false),
          Q.where('client_server_id', params.clientId)
        )
      );
    }

    if (params?.status) {
      query = collection.query(
        Q.and(
          Q.where('is_deleted', false),
          Q.where('status', params.status)
        )
      );
    }

    const localReceipts = await query.fetch();
    const receiptData = localReceipts.map(receipt => receipt.toApiObject() as BillingDocument);

    return {
      data: receiptData,
      source: 'local',
      isStale: isDataStale(lastSyncTime),
    };
  },

  /**
   * Create receipt with optimistic update
   */
  async createReceipt(data: CreateReceiptData): Promise<OfflineApiResult<BillingDocument>> {
    const online = await isOnline();

    if (online) {
      try {
        const response = await billingApi.createReceipt(data);
        if (response.success && response.data) {
          await database.write(async () => {
            const collection = database.get<Receipt>('receipts');
            await collection.create((record: any) => {
              Object.assign(record, Receipt.fromApiObject(response.data));
            });
          });
          return {
            data: response.data,
            source: 'remote',
            isStale: false,
          };
        }
      } catch (error) {
        console.warn('[OfflineApi] Online create failed:', error);
      }
    }

    // Create locally
    const localId = await syncService.createOptimistic('receipts', {
      ...Receipt.fromApiObject({ ...data, id: '' }),
      server_id: '',
    });

    const collection = database.get<Receipt>('receipts');
    const records = await collection.query(Q.where('id', localId)).fetch();

    return {
      data: records[0].toApiObject() as BillingDocument,
      source: 'local',
      isStale: true,
    };
  },
};

// ============================================================================
// Cache Update Functions
// ============================================================================

async function updateLocalClients(clients: ClientType[]): Promise<void> {
  const collection = database.get<Client>('clients');

  await database.write(async () => {
    for (const apiClient of clients) {
      const existing = await collection
        .query(Q.where('server_id', apiClient.id))
        .fetch();

      if (existing.length > 0) {
        const record = existing[0];
        if (record.syncStatus === 'synced') {
          await record.update((r: any) => {
            Object.assign(r, Client.fromApiObject(apiClient));
          });
        }
      } else {
        await collection.create((record: any) => {
          Object.assign(record, Client.fromApiObject(apiClient));
        });
      }
    }
  });
}

async function updateLocalEvents(events: EventType[]): Promise<void> {
  const collection = database.get<Event>('events');

  await database.write(async () => {
    for (const apiEvent of events) {
      const existing = await collection
        .query(Q.where('server_id', apiEvent.id))
        .fetch();

      if (existing.length > 0) {
        const record = existing[0];
        if (record.syncStatus === 'synced') {
          await record.update((r: any) => {
            Object.assign(r, Event.fromApiObject(apiEvent));
          });
        }
      } else {
        await collection.create((record: any) => {
          Object.assign(record, Event.fromApiObject(apiEvent));
        });
      }
    }
  });
}

async function updateLocalReceipts(receipts: BillingDocument[]): Promise<void> {
  const collection = database.get<Receipt>('receipts');

  await database.write(async () => {
    for (const apiReceipt of receipts) {
      const existing = await collection
        .query(Q.where('server_id', apiReceipt.id))
        .fetch();

      if (existing.length > 0) {
        const record = existing[0];
        if (record.syncStatus === 'synced') {
          await record.update((r: any) => {
            Object.assign(r, Receipt.fromApiObject(apiReceipt));
          });
        }
      } else {
        await collection.create((record: any) => {
          Object.assign(record, Receipt.fromApiObject(apiReceipt));
        });
      }
    }
  });
}

// ============================================================================
// Exports
// ============================================================================

export const offlineApi = {
  clients: offlineClientsApi,
  events: offlineEventsApi,
  receipts: offlineReceiptsApi,
};
