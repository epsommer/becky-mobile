// src/types/conversation-batch.ts

import { Message } from "./client";

export interface MessageBatch {
  id: string;
  rawContent: string;
  detectedMessages: DetectedMessage[];
  processedMessages: Message[];
  confidence: number;
  status: "analyzing" | "ready" | "processing" | "completed" | "error";
  corrections: MessageCorrection[];
  createdAt: string;
  updatedAt: string;
  clientId: string;
  conversationId?: string;
  metadata?: {
    sourceType?: "email" | "text" | "transcript" | "manual" | "other";
    importMethod: "smart" | "patterns" | "manual";
    totalMessageCount: number;
    processedMessageCount: number;
    errorCount: number;
    processingTime: number; // in milliseconds
  };
}

export interface DetectedMessage {
  id: string;
  content: string;
  detectedSender: "client" | "you" | "unknown";
  confidence: number;
  timestamp?: string;
  type?: Message["type"];
  indicators: SenderIndicator[];
  suggestedSplit?: boolean;
  metadata?: {
    originalIndex: number;
    patternMatches?: string[];
    contextClues?: string[];
    splitReasons?: string[];
    mergeSuggestions?: string[];
    mergedIds?: string[]; // IDs of messages that were merged to create this one
    splitFromId?: string; // ID of the message this was split from
    splitIndex?: number; // Position in the split sequence
  };
}

export interface SenderIndicator {
  type: "pattern" | "timing" | "style" | "context";
  evidence: string;
  confidence: number;
  reasoning: string;
  source?: {
    patternId?: string;
    rule?: string;
    contextRange?: [number, number]; // message indices for context
  };
}

export interface MessageCorrection {
  messageId: string;
  field: "sender" | "content" | "timestamp" | "type";
  oldValue: string;
  newValue: string;
  userApproved: boolean;
  timestamp: string;
  reason?: string;
  appliedPattern?: string;
  affectedMessages?: string[]; // IDs of other messages affected by this correction
}

export interface ConversationParser {
  parseMethod: "smart" | "patterns" | "manual";
  customPatterns?: CustomPattern[];
  senderAliases?: SenderAlias[];
  learningEnabled: boolean;
  settings: {
    minConfidence: number;
    autoApproveThreshold: number;
    enableSplitDetection: boolean;
    enableStyleAnalysis: boolean;
    maxContextWindow: number;
    timezoneSetting: string;
  };
}

export interface CustomPattern {
  id: string;
  name: string;
  pattern: RegExp | string;
  senderType: "client" | "you";
  confidence: number;
  examples: string[];
  metadata: {
    creator: string;
    createdAt: string;
    updatedAt: string;
    successRate: number;
    totalMatches: number;
    falsePositives: number;
    lastUsed?: string;
    context?: string;
  };
}

export interface SenderAlias {
  id: string;
  alias: string;
  actualSender: "client" | "you";
  context?: string;
  priority: number;
  metadata: {
    createdAt: string;
    updatedAt: string;
    frequency: number;
    lastUsed?: string;
    confidence: number;
    examples: string[];
  };
}

export interface StyleProfile {
  formalityScore: number; // 0-1 scale
  technicalityLevel: number; // 0-1 scale
  averageMessageLength: number;
  commonPhrases: string[];
  emotionIndicators: {
    positive: number;
    negative: number;
    neutral: number;
  };
  vocabulary: {
    diversity: number;
    complexity: number;
    technicalTerms: string[];
  };
  timing: {
    averageResponseTime: number;
    typicalTimeOfDay: number[];
    responseConsistency: number;
  };
}

export interface MessagePair {
  questionId: string;
  responseId: string;
  confidence: number;
  timeDelta: number; // time between question and response
  context: {
    previousMessageId?: string;
    nextMessageId?: string;
    topicContinuity: number;
  };
}

export interface ProcessingError {
  type: "parsing" | "detection" | "validation" | "system";
  code: string;
  message: string;
  timestamp: string;
  messageId?: string;
  batchId?: string;
  severity: "low" | "medium" | "high" | "critical";
  metadata?: {
    line?: number;
    column?: number;
    snippet?: string;
    suggestedFix?: string;
  };
}

export type MessageInputMode = "individual" | "batch" | "smart";

export interface MessageValidationResult {
  isValid: boolean;
  errors: ProcessingError[];
  warnings: ProcessingError[];
  suggestions: {
    messageId: string;
    type: "merge" | "split" | "reorder" | "sender" | "content";
    description: string;
    confidence: number;
  }[];
}

export interface LearningFeedback {
  messageId: string;
  patternId?: string;
  isCorrect: boolean;
  correction?: MessageCorrection;
  timestamp: string;
  metadata: {
    confidence: number;
    processingTime: number;
    userFeedback?: string;
    context?: string;
  };
}
