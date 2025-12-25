/**
 * AI Draft Service for generating message drafts using Claude API
 */
import { ANTHROPIC_API_KEY } from '@env';

const API_KEY = ANTHROPIC_API_KEY || '';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export type MessageTone = 'professional' | 'friendly' | 'formal' | 'casual';
export type MessageType = 'response' | 'follow-up' | 'inquiry' | 'thank-you' | 'reminder' | 'meeting-confirmation' | 'general-outreach';
export type ContextMode = 'full' | 'specific' | 'new';

export interface ConversationMessage {
  role: 'CLIENT' | 'YOU' | 'client' | 'you';
  content: string;
  timestamp?: string;
  id?: string;
}

export interface DraftRequest {
  conversationContext: ConversationMessage[];
  clientName: string;
  messageType?: MessageType;
  tone?: MessageTone;
  specificInstructions?: string;
  selectedMessageId?: string;
}

export interface DraftResponse {
  success: boolean;
  draftedMessage?: string;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class AIDraftService {
  /**
   * Check if the API is configured and available
   */
  static isConfigured(): boolean {
    return !!API_KEY && API_KEY.startsWith('sk-ant');
  }

  /**
   * Test the API connection
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      if (response.ok) {
        return { success: true };
      }

      const errorData = await response.json();
      return { success: false, error: errorData.error?.message || 'API request failed' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Build conversation context for the AI
   */
  private static buildContext(
    messages: ConversationMessage[],
    selectedMessageId?: string
  ): { role: 'user' | 'assistant'; content: string }[] {
    if (selectedMessageId) {
      // Find selected message and include 3 messages before it
      const msgIndex = messages.findIndex(m => m.id === selectedMessageId);
      if (msgIndex !== -1) {
        const startIdx = Math.max(0, msgIndex - 3);
        const endIdx = msgIndex + 1;
        const contextMessages = messages.slice(startIdx, endIdx);

        return contextMessages.map(msg => ({
          role: (msg.role === 'YOU' || msg.role === 'you') ? 'assistant' as const : 'user' as const,
          content: msg.content,
        }));
      }
    }

    // Use full conversation context (last 10 messages)
    const recentMessages = messages.slice(-10);
    return recentMessages.map(msg => ({
      role: (msg.role === 'YOU' || msg.role === 'you') ? 'assistant' as const : 'user' as const,
      content: msg.content,
    }));
  }

  /**
   * Generate a draft message using Claude AI
   */
  static async generateDraft(request: DraftRequest): Promise<DraftResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Anthropic API key is not configured',
      };
    }

    const {
      conversationContext,
      clientName,
      messageType = 'response',
      tone = 'professional',
      specificInstructions,
      selectedMessageId,
    } = request;

    try {
      const context = this.buildContext(conversationContext, selectedMessageId);

      if (context.length === 0) {
        return {
          success: false,
          error: 'No conversation context available',
        };
      }

      const systemPrompt = `You are an AI assistant helping to draft professional business messages for a service provider. Generate clear, concise, and ${tone} messages based on the conversation context provided. The client's name is ${clientName}.`;

      const contextFormatted = context
        .map(msg => `[${msg.role === 'user' ? 'Client' : 'You'}]: ${msg.content}`)
        .join('\n\n');

      const userPrompt = `Based on the following conversation with ${clientName}, please draft a ${tone} ${messageType} message.

Conversation history:
${contextFormatted}

${specificInstructions ? `\nSpecific instructions: ${specificInstructions}` : ''}

Please draft an appropriate message that:
1. Addresses any questions or concerns raised
2. Maintains a ${tone} tone
3. Is clear and actionable
4. Is concise but complete

Return ONLY the drafted message text, without any preamble or explanation.`;

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error?.message || `API error: ${response.status}`,
        };
      }

      const data = await response.json();
      const draftedMessage = data.content?.[0]?.text;

      if (!draftedMessage) {
        return {
          success: false,
          error: 'No message generated',
        };
      }

      return {
        success: true,
        draftedMessage,
        usage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
        },
      };
    } catch (error) {
      console.error('[AIDraftService] Draft generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate draft',
      };
    }
  }

  /**
   * Generate a quick reply suggestion based on the last client message
   */
  static async generateQuickReply(
    lastClientMessage: string,
    clientName: string,
    tone: MessageTone = 'professional'
  ): Promise<DraftResponse> {
    return this.generateDraft({
      conversationContext: [{ role: 'CLIENT', content: lastClientMessage }],
      clientName,
      messageType: 'response',
      tone,
    });
  }
}
