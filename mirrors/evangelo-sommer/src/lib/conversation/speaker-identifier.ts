/**
 * Smart Speaker Identification System
 * 
 * Advanced speaker identification for SMS/conversation processing that handles:
 * - "Me", "You" and contact name variations
 * - Phone number patterns and formatting variations  
 * - Ambiguous sender fields and missing data
 * - Message direction inference from content and context
 * - Machine learning-style confidence scoring
 */

export interface SpeakerProfile {
  userId: string;
  clientId: string;
  userIdentifiers: string[];
  clientIdentifiers: string[];
  phonePatterns: string[];
  emailPatterns: string[];
  contextualHints: ContextualHint[];
}

export interface ContextualHint {
  type: 'phrase' | 'vocabulary' | 'style' | 'timing' | 'length';
  pattern: string | RegExp;
  role: 'you' | 'client';
  confidence: number;
  description: string;
}

export interface IdentificationResult {
  role: 'you' | 'client';
  confidence: number;
  evidence: IdentificationEvidence[];
  reasoning: string;
  fallbackUsed: boolean;
}

export interface IdentificationEvidence {
  type: 'explicit' | 'contextual' | 'pattern' | 'inference' | 'statistical';
  source: string;
  value: string;
  confidence: number;
  weight: number;
}

export class SpeakerIdentifier {
  private profile: SpeakerProfile;
  
  // Built-in patterns for common scenarios
  private readonly defaultUserIdentifiers = [
    'you', 'me', 'myself', 'i', 'evan', 'evangelo', 'sommer'
  ];
  
  private readonly defaultClientIdentifiers = [
    'mark', 'levy', 'client', 'customer'
  ];

  private readonly phonePatterns = [
    /^\+?1?[-.\s]?\(?(\d{3})\)?[-.\s]*(\d{3})[-.\s]*(\d{4})$/,
    /^(\d{10})$/,
    /^(\d{3})[-.\s](\d{3})[-.\s](\d{4})$/,
    /^\+1\s?\d{10}$/,
    /^\(\d{3}\)\s?\d{3}-?\d{4}$/
  ];

  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Contextual analysis patterns
  private readonly contextualPatterns: ContextualHint[] = [
    {
      type: 'phrase',
      pattern: /\b(thank you|thanks|please|sorry|excuse me)\b/i,
      role: 'client',
      confidence: 0.6,
      description: 'Polite language often indicates client'
    },
    {
      type: 'phrase', 
      pattern: /\b(got it|will do|on it|no problem|sounds good)\b/i,
      role: 'you',
      confidence: 0.7,
      description: 'Confirmatory language often indicates service provider'
    },
    {
      type: 'vocabulary',
      pattern: /\b(service|quote|estimate|schedule|appointment)\b/i,
      role: 'client',
      confidence: 0.5,
      description: 'Service-related vocabulary from client perspective'
    },
    {
      type: 'vocabulary',
      pattern: /\b(completed|finished|done|invoice|bill)\b/i,
      role: 'you',
      confidence: 0.6,
      description: 'Completion and billing language from provider'
    },
    {
      type: 'style',
      pattern: /^[A-Z][a-z]/, // Sentence case
      role: 'client',
      confidence: 0.3,
      description: 'Formal capitalization suggests client'
    },
    {
      type: 'style',
      pattern: /^[a-z]/, // Lowercase start
      role: 'you',
      confidence: 0.3,
      description: 'Casual capitalization suggests provider'
    }
  ];

  constructor(profile?: Partial<SpeakerProfile>) {
    this.profile = {
      userId: profile?.userId || 'default-user',
      clientId: profile?.clientId || 'default-client', 
      userIdentifiers: profile?.userIdentifiers || this.defaultUserIdentifiers,
      clientIdentifiers: profile?.clientIdentifiers || this.defaultClientIdentifiers,
      phonePatterns: profile?.phonePatterns || [],
      emailPatterns: profile?.emailPatterns || [],
      contextualHints: profile?.contextualHints || this.contextualPatterns
    };
  }

