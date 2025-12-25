/**
 * Push Notification Service for Becky CRM Mobile
 *
 * Handles:
 * - Permission requests
 * - Push token management
 * - Local notification scheduling
 * - Remote notification handling
 * - Badge management
 *
 * @module services/notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { apiClient } from '../lib/api/client';

// Storage keys
const STORAGE_KEYS = {
  PUSH_TOKEN: 'push_token',
  NOTIFICATION_PREFERENCES: 'notification_preferences',
  SCHEDULED_REMINDERS: 'scheduled_reminders',
};

// Notification types
export type NotificationType =
  | 'event_reminder'
  | 'new_client'
  | 'receipt_paid'
  | 'testimonial_received'
  | 'follow_up_reminder';

// Reminder timing options (in minutes)
export type ReminderTiming = 15 | 60 | 1440; // 15min, 1hr, 1day

// Notification preferences interface
export interface NotificationPreferences {
  enabled: boolean;
  eventReminders: boolean;
  eventReminderTiming: ReminderTiming[];
  newClientSignup: boolean;
  receiptPaid: boolean;
  testimonialReceived: boolean;
  followUpReminders: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string; // HH:mm format
}

// Default preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  eventReminders: true,
  eventReminderTiming: [15, 60], // 15min and 1hr before
  newClientSignup: true,
  receiptPaid: true,
  testimonialReceived: true,
  followUpReminders: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

// Scheduled reminder info
export interface ScheduledReminder {
  notificationId: string;
  eventId: string;
  eventTitle: string;
  scheduledTime: string;
  reminderMinutes: ReminderTiming;
}

// Notification payload structure
export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * NotificationService - Singleton service for managing push notifications
 */
