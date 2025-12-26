/**
 * Offline State Management Hook
 * Provides offline status, sync state, and pending changes information
 * @module hooks/useOffline
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncService, SyncState, SyncResult, EntityType } from '../services/sync';
import { getPendingSyncCount, hasOfflineData } from '../lib/database';

// ============================================================================
// Types
// ============================================================================

export interface OfflineState {
  /** Whether the device is currently online */
  isOnline: boolean;
  /** Whether a sync operation is in progress */
  isSyncing: boolean;
  /** Last successful sync time */
  lastSyncTime: Date | null;
  /** Number of pending changes waiting to sync */
  pendingChanges: number;
  /** Whether there was an error during the last sync */
  hasError: boolean;
  /** Error message from the last sync attempt */
  errorMessage: string | null;
  /** Whether offline data exists locally */
  hasOfflineData: boolean;
  /** Human-readable last sync time */
  lastSyncTimeAgo: string;
  /** Whether data is considered stale (more than 30 minutes old) */
  isStale: boolean;
}

export interface UseOfflineReturn extends OfflineState {
  /** Trigger a full sync of all entity types */
  syncAll: () => Promise<SyncResult>;
  /** Trigger a sync for a specific entity type */
  syncEntity: (entityType: EntityType) => Promise<SyncResult>;
  /** Refresh the offline state */
  refresh: () => Promise<void>;
  /** Clear all offline data */
  clearOfflineData: () => Promise<void>;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTimeAgo(date: Date | null): string {
  if (!date) return 'Never synced';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

function isStale(date: Date | null): boolean {
  if (!date) return true;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes > 30;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useOffline(): UseOfflineReturn {
  // State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasData, setHasData] = useState<boolean>(false);

  // Refs for cleanup
  const isMounted = useRef(true);
  const syncListenerUnsubscribe = useRef<(() => void) | null>(null);

  // ============================================================================
  // Refresh State
  // ============================================================================

  const refresh = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      const state = await syncService.getSyncState();
      const offlineData = await hasOfflineData();
      const pendingCount = await getPendingSyncCount();

      if (isMounted.current) {
        setIsOnline(state.isOnline);
        setIsSyncing(state.isSyncing);
        setLastSyncTime(state.lastSyncTime);
        setPendingChanges(pendingCount);
        setHasError(state.hasError);
        setErrorMessage(state.errorMessage);
        setHasData(offlineData);
      }
    } catch (error) {
      console.error('[useOffline] Error refreshing state:', error);
    }
  }, []);

  // ============================================================================
  // Sync Operations
  // ============================================================================

  const syncAll = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);
    try {
      const result = await syncService.syncAll();
      await refresh();
      return result;
    } catch (error) {
      console.error('[useOffline] Sync failed:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [refresh]);

  const syncEntity = useCallback(async (entityType: EntityType): Promise<SyncResult> => {
    setIsSyncing(true);
    try {
      const result = await syncService.syncEntityType(entityType);
      await refresh();
      return result;
    } catch (error) {
      console.error(`[useOffline] Sync ${entityType} failed:`, error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [refresh]);

  const clearOfflineData = useCallback(async (): Promise<void> => {
    try {
      await syncService.clearAllData();
      await refresh();
    } catch (error) {
      console.error('[useOffline] Clear data failed:', error);
      throw error;
    }
  }, [refresh]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Initialize and subscribe to sync service changes
  useEffect(() => {
    isMounted.current = true;

    // Initial state fetch
    refresh();

    // Subscribe to sync service state changes
    syncListenerUnsubscribe.current = syncService.addSyncListener((state: SyncState) => {
      if (isMounted.current) {
        setIsOnline(state.isOnline);
        setIsSyncing(state.isSyncing);
        setLastSyncTime(state.lastSyncTime);
        setPendingChanges(state.pendingChanges);
        setHasError(state.hasError);
        setErrorMessage(state.errorMessage);
      }
    });

    // Cleanup
    return () => {
      isMounted.current = false;
      if (syncListenerUnsubscribe.current) {
        syncListenerUnsubscribe.current();
      }
    };
  }, [refresh]);

  // Periodic refresh of pending changes count
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMounted.current) {
        getPendingSyncCount().then(count => {
          if (isMounted.current) {
            setPendingChanges(count);
          }
        });
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // Return Value
  // ============================================================================

  return {
    // State
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingChanges,
    hasError,
    errorMessage,
    hasOfflineData: hasData,
    lastSyncTimeAgo: getTimeAgo(lastSyncTime),
    isStale: isStale(lastSyncTime),
    // Actions
    syncAll,
    syncEntity,
    refresh,
    clearOfflineData,
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Simple hook to check if device is online
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    // Initial check
    syncService.isOnline().then(online => {
      if (isMounted) {
        setIsOnline(online);
      }
    });

    // Subscribe to sync service state changes
    const unsubscribe = syncService.addSyncListener((state: SyncState) => {
      if (isMounted) {
        setIsOnline(state.isOnline);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return isOnline;
}

/**
 * Hook to get pending changes count
 */
export function usePendingChanges(): number {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchCount = async () => {
      const pendingCount = await getPendingSyncCount();
      if (isMounted) {
        setCount(pendingCount);
      }
    };

    fetchCount();

    // Refresh every 10 seconds
    const interval = setInterval(fetchCount, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return count;
}

/**
 * Hook to track sync status for a specific entity type
 */
export function useSyncStatus(entityType: EntityType) {
  const { syncEntity, isSyncing, hasError, errorMessage } = useOffline();
  const [entitySyncing, setEntitySyncing] = useState(false);

  const sync = useCallback(async () => {
    setEntitySyncing(true);
    try {
      return await syncEntity(entityType);
    } finally {
      setEntitySyncing(false);
    }
  }, [entityType, syncEntity]);

  return {
    sync,
    isSyncing: entitySyncing || isSyncing,
    hasError,
    errorMessage,
  };
}
