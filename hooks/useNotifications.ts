/**
 * useNotifications Hook
 *
 * React hook for managing push notifications in the Becky CRM mobile app.
 *
 * Features:
 * - Permission management
 * - Preference updates
 * - Event reminder scheduling
 * - Notification response handling
 *
 * @module hooks/useNotifications
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  notificationService,
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  ReminderTiming,
  ScheduledReminder,
  NotificationType,
} from '../services/notifications';

// Navigation action types for notification responses
export type NotificationNavigationAction =
  | { type: 'navigate_to_event'; eventId: string }
  | { type: 'navigate_to_client'; clientId: string }
  | { type: 'navigate_to_billing' }
  | { type: 'navigate_to_testimonials' }
  | { type: 'navigate_to_conversations' }
  | { type: 'none' };

export interface UseNotificationsResult {
  // State
  initialized: boolean;
  permissionGranted: boolean;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  pushToken: string | null;
  preferences: NotificationPreferences;
  scheduledReminders: ScheduledReminder[];
  loading: boolean;

  // Actions
  initialize: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  scheduleEventReminders: (
    eventId: string,
    eventTitle: string,
    eventStartTime: Date,
    clientName?: string
  ) => Promise<string[]>;
  cancelEventReminders: (eventId: string) => Promise<void>;
  sendTestNotification: () => Promise<void>;
  clearBadge: () => Promise<void>;
  cancelAllNotifications: () => Promise<void>;

  // Navigation handler (set by App.tsx to handle notification taps)
  setNavigationHandler: (handler: (action: NotificationNavigationAction) => void) => void;
}

/**
 * Hook for managing push notifications
 *
 * @example
 * ```typescript
 * const {
 *   permissionGranted,
 *   preferences,
 *   requestPermission,
 *   updatePreferences,
 *   scheduleEventReminders,
 * } = useNotifications();
 *
 * // Request permission on first use
 * if (!permissionGranted) {
 *   await requestPermission();
 * }
 *
 * // Schedule reminders for an event
 * await scheduleEventReminders(
 *   event.id,
 *   event.title,
 *   new Date(event.startTime),
 *   event.clientName
 * );
 * ```
 */
