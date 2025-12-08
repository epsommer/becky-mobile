import { ConversationKeywordTrigger } from '../components/PreferencesModal';

export interface KeywordMatch {
  triggerId: string;
  triggerName: string;
  matchedKeywords: string[];
  confidence: number;
  action: 'auto-draft-receipt' | 'auto-draft-invoice' | 'auto-draft-reply' | 'flag-for-review';
  serviceType?: string;
  amount?: number;
  context: {
    messageIndex: number;
    messageContent: string;
    surroundingContext: string;
  };
}

export interface ConversationAnalysisResult {
  messageId: string;
  matches: KeywordMatch[];
  overallConfidence: number;
  suggestedActions: {
    action: string;
    confidence: number;
    trigger: ConversationKeywordTrigger;
  }[];
}

export class ConversationKeywordDetector {
  private triggers: ConversationKeywordTrigger[];
  private language: 'en' | 'es' | 'fr' | 'auto';
  private enabled: boolean;

  constructor(
    triggers: ConversationKeywordTrigger[] = [],
    language: 'en' | 'es' | 'fr' | 'auto' = 'auto',
    enabled: boolean = true
  ) {
    this.triggers = triggers.filter(t => t.enabled);
    this.language = language;
    this.enabled = enabled;
  }

  /**
   * Analyze a message for keyword matches
   */
  analyzeMessage(
    messageId: string,
    messageContent: string,
    messageIndex: number,
    allMessages: string[] = [],
    confidenceThreshold: 'low' | 'medium' | 'high' = 'medium'
  ): ConversationAnalysisResult {
    if (!this.enabled || this.triggers.length === 0) {
      return {
        messageId,
        matches: [],
        overallConfidence: 0,
        suggestedActions: []
      };
    }

    const matches: KeywordMatch[] = [];
    const threshold = this.getConfidenceThreshold(confidenceThreshold);
    
    // Get surrounding context for better analysis
    const contextWindow = this.getSurroundingContext(messageIndex, allMessages);

    for (const trigger of this.triggers) {
      const match = this.checkTriggerMatch(
        trigger,
        messageContent,
        messageIndex,
        contextWindow
      );

      if (match && match.confidence >= threshold) {
        matches.push(match);
      }
    }

    // Sort matches by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);

    // Generate suggested actions based on matches
    const suggestedActions = this.generateSuggestedActions(matches);

    // Calculate overall confidence
    const overallConfidence = matches.length > 0 
      ? matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length
      : 0;

    return {
      messageId,
      matches,
      overallConfidence,
      suggestedActions
    };
  }

  /**
   * Analyze multiple messages in a conversation
   */
  analyzeConversation(
    messages: { id: string; content: string }[],
    confidenceThreshold: 'low' | 'medium' | 'high' = 'medium'
  ): ConversationAnalysisResult[] {
    const messageContents = messages.map(m => m.content);
    
    return messages.map((message, index) =>
      this.analyzeMessage(
        message.id,
        message.content,
        index,
        messageContents,
        confidenceThreshold
      )
    );
  }

  /**
   * Check if a trigger matches the message content
   */
  private checkTriggerMatch(
    trigger: ConversationKeywordTrigger,
    messageContent: string,
    messageIndex: number,
    contextWindow: string
  ): KeywordMatch | null {
    if (!trigger.enabled || trigger.keywords.length === 0) {
      return null;
    }

    const matchedKeywords: string[] = [];
    let baseConfidence = 0;

    // Normalize text for matching (handle different languages)
    const normalizedContent = this.normalizeText(messageContent);
    const normalizedContext = this.normalizeText(contextWindow);

    // Check each keyword/phrase
    for (const keyword of trigger.keywords) {
      const normalizedKeyword = this.normalizeText(keyword);
      
      // Check for exact phrase matches (higher confidence)
      if (normalizedContent.includes(normalizedKeyword)) {
        matchedKeywords.push(keyword);
        baseConfidence += keyword.split(' ').length > 1 ? 0.3 : 0.2; // Phrases get higher score
      }
      // Check for partial matches in context
      else if (normalizedContext.includes(normalizedKeyword)) {
        matchedKeywords.push(keyword);
        baseConfidence += 0.1; // Context matches get lower score
      }
      // Check for word boundaries (more precise matching)
      else if (this.wordBoundaryMatch(normalizedContent, normalizedKeyword)) {
        matchedKeywords.push(keyword);
        baseConfidence += 0.25;
      }
    }

    if (matchedKeywords.length === 0) {
      return null;
    }

    // Calculate final confidence score
    const keywordMatchRatio = matchedKeywords.length / trigger.keywords.length;
    const finalConfidence = Math.min(1.0, 
      (baseConfidence * keywordMatchRatio * trigger.confidence) + 
      this.getLanguageBonus(normalizedContent)
    );

    return {
      triggerId: trigger.id,
      triggerName: trigger.name,
      matchedKeywords,
      confidence: finalConfidence,
      action: trigger.action,
      serviceType: trigger.serviceType,
      amount: trigger.amount,
      context: {
        messageIndex,
        messageContent,
        surroundingContext: contextWindow
      }
    };
  }

