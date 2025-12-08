"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../../theme/ThemeContext";
import { useApi } from "../../lib/hooks/useApi";
import { conversationsApi, clientsApi } from "../../lib/api/endpoints";
import { Conversation, Message, Client } from "../../lib/api/types";
import QuickActionBar, { ActionPanelType } from "../QuickActionBar";
import AIDraftPanel from "../AIDraftPanel";
import { ConversationTypeFilter } from "../ConversationFiltersPanel";
import { ConversationMessage } from "../../lib/services/AIDraftService";
import TestimonialInsightsPanel from "../TestimonialInsightsPanel";
import TestimonialRequestModal from "../TestimonialRequestModal";
import MessageActionsModal from "../MessageActionsModal";

interface MasterTimelineDetailScreenProps {
  clientId: string;
  onBack: () => void;
  onConversationSelect?: (conversationId: string) => void;
}

// Map conversation source to filter type
const SOURCE_TO_FILTER_TYPE: Record<string, ConversationTypeFilter> = {
  email: 'email',
  EMAIL: 'email',
  text: 'sms',
  TEXT: 'sms',
  sms: 'sms',
  SMS: 'sms',
  phone: 'phone',
  PHONE: 'phone',
  meeting: 'meeting',
  MEETING: 'meeting',
  viber: 'viber',
  VIBER: 'viber',
  whatsapp: 'whatsapp',
  WHATSAPP: 'whatsapp',
  messenger: 'messenger',
  MESSENGER: 'messenger',
  discord: 'discord',
  DISCORD: 'discord',
};

interface TimelineEntry {
  id: string;
  conversationId: string;
  type: 'message' | 'action' | 'receipt' | 'note';
  source: ConversationTypeFilter;
  title: string;
  content: string;
  timestamp: Date;
  role?: string;
  messageType?: string;
}

// Get conversation type from source
function getConversationType(conversation: Conversation): ConversationTypeFilter {
  if (conversation.source) {
    const mapped = SOURCE_TO_FILTER_TYPE[conversation.source];
    if (mapped) return mapped;
  }

  const tags = conversation.tags || [];
  for (const tag of tags) {
    const lowerTag = tag.toLowerCase();
    if (lowerTag.includes('sms') || lowerTag.includes('text')) return 'sms';
    if (lowerTag.includes('email')) return 'email';
    if (lowerTag.includes('phone') || lowerTag.includes('call')) return 'phone';
    if (lowerTag.includes('viber')) return 'viber';
    if (lowerTag.includes('whatsapp')) return 'whatsapp';
    if (lowerTag.includes('messenger') || lowerTag.includes('facebook')) return 'messenger';
    if (lowerTag.includes('discord')) return 'discord';
    if (lowerTag.includes('meeting') || lowerTag.includes('zoom')) return 'meeting';
  }

  return 'other';
}

// Get icon for source type
function getSourceIcon(source: ConversationTypeFilter): keyof typeof Ionicons.glyphMap {
  switch (source) {
    case 'email': return 'mail-outline';
    case 'sms': return 'chatbubble-ellipses-outline';
    case 'phone': return 'call-outline';
    case 'viber': return 'phone-portrait-outline';
    case 'whatsapp': return 'logo-whatsapp';
    case 'messenger': return 'logo-facebook';
    case 'discord': return 'logo-discord';
    case 'meeting': return 'videocam-outline';
    default: return 'chatbubble-outline';
  }
}

// Format timestamp
function formatTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Group timeline entries by date
function groupByDate(entries: TimelineEntry[]): Map<string, TimelineEntry[]> {
  const groups = new Map<string, TimelineEntry[]>();

  for (const entry of entries) {
    const dateKey = entry.timestamp.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(entry);
  }

  return groups;
}

