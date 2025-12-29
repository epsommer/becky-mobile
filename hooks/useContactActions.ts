/**
 * useContactActions - Hook for contact-related actions
 *
 * Provides utilities for:
 * - Opening SMS app with pre-filled recipient
 * - Fetching full contact details from device
 * - Creating clients from contacts
 * - Managing loading/error states
 */
import { useState, useCallback } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import * as ExpoContacts from 'expo-contacts';
import * as ExpoLinking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { LocalContact } from '../lib/database/models/LocalContact';
import { clientsApi } from '../lib/api/endpoints/clients';
import { CreateClientData, Client } from '../lib/api/types';
import { database } from '../lib/database';

/**
 * Full contact details fetched from device
 */
export interface FullContactDetails {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phoneNumbers?: Array<{
    id?: string;
    label?: string;
    number?: string;
    countryCode?: string;
  }>;
  emails?: Array<{
    id?: string;
    label?: string;
    email?: string;
  }>;
  addresses?: Array<{
    id?: string;
    label?: string;
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }>;
  note?: string;
  birthday?: Date;
  imageAvailable?: boolean;
  image?: { uri?: string };
}

/**
 * Contact data prepared for client creation
 */
export interface ContactForCreation {
  localContactId: string;
  deviceContactId: string;
  displayName: string;
  phone?: string;
  email?: string;
  company?: string;
  // Editable fields
  editedName?: string;
  editedPhone?: string;
  editedEmail?: string;
  // Validation
  isValid: boolean;
  validationError?: string;
  // Creation state
  isCreating?: boolean;
  isCreated?: boolean;
  createdClientId?: string;
  creationError?: string;
}

/**
 * Batch creation result
 */
export interface BatchCreationResult {
  success: boolean;
  totalAttempted: number;
  successCount: number;
  failedCount: number;
  createdClients: Array<{ contactId: string; client: Client }>;
  failedContacts: Array<{ contactId: string; error: string }>;
}

/**
 * Hook result interface
 */
export interface UseContactActionsResult {
  // SMS
  openSMS: (phoneNumber: string) => Promise<boolean>;
  canOpenSMS: (phoneNumber?: string) => boolean;

  // Contact details
  fetchFullContactDetails: (deviceContactId: string) => Promise<FullContactDetails | null>;
  isLoadingContactDetails: boolean;
  contactDetailsError: string | null;

  // Client creation
  createClientFromContact: (contact: ContactForCreation) => Promise<{ success: boolean; client?: Client; error?: string }>;
  createClientsFromContacts: (contacts: ContactForCreation[]) => Promise<BatchCreationResult>;
  isCreatingClients: boolean;
  creationProgress: { current: number; total: number };

  // Open device contacts app
  openContactsApp: () => Promise<boolean>;
  openContactInApp: (deviceContactId: string) => Promise<boolean>;

  // Utilities
  prepareContactForCreation: (localContact: LocalContact) => ContactForCreation;
  validateContactForCreation: (contact: ContactForCreation) => { isValid: boolean; error?: string };
  normalizePhoneNumber: (phone: string) => string;
}

/**
 * Hook to manage contact actions including SMS, viewing details, and client creation
 */
