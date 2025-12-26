import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2, // Incremented for new CRM entity tables
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
        { name: 'entity_type', type: 'string', isIndexed: true }, // 'sms', 'calendar', 'email', 'contact', 'client', 'event', 'receipt'
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

    // ============================================================================
    // CRM Entity Tables (offline-first)
    // ============================================================================

    // Clients - Core CRM entity for offline access
    tableSchema({
      name: 'clients',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // Server-assigned ID
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'email', type: 'string', isOptional: true, isIndexed: true },
        { name: 'phone', type: 'string', isOptional: true, isIndexed: true },
        { name: 'company', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isOptional: true, isIndexed: true }, // 'active', 'prospect', 'completed', 'inactive'
        { name: 'status_color', type: 'string', isOptional: true },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'tags', type: 'string', isOptional: true }, // JSON array
        { name: 'budget', type: 'number', isOptional: true },
        { name: 'project_type', type: 'string', isOptional: true },
        { name: 'service_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'service_types', type: 'string', isOptional: true }, // JSON array
        { name: 'timeline', type: 'string', isOptional: true },
        { name: 'seasonal_contract', type: 'boolean', isOptional: true },
        { name: 'recurring_service', type: 'boolean', isOptional: true },
        { name: 'address', type: 'string', isOptional: true }, // JSON object
        { name: 'metadata', type: 'string', isOptional: true }, // JSON object
        { name: 'contact_preferences', type: 'string', isOptional: true }, // JSON object
        { name: 'personal_info', type: 'string', isOptional: true }, // JSON object
        { name: 'service_profile', type: 'string', isOptional: true }, // JSON object
        { name: 'billing_info', type: 'string', isOptional: true }, // JSON object
        { name: 'relationship_data', type: 'string', isOptional: true }, // JSON object
        // Sync metadata
        { name: 'sync_status', type: 'string' }, // 'synced', 'pending', 'conflict'
        { name: 'is_deleted', type: 'boolean' }, // Soft delete for offline
        { name: 'local_version', type: 'number' }, // For conflict resolution
        { name: 'server_version', type: 'number', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'server_created_at', type: 'number', isOptional: true },
        { name: 'server_updated_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // Events - Calendar events for offline access
    tableSchema({
      name: 'events',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // Server-assigned ID
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'start_time', type: 'number', isIndexed: true },
        { name: 'end_time', type: 'number', isIndexed: true },
        { name: 'timezone', type: 'string', isOptional: true },
        { name: 'client_id', type: 'string', isOptional: true, isIndexed: true }, // Local client ID
        { name: 'client_server_id', type: 'string', isOptional: true, isIndexed: true }, // Server client ID
        { name: 'client_name', type: 'string', isOptional: true },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'service', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isOptional: true, isIndexed: true }, // 'scheduled', 'confirmed', 'completed', 'cancelled'
        { name: 'type', type: 'string', isOptional: true }, // 'event', 'task', 'goal', 'milestone'
        { name: 'priority', type: 'string', isOptional: true }, // 'low', 'medium', 'high', 'urgent'
        { name: 'is_all_day', type: 'boolean', isOptional: true },
        { name: 'is_multi_day', type: 'boolean', isOptional: true },
        { name: 'is_recurring', type: 'boolean', isOptional: true },
        { name: 'recurrence', type: 'string', isOptional: true }, // JSON RecurrenceRule
        { name: 'parent_event_id', type: 'string', isOptional: true },
        { name: 'recurrence_group_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'notifications', type: 'string', isOptional: true }, // JSON NotificationRule[]
        { name: 'participants', type: 'string', isOptional: true }, // JSON EventParticipant[]
        { name: 'google_calendar_event_id', type: 'string', isOptional: true },
        { name: 'outlook_calendar_event_id', type: 'string', isOptional: true },
        // Sync metadata
        { name: 'sync_status', type: 'string' }, // 'synced', 'pending', 'conflict'
        { name: 'is_deleted', type: 'boolean' }, // Soft delete for offline
        { name: 'local_version', type: 'number' },
        { name: 'server_version', type: 'number', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'server_created_at', type: 'number', isOptional: true },
        { name: 'server_updated_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // Receipts/Billing Documents - For offline access
    tableSchema({
      name: 'receipts',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // Server-assigned ID
        { name: 'client_id', type: 'string', isOptional: true, isIndexed: true }, // Local client ID
        { name: 'client_server_id', type: 'string', isIndexed: true }, // Server client ID
        { name: 'type', type: 'string' }, // 'invoice', 'receipt', 'quote'
        { name: 'amount', type: 'number' },
        { name: 'status', type: 'string', isIndexed: true }, // 'draft', 'sent', 'paid', 'overdue'
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'paid_date', type: 'number', isOptional: true },
        { name: 'items', type: 'string', isOptional: true }, // JSON BillingLineItem[]
        { name: 'notes', type: 'string', isOptional: true },
        // Sync metadata
        { name: 'sync_status', type: 'string' }, // 'synced', 'pending', 'conflict'
        { name: 'is_deleted', type: 'boolean' }, // Soft delete for offline
        { name: 'local_version', type: 'number' },
        { name: 'server_version', type: 'number', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'server_created_at', type: 'number', isOptional: true },
        { name: 'server_updated_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // ============================================================================
    // Offline Sync Metadata Table
    // ============================================================================

    // Sync state tracking for offline-first operations
    tableSchema({
      name: 'sync_metadata',
      columns: [
        { name: 'entity_type', type: 'string', isIndexed: true }, // 'clients', 'events', 'receipts'
        { name: 'last_full_sync', type: 'number', isOptional: true },
        { name: 'last_partial_sync', type: 'number', isOptional: true },
        { name: 'pending_changes_count', type: 'number' },
        { name: 'sync_in_progress', type: 'boolean' },
        { name: 'last_sync_error', type: 'string', isOptional: true },
        { name: 'server_cursor', type: 'string', isOptional: true }, // For pagination/cursors
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
  ]
});
