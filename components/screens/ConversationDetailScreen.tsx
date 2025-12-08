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
import { conversationsApi } from "../../lib/api/endpoints";
import { Conversation, Message } from "../../lib/api/types";
import QuickActionBar, { ActionPanelType } from "../QuickActionBar";
import AIDraftPanel from "../AIDraftPanel";
import { ConversationMessage } from "../../lib/services/AIDraftService";
import TestimonialInsightsPanel from "../TestimonialInsightsPanel";
import TestimonialRequestModal from "../TestimonialRequestModal";
import MessageActionsModal from "../MessageActionsModal";

interface ConversationDetailScreenProps {
  conversationId: string;
  onBack: () => void;
}

// Helper to format timestamp
function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
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

// Get icon for message type
function getMessageTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  const normalizedType = type?.toLowerCase().replace(/_/g, '-');
  switch (normalizedType) {
    case 'email':
      return 'mail-outline';
    case 'text':
    case 'sms':
      return 'chatbubble-ellipses-outline';
    case 'call-notes':
    case 'phone':
      return 'call-outline';
    case 'meeting-notes':
      return 'videocam-outline';
    case 'voice-memo':
      return 'mic-outline';
    case 'file-upload':
      return 'document-outline';
    default:
      return 'chatbubble-outline';
  }
}

// Get badge color for priority/sentiment
function getPriorityColor(priority?: string, sentiment?: string): string {
  if (priority === 'urgent' || sentiment === 'urgent') return '#ef4444';
  if (priority === 'high' || sentiment === 'negative') return '#f97316';
  if (priority === 'medium') return '#eab308';
  return '#22c55e';
}

