import { useState, useCallback, useEffect } from 'react';
import { ContactImportService, ContactImportResult } from '../lib/services/ContactImportService';

export interface ContactImportStats {
  total: number;
  matched: number;
  unmatched: number;
}

export interface UseContactImportResult {
  importing: boolean;
  stats: ContactImportStats | null;
  lastImportResult: ContactImportResult | null;
  error: string | null;
  importContacts: () => Promise<ContactImportResult>;
  refreshStats: () => Promise<void>;
}

/**
 * Hook to manage contact import functionality
 */
export function useContactImport(): UseContactImportResult {
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<ContactImportStats | null>(null);
  const [lastImportResult, setLastImportResult] = useState<ContactImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh contact statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      const contactStats = await ContactImportService.getStats();
      setStats(contactStats);
    } catch (err) {
      console.error('[useContactImport] Error refreshing stats:', err);
    }
  }, []);

  /**
   * Import contacts from device
   */
  const importContacts = useCallback(async (): Promise<ContactImportResult> => {
    setImporting(true);
    setError(null);

    try {
      const result = await ContactImportService.importContacts();
      setLastImportResult(result);

      if (!result.success) {
        setError(result.error || 'Import failed');
      } else {
        // Refresh stats after successful import
        await refreshStats();
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('[useContactImport] Import error:', err);

      return {
        success: false,
        imported: 0,
        updated: 0,
        total: 0,
        error: errorMessage,
      };
    } finally {
      setImporting(false);
    }
  }, [refreshStats]);

  // Load stats on mount
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    importing,
    stats,
    lastImportResult,
    error,
    importContacts,
    refreshStats,
  };
}