  /**
   * Primary identification method - handles all forms of speaker identification
   */
  identifySpeaker(
    sender: string, 
    messageType: string, 
    messageContent?: string,
    context?: {
      previousMessages?: Array<{role: 'you' | 'client', content: string}>;
      conversationMetadata?: Record<string, any>;
    }
  ): IdentificationResult {
    console.log('🔍 Identifying speaker:', { sender, messageType, hasContent: !!messageContent });

    const evidence: IdentificationEvidence[] = [];
    let totalConfidence = 0;
    let totalWeight = 0;

    // 1. Explicit message type identification (highest priority)
    const typeEvidence = this.analyzeMessageType(messageType);
    if (typeEvidence) {
      evidence.push(typeEvidence);
      totalConfidence += typeEvidence.confidence * typeEvidence.weight;
      totalWeight += typeEvidence.weight;
    }

    // 2. Explicit sender name identification
    const nameEvidence = this.analyzeSenderName(sender);
    if (nameEvidence) {
      evidence.push(nameEvidence);
      totalConfidence += nameEvidence.confidence * nameEvidence.weight;
      totalWeight += nameEvidence.weight;
    }

    // 3. Contact pattern identification (phone/email)
    const contactEvidence = this.analyzeContactPattern(sender);
    if (contactEvidence) {
      evidence.push(contactEvidence);
      totalConfidence += contactEvidence.confidence * contactEvidence.weight;
      totalWeight += contactEvidence.weight;
    }

    // 4. Content-based contextual analysis
    if (messageContent) {
      const contentEvidence = this.analyzeMessageContent(messageContent);
      contentEvidence.forEach(ev => {
        evidence.push(ev);
        totalConfidence += ev.confidence * ev.weight;
        totalWeight += ev.weight;
      });
    }

    // 5. Conversational context analysis
    if (context?.previousMessages) {
      const contextEvidence = this.analyzeConversationContext(context.previousMessages);
      if (contextEvidence) {
        evidence.push(contextEvidence);
        totalConfidence += contextEvidence.confidence * contextEvidence.weight;
        totalWeight += contextEvidence.weight;
      }
    }

    // Calculate weighted average confidence
    const finalConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0;

    // Determine role based on evidence
    let role: 'you' | 'client' = 'client'; // Default assumption
    let reasoning = 'Default to client role';
    let fallbackUsed = true;

    if (evidence.length > 0) {
      // Calculate role based on weighted evidence
      const youEvidence = evidence.filter(ev => 
        this.getEvidenceRole(ev) === 'you'
      ).reduce((sum, ev) => sum + ev.confidence * ev.weight, 0);

      const clientEvidence = evidence.filter(ev => 
        this.getEvidenceRole(ev) === 'client'  
      ).reduce((sum, ev) => sum + ev.confidence * ev.weight, 0);

      if (youEvidence > clientEvidence) {
        role = 'you';
        reasoning = 'Evidence favors service provider role';
        fallbackUsed = false;
      } else if (clientEvidence > youEvidence) {
        role = 'client';
        reasoning = 'Evidence favors client role';
        fallbackUsed = false;
      } else {
        reasoning = 'Evidence inconclusive, using default';
      }
    }

    const result: IdentificationResult = {
      role,
      confidence: Math.max(finalConfidence, fallbackUsed ? 0.1 : 0.5),
      evidence,
      reasoning,
      fallbackUsed
    };

    console.log('🎯 Speaker identification result:', {
      role: result.role,
      confidence: Math.round(result.confidence * 100) + '%',
      evidenceCount: evidence.length,
      reasoning: result.reasoning
    });

    return result;
  }

  /**
   * Analyze message type (Sent/Received) for role identification
   */
  private analyzeMessageType(messageType: string): IdentificationEvidence | null {
    const normalizedType = messageType.toLowerCase().trim();
    
    if (normalizedType === 'sent') {
      return {
        type: 'explicit',
        source: 'message_type',
        value: messageType,
        confidence: 0.95,
        weight: 3.0
      };
    } else if (normalizedType === 'received' || normalizedType.startsWith('received')) {
      return {
        type: 'explicit', 
        source: 'message_type',
        value: messageType,
        confidence: 0.95,
        weight: 3.0
      };
    }

    return null;
  }

  /**
   * Analyze sender name for known identifiers
   */
  private analyzeSenderName(sender: string): IdentificationEvidence | null {
    if (!sender || typeof sender !== 'string') return null;

    const normalizedSender = sender.toLowerCase().trim();

    // Check user identifiers
    for (const identifier of this.profile.userIdentifiers) {
      if (normalizedSender.includes(identifier.toLowerCase())) {
        return {
          type: 'explicit',
          source: 'sender_name',
          value: `${identifier} in "${sender}"`,
          confidence: 0.9,
          weight: 2.5
        };
      }
    }

    // Check client identifiers  
    for (const identifier of this.profile.clientIdentifiers) {
      if (normalizedSender.includes(identifier.toLowerCase())) {
        return {
          type: 'explicit',
          source: 'sender_name',
          value: `${identifier} in "${sender}"`,
          confidence: 0.9,
          weight: 2.5
        };
      }
    }

    return null;
  }

  /**
   * Analyze contact patterns (phone numbers, emails)
   */
  private analyzeContactPattern(sender: string): IdentificationEvidence | null {
    if (!sender || typeof sender !== 'string') return null;

    const trimmedSender = sender.trim();

    // Check phone number patterns
    for (const phonePattern of this.phonePatterns) {
      if (phonePattern.test(trimmedSender)) {
        return {
          type: 'pattern',
          source: 'phone_number',
          value: trimmedSender,
          confidence: 0.8,
          weight: 2.0 // Phone numbers usually indicate the client
        };
      }
    }

    // Check email pattern
    if (this.emailPattern.test(trimmedSender)) {
      return {
        type: 'pattern',
        source: 'email_address', 
        value: trimmedSender,
        confidence: 0.7,
        weight: 1.5
      };
    }

    return null;
  }

