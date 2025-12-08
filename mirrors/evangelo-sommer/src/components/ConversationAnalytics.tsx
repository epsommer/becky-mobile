// src/components/ConversationAnalytics.tsx
"use client";

import { useState, useMemo } from "react";
import { Conversation } from "../types/client";
import ConversationAnalyticsEngine from "../lib/conversation-analytics";

interface ConversationAnalyticsProps {
  conversations: Conversation[];
  clientId?: string;
  timeRange?: {
    start: string;
    end: string;
  };
  className?: string;
}

type ViewMode = "overview" | "detailed" | "trends" | "health";

export default function ConversationAnalytics({
  conversations,
  clientId,
  timeRange,
  className = "",
}: ConversationAnalyticsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedTimeframe, setSelectedTimeframe] = useState("30d");

  // Filter conversations by timeframe
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    if (clientId) {
      filtered = filtered.filter((c) => c.clientId === clientId);
    }

    if (timeRange) {
      const start = new Date(timeRange.start);
      const end = new Date(timeRange.end);
      filtered = filtered.filter((c) => {
        const date = new Date(c.updatedAt);
        return date >= start && date <= end;
      });
    } else {
      // Apply selected timeframe
      const now = new Date();
      const startDate = new Date();

      switch (selectedTimeframe) {
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      filtered = filtered.filter((c) => new Date(c.updatedAt) >= startDate);
    }

    return filtered;
  }, [conversations, clientId, timeRange, selectedTimeframe]);

  // Analytics engine
  const analyticsEngine = useMemo(
    () => new ConversationAnalyticsEngine(filteredConversations),
    [filteredConversations],
  );

  const analytics = useMemo(
    () => analyticsEngine.calculateAnalytics(clientId),
    [analyticsEngine, clientId],
  );

  const health = useMemo(
    () =>
      clientId ? analyticsEngine.calculateConversationHealth(clientId) : null,
    [analyticsEngine, clientId],
  );

  const insights = useMemo(
    () => analyticsEngine.generateInsights(clientId),
    [analyticsEngine, clientId],
  );

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (score >= 40) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  if (filteredConversations.length === 0) {
    return (
      <div
        className={`bg-white rounded-lg shadow p-8 text-center ${className}`}
      >
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-tactical-grey-800 mb-2">
          No Data Available
        </h3>
        <p className="text-tactical-grey-500">
          No conversations found for the selected criteria.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-tactical-grey-800">
          Conversation Analytics
        </h2>
        <div className="flex items-center space-x-4">
          {/* Timeframe Selector */}
          {!timeRange && (
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          )}

          {/* View Mode Selector */}
          <div className="flex bg-tactical-grey-200 rounded-lg p-1">
            {[
              { key: "overview", name: "Overview" },
              { key: "detailed", name: "Detailed" },
              { key: "trends", name: "Trends" },
              ...(health ? [{ key: "health", name: "Health" }] : []),
            ].map((mode) => (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key as ViewMode)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === mode.key
                    ? "bg-white text-tactical-gold shadow-sm"
                    : "text-tactical-grey-500 hover:text-tactical-grey-800"
                }`}
              >
                {mode.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Mode */}
      {viewMode === "overview" && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-tactical-gold-muted rounded-lg p-4 border border-tactical-grey-300">
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold text-tactical-gold">
                  {analytics.engagementData.totalMessages}
                </div>
                <div className="text-tactical-grey-2000">💬</div>
              </div>
              <div className="text-sm text-tactical-brown-dark">Total Messages</div>
              <div className="text-xs text-tactical-gold mt-1">
                {analytics.engagementData.messagesFromYou} from you,{" "}
                {analytics.engagementData.messagesFromClient} from clients
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold text-green-600">
                  {formatDuration(
                    analytics.responseMetrics.averageResponseTime,
                  )}
                </div>
                <div className="text-green-500">⏱️</div>
              </div>
              <div className="text-sm text-green-800">Avg Response Time</div>
              <div className="text-xs text-green-600 mt-1">
                Fastest:{" "}
                {formatDuration(analytics.responseMetrics.fastestResponse)}
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(analytics.actionItemsTracking.completionRate)}%
                </div>
                <div className="text-purple-500">✅</div>
              </div>
              <div className="text-sm text-purple-800">Completion Rate</div>
              <div className="text-xs text-purple-600 mt-1">
                {analytics.actionItemsTracking.completedActionItems}/
                {analytics.actionItemsTracking.totalActionItems} completed
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold text-orange-600">
                  {analytics.topicAnalysis.keyTopics.length}
                </div>
                <div className="text-orange-500">🏷️</div>
              </div>
              <div className="text-sm text-orange-800">Topics Discussed</div>
              <div className="text-xs text-orange-600 mt-1">
                Most common:{" "}
                {analytics.topicAnalysis.keyTopics[0]?.topic || "N/A"}
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          {insights.length > 0 && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="font-medium text-tactical-grey-800 mb-4">Key Insights</h3>
              <div className="space-y-3">
                {insights.slice(0, 3).map((insight, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-tactical-grey-100 rounded-lg"
                  >
                    <div className="text-lg">
                      {insight.type === "opportunity"
                        ? "🎯"
                        : insight.type === "risk"
                          ? "⚠️"
                          : insight.type === "pattern"
                            ? "📈"
                            : "💡"}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-tactical-grey-800 text-sm">
                        {insight.title}
                      </div>
                      <div className="text-tactical-grey-500 text-sm">
                        {insight.description}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        insight.priority === "urgent"
                          ? "bg-red-100 text-red-800"
                          : insight.priority === "high"
                            ? "bg-orange-100 text-orange-800"
                            : insight.priority === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-tactical-grey-200 text-tactical-grey-700"
                      }`}
                    >
                      {insight.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Mode */}
      {viewMode === "detailed" && (
        <div className="space-y-6">
          {/* Communication Patterns */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="font-medium text-tactical-grey-800 mb-4">
              Communication Patterns
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-tactical-grey-600 mb-3">
                  Preferred Methods
                </h4>
                <div className="space-y-2">
                  {Object.entries({
                    email:
                      analytics.responseMetrics.responseTimeBySource.email || 0,
                    phone:
                      analytics.responseMetrics.responseTimeBySource.phone || 0,
                    text:
                      analytics.responseMetrics.responseTimeBySource.text || 0,
                    meeting:
                      analytics.responseMetrics.responseTimeBySource.meeting ||
                      0,
                  }).map(([method, time]) => (
                    <div
                      key={method}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-tactical-grey-600 capitalize">
                        {method}
                      </span>
                      <span className="text-sm font-medium text-tactical-grey-800">
                        {time > 0 ? formatDuration(time) : "N/A"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-tactical-grey-600 mb-3">
                  Best Response Times
                </h4>
                <div className="space-y-2">
                  {analytics.communicationPatterns.bestResponseTimes
                    .slice(0, 5)
                    .map((time, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-tactical-grey-600">
                          {time.hour}:00 - {time.hour + 1}:00
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-tactical-grey-300 rounded-full">
                            <div
                              className="h-full bg-tactical-gold-muted0 rounded-full"
                              style={{
                                width: `${(time.responseRate / Math.max(...analytics.communicationPatterns.bestResponseTimes.map((t) => t.responseRate))) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-tactical-grey-500">
                            {time.responseRate}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Items Breakdown */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="font-medium text-tactical-grey-800 mb-4">
              Action Items Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-tactical-gold">
                  {analytics.actionItemsTracking.totalActionItems}
                </div>
                <div className="text-sm text-tactical-grey-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.actionItemsTracking.completedActionItems}
                </div>
                <div className="text-sm text-tactical-grey-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {analytics.actionItemsTracking.pendingActionItems}
                </div>
                <div className="text-sm text-tactical-grey-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {analytics.actionItemsTracking.overdueActionItems}
                </div>
                <div className="text-sm text-tactical-grey-500">Overdue</div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-tactical-grey-600 mb-3">
                By Priority
              </h4>
              <div className="space-y-2">
                {Object.entries(
                  analytics.actionItemsTracking.actionsByPriority,
                ).map(([priority, count]) => (
                  <div
                    key={priority}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-tactical-grey-600 capitalize">
                      {priority}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-tactical-grey-300 rounded-full">
                        <div
                          className={`h-full rounded-full ${
                            priority === "urgent"
                              ? "bg-red-500"
                              : priority === "high"
                                ? "bg-orange-500"
                                : priority === "medium"
                                  ? "bg-yellow-500"
                                  : "bg-tactical-grey-1000"
                          }`}
                          style={{
                            width: `${(count / Math.max(...Object.values(analytics.actionItemsTracking.actionsByPriority))) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-tactical-grey-800 font-medium">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Topic Analysis */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="font-medium text-tactical-grey-800 mb-4">Topic Analysis</h3>
            <div className="space-y-3">
              {analytics.topicAnalysis.keyTopics
                .slice(0, 8)
                .map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-tactical-grey-600 capitalize">
                        {topic.topic}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          topic.sentiment > 0.3
                            ? "bg-green-100 text-green-700"
                            : topic.sentiment < -0.3
                              ? "bg-red-100 text-red-700"
                              : "bg-tactical-grey-200 text-tactical-grey-600"
                        }`}
                      >
                        {topic.sentiment > 0.3
                          ? "Positive"
                          : topic.sentiment < -0.3
                            ? "Negative"
                            : "Neutral"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-2 bg-tactical-grey-300 rounded-full">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${(topic.frequency / Math.max(...analytics.topicAnalysis.keyTopics.map((t) => t.frequency))) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-tactical-grey-500">
                        {topic.frequency}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Trends Mode */}
      {viewMode === "trends" && (
        <div className="space-y-6">
          {/* Sentiment Trend */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="font-medium text-tactical-grey-800 mb-4">Sentiment Trend</h3>
            <div className="space-y-3">
              {analytics.sentimentTrend.slice(-10).map((point, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-tactical-grey-500">
                    {new Date(point.date).toLocaleDateString()}
                  </span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 h-3 bg-tactical-grey-300 rounded-full">
                      <div
                        className={`h-full rounded-full ${
                          point.sentiment > 0.3
                            ? "bg-green-500"
                            : point.sentiment < -0.3
                              ? "bg-red-500"
                              : "bg-gray-400"
                        }`}
                        style={{
                          width: `${Math.abs(point.sentiment) * 100}%`,
                          marginLeft:
                            point.sentiment < 0
                              ? `${100 - Math.abs(point.sentiment) * 100}%`
                              : "0",
                        }}
                      />
                    </div>
                    <span className="text-sm text-tactical-grey-600 min-w-[3rem] text-right">
                      {point.sentiment > 0 ? "+" : ""}
                      {(point.sentiment * 100).toFixed(0)}%
                    </span>
                    <span className="text-xs text-tactical-grey-500">
                      ({point.messageCount} msgs)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Patterns */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="font-medium text-tactical-grey-800 mb-4">
              Activity Patterns
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-tactical-grey-600 mb-3">
                  Most Active Hours
                </h4>
                <div className="space-y-2">
                  {analytics.engagementData.activeHours
                    .slice(0, 5)
                    .map((hour, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-tactical-grey-600">
                          {hour}:00 - {hour + 1}:00
                        </span>
                        <div className="w-16 h-2 bg-tactical-gold-light rounded-full">
                          <div className="w-full h-full bg-tactical-gold-muted0 rounded-full" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-tactical-grey-600 mb-3">
                  Most Active Days
                </h4>
                <div className="space-y-2">
                  {analytics.engagementData.activeDays.map((day, index) => {
                    const dayNames = [
                      "Sun",
                      "Mon",
                      "Tue",
                      "Wed",
                      "Thu",
                      "Fri",
                      "Sat",
                    ];
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-tactical-grey-600">
                          {dayNames[day]}
                        </span>
                        <div className="w-16 h-2 bg-green-200 rounded-full">
                          <div className="w-full h-full bg-green-500 rounded-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-tactical-grey-800">
                  {formatDuration(
                    analytics.engagementData.conversationGaps.average,
                  )}
                </div>
                <div className="text-sm text-tactical-grey-500">Avg Gap</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-tactical-grey-800">
                  {Math.round(analytics.engagementData.messageLengthAverage)}
                </div>
                <div className="text-sm text-tactical-grey-500">Avg Length</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-tactical-grey-800 capitalize">
                  {analytics.communicationPatterns.communicationFrequency}
                </div>
                <div className="text-sm text-tactical-grey-500">Frequency</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health Mode */}
      {viewMode === "health" && health && (
        <div className="space-y-6">
          {/* Overall Health Score */}
          <div
            className={`text-center p-8 rounded-lg border-2 ${getHealthColor(health.overall)}`}
          >
            <div className="text-4xl font-bold mb-2">
              {Math.round(health.overall)}%
            </div>
            <div className="text-lg font-medium">
              Overall Conversation Health
            </div>
            <div className="text-sm opacity-75 mt-2">
              Last calculated:{" "}
              {new Date(health.lastCalculated).toLocaleDateString()}
            </div>
          </div>

          {/* Health Factors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(health.factors).map(([key, factor]) => (
              <div key={key} className="bg-white rounded-lg shadow border p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-tactical-grey-800 capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </h3>
                  <span className="text-lg font-bold text-tactical-grey-800">
                    {Math.round(factor.score)}%
                  </span>
                </div>

                <div className="w-full h-3 bg-tactical-grey-300 rounded-full mb-3">
                  <div
                    className={`h-full rounded-full ${
                      factor.score >= 80
                        ? "bg-green-500"
                        : factor.score >= 60
                          ? "bg-yellow-500"
                          : factor.score >= 40
                            ? "bg-orange-500"
                            : "bg-red-500"
                    }`}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-tactical-grey-500">{factor.details}</span>
                  <span
                    className={`font-medium ${
                      factor.trend === "improving"
                        ? "text-green-600"
                        : factor.trend === "declining"
                          ? "text-red-600"
                          : "text-tactical-grey-500"
                    }`}
                  >
                    {factor.trend === "improving"
                      ? "↗ Improving"
                      : factor.trend === "declining"
                        ? "↘ Declining"
                        : "→ Stable"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {health.recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="font-medium text-tactical-grey-800 mb-4">
                Recommendations
              </h3>
              <div className="space-y-3">
                {health.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 bg-tactical-gold-muted rounded-lg border border-tactical-grey-300"
                  >
                    <div className="text-tactical-gold mt-0.5">💡</div>
                    <div className="flex-1">
                      <div className="font-medium text-tactical-brown-dark text-sm">
                        {rec.category}
                      </div>
                      <div className="text-tactical-brown-dark text-sm">
                        {rec.suggestion}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          rec.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : rec.priority === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-tactical-grey-200 text-tactical-grey-600"
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          rec.effort === "high"
                            ? "bg-red-100 text-red-700"
                            : rec.effort === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {rec.effort} effort
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Factors */}
          {health.riskFactors.length > 0 && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="font-medium text-tactical-grey-800 mb-4">Risk Factors</h3>
              <div className="space-y-3">
                {health.riskFactors.map((risk, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="text-red-600 mt-0.5">⚠️</div>
                    <div className="flex-1">
                      <div className="font-medium text-red-900 text-sm">
                        {risk.factor}
                      </div>
                      <div className="text-red-800 text-sm mb-1">
                        {risk.description}
                      </div>
                      <div className="text-red-700 text-xs">
                        <strong>Mitigation:</strong> {risk.mitigation}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        risk.severity === "critical"
                          ? "bg-red-100 text-red-800"
                          : risk.severity === "high"
                            ? "bg-orange-100 text-orange-800"
                            : risk.severity === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-tactical-grey-200 text-tactical-grey-700"
                      }`}
                    >
                      {risk.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
