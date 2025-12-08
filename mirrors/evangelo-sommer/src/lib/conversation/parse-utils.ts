// src/lib/conversation/parse-utils.ts

import {
  DetectedMessage,
  StyleProfile,
  MessagePair,
} from "../../types/conversation-batch";

export class EmailParser {
  static parseEmailThread(content: string): DetectedMessage[] {
    const messages: DetectedMessage[] = [];
    const emailHeaderRegex = /^(?:From|To|Date|Subject):\s*(.*?)$/gm;
    const emailSections = content.split(/\n(?=From:)/);

    emailSections.forEach((section, index) => {
      const headers: Record<string, string> = {};
      let currentMatch;
      let remainingContent = section;

      // Extract headers
      while ((currentMatch = emailHeaderRegex.exec(section)) !== null) {
        const [fullMatch, value] = currentMatch;
        const header = fullMatch.split(":")[0];
        headers[header] = value.trim();
        remainingContent = remainingContent.replace(fullMatch, "");
      }

      if (Object.keys(headers).length === 0) return;

      // Determine sender based on headers
      const detectedSender = headers["From"]?.toLowerCase().includes("client")
        ? "client"
        : "you";
      const confidence = headers["From"] ? 0.9 : 0.7;

      messages.push({
        id: `email_${Date.now()}_${index}`,
        content: remainingContent.trim(),
        detectedSender,
        confidence,
        timestamp: headers["Date"]
          ? new Date(headers["Date"]).toISOString()
          : undefined,
        type: "email",
        indicators: [
          {
            type: "pattern",
            evidence: headers["From"] || "Email format detected",
            confidence,
            reasoning: `Email headers found: ${Object.keys(headers).join(", ")}`,
          },
        ],
        metadata: {
          originalIndex: index,
          patternMatches: [`From: ${headers["From"]}`],
          contextClues: headers["Subject"]
            ? [`Subject: ${headers["Subject"]}`]
            : undefined,
        },
      });
    });

    return messages;
  }
}

