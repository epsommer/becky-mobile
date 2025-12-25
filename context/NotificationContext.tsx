/**
 * NotificationContext
 *
 * React Context for managing push notifications app-wide.
 * Initializes notifications on app start and provides navigation handling.
 *
 * @module context/NotificationContext
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  useNotifications,
  UseNotificationsResult,
  NotificationNavigationAction,
} from '../hooks/useNotifications';

// Context type
interface NotificationContextValue extends UseNotificationsResult {
  // Additional context-specific functionality can be added here
}

// Create context
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Provider props
interface NotificationProviderProps {
  children: ReactNode;
  onNavigationAction?: (action: NotificationNavigationAction) => void;
}

/**
 * NotificationProvider
 *
 * Wraps the app to provide notification functionality throughout.
 * Initializes notifications on mount and sets up navigation handling.
 *
 * @example
 * ```tsx
 * function App() {
 *   const handleNavigationAction = (action) => {
 *     switch (action.type) {
 *       case 'navigate_to_event':
 *         navigateToEvent(action.eventId);
 *         break;
 *       // ... handle other actions
 *     }
 *   };
 *
 *   return (
 *     <NotificationProvider onNavigationAction={handleNavigationAction}>
 *       <YourApp />
 *     </NotificationProvider>
 *   );
 * }
 * ```
 */
export function NotificationProvider({
  children,
  onNavigationAction,
}: NotificationProviderProps) {
  const notifications = useNotifications();
  const { initialize, setNavigationHandler, initialized } = notifications;

  // Track if we've started initialization
  const initializingRef = useRef(false);

  // Initialize notifications on mount
  useEffect(() => {
    if (!initialized && !initializingRef.current) {
      initializingRef.current = true;
      console.log('[NotificationProvider] Initializing notifications...');
      initialize().then((success) => {
        if (success) {
          console.log('[NotificationProvider] Notifications initialized successfully');
        } else {
          console.warn('[NotificationProvider] Notifications initialization failed');
        }
      });
    }
  }, [initialize, initialized]);

  // Set up navigation handler
  useEffect(() => {
    if (onNavigationAction) {
      setNavigationHandler(onNavigationAction);
    }
  }, [onNavigationAction, setNavigationHandler]);

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * useNotificationContext
 *
 * Hook to access notification functionality from any component.
 *
 * @example
 * ```tsx
 * function EventScreen() {
 *   const { scheduleEventReminders, preferences } = useNotificationContext();
 *
 *   const handleSaveEvent = async (event) => {
 *     // ... save event
 *     if (preferences.eventReminders) {
 *       await scheduleEventReminders(
 *         event.id,
 *         event.title,
 *         new Date(event.startTime),
 *         event.clientName
 *       );
 *     }
 *   };
 * }
 * ```
 */
export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }

  return context;
}

// Export context for advanced use cases
export { NotificationContext };
