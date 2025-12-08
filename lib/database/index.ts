import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import { schema } from './schema';
import { LocalContact } from './models/LocalContact';
import { LocalSms } from './models/LocalSms';
import { LocalCalendarEvent } from './models/LocalCalendarEvent';
import { SyncQueueItem } from './models/SyncQueueItem';

// Define migrations (currently empty - add migrations as schema evolves)
const migrations = schemaMigrations({
  migrations: [
    // Future migrations will go here when schema changes
    // Example:
    // {
    //   toVersion: 2,
    //   steps: [
    //     addColumns({
    //       table: 'local_contacts',
    //       columns: [
    //         { name: 'new_field', type: 'string', isOptional: true },
    //       ],
    //     }),
    //   ],
    // },
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
    LocalContact,
    LocalSms,
    LocalCalendarEvent,
    SyncQueueItem,
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
  const events = await database.get('local_calendar_events').query().fetchCount();
  const queueItems = await database.get('sync_queue_items').query().fetchCount();

  return {
    contacts,
    sms,
    events,
    queueItems,
  };
}