export class TextMessageParser {
  static parseTextHistory(content: string): DetectedMessage[] {
    const messages: DetectedMessage[] = [];
    const timestampRegex =
      /^\[?(\d{1,2}:\d{2}(?:\s*[AP]M)?)\]?\s*(?:[-|]|\s+)/i;
    const sections = content.split(/\n(?=\[?\d{1,2}:\d{2})/);

    sections.forEach((section, index) => {
      const trimmedSection = section.trim();
      if (!trimmedSection) return;

      const timestampMatch = trimmedSection.match(timestampRegex);
      const timestamp = timestampMatch ? timestampMatch[1] : undefined;
      const messageContent = timestampMatch
        ? trimmedSection.slice(timestampMatch[0].length)
        : trimmedSection;

      // Basic sender detection based on content patterns
      const indicators = ContentAnalyzer.detectSenderIndicators(messageContent);
      const confidence = Math.max(...indicators.map((i) => i.confidence));
      const detectedSender =
        confidence > 0.7
          ? indicators[0].evidence.includes("client")
            ? "client"
            : "you"
          : "unknown";

      messages.push({
        id: `text_${Date.now()}_${index}`,
        content: messageContent.trim(),
        detectedSender,
        confidence,
        timestamp: timestamp
          ? new Date(`${new Date().toDateString()} ${timestamp}`).toISOString()
          : undefined,
        type: "text",
        indicators,
        metadata: {
          originalIndex: index,
        },
      });
    });

    return messages;
  }
}

export class ContentAnalyzer {
  static detectSenderIndicators(content: string) {
    const indicators = [];

    // Pattern-based indicators
    const clientPatterns = [
      /\b(?:please|can you|could you|need|want)\b/i,
      /\?$/,
      /^(?:hi|hello|hey)\b/i,
    ];

    const youPatterns = [
      /\b(?:I'll|I can|I will|I have|I've)\b/i,
      /\b(?:here's|attached|see below)\b/i,
      /\b(?:let me|I'll check|I'll get)\b/i,
    ];

    let clientMatches = 0;
    let youMatches = 0;

    clientPatterns.forEach((pattern) => {
      if (pattern.test(content)) clientMatches++;
    });

    youPatterns.forEach((pattern) => {
      if (pattern.test(content)) youMatches++;
    });

    const totalPatterns = clientPatterns.length + youPatterns.length;
    const clientConfidence = clientMatches / totalPatterns;
    const youConfidence = youMatches / totalPatterns;

    if (clientMatches > 0) {
      indicators.push({
        type: "pattern" as const,
        evidence: "Client language patterns",
        confidence: clientConfidence,
        reasoning: "Found client-typical phrases and patterns",
      });
    }

    if (youMatches > 0) {
      indicators.push({
        type: "pattern" as const,
        evidence: "Service provider language patterns",
        confidence: youConfidence,
        reasoning: "Found service provider-typical phrases and patterns",
      });
    }

    // Style-based indicators
    const style = this.analyzeCommunicationStyle([content]);
    indicators.push({
      type: "style" as const,
      evidence: `Formality: ${style.formalityScore}, Technical: ${style.technicalityLevel}`,
      confidence: (style.formalityScore + style.technicalityLevel) / 2,
      reasoning: "Based on writing style analysis",
    });

    return indicators;
  }

  static analyzeCommunicationStyle(messages: string[]): StyleProfile {
    const combinedText = messages.join(" ");
    const words = combinedText.toLowerCase().split(/\W+/);

    // Analyze formality
    const formalWords = new Set([
      "regarding",
      "concerning",
      "furthermore",
      "additionally",
      "therefore",
      "subsequently",
      "accordingly",
      "hence",
      "thus",
      "consequently",
    ]);

    const technicalWords = new Set([
      "implementation",
      "configuration",
      "integration",
      "deployment",
      "architecture",
      "framework",
      "database",
      "algorithm",
      "optimization",
      "infrastructure",
    ]);

    const formalCount = words.filter((word) => formalWords.has(word)).length;
    const technicalCount = words.filter((word) =>
      technicalWords.has(word),
    ).length;

    return {
      formalityScore: Math.min((formalCount / words.length) * 10, 1),
      technicalityLevel: Math.min((technicalCount / words.length) * 10, 1),
      averageMessageLength: combinedText.length / messages.length,
      commonPhrases: this.extractCommonPhrases(messages),
      emotionIndicators: this.analyzeEmotions(combinedText),
      vocabulary: {
        diversity: new Set(words).size / words.length,
        complexity: this.calculateWordComplexity(words),
        technicalTerms: words.filter((word) => technicalWords.has(word)),
      },
      timing: {
        averageResponseTime: 0, // Would need message timestamps
        typicalTimeOfDay: [], // Would need message timestamps
        responseConsistency: 0.5, // Default without temporal analysis
      },
    };
  }

  static detectQuestionResponsePairs(
    messages: DetectedMessage[],
  ): MessagePair[] {
    const pairs: MessagePair[] = [];

    for (let i = 0; i < messages.length - 1; i++) {
      const current = messages[i];
      const next = messages[i + 1];

      // Check if current message ends with a question mark
      if (current.content.trim().endsWith("?")) {
        const timeDelta =
          next.timestamp && current.timestamp
            ? new Date(next.timestamp).getTime() -
              new Date(current.timestamp).getTime()
            : 0;

        pairs.push({
          questionId: current.id,
          responseId: next.id,
          confidence: this.calculateResponseConfidence(
            current,
            next,
            timeDelta,
          ),
          timeDelta,
          context: {
            previousMessageId: i > 0 ? messages[i - 1].id : undefined,
            nextMessageId:
              i < messages.length - 2 ? messages[i + 2].id : undefined,
            topicContinuity: this.calculateTopicContinuity(
              current.content,
              next.content,
            ),
          },
        });
      }
    }

    return pairs;
  }

  private static extractCommonPhrases(messages: string[]): string[] {
    // Simple n-gram analysis
    const phrases = new Map<string, number>();
    const minPhraseLength = 3;
    const maxPhraseLength = 5;

    messages.forEach((message) => {
      const words = message.toLowerCase().split(/\W+/);
      for (let n = minPhraseLength; n <= maxPhraseLength; n++) {
        for (let i = 0; i <= words.length - n; i++) {
          const phrase = words.slice(i, i + n).join(" ");
          phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
        }
      }
    });

    return Array.from(phrases.entries())
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([phrase]) => phrase);
  }

  private static analyzeEmotions(text: string) {
    const positiveWords = new Set([
      "thanks",
      "great",
      "good",
      "excellent",
      "appreciate",
    ]);
    const negativeWords = new Set([
      "sorry",
      "issue",
      "problem",
      "error",
      "wrong",
    ]);

    const words = text.toLowerCase().split(/\W+/);
    const positive = words.filter((w) => positiveWords.has(w)).length;
    const negative = words.filter((w) => negativeWords.has(w)).length;
    const total = words.length;

    return {
      positive: positive / total,
      negative: negative / total,
      neutral: (total - positive - negative) / total,
    };
  }

  private static calculateWordComplexity(words: string[]): number {
    const avgLength =
      words.reduce((sum, word) => sum + word.length, 0) / words.length;
    return Math.min(avgLength / 10, 1); // Normalize to 0-1
  }

  private static calculateResponseConfidence(
    question: DetectedMessage,
    response: DetectedMessage,
    timeDelta: number,
  ): number {
    let confidence = 0.5;

    // Different senders increase confidence
    if (question.detectedSender !== response.detectedSender) {
      confidence += 0.2;
    }

    // Quick response increases confidence
    if (timeDelta < 1000 * 60 * 5) {
      // 5 minutes
      confidence += 0.2;
    }

    // Content similarity increases confidence
    const similarity = this.calculateTopicContinuity(
      question.content,
      response.content,
    );
    confidence += similarity * 0.3;

    return Math.min(confidence, 1);
  }

  private static calculateTopicContinuity(
    text1: string,
    text2: string,
  ): number {
    const words1 = new Set(text1.toLowerCase().split(/\W+/));
    const words2 = new Set(text2.toLowerCase().split(/\W+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}
