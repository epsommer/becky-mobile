"use client";

import React, { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { useApi } from "../lib/hooks/useApi";
import { conversationsApi } from "../lib/api/endpoints";
import { Conversation, Message } from "../lib/api/types";
import {
  ConversationFilters,
  ConversationTypeFilter,
} from "./ConversationFiltersPanel";

interface ConversationTimelinePanelProps {
  filters?: ConversationFilters;
  onConversationSelect?: (conversationId: string) => void;
  onMasterTimelineSelect?: (clientId: string) => void;
}

interface TimelineEntry {
  time: string;
  line: string;
  timestamp: Date;
  type?: ConversationTypeFilter;
  clientId?: string;
  clientName?: string;
  conversationId?: string;
}

/**
 * Master timeline entry representing all conversations for a client
 */
interface MasterTimelineEntry {
  clientId: string;
  clientName: string;
  conversationCount: number;
  messageCount: number;
  lastActivity: Date;
  sources: ConversationTypeFilter[];
  recentMessages: TimelineEntry[];
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

/**
 * Get filter type from conversation
 */
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

/**
 * Check if conversation is a master timeline
 */
function isMasterTimeline(conversation: Conversation): boolean {
  const tags = conversation.tags || [];
  return tags.some(tag =>
    tag.toLowerCase().includes('master') ||
    tag.toLowerCase().includes('timeline') ||
    tag.toLowerCase().includes('aggregated')
  );
}

/**
 * Format time to HH:MM
 */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Get description for a message based on type and role
 */
function getMessageDescription(message: Message, clientName: string): string {
  const type = message.type?.toLowerCase().replace(/_/g, '-');
  const role = message.role?.toUpperCase();

  const isClient = role === 'CLIENT';
  const actor = isClient ? clientName : 'You';

  switch (type) {
    case 'email':
      return `${actor} – ${isClient ? 'Email received' : 'Email sent'}`;
    case 'text':
      return `${actor} – ${isClient ? 'Text message received' : 'Text sent'}`;
    case 'call-notes':
    case 'call_notes':
      return `${clientName} – Call notes added`;
    case 'meeting-notes':
    case 'meeting_notes':
      return `${clientName} – Meeting completed`;
    case 'voice-memo':
    case 'voice_memo':
      return `${clientName} – Voice memo recorded`;
    case 'file-upload':
    case 'file_upload':
      return `${actor} – File uploaded`;
    default:
      return `${clientName} – Message ${isClient ? 'received' : 'sent'}`;
  }
}

/**
 * Build timeline entries from conversations
 */
function buildTimeline(conversations: Conversation[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const conv of conversations) {
    const clientName = conv.client?.name || conv.client?.company || 'Client';
    const clientId = conv.clientId || conv.client?.id;
    const convType = getConversationType(conv);

    // Add recent messages as timeline entries
    if (conv.messages && conv.messages.length > 0) {
      for (const message of conv.messages.slice(-3)) { // Last 3 messages per conversation
        const timestamp = new Date(message.timestamp);
        entries.push({
          time: formatTime(message.timestamp),
          line: getMessageDescription(message, clientName),
          timestamp,
          type: convType,
          clientId,
          clientName,
          conversationId: conv.id,
        });
      }
    }

    // Add conversation creation if recent and no messages
    if ((!conv.messages || conv.messages.length === 0) && conv.createdAt) {
      const timestamp = new Date(conv.createdAt);
      entries.push({
        time: formatTime(conv.createdAt),
        line: `${clientName} – New conversation started`,
        timestamp,
        type: convType,
        clientId,
        clientName,
        conversationId: conv.id,
      });
    }
  }

  // Sort by timestamp descending and take most recent 10
  return entries
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);
}

/**
 * Build master timelines grouped by client
 * Each client gets one master timeline that aggregates all their conversations
 */
function buildMasterTimelines(conversations: Conversation[]): MasterTimelineEntry[] {
  const clientMap = new Map<string, {
    clientId: string;
    clientName: string;
    conversations: Conversation[];
    messages: TimelineEntry[];
    sources: Set<ConversationTypeFilter>;
  }>();

  // Group conversations by client
  for (const conv of conversations) {
    const clientId = conv.clientId || conv.client?.id || 'unknown';
    const clientName = conv.client?.name || conv.client?.company || 'Unknown Client';
    const convType = getConversationType(conv);

    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, {
        clientId,
        clientName,
        conversations: [],
        messages: [],
        sources: new Set(),
      });
    }

    const clientData = clientMap.get(clientId)!;
    clientData.conversations.push(conv);
    clientData.sources.add(convType);

    // Add all messages from this conversation
    if (conv.messages && conv.messages.length > 0) {
      for (const message of conv.messages) {
        const timestamp = new Date(message.timestamp);
        clientData.messages.push({
          time: formatTime(message.timestamp),
          line: getMessageDescription(message, clientName),
          timestamp,
          type: convType,
          clientId,
          clientName,
          conversationId: conv.id,
        });
      }
    }
  }

  // Convert to master timeline entries
  const masterTimelines: MasterTimelineEntry[] = [];

  for (const [clientId, data] of clientMap) {
    // Sort messages by timestamp descending
    const sortedMessages = data.messages.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    const lastActivity = sortedMessages.length > 0
      ? sortedMessages[0].timestamp
      : new Date(0);

    masterTimelines.push({
      clientId: data.clientId,
      clientName: data.clientName,
      conversationCount: data.conversations.length,
      messageCount: data.messages.length,
      lastActivity,
      sources: Array.from(data.sources),
      recentMessages: sortedMessages.slice(0, 5), // Last 5 messages per client
    });
  }

  // Sort by last activity descending
  return masterTimelines.sort(
    (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
  );
}

