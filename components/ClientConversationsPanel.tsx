"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { useApi } from "../lib/hooks/useApi";
import { conversationsApi } from "../lib/api/endpoints";
import { Conversation } from "../lib/api/types";
import {
  ConversationFilters,
  ConversationTypeFilter,
  ConversationViewMode,
} from "./ConversationFiltersPanel";

interface ClientConversationsPanelProps {
  filters?: ConversationFilters;
  onFilterCountsUpdate?: (counts: Record<string, number>) => void;
  onConversationSelect?: (conversationId: string) => void;
  onMasterTimelineSelect?: (clientId: string) => void;
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
  // Check source first
  if (conversation.source) {
    const mapped = SOURCE_TO_FILTER_TYPE[conversation.source];
    if (mapped) return mapped;
  }

  // Check tags
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
 * Check if conversation is a master timeline (aggregated)
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
 * Get badge text based on conversation priority/status
 */
function getBadge(conversation: Conversation): string {
  if (conversation.priority === 'urgent' || conversation.sentiment === 'urgent') {
    return 'ACTION';
  }
  if (conversation.status === 'pending') {
    return 'REVIEW';
  }
  if (conversation.nextActions && conversation.nextActions.length > 0) {
    return 'FOLLOW-UP';
  }
  if (conversation.priority === 'high') {
    return 'ACTION';
  }
  return conversation.status?.toUpperCase() || 'ACTIVE';
}

/**
 * Get snippet from conversation - either summary or last message
 */
function getSnippet(conversation: Conversation): string {
  if (conversation.summary) {
    return conversation.summary;
  }
  if (conversation.messages && conversation.messages.length > 0) {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const content = lastMessage.content;
    return content.length > 80 ? content.substring(0, 80) + '...' : content;
  }
  return 'No messages yet';
}

/**
 * Format source type for display
 */
function formatSource(source?: string): string {
  if (!source) return '';
  const formatted = source.toLowerCase().replace(/_/g, ' ');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Get icon for conversation type
 */
function getTypeIcon(type: ConversationTypeFilter): keyof typeof Ionicons.glyphMap {
  switch (type) {
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

export default function ClientConversationsPanel({
  filters,
  onFilterCountsUpdate,
  onConversationSelect,
  onMasterTimelineSelect,
}: ClientConversationsPanelProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const fetchConversations = useCallback(
    () => conversationsApi.getConversations({ limit: 50 }),
    []
  );

  const { data: rawConversations, loading, error, refetch } = useApi<Conversation[]>(
    fetchConversations,
    []
  );

  // Calculate type counts and update parent
  useEffect(() => {
    if (!rawConversations || !onFilterCountsUpdate) return;

    const counts: Record<string, number> = { all: rawConversations.length };

    for (const conv of rawConversations) {
      const type = getConversationType(conv);
      counts[type] = (counts[type] || 0) + 1;
    }

    onFilterCountsUpdate(counts);
  }, [rawConversations, onFilterCountsUpdate]);

  // Filter and sort conversations
  const conversations = useMemo(() => {
    if (!rawConversations) return [];

    let filtered = [...rawConversations];

    // Apply view mode filter
    if (filters?.viewMode === 'master') {
      filtered = filtered.filter(conv => isMasterTimeline(conv));
    } else if (filters?.viewMode === 'individual') {
      filtered = filtered.filter(conv => !isMasterTimeline(conv));
    }

    // Apply type filter
    if (filters?.typeFilter && filters.typeFilter !== 'all') {
      filtered = filtered.filter(conv => getConversationType(conv) === filters.typeFilter);
    }

    // Apply sort order
    filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return filters?.sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  }, [rawConversations, filters]);

  if (loading) {
    return (
      <View style={styles.panel}>
        <Text style={styles.heading}>Conversations</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={tokens.accent} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.panel}>
        <Text style={styles.heading}>Conversations</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={styles.retryButton}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.heading}>Conversations</Text>
        <Text style={styles.emptyText}>No conversations found</Text>
      </View>
    );
  }

  const getFilterDescription = (): string => {
    const parts: string[] = [];
    if (filters?.viewMode && filters.viewMode !== 'all') {
      parts.push(filters.viewMode === 'master' ? 'Master timelines' : 'Individual');
    }
    if (filters?.typeFilter && filters.typeFilter !== 'all') {
      parts.push(filters.typeFilter.charAt(0).toUpperCase() + filters.typeFilter.slice(1));
    }
    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  };

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>
          Conversations{getFilterDescription()}
        </Text>
        <Text style={styles.countText}>{conversations.length} found</Text>
      </View>
      {conversations.map((conv) => {
        const clientName = conv.client?.name || conv.client?.company || 'Unknown Client';
        const clientId = conv.clientId || conv.client?.id;
        const source = formatSource(conv.source);
        const title = conv.title || `${clientName}${source ? ` · ${source}` : ''}`;
        const convType = getConversationType(conv);
        const isMaster = isMasterTimeline(conv);

        const handlePress = () => {
          if (isMaster && clientId) {
            onMasterTimelineSelect?.(clientId);
          } else {
            onConversationSelect?.(conv.id);
          }
        };

        return (
          <TouchableOpacity
            key={conv.id}
            style={styles.card}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <Ionicons
                  name={getTypeIcon(convType)}
                  size={14}
                  color={tokens.accent}
                  style={styles.typeIcon}
                />
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
              </View>
              <View style={styles.badgeRow}>
                {isMaster && (
                  <View style={styles.masterBadge}>
                    <Text style={styles.masterBadgeText}>MASTER</Text>
                  </View>
                )}
                <Text style={styles.badge}>{getBadge(conv)}</Text>
                <Ionicons name="chevron-forward" size={14} color={tokens.textSecondary} />
              </View>
            </View>
            <Text style={styles.snippet} numberOfLines={2}>{getSnippet(conv)}</Text>
            {conv.updatedAt && (
              <Text style={styles.timestamp}>
                {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      width: '100%',
      alignSelf: 'stretch',
    },
    headingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    heading: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontFamily: 'Bytesized-Regular',
      fontWeight: "700",
      flex: 1,
    },
    countText: {
      color: tokens.textSecondary,
      fontSize: 11,
      fontFamily: 'lores-9-wide',
    },
    card: {
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingVertical: 12,
      marginTop: 8,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10,
    },
    typeIcon: {
      marginRight: 8,
    },
    title: {
      color: tokens.textSecondary,
      fontFamily: 'lores-9-wide',
      fontWeight: "600",
      flex: 1,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    badge: {
      color: tokens.accent,
      fontFamily: 'lores-9-wide',
      fontSize: 11,
      fontWeight: "600",
    },
    masterBadge: {
      backgroundColor: tokens.accent,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    masterBadgeText: {
      color: tokens.textPrimary,
      fontFamily: 'lores-9-wide',
      fontSize: 9,
      fontWeight: '700',
    },
    snippet: {
      color: tokens.highlight,
      fontFamily: 'lores-9-wide',
      fontSize: 12,
    },
    timestamp: {
      color: tokens.textSecondary,
      fontFamily: 'lores-9-wide',
      fontSize: 10,
      marginTop: 6,
    },
    loadingContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    loadingText: {
      color: tokens.textSecondary,
      fontFamily: 'lores-9-wide',
      fontSize: 12,
      marginTop: 8,
    },
    errorContainer: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    errorText: {
      color: '#ef4444',
      fontFamily: 'lores-9-wide',
      fontSize: 12,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    retryText: {
      color: tokens.accent,
      fontFamily: 'lores-9-wide',
      fontSize: 12,
    },
    emptyText: {
      color: tokens.textSecondary,
      fontFamily: 'lores-9-wide',
      fontSize: 12,
      paddingVertical: 16,
      textAlign: 'center',
    },
  });
