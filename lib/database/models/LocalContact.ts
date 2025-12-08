import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class LocalContact extends Model {
  static table = 'local_contacts';

  @field('device_contact_id') deviceContactId!: string;
  @field('name') name!: string;
  @field('given_name') givenName?: string;
  @field('family_name') familyName?: string;
  @field('email') email?: string;
  @field('phone') phone?: string;
  @field('normalized_phone') normalizedPhone?: string;
  @field('company') company?: string;
  @field('participant_id') participantId?: string;
  @date('matched_at') matchedAt?: Date;
  @date('imported_at') importedAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Helper method to check if contact is matched to a participant
  get isMatched(): boolean {
    return !!this.participantId;
  }

  // Helper method to normalize phone number (remove all non-digits)
  static normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  // Helper to get display name
  get displayName(): string {
    if (this.givenName && this.familyName) {
      return `${this.givenName} ${this.familyName}`;
    }
    return this.name;
  }
}
