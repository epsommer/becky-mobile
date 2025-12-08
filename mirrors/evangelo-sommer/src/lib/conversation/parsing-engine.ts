import {
  MessageBatch,
  DetectedMessage,
  SenderIndicator,
  CustomPattern,
  SenderAlias,
  ProcessingError,
  MessageValidationResult,
  StyleProfile,
  ConversationParser,
} from "../../types/conversation-batch";
import { Message } from "../../types/client";
import { ParsingUtils } from "./parsing-utils";

export class ParsingEngine {
  private customPatterns: CustomPattern[];
  private senderAliases: SenderAlias[];
  private config: ConversationParser;

  constructor(config: ConversationParser) {
    this.config = config;
    this.customPatterns = config.customPatterns || [];
    this.senderAliases = config.senderAliases || [];
  }

  async processMessageBatch(
    content: string,
    clientId: string,
  ): Promise<MessageBatch> {
    const startTime = Date.now();

    try {
      const batch: MessageBatch = {
        id: `batch_${Date.now()}`,
        rawContent: content,
        detectedMessages: [],
        processedMessages: [],
        confidence: 0,
        status: "analyzing",
        corrections: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clientId,
        metadata: {
          importMethod: this.config.parseMethod,
          totalMessageCount: 0,
          processedMessageCount: 0,
          errorCount: 0,
          processingTime: 0,
        },
      };

      // Split content into potential messages
      const segments = await this.splitContent(content);
      if (batch.metadata) {
        batch.metadata.totalMessageCount = segments.length;
      }

      // Process each segment
      const detectedMessages = await Promise.all(
        segments.map((segment, index) =>
          this.detectMessage(segment, index, segments),
        ),
      );

      batch.detectedMessages = detectedMessages.filter(
        (msg): msg is DetectedMessage => msg !== null,
      );
      if (batch.metadata) {
        batch.metadata.processedMessageCount = batch.detectedMessages.length;
      }

      // Calculate overall confidence
      const confidence = this.calculateBatchConfidence(batch.detectedMessages);
      batch.confidence = confidence;

      // Validate the batch
      const validation = await this.validateMessageBatch(batch);
      if (!validation.isValid && batch.metadata) {
        batch.metadata.errorCount = validation.errors.length;
      }

      // Update final status
      batch.status = validation.isValid ? "ready" : "error";
      if (batch.metadata) {
        batch.metadata.processingTime = Date.now() - startTime;
      }

      return batch;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Batch processing failed: ${errorMessage}`);
    }
  }

  private async splitContent(content: string): Promise<string[]> {
    const normalizedContent = content.replace(/\r\n/g, "\n").trim();
    return ParsingUtils.splitByDelimiters(normalizedContent);
  }

  private async detectMessage(
    content: string,
    index: number,
    allSegments: string[],
  ): Promise<DetectedMessage | null> {
    if (!content.trim()) return null;

    const indicators: SenderIndicator[] = [];
    let highestConfidence = 0;
    let detectedSender: "client" | "you" | "unknown" = "unknown";

    // Check patterns
    for (const pattern of this.customPatterns) {
      const regex =
        typeof pattern.pattern === "string"
          ? new RegExp(pattern.pattern, "i")
          : pattern.pattern;

      if (regex.test(content)) {
        highestConfidence = Math.max(highestConfidence, pattern.confidence);
        detectedSender = pattern.senderType;
        indicators.push({
          type: "pattern",
          evidence: pattern.name,
          confidence: pattern.confidence,
          reasoning: `Matched pattern: ${pattern.name}`,
        });
      }
    }

    // Check aliases
    const aliasMatch = this.checkAlias(content);
    if (aliasMatch) {
      const aliasConfidence = aliasMatch.metadata.confidence || 0;
      if (aliasConfidence > highestConfidence) {
        highestConfidence = aliasConfidence;
        detectedSender = aliasMatch.actualSender;
        indicators.push({
          type: "pattern",
          evidence: aliasMatch.alias,
          confidence: aliasConfidence,
          reasoning: `Matched alias: ${aliasMatch.alias}`,
        });
      }
    }

    // Get contextual indicators
    const contextualIndicator = this.getContextualIndicator(
      content,
      index,
      allSegments,
    );
    if (contextualIndicator) {
      indicators.push(contextualIndicator);
      if (contextualIndicator.confidence > highestConfidence) {
        highestConfidence = contextualIndicator.confidence;
        detectedSender = this.getSenderFromContext(contextualIndicator);
      }
    }

    // Extract timestamp and message type
    const timestamp = ParsingUtils.extractTimestamps(content)[0];
    const type = this.getMessageType(content);

    return {
      id: `msg_${Date.now()}_${index}`,
      content: ParsingUtils.cleanMessageContent(content),
      detectedSender,
      confidence: highestConfidence,
      timestamp,
      type,
      indicators,
      metadata: {
        originalIndex: index,
        patternMatches: indicators
          .filter((i) => i.type === "pattern")
          .map((i) => i.evidence),
      },
    };
  }

  private checkAlias(content: string): SenderAlias | null {
    let bestMatch: SenderAlias | null = null;
    let highestConfidence = 0;

    for (const alias of this.senderAliases) {
      const confidence = alias.metadata.confidence || 0;
      const regex = new RegExp(`\\b${alias.alias}\\b`, "i");
      if (regex.test(content) && confidence > highestConfidence) {
        bestMatch = alias;
        highestConfidence = confidence;
      }
    }

    return bestMatch;
  }

  private getContextualIndicator(
    content: string,
    index: number,
    allSegments: string[],
  ): SenderIndicator | null {
    const contextWindow = this.config.settings.maxContextWindow;
    const start = Math.max(0, index - contextWindow);
    const end = Math.min(allSegments.length, index + contextWindow);
    const contextSegments = allSegments.slice(start, end);

    const styleProfile = this.analyzeMessageStyle(contextSegments);
    const confidence = this.getStyleConfidence(styleProfile);

    return {
      type: "context",
      evidence: "Writing style analysis",
      confidence,
      reasoning: "Based on contextual writing patterns",
      source: {
        contextRange: [start, end],
      },
    };
  }

  private getSenderFromContext(
    indicator: SenderIndicator,
  ): "client" | "you" | "unknown" {
    return indicator.confidence > this.config.settings.minConfidence
      ? indicator.evidence.includes("client")
        ? "client"
        : "you"
      : "unknown";
  }

  private getMessageType(content: string): Message["type"] {
    if (content.match(/^From:|^To:|^Subject:/m)) return "email";
    if (content.match(/^Call Duration:|^Meeting Notes:/i)) return "call-notes";
    if (content.match(/^\d{1,2}:\d{2}(?:\s*[AP]M)?/i)) return "text";
    return "text";
  }

  private calculateBatchConfidence(messages: DetectedMessage[]): number {
    if (messages.length === 0) return 0;
    const totalConfidence = messages.reduce(
      (sum, msg) => sum + msg.confidence,
      0,
    );
    return totalConfidence / messages.length;
  }

  private async validateMessageBatch(
    batch: MessageBatch,
  ): Promise<MessageValidationResult> {
    const validation = ParsingUtils.validateBatch(batch);
    return {
      isValid: validation.errors.length === 0,
      errors: validation.errors,
      warnings: validation.warnings,
      suggestions: [],
    };
  }

  private analyzeMessageStyle(messages: string[]): StyleProfile {
    return {
      formalityScore: 0.5,
      technicalityLevel: 0.5,
      averageMessageLength:
        messages.reduce((sum, msg) => sum + msg.length, 0) / messages.length,
      commonPhrases: [],
      emotionIndicators: {
        positive: 0.33,
        negative: 0.33,
        neutral: 0.34,
      },
      vocabulary: {
        diversity: 0.5,
        complexity: 0.5,
        technicalTerms: [],
      },
      timing: {
        averageResponseTime: 0,
        typicalTimeOfDay: [],
        responseConsistency: 0.5,
      },
    };
  }

  private getStyleConfidence(profile: StyleProfile): number {
    return (
      (profile.formalityScore +
        profile.technicalityLevel +
        profile.vocabulary.diversity +
        profile.vocabulary.complexity) /
      4
    );
  }
}

export default ParsingEngine;
