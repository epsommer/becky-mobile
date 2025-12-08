"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CRMLayout from '@/components/CRMLayout';
import { Client, Conversation, Message } from '@/types/client';
import { BillingSuggestion } from '@/types/billing';
import { ArrowLeft, Filter, MessageSquare, Mail, Phone, Calendar, Edit2, ListChecks, Star } from 'lucide-react';
import ContextualSidebar from '@/components/ContextualSidebar';
import BottomActionBar from '@/components/BottomActionBar';
import SidebarConversationDetails from '@/components/SidebarConversationDetails';
import SidebarInsights from '@/components/SidebarInsights';
import SidebarSchedule from '@/components/SidebarSchedule';
import SidebarBilling from '@/components/SidebarBilling';

// Extended message type with source conversation info
interface MasterMessage extends Message {
  conversationId: string;
  conversationTitle: string;
  messageType: 'sms' | 'email' | 'phone' | 'other';
}

// Timeline item that can be either a message or testimonial
interface TimelineItem {
  type: 'message' | 'testimonial';
  timestamp: string;
  data: MasterMessage | any; // any for testimonial
}

type MessageTypeFilter = 'all' | 'sms' | 'email' | 'phone' | 'other';

export default function MasterConversationPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const [client, setClient] = useState<Client | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [mergedMessages, setMergedMessages] = useState<MasterMessage[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<MessageTypeFilter>('all');
  const [isClient, setIsClient] = useState(false);

  // Sidebar and interaction states
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MasterMessage | null>(null);
  const [autoDetailsMessage, setAutoDetailsMessage] = useState<Message | null>(null);
  const [autoDetailsSuggestion, setAutoDetailsSuggestion] = useState<BillingSuggestion | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarState, setSidebarState] = useState<{ isOpen: boolean; width: number }>({
    isOpen: false,
    width: 0
  });
  const [reassignMode, setReassignMode] = useState(false);
  const [selectedMessagesForReassign, setSelectedMessagesForReassign] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Merge messages and testimonials into timeline
  useEffect(() => {
    const items: TimelineItem[] = [];

    // Add all messages
    mergedMessages.forEach(msg => {
      items.push({
        type: 'message',
        timestamp: msg.timestamp,
        data: msg
      });
    });

    // Add all testimonials
    testimonials.forEach(testimonial => {
      items.push({
        type: 'testimonial',
        timestamp: testimonial.createdAt || testimonial.requestedAt,
        data: testimonial
      });
    });

    // Sort by timestamp (newest first)
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setTimelineItems(items);
  }, [mergedMessages, testimonials]);

  // Callback handlers for sidebar
  const handleAutoDetails = useCallback((message: Message, suggestion: BillingSuggestion) => {
    setAutoDetailsMessage(message);
    setAutoDetailsSuggestion(suggestion);
  }, []);

  const handleSidebarStateChange = useCallback((isOpen: boolean, width: number) => {
    setSidebarState({ isOpen, width });
  }, []);

  const handleMessageSelect = useCallback((message: MasterMessage | null) => {
    setSelectedMessage(message);
    setSelectedMessageId(message?.id || null);
  }, []);

  // Reassignment mode handlers
  const toggleReassignMode = useCallback(() => {
    setReassignMode(prev => !prev);
    setSelectedMessagesForReassign(new Set());
  }, []);

  const toggleMessageSelection = useCallback((messageId: string) => {
    setSelectedMessagesForReassign(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  // Refresh data function
  const refreshData = useCallback(async () => {
    try {
      const convoRes = await fetch(`/api/conversations?clientId=${clientId}&limit=1000`);
      if (!convoRes.ok) throw new Error('Failed to fetch conversations');
      const convoData = await convoRes.json();
      const fetchedConversations = convoData.data || convoData.conversations || [];
      setConversations(fetchedConversations);

      // Merge and sort all messages
      const allMessages: MasterMessage[] = [];
      fetchedConversations.forEach((convo: Conversation) => {
        const messageType = determineMessageType(convo);
        if (convo.messages && Array.isArray(convo.messages)) {
          convo.messages.forEach((msg) => {
            allMessages.push({
              ...msg,
              conversationId: convo.id,
              conversationTitle: convo.title || 'Untitled Conversation',
              messageType,
            });
          });
        }
      });

      allMessages.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setMergedMessages(allMessages);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  }, [clientId]);

  // Fetch client data and all conversations
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch client
        const clientRes = await fetch(`/api/clients/${clientId}`);
        if (!clientRes.ok) throw new Error('Failed to fetch client');
        const clientData = await clientRes.json();
        setClient(clientData.data || clientData.client);

        // Fetch all conversations for this client
        const convoRes = await fetch(`/api/conversations?clientId=${clientId}&limit=1000`);
        if (!convoRes.ok) throw new Error('Failed to fetch conversations');
        const convoData = await convoRes.json();
        const fetchedConversations = convoData.data || convoData.conversations || [];
        setConversations(fetchedConversations);

        // Merge and sort all messages
        const allMessages: MasterMessage[] = [];

        fetchedConversations.forEach((convo: Conversation) => {
          // Determine message type from conversation tags or source
          const messageType = determineMessageType(convo);

          // Check if messages exist and is an array
          if (convo.messages && Array.isArray(convo.messages)) {
            convo.messages.forEach((msg) => {
              allMessages.push({
                ...msg,
                conversationId: convo.id,
                conversationTitle: convo.title || 'Untitled Conversation',
                messageType,
              });
            });
          }
        });

        // Sort by timestamp (newest first)
        allMessages.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setMergedMessages(allMessages);

        // Fetch testimonials
        try {
          const testimonialsRes = await fetch(`/api/testimonials?clientId=${clientId}`);
          if (testimonialsRes.ok) {
            const testimonialsData = await testimonialsRes.json();
            setTestimonials(testimonialsData.data || []);
          }
        } catch (err) {
          console.error('Error fetching testimonials:', err);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    if (clientId) {
      fetchData();
    }
  }, [clientId]);

  // Determine message type from conversation metadata
  function determineMessageType(conversation: Conversation): 'sms' | 'email' | 'phone' | 'other' {
    const tags = conversation.tags || [];
    const source = (conversation.source || '').toLowerCase();

    if (tags.includes('sms') || tags.includes('sms_import') || source.includes('sms')) {
      return 'sms';
    }
    if (tags.includes('email') || source.includes('email')) {
      return 'email';
    }
    if (tags.includes('phone') || tags.includes('call') || source.includes('phone')) {
      return 'phone';
    }
    return 'other';
  }

  // Filter timeline items by type
  const filteredTimelineItems = typeFilter === 'all'
    ? timelineItems
    : timelineItems.filter(item => {
        if (item.type === 'testimonial') return true; // Always show testimonials
        return (item.data as MasterMessage).messageType === typeFilter;
      });

  // Get type counts for filter badges
  const typeCounts = {
    all: mergedMessages.length,
    sms: mergedMessages.filter(m => m.messageType === 'sms').length,
    email: mergedMessages.filter(m => m.messageType === 'email').length,
    phone: mergedMessages.filter(m => m.messageType === 'phone').length,
    other: mergedMessages.filter(m => m.messageType === 'other').length,
  };

  // Create a synthetic master conversation for the sidebar
  const masterConversation: Conversation = {
    id: `master-${clientId}`,
    clientId,
    title: `Master Timeline - ${client?.name || 'Client'}`,
    messages: mergedMessages as Message[],
    createdAt: conversations[0]?.createdAt || new Date().toISOString(),
    updatedAt: conversations[0]?.updatedAt || new Date().toISOString(),
    source: 'manual' as Conversation['source'],
    priority: 'medium',
    status: 'active',
    tags: ['master-timeline'],
    summary: `Aggregated view of all ${conversations.length} conversation(s) with ${mergedMessages.length} message(s)`
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'sms': return <MessageSquare className="w-3 h-3" />;
      case 'email': return <Mail className="w-3 h-3" />;
      case 'phone': return <Phone className="w-3 h-3" />;
      default: return <MessageSquare className="w-3 h-3" />;
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'sms': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'email': return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
      case 'phone': return 'bg-green-500/20 text-green-700 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <CRMLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground font-primary">Loading master timeline...</p>
          </div>
        </div>
      </CRMLayout>
    );
  }

  if (error || !client) {
    return (
      <CRMLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="neo-container p-6 text-center">
            <p className="text-red-600 font-primary">{error || 'Client not found'}</p>
            <button
              onClick={() => router.back()}
              className="neo-button mt-4 font-primary uppercase tracking-wide"
            >
              Go Back
            </button>
          </div>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="min-h-screen bg-hud-background-secondary relative">
        {/* Contextual Sidebar - Desktop Only */}
        {client && (
          <ContextualSidebar
            conversation={masterConversation}
            client={client}
            conversationId={masterConversation.id}
            selectedMessageId={selectedMessageId}
            onSelectMessage={(id) => {
              const msg = mergedMessages.find(m => m.id === id);
              handleMessageSelect(msg || null);
            }}
            onAutoDetails={handleAutoDetails}
            onStateChange={handleSidebarStateChange}
            // Master timeline specific props
            isMasterTimeline={true}
            allConversations={conversations}
            allMessages={mergedMessages}
            selectedMessage={selectedMessage}
            onRefresh={refreshData}
            className="hidden lg:block"
          />
        )}

        {/* Main Content - Adjusted for Sidebar */}
        <div
          className={`
            transition-all duration-300 ease-in-out
            ${isMobile && sidebarState.isOpen ? 'opacity-50 pointer-events-none' : ''}
          `}
          style={{
            paddingRight: !isMobile && sidebarState.isOpen ? `${sidebarState.width}px` : (isMobile ? '0px' : '64px')
          }}
        >
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="neo-container mb-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => router.back()}
                className="neo-button-sm p-1.5 sm:p-2 flex-shrink-0"
                title="Go back"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-primary uppercase tracking-wide text-foreground truncate">
                  Master Timeline
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-primary mt-1 truncate">
                  All communications with {client.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={toggleReassignMode}
                className={`neo-button px-2 sm:px-4 py-2 text-xs uppercase tracking-wide font-primary font-bold transition-transform hover:scale-[1.02] flex items-center gap-1 sm:gap-2 ${
                  reassignMode ? 'neo-button-active' : ''
                }`}
                title="Toggle bulk reassignment mode"
              >
                <ListChecks className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{reassignMode ? 'Exit ' : ''}</span>Reassign<span className="hidden xs:inline"> Mode</span>
              </button>

              <div className="neo-card px-3 py-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  <div className="text-xs font-primary">
                    <span className="text-muted-foreground">Conversations:</span>
                    <span className="ml-2 font-bold text-foreground">{conversations.length}</span>
                  </div>
                </div>
              </div>
              <div className="neo-card px-3 py-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-accent" />
                  <div className="text-xs font-primary">
                    <span className="text-muted-foreground">Total Messages:</span>
                    <span className="ml-2 font-bold text-foreground">{mergedMessages.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Message Type Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-primary uppercase tracking-wide mr-2">
              Filter:
            </span>

            {(['all', 'sms', 'email', 'phone', 'other'] as MessageTypeFilter[]).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1 rounded-lg text-xs font-primary uppercase tracking-wide transition-all ${
                  typeFilter === type
                    ? 'neo-button-active'
                    : 'neo-button'
                }`}
              >
                {type === 'all' ? 'All' : type.toUpperCase()}
                <span className="ml-2 neo-badge-sm">{typeCounts[type]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {filteredTimelineItems.length === 0 ? (
            <div className="neo-container p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-primary">
                No items found {typeFilter !== 'all' && `for ${typeFilter.toUpperCase()}`}
              </p>
            </div>
          ) : (
            filteredTimelineItems.map((item, index) => {
              const prevItem = index > 0 ? filteredTimelineItems[index - 1] : null;
              const showDateDivider = !prevItem ||
                new Date(item.timestamp).toDateString() !== new Date(prevItem.timestamp).toDateString();

              // Render testimonial
              if (item.type === 'testimonial') {
                const testimonial = item.data;
                return (
                  <div key={`testimonial-${testimonial.id}`}>
                    {/* Date Divider */}
                    {showDateDivider && (
                      <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-[var(--neomorphic-dark-shadow)]"></div>
                        <span className="text-xs font-primary uppercase tracking-wide text-muted-foreground px-3 py-1 neo-card">
                          {isClient ? new Date(item.timestamp).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'Loading...'}
                        </span>
                        <div className="flex-1 h-px bg-[var(--neomorphic-dark-shadow)]"></div>
                      </div>
                    )}

                    {/* Testimonial Card */}
                    <div className="max-w-2xl mx-auto">
                      <div className="neo-container p-6 border-l-4 border-yellow-500 bg-yellow-500/5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-500/20">
                              <Star className="w-5 h-5 text-yellow-600 fill-yellow-500" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold font-primary uppercase tracking-wide text-foreground">
                                Testimonial {testimonial.status === 'PENDING' ? 'Request' : 'Received'}
                              </h3>
                              <p className="text-xs text-muted-foreground font-primary">
                                {isClient ? new Date(item.timestamp).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit'
                                }) : 'Loading...'}
                              </p>
                            </div>
                          </div>

                          {testimonial.status && (
                            <span className={`px-2 py-1 rounded text-xs font-primary uppercase tracking-wide ${
                              testimonial.status === 'APPROVED' ? 'bg-green-500/20 text-green-700 border border-green-500/30' :
                              testimonial.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-700 border border-yellow-500/30' :
                              'bg-gray-500/20 text-gray-700 border border-gray-500/30'
                            }`}>
                              {testimonial.status}
                            </span>
                          )}
                        </div>

                        {testimonial.content && (
                          <div className="mb-4">
                            <p className="text-sm text-foreground whitespace-pre-wrap italic">
                              "{testimonial.content}"
                            </p>
                          </div>
                        )}

                        {testimonial.rating && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-muted-foreground font-primary uppercase">Rating:</span>
                            <div className="flex gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < testimonial.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-foreground">
                              {testimonial.rating}/5
                            </span>
                          </div>
                        )}

                        {testimonial.requestMessage && testimonial.status === 'PENDING' && (
                          <div className="text-xs text-muted-foreground font-primary border-t border-foreground/10 pt-3 mt-3">
                            <strong>Request Message:</strong> {testimonial.requestMessage}
                          </div>
                        )}

                        {testimonial.conversationId && (
                          <div className="flex items-center justify-between border-t border-foreground/10 pt-3 mt-3">
                            <button
                              onClick={() => router.push(`/conversations/${testimonial.conversationId}`)}
                              className="text-xs text-accent hover:underline font-primary flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              View Source Conversation
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Render message
              const message = item.data as MasterMessage;
              return (
                <div key={`${message.conversationId}-${message.id}`}>
                  {/* Date Divider */}
                  {showDateDivider && (
                    <div className="flex items-center gap-3 my-6">
                      <div className="flex-1 h-px bg-[var(--neomorphic-dark-shadow)]"></div>
                      <span className="text-xs font-primary uppercase tracking-wide text-muted-foreground px-3 py-1 neo-card">
                        {isClient ? new Date(message.timestamp).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Loading...'}
                      </span>
                      <div className="flex-1 h-px bg-[var(--neomorphic-dark-shadow)]"></div>
                    </div>
                  )}

                  {/* Message */}
                  <div className={`flex ${message.role === 'YOU' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl p-4 neo-container relative ${
                      message.role === 'YOU' ? 'bg-accent/20' : ''
                    } ${selectedMessageId === message.id ? 'ring-2 ring-accent' : ''} ${
                      reassignMode ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => {
                      if (reassignMode) {
                        const uniqueId = `${message.conversationId}-${message.id}`;
                        toggleMessageSelection(uniqueId);
                      } else if (message.role !== 'YOU') {
                        // Select message for reply context
                        handleMessageSelect(message);
                      }
                    }}
                    >
                      {/* Reassignment checkbox */}
                      {reassignMode && (
                        <div className="absolute top-2 left-2">
                          <input
                            type="checkbox"
                            checked={selectedMessagesForReassign.has(`${message.conversationId}-${message.id}`)}
                            onChange={() => {}}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </div>
                      )}
                      {/* Message Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-primary uppercase tracking-wide">
                            {message.role === 'YOU' ? 'You' : client.name}
                          </span>

                          {/* Message Type Badge */}
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-primary uppercase tracking-wide border ${getMessageTypeColor(message.messageType)}`}>
                            {getMessageTypeIcon(message.messageType)}
                            {message.messageType}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-primary">
                            {isClient ? new Date(message.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            }) : 'Loading...'}
                          </span>
                        </div>
                      </div>

                      {/* Message Content */}
                      <p className="text-sm whitespace-pre-wrap mb-2">
                        {message.content}
                      </p>

                      {/* Message Actions */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-foreground/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/conversations/${message.conversationId}`);
                          }}
                          className="text-xs text-accent hover:underline font-primary flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          View in {message.conversationTitle}
                        </button>

                        {!reassignMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Open edit modal
                              console.log('Edit message:', message.id);
                            }}
                            className="neo-button-sm px-2 py-1 text-xs uppercase font-primary transition-transform hover:scale-[1.05] flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bulk Reassignment Action Bar */}
        {reassignMode && selectedMessagesForReassign.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <div className="neo-container p-4 shadow-2xl bg-background border-2 border-accent">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold font-primary uppercase text-foreground">
                  {selectedMessagesForReassign.size} Message{selectedMessagesForReassign.size !== 1 ? 's' : ''} Selected
                </span>

                <select
                  className="neo-button px-3 py-2 text-xs font-primary uppercase"
                  onChange={(e) => {
                    if (e.target.value) {
                      // TODO: Handle bulk reassignment
                      console.log('Reassign to:', e.target.value);
                    }
                  }}
                >
                  <option value="">Select Conversation...</option>
                  {conversations.map(conv => (
                    <option key={conv.id} value={conv.id}>
                      {conv.title || 'Untitled'}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setReassignMode(false);
                    setSelectedMessagesForReassign(new Set());
                  }}
                  className="neo-button px-4 py-2 text-xs uppercase font-primary font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>

      {/* Bottom Action Bar - Mobile Only */}
      {client && (
        <BottomActionBar
          detailsContent={
            <SidebarConversationDetails
              conversation={masterConversation}
              client={client}
              onEditClick={() => {
                // Master timeline doesn't have edit functionality yet
                console.log('Edit master timeline');
              }}
              onTestimonialClick={() => {
                // Navigate to client page or open testimonial modal
                router.push(`/clients/${clientId}`);
              }}
            />
          }
          insightsContent={
            <SidebarInsights
              conversation={masterConversation}
              client={client}
              onRequestTestimonial={() => {
                // Navigate to client page or open testimonial modal
                router.push(`/clients/${clientId}`);
              }}
            />
          }
          scheduleContent={
            <SidebarSchedule conversation={masterConversation} client={client} />
          }
          billingContent={
            <SidebarBilling conversation={masterConversation} client={client} />
          }
        />
      )}
    </CRMLayout>
  );
}
