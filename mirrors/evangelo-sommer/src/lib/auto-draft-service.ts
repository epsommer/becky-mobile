import { ConversationAnalysisResult, KeywordMatch } from './conversation-keyword-detector';
import { BillingSuggestion } from '../types/billing';

export interface AutoDraftContext {
  messageId: string;
  messageContent: string;
  clientId?: string;
  conversationId?: string;
  keywordMatches: KeywordMatch[];
  confidence: number;
}

export interface AutoDraftResult {
  type: 'receipt' | 'invoice' | 'reply';
  content: string;
  confidence: number;
  suggestedAmount?: number;
  serviceType?: string;
  requiresApproval: boolean;
  metadata: {
    triggeredBy: string[];
    generatedAt: string;
    version: string;
  };
}

export interface AutoDraftSettings {
  generateReceipts: boolean;
  generateInvoices: boolean;
  generateReplies: boolean;
  requireApproval: boolean;
  confidenceThreshold: 'low' | 'medium' | 'high';
}

export class AutoDraftService {
  private settings: AutoDraftSettings;

  constructor(settings: AutoDraftSettings) {
    this.settings = settings;
  }

  /**
   * Generate auto-drafts based on conversation analysis
   */
  async generateAutoDrafts(
    analysis: ConversationAnalysisResult,
    context: Partial<AutoDraftContext> = {}
  ): Promise<AutoDraftResult[]> {
    if (analysis.matches.length === 0) {
      return [];
    }

    const results: AutoDraftResult[] = [];

    for (const suggestion of analysis.suggestedActions) {
      if (!this.shouldGenerateAction(suggestion.action, suggestion.confidence)) {
        continue;
      }

      try {
        const result = await this.generateDraftForAction(
          suggestion.action,
          analysis,
          context,
          suggestion.confidence
        );

        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Error generating ${suggestion.action}:`, error);
      }
    }

    return results;
  }

  /**
   * Generate a specific type of draft
   */
  private async generateDraftForAction(
    action: string,
    analysis: ConversationAnalysisResult,
    context: Partial<AutoDraftContext>,
    confidence: number
  ): Promise<AutoDraftResult | null> {
    const baseMetadata = {
      triggeredBy: analysis.matches.map(m => m.triggerName),
      generatedAt: new Date().toISOString(),
      version: '1.0'
    };

    switch (action) {
      case 'auto-draft-receipt':
        if (!this.settings.generateReceipts) return null;
        return await this.generateReceipt(analysis, context, confidence, baseMetadata);

      case 'auto-draft-invoice':
        if (!this.settings.generateInvoices) return null;
        return await this.generateInvoice(analysis, context, confidence, baseMetadata);

      case 'auto-draft-reply':
        if (!this.settings.generateReplies) return null;
        return await this.generateReply(analysis, context, confidence, baseMetadata);

      default:
        return null;
    }
  }

  /**
   * Generate a receipt draft
   */
  private async generateReceipt(
    analysis: ConversationAnalysisResult,
    context: Partial<AutoDraftContext>,
    confidence: number,
    metadata: any
  ): Promise<AutoDraftResult> {
    // Find the most relevant match for receipt generation
    const receiptMatch = analysis.matches.find(m => m.action === 'auto-draft-receipt');
    
    // Extract service information from the matches
    const serviceType = receiptMatch?.serviceType || this.extractServiceType(analysis);
    const suggestedAmount = receiptMatch?.amount || this.extractAmount(analysis);

    // Generate receipt content based on conversation context
    const content = this.generateReceiptContent({
      serviceType,
      amount: suggestedAmount,
      messageContent: context.messageContent || '',
      clientId: context.clientId,
      keywordMatches: analysis.matches
    });

    return {
      type: 'receipt',
      content,
      confidence,
      suggestedAmount,
      serviceType,
      requiresApproval: this.settings.requireApproval || confidence < 0.8,
      metadata
    };
  }

  /**
   * Generate an invoice draft
   */
  private async generateInvoice(
    analysis: ConversationAnalysisResult,
    context: Partial<AutoDraftContext>,
    confidence: number,
    metadata: any
  ): Promise<AutoDraftResult> {
    const invoiceMatch = analysis.matches.find(m => m.action === 'auto-draft-invoice');
    
    const serviceType = invoiceMatch?.serviceType || this.extractServiceType(analysis);
    const suggestedAmount = invoiceMatch?.amount || this.extractAmount(analysis);

    const content = this.generateInvoiceContent({
      serviceType,
      amount: suggestedAmount,
      messageContent: context.messageContent || '',
      clientId: context.clientId,
      keywordMatches: analysis.matches
    });

    return {
      type: 'invoice',
      content,
      confidence,
      suggestedAmount,
      serviceType,
      requiresApproval: this.settings.requireApproval || confidence < 0.7,
      metadata
    };
  }

  /**
   * Generate a reply draft
   */
  private async generateReply(
    analysis: ConversationAnalysisResult,
    context: Partial<AutoDraftContext>,
    confidence: number,
    metadata: any
  ): Promise<AutoDraftResult> {
    const content = await this.generateReplyContent({
      messageContent: context.messageContent || '',
      keywordMatches: analysis.matches,
      conversationContext: context
    });

    return {
      type: 'reply',
      content,
      confidence,
      requiresApproval: true, // Replies always require approval
      metadata
    };
  }

  /**
   * Generate receipt content
   */
  private generateReceiptContent(params: {
    serviceType?: string;
    amount?: number;
    messageContent: string;
    clientId?: string;
    keywordMatches: KeywordMatch[];
  }): string {
    const { serviceType, amount, messageContent, keywordMatches } = params;
    
    // Extract key information from the message
    const date = new Date().toLocaleDateString();
    const service = serviceType || 'Service Provided';
    const matchedKeywords = keywordMatches.flatMap(m => m.matchedKeywords).join(', ');

    return `RECEIPT

Date: ${date}
Service: ${service}
${amount ? `Amount: $${amount}` : 'Amount: [TO BE DETERMINED]'}

Description:
Based on conversation indicating completion of ${service.toLowerCase()}.
Keywords detected: ${matchedKeywords}

Original message context:
"${messageContent.substring(0, 200)}${messageContent.length > 200 ? '...' : ''}"

Thank you for your business!

---
Auto-generated receipt based on conversation analysis.
Please review and modify as needed.`;
  }

  /**
   * Generate invoice content
   */
  private generateInvoiceContent(params: {
    serviceType?: string;
    amount?: number;
    messageContent: string;
    clientId?: string;
    keywordMatches: KeywordMatch[];
  }): string {
    const { serviceType, amount, messageContent, keywordMatches } = params;
    
    const date = new Date().toLocaleDateString();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    
    const service = serviceType || 'Professional Services';
    const matchedKeywords = keywordMatches.flatMap(m => m.matchedKeywords).join(', ');

    return `INVOICE

Invoice Date: ${date}
Due Date: ${dueDate.toLocaleDateString()}

Services Provided:
${service}
${amount ? `Amount: $${amount}` : 'Amount: [TO BE DETERMINED]'}

Details:
Request for payment detected in conversation.
Keywords detected: ${matchedKeywords}

Message context:
"${messageContent.substring(0, 200)}${messageContent.length > 200 ? '...' : ''}"

Payment Instructions:
[ADD PAYMENT INSTRUCTIONS]

---
Auto-generated invoice based on conversation analysis.
Please review and complete before sending.`;
  }

  /**
   * Generate reply content using AI or templates
   */
  private async generateReplyContent(params: {
    messageContent: string;
    keywordMatches: KeywordMatch[];
    conversationContext: Partial<AutoDraftContext>;
  }): Promise<string> {
    const { messageContent, keywordMatches } = params;
    
    // For now, generate template-based replies
    // In a real implementation, this would call an AI service
    
    const hasThankYou = keywordMatches.some(m => 
      m.matchedKeywords.some(k => k.toLowerCase().includes('thank'))
    );
    
    const hasQuestion = messageContent.includes('?') || 
      keywordMatches.some(m => m.matchedKeywords.includes('question'));

    if (hasThankYou) {
      return `Thank you for your message! I'm glad I could help. 

If you need anything else, please don't hesitate to reach out.

Best regards`;
    }

    if (hasQuestion) {
      return `Thank you for your question. 

[PLEASE REVIEW AND PROVIDE SPECIFIC ANSWER]

Let me know if you need any additional information.

Best regards`;
    }

    return `Thank you for your message. I'll get back to you shortly with more information.

Best regards

---
Auto-generated response based on conversation analysis.
Please personalize before sending.`;
  }

  /**
   * Extract service type from analysis
   */
  private extractServiceType(analysis: ConversationAnalysisResult): string | undefined {
    // Look for service type in matches
    for (const match of analysis.matches) {
      if (match.serviceType) {
        return match.serviceType;
      }
    }
    
    // Try to infer from keywords
    const allKeywords = analysis.matches.flatMap(m => m.matchedKeywords).join(' ').toLowerCase();
    
    if (allKeywords.includes('landscaping') || allKeywords.includes('lawn') || allKeywords.includes('garden')) {
      return 'landscaping';
    }
    if (allKeywords.includes('snow') || allKeywords.includes('winter')) {
      return 'snow removal';
    }
    if (allKeywords.includes('pet') || allKeywords.includes('dog') || allKeywords.includes('walk')) {
      return 'pet services';
    }
    if (allKeywords.includes('creative') || allKeywords.includes('design') || allKeywords.includes('development')) {
      return 'creative development';
    }
    
    return undefined;
  }

  /**
   * Extract monetary amount from analysis
   */
  private extractAmount(analysis: ConversationAnalysisResult): number | undefined {
    // Look for amount in matches first
    for (const match of analysis.matches) {
      if (match.amount) {
        return match.amount;
      }
    }
    
    // Try to extract from message content
    const messageContent = analysis.matches[0]?.context.messageContent || '';
    const amountMatch = messageContent.match(/\$(\d+(?:\.\d{2})?)/);
    
    if (amountMatch) {
      return parseFloat(amountMatch[1]);
    }
    
    return undefined;
  }

  /**
   * Check if we should generate a specific action
   */
  private shouldGenerateAction(action: string, confidence: number): boolean {
    const threshold = this.getConfidenceThreshold();
    
    if (confidence < threshold) {
      return false;
    }

    switch (action) {
      case 'auto-draft-receipt':
        return this.settings.generateReceipts;
      case 'auto-draft-invoice':
        return this.settings.generateInvoices;
      case 'auto-draft-reply':
        return this.settings.generateReplies;
      default:
        return false;
    }
  }

  /**
   * Get confidence threshold based on settings
   */
  private getConfidenceThreshold(): number {
    switch (this.settings.confidenceThreshold) {
      case 'low': return 0.3;
      case 'medium': return 0.5;
      case 'high': return 0.7;
      default: return 0.5;
    }
  }

  /**
   * Update service settings
   */
  updateSettings(newSettings: Partial<AutoDraftSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get current settings
   */
  getSettings(): AutoDraftSettings {
    return { ...this.settings };
  }

  /**
   * Convert auto-draft result to billing suggestion for existing components
   */
  static toBillingSuggestion(result: AutoDraftResult): BillingSuggestion {
    let confidence: 'low' | 'medium' | 'high' = 'medium';
    
    if (result.confidence >= 0.7) confidence = 'high';
    else if (result.confidence < 0.5) confidence = 'low';

    return {
      type: 'none',
      confidence,
      serviceType: result.serviceType || 'general',
      suggestedAmount: result.suggestedAmount || 0,
      reason: `Generated by auto-draft service based on ${result.metadata.triggeredBy.join(', ')}`
    };
  }
}

// Default auto-draft service instance
export const autoDraftService = new AutoDraftService({
  generateReceipts: true,
  generateInvoices: true,
  generateReplies: false,
  requireApproval: true,
  confidenceThreshold: 'medium'
});

// Helper function to initialize from preferences
export function initializeAutoDraftServiceFromPreferences(preferences: any): void {
  if (preferences.conversations?.autoDraftSettings) {
    autoDraftService.updateSettings({
      ...preferences.conversations.autoDraftSettings,
      confidenceThreshold: preferences.conversations.autoDraftConfidenceThreshold
    });
  }
}