/**
 * Conversations API endpoints
 * @module lib/api/endpoints/conversations
 */

import { apiClient } from '../client';
import {
  Conversation,
  Message,
  ApiResponse,
  ConversationsQuery,
  CreateConversationData,
  CreateMessageData,
  PaginationParams,
} from '../types';

/**
 * Conversations API methods
 *
 * @example
 * ```typescript
 * import { conversationsApi } from '@/lib/api/endpoints';
 *
 * // Get conversations for a client
 * const response = await conversationsApi.getConversations({ clientId: 'abc123' });
 *
 * // Create new conversation
 * const newConvo = await conversationsApi.createConversation({
 *   clientId: 'abc123',
 *   subject: 'Project Discussion'
 * });
 * ```
 */
export const conversationsApi = {
  /**
   * Get all conversations with optional filters
   *
   * @param params - Query parameters (clientId, status, pagination)
   * @returns List of conversations
   */
  getConversations: async (
    params?: ConversationsQuery
  ): Promise<ApiResponse<Conversation[]>> => {
    return apiClient.get<Conversation[]>('/api/conversations', params);
  },

  /**
   * Get single conversation by ID
   *
   * @param conversationId - Conversation ID
   * @returns Conversation details with messages
   */
  getConversation: async (
    conversationId: string
  ): Promise<ApiResponse<Conversation>> => {
    return apiClient.get<Conversation>(`/api/conversations/${conversationId}`);
  },

  /**
   * Create new conversation
   *
   * @param data - Conversation data
   * @returns Created conversation
   */
  createConversation: async (
    data: CreateConversationData
  ): Promise<ApiResponse<Conversation>> => {
    return apiClient.post<Conversation>('/api/conversations', data);
  },

  /**
   * Update existing conversation
   *
   * @param conversationId - Conversation ID
   * @param data - Updated data
   * @returns Updated conversation
   */
  updateConversation: async (
    conversationId: string,
    data: Partial<Conversation>
  ): Promise<ApiResponse<Conversation>> => {
    return apiClient.patch<Conversation>(
      `/api/conversations/${conversationId}`,
      data
    );
  },

  /**
   * Delete conversation
   *
   * @param conversationId - Conversation ID
   * @returns Success response
   */
  deleteConversation: async (
    conversationId: string
  ): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/api/conversations/${conversationId}`);
  },

  /**
   * Get messages for a conversation
   *
   * @param conversationId - Conversation ID
   * @param params - Pagination parameters
   * @returns List of messages
   */
  getMessages: async (
    conversationId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<Message[]>> => {
    return apiClient.get<Message[]>(
      `/api/conversations/${conversationId}/messages`,
      params
    );
  },

  /**
   * Send message to conversation
   *
   * @param conversationId - Conversation ID
   * @param data - Message data
   * @returns Created message
   */
  sendMessage: async (
    conversationId: string,
    data: CreateMessageData
  ): Promise<ApiResponse<Message>> => {
    return apiClient.post<Message>(
      `/api/conversations/${conversationId}/messages`,
      data
    );
  },

  /**
   * Upload conversation file/messages
   *
   * @param file - File data or messages to upload
   * @returns Upload result
   */
  uploadConversation: async (file: any): Promise<ApiResponse<any>> => {
    return apiClient.post<any>('/api/conversations/upload', file);
  },
};
