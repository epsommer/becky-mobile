/**
 * AI API endpoints for draft generation and context analysis
 * @module lib/api/endpoints/ai
 */

import { apiClient } from '../client';
import { ApiResponse } from '../types';

/**
 * Message tone options for AI drafts
 */
export type MessageTone = 'professional' | 'friendly' | 'formal' | 'casual';

/**
 * Message type options for AI drafts
 */
export type MessageType = 'response' | 'follow-up' | 'inquiry' | 'thank-you' | 'reminder' | 'meeting-confirmation' | 'general-outreach';

/**
 * Context analysis request types
 */
export type ContextRequestType = 'draft-response' | 'generate-summary' | 'suggest-followup' | 'analyze-sentiment';

/**
 * Conversation message format for AI processing
 */
export interface ConversationMessage {
  role: 'CLIENT' | 'YOU' | 'client' | 'you';
  content: string;
  timestamp?: string;
  id?: string;
  metadata?: {
    subject?: string;
    [key: string]: any;
  };
}

/**
 * Client data for context analysis
 */
export interface ClientContext {
  id?: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  projectType?: string;
  status?: string;
  budget?: number;
  timeline?: string;
  tags?: string[];
  notes?: string;
  serviceId?: string;
  serviceTypes?: string[];
}

/**
 * Draft message request payload
 */
export interface DraftMessageRequest {
  conversationContext: ConversationMessage[];
  clientName: string;
  messageType?: MessageType;
  tone?: MessageTone;
  specificInstructions?: string;
  selectedMessageId?: string;
}

/**
 * Draft message response
 */
export interface DraftMessageResponse {
  success: boolean;
  draftedMessage?: string;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Context analysis request payload
 */
export interface AnalyzeContextRequest {
  clientData: ClientContext;
  conversations: Array<{
    id: string;
    messages: ConversationMessage[];
  }>;
  requestType: ContextRequestType;
}

/**
 * Context analysis response
 */
export interface AnalyzeContextResponse {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * AI API service for draft generation and context analysis
 */
export const aiApi = {
  /**
   * Generate a draft message using the backend AI service
   *
   * @param request - Draft message request parameters
   * @returns Promise with the generated draft or error
   *
   * @example
   * ```typescript
   * const response = await aiApi.generateDraft({
   *   conversationContext: messages,
   *   clientName: 'John Doe',
   *   messageType: 'follow-up',
   *   tone: 'professional',
   * });
   *
   * if (response.success && response.data?.draftedMessage) {
   *   setDraft(response.data.draftedMessage);
   * }
   * ```
   */
  generateDraft: async (
    request: DraftMessageRequest
  ): Promise<ApiResponse<DraftMessageResponse>> => {
    try {
      const response = await apiClient.post<DraftMessageResponse>(
        '/api/ai/draft-message',
        request
      );

      return response;
    } catch (error) {
      console.error('[aiApi] Draft generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate draft',
      };
    }
  },

  /**
   * Analyze client context for insights, summaries, or follow-up suggestions
   *
   * @param request - Context analysis request parameters
   * @returns Promise with the analysis result or error
   *
   * @example
   * ```typescript
   * const response = await aiApi.analyzeContext({
   *   clientData: client,
   *   conversations: clientConversations,
   *   requestType: 'suggest-followup',
   * });
   *
   * if (response.success) {
   *   setSuggestions(response.data);
   * }
   * ```
   */
  analyzeContext: async (
    request: AnalyzeContextRequest
  ): Promise<ApiResponse<AnalyzeContextResponse>> => {
    try {
      const response = await apiClient.post<AnalyzeContextResponse>(
        '/api/ai/analyze-context',
        request
      );

      return response;
    } catch (error) {
      console.error('[aiApi] Context analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze context',
      };
    }
  },

  /**
   * Generate a quick reply based on the last message
   * Convenience method that wraps generateDraft with minimal context
   *
   * @param lastMessage - The last client message to reply to
   * @param clientName - Name of the client
   * @param tone - Optional tone for the reply (default: 'professional')
   * @returns Promise with the generated reply or error
   */
  generateQuickReply: async (
    lastMessage: string,
    clientName: string,
    tone: MessageTone = 'professional'
  ): Promise<ApiResponse<DraftMessageResponse>> => {
    return aiApi.generateDraft({
      conversationContext: [
        { role: 'CLIENT', content: lastMessage },
      ],
      clientName,
      messageType: 'response',
      tone,
    });
  },
};
