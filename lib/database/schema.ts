import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Local contacts imported from device
    tableSchema({
      name: 'local_contacts',
      columns: [
        { name: 'device_contact_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'given_name', type: 'string', isOptional: true },
        { name: 'family_name', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true, isIndexed: true },
        { name: 'phone', type: 'string', isOptional: true, isIndexed: true },
        { name: 'normalized_phone', type: 'string', isOptional: true, isIndexed: true },
        { name: 'company', type: 'string', isOptional: true },
        { name: 'participant_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'matched_at', type: 'number', isOptional: true },
        { name: 'imported_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // SMS messages imported from device
    tableSchema({
      name: 'local_sms',
      columns: [
        { name: 'device_sms_id', type: 'string', isIndexed: true },
        { name: 'thread_id', type: 'string', isIndexed: true },
        { name: 'address', type: 'string', isIndexed: true },
        { name: 'normalized_address', type: 'string', isIndexed: true },
        { name: 'body', type: 'string' },
        { name: 'timestamp', type: 'number', isIndexed: true },
        { name: 'type', type: 'string' }, // 'inbox' or 'sent'
        { name: 'contact_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'participant_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'conversation_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'sync_status', type: 'string' }, // 'pending', 'synced', 'failed'
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'imported_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // Calendar events imported from device
    tableSchema({
      name: 'local_calendar_events',
      columns: [
        { name: 'device_event_id', type: 'string', isIndexed: true },
        { name: 'calendar_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'start_date', type: 'number', isIndexed: true },
        { name: 'end_date', type: 'number', isIndexed: true },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'all_day', type: 'boolean' },
        { name: 'recurrence_rule', type: 'string', isOptional: true },
        { name: 'attendees', type: 'string', isOptional: true }, // JSON array of emails
        { name: 'participant_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'event_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'sync_status', type: 'string' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'imported_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // Sync queue for offline operations
    tableSchema({
      name: 'sync_queue_items',
      columns: [
        { name: 'entity_type', type: 'string', isIndexed: true }, // 'sms', 'calendar', 'email', 'contact'
        { name: 'entity_id', type: 'string', isIndexed: true }, // Local entity ID
        { name: 'action', type: 'string' }, // 'create', 'update', 'delete'
        { name: 'payload', type: 'string' }, // JSON payload to sync
        { name: 'status', type: 'string', isIndexed: true }, // 'pending', 'processing', 'completed', 'failed'
        { name: 'retry_count', type: 'number' },
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'server_id', type: 'string', isOptional: true }, // Server ID after successful sync
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number' },
      ]
    }),
  ]
});
