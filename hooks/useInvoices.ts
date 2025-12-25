// hooks/useInvoices.ts
import { useState, useEffect, useCallback } from 'react';
import { Invoice } from '../types/billing';
import { billingApi } from '../lib/api/endpoints/billing';

interface UseInvoicesResult {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInvoices(includeArchived: boolean = false): UseInvoicesResult {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await billingApi.getInvoices({ includeArchived } as any);
      if (response.success && response.data) {
        setInvoices(response.data as Invoice[]);
      } else {
        console.error('[useInvoices] Failed to load invoices:', response);
        setInvoices([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
      console.error('[useInvoices] Error fetching invoices:', err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    loading,
    error,
    refetch: fetchInvoices
  };
}

interface UseInvoiceResult {
  invoice: Invoice | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInvoice(invoiceId: string | null): UseInvoiceResult {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) {
      setInvoice(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await billingApi.getInvoice(invoiceId);
      if (response.success && response.data) {
        setInvoice(response.data as Invoice);
      } else {
        console.error('[useInvoice] Failed to load invoice:', response);
        setInvoice(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
      console.error('[useInvoice] Error fetching invoice:', err);
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  return {
    invoice,
    loading,
    error,
    refetch: fetchInvoice
  };
}

interface UseClientInvoicesResult {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useClientInvoices(clientId: string | null): UseClientInvoicesResult {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!clientId) {
      console.log('[useClientInvoices] No clientId provided');
      setInvoices([]);
      setLoading(false);
      return;
    }

    try {
      console.log('[useClientInvoices] Fetching invoices for clientId:', clientId);
      setLoading(true);
      setError(null);
      const response = await billingApi.getInvoicesByClientId(clientId);
      console.log('[useClientInvoices] API response:', JSON.stringify(response, null, 2));
      if (response.success && response.data) {
        console.log('[useClientInvoices] Setting invoices, count:', response.data.length);
        setInvoices(response.data as Invoice[]);
      } else {
        console.error('[useClientInvoices] Failed to load invoices:', response);
        setInvoices([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
      console.error('[useClientInvoices] Error fetching invoices:', err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    loading,
    error,
    refetch: fetchInvoices
  };
}

// Invoice mutation helpers
export interface InvoiceMutations {
  createInvoice: (data: any) => Promise<Invoice | null>;
  updateInvoice: (invoiceId: string, data: any) => Promise<Invoice | null>;
  deleteInvoice: (invoiceId: string) => Promise<boolean>;
  sendInvoice: (invoiceId: string, email?: string) => Promise<boolean>;
  markAsPaid: (invoiceId: string, paidAt?: Date) => Promise<Invoice | null>;
  duplicateInvoice: (invoiceId: string) => Promise<Invoice | null>;
}

export function useInvoiceMutations(): InvoiceMutations {
  const createInvoice = useCallback(async (data: any): Promise<Invoice | null> => {
    try {
      const response = await billingApi.createInvoice(data);
      if (response.success && response.data) {
        return response.data as Invoice;
      }
      console.error('[useInvoiceMutations] Failed to create invoice:', response);
      return null;
    } catch (err) {
      console.error('[useInvoiceMutations] Error creating invoice:', err);
      return null;
    }
  }, []);

  const updateInvoice = useCallback(async (invoiceId: string, data: any): Promise<Invoice | null> => {
    try {
      const response = await billingApi.updateInvoice(invoiceId, data);
      if (response.success && response.data) {
        return response.data as Invoice;
      }
      console.error('[useInvoiceMutations] Failed to update invoice:', response);
      return null;
    } catch (err) {
      console.error('[useInvoiceMutations] Error updating invoice:', err);
      return null;
    }
  }, []);

  const deleteInvoice = useCallback(async (invoiceId: string): Promise<boolean> => {
    try {
      const response = await billingApi.deleteInvoice(invoiceId);
      return response.success;
    } catch (err) {
      console.error('[useInvoiceMutations] Error deleting invoice:', err);
      return false;
    }
  }, []);

  const sendInvoice = useCallback(async (invoiceId: string, email?: string): Promise<boolean> => {
    try {
      const response = await billingApi.sendInvoice(invoiceId, email);
      return response.success;
    } catch (err) {
      console.error('[useInvoiceMutations] Error sending invoice:', err);
      return false;
    }
  }, []);

  const markAsPaid = useCallback(async (invoiceId: string, paidAt?: Date): Promise<Invoice | null> => {
    try {
      const response = await billingApi.markInvoicePaid(invoiceId, paidAt);
      if (response.success && response.data) {
        return response.data as Invoice;
      }
      console.error('[useInvoiceMutations] Failed to mark invoice as paid:', response);
      return null;
    } catch (err) {
      console.error('[useInvoiceMutations] Error marking invoice as paid:', err);
      return null;
    }
  }, []);

  const duplicateInvoice = useCallback(async (invoiceId: string): Promise<Invoice | null> => {
    try {
      const response = await billingApi.duplicateInvoice(invoiceId);
      if (response.success && response.data) {
        return response.data as Invoice;
      }
      console.error('[useInvoiceMutations] Failed to duplicate invoice:', response);
      return null;
    } catch (err) {
      console.error('[useInvoiceMutations] Error duplicating invoice:', err);
      return null;
    }
  }, []);

  return {
    createInvoice,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
    markAsPaid,
    duplicateInvoice
  };
}
