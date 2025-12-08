// src/lib/message-utils.test.ts

import {
  generateMessageId,
  ensureMessageId,
  validateMessage,
  createMessage,
  sortMessagesByTime,
  deduplicateMessages,
  getMessageStats,
} from "./message-utils";
import { Message } from "../types/client";

describe("Message Utils", () => {
  describe("generateMessageId", () => {
    it("should generate unique message IDs", () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();

      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("ensureMessageId", () => {
    it("should add ID to message without one", () => {
      const message = {
        id: "",
        role: "you" as const,
        content: "Test message",
        timestamp: "2024-01-01T00:00:00Z",
        type: "text" as const,
      };

      const result = ensureMessageId(message);

      expect(result.id).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(result.content).toBe("Test message");
    });

    it("should keep existing valid ID", () => {
      const message = {
        id: "existing-id",
        role: "client" as const,
        content: "Test message",
        timestamp: "2024-01-01T00:00:00Z",
        type: "text" as const,
      };

      const result = ensureMessageId(message);

      expect(result.id).toBe("existing-id");
    });
  });

  describe("validateMessage", () => {
    it("should validate complete message", () => {
      const message = {
        id: "test-id",
        role: "you" as const,
        content: "Test content",
        timestamp: "2024-01-01T00:00:00Z",
        type: "text" as const,
      };

      expect(validateMessage(message)).toBe(true);
    });

    it("should reject incomplete message", () => {
      const message = {
        id: "test-id",
        role: "you" as const,
        // missing content, timestamp, type
      };

      expect(validateMessage(message)).toBe(false);
    });
  });

  describe("createMessage", () => {
    it("should create message with defaults", () => {
      const result = createMessage({
        content: "Test content",
        role: "you",
      });

      expect(result.id).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(result.content).toBe("Test content");
      expect(result.role).toBe("you");
      expect(result.type).toBe("text");
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("sortMessagesByTime", () => {
    it("should sort messages by timestamp", () => {
      const messages: Message[] = [
        {
          id: "2",
          role: "client",
          content: "Second",
          timestamp: "2024-01-02T00:00:00Z",
          type: "text",
        },
        {
          id: "1",
          role: "you",
          content: "First",
          timestamp: "2024-01-01T00:00:00Z",
          type: "text",
        },
      ];

      const sorted = sortMessagesByTime(messages);

      expect(sorted[0].content).toBe("First");
      expect(sorted[1].content).toBe("Second");
    });
  });

  describe("deduplicateMessages", () => {
    it("should remove duplicate messages", () => {
      const messages: Message[] = [
        {
          id: "msg-1",
          role: "you",
          content: "Test 1",
          timestamp: "2024-01-01T00:00:00Z",
          type: "text",
        },
        {
          id: "msg-1", // duplicate ID
          role: "client",
          content: "Test 1 duplicate",
          timestamp: "2024-01-01T01:00:00Z",
          type: "text",
        },
        {
          id: "msg-2",
          role: "you",
          content: "Test 2",
          timestamp: "2024-01-01T02:00:00Z",
          type: "text",
        },
      ];

      const deduplicated = deduplicateMessages(messages);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].id).toBe("msg-1");
      expect(deduplicated[1].id).toBe("msg-2");
    });
  });

  describe("getMessageStats", () => {
    it("should calculate message statistics", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "you",
          content: "Test 1",
          timestamp: "2024-01-01T00:00:00Z",
          type: "text",
        },
        {
          id: "2",
          role: "client",
          content: "Test 2",
          timestamp: "2024-01-02T00:00:00Z",
          type: "email",
        },
        {
          id: "3",
          role: "you",
          content: "Test 3",
          timestamp: "2024-01-03T00:00:00Z",
          type: "text",
        },
      ];

      const stats = getMessageStats(messages);

      expect(stats.total).toBe(3);
      expect(stats.byRole.you).toBe(2);
      expect(stats.byRole.client).toBe(1);
      expect(stats.byType.text).toBe(2);
      expect(stats.byType.email).toBe(1);
      expect(stats.dateRange).toBeDefined();
    });
  });
});