class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;
  private preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES;
  private scheduledReminders: ScheduledReminder[] = [];
  private initialized = false;

  private constructor() {
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   * Call this on app startup
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      console.log('[NotificationService] Initializing...');

      // Load stored preferences
      await this.loadPreferences();
      await this.loadScheduledReminders();

      // Check if we have permission and register
      const hasPermission = await this.checkPermission();
      if (hasPermission) {
        await this.registerForPushNotifications();
      }

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }

      this.initialized = true;
      console.log('[NotificationService] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[NotificationService] Initialization error:', error);
      return false;
    }
  }

  /**
   * Set up Android notification channel
   */
  private async setupAndroidChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00B4D8',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      description: 'Event and follow-up reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00B4D8',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('updates', {
      name: 'Updates',
      description: 'Client, receipt, and testimonial updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  /**
   * Check if notifications are permitted
   */
  async checkPermission(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('[NotificationService] Not a physical device, skipping permission check');
      return false;
    }

    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('[NotificationService] Push notifications require a physical device');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      if (existingStatus === 'granted') {
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        // Register for push notifications after getting permission
        await this.registerForPushNotifications();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[NotificationService] Permission request error:', error);
      return false;
    }
  }

  /**
   * Register device for push notifications and get token
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('[NotificationService] Push notifications require a physical device');
      return null;
    }

    try {
      // Get the project ID from app.json
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.error('[NotificationService] No project ID found in app.json');
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.pushToken = tokenData.data;
      console.log('[NotificationService] Push token:', this.pushToken);

      // Store the token locally
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, this.pushToken);

      // Register token with backend
      await this.registerTokenWithBackend(this.pushToken);

      return this.pushToken;
    } catch (error) {
      console.error('[NotificationService] Push token registration error:', error);
      return null;
    }
  }

  /**
   * Register push token with backend API
   */
  private async registerTokenWithBackend(token: string): Promise<boolean> {
    try {
      const response = await apiClient.post('/api/notifications/register-device', {
        pushToken: token,
        platform: Platform.OS,
        deviceName: Device.deviceName || 'Unknown Device',
      });

      if (response.success) {
        console.log('[NotificationService] Token registered with backend');
        return true;
      }

      console.warn('[NotificationService] Backend registration failed:', response.error);
      return false;
    } catch (error) {
      // Don't fail if backend endpoint doesn't exist yet
      console.warn('[NotificationService] Backend registration error (may not be implemented):', error);
      return false;
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Load stored preferences
   */
  private async loadPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFERENCES);
      if (stored) {
        this.preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('[NotificationService] Error loading preferences:', error);
    }
  }

  /**
   * Get current notification preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...updates };

    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_PREFERENCES,
        JSON.stringify(this.preferences)
      );
      console.log('[NotificationService] Preferences updated');
    } catch (error) {
      console.error('[NotificationService] Error saving preferences:', error);
    }
  }

  /**
   * Check if we're in quiet hours
   */
  private isQuietHours(): boolean {
    if (!this.preferences.quietHoursEnabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const { quietHoursStart, quietHoursEnd } = this.preferences;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (quietHoursStart > quietHoursEnd) {
      return currentTime >= quietHoursStart || currentTime < quietHoursEnd;
    }

    return currentTime >= quietHoursStart && currentTime < quietHoursEnd;
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    payload: NotificationPayload,
    trigger: Notifications.NotificationTriggerInput
  ): Promise<string | null> {
    // Check if this notification type is enabled
    if (!this.isNotificationTypeEnabled(payload.type)) {
      console.log(`[NotificationService] Notification type ${payload.type} is disabled`);
      return null;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: {
            type: payload.type,
            ...payload.data,
          },
          sound: 'default',
          ...(Platform.OS === 'android' && {
            channelId: payload.type.includes('reminder') ? 'reminders' : 'updates',
          }),
        },
        trigger,
      });

      console.log(`[NotificationService] Scheduled notification: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('[NotificationService] Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Check if a notification type is enabled
   */
  private isNotificationTypeEnabled(type: NotificationType): boolean {
    if (!this.preferences.enabled) {
      return false;
    }

    switch (type) {
      case 'event_reminder':
        return this.preferences.eventReminders;
      case 'new_client':
        return this.preferences.newClientSignup;
      case 'receipt_paid':
        return this.preferences.receiptPaid;
      case 'testimonial_received':
        return this.preferences.testimonialReceived;
      case 'follow_up_reminder':
        return this.preferences.followUpReminders;
      default:
        return true;
    }
  }

  /**
   * Schedule event reminder notifications
   */
  async scheduleEventReminders(
    eventId: string,
    eventTitle: string,
    eventStartTime: Date,
    clientName?: string
  ): Promise<string[]> {
    const scheduledIds: string[] = [];

    if (!this.preferences.eventReminders) {
      return scheduledIds;
    }

    // Cancel any existing reminders for this event
    await this.cancelEventReminders(eventId);

    const now = new Date();

    for (const minutes of this.preferences.eventReminderTiming) {
      const reminderTime = new Date(eventStartTime.getTime() - minutes * 60 * 1000);

      // Skip if reminder time is in the past
      if (reminderTime <= now) {
        continue;
      }

      // Skip if in quiet hours
      if (this.isQuietHours()) {
        continue;
      }

      const reminderText = this.getReminderText(minutes);
      const body = clientName
        ? `${eventTitle} with ${clientName} ${reminderText}`
        : `${eventTitle} ${reminderText}`;

      const notificationId = await this.scheduleLocalNotification(
        {
          type: 'event_reminder',
          title: 'Event Reminder',
          body,
          data: { eventId, eventTitle, clientName },
        },
        { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderTime }
      );

      if (notificationId) {
        scheduledIds.push(notificationId);

        // Track scheduled reminder
        this.scheduledReminders.push({
          notificationId,
          eventId,
          eventTitle,
          scheduledTime: reminderTime.toISOString(),
          reminderMinutes: minutes,
        });
      }
    }

    // Save scheduled reminders
    await this.saveScheduledReminders();

    return scheduledIds;
  }

  /**
   * Get human-readable reminder text
   */
  private getReminderText(minutes: ReminderTiming): string {
    switch (minutes) {
      case 15:
        return 'starts in 15 minutes';
      case 60:
        return 'starts in 1 hour';
      case 1440:
        return 'is tomorrow';
      default:
        return `starts in ${minutes} minutes`;
    }
  }

  /**
   * Cancel all reminders for an event
   */
  async cancelEventReminders(eventId: string): Promise<void> {
    const toCancel = this.scheduledReminders.filter((r) => r.eventId === eventId);

    for (const reminder of toCancel) {
      try {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      } catch (error) {
        console.warn(`[NotificationService] Error canceling notification ${reminder.notificationId}:`, error);
      }
    }

    // Update scheduled reminders list
    this.scheduledReminders = this.scheduledReminders.filter((r) => r.eventId !== eventId);
    await this.saveScheduledReminders();
  }

  /**
   * Load scheduled reminders from storage
   */
  private async loadScheduledReminders(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_REMINDERS);
      if (stored) {
        this.scheduledReminders = JSON.parse(stored);

        // Clean up expired reminders
        const now = new Date();
        this.scheduledReminders = this.scheduledReminders.filter(
          (r) => new Date(r.scheduledTime) > now
        );
        await this.saveScheduledReminders();
      }
    } catch (error) {
      console.error('[NotificationService] Error loading scheduled reminders:', error);
    }
  }

  /**
   * Save scheduled reminders to storage
   */
  private async saveScheduledReminders(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SCHEDULED_REMINDERS,
        JSON.stringify(this.scheduledReminders)
      );
    } catch (error) {
      console.error('[NotificationService] Error saving scheduled reminders:', error);
    }
  }

  /**
   * Get all scheduled reminders
   */
  getScheduledReminders(): ScheduledReminder[] {
    return [...this.scheduledReminders];
  }

  /**
   * Send immediate notification (for testing or immediate alerts)
   */
  async sendImmediateNotification(
    title: string,
    body: string,
    type: NotificationType = 'event_reminder',
    data?: Record<string, any>
  ): Promise<string | null> {
    return this.scheduleLocalNotification(
      { type, title, body, data },
      null // null trigger = immediate
    );
  }

  /**
   * Clear badge count
   */
  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('[NotificationService] Error clearing badge:', error);
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('[NotificationService] Error setting badge:', error);
    }
  }

  /**
   * Get all pending notifications
   */
  async getPendingNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Cancel all pending notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    this.scheduledReminders = [];
    await this.saveScheduledReminders();
    await this.clearBadge();
  }

  /**
   * Add listener for received notifications (app in foreground)
   */
  addNotificationReceivedListener(
    handler: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(handler);
  }

  /**
   * Add listener for notification responses (user tapped notification)
   */
  addNotificationResponseListener(
    handler: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(handler);
  }

  /**
   * Get last notification response (if app was opened via notification)
   */
  async getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    return Notifications.getLastNotificationResponseAsync();
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export class for testing
export { NotificationService };
