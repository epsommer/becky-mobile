// src/__tests__/conversation/parsing-engine.test.ts
import ParsingEngine from "../../lib/conversation/parsing-engine";
import { ConversationParser } from "../../types/conversation-batch";

describe("ParsingEngine", () => {
  let engine: ParsingEngine;

  beforeEach(() => {
    const config: ConversationParser = {
      parseMethod: "smart",
      customPatterns: [],
      senderAliases: [],
      learningEnabled: false,
      settings: {
        minConfidence: 0.5,
        autoApproveThreshold: 0.8,
        enableSplitDetection: true,
        enableStyleAnalysis: true,
        maxContextWindow: 5,
        timezoneSetting: "UTC",
      },
    };
    engine = new ParsingEngine(config);
  });

  describe("processMessageBatch", () => {
    it("should process email conversation correctly", async () => {
      const content = `From: client@example.com
Subject: Project Update
Date: Wed, 15 Mar 2024 10:00:00 GMT

Hi, could you please provide an update on the project status?

From: you@company.com
Subject: Re: Project Update
Date: Wed, 15 Mar 2024 10:30:00 GMT

Sure! We're currently at 80% completion and on track for delivery next week.`;

      const result = await engine.processMessageBatch(content, "client123");

      expect(result).toBeDefined();
      expect(result.detectedMessages).toHaveLength(2);
      expect(result.status).toBe("ready");
      expect(result.confidence).toBeGreaterThan(0.7);

      const [firstMessage, secondMessage] = result.detectedMessages;
      expect(firstMessage.detectedSender).toBe("client");
      expect(secondMessage.detectedSender).toBe("you");
    });

    it("should process text message history correctly", async () => {
      const content = `[10:15 AM] Hi, when can we meet?
[10:20 AM] I'm available tomorrow at 2pm
[10:21 AM] Perfect, that works for me!`;

      const result = await engine.processMessageBatch(content, "client123");

      expect(result).toBeDefined();
      expect(result.detectedMessages).toHaveLength(3);
      expect(result.status).toBe("ready");

      const messages = result.detectedMessages;
      expect(messages[0].type).toBe("text");
      expect(messages[0].timestamp).toBeDefined();
    });

    it("should handle empty content", async () => {
      const content = "";

      const result = await engine.processMessageBatch(content, "client123");

      expect(result.status).toBe("error");
      expect(result.detectedMessages).toHaveLength(0);
      expect(result.metadata?.errorCount).toBeGreaterThan(0);
    });

    it("should detect message splits correctly", async () => {
      const content = `Sure, I can help with that.

By the way, here are the requirements:
1. Feature A
2. Feature B

Let me know if you need anything else.`;

      const result = await engine.processMessageBatch(content, "client123");

      expect(result.detectedMessages.length).toBeGreaterThan(1);
      expect(result.detectedMessages.some((msg) => msg.suggestedSplit)).toBe(
        true,
      );
    });

    it("should calculate confidence scores accurately", async () => {
      const content = `From: client@example.com
Subject: Question
Date: Wed, 15 Mar 2024 10:00:00 GMT

Could you please help me with this?

From: Unknown
Date: Wed, 15 Mar 2024 10:30:00 GMT

Let me check and get back to you.`;

      const result = await engine.processMessageBatch(content, "client123");

      expect(result.detectedMessages[0].confidence).toBeGreaterThan(0.8); // Clear client patterns
      expect(result.detectedMessages[1].confidence).toBeLessThan(0.8); // Less certain
    });

    it("should handle malformed input gracefully", async () => {
      const content =
        "From: malformed\nemail\nstructure\n\nwith\nrandom\nbreaks";

      const result = await engine.processMessageBatch(content, "client123");

      expect(result).toBeDefined();
      expect(result.status).not.toBe("error");
      expect(result.metadata?.errorCount).toBe(0);
    });

    it("should respect configuration settings", async () => {
      const lowConfidenceConfig: ConversationParser = {
        parseMethod: "patterns",
        learningEnabled: false,
        settings: {
          minConfidence: 0.9, // Very high threshold
          autoApproveThreshold: 0.95,
          enableSplitDetection: false,
          enableStyleAnalysis: false,
          maxContextWindow: 1,
          timezoneSetting: "UTC",
        },
      };

      const lowConfidenceEngine = new ParsingEngine(lowConfidenceConfig);
      const content = "Hi there! Can you help me?";

      const result = await lowConfidenceEngine.processMessageBatch(
        content,
        "client123",
      );

      expect(result.detectedMessages.every((msg) => msg.confidence < 0.9)).toBe(
        true,
      );
      expect(result.status).not.toBe("ready");
    });
  });

  describe("validateBatch", () => {
    it("should detect timestamp sequence errors", async () => {
      const content = `From: client@example.com
Date: Wed, 15 Mar 2024 10:30:00 GMT

First message

From: you@company.com
Date: Wed, 15 Mar 2024 10:00:00 GMT

Second message (earlier timestamp)`;

      const result = await engine.processMessageBatch(content, "client123");

      expect(result.metadata?.errorCount).toBeGreaterThan(0);
      // Check for specific validation warnings about timestamp sequence
      expect(result.status).toBe("error");
    });

    it("should validate required fields", async () => {
      const content = `From:
Date:

Empty content message`;

      const result = await engine.processMessageBatch(content, "client123");

      expect(result.metadata?.errorCount).toBeGreaterThan(0);
      expect(result.status).toBe("error");
    });
  });
});