export default function MasterTimelineDetailScreen({
  clientId,
  onBack,
  onConversationSelect,
}: MasterTimelineDetailScreenProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Modal and selection state
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [showMessageActionsModal, setShowMessageActionsModal] = useState(false);
  const [selectedTimelineEntry, setSelectedTimelineEntry] = useState<TimelineEntry | null>(null);
  const [selectedMessageForAI, setSelectedMessageForAI] = useState<string | null>(null);
  const [isSelectingForAI, setIsSelectingForAI] = useState(false);
  const [openPanelRequest, setOpenPanelRequest] = useState<ActionPanelType | null>(null);

  // Fetch client details
  const fetchClient = useCallback(
    () => clientsApi.getClient(clientId),
    [clientId]
  );

  const { data: client, loading: clientLoading } = useApi<Client>(
    fetchClient,
    [clientId]
  );

  // Fetch all conversations for this client
  const fetchConversations = useCallback(
    () => conversationsApi.getConversations({ clientId, limit: 100 }),
    [clientId]
  );

  const { data: conversations, loading: convsLoading, error, refetch } = useApi<Conversation[]>(
    fetchConversations,
    [clientId]
  );

  const loading = clientLoading || convsLoading;

  // Build unified timeline from all conversations
  const timeline = useMemo(() => {
    if (!conversations) return [];

    const entries: TimelineEntry[] = [];

    for (const conv of conversations) {
      const source = getConversationType(conv);

      // Add all messages
      if (conv.messages) {
        for (const msg of conv.messages) {
          entries.push({
            id: msg.id,
            conversationId: conv.id,
            type: 'message',
            source,
            title: msg.role === 'CLIENT' || msg.role === 'client' ? 'Client' : 'You',
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            role: msg.role,
            messageType: msg.type,
          });
        }
      }

      // Add next actions as action entries
      if (conv.nextActions) {
        for (const action of conv.nextActions) {
          entries.push({
            id: `action-${conv.id}-${action.slice(0, 10)}`,
            conversationId: conv.id,
            type: 'action',
            source,
            title: 'Action Required',
            content: action,
            timestamp: new Date(conv.updatedAt || conv.createdAt || Date.now()),
          });
        }
      }
    }

    // Sort by timestamp descending
    return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [conversations]);

  // Get unique sources used
  const sources = useMemo(() => {
    if (!conversations) return [];
    const sourceSet = new Set<ConversationTypeFilter>();
    for (const conv of conversations) {
      sourceSet.add(getConversationType(conv));
    }
    return Array.from(sourceSet);
  }, [conversations]);

  // Group timeline by date
  const groupedTimeline = useMemo(() => groupByDate(timeline), [timeline]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!conversations) return { conversations: 0, messages: 0, actions: 0 };

    let messages = 0;
    let actions = 0;

    for (const conv of conversations) {
      messages += conv.messages?.length || 0;
      actions += conv.nextActions?.length || 0;
    }

    return { conversations: conversations.length, messages, actions };
  }, [conversations]);

  // Build AI messages from all conversations (unified for master timeline)
  const aiMessages: ConversationMessage[] = useMemo(() => {
    if (!conversations) return [];

    const allMessages: ConversationMessage[] = [];

    for (const conv of conversations) {
      if (conv.messages) {
        for (const msg of conv.messages) {
          allMessages.push({
            id: msg.id,
            role: msg.role as 'CLIENT' | 'YOU' | 'client' | 'you',
            content: msg.content,
            timestamp: msg.timestamp,
          });
        }
      }
    }

    // Sort by timestamp descending
    return allMessages.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0).getTime();
      const dateB = new Date(b.timestamp || 0).getTime();
      return dateB - dateA;
    });
  }, [conversations]);

  // Handle long press on timeline entry
  const handleEntryLongPress = useCallback((entry: TimelineEntry) => {
    if (entry.type === 'message') {
      setSelectedTimelineEntry(entry);
      setShowMessageActionsModal(true);
    }
  }, []);

  // Handle tap on timeline entry (for AI selection mode)
  const handleEntryTap = useCallback((entry: TimelineEntry) => {
    if (isSelectingForAI && entry.type === 'message') {
      setSelectedMessageForAI(entry.id);
      setIsSelectingForAI(false);
    } else if (onConversationSelect) {
      onConversationSelect(entry.conversationId);
    }
  }, [isSelectingForAI, onConversationSelect]);

  // Convert TimelineEntry to Message for the modal
  const entryToMessage = useCallback((entry: TimelineEntry | null): Message | null => {
    if (!entry) return null;
    return {
      id: entry.id,
      conversationId: entry.conversationId,
      role: entry.role as any,
      content: entry.content,
      timestamp: entry.timestamp.toISOString(),
      type: entry.messageType as any || 'email',
    };
  }, []);

  // Handle sending AI draft as a message
  const handleSendAIDraft = useCallback(async (draft: string) => {
    if (!draft.trim()) return;

    // Find the conversation ID from the selected message
    let targetConversationId: string | null = null;

    if (selectedMessageForAI) {
      const entry = timeline.find(e => e.id === selectedMessageForAI);
      if (entry) {
        targetConversationId = entry.conversationId;
      }
    }

    // If no message selected, use the most recent conversation
    if (!targetConversationId && conversations && conversations.length > 0) {
      targetConversationId = conversations[0].id;
    }

    if (!targetConversationId) {
      Alert.alert('Error', 'No conversation found to send the message to.');
      return;
    }

    try {
      const response = await conversationsApi.sendMessage(targetConversationId, {
        role: 'YOU',
        content: draft.trim(),
        type: 'email',
        timestamp: new Date().toISOString(),
      });

      if (response.success) {
        // Refresh the timeline to show the new message
        refetch();
        setSelectedMessageForAI(null);
        Alert.alert('Message Sent', 'Your draft has been added to the conversation.');
      } else {
        Alert.alert('Error', response.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('[MasterTimelineDetailScreen] Error sending draft:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [selectedMessageForAI, timeline, conversations, refetch]);

  // Handle message action from modal
  const handleMessageAction = useCallback((action: string, msg: Message) => {
    switch (action) {
      case 'reply':
        setSelectedMessageForAI(msg.id);
        // Open the Draft AI panel
        setOpenPanelRequest('messages');
        break;
      case 'copy':
        Clipboard.setString(msg.content);
        Alert.alert('Copied', 'Message text copied to clipboard');
        break;
      case 'edit':
        Alert.alert('Edit Message', 'Message editing will be available soon');
        break;
      case 'forward':
        Alert.alert('Forward', 'Message forwarding will be available soon');
        break;
      case 'pin':
        Alert.alert('Pin Message', 'Message pinning will be available soon');
        break;
      case 'unread':
        Alert.alert('Mark Unread', 'Mark unread will be available soon');
        break;
      case 'tag':
        Alert.alert('Add Tag', 'Message tagging will be available soon');
        break;
      case 'delete':
        console.log('[MasterTimelineDetailScreen] Delete message:', msg.id);
        Alert.alert('Deleted', 'Message has been deleted');
        break;
    }
  }, []);

  // Check if entry is from user/employee
  const isUserEntry = useCallback((entry: TimelineEntry | null) => {
    if (!entry) return false;
    const role = entry.role?.toLowerCase();
    return role === 'you' || role === 'ai_draft' || role === 'ai-draft';
  }, []);

  // Check if entry is imported client message
  const isImportedClientEntry = useCallback((entry: TimelineEntry | null) => {
    if (!entry) return true;
    const role = entry.role?.toLowerCase();
    return role === 'client';
  }, []);

  // Messages panel content - AI Draft interface
  const messagesContent = useMemo(() => {
    const clientName = client?.name || client?.company || 'Client';

    return (
      <AIDraftPanel
        clientName={clientName}
        messages={aiMessages}
        externalSelectedMessageId={selectedMessageForAI}
        onClearExternalSelection={() => setSelectedMessageForAI(null)}
        onRequestMessageSelection={() => setIsSelectingForAI(true)}
        onDraftGenerated={(draft) => {
          console.log('[MasterTimelineDetailScreen] Draft generated:', draft.substring(0, 50) + '...');
        }}
        onSendDraft={handleSendAIDraft}
      />
    );
  }, [client, aiMessages, selectedMessageForAI, handleSendAIDraft]);

  // Details panel content
  const detailsContent = useMemo(() => {
    return (
      <ScrollView style={styles.panelScroll}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Conversations</Text>
          <Text style={styles.detailValue}>{stats.conversations}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Messages</Text>
          <Text style={styles.detailValue}>{stats.messages}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Pending Actions</Text>
          <Text style={styles.detailValue}>{stats.actions}</Text>
        </View>
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Communication Channels</Text>
          <View style={styles.tagsRow}>
            {sources.map((source) => (
              <View key={source} style={styles.tag}>
                <Ionicons name={getSourceIcon(source)} size={12} color={tokens.accent} />
                <Text style={styles.tagText}>{source.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>
        {client && (
          <>
            {client.email && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{client.email}</Text>
              </View>
            )}
            {client.phone && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{client.phone}</Text>
              </View>
            )}
            {client.company && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Company</Text>
                <Text style={styles.detailValue}>{client.company}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    );
  }, [client, stats, sources, tokens, styles]);

  // Insights panel content with testimonial status
  const insightsContent = useMemo(() => {
    const clientNameForInsights = client?.name || client?.company || 'Client';

    return (
      <ScrollView style={styles.panelScroll}>
        {/* Testimonial Section - Primary Focus */}
        <TestimonialInsightsPanel
          clientId={clientId}
          clientName={clientNameForInsights}
          onRequestTestimonial={() => setShowTestimonialModal(true)}
        />

        {/* Communication Activity */}
        <View style={[styles.insightCard, { marginTop: 12 }]}>
          <View style={styles.insightHeader}>
            <Ionicons name="analytics-outline" size={20} color={tokens.accent} />
            <Text style={styles.insightTitle}>Communication Activity</Text>
          </View>
          <View style={styles.statsGrid}>
            {sources.map((source) => {
              const count = timeline.filter(e => e.source === source).length;
              return (
                <View key={source} style={styles.statItem}>
                  <Ionicons name={getSourceIcon(source)} size={24} color={tokens.accent} />
                  <Text style={styles.statValue}>{count}</Text>
                  <Text style={styles.statLabel}>{source}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="time-outline" size={20} color={tokens.accent} />
            <Text style={styles.insightTitle}>Recent Activity</Text>
          </View>
          {timeline.length > 0 && (
            <>
              <Text style={styles.insightText}>
                Last contact: {formatTime(timeline[0].timestamp)}
              </Text>
              <Text style={styles.insightText}>
                Via: {timeline[0].source.toUpperCase()}
              </Text>
            </>
          )}
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="list-outline" size={20} color={tokens.accent} />
            <Text style={styles.insightTitle}>Pending Actions</Text>
          </View>
          {stats.actions > 0 ? (
            <>
              {timeline.filter(e => e.type === 'action').slice(0, 5).map((action) => (
                <View key={action.id} style={styles.actionItem}>
                  <Ionicons name="checkbox-outline" size={14} color={tokens.accent} />
                  <Text style={styles.actionItemText} numberOfLines={2}>{action.content}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.insightText}>No pending actions</Text>
          )}
        </View>
      </ScrollView>
    );
  }, [clientId, client, timeline, sources, stats, tokens, styles]);

  // Schedule panel content
  const scheduleContent = (
    <View style={styles.emptyPanel}>
      <Ionicons name="calendar-outline" size={48} color={tokens.textSecondary} />
      <Text style={styles.emptyPanelText}>Schedule a follow-up</Text>
      <TouchableOpacity style={styles.scheduleButton}>
        <Ionicons name="add" size={20} color={tokens.textPrimary} />
        <Text style={styles.scheduleButtonText}>Add Appointment</Text>
      </TouchableOpacity>
    </View>
  );

  // Billing panel content
  const billingContent = (
    <View style={styles.emptyPanel}>
      <Ionicons name="receipt-outline" size={48} color={tokens.textSecondary} />
      <Text style={styles.emptyPanelText}>View billing history</Text>
      <TouchableOpacity style={styles.scheduleButton}>
        <Ionicons name="add" size={20} color={tokens.textPrimary} />
        <Text style={styles.scheduleButtonText}>Create Receipt</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={tokens.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Loading...</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tokens.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={tokens.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Error</Text>
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refetch} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const clientName = client?.name || client?.company || 'Client';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="git-merge-outline" size={16} color={tokens.accent} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                Master Timeline
              </Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {stats.conversations} conversations · {stats.messages} messages
            </Text>
          </View>
        </View>

        {/* Client Info Bar */}
        <View style={styles.clientBar}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientAvatarText}>
              {clientName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{clientName}</Text>
            <View style={styles.sourcesRow}>
              {sources.slice(0, 4).map((source) => (
                <Ionicons
                  key={source}
                  name={getSourceIcon(source)}
                  size={14}
                  color={tokens.textSecondary}
                  style={{ marginRight: 8 }}
                />
              ))}
            </View>
          </View>
          <View style={styles.clientActions}>
            {client?.phone && (
              <TouchableOpacity style={styles.clientActionButton}>
                <Ionicons name="call-outline" size={18} color={tokens.accent} />
              </TouchableOpacity>
            )}
            {client?.email && (
              <TouchableOpacity style={styles.clientActionButton}>
                <Ionicons name="mail-outline" size={18} color={tokens.accent} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{stats.conversations}</Text>
            <Text style={styles.statBoxLabel}>Conversations</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{stats.messages}</Text>
            <Text style={styles.statBoxLabel}>Messages</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{stats.actions}</Text>
            <Text style={styles.statBoxLabel}>Actions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{sources.length}</Text>
            <Text style={styles.statBoxLabel}>Channels</Text>
          </View>
        </View>

        {/* AI Selection Mode Banner */}
        {isSelectingForAI && (
          <View style={styles.selectionBanner}>
            <Ionicons name="sparkles" size={16} color={tokens.accent} />
            <Text style={styles.selectionBannerText}>
              Tap a message to reply with AI
            </Text>
            <TouchableOpacity onPress={() => setIsSelectingForAI(false)}>
              <Ionicons name="close" size={18} color={tokens.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Timeline */}
        <ScrollView
          style={styles.timelineContainer}
          contentContainerStyle={styles.timelineContent}
        >
          {Array.from(groupedTimeline.entries()).map(([dateKey, entries]) => (
            <View key={dateKey} style={styles.dateGroup}>
              <View style={styles.dateHeader}>
                <View style={styles.dateLine} />
                <Text style={styles.dateText}>{dateKey}</Text>
                <View style={styles.dateLine} />
              </View>

              {entries.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={[
                    styles.timelineEntry,
                    selectedMessageForAI === entry.id && styles.timelineEntrySelected,
                    isSelectingForAI && entry.type === 'message' && styles.timelineEntrySelectable,
                  ]}
                  onPress={() => handleEntryTap(entry)}
                  onLongPress={() => handleEntryLongPress(entry)}
                  delayLongPress={400}
                  activeOpacity={isSelectingForAI ? 0.6 : 0.8}
                >
                  <View style={styles.entryIcon}>
                    <Ionicons
                      name={getSourceIcon(entry.source)}
                      size={16}
                      color={tokens.textPrimary}
                    />
                  </View>
                  <View style={styles.entryContent}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryTitle}>{entry.title}</Text>
                      {selectedMessageForAI === entry.id && (
                        <View style={styles.selectedForAIBadge}>
                          <Ionicons name="sparkles" size={10} color={tokens.textPrimary} />
                        </View>
                      )}
                      <Text style={styles.entryTime}>
                        {entry.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.entryText} numberOfLines={2}>
                      {entry.content}
                    </Text>
                    {entry.type === 'action' && (
                      <View style={styles.actionBadge}>
                        <Text style={styles.actionBadgeText}>ACTION</Text>
                      </View>
                    )}
                    {isSelectingForAI && entry.type === 'message' && (
                      <View style={styles.tapToSelectHint}>
                        <Ionicons name="hand-left-outline" size={12} color={tokens.accent} />
                        <Text style={styles.tapToSelectText}>Tap to select</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {timeline.length === 0 && (
            <View style={styles.noMessages}>
              <Ionicons name="time-outline" size={48} color={tokens.textSecondary} />
              <Text style={styles.noMessagesText}>No timeline entries yet</Text>
            </View>
          )}

          {/* Spacer for quick action bar */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Quick Action Bar */}
        <QuickActionBar
          messagesContent={messagesContent}
          detailsContent={detailsContent}
          insightsContent={insightsContent}
          scheduleContent={scheduleContent}
          billingContent={billingContent}
          openPanelRequest={openPanelRequest}
          onPanelOpened={() => setOpenPanelRequest(null)}
        />

        {/* Testimonial Request Modal */}
        <TestimonialRequestModal
          visible={showTestimonialModal}
          onClose={() => setShowTestimonialModal(false)}
          clientId={clientId}
          onRequestSent={() => {
            console.log('[MasterTimelineDetailScreen] Testimonial request sent');
          }}
        />

        {/* Message Actions Modal */}
        <MessageActionsModal
          visible={showMessageActionsModal}
          onClose={() => {
            setShowMessageActionsModal(false);
            setSelectedTimelineEntry(null);
          }}
          message={entryToMessage(selectedTimelineEntry)}
          isUserMessage={isUserEntry(selectedTimelineEntry)}
          isImportedClientMessage={isImportedClientEntry(selectedTimelineEntry)}
          onAction={handleMessageAction}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    container: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
      backgroundColor: tokens.surface,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerContent: {
      flex: 1,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    headerSubtitle: {
      color: tokens.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    clientBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
      backgroundColor: tokens.surface,
    },
    clientAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: tokens.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    clientAvatarText: {
      color: tokens.textPrimary,
      fontSize: 18,
      fontWeight: '700',
    },
    clientInfo: {
      flex: 1,
      marginLeft: 12,
    },
    clientName: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    sourcesRow: {
      flexDirection: 'row',
      marginTop: 4,
    },
    clientActions: {
      flexDirection: 'row',
      gap: 8,
    },
    clientActionButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: tokens.background,
    },
    statsBar: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingVertical: 12,
      backgroundColor: tokens.surface,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
    },
    statBoxValue: {
      color: tokens.accent,
      fontSize: 18,
      fontWeight: '700',
    },
    statBoxLabel: {
      color: tokens.textSecondary,
      fontSize: 10,
      marginTop: 2,
    },
    selectionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: tokens.accent + '20',
      borderBottomWidth: 1,
      borderBottomColor: tokens.accent,
    },
    selectionBannerText: {
      flex: 1,
      color: tokens.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      color: '#ef4444',
      fontSize: 14,
      textAlign: 'center',
      marginTop: 12,
    },
    retryButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: tokens.accent,
      borderRadius: 8,
    },
    retryButtonText: {
      color: tokens.textPrimary,
      fontWeight: '600',
    },
    timelineContainer: {
      flex: 1,
    },
    timelineContent: {
      padding: 16,
    },
    dateGroup: {
      marginBottom: 20,
    },
    dateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    dateLine: {
      flex: 1,
      height: 1,
      backgroundColor: tokens.border,
    },
    dateText: {
      color: tokens.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      paddingHorizontal: 12,
    },
    timelineEntry: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    timelineEntrySelected: {
      opacity: 1,
    },
    timelineEntrySelectable: {
      transform: [{ scale: 0.98 }],
    },
    entryIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tokens.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    entryContent: {
      flex: 1,
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    entryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    entryTitle: {
      color: tokens.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    entryTime: {
      color: tokens.textSecondary,
      fontSize: 10,
    },
    selectedForAIBadge: {
      backgroundColor: tokens.accent,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginLeft: 'auto',
      marginRight: 8,
    },
    tapToSelectHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    tapToSelectText: {
      color: tokens.accent,
      fontSize: 11,
      fontWeight: '500',
    },
    entryText: {
      color: tokens.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    actionBadge: {
      alignSelf: 'flex-start',
      backgroundColor: tokens.accent,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      marginTop: 8,
    },
    actionBadgeText: {
      color: tokens.textPrimary,
      fontSize: 9,
      fontWeight: '700',
    },
    noMessages: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    noMessagesText: {
      color: tokens.textSecondary,
      fontSize: 14,
      marginTop: 12,
    },
    // Panel styles
    panelScroll: {
      flex: 1,
    },
    panelMessage: {
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
      paddingVertical: 12,
    },
    panelMessageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    panelMessageRole: {
      color: tokens.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    panelMessageTime: {
      color: tokens.textSecondary,
      fontSize: 10,
      marginLeft: 'auto',
    },
    panelMessageContent: {
      color: tokens.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    emptyPanel: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    emptyPanelText: {
      color: tokens.textSecondary,
      fontSize: 14,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    detailLabel: {
      color: tokens.textSecondary,
      fontSize: 12,
      fontWeight: '500',
    },
    detailValue: {
      color: tokens.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    detailSection: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: tokens.background,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    tagText: {
      color: tokens.accent,
      fontSize: 10,
      fontWeight: '600',
    },
    insightCard: {
      backgroundColor: tokens.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    insightTitle: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    insightText: {
      color: tokens.textSecondary,
      fontSize: 12,
      marginTop: 4,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    statItem: {
      alignItems: 'center',
      minWidth: 60,
    },
    statValue: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      marginTop: 4,
    },
    statLabel: {
      color: tokens.textSecondary,
      fontSize: 10,
      marginTop: 2,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 8,
    },
    actionItemText: {
      flex: 1,
      color: tokens.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    scheduleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: tokens.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 8,
    },
    scheduleButtonText: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
  });
