// src/lib/message-utils.ts

import { Message } from "../types/client";

/**
 * Generate a unique message ID
 */
export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Ensure a message has a proper ID, generating one if missing
 */
export const ensureMessageId = (message: Message): Message => {
  if (!message.id || message.id.trim() === "") {
    return {
      ...message,
      id: generateMessageId(),
    };
  }
  return message;
};

/**
 * Ensure all messages in an array have proper IDs
 */
export const ensureMessageIds = (messages: Message[]): Message[] => {
  return messages.map(ensureMessageId);
};

/**
 * Validate message structure and ensure required fields
 */
export const validateMessage = (message: Partial<Message>): message is Message => {
  return !!(
    message.id &&
    message.role &&
    message.content &&
    message.timestamp &&
    message.type
  );
};

/**
 * Clean and normalize message content
 */
export const normalizeMessageContent = (content: string): string => {
  return content
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, "\n"); // Replace multiple newlines with single newline
};

/**
 * Create a new message with proper defaults
 */
export const createMessage = (
  partial: Partial<Message> & { content: string; role: Message["role"] }
): Message => {
  const now = new Date().toISOString();

  return {
    id: generateMessageId(),
    timestamp: now,
    type: "text",
    ...partial,
    content: normalizeMessageContent(partial.content),
  };
};

/**
 * Sort messages by timestamp
 */
export const sortMessagesByTime = (messages: Message[]): Message[] => {
  return [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};

/**
 * Get unique message IDs from a list of messages
 */
export const getUniqueMessageIds = (messages: Message[]): string[] => {
  const ids = new Set(messages.map(msg => msg.id).filter(Boolean));
  return Array.from(ids);
};

/**
 * Remove duplicate messages based on ID
 */
export const deduplicateMessages = (messages: Message[]): Message[] => {
  const seen = new Set<string>();
  return messages.filter(message => {
    if (!message.id || seen.has(message.id)) {
      return false;
    }
    seen.add(message.id);
    return true;
  });
};

/**
 * Find messages within a date range
 */
export const filterMessagesByDateRange = (
  messages: Message[],
  startDate: Date,
  endDate: Date
): Message[] => {
  return messages.filter(message => {
    const messageDate = new Date(message.timestamp);
    return messageDate >= startDate && messageDate <= endDate;
  });
};

/**
 * Get message statistics
 */
export const getMessageStats = (messages: Message[]) => {
  const total = messages.length;
  const byRole = messages.reduce((acc, msg) => {
    acc[msg.role] = (acc[msg.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byType = messages.reduce((acc, msg) => {
    acc[msg.type] = (acc[msg.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dateRange = messages.length > 0 ? {
    earliest: Math.min(...messages.map(m => new Date(m.timestamp).getTime())),
    latest: Math.max(...messages.map(m => new Date(m.timestamp).getTime()))
  } : null;

  return {
    total,
    byRole,
    byType,
    dateRange: dateRange ? {
      earliest: new Date(dateRange.earliest).toISOString(),
      latest: new Date(dateRange.latest).toISOString()
    } : null
  };
};
