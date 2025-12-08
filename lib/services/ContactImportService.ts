import * as Contacts from 'expo-contacts';
import { database } from '../database';
import { LocalContact } from '../database/models/LocalContact';
import { Q } from '@nozbe/watermelondb';

export interface ContactImportResult {
  success: boolean;
  imported: number;
  updated: number;
  total: number;
  error?: string;
}

export class ContactImportService {
  /**
   * Request contacts permission from user
   */
  static async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[ContactImportService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Check if contacts permission is granted
   */
  static async checkPermission(): Promise<boolean> {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[ContactImportService] Permission check failed:', error);
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
   * Import all contacts from device
   */
  static async importContacts(): Promise<ContactImportResult> {
    try {
      // Check permission first
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          total: 0,
          error: 'Contacts permission not granted',
        };
      }

      // Fetch all contacts from device
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Company,
        ],
      });

      console.log(`[ContactImportService] Found ${data.length} contacts on device`);

      let imported = 0;
      let updated = 0;

      // Import contacts in batches
      await database.write(async () => {
        const localContactsCollection = database.get<LocalContact>('local_contacts');

        for (const contact of data) {
          // Skip contacts without phone or email
          const hasPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0;
          const hasEmail = contact.emails && contact.emails.length > 0;

          if (!hasPhone && !hasEmail) {
            continue;
          }

          // Get primary phone and email
          const primaryPhone = hasPhone ? contact.phoneNumbers![0].number! : undefined;
          const primaryEmail = hasEmail ? contact.emails![0].email! : undefined;

          // Check if contact already exists
          const existing = await localContactsCollection
            .query(Q.where('device_contact_id', contact.id))
            .fetch();

          if (existing.length > 0) {
            // Update existing contact
            const localContact = existing[0];
            await localContact.update((record) => {
              record.name = contact.name || '';
              record.givenName = contact.firstName;
              record.familyName = contact.lastName;
              record.email = primaryEmail;
              record.phone = primaryPhone;
              record.normalizedPhone = primaryPhone ? this.normalizePhone(primaryPhone) : undefined;
              record.company = contact.company;
            });
            updated++;
          } else {
            // Create new contact
            await localContactsCollection.create((record) => {
              record.deviceContactId = contact.id;
              record.name = contact.name || '';
              record.givenName = contact.firstName;
              record.familyName = contact.lastName;
              record.email = primaryEmail;
              record.phone = primaryPhone;
              record.normalizedPhone = primaryPhone ? this.normalizePhone(primaryPhone) : undefined;
              record.company = contact.company;
              record.importedAt = new Date();
            });
            imported++;
          }
        }
      });

      console.log(`[ContactImportService] Import complete: ${imported} imported, ${updated} updated`);

      return {
        success: true,
        imported,
        updated,
        total: imported + updated,
      };
    } catch (error) {
      console.error('[ContactImportService] Import failed:', error);
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
   * Find local contact by phone number
   */
  static async findByPhone(phone: string): Promise<LocalContact | null> {
    try {
      const normalized = this.normalizePhone(phone);
      const contacts = await database
        .get<LocalContact>('local_contacts')
        .query(Q.where('normalized_phone', normalized))
        .fetch();

      return contacts.length > 0 ? contacts[0] : null;
    } catch (error) {
      console.error('[ContactImportService] Find by phone failed:', error);
      return null;
    }
  }

  /**
   * Find local contact by email
   */
  static async findByEmail(email: string): Promise<LocalContact | null> {
    try {
      const contacts = await database
        .get<LocalContact>('local_contacts')
        .query(Q.where('email', Q.like(`%${email.toLowerCase()}%`)))
        .fetch();

      return contacts.length > 0 ? contacts[0] : null;
    } catch (error) {
      console.error('[ContactImportService] Find by email failed:', error);
      return null;
    }
  }

  /**
   * Link local contact to participant
   */
  static async linkToParticipant(contactId: string, participantId: string): Promise<boolean> {
    try {
      await database.write(async () => {
        const contact = await database.get<LocalContact>('local_contacts').find(contactId);
        await contact.update((record) => {
          record.participantId = participantId;
          record.matchedAt = new Date();
        });
      });

      console.log(`[ContactImportService] Linked contact ${contactId} to participant ${participantId}`);
      return true;
    } catch (error) {
      console.error('[ContactImportService] Link to participant failed:', error);
      return false;
    }
  }

  /**
   * Get all unmatched contacts (no participantId)
   */
  static async getUnmatchedContacts(): Promise<LocalContact[]> {
    try {
      return await database
        .get<LocalContact>('local_contacts')
        .query(Q.where('participant_id', null))
        .fetch();
    } catch (error) {
      console.error('[ContactImportService] Get unmatched contacts failed:', error);
      return [];
    }
  }

  /**
   * Get contact import stats
   */
  static async getStats() {
    try {
      const totalContacts = await database.get<LocalContact>('local_contacts').query().fetchCount();
      const matchedContacts = await database
        .get<LocalContact>('local_contacts')
        .query(Q.where('participant_id', Q.notEq(null)))
        .fetchCount();
      const unmatchedContacts = totalContacts - matchedContacts;

      return {
        total: totalContacts,
        matched: matchedContacts,
        unmatched: unmatchedContacts,
      };
    } catch (error) {
      console.error('[ContactImportService] Get stats failed:', error);
      return {
        total: 0,
        matched: 0,
        unmatched: 0,
      };
    }
  }
}