  /**
   * Generate suggested actions based on matches
   */
  private generateSuggestedActions(matches: KeywordMatch[]) {
    const actionGroups = new Map<string, KeywordMatch[]>();
    
    // Group matches by action type
    matches.forEach(match => {
      const action = match.action;
      if (!actionGroups.has(action)) {
        actionGroups.set(action, []);
      }
      actionGroups.get(action)!.push(match);
    });

    const suggestions = [];
    
    for (const [action, actionMatches] of actionGroups) {
      const avgConfidence = actionMatches.reduce((sum, m) => sum + m.confidence, 0) / actionMatches.length;
      const topMatch = actionMatches[0]; // Highest confidence match

      suggestions.push({
        action,
        confidence: avgConfidence,
        trigger: {
          id: topMatch.triggerId,
          name: topMatch.triggerName,
          keywords: topMatch.matchedKeywords,
          action: topMatch.action,
          confidence: topMatch.confidence,
          enabled: true,
          serviceType: topMatch.serviceType,
          amount: topMatch.amount
        }
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get surrounding context for a message
   */
  private getSurroundingContext(messageIndex: number, allMessages: string[]): string {
    const contextSize = 2; // Messages before and after
    const start = Math.max(0, messageIndex - contextSize);
    const end = Math.min(allMessages.length, messageIndex + contextSize + 1);
    
    return allMessages.slice(start, end).join(' ').substring(0, 500); // Limit context size
  }

  /**
   * Normalize text for better matching across languages
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\u00C0-\u017F]/g, ' ') // Keep accented characters for Spanish/French
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check for word boundary matches to avoid partial word matches
   */
  private wordBoundaryMatch(text: string, keyword: string): boolean {
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(text);
  }

  /**
   * Get confidence threshold based on setting
   */
  private getConfidenceThreshold(threshold: 'low' | 'medium' | 'high'): number {
    switch (threshold) {
      case 'low': return 0.3;
      case 'medium': return 0.5;
      case 'high': return 0.7;
      default: return 0.5;
    }
  }

  /**
   * Get language-specific bonus for more accurate detection
   */
  private getLanguageBonus(text: string): number {
    if (this.language === 'auto') {
      // Simple language detection bonus
      const spanishWords = ['el', 'la', 'es', 'en', 'de', 'y', 'que', 'por'];
      const frenchWords = ['le', 'la', 'est', 'de', 'et', 'dans', 'pour', 'que'];
      
      const words = text.split(' ');
      const spanishCount = words.filter(w => spanishWords.includes(w.toLowerCase())).length;
      const frenchCount = words.filter(w => frenchWords.includes(w.toLowerCase())).length;
      
      if (spanishCount > 0 || frenchCount > 0) {
        return 0.05; // Small bonus for detected language patterns
      }
    }
    
    return 0;
  }

  /**
   * Update the detector configuration
   */
  updateConfig(
    triggers: ConversationKeywordTrigger[],
    language: 'en' | 'es' | 'fr' | 'auto' = 'auto',
    enabled: boolean = true
  ): void {
    this.triggers = triggers.filter(t => t.enabled);
    this.language = language;
    this.enabled = enabled;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      triggers: this.triggers,
      language: this.language,
      enabled: this.enabled
    };
  }

  /**
   * Test a trigger against sample text (useful for configuration)
   */
  testTrigger(trigger: ConversationKeywordTrigger, sampleText: string): KeywordMatch | null {
    return this.checkTriggerMatch(trigger, sampleText, 0, sampleText);
  }
}

// Singleton instance for global use
export const keywordDetector = new ConversationKeywordDetector();

// Helper function to initialize from preferences
export function initializeKeywordDetectorFromPreferences(preferences: any): void {
  if (preferences.conversations) {
    keywordDetector.updateConfig(
      preferences.conversations.keywordTriggers || [],
      preferences.conversations.parsingLanguage || 'auto',
      preferences.conversations.enableKeywordDetection !== false
    );
  }
}