  /**
   * Analyze message content for contextual clues
   */
  private analyzeMessageContent(content: string): IdentificationEvidence[] {
    if (!content || typeof content !== 'string') return [];

    const evidence: IdentificationEvidence[] = [];

    // Apply contextual hint patterns
    for (const hint of this.profile.contextualHints) {
      const pattern = typeof hint.pattern === 'string' 
        ? new RegExp(hint.pattern, 'i')
        : hint.pattern;

      if (pattern.test(content)) {
        evidence.push({
          type: 'contextual',
          source: `content_${hint.type}`,
          value: `${hint.description}: "${content.match(pattern)?.[0] || 'match'}"`,
          confidence: hint.confidence,
          weight: 1.0
        });
      }
    }

    // Message length analysis
    if (content.length > 200) {
      evidence.push({
        type: 'statistical',
        source: 'message_length',
        value: `Long message (${content.length} chars)`,
        confidence: 0.4,
        weight: 0.5
      });
    } else if (content.length < 20) {
      evidence.push({
        type: 'statistical',
        source: 'message_length', 
        value: `Short message (${content.length} chars)`,
        confidence: 0.3,
        weight: 0.3
      });
    }

    return evidence;
  }

  /**
   * Analyze conversation context for patterns
   */
  private analyzeConversationContext(
    previousMessages: Array<{role: 'you' | 'client', content: string}>
  ): IdentificationEvidence | null {
    if (!previousMessages || previousMessages.length === 0) return null;

    // Simple pattern: alternating conversation flow
    const recentMessages = previousMessages.slice(-3); // Last 3 messages
    if (recentMessages.length >= 2) {
      const lastRole = recentMessages[recentMessages.length - 1].role;
      const expectedRole = lastRole === 'you' ? 'client' : 'you';
      
      return {
        type: 'inference',
        source: 'conversation_flow',
        value: `Expected ${expectedRole} after ${lastRole}`,
        confidence: 0.6,
        weight: 1.0
      };
    }

    return null;
  }

  /**
   * Extract the implied role from evidence
   */
  private getEvidenceRole(evidence: IdentificationEvidence): 'you' | 'client' {
    switch (evidence.source) {
      case 'message_type':
        return evidence.value.toLowerCase().includes('sent') ? 'you' : 'client';
      
      case 'sender_name':
        const hasUserIdentifier = this.profile.userIdentifiers.some(id => 
          evidence.value.toLowerCase().includes(id.toLowerCase())
        );
        return hasUserIdentifier ? 'you' : 'client';
      
      case 'phone_number':
      case 'email_address':
        return 'client'; // Contact info usually represents the client
      
      default:
        // For contextual hints, check the original hint
        const hint = this.profile.contextualHints.find(h => 
          evidence.source.includes(h.type)
        );
        return hint?.role || 'client';
    }
  }

  /**
   * Update the speaker profile with new information
   */
  updateProfile(updates: Partial<SpeakerProfile>): void {
    this.profile = {
      ...this.profile,
      ...updates,
      userIdentifiers: updates.userIdentifiers || this.profile.userIdentifiers,
      clientIdentifiers: updates.clientIdentifiers || this.profile.clientIdentifiers,
      phonePatterns: updates.phonePatterns || this.profile.phonePatterns,
      emailPatterns: updates.emailPatterns || this.profile.emailPatterns,
      contextualHints: updates.contextualHints || this.profile.contextualHints
    };
  }

  /**
   * Learn from correct identifications to improve future accuracy
   */
  learnFromCorrection(
    sender: string,
    messageType: string,
    content: string,
    correctRole: 'you' | 'client',
    confidence: number = 0.8
  ): void {
    console.log('📚 Learning from correction:', { sender, correctRole, confidence });

    // Extract identifiers from the sender for future use
    const normalizedSender = sender.toLowerCase().trim();
    
    if (correctRole === 'you') {
      // Add unique parts of sender as user identifiers
      const newIdentifiers = normalizedSender.split(/\W+/).filter(word => 
        word.length > 2 && 
        !this.profile.userIdentifiers.includes(word) &&
        !this.defaultClientIdentifiers.includes(word)
      );
      this.profile.userIdentifiers.push(...newIdentifiers);
    } else {
      // Add as client identifiers
      const newIdentifiers = normalizedSender.split(/\W+/).filter(word => 
        word.length > 2 && 
        !this.profile.clientIdentifiers.includes(word) &&
        !this.defaultUserIdentifiers.includes(word)
      );
      this.profile.clientIdentifiers.push(...newIdentifiers);
    }

    console.log('✅ Updated profile with new identifiers');
  }

  /**
   * Get current profile statistics
   */
  getProfileStats(): {
    userIdentifiers: number;
    clientIdentifiers: number;
    contextualHints: number;
    phonePatterns: number;
    emailPatterns: number;
  } {
    return {
      userIdentifiers: this.profile.userIdentifiers.length,
      clientIdentifiers: this.profile.clientIdentifiers.length,
      contextualHints: this.profile.contextualHints.length,
      phonePatterns: this.profile.phonePatterns.length,
      emailPatterns: this.profile.emailPatterns.length
    };
  }
}

// Export singleton instance with default configuration
export const speakerIdentifier = new SpeakerIdentifier();