export function useNotifications(): UseNotificationsResult {
  // State
  const [initialized, setInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [scheduledReminders, setScheduledReminders] = useState<ScheduledReminder[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs
  const navigationHandlerRef = useRef<((action: NotificationNavigationAction) => void) | null>(null);
  const notificationReceivedSubscription = useRef<Notifications.EventSubscription | null>(null);
  const notificationResponseSubscription = useRef<Notifications.EventSubscription | null>(null);

  /**
   * Parse notification data to determine navigation action
   */
  const parseNotificationAction = useCallback(
    (data: Record<string, any> | undefined): NotificationNavigationAction => {
      if (!data) {
        return { type: 'none' };
      }

      const notificationType = data.type as NotificationType | undefined;

      switch (notificationType) {
        case 'event_reminder':
        case 'follow_up_reminder':
          if (data.eventId) {
            return { type: 'navigate_to_event', eventId: data.eventId };
          }
          break;

        case 'new_client':
          if (data.clientId) {
            return { type: 'navigate_to_client', clientId: data.clientId };
          }
          break;

        case 'receipt_paid':
          return { type: 'navigate_to_billing' };

        case 'testimonial_received':
          return { type: 'navigate_to_testimonials' };
      }

      return { type: 'none' };
    },
    []
  );

  /**
   * Handle notification response (user tapped notification)
   */
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      console.log('[useNotifications] Notification tapped:', response.notification.request.identifier);

      const data = response.notification.request.content.data as Record<string, any> | undefined;
      const action = parseNotificationAction(data);

      if (action.type !== 'none' && navigationHandlerRef.current) {
        navigationHandlerRef.current(action);
      }
    },
    [parseNotificationAction]
  );

  /**
   * Handle notification received (app in foreground)
   */
  const handleNotificationReceived = useCallback((notification: Notifications.Notification) => {
    console.log('[useNotifications] Notification received:', notification.request.identifier);
    // Could add visual indicator or toast here
  }, []);

  /**
   * Initialize notifications
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    if (initialized) {
      return true;
    }

    setLoading(true);

    try {
      const success = await notificationService.initialize();

      if (success) {
        // Update state from service
        const hasPermission = await notificationService.checkPermission();
        setPermissionGranted(hasPermission);
        setPermissionStatus(hasPermission ? 'granted' : 'undetermined');
        setPushToken(notificationService.getPushToken());
        setPreferences(notificationService.getPreferences());
        setScheduledReminders(notificationService.getScheduledReminders());

        // Set up listeners
        notificationReceivedSubscription.current = notificationService.addNotificationReceivedListener(
          handleNotificationReceived
        );
        notificationResponseSubscription.current = notificationService.addNotificationResponseListener(
          handleNotificationResponse
        );

        // Check if app was opened via notification
        const lastResponse = await notificationService.getLastNotificationResponse();
        if (lastResponse) {
          handleNotificationResponse(lastResponse);
        }

        setInitialized(true);
      }

      return success;
    } catch (error) {
      console.error('[useNotifications] Initialization error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized, handleNotificationReceived, handleNotificationResponse]);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setLoading(true);

    try {
      const granted = await notificationService.requestPermission();
      setPermissionGranted(granted);
      setPermissionStatus(granted ? 'granted' : 'denied');

      if (granted) {
        setPushToken(notificationService.getPushToken());
      }

      return granted;
    } catch (error) {
      console.error('[useNotifications] Permission request error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>): Promise<void> => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    await notificationService.updatePreferences(updates);
  }, [preferences]);

  /**
   * Schedule event reminders
   */
  const scheduleEventReminders = useCallback(
    async (
      eventId: string,
      eventTitle: string,
      eventStartTime: Date,
      clientName?: string
    ): Promise<string[]> => {
      const ids = await notificationService.scheduleEventReminders(
        eventId,
        eventTitle,
        eventStartTime,
        clientName
      );

      setScheduledReminders(notificationService.getScheduledReminders());
      return ids;
    },
    []
  );

  /**
   * Cancel event reminders
   */
  const cancelEventReminders = useCallback(async (eventId: string): Promise<void> => {
    await notificationService.cancelEventReminders(eventId);
    setScheduledReminders(notificationService.getScheduledReminders());
  }, []);

  /**
   * Send test notification
   */
  const sendTestNotification = useCallback(async (): Promise<void> => {
    await notificationService.sendImmediateNotification(
      'Test Notification',
      'Push notifications are working correctly!',
      'event_reminder'
    );
  }, []);

  /**
   * Clear badge count
   */
  const clearBadge = useCallback(async (): Promise<void> => {
    await notificationService.clearBadge();
  }, []);

  /**
   * Cancel all notifications
   */
  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    await notificationService.cancelAllNotifications();
    setScheduledReminders([]);
  }, []);

  /**
   * Set navigation handler
   */
  const setNavigationHandler = useCallback(
    (handler: (action: NotificationNavigationAction) => void): void => {
      navigationHandlerRef.current = handler;
    },
    []
  );

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      if (notificationReceivedSubscription.current) {
        notificationReceivedSubscription.current.remove();
      }
      if (notificationResponseSubscription.current) {
        notificationResponseSubscription.current.remove();
      }
    };
  }, []);

  /**
   * Clear badge when app becomes active
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Clear badge when app comes to foreground
        notificationService.clearBadge();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    // State
    initialized,
    permissionGranted,
    permissionStatus,
    pushToken,
    preferences,
    scheduledReminders,
    loading,

    // Actions
    initialize,
    requestPermission,
    updatePreferences,
    scheduleEventReminders,
    cancelEventReminders,
    sendTestNotification,
    clearBadge,
    cancelAllNotifications,
    setNavigationHandler,
  };
}

// Re-export types for convenience
export type {
  NotificationPreferences,
  ReminderTiming,
  ScheduledReminder,
  NotificationType,
};
export { DEFAULT_NOTIFICATION_PREFERENCES };
