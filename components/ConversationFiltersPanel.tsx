"use client";

import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

// Filter types
export type ConversationViewMode = 'all' | 'individual' | 'master';
export type ConversationTypeFilter =
  | 'all'
  | 'email'
  | 'sms'
  | 'phone'
  | 'viber'
  | 'whatsapp'
  | 'messenger'
  | 'discord'
  | 'meeting'
  | 'other';
export type SortOrder = 'newest' | 'oldest';

export interface ConversationFilters {
  viewMode: ConversationViewMode;
  typeFilter: ConversationTypeFilter;
  sortOrder: SortOrder;
}

interface ConversationFiltersPanelProps {
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
  counts?: {
    all?: number;
    email?: number;
    sms?: number;
    phone?: number;
    viber?: number;
    whatsapp?: number;
    messenger?: number;
    discord?: number;
    meeting?: number;
    other?: number;
  };
}

const VIEW_MODES: { key: ConversationViewMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'individual', label: 'Individual', icon: 'chatbubble-outline' },
  { key: 'master', label: 'Master', icon: 'git-merge-outline' },
];

const TYPE_FILTERS: { key: ConversationTypeFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'email', label: 'Email', icon: 'mail-outline' },
  { key: 'sms', label: 'SMS', icon: 'chatbubble-ellipses-outline' },
  { key: 'phone', label: 'Phone', icon: 'call-outline' },
  { key: 'viber', label: 'Viber', icon: 'phone-portrait-outline' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { key: 'messenger', label: 'Messenger', icon: 'logo-facebook' },
  { key: 'discord', label: 'Discord', icon: 'logo-discord' },
  { key: 'meeting', label: 'Meeting', icon: 'videocam-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function ConversationFiltersPanel({
  filters,
  onFiltersChange,
  counts = {},
}: ConversationFiltersPanelProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const handleViewModeChange = (mode: ConversationViewMode) => {
    onFiltersChange({ ...filters, viewMode: mode });
  };

  const handleTypeFilterChange = (type: ConversationTypeFilter) => {
    onFiltersChange({ ...filters, typeFilter: type });
  };

  const handleSortOrderChange = () => {
    onFiltersChange({
      ...filters,
      sortOrder: filters.sortOrder === 'newest' ? 'oldest' : 'newest',
    });
  };

  return (
    <View style={styles.container}>
      {/* View Mode Toggle (All / Individual / Master) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>View</Text>
        <View style={styles.viewModeRow}>
          {VIEW_MODES.map((mode) => (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.viewModeButton,
                filters.viewMode === mode.key && styles.viewModeButtonActive,
              ]}
              onPress={() => handleViewModeChange(mode.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={mode.icon}
                size={14}
                color={filters.viewMode === mode.key ? tokens.textPrimary : tokens.textSecondary}
              />
              <Text
                style={[
                  styles.viewModeText,
                  filters.viewMode === mode.key && styles.viewModeTextActive,
                ]}
              >
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sort Order */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Sort</Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={handleSortOrderChange}
          activeOpacity={0.7}
        >
          <Ionicons
            name={filters.sortOrder === 'newest' ? 'arrow-down-outline' : 'arrow-up-outline'}
            size={14}
            color={tokens.textPrimary}
          />
          <Text style={styles.sortButtonText}>
            {filters.sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeFiltersRow}
        >
          {TYPE_FILTERS.map((type) => {
            const count = counts[type.key] ?? 0;
            const isActive = filters.typeFilter === type.key;

            return (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeFilterButton,
                  isActive && styles.typeFilterButtonActive,
                ]}
                onPress={() => handleTypeFilterChange(type.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={type.icon}
                  size={14}
                  color={isActive ? tokens.textPrimary : tokens.textSecondary}
                />
                <Text
                  style={[
                    styles.typeFilterText,
                    isActive && styles.typeFilterTextActive,
                  ]}
                >
                  {type.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                    <Text style={[styles.countBadgeText, isActive && styles.countBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Master Timeline Info */}
      {filters.viewMode === 'master' && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={tokens.accent} />
          <Text style={styles.infoText}>
            Master timeline combines all conversations, actions, receipts, and transcripts per client.
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      backgroundColor: tokens.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: tokens.border,
      padding: 12,
      marginBottom: 16,
    },
    section: {
      marginBottom: 12,
    },
    sectionLabel: {
      color: tokens.textSecondary,
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    viewModeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    viewModeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: tokens.background,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    viewModeButtonActive: {
      backgroundColor: tokens.accent,
      borderColor: tokens.accent,
    },
    viewModeText: {
      color: tokens.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    viewModeTextActive: {
      color: tokens.textPrimary,
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: tokens.background,
      borderWidth: 1,
      borderColor: tokens.border,
      alignSelf: 'flex-start',
    },
    sortButtonText: {
      color: tokens.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    typeFiltersRow: {
      flexDirection: 'row',
      gap: 8,
      paddingRight: 12,
    },
    typeFilterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: tokens.background,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    typeFilterButtonActive: {
      backgroundColor: tokens.accent,
      borderColor: tokens.accent,
    },
    typeFilterText: {
      color: tokens.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    typeFilterTextActive: {
      color: tokens.textPrimary,
    },
    countBadge: {
      backgroundColor: tokens.border,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 20,
      alignItems: 'center',
    },
    countBadgeActive: {
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    countBadgeText: {
      color: tokens.textSecondary,
      fontSize: 10,
      fontWeight: '700',
    },
    countBadgeTextActive: {
      color: tokens.textPrimary,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      backgroundColor: tokens.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tokens.accent,
      borderLeftWidth: 3,
      marginTop: 4,
    },
    infoText: {
      flex: 1,
      color: tokens.textSecondary,
      fontSize: 11,
      lineHeight: 16,
    },
  });
