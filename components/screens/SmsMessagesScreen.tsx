"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../../theme/ThemeContext";
import { SmsImportService, SmsThread } from "../../lib/services/SmsImportService";

interface SmsMessagesScreenProps {
  onBack: () => void;
  onSelectThread?: (threadId: string) => void;
}

export default function SmsMessagesScreen({ onBack, onSelectThread }: SmsMessagesScreenProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const [threads, setThreads] = useState<SmsThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, threads: 0, inbox: 0, sent: 0 });

  const loadThreads = useCallback(async () => {
    try {
      setError(null);
      const [threadList, smsStats] = await Promise.all([
        SmsImportService.getThreads(),
        SmsImportService.getStats(),
      ]);
      setThreads(threadList);
      setStats(smsStats);
    } catch (err) {
      console.error('[SmsMessagesScreen] Error loading threads:', err);
      setError('Failed to load SMS conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadThreads();
  }, [loadThreads]);

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatPhoneNumber = (phone: string): string => {
    // Format as (XXX) XXX-XXXX if it's a 10-digit number
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const renderThread = ({ item }: { item: SmsThread }) => (
    <TouchableOpacity
      style={styles.threadCard}
      onPress={() => onSelectThread?.(item.threadId)}
      activeOpacity={0.7}
    >
      <View style={styles.threadAvatar}>
        <Ionicons name="person" size={20} color={tokens.accent} />
      </View>
      <View style={styles.threadContent}>
        <View style={styles.threadHeader}>
          <Text style={styles.threadAddress} numberOfLines={1}>
            {item.contactName || formatPhoneNumber(item.address)}
          </Text>
          <Text style={styles.threadTime}>{formatTimestamp(item.lastTimestamp)}</Text>
        </View>
        <Text style={styles.threadPreview} numberOfLines={2}>
          {item.lastMessage}
        </Text>
        <View style={styles.threadMeta}>
          <View style={styles.messageBadge}>
            <Text style={styles.messageBadgeText}>{item.messageCount} messages</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={48} color={tokens.textSecondary} />
      <Text style={styles.emptyTitle}>No SMS Conversations</Text>
      <Text style={styles.emptyText}>
        {SmsImportService.isSupported()
          ? 'Sync your SMS messages from the Conversations screen to see them here.'
          : 'SMS sync is only available on Android devices.'}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.threads}</Text>
        <Text style={styles.statLabel}>Conversations</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.total}</Text>
        <Text style={styles.statLabel}>Messages</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.inbox}</Text>
        <Text style={styles.statLabel}>Received</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.sent}</Text>
        <Text style={styles.statLabel}>Sent</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={tokens.accent} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>SMS Messages</Text>
          <Text style={styles.subtitle}>All SMS conversations</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={18} color={tokens.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadThreads}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.threadId}
          renderItem={renderThread}
          ListHeaderComponent={threads.length > 0 ? renderHeader : null}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={threads.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={tokens.accent}
              colors={[tokens.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
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
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    titleContainer: {
      flex: 1,
      marginLeft: 12,
    },
    title: {
      color: tokens.textPrimary,
      fontSize: 18,
      fontWeight: '700',
    },
    subtitle: {
      color: tokens.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    refreshButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: tokens.textSecondary,
      fontSize: 14,
      marginTop: 12,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorText: {
      color: '#ef4444',
      fontSize: 14,
      textAlign: 'center',
      marginTop: 12,
    },
    retryButton: {
      marginTop: 16,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    retryText: {
      color: tokens.accent,
      fontSize: 14,
    },
    list: {
      padding: 16,
    },
    emptyList: {
      flex: 1,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 16,
      marginBottom: 16,
      borderRadius: 16,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      color: tokens.textPrimary,
      fontSize: 20,
      fontWeight: '700',
    },
    statLabel: {
      color: tokens.textSecondary,
      fontSize: 11,
      marginTop: 4,
      textTransform: 'uppercase',
    },
    threadCard: {
      flexDirection: 'row',
      padding: 12,
      marginBottom: 12,
      borderRadius: 16,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    threadAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: tokens.background,
      borderWidth: 1,
      borderColor: tokens.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    threadContent: {
      flex: 1,
      marginLeft: 12,
    },
    threadHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    threadAddress: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
      marginRight: 8,
    },
    threadTime: {
      color: tokens.textSecondary,
      fontSize: 11,
    },
    threadPreview: {
      color: tokens.textSecondary,
      fontSize: 13,
      marginTop: 4,
      lineHeight: 18,
    },
    threadMeta: {
      flexDirection: 'row',
      marginTop: 8,
    },
    messageBadge: {
      backgroundColor: tokens.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    messageBadgeText: {
      color: tokens.accent,
      fontSize: 10,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    emptyTitle: {
      color: tokens.textPrimary,
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
    },
    emptyText: {
      color: tokens.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
  });
