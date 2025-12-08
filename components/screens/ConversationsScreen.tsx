"use client";

import React, { useState, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ConversationTimelinePanel from "../ConversationTimelinePanel";
import ConversationSummaryPanel from "../ConversationSummaryPanel";
import ClientConversationsPanel from "../ClientConversationsPanel";
import ConversationDetailPanel from "../ConversationDetailPanel";
import ConversationFiltersPanel, {
  ConversationFilters,
  ConversationViewMode,
  ConversationTypeFilter,
  SortOrder,
} from "../ConversationFiltersPanel";
import { ThemeTokens, useTheme } from "../../theme/ThemeContext";
import { SmsImportService } from "../../lib/services/SmsImportService";

interface ConversationsScreenProps {
  onViewSmsMessages?: () => void;
  onViewConversation?: (conversationId: string) => void;
  onViewMasterTimeline?: (clientId: string) => void;
}

const DEFAULT_FILTERS: ConversationFilters = {
  viewMode: 'all',
  typeFilter: 'all',
  sortOrder: 'newest',
};

export default function ConversationsScreen({
  onViewSmsMessages,
  onViewConversation,
  onViewMasterTimeline,
}: ConversationsScreenProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState<ConversationFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCounts, setFilterCounts] = useState<Record<string, number>>({});

  const handleSyncSms = useCallback(async () => {
    if (!SmsImportService.isSupported()) {
      Alert.alert(
        'Not Supported',
        'SMS sync is only available on Android devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check/request permission
    const hasPermission = await SmsImportService.checkPermission();
    if (!hasPermission) {
      const granted = await SmsImportService.requestPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'SMS permission is required to sync your messages. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Start sync
    setSyncing(true);
    try {
      const result = await SmsImportService.importSms();

      if (result.success) {
        Alert.alert(
          'Sync Complete',
          `Imported ${result.imported} new messages, updated ${result.updated} existing.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sync Failed',
          result.error || 'An error occurred while syncing SMS messages.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[ConversationsScreen] SMS sync error:', error);
      Alert.alert(
        'Sync Error',
        'An unexpected error occurred while syncing SMS messages.',
        [{ text: 'OK' }]
      );
    } finally {
      setSyncing(false);
    }
  }, []);

  const handleFilterCountsUpdate = useCallback((counts: Record<string, number>) => {
    setFilterCounts(counts);
  }, []);

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.viewMode !== 'all') count++;
    if (filters.typeFilter !== 'all') count++;
    if (filters.sortOrder !== 'newest') count++;
    return count;
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.heading}>Conversations</Text>
          <Text style={styles.subheading}>Real-time threads</Text>
        </View>
        {/* Filter Toggle Button */}
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showFilters ? 'options' : 'options-outline'}
            size={18}
            color={showFilters ? tokens.textPrimary : tokens.accent}
          />
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <ConversationFiltersPanel
          filters={filters}
          onFiltersChange={setFilters}
          counts={filterCounts}
        />
      )}

      {/* SMS Actions */}
      <View style={styles.smsActions}>
        <TouchableOpacity
          style={[styles.smsButton, syncing && styles.smsButtonDisabled]}
          onPress={handleSyncSms}
          disabled={syncing}
          activeOpacity={0.7}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={tokens.textPrimary} />
          ) : (
            <Ionicons name="sync" size={16} color={tokens.textPrimary} />
          )}
          <Text style={styles.smsButtonText}>
            {syncing ? 'Syncing...' : 'Sync SMS'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.smsButton}
          onPress={onViewSmsMessages}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubbles" size={16} color={tokens.textPrimary} />
          <Text style={styles.smsButtonText}>All SMS</Text>
        </TouchableOpacity>
      </View>

      <ConversationTimelinePanel
        filters={filters}
        onConversationSelect={onViewConversation}
        onMasterTimelineSelect={onViewMasterTimeline}
      />
      <ConversationSummaryPanel />
      <ClientConversationsPanel
        filters={filters}
        onFilterCountsUpdate={handleFilterCountsUpdate}
        onConversationSelect={onViewConversation}
        onMasterTimelineSelect={onViewMasterTimeline}
      />
      <ConversationDetailPanel />
    </ScrollView>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    headerText: {
      flex: 1,
    },
    heading: {
      color: tokens.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    subheading: {
      color: tokens.textSecondary,
      fontSize: 12,
    },
    filterButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    filterButtonActive: {
      backgroundColor: tokens.accent,
      borderColor: tokens.accent,
    },
    filterBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: tokens.accent,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: tokens.background,
    },
    filterBadgeText: {
      color: tokens.textPrimary,
      fontSize: 10,
      fontWeight: '700',
    },
    smsActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    smsButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    smsButtonDisabled: {
      opacity: 0.6,
    },
    smsButtonText: {
      color: tokens.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
  });