export default function ConversationDetailScreen({
  conversationId,
  onBack,
}: ConversationDetailScreenProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Modal and selection state
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [showMessageActionsModal, setShowMessageActionsModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedMessageForAI, setSelectedMessageForAI] = useState<string | null>(null);
  const [isSelectingForAI, setIsSelectingForAI] = useState(false);
  const [openPanelRequest, setOpenPanelRequest] = useState<ActionPanelType | null>(null);

  const fetchConversation = useCallback(
    () => conversationsApi.getConversation(conversationId),
    [conversationId]
  );

  const { data: conversation, loading, error, refetch } = useApi<Conversation>(
    fetchConversation,
    [conversationId]
  );

  // Convert messages to ConversationMessage format for AI draft
  const aiMessages: ConversationMessage[] = useMemo(() => {
    if (!conversation?.messages) return [];
    return conversation.messages.map((msg) => ({
      id: msg.id,
      role: msg.role as 'CLIENT' | 'YOU' | 'client' | 'you',
      content: msg.content,
      timestamp: msg.timestamp,
    }));
  }, [conversation?.messages]);

  // Handle long press on message
  const handleMessageLongPress = useCallback((msg: Message) => {
    setSelectedMessage(msg);
    setShowMessageActionsModal(true);
  }, []);

  // Handle tap on message (for AI selection mode)
  const handleMessageTap = useCallback((msg: Message) => {
    if (isSelectingForAI) {
      setSelectedMessageForAI(msg.id);
      setIsSelectingForAI(false);
    }
  }, [isSelectingForAI]);

  // Handle message action from modal
  const handleMessageAction = useCallback((action: string, msg: Message) => {
    switch (action) {
      case 'reply':
        // Select message for AI drafting and open Draft AI panel
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
        // Handle delete
        console.log('[ConversationDetailScreen] Delete message:', msg.id);
        Alert.alert('Deleted', 'Message has been deleted');
        break;
    }
  }, []);

  // Check if message is from user/employee (can be deleted/edited)
  const isUserMessage = useCallback((msg: Message) => {
    const role = msg.role?.toLowerCase();
    return role === 'you' || role === 'ai_draft' || role === 'ai-draft';
  }, []);

  // Check if message is imported (cannot be deleted/edited)
  const isImportedClientMessage = useCallback((msg: Message) => {
    // Messages from client that were imported (not manually created)
    const role = msg.role?.toLowerCase();
    return role === 'client';
  }, []);

  // Handle sending AI draft as a message
  const handleSendAIDraft = useCallback(async (draft: string) => {
    if (!conversationId || !draft.trim()) return;

    try {
      const response = await conversationsApi.sendMessage(conversationId, {
        role: 'YOU',
        content: draft.trim(),
        type: 'email',
        timestamp: new Date().toISOString(),
      });

      if (response.success) {
        // Refresh the conversation to show the new message
        refetch();
        // Clear the selected message for AI
        setSelectedMessageForAI(null);
        Alert.alert('Message Sent', 'Your draft has been added to the conversation.');
      } else {
        Alert.alert('Error', response.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('[ConversationDetailScreen] Error sending draft:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [conversationId, refetch]);

  // Messages panel content - AI Draft interface
  const messagesContent = useMemo(() => {
    const clientName = conversation?.client?.name || conversation?.client?.company || 'Client';

    return (
      <AIDraftPanel
        clientName={clientName}
        messages={aiMessages}
        externalSelectedMessageId={selectedMessageForAI}
        onClearExternalSelection={() => setSelectedMessageForAI(null)}
        onRequestMessageSelection={() => setIsSelectingForAI(true)}
        onDraftGenerated={(draft) => {
          console.log('[ConversationDetailScreen] Draft generated:', draft.substring(0, 50) + '...');
        }}
        onSendDraft={handleSendAIDraft}
      />
    );
  }, [conversation, aiMessages, selectedMessageForAI, handleSendAIDraft]);

  // Details panel content
  const detailsContent = useMemo(() => {
    if (!conversation) return null;

    return (
      <ScrollView style={styles.panelScroll}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.detailValue}>
            {conversation.status?.toUpperCase() || 'ACTIVE'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Priority</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(conversation.priority) }]}>
            <Text style={styles.priorityBadgeText}>
              {conversation.priority?.toUpperCase() || 'NORMAL'}
            </Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Source</Text>
          <Text style={styles.detailValue}>
            {conversation.source?.toUpperCase() || 'N/A'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Messages</Text>
          <Text style={styles.detailValue}>
            {conversation.messages?.length || 0}
          </Text>
        </View>
        {conversation.summary && (
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Summary</Text>
            <Text style={styles.detailSummary}>{conversation.summary}</Text>
          </View>
        )}
        {conversation.nextActions && conversation.nextActions.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Next Actions</Text>
            {conversation.nextActions.map((action, idx) => (
              <View key={idx} style={styles.actionItem}>
                <Ionicons name="checkbox-outline" size={14} color={tokens.accent} />
                <Text style={styles.actionItemText}>{action}</Text>
              </View>
            ))}
          </View>
        )}
        {conversation.tags && conversation.tags.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Tags</Text>
            <View style={styles.tagsRow}>
              {conversation.tags.map((tag, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    );
  }, [conversation, tokens, styles]);

  // Insights panel content with testimonial status
  const insightsContent = useMemo(() => {
    if (!conversation) return null;

    const clientId = conversation.clientId || conversation.client?.id;
    const clientNameForInsights = conversation.client?.name || conversation.client?.company || 'Client';

    return (
      <ScrollView style={styles.panelScroll}>
        {/* Testimonial Section - Primary Focus */}
        {clientId && (
          <TestimonialInsightsPanel
            clientId={clientId}
            clientName={clientNameForInsights}
            onRequestTestimonial={() => setShowTestimonialModal(true)}
          />
        )}

        {/* Conversation Health */}
        <View style={[styles.insightCard, { marginTop: clientId ? 12 : 0 }]}>
          <View style={styles.insightHeader}>
            <Ionicons name="analytics-outline" size={20} color={tokens.accent} />
            <Text style={styles.insightTitle}>Conversation Health</Text>
          </View>
          <View style={styles.healthBar}>
            <View
              style={[
                styles.healthBarFill,
                {
                  width: conversation.sentiment === 'positive' ? '85%' :
                         conversation.sentiment === 'neutral' ? '60%' :
                         conversation.sentiment === 'negative' ? '35%' : '50%',
                  backgroundColor: getPriorityColor(undefined, conversation.sentiment),
                },
              ]}
            />
          </View>
          <Text style={styles.insightSubtext}>
            Sentiment: {conversation.sentiment || 'Neutral'}
          </Text>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="time-outline" size={20} color={tokens.accent} />
            <Text style={styles.insightTitle}>Activity</Text>
          </View>
          <Text style={styles.insightText}>
            Last updated: {conversation.updatedAt
              ? new Date(conversation.updatedAt).toLocaleDateString()
              : 'Unknown'}
          </Text>
          <Text style={styles.insightText}>
            Created: {conversation.createdAt
              ? new Date(conversation.createdAt).toLocaleDateString()
              : 'Unknown'}
          </Text>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="people-outline" size={20} color={tokens.accent} />
            <Text style={styles.insightTitle}>Participants</Text>
          </View>
          <Text style={styles.insightText}>
            {conversation.participants?.length || 2} participant(s)
          </Text>
        </View>
      </ScrollView>
    );
  }, [conversation, tokens, styles]);

  // Schedule panel content (placeholder)
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

  // Billing panel content (placeholder)
  const billingContent = (
    <View style={styles.emptyPanel}>
      <Ionicons name="receipt-outline" size={48} color={tokens.textSecondary} />
      <Text style={styles.emptyPanelText}>Create billing documents</Text>
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

  if (error || !conversation) {
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
            <Text style={styles.errorText}>{error || 'Conversation not found'}</Text>
            <TouchableOpacity onPress={refetch} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const clientName = conversation.client?.name || conversation.client?.company || 'Unknown Client';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {conversation.title || clientName}
            </Text>
            <Text style={styles.headerSubtitle}>
              {conversation.source ? `${conversation.source.toUpperCase()} · ` : ''}
              {conversation.messages?.length || 0} messages
            </Text>
          </View>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getPriorityColor(conversation.priority, conversation.sentiment) },
            ]}
          />
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
            {conversation.client?.email && (
              <Text style={styles.clientContact}>{conversation.client.email}</Text>
            )}
          </View>
          <View style={styles.clientActions}>
            {conversation.client?.phone && (
              <TouchableOpacity style={styles.clientActionButton}>
                <Ionicons name="call-outline" size={18} color={tokens.accent} />
              </TouchableOpacity>
            )}
            {conversation.client?.email && (
              <TouchableOpacity style={styles.clientActionButton}>
                <Ionicons name="mail-outline" size={18} color={tokens.accent} />
              </TouchableOpacity>
            )}
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

        {/* Messages List */}
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {conversation.messages && conversation.messages.length > 0 ? (
            conversation.messages.map((msg, idx) => (
              <TouchableOpacity
                key={msg.id || idx}
                style={[
                  styles.messageBubble,
                  (msg.role === 'CLIENT' || msg.role === 'client')
                    ? styles.messageBubbleClient
                    : styles.messageBubbleYou,
                  selectedMessageForAI === msg.id && styles.messageBubbleSelected,
                  isSelectingForAI && styles.messageBubbleSelectable,
                ]}
                onPress={() => handleMessageTap(msg)}
                onLongPress={() => handleMessageLongPress(msg)}
                delayLongPress={400}
                activeOpacity={isSelectingForAI ? 0.6 : 0.8}
              >
                <View style={styles.messageHeader}>
                  <Ionicons
                    name={getMessageTypeIcon(msg.type)}
                    size={12}
                    color={tokens.textSecondary}
                  />
                  <Text style={styles.messageTime}>
                    {formatMessageTime(msg.timestamp)}
                  </Text>
                  {selectedMessageForAI === msg.id && (
                    <View style={styles.selectedForAIBadge}>
                      <Ionicons name="sparkles" size={10} color={tokens.textPrimary} />
                    </View>
                  )}
                </View>
                <Text style={styles.messageText}>{msg.content}</Text>
                {isSelectingForAI && (
                  <View style={styles.tapToSelectHint}>
                    <Ionicons name="hand-left-outline" size={12} color={tokens.accent} />
                    <Text style={styles.tapToSelectText}>Tap to select</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noMessages}>
              <Ionicons name="chatbubbles-outline" size={48} color={tokens.textSecondary} />
              <Text style={styles.noMessagesText}>No messages yet</Text>
            </View>
          )}

          {/* Summary Card */}
          {conversation.summary && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="document-text-outline" size={16} color={tokens.accent} />
                <Text style={styles.summaryTitle}>Summary</Text>
              </View>
              <Text style={styles.summaryText}>{conversation.summary}</Text>
            </View>
          )}

          {/* Next Actions */}
          {conversation.nextActions && conversation.nextActions.length > 0 && (
            <View style={styles.actionsCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="list-outline" size={16} color={tokens.accent} />
                <Text style={styles.summaryTitle}>Next Actions</Text>
              </View>
              {conversation.nextActions.map((action, idx) => (
                <View key={idx} style={styles.actionRow}>
                  <Ionicons name="checkbox-outline" size={14} color={tokens.accent} />
                  <Text style={styles.actionText}>{action}</Text>
                </View>
              ))}
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
          clientId={conversation?.clientId || conversation?.client?.id}
          onRequestSent={() => {
            console.log('[ConversationDetailScreen] Testimonial request sent');
          }}
        />

        {/* Message Actions Modal */}
        <MessageActionsModal
          visible={showMessageActionsModal}
          onClose={() => {
            setShowMessageActionsModal(false);
            setSelectedMessage(null);
          }}
          message={selectedMessage}
          isUserMessage={selectedMessage ? isUserMessage(selectedMessage) : false}
          isImportedClientMessage={selectedMessage ? isImportedClientMessage(selectedMessage) : true}
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
    statusIndicator: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginLeft: 8,
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
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: tokens.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    clientAvatarText: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    clientInfo: {
      flex: 1,
      marginLeft: 12,
    },
    clientName: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    clientContact: {
      color: tokens.textSecondary,
      fontSize: 12,
      marginTop: 2,
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
    messagesContainer: {
      flex: 1,
    },
    messagesContent: {
      padding: 16,
    },
    messageBubble: {
      maxWidth: '85%',
      padding: 12,
      borderRadius: 16,
      marginBottom: 12,
    },
    messageBubbleClient: {
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      alignSelf: 'flex-start',
      borderBottomLeftRadius: 4,
    },
    messageBubbleYou: {
      backgroundColor: tokens.accent,
      alignSelf: 'flex-end',
      borderBottomRightRadius: 4,
    },
    messageBubbleSelected: {
      borderWidth: 2,
      borderColor: tokens.accent,
    },
    messageBubbleSelectable: {
      transform: [{ scale: 0.98 }],
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    messageTime: {
      color: tokens.textSecondary,
      fontSize: 10,
    },
    selectedForAIBadge: {
      backgroundColor: tokens.accent,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginLeft: 'auto',
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
    messageText: {
      color: tokens.textPrimary,
      fontSize: 14,
      lineHeight: 20,
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
    summaryCard: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    summaryTitle: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    summaryText: {
      color: tokens.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    actionsCard: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 16,
      marginTop: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 8,
    },
    actionText: {
      flex: 1,
      color: tokens.textSecondary,
      fontSize: 13,
      lineHeight: 18,
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
    detailSummary: {
      color: tokens.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 8,
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
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    tag: {
      backgroundColor: tokens.background,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    tagText: {
      color: tokens.accent,
      fontSize: 11,
      fontWeight: '500',
    },
    priorityBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    priorityBadgeText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '700',
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
    insightSubtext: {
      color: tokens.textSecondary,
      fontSize: 11,
      marginTop: 8,
    },
    healthBar: {
      height: 8,
      backgroundColor: tokens.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    healthBarFill: {
      height: '100%',
      borderRadius: 4,
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
