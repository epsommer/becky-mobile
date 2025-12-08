"use client";

import React, { useCallback } from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { useApi } from "../lib/hooks/useApi";
import { conversationsApi } from "../lib/api/endpoints";
import { Conversation } from "../lib/api/types";

/**
 * Get display status based on conversation properties
 */
function getDisplayStatus(conv: Conversation): string {
  if (conv.nextActions && conv.nextActions.length > 0) {
    return 'Awaiting follow-up';
  }
  if (conv.status === 'pending') {
    return 'Flagged for review';
  }
  if (conv.status === 'resolved') {
    return 'Completed';
  }
  if (conv.priority === 'urgent' || conv.sentiment === 'urgent') {
    return 'Urgent action needed';
  }
  return conv.status ? conv.status.charAt(0).toUpperCase() + conv.status.slice(1) : 'Active';
}

/**
 * Get title based on conversation source/content
 */
function getTitle(conv: Conversation): string {
  if (conv.title) return conv.title;

  const sourceLabels: Record<string, string> = {
    email: 'Email thread',
    text: 'Text thread',
    phone: 'Voice call recap',
    meeting: 'Meeting notes',
    import: 'Imported conversation',
    manual: 'Manual entry',
  };

  const source = conv.source?.toLowerCase();
  return source && sourceLabels[source] ? sourceLabels[source] : 'Conversation';
}

export default function ConversationSummaryPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const fetchConversations = useCallback(
    () => conversationsApi.getConversations({ limit: 3 }),
    []
  );

  const { data: conversations, loading, error } = useApi<Conversation[]>(
    fetchConversations,
    []
  );

  if (loading) {
    return (
      <View style={styles.panel}>
        <Text style={styles.heading}>Conversation highlights</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={tokens.accent} />
        </View>
      </View>
    );
  }

  if (error || !conversations || conversations.length === 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.heading}>Conversation highlights</Text>
        <Text style={styles.emptyText}>
          {error || 'No conversation highlights available'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Conversation highlights</Text>
      {conversations.map((conv) => {
        const clientName = conv.client?.name || conv.client?.company || 'Unknown Client';
        return (
          <View style={styles.row} key={conv.id}>
            <View style={styles.textBlock}>
              <Text style={styles.title}>{getTitle(conv)}</Text>
              <Text style={styles.client}>{clientName}</Text>
            </View>
            <Text style={styles.status}>{getDisplayStatus(conv)}</Text>
          </View>
        );
      })}
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
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 5,
    },
    heading: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 12,
    },
    row: {
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingVertical: 10,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    textBlock: {
      flex: 1,
      paddingRight: 8,
    },
    title: {
      color: tokens.textSecondary,
      fontWeight: "600",
    },
    client: {
      color: tokens.highlight,
      fontSize: 12,
      marginTop: 4,
    },
    status: {
      color: tokens.accent,
      fontSize: 11,
      textTransform: "uppercase",
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
  });
