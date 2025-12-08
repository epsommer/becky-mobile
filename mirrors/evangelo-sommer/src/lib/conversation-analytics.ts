// src/lib/conversation-analytics.ts

import {
  Conversation,
  Message,
  ConversationAnalytics,
  ConversationInsight,
  MessageAnalysis,
  ConversationHealth,
} from "../types/client";

export class ConversationAnalyticsEngine {
  private conversations: Conversation[];

  constructor(conversations: Conversation[]) {
    this.conversations = conversations;
  }

  /**
   * Calculate comprehensive analytics for conversations
   */
  calculateAnalytics(clientId?: string): ConversationAnalytics {
    const filteredConversations = clientId
      ? this.conversations.filter((c) => c.clientId === clientId)
      : this.conversations;

    return {
      responseMetrics: this.calculateResponseMetrics(filteredConversations),
      engagementData: this.calculateEngagementData(filteredConversations),
      sentimentTrend: this.calculateSentimentTrend(filteredConversations),
      topicAnalysis: this.analyzeTopics(filteredConversations),
      actionItemsTracking: this.trackActionItems(filteredConversations),
      communicationPatterns: this.analyzeCommunicationPatterns(
        filteredConversations,
      ),
    };
  }

  /**
   * Calculate response time metrics
   */
  private calculateResponseMetrics(
    conversations: Conversation[],
  ): ConversationAnalytics["responseMetrics"] {
    const responseTimes: number[] = [];
    const responseTimesBySource: Record<string, number[]> = {};

    conversations.forEach((conversation) => {
      const messages = conversation.messages.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      for (let i = 1; i < messages.length; i++) {
        const currentMessage = messages[i];
        const previousMessage = messages[i - 1];

        // Only calculate if roles are different (actual response)
        if (currentMessage.role !== previousMessage.role) {
          const responseTime =
            (new Date(currentMessage.timestamp).getTime() -
              new Date(previousMessage.timestamp).getTime()) /
            (1000 * 60 * 60); // Convert to hours

          responseTimes.push(responseTime);

          const source = conversation.source || "unknown";
          if (!responseTimesBySource[source]) {
            responseTimesBySource[source] = [];
          }
          responseTimesBySource[source].push(responseTime);
        }
      }
    });

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : 0;

    const sourceAverages: Record<string, number> = {};
    Object.entries(responseTimesBySource).forEach(([source, times]) => {
      sourceAverages[source] =
        times.reduce((sum, time) => sum + time, 0) / times.length;
    });

    return {
      averageResponseTime,
      fastestResponse:
        responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      slowestResponse:
        responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      totalResponseTime: responseTimes.reduce((sum, time) => sum + time, 0),
      responseTimeBySource: sourceAverages,
    };
  }

  /**
   * Calculate engagement metrics
   */
  private calculateEngagementData(
    conversations: Conversation[],
  ): ConversationAnalytics["engagementData"] {
    const allMessages = conversations.flatMap((c) => c.messages);
    const messagesByHour: Record<number, number> = {};
    const messagesByDay: Record<number, number> = {};
    const messageLengths: number[] = [];
    const conversationGaps: number[] = [];

    // Initialize hour and day counters
    for (let i = 0; i < 24; i++) messagesByHour[i] = 0;
    for (let i = 0; i < 7; i++) messagesByDay[i] = 0;

    allMessages.forEach((message) => {
      const date = new Date(message.timestamp);
      const hour = date.getHours();
      const day = date.getDay();

      messagesByHour[hour]++;
      messagesByDay[day]++;
      messageLengths.push(message.content.length);
    });

    // Calculate gaps between conversations
    const sortedConversations = conversations.sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );

    for (let i = 1; i < sortedConversations.length; i++) {
      const gap =
        (new Date(sortedConversations[i].createdAt).getTime() -
          new Date(sortedConversations[i - 1].updatedAt).getTime()) /
        (1000 * 60 * 60); // Convert to hours
      conversationGaps.push(gap);
    }

    const activeHours = Object.entries(messagesByHour)
      .filter(([, messageCount]) => messageCount > 0)
      .map(([hour]) => parseInt(hour));

    const activeDays = Object.entries(messagesByDay)
      .filter(([, messageCount]) => messageCount > 0)
      .map(([day]) => parseInt(day));

