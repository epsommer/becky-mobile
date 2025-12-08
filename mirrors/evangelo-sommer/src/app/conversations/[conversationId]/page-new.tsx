"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Conversation, Client } from "../../../types/client";
import { Button } from "../../../components/ui/button";
import ConversationLayout from "../../../components/ConversationLayout";
import { useConversations } from "../../../hooks/useConversations";

export default function ConversationPage() {
  const params = useParams();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
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
      <div className="min-h-screen bg-hud-background-secondary">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hud-border-accent mx-auto mb-4"></div>
              <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">
                Loading conversation...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-hud-background-secondary">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h1 className="text-2xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase tracking-wide">
                Conversation Not Found
              </h1>
              <p className="text-medium-grey mb-4 font-space-grotesk">
                {error || "The conversation you're looking for doesn't exist."}
              </p>
              <Link
                href="/conversations"
                className="inline-flex items-center px-4 py-2 bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-space-grotesk font-bold uppercase tracking-wide"
              >
                ← Back to Conversations
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConversationLayout conversation={conversation} client={client}>
      {/* Header */}
      <div className="bg-white border-b-2 border-hud-border-accent sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left side - Navigation & Title */}
            <div className="flex items-center space-x-4">
              <Link
                href="/conversations"
                className="text-gold hover:text-gold-dark font-space-grotesk font-bold uppercase tracking-wide transition-colors"
              >
                ← Back to Conversations
              </Link>
              <div className="hidden lg:block w-px h-6 bg-light-grey"></div>
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {getSourceIcon(conversation?.source)}
                </div>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-hud-text-primary font-space-grotesk uppercase tracking-wide">
                    {(conversation?.title || 
                      `${conversation?.source || 'Conversation'}`).toUpperCase()}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-medium-grey font-space-grotesk uppercase tracking-wide">
                    {client && <span>WITH {client.name.toUpperCase()}</span>}
                    {client && <span>•</span>}
                    <span>{conversation?.messages?.length || 0} MESSAGES</span>
                    <span>•</span>
                    <span>
                      {conversation?.updatedAt ? new Date(conversation.updatedAt).toLocaleDateString().toUpperCase() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side - Priority & Actions */}
            <div className="flex items-center space-x-3">
              {conversation?.priority && (
                <span
                  className={`px-3 py-1 text-xs font-bold border-2 font-space-grotesk uppercase tracking-wide ${getPriorityColor(conversation.priority)}`}
                >
                  {conversation.priority.toUpperCase()}
                </span>
              )}
              <Button variant="outline" size="sm">Edit</Button>
              <Button variant="default" size="sm">Actions</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 lg:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Conversation Summary */}
          {conversation?.summary && (
            <div className="mb-8 p-6 bg-white border-2 border-hud-border">
              <h2 className="font-space-grotesk uppercase tracking-wide text-hud-text-primary font-bold mb-4">
                Conversation Summary
              </h2>
              <p className="text-hud-text-primary text-sm mb-4">{conversation.summary}</p>
              {conversation.tags && conversation.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {conversation.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-tactical-gold text-hud-text-primary text-xs border border-hud-border-accent-dark font-space-grotesk uppercase tracking-wide"
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
                <h2 className="text-xl font-bold text-hud-text-primary font-space-grotesk uppercase tracking-wide">
                  Conversation Messages
                </h2>
                <span className="text-sm text-medium-grey font-space-grotesk">
                  {conversation.messages.length} messages
                </span>
              </div>
              
              <div className="space-y-4">
                {conversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "you" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-2xl p-4 border-2 ${
                        message.role === "you"
                          ? "bg-tactical-gold text-hud-text-primary border-hud-border-accent-dark"
                          : "bg-white text-hud-text-primary border-hud-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold font-space-grotesk uppercase tracking-wide">
                          {message.role === "you" ? "You" : (client?.name || "Client")}
                        </span>
                        <span className="text-xs text-medium-grey font-space-grotesk">
                          {isClient ? new Date(message.timestamp).toLocaleString() : 'Loading...'}
                        </span>
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
              <h2 className="text-xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase tracking-wide">
                No Messages Yet
              </h2>
              <p className="text-medium-grey font-space-grotesk">
                Start a conversation to see messages here.
              </p>
              <Button className="mt-4" variant="default">
                Add Message
              </Button>
            </div>
          )}

          {/* Next Actions */}
          {conversation?.nextActions && conversation.nextActions.length > 0 && (
            <div className="mt-8 p-6 bg-tactical-gold-light border-2 border-hud-border-accent">
              <h2 className="font-space-grotesk uppercase tracking-wide text-hud-text-primary font-bold mb-4">
                Next Actions
              </h2>
              <div className="space-y-3">
                {conversation.nextActions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 bg-white border border-hud-border-accent"
                  >
                    <input
                      type="checkbox"
                      className="border-2 border-hud-border-accent text-gold focus:ring-gold"
                    />
                    <span className="text-sm text-hud-text-primary font-space-grotesk">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ConversationLayout>
  );
}