import {
  MessageBatch,
  DetectedMessage,
  SenderIndicator,
  MessageCorrection,
  CustomPattern,
  SenderAlias,
  ProcessingError,
} from "../../types/conversation-batch";

export class ParsingUtils {
  /**
   * Splits content based on common message delimiters
   */
  static splitByDelimiters(content: string): string[] {
    const delimiters = [
      /\n{3,}/, // Multiple blank lines
      /^[-_]{3,}$/m, // Horizontal rules
      /\n+On .* wrote:/, // Email reply indicators
      /^>+/m, // Quote markers
      /(?=^From:|\n(?:From:|On .* wrote:|>|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}:\d{2}))/m,
    ];

    let segments = [content];
    for (const delimiter of delimiters) {
      segments = segments.flatMap((segment) =>
        segment
          .split(delimiter)
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      );
    }

    return segments;
  }

  /**
   * Extracts possible timestamps from content
   */
  static extractTimestamps(content: string): string[] {
    const patterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:at)?\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i,
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/,
      /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i,
      /\d{1,2}:\d{2}(?:\s*[AP]M)?/i,
    ];

    return patterns.flatMap((pattern) => {
      const matches = content.match(pattern);
      return matches ? [matches[0]] : [];
    });
  }

  /**
   * Cleans message content by removing common artifacts
   */
  static cleanMessageContent(content: string): string {
    return content
      .replace(/^From:.*\n|^To:.*\n|^Subject:.*\n/gm, "") // Remove email headers
      .replace(/^>+/gm, "") // Remove quote markers
      .replace(/^\s*On.*wrote:$/gm, "") // Remove "On ... wrote:" lines
      .replace(/\n{3,}/g, "\n\n") // Normalize multiple newlines
      .trim();
  }

  /**
   * Calculates confidence score based on pattern matches and context
   */
  static calculateConfidence(
    content: string,
    patterns: CustomPattern[],
    aliases: SenderAlias[],
  ): number {
    let score = 0;
    let totalWeight = 0;

    // Check pattern matches
    for (const pattern of patterns) {
      const regex =
        typeof pattern.pattern === "string"
          ? new RegExp(pattern.pattern, "i")
          : pattern.pattern;

      if (regex.test(content)) {
        score += pattern.confidence * 2;
        totalWeight += 2;
      }
    }

    // Check alias matches
    for (const alias of aliases) {
      const regex = new RegExp(`\\b${alias.alias}\\b`, "i");
      if (regex.test(content)) {
        score += alias.metadata.confidence;
        totalWeight += 1;
      }
    }

    // Add baseline confidence
    score += 0.3;
    totalWeight += 1;

    return totalWeight > 0 ? score / totalWeight : 0.3;
  }

  /**
   * Validates a batch of messages and returns validation results
   */
  static validateBatch(batch: MessageBatch): {
    errors: ProcessingError[];
    warnings: ProcessingError[];
  } {
    const errors: ProcessingError[] = [];
    const warnings: ProcessingError[] = [];

    // Check for empty messages
    batch.detectedMessages.forEach((msg) => {
      if (!msg.content.trim()) {
        errors.push({
          type: "validation",
          code: "EMPTY_CONTENT",
          message: "Message content is empty",
          timestamp: new Date().toISOString(),
          messageId: msg.id,
          severity: "high",
        });
      }
    });

    // Check for timestamp sequence
    let lastTimestamp: string | undefined;
    batch.detectedMessages.forEach((msg) => {
      if (
        msg.timestamp &&
        lastTimestamp &&
        new Date(msg.timestamp) < new Date(lastTimestamp)
      ) {
        warnings.push({
          type: "validation",
          code: "TIMESTAMP_SEQUENCE",
          message: "Message timestamps are not in chronological order",
          timestamp: new Date().toISOString(),
          messageId: msg.id,
          severity: "medium",
        });
      }
      lastTimestamp = msg.timestamp;
    });

    // Check for unknown senders
    batch.detectedMessages.forEach((msg) => {
      if (msg.detectedSender === "unknown") {
        warnings.push({
          type: "detection",
          code: "UNKNOWN_SENDER",
          message: "Could not confidently detect message sender",
          timestamp: new Date().toISOString(),
          messageId: msg.id,
          severity: "medium",
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * Suggests corrections for a batch of messages
   */
  static suggestCorrections(
    batch: MessageBatch,
    patterns: CustomPattern[],
  ): MessageCorrection[] {
    const corrections: MessageCorrection[] = [];

    batch.detectedMessages.forEach((msg) => {
      // Check for potential sender corrections based on patterns
      const strongerPattern = patterns.find((pattern) => {
        const regex =
          typeof pattern.pattern === "string"
            ? new RegExp(pattern.pattern, "i")
            : pattern.pattern;
        return regex.test(msg.content) && pattern.confidence > msg.confidence;
      });

      if (
        strongerPattern &&
        strongerPattern.senderType !== msg.detectedSender
      ) {
        corrections.push({
          messageId: msg.id,
          field: "sender",
          oldValue: msg.detectedSender,
          newValue: strongerPattern.senderType,
          userApproved: false,
          timestamp: new Date().toISOString(),
          reason: `Higher confidence pattern match: ${strongerPattern.name}`,
          appliedPattern: strongerPattern.id,
        });
      }

      // Add other correction types as needed
    });

    return corrections;
  }

  /**
   * Merges adjacent messages from the same sender
   */
  static mergeAdjacentMessages(messages: DetectedMessage[]): DetectedMessage[] {
    const merged: DetectedMessage[] = [];
    let current: DetectedMessage | null = null;

    for (const msg of messages) {
      if (!current) {
        current = { ...msg };
        continue;
      }

      if (
        current.detectedSender === msg.detectedSender &&
        Math.abs(
          new Date(msg.timestamp || "").getTime() -
            new Date(current.timestamp || "").getTime(),
        ) < 300000
      ) {
        // Merge messages less than 5 minutes apart
        current.content += "\n\n" + msg.content;
        current.confidence = Math.max(current.confidence, msg.confidence);
        current.indicators = [...current.indicators, ...msg.indicators];
        if (current.metadata?.mergedIds) {
          current.metadata.mergedIds.push(msg.id);
        } else if (current.metadata) {
          current.metadata.mergedIds = [msg.id];
        }
      } else {
        merged.push(current);
        current = { ...msg };
      }
    }

    if (current) {
      merged.push(current);
    }

    return merged;
  }

  /**
   * Calculates similarity between two messages
   */
  static calculateSimilarity(msg1: string, msg2: string): number {
    const words1 = new Set(msg1.toLowerCase().split(/\s+/));
    const words2 = new Set(msg2.toLowerCase().split(/\s+/));

    const intersection = new Set(
      [...words1].filter((word) => words2.has(word)),
    );

    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}
