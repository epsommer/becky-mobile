/**
 * Billing/Receipts API endpoints
 * @module lib/api/endpoints/billing
 */

import { apiClient } from '../client';
import { BillingDocument, ApiResponse, PaginationParams } from '../types';

/**
 * Query parameters for billing documents
 */
export interface BillingQuery extends PaginationParams {
  clientId?: string;
  type?: 'invoice' | 'receipt' | 'quote';
  status?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Data for creating a receipt
 */
export interface CreateReceiptData {
  clientId: string;
  amount: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
  dueDate?: string;
}

/**
 * Billing API methods
 *
 * @example
 * ```typescript
 * import { billingApi } from '@/lib/api/endpoints';
 *
 * // Get receipts for client
 * const response = await billingApi.getReceipts({ clientId: 'abc123' });
 *
 * // Create new receipt
 * const receipt = await billingApi.createReceipt({
 *   clientId: 'abc123',
 *   amount: 150.00,
 *   items: [{ description: 'Service', quantity: 1, unitPrice: 150 }]
 * });
 * ```
 */
export const billingApi = {
  /**
   * Get all receipts with optional filters
   *
   * @param params - Query parameters
   * @returns List of receipts
   */
  getReceipts: async (
    params?: BillingQuery
  ): Promise<ApiResponse<BillingDocument[]>> => {
    return apiClient.get<BillingDocument[]>('/api/billing/receipts', params);
  },

  /**
   * Get single receipt by ID
   *
   * @param receiptId - Receipt ID
   * @returns Receipt details
   */
  getReceipt: async (receiptId: string): Promise<ApiResponse<BillingDocument>> => {
    return apiClient.get<BillingDocument>(`/api/billing/receipts/${receiptId}`);
  },

  /**
   * Create new receipt
   *
   * @param data - Receipt data
   * @returns Created receipt
   */
  createReceipt: async (
    data: CreateReceiptData
  ): Promise<ApiResponse<BillingDocument>> => {
    return apiClient.post<BillingDocument>('/api/billing/receipts', data);
  },

  /**
   * Update existing receipt
   *
   * @param receiptId - Receipt ID
   * @param data - Updated data
   * @returns Updated receipt
   */
  updateReceipt: async (
    receiptId: string,
    data: Partial<BillingDocument>
  ): Promise<ApiResponse<BillingDocument>> => {
    return apiClient.patch<BillingDocument>(
      `/api/billing/receipts/${receiptId}`,
      data
    );
  },

  /**
   * Delete receipt
   *
   * @param receiptId - Receipt ID
   * @returns Success response
   */
  deleteReceipt: async (receiptId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/api/billing/receipts/${receiptId}`);
  },

  /**
   * Send receipt via email
   *
   * @param receiptId - Receipt ID
   * @param email - Recipient email
   * @returns Send result
   */
  sendReceipt: async (
    receiptId: string,
    email?: string
  ): Promise<ApiResponse<any>> => {
    return apiClient.post<any>(`/api/billing/receipts/${receiptId}/send`, {
      email,
    });
  },

  /**
   * Archive receipt
   *
   * @param receiptId - Receipt ID
   * @returns Success response
   */
  archiveReceipt: async (receiptId: string): Promise<ApiResponse<void>> => {
    return apiClient.post<void>(`/api/billing/receipts/${receiptId}/archive`);
  },

  /**
   * Get invoices
   *
   * @param params - Query parameters
   * @returns List of invoices
   */
  getInvoices: async (
    params?: BillingQuery
  ): Promise<ApiResponse<BillingDocument[]>> => {
    return apiClient.get<BillingDocument[]>('/api/billing/invoices', params);
  },

  /**
   * Get client billing information
   *
   * @param clientId - Client ID
   * @returns Billing details
   */
  getClientBilling: async (clientId: string): Promise<ApiResponse<any>> => {
    return apiClient.get<any>(`/api/clients/${clientId}/billing`);
  },

  /**
   * Get service lines
   *
   * @returns List of service lines with their service items
   */
  getServiceLines: async (): Promise<ApiResponse<any[]>> => {
    return apiClient.get<any[]>('/api/service-lines');
  },

  /**
   * Get receipts by client ID
   *
   * @param clientId - Client ID
   * @returns List of receipts for the client
   */
  getReceiptsByClientId: async (clientId: string): Promise<ApiResponse<BillingDocument[]>> => {
    return apiClient.get<BillingDocument[]>('/api/billing/receipts', { clientId });
  },
};
