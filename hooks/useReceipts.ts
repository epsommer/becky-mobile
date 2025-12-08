// hooks/useReceipts.ts
import { useState, useEffect, useCallback } from 'react';
import { Receipt } from '../types/billing';
import { billingApi } from '../lib/api/endpoints/billing';

interface UseReceiptsResult {
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useReceipts(includeArchived: boolean = false): UseReceiptsResult {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await billingApi.getReceipts({ includeArchived });
      if (response.success && response.data) {
        setReceipts(response.data as Receipt[]);
      } else {
        console.error('[useReceipts] Failed to load receipts:', response);
        setReceipts([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipts');
      console.error('[useReceipts] Error fetching receipts:', err);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  return {
    receipts,
    loading,
    error,
    refetch: fetchReceipts
  };
}

interface UseReceiptResult {
  receipt: Receipt | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useReceipt(receiptId: string | null): UseReceiptResult {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipt = useCallback(async () => {
    if (!receiptId) {
      setReceipt(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await billingApi.getReceipt(receiptId);
      if (response.success && response.data) {
        setReceipt(response.data as Receipt);
      } else {
        console.error('[useReceipt] Failed to load receipt:', response);
        setReceipt(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt');
      console.error('[useReceipt] Error fetching receipt:', err);
      setReceipt(null);
    } finally {
      setLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    fetchReceipt();
  }, [fetchReceipt]);

  return {
    receipt,
    loading,
    error,
    refetch: fetchReceipt
  };
}

interface UseClientReceiptsResult {
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useClientReceipts(clientId: string | null): UseClientReceiptsResult {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    if (!clientId) {
      console.log('[useClientReceipts] No clientId provided');
      setReceipts([]);
      setLoading(false);
      return;
    }

    try {
      console.log('[useClientReceipts] Fetching receipts for clientId:', clientId);
      setLoading(true);
      setError(null);
      const response = await billingApi.getReceiptsByClientId(clientId);
      console.log('[useClientReceipts] API response:', JSON.stringify(response, null, 2));
      if (response.success && response.data) {
        console.log('[useClientReceipts] Setting receipts, count:', response.data.length);
        setReceipts(response.data as Receipt[]);
      } else {
        console.error('[useClientReceipts] Failed to load receipts:', response);
        setReceipts([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipts');
      console.error('[useClientReceipts] Error fetching receipts:', err);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  return {
    receipts,
    loading,
    error,
    refetch: fetchReceipts
  };
}
