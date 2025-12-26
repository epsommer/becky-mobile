import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations';
import { schema } from './schema';

// Models - Device imports
import { LocalContact } from './models/LocalContact';
import { LocalSms } from './models/LocalSms';
import { LocalCalendarEvent } from './models/LocalCalendarEvent';
import { SyncQueueItem } from './models/SyncQueueItem';

// Models - CRM entities (offline-first)
import { Client } from './models/Client';
import { Event } from './models/Event';
import { Receipt } from './models/Receipt';
import { SyncMetadata } from './models/SyncMetadata';

// Export all models
export { LocalContact } from './models/LocalContact';
export { LocalSms } from './models/LocalSms';
export { LocalCalendarEvent } from './models/LocalCalendarEvent';
export { SyncQueueItem } from './models/SyncQueueItem';
export { Client } from './models/Client';
export { Event } from './models/Event';
export { Receipt } from './models/Receipt';
export { SyncMetadata } from './models/SyncMetadata';

// Define migrations
const migrations = schemaMigrations({
  migrations: [
    {
      // Migration to version 2: Add CRM entity tables for offline support
      toVersion: 2,
      steps: [
        // Add clients table
        createTable({
          name: 'clients',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'name', type: 'string', isIndexed: true },
            { name: 'email', type: 'string', isOptional: true, isIndexed: true },
            { name: 'phone', type: 'string', isOptional: true, isIndexed: true },
            { name: 'company', type: 'string', isOptional: true },
            { name: 'status', type: 'string', isOptional: true, isIndexed: true },
            { name: 'status_color', type: 'string', isOptional: true },
            { name: 'note', type: 'string', isOptional: true },
            { name: 'tags', type: 'string', isOptional: true },
            { name: 'budget', type: 'number', isOptional: true },
            { name: 'project_type', type: 'string', isOptional: true },
            { name: 'service_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'service_types', type: 'string', isOptional: true },
            { name: 'timeline', type: 'string', isOptional: true },
            { name: 'seasonal_contract', type: 'boolean', isOptional: true },
            { name: 'recurring_service', type: 'boolean', isOptional: true },
            { name: 'address', type: 'string', isOptional: true },
            { name: 'metadata', type: 'string', isOptional: true },
            { name: 'contact_preferences', type: 'string', isOptional: true },
            { name: 'personal_info', type: 'string', isOptional: true },
            { name: 'service_profile', type: 'string', isOptional: true },
            { name: 'billing_info', type: 'string', isOptional: true },
            { name: 'relationship_data', type: 'string', isOptional: true },
            { name: 'sync_status', type: 'string' },
            { name: 'is_deleted', type: 'boolean' },
            { name: 'local_version', type: 'number' },
            { name: 'server_version', type: 'number', isOptional: true },
            { name: 'last_synced_at', type: 'number', isOptional: true },
            { name: 'server_created_at', type: 'number', isOptional: true },
            { name: 'server_updated_at', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        // Add events table
        createTable({
          name: 'events',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'start_time', type: 'number', isIndexed: true },
            { name: 'end_time', type: 'number', isIndexed: true },
            { name: 'timezone', type: 'string', isOptional: true },
            { name: 'client_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'client_server_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'client_name', type: 'string', isOptional: true },
            { name: 'location', type: 'string', isOptional: true },
            { name: 'service', type: 'string', isOptional: true },
            { name: 'status', type: 'string', isOptional: true, isIndexed: true },
            { name: 'type', type: 'string', isOptional: true },
            { name: 'priority', type: 'string', isOptional: true },
            { name: 'is_all_day', type: 'boolean', isOptional: true },
            { name: 'is_multi_day', type: 'boolean', isOptional: true },
            { name: 'is_recurring', type: 'boolean', isOptional: true },
            { name: 'recurrence', type: 'string', isOptional: true },
            { name: 'parent_event_id', type: 'string', isOptional: true },
            { name: 'recurrence_group_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'notifications', type: 'string', isOptional: true },
            { name: 'participants', type: 'string', isOptional: true },
            { name: 'google_calendar_event_id', type: 'string', isOptional: true },
            { name: 'outlook_calendar_event_id', type: 'string', isOptional: true },
            { name: 'sync_status', type: 'string' },
            { name: 'is_deleted', type: 'boolean' },
            { name: 'local_version', type: 'number' },
            { name: 'server_version', type: 'number', isOptional: true },
            { name: 'last_synced_at', type: 'number', isOptional: true },
            { name: 'server_created_at', type: 'number', isOptional: true },
            { name: 'server_updated_at', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        // Add receipts table
        createTable({
          name: 'receipts',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'client_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'client_server_id', type: 'string', isIndexed: true },
            { name: 'type', type: 'string' },
            { name: 'amount', type: 'number' },
            { name: 'status', type: 'string', isIndexed: true },
            { name: 'due_date', type: 'number', isOptional: true },
            { name: 'paid_date', type: 'number', isOptional: true },
            { name: 'items', type: 'string', isOptional: true },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'sync_status', type: 'string' },
            { name: 'is_deleted', type: 'boolean' },
            { name: 'local_version', type: 'number' },
            { name: 'server_version', type: 'number', isOptional: true },
            { name: 'last_synced_at', type: 'number', isOptional: true },
            { name: 'server_created_at', type: 'number', isOptional: true },
            { name: 'server_updated_at', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        // Add sync_metadata table
        createTable({
          name: 'sync_metadata',
          columns: [
            { name: 'entity_type', type: 'string', isIndexed: true },
            { name: 'last_full_sync', type: 'number', isOptional: true },
            { name: 'last_partial_sync', type: 'number', isOptional: true },
            { name: 'pending_changes_count', type: 'number' },
            { name: 'sync_in_progress', type: 'boolean' },
            { name: 'last_sync_error', type: 'string', isOptional: true },
            { name: 'server_cursor', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
});

// Create the SQLite adapter
const adapter = new SQLiteAdapter({
  schema,
  // Database name
  dbName: 'becky_local',
  // Migrations for schema changes
  migrations,
  // Disable JSI to work around React 19 object freezing issues
  jsi: false,
  // Optional: Enable experimental features
  onSetUpError: (error) => {
    console.error('[WatermelonDB] Setup error:', error);
  }
});

// Create and export the database instance
export const database = new Database({
  adapter,
  modelClasses: [
    // Device imports
    LocalContact,
    LocalSms,
    LocalCalendarEvent,
    SyncQueueItem,
    // CRM entities (offline-first)
    Client,
    Event,
    Receipt,
    SyncMetadata,
  ],
});

// Helper to reset database (for development/testing)
export async function resetDatabase() {
  try {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    console.log('[WatermelonDB] Database reset successfully');
  } catch (error) {
    console.error('[WatermelonDB] Error resetting database:', error);
    throw error;
  }
}

// Helper to get database stats
export async function getDatabaseStats() {
  const contacts = await database.get('local_contacts').query().fetchCount();
  const sms = await database.get('local_sms').query().fetchCount();
  const localEvents = await database.get('local_calendar_events').query().fetchCount();
  const queueItems = await database.get('sync_queue_items').query().fetchCount();
  const clients = await database.get('clients').query().fetchCount();
  const events = await database.get('events').query().fetchCount();
  const receipts = await database.get('receipts').query().fetchCount();

  return {
    contacts,
    sms,
    localEvents,
    queueItems,
    // CRM entities
    clients,
    events,
    receipts,
  };
}

// Helper to get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  const { Q } = await import('@nozbe/watermelondb');

  const clientsPending = await database
    .get('clients')
    .query(Q.where('sync_status', Q.notEq('synced')))
    .fetchCount();

  const eventsPending = await database
    .get('events')
    .query(Q.where('sync_status', Q.notEq('synced')))
    .fetchCount();

  const receiptsPending = await database
    .get('receipts')
    .query(Q.where('sync_status', Q.notEq('synced')))
    .fetchCount();

  return clientsPending + eventsPending + receiptsPending;
}

// Helper to check if we have any offline data
export async function hasOfflineData(): Promise<boolean> {
  const stats = await getDatabaseStats();
  return (stats.clients > 0 || stats.events > 0 || stats.receipts > 0);
}
