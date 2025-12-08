/**
 * Client API endpoints
 * @module lib/api/endpoints/clients
 */

import { apiClient } from '../client';
import {
  Client,
  ApiResponse,
  ClientsQuery,
  CreateClientData,
  UpdateClientData,
} from '../types';

/**
 * Client API methods
 *
 * Provides type-safe methods for all client-related operations
 *
 * @example
 * ```typescript
 * import { clientsApi } from '@/lib/api/endpoints';
 *
 * // Get all clients
 * const response = await clientsApi.getClients({ limit: 30 });
 * if (response.success) {
 *   console.log(response.data); // Client[]
 * }
 *
 * // Get single client
 * const client = await clientsApi.getClient('client-123');
 * ```
 */
export const clientsApi = {
  /**
   * Get all clients with optional filters
   *
   * @param params - Query parameters (pagination, filters)
   * @returns List of clients
   */
  getClients: async (params?: ClientsQuery): Promise<ApiResponse<Client[]>> => {
    return apiClient.get<Client[]>('/api/clients', params);
  },

  /**
   * Get single client by ID
   *
   * @param clientId - Client ID
   * @returns Client details
   */
  getClient: async (clientId: string): Promise<ApiResponse<Client>> => {
    return apiClient.get<Client>(`/api/clients/${clientId}`);
  },

  /**
   * Create new client
   *
   * @param data - Client data
   * @returns Created client
   */
  createClient: async (data: CreateClientData): Promise<ApiResponse<Client>> => {
    return apiClient.post<Client>('/api/clients', data);
  },

  /**
   * Update existing client
   *
   * @param data - Updated client data with ID
   * @returns Updated client
   */
  updateClient: async (data: UpdateClientData): Promise<ApiResponse<Client>> => {
    const { id, ...updateData } = data;
    return apiClient.patch<Client>(`/api/clients/${id}`, updateData);
  },

  /**
   * Delete client
   *
   * @param clientId - Client ID
   * @returns Success response
   */
  deleteClient: async (clientId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/api/clients/${clientId}`);
  },

  /**
   * Get client services
   *
   * @param clientId - Client ID
   * @returns Client services
   */
  getClientServices: async (clientId: string): Promise<ApiResponse<any[]>> => {
    return apiClient.get<any[]>(`/api/clients/${clientId}/services`);
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
};