    const averageGap =
      conversationGaps.length > 0
        ? conversationGaps.reduce((sum, gap) => sum + gap, 0) /
          conversationGaps.length
        : 0;

    return {
      totalMessages: allMessages.length,
      messagesFromClient: allMessages.filter((m) => m.role === "client").length,
      messagesFromYou: allMessages.filter((m) => m.role === "you").length,
      lastActivity:
        conversations.length > 0
          ? Math.max(
              ...conversations.map((c) => new Date(c.updatedAt).getTime()),
            ).toString()
          : new Date().toISOString(),
      firstActivity:
        conversations.length > 0
          ? Math.min(
              ...conversations.map((c) => new Date(c.createdAt).getTime()),
            ).toString()
          : new Date().toISOString(),
      activeHours,
      activeDays,
      messageLengthAverage:
        messageLengths.length > 0
          ? messageLengths.reduce((sum, len) => sum + len, 0) /
            messageLengths.length
          : 0,
      conversationGaps: {
        average: averageGap,
        longest:
          conversationGaps.length > 0 ? Math.max(...conversationGaps) : 0,
        shortest:
          conversationGaps.length > 0 ? Math.min(...conversationGaps) : 0,
      },
    };
  }

  /**
   * Calculate sentiment trends over time
   */
  private calculateSentimentTrend(
    conversations: Conversation[],
  ): ConversationAnalytics["sentimentTrend"] {
    const sentimentMap: Record<string, { scores: number[]; count: number }> =
      {};

    conversations.forEach((conversation) => {
      const date = new Date(conversation.updatedAt).toISOString().split("T")[0];
      const sentiment = this.calculateConversationSentiment(conversation);

      if (!sentimentMap[date]) {
        sentimentMap[date] = { scores: [], count: 0 };
      }

      sentimentMap[date].scores.push(sentiment.score);
      sentimentMap[date].count += conversation.messages.length;
    });

    return Object.entries(sentimentMap)
      .map(([date, data]) => ({
        date,
        sentiment:
          data.scores.reduce((sum, score) => sum + score, 0) /
          data.scores.length,
        confidence: Math.min(data.scores.length / 10, 1), // Higher confidence with more data points
        messageCount: data.count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Analyze topics and keywords
   */
  private analyzeTopics(
    conversations: Conversation[],
  ): ConversationAnalytics["topicAnalysis"] {
    const wordFrequency: Record<string, number> = {};
    const topicMentions: Record<
      string,
      { count: number; sentiment: number; lastMentioned: string }
    > = {};

    const commonTopics = [
      "price",
      "pricing",
      "cost",
      "budget",
      "quote",
      "estimate",
      "schedule",
      "timing",
      "deadline",
      "appointment",
      "quality",
      "materials",
      "design",
      "requirements",
      "problem",
      "issue",
      "concern",
      "complaint",
      "payment",
      "invoice",
      "bill",
      "receipt",
      "meeting",
      "call",
      "visit",
      "inspection",
    ];

    conversations.forEach((conversation) => {
      const allText = conversation.messages
        .map((m) => m.content.toLowerCase())
        .join(" ");

      // Basic word frequency analysis
      const words = allText.match(/\b\w{4,}\b/g) || [];
      words.forEach((word) => {
        if (!this.isStopWord(word)) {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });

      // Topic detection
      commonTopics.forEach((topic) => {
        if (allText.includes(topic)) {
          if (!topicMentions[topic]) {
            topicMentions[topic] = {
              count: 0,
              sentiment: 0,
              lastMentioned: "",
            };
          }
          topicMentions[topic].count++;
          topicMentions[topic].sentiment +=
            this.calculateConversationSentiment(conversation).score;
          topicMentions[topic].lastMentioned = conversation.updatedAt;
        }
      });
    });

    // Get top words for word cloud
    const sortedWords = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50);

    const wordCloud = sortedWords.map(([word, count]) => ({
      word,
      count,
      importance: count / Math.max(...sortedWords.map(([, c]) => c)),
    }));

    // Get key topics
    const keyTopics = Object.entries(topicMentions)
      .map(([topic, data]) => ({
        topic,
        frequency: data.count,
        sentiment: data.sentiment / data.count,
        lastMentioned: data.lastMentioned,
      }))
      .sort((a, b) => b.frequency - a.frequency);

    return {
      keyTopics,
      wordCloud,
      emergingTopics: [], // Simplified for now - would need historical data for trends
    };
  }

  /**
   * Track action items completion
   */
  private trackActionItems(
    conversations: Conversation[],
  ): ConversationAnalytics["actionItemsTracking"] {
    const allActionItems = conversations.flatMap((c) => c.nextActions || []);
    const completedActionItems = conversations.filter(
      (c) => c.status === "resolved",
    ).length;
    const overdueConversations = conversations.filter((c) => {
      const daysSinceUpdate =
        (Date.now() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return c.status === "pending" && daysSinceUpdate > 7;
    });

    const actionsByPriority: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };

    conversations.forEach((conversation) => {
      const priority = conversation.priority || "medium";
      actionsByPriority[priority]++;
    });

    return {
      totalActionItems: allActionItems.length,
      completedActionItems,
      pendingActionItems: conversations.filter((c) => c.status === "pending")
        .length,
      overdueActionItems: overdueConversations.length,
      averageCompletionTime: 48, // Placeholder - would need completion timestamps
      completionRate:
        allActionItems.length > 0
          ? (completedActionItems / allActionItems.length) * 100
          : 0,
      actionsByPriority,
    };
  }

  /**
   * Analyze communication patterns
   */
  private analyzeCommunicationPatterns(
    conversations: Conversation[],
  ): ConversationAnalytics["communicationPatterns"] {
    const sourceCount: Record<string, number> = {};
    const hourlyResponses: Record<number, number> = {};

    // Initialize hourly responses
    for (let i = 0; i < 24; i++) {
      hourlyResponses[i] = 0;
    }

    conversations.forEach((conversation) => {
      const source = conversation.source || "unknown";
      sourceCount[source] = (sourceCount[source] || 0) + 1;

      conversation.messages.forEach((message) => {
        if (message.role === "you") {
          const hour = new Date(message.timestamp).getHours();
          hourlyResponses[hour]++;
        }
      });
    });

    const preferredContactMethod =
      Object.entries(sourceCount).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "email";

    const bestResponseTimes = Object.entries(hourlyResponses)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        responseRate: count,
      }))
      .sort((a, b) => b.responseRate - a.responseRate);

    // Determine frequency pattern
    const avgGapDays =
      conversations.length > 1
        ? (new Date(
            conversations[conversations.length - 1].updatedAt,
          ).getTime() -
            new Date(conversations[0].createdAt).getTime()) /
          (1000 * 60 * 60 * 24) /
          conversations.length
        : 0;

    let communicationFrequency: "daily" | "weekly" | "monthly" | "sporadic";
    if (avgGapDays <= 1) communicationFrequency = "daily";
    else if (avgGapDays <= 7) communicationFrequency = "weekly";
    else if (avgGapDays <= 30) communicationFrequency = "monthly";
    else communicationFrequency = "sporadic";

    const urgencyKeywords = [
      { keyword: "urgent", urgencyLevel: 5 },
      { keyword: "asap", urgencyLevel: 5 },
      { keyword: "emergency", urgencyLevel: 5 },
      { keyword: "important", urgencyLevel: 4 },
      { keyword: "soon", urgencyLevel: 3 },
      { keyword: "quick", urgencyLevel: 3 },
      { keyword: "help", urgencyLevel: 2 },
    ];

    const urgencyIndicators = urgencyKeywords
      .map(({ keyword, urgencyLevel }) => {
        const frequency = conversations.reduce((count, conv) => {
          const text = conv.messages
            .map((m) => m.content.toLowerCase())
            .join(" ");
          return count + (text.includes(keyword) ? 1 : 0);
        }, 0);

        return { keyword, urgencyLevel, frequency };
      })
      .filter((indicator) => indicator.frequency > 0);

    return {
      preferredContactMethod,
      bestResponseTimes,
      communicationFrequency,
      urgencyIndicators,
    };
  }

  /**
   * Calculate sentiment for a single conversation
   */
  private calculateConversationSentiment(conversation: Conversation): {
    score: number;
    confidence: number;
  } {
    // Simple sentiment analysis - in production, you'd use a proper NLP service
    const positiveWords = [
      "great",
      "excellent",
      "perfect",
      "love",
      "amazing",
      "fantastic",
      "wonderful",
      "good",
      "happy",
      "pleased",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "hate",
      "horrible",
      "problem",
      "issue",
      "wrong",
      "disappointed",
      "frustrated",
    ];

    let sentimentScore = 0;
    let wordCount = 0;

    conversation.messages.forEach((message) => {
      const words = message.content.toLowerCase().split(/\s+/);
      words.forEach((word) => {
        if (positiveWords.includes(word)) {
          sentimentScore += 1;
          wordCount++;
        } else if (negativeWords.includes(word)) {
          sentimentScore -= 1;
          wordCount++;
        }
      });
    });

    const normalizedScore = wordCount > 0 ? sentimentScore / wordCount : 0;
    const confidence = Math.min(wordCount / 10, 1); // Higher confidence with more sentiment words

    return {
      score: Math.max(-1, Math.min(1, normalizedScore)), // Clamp between -1 and 1
      confidence,
    };
  }

  /**
   * Generate insights based on analytics
   */
  generateInsights(clientId?: string): ConversationInsight[] {
    const analytics = this.calculateAnalytics(clientId);
    const insights: ConversationInsight[] = [];

    // Response time insights
    if (analytics.responseMetrics.averageResponseTime > 24) {
      insights.push({
        id: `insight_response_${Date.now()}`,
        type: "opportunity",
        title: "Slow Response Times",
        description: `Average response time is ${analytics.responseMetrics.averageResponseTime.toFixed(1)} hours. Consider setting up automated responses or response time goals.`,
        priority: "medium",
        confidence: 0.8,
        actionable: true,
        relatedConversations: [],
        metadata: {
          dataPoints: [
            {
              metric: "averageResponseTime",
              value: analytics.responseMetrics.averageResponseTime,
              benchmark: 4,
              trend: "stable",
            },
          ],
          timeframe: {
            start: analytics.engagementData.firstActivity,
            end: analytics.engagementData.lastActivity,
          },
          affectedMetrics: ["responseMetrics"],
        },
        suggestedActions: [
          {
            action: "Set response time goals",
            description: "Aim to respond within 4 hours during business hours",
            effort: "low",
            impact: "high",
          },
        ],
        createdAt: new Date().toISOString(),
      });
    }

    // Engagement pattern insights
    if (analytics.communicationPatterns.communicationFrequency === "sporadic") {
      insights.push({
        id: `insight_engagement_${Date.now()}`,
        type: "pattern",
        title: "Irregular Communication Pattern",
        description:
          "Communication with this client is sporadic. Consider scheduling regular check-ins.",
        priority: "low",
        confidence: 0.7,
        actionable: true,
        relatedConversations: [],
        metadata: {
          dataPoints: [
            {
              metric: "communicationFrequency",
              value: 0,
              trend: "stable",
            },
          ],
          timeframe: {
            start: analytics.engagementData.firstActivity,
            end: analytics.engagementData.lastActivity,
          },
          affectedMetrics: ["engagementData"],
        },
        createdAt: new Date().toISOString(),
      });
    }

    // Sentiment insights
    const recentSentiment = analytics.sentimentTrend.slice(-5);
    const avgRecentSentiment =
      recentSentiment.reduce((sum, s) => sum + s.sentiment, 0) /
      recentSentiment.length;

    if (avgRecentSentiment < -0.3) {
      insights.push({
        id: `insight_sentiment_${Date.now()}`,
        type: "risk",
        title: "Declining Sentiment",
        description:
          "Recent conversations show negative sentiment. Consider addressing concerns proactively.",
        priority: "high",
        confidence: 0.9,
        actionable: true,
        relatedConversations: [],
        metadata: {
          dataPoints: [
            {
              metric: "sentiment",
              value: avgRecentSentiment,
              benchmark: 0,
              trend: "down",
            },
          ],
          timeframe: {
            start: recentSentiment[0]?.date || new Date().toISOString(),
            end:
              recentSentiment[recentSentiment.length - 1]?.date ||
              new Date().toISOString(),
          },
          affectedMetrics: ["sentimentTrend"],
        },
        createdAt: new Date().toISOString(),
      });
    }

    return insights;
  }

  /**
   * Calculate conversation health score
   */
  calculateConversationHealth(clientId: string): ConversationHealth {
    const analytics = this.calculateAnalytics(clientId);
    const insights = this.generateInsights(clientId);

    // Calculate individual factor scores (0-100)
    const responseTimeliness = Math.max(
      0,
      100 - (analytics.responseMetrics.averageResponseTime / 24) * 50,
    );
    const sentimentScore =
      (analytics.sentimentTrend
        .slice(-5)
        .reduce((sum, s) => sum + s.sentiment, 0) /
        5 +
        1) *
      50;
    const engagementLevel = Math.min(
      100,
      (analytics.engagementData.totalMessages / 10) * 20,
    );
    const issueResolution = analytics.actionItemsTracking.completionRate;
    const communicationClarity = 75; // Placeholder - would need more sophisticated analysis

    const overall =
      (responseTimeliness +
        sentimentScore +
        engagementLevel +
        issueResolution +
        communicationClarity) /
      5;

    return {
      overall,
      factors: {
        responseTimeliness: {
          score: responseTimeliness,
          trend: "stable",
          details: `Average response time: ${analytics.responseMetrics.averageResponseTime.toFixed(1)} hours`,
        },
        sentimentTrend: {
          score: sentimentScore,
          trend:
            sentimentScore > 60
              ? "improving"
              : sentimentScore < 40
                ? "declining"
                : "stable",
          details: `Recent sentiment average: ${((analytics.sentimentTrend.slice(-5).reduce((sum, s) => sum + s.sentiment, 0) / 5) * 100).toFixed(1)}%`,
        },
        engagementLevel: {
          score: engagementLevel,
          trend: "stable",
          details: `${analytics.engagementData.totalMessages} total messages`,
        },
        issueResolution: {
          score: issueResolution,
          trend: "stable",
          details: `${analytics.actionItemsTracking.completionRate.toFixed(1)}% completion rate`,
        },
        communicationClarity: {
          score: communicationClarity,
          trend: "stable",
          details: "Based on message complexity and follow-up questions",
        },
      },
      recommendations: [
        {
          category: "Response Time",
          suggestion: "Consider setting up automated acknowledgment responses",
          priority: responseTimeliness < 50 ? "high" : "medium",
          effort: "low",
        },
        {
          category: "Engagement",
          suggestion:
            "Schedule regular check-ins to maintain communication flow",
          priority: engagementLevel < 50 ? "high" : "low",
          effort: "medium",
        },
      ],
      riskFactors: insights
        .filter((insight) => insight.type === "risk")
        .map((insight) => ({
          factor: insight.title,
          severity:
            insight.priority === "urgent"
              ? ("critical" as const)
              : insight.priority === "high"
                ? ("high" as const)
                : insight.priority === "medium"
                  ? ("medium" as const)
                  : ("low" as const),
          description: insight.description,
          mitigation:
            insight.suggestedActions?.[0]?.description || "Monitor closely",
        })),
      lastCalculated: new Date().toISOString(),
    };
  }

  /**
   * Check if a word is a stop word (common words to ignore)
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "have",
      "has",
      "had",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "me",
      "him",
      "her",
      "us",
      "them",
    ];
    return stopWords.includes(word.toLowerCase());
  }
}

// Utility functions for external use
export function analyzeMessage(message: Message): MessageAnalysis {
  const sentiment = analyzeSentiment(message.content);
  const keyPhrases = extractKeyPhrases(message.content);
  const urgency = calculateUrgencyLevel(message.content);
  const actionItems = extractActionItems(message.content);

  return {
    id: `analysis_${message.id}`,
    messageId: message.id,
    sentiment,
    topics: [], // Simplified for now
    urgencyLevel: urgency,
    keyPhrases,
    entities: [], // Simplified for now
    actionItems,
    createdAt: new Date().toISOString(),
  };
}

function analyzeSentiment(text: string): MessageAnalysis["sentiment"] {
  // Simplified sentiment analysis
  const positiveWords = [
    "great",
    "excellent",
    "perfect",
    "love",
    "amazing",
    "fantastic",
    "wonderful",
    "good",
    "happy",
    "pleased",
    "thanks",
    "thank",
  ];
  const negativeWords = [
    "bad",
    "terrible",
    "awful",
    "hate",
    "horrible",
    "problem",
    "issue",
    "wrong",
    "disappointed",
    "frustrated",
    "angry",
    "upset",
  ];

  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  const emotionCounts = { positive: 0, negative: 0, neutral: 0 };

  words.forEach((word) => {
    if (positiveWords.includes(word)) {
      score += 1;
      emotionCounts.positive++;
    } else if (negativeWords.includes(word)) {
      score -= 1;
      emotionCounts.negative++;
    } else {
      emotionCounts.neutral++;
    }
  });

  const totalEmotionalWords = emotionCounts.positive + emotionCounts.negative;
  const normalizedScore =
    totalEmotionalWords > 0 ? score / totalEmotionalWords : 0;

  return {
    score: Math.max(-1, Math.min(1, normalizedScore)),
    confidence: Math.min(totalEmotionalWords / 5, 1),
    emotions: [
      { emotion: "positive", intensity: emotionCounts.positive / words.length },
      { emotion: "negative", intensity: emotionCounts.negative / words.length },
      { emotion: "neutral", intensity: emotionCounts.neutral / words.length },
    ],
  };
}

function extractKeyPhrases(text: string): MessageAnalysis["keyPhrases"] {
  const phrases = [
    { pattern: /can you (.*?)[\.\?!]?$/i, category: "request" as const },
    { pattern: /i need (.*?)[\.\?!]?$/i, category: "request" as const },
    { pattern: /problem with (.*?)[\.\?!]?$/i, category: "concern" as const },
    { pattern: /issue with (.*?)[\.\?!]?$/i, category: "concern" as const },
    { pattern: /when (.*?)[\.\?!]?$/i, category: "question" as const },
    { pattern: /how (.*?)[\.\?!]?$/i, category: "question" as const },
    {
      pattern: /great job|excellent work|love it/i,
      category: "compliment" as const,
    },
  ];

  const keyPhrases: MessageAnalysis["keyPhrases"] = [];

  phrases.forEach(({ pattern, category }) => {
    const matches = text.match(pattern);
    if (matches) {
      keyPhrases.push({
        phrase: matches[0],
        importance: 0.8,
        category,
      });
    }
  });

  return keyPhrases;
}

function calculateUrgencyLevel(text: string): number {
  const urgentKeywords = [
    { word: "urgent", weight: 5 },
    { word: "emergency", weight: 5 },
    { word: "asap", weight: 5 },
    { word: "immediately", weight: 4 },
    { word: "soon", weight: 3 },
    { word: "quick", weight: 3 },
    { word: "important", weight: 2 },
  ];

  const lowerText = text.toLowerCase();
  let urgencyScore = 1; // Base urgency

  urgentKeywords.forEach(({ word, weight }) => {
    if (lowerText.includes(word)) {
      urgencyScore = Math.max(urgencyScore, weight);
    }
  });

  // Check for multiple exclamation marks
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 2) urgencyScore = Math.max(urgencyScore, 3);

  // Check for all caps words
  const capsWords = text.match(/\b[A-Z]{3,}\b/g) || [];
  if (capsWords.length > 1) urgencyScore = Math.max(urgencyScore, 2);

  return Math.min(5, urgencyScore);
}

function extractActionItems(text: string): MessageAnalysis["actionItems"] {
  const actionPatterns = [
    /(?:please|can you|need to|should|must) (.*?)[\.\?!]/gi,
    /(?:follow up|schedule|arrange|confirm|check) (.*?)[\.\?!]/gi,
    /(?:by|before|until) (\w+day|\d+\/\d+|\w+ \d+)/gi,
  ];

  const actionItems: MessageAnalysis["actionItems"] = [];

  actionPatterns.forEach((pattern) => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const urgency = calculateUrgencyLevel(match[0]);
      actionItems.push({
        text: match[0],
        priority:
          urgency >= 4
            ? "urgent"
            : urgency >= 3
              ? "high"
              : urgency >= 2
                ? "medium"
                : "low",
        assignee:
          match[0].toLowerCase().includes("you") ||
          match[0].toLowerCase().includes("can you")
            ? "you"
            : "client",
      });
    }
  });

  return actionItems;
}

export { ConversationAnalyticsEngine as default };
