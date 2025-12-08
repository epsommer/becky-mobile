"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Pencil, Send, Sparkles, ArrowLeft, History } from "lucide-react";
import { Conversation, Client, Message } from "../../../types/client";
import { Button } from "../../../components/ui/button";
import CRMLayout from "../../../components/CRMLayout";
import { useConversations } from "../../../hooks/useConversations";
import ContextualSidebar from "../../../components/ContextualSidebar";
import BottomActionBar from "../../../components/BottomActionBar";
import SidebarDraftAndMessages from "../../../components/SidebarDraftAndMessages";
import SidebarConversationDetails from "../../../components/SidebarConversationDetails";
import SidebarInsights from "../../../components/SidebarInsights";
import SidebarSchedule from "../../../components/SidebarSchedule";
import SidebarBilling from "../../../components/SidebarBilling";
import AutoDraftTrigger from "../../../components/AutoDraftTrigger";
import AutoDraftPrompt from "../../../components/AutoDraftPrompt";
import EnhancedReceiptModal from "../../../components/EnhancedReceiptModal";
import TestimonialRequestModal from "../../../components/TestimonialRequestModal";
// Removed billingManager import - moved to API endpoints

export default function ConversationPage() {
  const params = useParams();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    status: 'ACTIVE' as 'ACTIVE' | 'ARCHIVED' | 'COMPLETED'
  });
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [messageEditData, setMessageEditData] = useState({
    content: '',
    role: 'CLIENT' as 'CLIENT' | 'YOU',
    timestamp: ''
  });
  const [selectedMessageForDraft, setSelectedMessageForDraft] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Track scroll position for header height adjustment
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 100);
    };

    handleScroll(); // Set initial value
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Use real-time conversations hook if client ID is available
  const { conversations: allConversations } = useConversations(client?.id || "");
  
  const conversationId = params.conversationId as string;

  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch conversation data
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (!response.ok) {
          throw new Error('Failed to load conversation');
        }

        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error(result.error || 'No conversation data received');
        }

        const conversationData = result.data;
        setConversation(conversationData);

        // Fetch client data if available
        if (conversationData.clientId) {
          try {
            const clientResponse = await fetch(`/api/clients/${conversationData.clientId}`);
            if (clientResponse.ok) {
              const clientResult = await clientResponse.json();
              if (clientResult.success && clientResult.data) {
                setClient(clientResult.data);
              }
            }
          } catch (clientError) {
            console.warn('Failed to load client data:', clientError);
            // Continue without client data
          }
        }
      } catch (err) {
        console.error('Error loading conversation:', err);
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [conversationId]);

  const analyzeMessage = (message: Message) => {
    if (!client || !conversation) return { shouldTrigger: false, confidence: 'low', serviceType: null, suggestedAmount: null, reason: 'Client or conversation not loaded' };
    
    // Simple client-side analysis - in production, this should be moved to an API endpoint
    const content = message.content.toLowerCase();
    const billingKeywords = ['invoice', 'bill', 'payment', 'charge', 'cost', 'price', 'paid', 'complete', 'finished', 'done'];
    const hasBillingKeywords = billingKeywords.some(keyword => content.includes(keyword));
    
    return {
      shouldTrigger: hasBillingKeywords,
      confidence: hasBillingKeywords ? 'medium' : 'low',
      serviceType: 'general',
      suggestedAmount: null,
      reason: hasBillingKeywords ? 'Message contains billing-related keywords' : 'No billing indicators found'
    };
  };

  const handleTriggerClick = (message: Message, suggestion: any) => {
    const analysis = analyzeMessage(message);
    setCurrentAnalysis(analysis);
    setSelectedMessage(message.id);
    setShowPrompt(true);
  };

  const handleAccept = () => {
    setShowPrompt(false);
    setShowModal(true);
  };

  const handleDecline = () => {
    setShowPrompt(false);
    setCurrentAnalysis(null);
    setSelectedMessage(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setCurrentAnalysis(null);
    setSelectedMessage(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setCurrentAnalysis(null);
    setSelectedMessage(null);
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
      medium: "bg-tactical-gold-muted text-tactical-brown-dark border-tactical-grey-300",
      low: "bg-tactical-grey-200 text-tactical-grey-700 border-tactical-grey-300",
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  if (loading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground font-primary uppercase tracking-wide">
              Loading conversation...
            </p>
          </div>
        </div>
      </CRMLayout>
    );
  }

  if (error || !conversation) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">💬</div>
            <h1 className="text-2xl font-bold text-foreground mb-2 font-primary uppercase tracking-wide">
              Conversation Not Found
            </h1>
            <p className="text-muted-foreground mb-4 font-primary">
              {error || "The conversation you're looking for doesn't exist."}
            </p>
            <Link
              href="/conversations"
              className="neo-button-active font-primary font-bold uppercase tracking-wide inline-flex items-center"
            >
              ← Back to Conversations
            </Link>
          </div>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="relative">
        {/* Contextual Sidebar - Desktop Only */}
        {client && (
          <ContextualSidebar
            conversation={conversation}
            client={client}
            conversationId={conversationId}
            selectedMessageId={selectedMessageForDraft}
            onSelectMessage={setSelectedMessageForDraft}
            onEditClick={() => {
              setEditFormData({
                title: conversation?.title || '',
                priority: (conversation?.priority?.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || 'MEDIUM',
                status: (conversation?.status?.toUpperCase() as 'ACTIVE' | 'ARCHIVED' | 'COMPLETED') || 'ACTIVE'
              });
              setShowEditModal(true);
            }}
            conversationSource={conversation?.source}
            onTestimonialClick={() => setShowTestimonialModal(true)}
            className="hidden lg:block"
          />
        )}

        {/* Main Content Area */}
        <div className="lg:pr-16">
          {/* Header with Navigation Buttons */}
          <div className="px-4 sm:px-6 pt-6 lg:pt-8 pb-4">
            <div className="max-w-4xl mx-auto lg:max-w-5xl flex items-center justify-between gap-4 flex-wrap">
              <Link
                href="/conversations"
                className="inline-flex items-center gap-2 text-[var(--neomorphic-accent)] hover:opacity-80 text-sm font-primary uppercase tracking-wide transition-opacity"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Conversations</span>
              </Link>

              {client && (
                <Link
                  href={`/clients/${client.id}/master`}
                  className="neo-button-active px-3 py-2 text-xs sm:text-sm font-primary uppercase tracking-wide flex items-center gap-2 transition-transform hover:scale-[1.02]"
                  title="View Master Timeline"
                >
                  <History className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Master Timeline</span>
                  <span className="sm:hidden">Master</span>
                </Link>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="px-4 sm:px-6 pb-6 lg:pb-8">
            <div className="max-w-4xl mx-auto lg:max-w-5xl">
              {/* Conversation Summary */}
          {conversation?.summary && (
            <div className="mb-8 p-6 neo-container">
              <h2 className="font-primary uppercase tracking-wide text-foreground font-bold mb-4">
                Conversation Summary
              </h2>
              <p className="text-foreground text-sm mb-4">{conversation.summary}</p>
              {conversation.tags && conversation.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {conversation.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="neo-badge-accent px-2 py-1 text-xs font-primary uppercase tracking-wide"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {conversation?.messages && conversation.messages.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground font-primary uppercase tracking-wide">
                  Conversation Messages
                </h2>
                <span className="text-sm text-muted-foreground font-primary">
                  {conversation.messages.length} messages
                </span>
              </div>
              
              <div className="space-y-4">
                {conversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "YOU" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      onClick={() => {
                        if (message.role === 'CLIENT') {
                          setSelectedMessageForDraft(
                            selectedMessageForDraft === message.id ? null : message.id
                          );
                        }
                      }}
                      className={`max-w-2xl p-4 rounded-xl border transition-all ${
                        message.role === "YOU"
                          ? "neo-card text-foreground"
                          : message.role === "CLIENT"
                          ? `neo-card text-foreground cursor-pointer ${
                              selectedMessageForDraft === message.id
                                ? "ring-2 ring-[var(--neomorphic-accent)]"
                                : ""
                            }`
                          : "neo-card text-foreground"
                      }`}
                      style={{
                        backgroundColor:
                          message.role === "CLIENT"
                            ? "rgba(34, 197, 94, 0.08)"
                            : message.role === "YOU"
                              ? "rgba(59, 130, 246, 0.08)"
                              : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold font-primary uppercase tracking-wide">
                            {message.role === "YOU" ? "You" : (client?.name || "Client")}
                          </span>
                          {/* Auto-draft trigger for client messages */}
                          {message.role === "CLIENT" && client && conversation && (() => {
                            const analysis = analyzeMessage(message);
                            const shouldShowTrigger = analysis.shouldTrigger ||
                              (analysis.serviceType && analysis.confidence !== 'low');

                            if (shouldShowTrigger) {
                              return (
                                <AutoDraftTrigger
                                  message={message}
                                  conversation={conversation}
                                  billingSuggestion={{
                                    type: analysis.serviceType ? 'receipt' : 'none',
                                    confidence: analysis.confidence as "low" | "medium" | "high",
                                    serviceType: analysis.serviceType ?? undefined,
                                    suggestedAmount: analysis.suggestedAmount ?? undefined,
                                    reason: analysis.reason
                                  }}
                                  onTriggerAutoDraft={handleTriggerClick}
                                  className="ml-2"
                                />
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground font-primary">
                            {isClient ? new Date(message.timestamp).toLocaleString() : 'Loading...'}
                          </span>
                          <button
                            onClick={() => {
                              setEditingMessage(message);
                              setMessageEditData({
                                content: message.content,
                                role: message.role?.toUpperCase() === 'YOU' ? 'YOU' : 'CLIENT',
                                timestamp: new Date(message.timestamp).toISOString().slice(0, 16)
                              });
                            }}
                            className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
                            title="Edit message"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>

                      {message.metadata && (
                        <div className="text-xs text-medium-grey space-y-1 mt-3">
                          {message.metadata.subject && (
                            <div className="font-space-grotesk uppercase tracking-wide">
                              Subject: {message.metadata.subject}
                            </div>
                          )}
                          {message.metadata.attachments && message.metadata.attachments.length > 0 && (
                            <div className="font-space-grotesk uppercase tracking-wide">
                              {message.metadata.attachments.length} Attachments
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-bold text-foreground mb-2 font-primary uppercase tracking-wide">
                No Messages Yet
              </h2>
              <p className="text-muted-foreground font-primary">
                Start a conversation to see messages here.
              </p>
              <button className="mt-4 neo-button-active font-primary uppercase tracking-wide">
                Add Message
              </button>
            </div>
          )}

          {/* Next Actions */}
          {conversation?.nextActions && conversation.nextActions.length > 0 && (
            <div className="mt-8 p-6 neo-container bg-accent/10">
              <h2 className="font-primary uppercase tracking-wide text-foreground font-bold mb-4">
                Next Actions
              </h2>
              <div className="space-y-3">
                {conversation.nextActions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 neo-card"
                  >
                    <input
                      type="checkbox"
                      className="border-2 border-border text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-foreground font-primary">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>

      {/* Auto-draft prompt */}
      {showPrompt && currentAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="neo-container p-6 max-w-lg mx-4">
            <h3 className="text-lg font-bold font-primary uppercase tracking-wide text-foreground mb-4">
              Auto-Draft Billing Suggestion
            </h3>
            <AutoDraftPrompt
              confidence={currentAnalysis.confidence}
              serviceType={currentAnalysis.serviceType}
              suggestedAmount={currentAnalysis.suggestedAmount}
              reason={currentAnalysis.reason}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onDismiss={handleDismiss}
            />
          </div>
        </div>
      )}

      {/* Enhanced Receipt Modal */}
      {showModal && client && conversation && (
        <EnhancedReceiptModal
          isOpen={showModal}
          onClose={handleModalClose}
          client={client}
          conversation={conversation}
          autoFillData={currentAnalysis && {
            serviceType: currentAnalysis.serviceType,
            suggestedAmount: currentAnalysis.suggestedAmount,
            confidence: currentAnalysis.confidence,
            reason: currentAnalysis.reason
          }}
          onReceiptCreated={(receipt) => {
            console.log('Receipt created:', receipt);
            alert(`Receipt ${receipt.receiptNumber} created successfully!`);
            handleModalClose();
          }}
        />
      )}

      {/* Edit Conversation Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="neo-container max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground font-primary uppercase tracking-wide mb-6">
                Edit Conversation
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2 font-primary uppercase tracking-wide">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="neomorphic-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2 font-primary uppercase tracking-wide">
                    Priority
                  </label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as any })}
                    className="neomorphic-input w-full"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2 font-primary uppercase tracking-wide">
                    Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="neomorphic-input w-full"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archived</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  className="neo-button flex-1 font-primary uppercase tracking-wide"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="neo-button-active flex-1 font-primary uppercase tracking-wide"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/conversations/${conversationId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(editFormData)
                      });

                      if (!response.ok) throw new Error('Failed to update');

                      const result = await response.json();
                      if (result.success && result.data) {
                        setConversation(result.data);
                        setShowEditModal(false);
                      } else {
                        throw new Error(result.error || 'Update failed');
                      }
                    } catch (err) {
                      console.error('Update error:', err);
                      alert('Failed to update conversation');
                    }
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="neo-container max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground font-primary uppercase tracking-wide mb-6">
                Edit Message
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2 font-primary uppercase tracking-wide">
                    Sender
                  </label>
                  <select
                    value={messageEditData.role}
                    onChange={(e) => setMessageEditData({ ...messageEditData, role: e.target.value as 'CLIENT' | 'YOU' })}
                    className="neomorphic-input w-full"
                  >
                    <option value="YOU">You</option>
                    <option value="CLIENT">{client?.name || 'Client'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2 font-primary uppercase tracking-wide">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={messageEditData.timestamp}
                    onChange={(e) => setMessageEditData({ ...messageEditData, timestamp: e.target.value })}
                    className="neomorphic-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2 font-primary uppercase tracking-wide">
                    Message Content
                  </label>
                  <textarea
                    value={messageEditData.content}
                    onChange={(e) => setMessageEditData({ ...messageEditData, content: e.target.value })}
                    rows={10}
                    className="neomorphic-input w-full resize-none"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  className="neo-button flex-1 font-primary uppercase tracking-wide"
                  onClick={() => {
                    setEditingMessage(null);
                    setMessageEditData({ content: '', role: 'CLIENT', timestamp: '' });
                  }}
                >
                  Cancel
                </button>
                <button
                  className="neo-button-active flex-1 font-primary uppercase tracking-wide"
                  onClick={async () => {
                    if (!editingMessage) return;

                    try {
                      const response = await fetch(`/api/conversations/${conversationId}/messages/${editingMessage.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          content: messageEditData.content,
                          role: messageEditData.role,
                          timestamp: new Date(messageEditData.timestamp).toISOString()
                        })
                      });

                      if (!response.ok) throw new Error('Failed to update message');

                      const result = await response.json();

                      // Update the message in the conversation state
                      if (conversation) {
                        const updatedMessages = conversation.messages?.map(msg =>
                          msg.id === editingMessage.id ? result.data : msg
                        );
                        setConversation({ ...conversation, messages: updatedMessages });
                      }

                      setEditingMessage(null);
                      setMessageEditData({ content: '', role: 'CLIENT', timestamp: '' });
                    } catch (err) {
                      console.error('Update error:', err);
                      alert('Failed to update message');
                    }
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Testimonial Request Modal */}
      {client && (
        <TestimonialRequestModal
          isOpen={showTestimonialModal}
          onClose={() => setShowTestimonialModal(false)}
          client={client}
          onRequestSent={() => {
            setShowTestimonialModal(false);
          }}
        />
      )}

      {/* Bottom Action Bar - Mobile Only */}
      {client && conversation && (
        <BottomActionBar
          messagesContent={
            <SidebarDraftAndMessages
              conversation={conversation}
              client={client}
              conversationId={conversationId}
              selectedMessageId={selectedMessageForDraft}
              onSelectMessage={setSelectedMessageForDraft}
              onMessageAdded={() => {
                // Refresh conversation data
                window.location.reload();
              }}
            />
          }
          detailsContent={
            <SidebarConversationDetails
              conversation={conversation}
              client={client}
              onEditClick={() => {
                setEditFormData({
                  title: conversation?.title || '',
                  priority: (conversation?.priority?.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || 'MEDIUM',
                  status: (conversation?.status?.toUpperCase() as 'ACTIVE' | 'ARCHIVED' | 'COMPLETED') || 'ACTIVE'
                });
                setShowEditModal(true);
              }}
              onTestimonialClick={() => setShowTestimonialModal(true)}
            />
          }
          insightsContent={
            <SidebarInsights
              conversation={conversation}
              client={client}
              onRequestTestimonial={() => setShowTestimonialModal(true)}
            />
          }
          scheduleContent={
            <SidebarSchedule conversation={conversation} client={client} />
          }
          billingContent={
            <SidebarBilling conversation={conversation} client={client} />
          }
        />
      )}
    </CRMLayout>
  );
}