export function useContactActions(): UseContactActionsResult {
  const [isLoadingContactDetails, setIsLoadingContactDetails] = useState(false);
  const [contactDetailsError, setContactDetailsError] = useState<string | null>(null);
  const [isCreatingClients, setIsCreatingClients] = useState(false);
  const [creationProgress, setCreationProgress] = useState({ current: 0, total: 0 });

  /**
   * Normalize phone number - remove all non-digit characters except leading +
   */
  const normalizePhoneNumber = useCallback((phone: string): string => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    return cleaned;
  }, []);

  /**
   * Check if SMS can be opened for a given phone number
   */
  const canOpenSMS = useCallback((phoneNumber?: string): boolean => {
    return !!phoneNumber && phoneNumber.trim().length > 0;
  }, []);

  /**
   * Open the device's default SMS app with pre-filled recipient
   */
  const openSMS = useCallback(async (phoneNumber: string): Promise<boolean> => {
    try {
      // Provide haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const normalizedPhone = normalizePhoneNumber(phoneNumber);

      if (!normalizedPhone) {
        Alert.alert('Invalid Phone Number', 'The contact does not have a valid phone number.');
        return false;
      }

      // Build SMS URL based on platform
      const smsUrl = Platform.OS === 'ios'
        ? `sms:${normalizedPhone}`
        : `sms:${normalizedPhone}?body=`;

      const canOpen = await ExpoLinking.canOpenURL(smsUrl);

      if (canOpen) {
        await ExpoLinking.openURL(smsUrl);
        return true;
      } else {
        Alert.alert(
          'Unable to Open SMS',
          'This device cannot send SMS messages or the SMS app is not available.'
        );
        return false;
      }
    } catch (error) {
      console.error('[useContactActions] Error opening SMS:', error);
      Alert.alert('Error', 'Failed to open SMS app. Please try again.');
      return false;
    }
  }, [normalizePhoneNumber]);

  /**
   * Fetch full contact details from device using expo-contacts
   */
  const fetchFullContactDetails = useCallback(async (deviceContactId: string): Promise<FullContactDetails | null> => {
    setIsLoadingContactDetails(true);
    setContactDetailsError(null);

    try {
      // Check permission
      const { status } = await ExpoContacts.getPermissionsAsync();
      if (status !== 'granted') {
        setContactDetailsError('Contacts permission not granted');
        return null;
      }

      // Fetch the contact with all fields
      const contact = await ExpoContacts.getContactByIdAsync(deviceContactId, [
        ExpoContacts.Fields.Name,
        ExpoContacts.Fields.FirstName,
        ExpoContacts.Fields.LastName,
        ExpoContacts.Fields.Company,
        ExpoContacts.Fields.JobTitle,
        ExpoContacts.Fields.PhoneNumbers,
        ExpoContacts.Fields.Emails,
        ExpoContacts.Fields.Addresses,
        ExpoContacts.Fields.Note,
        ExpoContacts.Fields.Birthday,
        ExpoContacts.Fields.Image,
        ExpoContacts.Fields.ImageAvailable,
      ]);

      if (!contact) {
        setContactDetailsError('Contact not found on device');
        return null;
      }

      // Map to our interface
      const fullDetails: FullContactDetails = {
        id: contact.id || deviceContactId,
        name: contact.name,
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
        jobTitle: contact.jobTitle,
        phoneNumbers: contact.phoneNumbers?.map((p) => ({
          id: p.id,
          label: p.label,
          number: p.number,
          countryCode: p.countryCode,
        })),
        emails: contact.emails?.map((e) => ({
          id: e.id,
          label: e.label,
          email: e.email,
        })),
        addresses: contact.addresses?.map((a) => ({
          id: a.id,
          label: a.label,
          street: a.street,
          city: a.city,
          region: a.region,
          postalCode: a.postalCode,
          country: a.country,
        })),
        note: contact.note,
        birthday: contact.birthday ? new Date(contact.birthday.year!, contact.birthday.month! - 1, contact.birthday.day!) : undefined,
        imageAvailable: contact.imageAvailable,
        image: contact.image,
      };

      return fullDetails;
    } catch (error) {
      console.error('[useContactActions] Error fetching contact details:', error);
      setContactDetailsError(error instanceof Error ? error.message : 'Failed to fetch contact details');
      return null;
    } finally {
      setIsLoadingContactDetails(false);
    }
  }, []);

  /**
   * Open the device contacts app
   */
  const openContactsApp = useCallback(async (): Promise<boolean> => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Platform-specific URL for contacts app
      const contactsUrl = Platform.OS === 'ios'
        ? 'contacts://'
        : 'content://contacts/people/';

      const canOpen = await ExpoLinking.canOpenURL(contactsUrl);

      if (canOpen) {
        await ExpoLinking.openURL(contactsUrl);
        return true;
      } else {
        // Fallback - try settings URL which may allow access to contacts
        const settingsUrl = Platform.OS === 'ios'
          ? 'app-settings:'
          : 'package:com.android.contacts';

        const canOpenSettings = await ExpoLinking.canOpenURL(settingsUrl);
        if (canOpenSettings) {
          await ExpoLinking.openURL(settingsUrl);
          return true;
        }

        Alert.alert(
          'Unable to Open Contacts',
          'Could not open the contacts app on this device.'
        );
        return false;
      }
    } catch (error) {
      console.error('[useContactActions] Error opening contacts app:', error);
      Alert.alert('Error', 'Failed to open contacts app.');
      return false;
    }
  }, []);

  /**
   * Open a specific contact in the device contacts app
   */
  const openContactInApp = useCallback(async (deviceContactId: string): Promise<boolean> => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Note: Direct deep linking to specific contact is platform-specific and may not work
      // on all devices. Falling back to opening contacts app.
      const contactUrl = Platform.OS === 'ios'
        ? `contacts://${deviceContactId}`
        : `content://contacts/people/${deviceContactId}`;

      const canOpen = await ExpoLinking.canOpenURL(contactUrl);

      if (canOpen) {
        await ExpoLinking.openURL(contactUrl);
        return true;
      } else {
        // Fallback to just opening contacts app
        return openContactsApp();
      }
    } catch (error) {
      console.error('[useContactActions] Error opening contact in app:', error);
      // Fallback to contacts app
      return openContactsApp();
    }
  }, [openContactsApp]);

  /**
   * Prepare a LocalContact for client creation
   */
  const prepareContactForCreation = useCallback((localContact: LocalContact): ContactForCreation => {
    const validation = validateContactForCreationInternal(localContact.displayName);

    return {
      localContactId: localContact.id,
      deviceContactId: localContact.deviceContactId,
      displayName: localContact.displayName,
      phone: localContact.phone,
      email: localContact.email,
      company: localContact.company,
      isValid: validation.isValid,
      validationError: validation.error,
    };
  }, []);

  /**
   * Internal validation helper
   */
  const validateContactForCreationInternal = (name?: string): { isValid: boolean; error?: string } => {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'Name is required' };
    }
    return { isValid: true };
  };

  /**
   * Validate a contact for client creation
   */
  const validateContactForCreation = useCallback((contact: ContactForCreation): { isValid: boolean; error?: string } => {
    const nameToValidate = contact.editedName || contact.displayName;
    return validateContactForCreationInternal(nameToValidate);
  }, []);

  /**
   * Create a single client from a contact
   */
  const createClientFromContact = useCallback(async (
    contact: ContactForCreation
  ): Promise<{ success: boolean; client?: Client; error?: string }> => {
    try {
      // Validate
      const validation = validateContactForCreation(contact);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Prepare client data
      const clientData: CreateClientData = {
        name: contact.editedName || contact.displayName,
        email: contact.editedEmail || contact.email,
        phone: contact.editedPhone || contact.phone,
        company: contact.company,
        status: 'prospect',
      };

      // Call API
      const response = await clientsApi.createClient(clientData);

      if (!response.success || !response.data) {
        return { success: false, error: response.error || 'Failed to create client' };
      }

      // Update local contact to mark as matched
      try {
        await database.write(async () => {
          const localContactsCollection = database.get<LocalContact>('local_contacts');
          const localContact = await localContactsCollection.find(contact.localContactId);

          if (localContact) {
            await localContact.update((record) => {
              record.participantId = response.data!.id;
              record.matchedAt = new Date();
            });
          }
        });
      } catch (dbError) {
        console.warn('[useContactActions] Failed to update local contact after client creation:', dbError);
        // Don't fail the whole operation if local update fails
      }

      return { success: true, client: response.data };
    } catch (error) {
      console.error('[useContactActions] Error creating client:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating client',
      };
    }
  }, [validateContactForCreation]);

  /**
   * Create multiple clients from contacts (batch operation)
   */
  const createClientsFromContacts = useCallback(async (
    contacts: ContactForCreation[]
  ): Promise<BatchCreationResult> => {
    setIsCreatingClients(true);
    setCreationProgress({ current: 0, total: contacts.length });

    const result: BatchCreationResult = {
      success: false,
      totalAttempted: contacts.length,
      successCount: 0,
      failedCount: 0,
      createdClients: [],
      failedContacts: [],
    };

    try {
      // Filter to only valid contacts
      const validContacts = contacts.filter((c) => {
        const validation = validateContactForCreation(c);
        return validation.isValid;
      });

      if (validContacts.length === 0) {
        result.success = false;
        return result;
      }

      // Process each contact
      for (let i = 0; i < validContacts.length; i++) {
        const contact = validContacts[i];
        setCreationProgress({ current: i + 1, total: validContacts.length });

        const createResult = await createClientFromContact(contact);

        if (createResult.success && createResult.client) {
          result.successCount++;
          result.createdClients.push({
            contactId: contact.localContactId,
            client: createResult.client,
          });
        } else {
          result.failedCount++;
          result.failedContacts.push({
            contactId: contact.localContactId,
            error: createResult.error || 'Unknown error',
          });
        }

        // Small delay to avoid overwhelming the API
        if (i < validContacts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      result.success = result.successCount > 0;

      // Provide haptic feedback on completion
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      return result;
    } catch (error) {
      console.error('[useContactActions] Error in batch creation:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return result;
    } finally {
      setIsCreatingClients(false);
      setCreationProgress({ current: 0, total: 0 });
    }
  }, [validateContactForCreation, createClientFromContact]);

  return {
    // SMS
    openSMS,
    canOpenSMS,

    // Contact details
    fetchFullContactDetails,
    isLoadingContactDetails,
    contactDetailsError,

    // Client creation
    createClientFromContact,
    createClientsFromContacts,
    isCreatingClients,
    creationProgress,

    // Open device contacts app
    openContactsApp,
    openContactInApp,

    // Utilities
    prepareContactForCreation,
    validateContactForCreation,
    normalizePhoneNumber,
  };
}
