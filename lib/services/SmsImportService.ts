import { Platform, PermissionsAndroid } from 'react-native';
import { database } from '../database';
import { LocalSms, SmsType, SyncStatus } from '../database/models/LocalSms';
import { Q } from '@nozbe/watermelondb';

export interface SmsMessage {
  id: string;
  threadId: string;
  address: string;
  body: string;
  date: number;
  type: number; // 1 = inbox, 2 = sent
}

export interface SmsImportResult {
  success: boolean;
  imported: number;
  updated: number;
  total: number;
  error?: string;
}

export interface SmsThread {
  threadId: string;
  address: string;
  normalizedAddress: string;
  messageCount: number;
  lastMessage: string;
  lastTimestamp: Date;
  contactName?: string;
}

export class SmsImportService {
  /**
   * Check if SMS reading is supported on this platform
   */
  static isSupported(): boolean {
    return Platform.OS === 'android';
  }

  /**
   * Request SMS permission from user (Android only)
   */
  static async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('[SmsImportService] SMS reading not supported on iOS');
      return false;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission',
          message: 'Becky needs access to your SMS messages to sync conversations with clients.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('[SmsImportService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Check if SMS permission is granted
   */
  static async checkPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );
      return granted;
    } catch (error) {
      console.error('[SmsImportService] Permission check failed:', error);
      return false;
    }
  }

  /**
   * Normalize phone number - remove all non-digit characters
   */
  private static normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Read SMS messages from device (Android only)
   * This uses the native Content Resolver to query SMS
   */
  private static async readSmsFromDevice(limit: number = 500): Promise<SmsMessage[]> {
    if (Platform.OS !== 'android') {
      return [];
    }

    // Use expo-sms-retriever or native module for SMS access
    // For now, return empty array - this needs native module implementation
    // In production, this would use ContentResolver to query content://sms
    console.log('[SmsImportService] SMS reading requires native module implementation');

    // Placeholder for native module call:
    // const SmsModule = NativeModules.SmsModule;
    // if (SmsModule && SmsModule.getAllSms) {
    //   return await SmsModule.getAllSms(limit);
    // }

    return [];
  }

  /**
   * Import SMS messages from device into local database
   */
  static async importSms(limit: number = 500): Promise<SmsImportResult> {
    try {
      // Check platform support
      if (!this.isSupported()) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          total: 0,
          error: 'SMS import is only supported on Android',
        };
      }

      // Check permission first
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          total: 0,
          error: 'SMS permission not granted',
        };
      }

      // Read SMS from device
      const messages = await this.readSmsFromDevice(limit);
      console.log(`[SmsImportService] Found ${messages.length} SMS messages on device`);

      if (messages.length === 0) {
        return {
          success: true,
          imported: 0,
          updated: 0,
          total: 0,
        };
      }

      let imported = 0;
      let updated = 0;

      // Import messages in batches
      await database.write(async () => {
        const localSmsCollection = database.get('local_sms');

        for (const sms of messages) {
          const smsType: SmsType = sms.type === 2 ? 'sent' : 'inbox';

          // Check if message already exists
          const existing = await localSmsCollection
            .query(Q.where('device_sms_id', sms.id))
            .fetch() as LocalSms[];

          if (existing.length > 0) {
            // Update existing message if needed
            const localSms = existing[0];
            if (localSms.body !== sms.body) {
              await localSms.update((record: any) => {
                record.body = sms.body;
              });
              updated++;
            }
          } else {
            // Create new message
            await localSmsCollection.create((record: any) => {
              record.deviceSmsId = sms.id;
              record.threadId = sms.threadId;
              record.address = sms.address;
              record.normalizedAddress = this.normalizePhone(sms.address);
              record.body = sms.body;
              record.timestamp = new Date(sms.date);
              record.type = smsType;
              record.syncStatus = 'pending' as SyncStatus;
              record.importedAt = new Date();
            });
            imported++;
          }
        }
      });

      console.log(`[SmsImportService] Import complete: ${imported} imported, ${updated} updated`);

      return {
        success: true,
        imported,
        updated,
        total: imported + updated,
      };
    } catch (error) {
      console.error('[SmsImportService] Import failed:', error);
      return {
        success: false,
        imported: 0,
        updated: 0,
        total: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all SMS threads (grouped by address/contact)
   */
  static async getThreads(): Promise<SmsThread[]> {
    try {
      const allSms = await database
        .get('local_sms')
        .query(Q.sortBy('timestamp', Q.desc))
        .fetch() as LocalSms[];

      // Group by thread/address
      const threadsMap = new Map<string, LocalSms[]>();

      for (const sms of allSms) {
        const key = sms.threadId || sms.normalizedAddress;
        if (!threadsMap.has(key)) {
          threadsMap.set(key, []);
        }
        threadsMap.get(key)!.push(sms);
      }

      // Convert to thread objects
      const threads: SmsThread[] = [];
      for (const [threadId, messages] of threadsMap) {
        const sortedMessages = messages.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );
        const lastMessage = sortedMessages[0];

        threads.push({
          threadId,
          address: lastMessage.address,
          normalizedAddress: lastMessage.normalizedAddress,
          messageCount: messages.length,
          lastMessage: lastMessage.body,
          lastTimestamp: lastMessage.timestamp,
        });
      }

      // Sort threads by last message time
      return threads.sort((a, b) => b.lastTimestamp.getTime() - a.lastTimestamp.getTime());
    } catch (error) {
      console.error('[SmsImportService] Get threads failed:', error);
      return [];
    }
  }

  /**
   * Get messages for a specific thread
   */
  static async getThreadMessages(threadId: string): Promise<LocalSms[]> {
    try {
      return await database
        .get('local_sms')
        .query(
          Q.or(
            Q.where('thread_id', threadId),
            Q.where('normalized_address', threadId)
          ),
          Q.sortBy('timestamp', Q.asc)
        )
        .fetch() as LocalSms[];
    } catch (error) {
      console.error('[SmsImportService] Get thread messages failed:', error);
      return [];
    }
  }

  /**
   * Get all SMS messages
   */
  static async getAllMessages(): Promise<LocalSms[]> {
    try {
      return await database
        .get('local_sms')
        .query(Q.sortBy('timestamp', Q.desc))
        .fetch() as LocalSms[];
    } catch (error) {
      console.error('[SmsImportService] Get all messages failed:', error);
      return [];
    }
  }

  /**
   * Find SMS messages by phone number
   */
  static async findByPhone(phone: string): Promise<LocalSms[]> {
    try {
      const normalized = this.normalizePhone(phone);
      return await database
        .get('local_sms')
        .query(
          Q.where('normalized_address', normalized),
          Q.sortBy('timestamp', Q.desc)
        )
        .fetch() as LocalSms[];
    } catch (error) {
      console.error('[SmsImportService] Find by phone failed:', error);
      return [];
    }
  }

  /**
   * Link SMS thread to conversation
   */
  static async linkToConversation(threadId: string, conversationId: string): Promise<boolean> {
    try {
      await database.write(async () => {
        const messages = await database
          .get('local_sms')
          .query(
            Q.or(
              Q.where('thread_id', threadId),
              Q.where('normalized_address', threadId)
            )
          )
          .fetch() as LocalSms[];

        for (const sms of messages) {
          await sms.update((record: any) => {
            record.conversationId = conversationId;
          });
        }
      });

      console.log(`[SmsImportService] Linked thread ${threadId} to conversation ${conversationId}`);
      return true;
    } catch (error) {
      console.error('[SmsImportService] Link to conversation failed:', error);
      return false;
    }
  }

  /**
   * Get SMS import stats
   */
  static async getStats() {
    try {
      const totalMessages = await database.get('local_sms').query().fetchCount();
      const inboxCount = await database
        .get('local_sms')
        .query(Q.where('type', 'inbox'))
        .fetchCount();
      const sentCount = await database
        .get('local_sms')
        .query(Q.where('type', 'sent'))
        .fetchCount();
      const syncedCount = await database
        .get('local_sms')
        .query(Q.where('sync_status', 'synced'))
        .fetchCount();
      const pendingCount = await database
        .get('local_sms')
        .query(Q.where('sync_status', 'pending'))
        .fetchCount();

      // Get unique threads count
      const threads = await this.getThreads();

      return {
        total: totalMessages,
        inbox: inboxCount,
        sent: sentCount,
        synced: syncedCount,
        pending: pendingCount,
        threads: threads.length,
      };
    } catch (error) {
      console.error('[SmsImportService] Get stats failed:', error);
      return {
        total: 0,
        inbox: 0,
        sent: 0,
        synced: 0,
        pending: 0,
        threads: 0,
      };
    }
  }
}
