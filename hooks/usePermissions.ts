import { useState, useCallback } from 'react';
import * as Contacts from 'expo-contacts';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface PermissionsState {
  contacts: PermissionStatus;
}

export interface UsePermissionsResult {
  permissions: PermissionsState;
  loading: boolean;
  requestContactsPermission: () => Promise<boolean>;
  checkContactsPermission: () => Promise<PermissionStatus>;
  checkAllPermissions: () => Promise<void>;
}

/**
 * Hook to manage app permissions
 */
export function usePermissions(): UsePermissionsResult {
  const [permissions, setPermissions] = useState<PermissionsState>({
    contacts: 'undetermined',
  });
  const [loading, setLoading] = useState(false);

  /**
   * Check contacts permission status
   */
  const checkContactsPermission = useCallback(async (): Promise<PermissionStatus> => {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      const permissionStatus: PermissionStatus = status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';

      setPermissions(prev => ({ ...prev, contacts: permissionStatus }));
      return permissionStatus;
    } catch (error) {
      console.error('[usePermissions] Error checking contacts permission:', error);
      return 'denied';
    }
  }, []);

  /**
   * Request contacts permission
   */
  const requestContactsPermission = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      const { status } = await Contacts.requestPermissionsAsync();
      const granted = status === 'granted';

      setPermissions(prev => ({
        ...prev,
        contacts: granted ? 'granted' : 'denied'
      }));

      return granted;
    } catch (error) {
      console.error('[usePermissions] Error requesting contacts permission:', error);
      setPermissions(prev => ({ ...prev, contacts: 'denied' }));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check all permissions
   */
  const checkAllPermissions = useCallback(async () => {
    setLoading(true);
    try {
      await checkContactsPermission();
      // Future: Add SMS, Calendar permissions here
    } finally {
      setLoading(false);
    }
  }, [checkContactsPermission]);

  return {
    permissions,
    loading,
    requestContactsPermission,
    checkContactsPermission,
    checkAllPermissions,
  };
}
