// src/app/clients/[clientId]/conversations/[conversationId]/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CRMLayout from "../../../../../components/CRMLayout";
import { clientManager } from "../../../../../lib/client-config";
import { getServiceById } from "../../../../../lib/service-config";
import { useConversations } from "../../../../../hooks/useConversations";
import {
  Client,
  Conversation,
  Message,
  MessageAnalysis,
  ConversationInsight,
} from "../../../../../types/client";
import { ScheduleRule } from "../../../../../types/scheduling";
import ConversationAnalyticsEngine, {
  analyzeMessage,
} from "../../../../../lib/conversation-analytics";
import FrequencyScheduler from "../../../../../components/FrequencyScheduler";
import ConversationAnalyticsComponent from "../../../../../components/ConversationAnalytics";
import ConversationBillingPanel from "../../../../../components/ConversationBillingPanel";
import ScheduleFollowUpForm from "../../../../../components/ScheduleFollowUpForm";
import { FollowUpResponse } from "../../../../../types/follow-up";

type TabType = "timeline" | "analytics" | "insights" | "schedule" | "billing";

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();

  const [client, setClient] = useState<Client | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const clientId = params.clientId as string;
  const conversationId = params.conversationId as string;
  
  // Use our database hook for real-time updates
  const { conversations: hookConversations, updateConversation, addMessage } = useConversations(clientId);
  const [activeTab, setActiveTab] = useState<TabType>("timeline");
  const [isEditing, setIsEditing] = useState(false);
  const [editedConversation, setEditedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messageAnalyses, setMessageAnalyses] = useState<
    Record<string, MessageAnalysis>
  >({});
  const [showScheduler, setShowScheduler] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [scheduledServices, setScheduledServices] = useState<any[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);

  // Analytics engine
  const analyticsEngine = useMemo(
    () => new ConversationAnalyticsEngine(allConversations),
    [allConversations],
  );

  // Calculate analytics for current conversation
  useMemo(
    () =>
      conversation
        ? analyticsEngine.calculateAnalytics(conversation.clientId)
        : null,
    [analyticsEngine, conversation],
  );

  const conversationHealth = useMemo(
    () =>
      conversation
        ? analyticsEngine.calculateConversationHealth(conversation.clientId)
        : null,
    [analyticsEngine, conversation],
  );

  const insights = useMemo(
    () =>
      conversation
        ? analyticsEngine.generateInsights(conversation.clientId)
        : [],
    [analyticsEngine, conversation],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    const loadClientAndConversation = async () => {
      if (!clientId || !conversationId) return;
      
      try {
        // First try to load client from localStorage
        let foundClient = await clientManager.getClient(clientId);

        // If not found in localStorage, try to fetch from API
        if (!foundClient) {
          console.log('Client not found in localStorage, fetching from API...');
          const response = await fetch(`/api/clients/${clientId}`);
          if (response.ok) {
            const result = await response.json();
            foundClient = result.data || result;
            console.log('✅ Client fetched from API:', foundClient);
          } else {
            console.error('Failed to fetch client from API:', response.status, response.statusText);
          }
        }
        
        setClient(foundClient);

        // Use hook conversations for real-time updates
        setAllConversations(hookConversations);

        // Find specific conversation from hook data
        const foundConversation = hookConversations.find((c) => c.id === conversationId);
        
        // Debug: Log message roles
        if (foundConversation && foundConversation.messages) {
          console.log('🔍 Debug: Message roles in conversation:', foundConversation.messages.map(m => ({ id: m.id, role: m.role, content: m.content.substring(0, 50) + '...' })));
        }
        
        setConversation(foundConversation || null);
        setEditedConversation(foundConversation || null);

        if (foundConversation) {
          // Analyze messages
          const analyses: Record<string, MessageAnalysis> = {};
          foundConversation.messages.forEach((message) => {
            analyses[message.id] = analyzeMessage(message);
          });
          setMessageAnalyses(analyses);
        }
      } catch (error) {
        console.error('Error loading client and conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadClientAndConversation();
  }, [clientId, conversationId, hookConversations]);

  // Load scheduled services for this client
  useEffect(() => {
    if (client) {
      try {
        const allScheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
        const clientSchedules = allScheduledServices.filter((service: any) => 
          service.clientId === client.id || service.clientName === client.name
        );
        setScheduledServices(clientSchedules);
        console.log('📅 Loaded scheduled services for client:', clientSchedules.length);
      } catch (error) {
        console.error('Error loading scheduled services for conversation:', error);
      }
    }
  }, [client, activeTab]);

  const handleSave = async () => {
    if (editedConversation) {
      try {
        // Update via database hook
        await updateConversation(editedConversation.id, editedConversation);
        setConversation(editedConversation);
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to save conversation:', error);
        alert('Failed to save conversation. Please try again.');
      }
    }
  };

  const handleAddMessage = async () => {
    if (!newMessage.trim() || !conversation) return;

    try {
      const messageData = {
        role: "you" as const,
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        type: "text" as const,
      };

      // Add message via database hook
      const createdMessage = await addMessage(conversation.id, messageData);
      
      if (createdMessage) {
        // Update local conversation state
        const updatedConversation = {
          ...conversation,
          messages: [...(conversation.messages || []), createdMessage],
          updatedAt: new Date().toISOString(),
        };
        
        setConversation(updatedConversation);
        setEditedConversation(updatedConversation);
        setNewMessage("");

        // Analyze new message
        setMessageAnalyses((prev) => ({
          ...prev,
          [createdMessage.id]: analyzeMessage(createdMessage),
        }));
      }
    } catch (error) {
      console.error('Failed to add message:', error);
      alert('Failed to add message. Please try again.');
    }
  };

  const handleScheduleFollowUp = (rule: ScheduleRule) => {
    // In a real implementation, this would save the schedule rule
    console.log("Schedule follow-up rule:", rule);
    setShowScheduler(false);
  };

  // Handle schedule modal completion
  const handleScheduleComplete = (response: FollowUpResponse) => {
    console.log("Schedule completed:", response);
    setScheduleSuccess(`Schedule created successfully for ${client?.name}!`);
    setTimeout(() => setScheduleSuccess(null), 5000);
    // Reload schedules to show the new one
    if (client) {
      const allScheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
      const clientSchedules = allScheduledServices.filter((service: any) => 
        service.clientId === client.id || service.clientName === client.name
      );
      setScheduledServices(clientSchedules);
    }
  };

  // Handle editing a scheduled service
  const handleEditSchedule = (schedule: any) => {
    setEditingSchedule(schedule);
  };

  // Handle updating a scheduled service
  const handleUpdateSchedule = (updatedSchedule: any) => {
    try {
      const allScheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
      const updatedServices = allScheduledServices.map((service: any) => 
        service.id === updatedSchedule.id ? updatedSchedule : service
      );
      localStorage.setItem('scheduled-services', JSON.stringify(updatedServices));
      
      // Update local state
      setScheduledServices(prev => prev.map(service => 
        service.id === updatedSchedule.id ? updatedSchedule : service
      ));
      
      setEditingSchedule(null);
      console.log('✅ Schedule updated successfully');
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  // Handle deleting a scheduled service
  const handleDeleteSchedule = (scheduleId: string) => {
    if (confirm('Are you sure you want to delete this scheduled service?')) {
      try {
        const allScheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
        const updatedServices = allScheduledServices.filter((service: any) => service.id !== scheduleId);
        localStorage.setItem('scheduled-services', JSON.stringify(updatedServices));
        
        // Update local state
        setScheduledServices(prev => prev.filter(service => service.id !== scheduleId));
        console.log('✅ Schedule deleted successfully');
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
  };

  const getSourceIcon = (source?: string) => {
    const icons = {
      email: "📧",
      text: "💬",
      phone: "📞",
      meeting: "🤝",
      import: "📥",
      manual: "✏️",
    };
    return icons[source as keyof typeof icons] || "💬";
  };

  const getPriorityColor = (priority?: string) => {
    const colors = {
      urgent: "bg-red-100 text-red-800 border-red-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      medium: "bg-tactical-gold-100 text-tactical-brown-800 border-tactical-gold200",
      low: "bg-tactical-grey-200 text-tactical-grey-700 border-tactical-grey-300",
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (score >= 40) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  if (status === "loading" || isLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-hud-border-accent border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">LOADING CONVERSATION...</p>
          </div>
        </div>
      </CRMLayout>
    );
  }

  if (!client) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase tracking-wide">
              CLIENT NOT FOUND
            </h1>
            <p className="text-medium-grey mb-4 font-space-grotesk">
              THE CLIENT YOU'RE LOOKING FOR DOESN'T EXIST.
            </p>
            <Link
              href="/clients"
              className="inline-flex items-center px-4 py-2 bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-space-grotesk font-bold uppercase tracking-wide"
            >
              ← BACK TO CLIENTS
            </Link>
          </div>
        </div>
      </CRMLayout>
    );
  }

  if (!conversation) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">💬</div>
            <h1 className="text-2xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase tracking-wide">
              CONVERSATION NOT FOUND
            </h1>
            <p className="text-medium-grey mb-4 font-space-grotesk">
              THE CONVERSATION YOU'RE LOOKING FOR DOESN'T EXIST.
            </p>
            <Link
              href={`/clients/${clientId}`}
              className="inline-flex items-center px-4 py-2 bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-space-grotesk font-bold uppercase tracking-wide"
            >
              ← BACK TO CLIENT
            </Link>
          </div>
        </div>
      </CRMLayout>
    );
  }

  const service = getServiceById(client.serviceId);

  return (
    <CRMLayout>
      {/* Page Header */}
      <div className="bg-hud-background-secondary p-6 border-b-2 border-hud-border-accent mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={`/clients/${clientId}`}
              className="text-gold hover:text-gold-dark font-space-grotesk font-bold uppercase tracking-wide"
            >
              ← BACK TO {client.name.toUpperCase()}
            </Link>
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {getSourceIcon(conversation.source)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-hud-text-primary font-space-grotesk uppercase tracking-wide">
                  {(conversation.title ||
                    `${conversation.source} conversation`).toUpperCase()}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-medium-grey font-space-grotesk uppercase tracking-wide">
                  <span>WITH {client.name.toUpperCase()}</span>
                  <span>•</span>
                  <span>{conversation.messages.length} MESSAGES</span>
                  <span>•</span>
                  <span>
                    {new Date(conversation.updatedAt).toLocaleDateString().toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 text-sm font-bold border-2 font-space-grotesk uppercase tracking-wide ${getPriorityColor(conversation.priority)}`}
            >
              {conversation.priority?.toUpperCase()}
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 text-sm bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-space-grotesk font-bold uppercase tracking-wide"
            >
              {isEditing ? "CANCEL EDIT" : "EDIT"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { key: "timeline", name: "Timeline", icon: "📅" },
              { key: "analytics", name: "Analytics", icon: "📊" },
              { key: "insights", name: "Insights", icon: "💡" },
              { key: "schedule", name: "Schedule", icon: "⏰" },
              { key: "billing", name: "Billing", icon: "💰" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.key
                    ? "border-tactical-gold500 text-tactical-brown-600"
                    : "border-transparent text-tactical-grey-500 hover:text-tactical-grey-600 hover:border-tactical-grey-400"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            {/* Conversation Summary */}
            <div className="bg-tactical-gold-50 border border-tactical-gold200 rounded-lg p-6">
              <h3 className="font-medium text-tactical-brown-900 mb-2">
                Conversation Summary
              </h3>
              <p className="text-tactical-brown-800 text-sm">
                {editedConversation?.summary || "No summary available"}
              </p>
              {editedConversation?.tags &&
                editedConversation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {editedConversation.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-tactical-gold-100 text-tactical-brown-700 text-xs rounded-full border border-tactical-gold300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
            </div>

            {/* Messages Timeline */}
            <div className="space-y-4">
              <h3 className="font-medium text-tactical-grey-800 mb-4">
                Message Timeline
              </h3>
              {editedConversation?.messages.map((message) => {
                const analysis = messageAnalyses[message.id];
                return (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "client" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-3xl rounded-lg p-4 ${
                        message.role === "client"
                          ? "bg-tactical-gold-600 text-white"
                          : "bg-tactical-grey-200 text-tactical-grey-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium opacity-90">
                          {message.role === "client" ? "You" : client.name}
                        </span>
                        <span className="text-xs opacity-75">
                          {new Date(message.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>

                      {analysis && (
                        <div className="mt-3 pt-3 border-t border-opacity-20">
                          <div className="flex flex-wrap gap-2">
                            {analysis.urgencyLevel > 3 && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                Urgent ({analysis.urgencyLevel}/5)
                              </span>
                            )}
                            {analysis.sentiment.score > 0.3 && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                Positive Sentiment
                              </span>
                            )}
                            {analysis.sentiment.score < -0.3 && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                Negative Sentiment
                              </span>
                            )}
                            {analysis.actionItems.length > 0 && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                {analysis.actionItems.length} Action Items
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {message.metadata && (
                        <div className="mt-2 text-xs opacity-75">
                          {message.metadata.subject && (
                            <div>Subject: {message.metadata.subject}</div>
                          )}
                          {message.metadata.attachments &&
                            message.metadata.attachments.length > 0 && (
                              <div>
                                {message.metadata.attachments.length}{" "}
                                attachments
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Message */}
            {isEditing && (
              <div className="bg-tactical-grey-100 rounded-lg p-6">
                <h4 className="font-medium text-tactical-grey-800 mb-3">Add Message</h4>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold focus:border-tactical-gold text-tactical-grey-800 bg-white"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-tactical-gold-600 text-white rounded-lg hover:bg-tactical-gold-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Message
                  </button>
                </div>
              </div>
            )}

            {/* Next Actions */}
            {editedConversation?.nextActions &&
              editedConversation.nextActions.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-medium text-tactical-grey-800 mb-3">
                    Next Actions
                  </h3>
                  <ul className="space-y-2">
                    {editedConversation.nextActions.map((action, index) => (
                      <li
                        key={index}
                        className="flex items-center space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-tactical-grey-400 text-tactical-brown-600 focus:ring-tactical-gold-500"
                        />
                        <span className="text-sm text-tactical-grey-600">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Save Button */}
            {isEditing && (
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <ConversationAnalyticsComponent
            conversations={[conversation]}
            clientId={clientId}
            className="space-y-6"
          />
        )}

        {/* Insights Tab */}
        {activeTab === "insights" && (
          <div className="space-y-6">
            {/* Conversation Health Score */}
            {conversationHealth && (
              <div className="bg-white rounded-lg shadow border p-6">
                <h3 className="font-medium text-tactical-grey-800 mb-4">
                  Conversation Health
                </h3>
                <div
                  className={`text-center p-6 rounded-lg border-2 ${getHealthColor(conversationHealth.overall)}`}
                >
                  <div className="text-3xl font-bold mb-2">
                    {Math.round(conversationHealth.overall)}%
                  </div>
                  <div className="text-sm font-medium">
                    Overall Health Score
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {Object.entries(conversationHealth.factors).map(
                    ([key, factor]) => (
                      <div key={key} className="p-4 bg-tactical-grey-100 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-tactical-grey-600 capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className="text-sm font-bold text-tactical-grey-800">
                            {Math.round(factor.score)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-tactical-grey-300 rounded-full">
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
                        <p className="text-xs text-tactical-grey-500 mt-2">
                          {factor.details}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Insights List */}
            <div className="space-y-4">
              <h3 className="font-medium text-tactical-grey-800">Generated Insights</h3>
              {insights.length === 0 ? (
                <div className="text-center py-8 text-tactical-grey-500">
                  <div className="text-4xl mb-2">💡</div>
                  <p>
                    No insights available yet. More conversation data needed.
                  </p>
                </div>
              ) : (
                insights.map((insight: ConversationInsight, index: number) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg shadow border p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {insight.type === "opportunity"
                            ? "🎯"
                            : insight.type === "risk"
                              ? "⚠️"
                              : insight.type === "pattern"
                                ? "📈"
                                : insight.type === "suggestion"
                                  ? "💡"
                                  : "🔍"}
                        </span>
                        <h4 className="font-medium text-tactical-grey-800">
                          {insight.title}
                        </h4>
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

                    <p className="text-sm text-tactical-grey-600 mb-4">
                      {insight.description}
                    </p>

                    {insight.suggestedActions &&
                      insight.suggestedActions.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-tactical-grey-800">
                            Suggested Actions:
                          </h5>
                          {insight.suggestedActions.map(
                            (action, actionIndex: number) => (
                              <div
                                key={actionIndex}
                                className="flex items-center justify-between p-3 bg-tactical-gold-50 rounded-lg"
                              >
                                <div>
                                  <div className="text-sm font-medium text-tactical-brown-900">
                                    {action.action}
                                  </div>
                                  <div className="text-xs text-tactical-brown-700">
                                    {action.description}
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <span
                                    className={`px-2 py-1 text-xs rounded ${
                                      action.effort === "high"
                                        ? "bg-red-100 text-red-700"
                                        : action.effort === "medium"
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-green-100 text-green-700"
                                    }`}
                                  >
                                    {action.effort} effort
                                  </span>
                                  <span
                                    className={`px-2 py-1 text-xs rounded ${
                                      action.impact === "high"
                                        ? "bg-green-100 text-green-700"
                                        : action.impact === "medium"
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-tactical-grey-200 text-tactical-grey-600"
                                    }`}
                                  >
                                    {action.impact} impact
                                  </span>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="font-medium text-tactical-grey-800 mb-2">
                Schedule Follow-ups
              </h3>
              <p className="text-sm text-tactical-grey-500">
                Set up recurring follow-ups based on this conversation.
              </p>
            </div>

            {/* Success Message */}
            {scheduleSuccess && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 text-xl">✅</span>
                  <p className="text-green-700 font-space-grotesk font-bold">
                    {scheduleSuccess}
                  </p>
                </div>
              </div>
            )}

            {/* Existing Scheduled Services */}
            {scheduledServices.length > 0 && (
              <div className="bg-white rounded-lg shadow border p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-tactical-grey-800">
                    Scheduled Services ({scheduledServices.length})
                  </h4>
                  <div className="text-sm text-tactical-grey-500">
                    Click to edit or delete
                  </div>
                </div>
                
                <div className="space-y-3">
                  {scheduledServices.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="border border-tactical-grey-300 rounded-lg p-4 hover:bg-tactical-grey-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="text-lg">🗓️</div>
                          <div>
                            <h5 className="font-medium text-tactical-grey-800">
                              {schedule.service} - {schedule.clientName}
                            </h5>
                            <p className="text-sm text-tactical-grey-500">
                              {new Date(schedule.scheduledDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })} at {new Date(schedule.scheduledDate).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            schedule.priority === 'high' ? 'bg-red-100 text-red-800' :
                            schedule.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {schedule.priority?.toUpperCase() || 'MEDIUM'}
                          </span>
                          <button
                            onClick={() => handleEditSchedule(schedule)}
                            className="p-1 text-tactical-brown-600 hover:text-tactical-brown-800"
                            title="Edit schedule"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete schedule"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      {schedule.notes && (
                        <div className="mt-2 text-sm text-tactical-grey-500 bg-tactical-grey-100 p-2 rounded">
                          <strong>Notes:</strong> {schedule.notes}
                        </div>
                      )}
                      
                      <div className="mt-2 flex items-center text-xs text-tactical-grey-500 space-x-4">
                        <span>Duration: {schedule.duration || 60} minutes</span>
                        <span>Status: {schedule.status || 'PENDING'}</span>
                        {schedule.recurrence && schedule.recurrence !== 'NONE' && (
                          <span>Recurrence: {schedule.recurrence}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!showScheduler ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⏰</div>
                <h4 className="text-lg font-medium text-tactical-grey-800 mb-2">
                  Schedule Recurring Follow-ups
                </h4>
                <p className="text-tactical-grey-500 mb-6">
                  Create automated follow-up reminders based on this
                  conversation.
                </p>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="px-6 py-3 bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-space-grotesk font-bold uppercase tracking-wide"
                >
                  Set Up Schedule
                </button>
                <div className="mt-4">
                  <button
                    onClick={() => setShowScheduler(true)}
                    className="px-4 py-2 text-sm bg-tactical-gold-100 text-tactical-brown-700 hover:bg-tactical-gold-200 font-space-grotesk font-bold uppercase tracking-wide"
                  >
                    Advanced Scheduler
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow border p-6">
                  <FrequencyScheduler
                    onRuleChange={handleScheduleFollowUp}
                    showPreview={true}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowScheduler(false)}
                    className="px-4 py-2 text-tactical-grey-600 border border-tactical-grey-400 rounded-lg hover:bg-tactical-grey-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Suggested Follow-up Times */}
            <div className="bg-tactical-gold-50 border border-tactical-gold200 rounded-lg p-4">
              <h4 className="font-medium text-tactical-brown-900 mb-3">
                Smart Suggestions
              </h4>
              <div className="space-y-2">
                <div className="text-sm text-tactical-brown-800">
                  Based on this conversation&apos;s urgency and your
                  communication patterns:
                </div>
                <ul className="text-sm text-tactical-brown-700 space-y-1 ml-4">
                  <li>• Follow up in 3 days for medium priority items</li>
                  <li>• Schedule weekly check-ins for ongoing projects</li>
                  <li>• Set reminders before important deadlines</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <ConversationBillingPanel 
              conversation={conversation}
              client={client}
            />
          </div>
        )}
      </div>

      {/* Schedule Follow-Up Modal */}
      <ScheduleFollowUpForm
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setScheduleSuccess(null);
        }}
        clientId={clientId}
        clientName={client.name}
        onScheduleComplete={(response: FollowUpResponse) => {
          if (response.success && response.data) {
            const scheduledDate = new Date(response.data.scheduledDate).toLocaleDateString();
            const scheduledTime = new Date(response.data.scheduledDate).toLocaleTimeString();
            setScheduleSuccess(
              `Follow-up scheduled for ${scheduledDate} at ${scheduledTime}`
            );
            // Also use the shared handler to reload schedules
            handleScheduleComplete(response);
            // Clear success message after 5 seconds
            setTimeout(() => setScheduleSuccess(null), 5000);
          }
        }}
      />

      {/* Edit Schedule Modal */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-tactical-grey-800 mb-4">
              Edit Scheduled Service
            </h3>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedSchedule = {
                  ...editingSchedule,
                  service: formData.get('service'),
                  scheduledDate: formData.get('date') + 'T' + formData.get('time'),
                  notes: formData.get('notes'),
                  priority: formData.get('priority'),
                  duration: parseInt(formData.get('duration') as string) || 60,
                  recurrence: formData.get('recurrence')
                };
                handleUpdateSchedule(updatedSchedule);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Service Type
                </label>
                <input
                  type="text"
                  name="service"
                  defaultValue={editingSchedule.service}
                  className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold focus:border-tactical-gold"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingSchedule.scheduledDate.split('T')[0]}
                    className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold focus:border-tactical-gold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    name="time"
                    defaultValue={editingSchedule.scheduledDate.split('T')[1]?.substring(0, 5) || '09:00'}
                    className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold focus:border-tactical-gold"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    defaultValue={editingSchedule.priority || 'medium'}
                    className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold focus:border-tactical-gold"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    defaultValue={editingSchedule.duration || 60}
                    min="15"
                    max="480"
                    step="15"
                    className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold focus:border-tactical-gold"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Recurrence
                </label>
                <select
                  name="recurrence"
                  defaultValue={editingSchedule.recurrence || 'NONE'}
                  className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold focus:border-tactical-gold"
                >
                  <option value="NONE">No Recurrence</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Bi-weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  defaultValue={editingSchedule.notes || ''}
                  rows={3}
                  className="w-full p-2 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold focus:border-tactical-gold"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="px-4 py-2 text-tactical-grey-600 border border-tactical-grey-400 rounded hover:bg-tactical-grey-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-tactical-gold-600 text-white rounded hover:bg-tactical-gold-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CRMLayout>
  );
}