/**
 * Check if any filters are active
 */
function hasActiveFilters(filters?: ConversationFilters): boolean {
  if (!filters) return false;
  return (
    filters.viewMode !== 'all' ||
    filters.typeFilter !== 'all' ||
    filters.sortOrder !== 'newest'
  );
}

export default function ConversationTimelinePanel({
  filters,
  onConversationSelect,
  onMasterTimelineSelect,
}: ConversationTimelinePanelProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const fetchConversations = useCallback(
    () => conversationsApi.getConversations({ limit: 50 }),
    []
  );

  const { data: rawConversations, loading, error } = useApi<Conversation[]>(
    fetchConversations,
    []
  );

  // Check if we're in master view mode
  const isMasterView = filters?.viewMode === 'master';

  // Filter conversations based on filters (for non-master views)
  const filteredConversations = useMemo(() => {
    if (!rawConversations) return [];

    let filtered = [...rawConversations];

    // For individual view, exclude master timelines
    if (filters?.viewMode === 'individual') {
      filtered = filtered.filter(conv => !isMasterTimeline(conv));
    }

    // Apply type filter
    if (filters?.typeFilter && filters.typeFilter !== 'all') {
      filtered = filtered.filter(conv => getConversationType(conv) === filters.typeFilter);
    }

    return filtered;
  }, [rawConversations, filters]);

  // Build master timelines when in master view
  const masterTimelines = useMemo(() => {
    if (!isMasterView || !rawConversations) return [];

    let timelines = buildMasterTimelines(rawConversations);

    // Apply type filter to master timelines
    if (filters?.typeFilter && filters.typeFilter !== 'all') {
      timelines = timelines.filter(master =>
        master.sources.includes(filters.typeFilter)
      );
    }

    // Apply sort order
    if (filters?.sortOrder === 'oldest') {
      timelines = timelines.reverse();
    }

    return timelines;
  }, [isMasterView, rawConversations, filters]);

  // Build regular timeline for non-master views
  const timeline = useMemo(() => {
    if (isMasterView) return [];

    let entries = buildTimeline(filteredConversations);

    // Apply sort order
    if (filters?.sortOrder === 'oldest') {
      entries = entries.reverse();
    }

    return entries;
  }, [isMasterView, filteredConversations, filters?.sortOrder]);

  // Determine header text based on filters
  const getHeaderText = (): string => {
    if (isMasterView) {
      return 'Master Timelines';
    }
    return hasActiveFilters(filters) ? 'Filtered Conversations' : 'All Conversations';
  };

  const headerText = getHeaderText();
  const isFiltered = hasActiveFilters(filters);

  if (loading) {
    return (
      <View style={styles.panel}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>{headerText}</Text>
          <Text style={styles.subheading}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={tokens.accent} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.panel}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>{headerText}</Text>
          <Text style={styles.subheading}>Error</Text>
        </View>
        <Text style={styles.emptyText}>{error}</Text>
      </View>
    );
  }

  // Empty state for master view
  if (isMasterView && masterTimelines.length === 0) {
    return (
      <View style={styles.panel}>
        <View style={styles.headingRow}>
          <View style={styles.headingWithIcon}>
            <Ionicons name="git-merge-outline" size={14} color={tokens.accent} style={styles.filterIcon} />
            <Text style={styles.heading}>{headerText}</Text>
          </View>
          <Text style={styles.subheading}>No clients</Text>
        </View>
        <Text style={styles.emptyText}>
          {filters?.typeFilter !== 'all'
            ? 'No clients have conversations matching this type'
            : 'No client conversations found'}
        </Text>
      </View>
    );
  }

  // Empty state for regular view
  if (!isMasterView && timeline.length === 0) {
    return (
      <View style={styles.panel}>
        <View style={styles.headingRow}>
          <View style={styles.headingWithIcon}>
            {isFiltered && (
              <Ionicons name="filter" size={14} color={tokens.accent} style={styles.filterIcon} />
            )}
            <Text style={styles.heading}>{headerText}</Text>
          </View>
          <Text style={styles.subheading}>No activity</Text>
        </View>
        <Text style={styles.emptyText}>
          {isFiltered
            ? 'No conversations match the selected filters'
            : 'No recent conversation activity'}
        </Text>
      </View>
    );
  }

  // Master timeline view - shows aggregated client timelines
  if (isMasterView) {
    return (
      <View style={styles.panel}>
        <View style={styles.headingRow}>
          <View style={styles.headingWithIcon}>
            <Ionicons name="git-merge-outline" size={14} color={tokens.accent} style={styles.filterIcon} />
            <Text style={styles.heading}>{headerText}</Text>
          </View>
          <Text style={styles.subheading}>{masterTimelines.length} clients</Text>
        </View>
        <ScrollView>
          {masterTimelines.map((master) => (
            <TouchableOpacity
              key={master.clientId}
              style={styles.masterCard}
              onPress={() => onMasterTimelineSelect?.(master.clientId)}
              activeOpacity={0.7}
            >
              {/* Client Header */}
              <View style={styles.masterHeader}>
                <View style={styles.masterClientInfo}>
                  <View style={styles.masterAvatar}>
                    <Text style={styles.masterAvatarText}>
                      {master.clientName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.masterNameContainer}>
                    <Text style={styles.masterClientName}>{master.clientName}</Text>
                    <Text style={styles.masterStats}>
                      {master.conversationCount} conversation{master.conversationCount !== 1 ? 's' : ''} · {master.messageCount} message{master.messageCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.masterHeaderRight}>
                  <Text style={styles.masterTime}>
                    {master.lastActivity.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={tokens.textSecondary} />
                </View>
              </View>

              {/* Source Types */}
              <View style={styles.masterSources}>
                {master.sources.map((source) => (
                  <View key={source} style={styles.sourceTag}>
                    <Text style={styles.sourceTagText}>{source.toUpperCase()}</Text>
                  </View>
                ))}
              </View>

              {/* Recent Messages Preview */}
              {master.recentMessages.slice(0, 3).map((msg, idx) => (
                <View key={idx} style={styles.masterMessage}>
                  <Text style={styles.masterMessageTime}>{msg.time}</Text>
                  <Text style={styles.masterMessageLine} numberOfLines={1}>{msg.line}</Text>
                </View>
              ))}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Regular timeline view
  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <View style={styles.headingWithIcon}>
          {isFiltered && (
            <Ionicons name="filter" size={14} color={tokens.accent} style={styles.filterIcon} />
          )}
          <Text style={styles.heading}>{headerText}</Text>
        </View>
        <Text style={styles.subheading}>
          {isFiltered ? `${timeline.length} results` : 'Latest sync'}
        </Text>
      </View>
      <ScrollView>
        {timeline.map((entry, index) => (
          <TouchableOpacity
            key={`${entry.time}-${index}`}
            style={styles.entry}
            onPress={() => entry.conversationId && onConversationSelect?.(entry.conversationId)}
            activeOpacity={0.7}
          >
            <View style={styles.entryContent}>
              <Text style={styles.time}>{entry.time}</Text>
              <Text style={styles.line}>{entry.line}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={tokens.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      marginTop: 16,
      borderRadius: 18,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      padding: 16,
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
      elevation: 6,
    },
    headingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    headingWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterIcon: {
      marginRight: 6,
    },
    heading: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    subheading: {
      fontSize: 11,
      color: tokens.textSecondary,
      textTransform: "uppercase",
    },
    entry: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingVertical: 10,
    },
    entryContent: {
      flex: 1,
    },
    time: {
      color: tokens.accent,
      fontSize: 11,
      textTransform: "uppercase",
    },
    line: {
      color: tokens.textPrimary,
      fontSize: 13,
      marginTop: 4,
    },
    loadingContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyText: {
      color: tokens.textSecondary,
      fontSize: 12,
      textAlign: 'center',
      paddingVertical: 16,
    },
    // Master timeline styles
    masterCard: {
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingVertical: 14,
    },
    masterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    masterClientInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    masterAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tokens.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    masterAvatarText: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    masterNameContainer: {
      flex: 1,
    },
    masterClientName: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    masterStats: {
      color: tokens.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    masterHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    masterTime: {
      color: tokens.textSecondary,
      fontSize: 10,
      textTransform: 'uppercase',
    },
    masterSources: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 10,
      marginBottom: 10,
    },
    sourceTag: {
      backgroundColor: tokens.background,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    sourceTagText: {
      color: tokens.accent,
      fontSize: 9,
      fontWeight: '600',
    },
    masterMessage: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 6,
    },
    masterMessageTime: {
      color: tokens.accent,
      fontSize: 10,
      width: 45,
      marginRight: 8,
    },
    masterMessageLine: {
      color: tokens.textSecondary,
      fontSize: 11,
      flex: 1,
    },
  });
