"use client";

import React, { useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, ThemeTokens } from "../../theme/ThemeContext";
import NeomorphicCard from "../NeomorphicCard";
import {
  useFollowups,
  FollowUp,
  FollowUpStatus,
  FollowUpCategory,
  PriorityLevel,
} from "../../hooks/useFollowups";

interface FollowUpDashboardScreenProps {
  onViewClient?: (clientId: string) => void;
}

type FilterTab = 'all' | 'today' | 'overdue' | 'upcoming' | 'completed';

export default function FollowUpDashboardScreen({ onViewClient }: FollowUpDashboardScreenProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const {
    followUps,
    quickStats,
    loading,
    refreshing,
    error,
    todayFollowUps,
    overdueFollowUps,
    upcomingFollowUps,
    completedFollowUps,
    refresh,
    fetchFollowUps,
    updateFollowUp,
    completeFollowUp,
    rescheduleFollowUp,
    cancelFollowUp,
    getPriorityColor,
    getStatusColor,
    formatCategoryName,
    isOverdue,
    filters,
    setFilters,
    clearFilters,
  } = useFollowups();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<FollowUpCategory | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | ''>('');

  // Get filtered follow-ups based on active tab
  const getFilteredFollowUps = useCallback((): FollowUp[] => {
    let filtered: FollowUp[];

    switch (activeTab) {
      case 'today':
        filtered = todayFollowUps;
        break;
      case 'overdue':
        filtered = overdueFollowUps;
        break;
      case 'upcoming':
        filtered = upcomingFollowUps;
        break;
      case 'completed':
        filtered = completedFollowUps;
        break;
      default:
        filtered = followUps;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (fu) =>
          fu.title.toLowerCase().includes(query) ||
          fu.client.name.toLowerCase().includes(query) ||
          (fu.notes && fu.notes.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((fu) => fu.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter((fu) => fu.category === categoryFilter);
    }

    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter((fu) => fu.priority === priorityFilter);
    }

    return filtered;
  }, [
    activeTab,
    followUps,
    todayFollowUps,
    overdueFollowUps,
    upcomingFollowUps,
    completedFollowUps,
    searchQuery,
    statusFilter,
    categoryFilter,
    priorityFilter,
  ]);

  const filteredFollowUps = getFilteredFollowUps();

  // Handle marking follow-up as complete
  const handleComplete = useCallback(async (followUp: FollowUp) => {
    Alert.prompt(
      'Complete Follow-up',
      'Add an outcome note for this follow-up:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async (outcome) => {
            await completeFollowUp(followUp.id, {
              outcome: outcome || 'Completed',
            });
            setShowActionModal(false);
            setSelectedFollowUp(null);
          },
        },
      ],
      'plain-text',
      ''
    );
  }, [completeFollowUp]);

  // Handle rescheduling
  const handleReschedule = useCallback(async (followUp: FollowUp) => {
    // For simplicity, reschedule to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    await rescheduleFollowUp(followUp.id, tomorrow.toISOString());
    setShowActionModal(false);
    setSelectedFollowUp(null);
    Alert.alert('Success', 'Follow-up rescheduled to tomorrow at 9:00 AM');
  }, [rescheduleFollowUp]);

  // Handle cancel
  const handleCancel = useCallback(async (followUp: FollowUp) => {
    Alert.alert(
      'Cancel Follow-up',
      'Are you sure you want to cancel this follow-up?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            await cancelFollowUp(followUp.id);
            setShowActionModal(false);
            setSelectedFollowUp(null);
          },
        },
      ]
    );
  }, [cancelFollowUp]);

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Render stat card
  const renderStatCard = (
    icon: keyof typeof Ionicons.glyphMap,
    value: number,
    label: string,
    color: string
  ) => (
    <NeomorphicCard style={styles.statCard}>
      <View style={styles.statContent}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.statValue, { color: tokens.textPrimary }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: tokens.textSecondary }]}>{label}</Text>
      </View>
    </NeomorphicCard>
  );

  // Render follow-up item
  const renderFollowUpItem = (followUp: FollowUp) => {
    const overdue = isOverdue(followUp);

    return (
      <TouchableOpacity
        key={followUp.id}
        style={[
          styles.followUpItem,
          { borderColor: tokens.border },
          overdue && styles.overdueItem,
        ]}
        onPress={() => {
          setSelectedFollowUp(followUp);
          setShowActionModal(true);
        }}
      >
        <View style={styles.followUpHeader}>
          <View style={styles.followUpTitleRow}>
            <View
              style={[
                styles.priorityIndicator,
                { backgroundColor: getPriorityColor(followUp.priority) },
              ]}
            />
            <Text
              style={[styles.followUpTitle, { color: tokens.textPrimary }]}
              numberOfLines={1}
            >
              {followUp.title}
            </Text>
          </View>
          <View style={styles.badges}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(followUp.status) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: getStatusColor(followUp.status) },
                ]}
              >
                {followUp.status}
              </Text>
            </View>
            {overdue && (
              <View style={[styles.overdueBadge, { backgroundColor: '#EF444420' }]}>
                <Text style={[styles.overdueBadgeText, { color: '#EF4444' }]}>
                  OVERDUE
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.followUpDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={14} color={tokens.textSecondary} />
            <Text style={[styles.detailText, { color: tokens.textSecondary }]}>
              {followUp.client.name}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={tokens.textSecondary} />
            <Text style={[styles.detailText, { color: tokens.textSecondary }]}>
              {formatDate(followUp.scheduledDate)} at {formatTime(followUp.scheduledDate)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={14} color={tokens.textSecondary} />
            <Text style={[styles.detailText, { color: tokens.textSecondary }]}>
              {formatCategoryName(followUp.category)}
            </Text>
          </View>
        </View>

        {followUp.notes && (
          <Text
            style={[styles.followUpNotes, { color: tokens.textSecondary }]}
            numberOfLines={2}
          >
            {followUp.notes}
          </Text>
        )}

        <View style={styles.followUpActions}>
          {['SCHEDULED', 'CONFIRMED'].includes(followUp.status) && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: tokens.accent + '20' }]}
                onPress={() => handleComplete(followUp)}
              >
                <Ionicons name="checkmark" size={16} color={tokens.accent} />
                <Text style={[styles.actionButtonText, { color: tokens.accent }]}>
                  Complete
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: tokens.border }]}
                onPress={() => handleReschedule(followUp)}
              >
                <Ionicons name="calendar" size={16} color={tokens.textSecondary} />
                <Text style={[styles.actionButtonText, { color: tokens.textSecondary }]}>
                  Reschedule
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render filter tabs
  const renderFilterTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContainer}
    >
      {[
        { key: 'all', label: 'All', count: followUps.length },
        { key: 'today', label: 'Today', count: quickStats.today },
        { key: 'overdue', label: 'Overdue', count: quickStats.overdue },
        { key: 'upcoming', label: 'Upcoming', count: quickStats.upcoming },
        { key: 'completed', label: 'Completed', count: quickStats.completed },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            { borderColor: tokens.border },
            activeTab === tab.key && { backgroundColor: tokens.accent, borderColor: tokens.accent },
          ]}
          onPress={() => setActiveTab(tab.key as FilterTab)}
        >
          <Text
            style={[
              styles.tabText,
              { color: tokens.textSecondary },
              activeTab === tab.key && { color: tokens.background },
            ]}
          >
            {tab.label}
          </Text>
          {tab.count > 0 && (
            <View
              style={[
                styles.tabBadge,
                { backgroundColor: activeTab === tab.key ? tokens.background : tokens.accent },
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  { color: activeTab === tab.key ? tokens.accent : tokens.background },
                ]}
              >
                {tab.count}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={tokens.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
              Follow-up Dashboard
            </Text>
            <Text style={[styles.headerSubtitle, { color: tokens.textSecondary }]}>
              Manage and track client follow-ups
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: tokens.accent }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color={tokens.background} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          {renderStatCard('calendar', quickStats.total, 'Total', tokens.accent)}
          {renderStatCard('today', quickStats.today, 'Today', '#22C55E')}
          {renderStatCard('time', quickStats.upcoming, 'Upcoming', '#F59E0B')}
          {renderStatCard('warning', quickStats.overdue, 'Overdue', '#EF4444')}
        </View>

        {/* Search and Filters */}
        <View style={[styles.searchSection, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={[styles.searchContainer, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
            <Ionicons name="search" size={18} color={tokens.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: tokens.textPrimary }]}
              placeholder="Search follow-ups..."
              placeholderTextColor={tokens.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close" size={16} color={tokens.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: tokens.background, borderColor: tokens.border },
              showFilters && { backgroundColor: tokens.accent },
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="filter"
              size={18}
              color={showFilters ? tokens.background : tokens.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Expanded Filters */}
        {showFilters && (
          <View style={[styles.filtersExpanded, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  {['', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'MISSED'].map((status) => (
                    <TouchableOpacity
                      key={status || 'all'}
                      style={[
                        styles.filterOption,
                        { borderColor: tokens.border },
                        statusFilter === status && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                      ]}
                      onPress={() => setStatusFilter(status as FollowUpStatus | '')}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          { color: tokens.textSecondary },
                          statusFilter === status && { color: tokens.background },
                        ]}
                      >
                        {status || 'All'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>Priority</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  {['', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((priority) => (
                    <TouchableOpacity
                      key={priority || 'all'}
                      style={[
                        styles.filterOption,
                        { borderColor: tokens.border },
                        priorityFilter === priority && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                      ]}
                      onPress={() => setPriorityFilter(priority as PriorityLevel | '')}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          { color: tokens.textSecondary },
                          priorityFilter === priority && { color: tokens.background },
                        ]}
                      >
                        {priority || 'All'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.clearFiltersButton, { borderColor: tokens.border }]}
              onPress={() => {
                setStatusFilter('');
                setCategoryFilter('');
                setPriorityFilter('');
              }}
            >
              <Text style={[styles.clearFiltersText, { color: tokens.textSecondary }]}>
                Clear Filters
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filter Tabs */}
        {renderFilterTabs()}

        {/* Follow-ups List */}
        <View style={styles.listSection}>
          <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
            {activeTab === 'all' ? 'All Follow-ups' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            {' '}({filteredFollowUps.length})
          </Text>

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
                Loading follow-ups...
              </Text>
            </View>
          ) : filteredFollowUps.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={tokens.textSecondary} />
              <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
                No follow-ups found
              </Text>
              <Text style={[styles.emptySubtext, { color: tokens.textSecondary }]}>
                {searchQuery ? 'Try adjusting your search' : 'Create a new follow-up to get started'}
              </Text>
            </View>
          ) : (
            <View style={styles.followUpsList}>
              {filteredFollowUps.map(renderFollowUpItem)}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Modal */}
      <Modal
        transparent
        visible={showActionModal}
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowActionModal(false)}
        />
        <View style={[styles.actionModal, { backgroundColor: tokens.surface }]}>
          {selectedFollowUp && (
            <>
              <Text style={[styles.modalTitle, { color: tokens.textPrimary }]}>
                {selectedFollowUp.title}
              </Text>
              <Text style={[styles.modalSubtitle, { color: tokens.textSecondary }]}>
                {selectedFollowUp.client.name}
              </Text>

              <View style={styles.modalActions}>
                {['SCHEDULED', 'CONFIRMED'].includes(selectedFollowUp.status) && (
                  <>
                    <TouchableOpacity
                      style={[styles.modalActionButton, { backgroundColor: '#22C55E20' }]}
                      onPress={() => handleComplete(selectedFollowUp)}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                      <Text style={[styles.modalActionText, { color: '#22C55E' }]}>
                        Mark Complete
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalActionButton, { backgroundColor: '#F59E0B20' }]}
                      onPress={() => handleReschedule(selectedFollowUp)}
                    >
                      <Ionicons name="calendar" size={24} color="#F59E0B" />
                      <Text style={[styles.modalActionText, { color: '#F59E0B' }]}>
                        Reschedule
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalActionButton, { backgroundColor: '#EF444420' }]}
                      onPress={() => handleCancel(selectedFollowUp)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                      <Text style={[styles.modalActionText, { color: '#EF4444' }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {selectedFollowUp.client.phone && (
                  <TouchableOpacity
                    style={[styles.modalActionButton, { backgroundColor: tokens.accent + '20' }]}
                    onPress={() => {
                      // TODO: Implement call
                      Alert.alert('Call', `Calling ${selectedFollowUp.client.phone}`);
                    }}
                  >
                    <Ionicons name="call" size={24} color={tokens.accent} />
                    <Text style={[styles.modalActionText, { color: tokens.accent }]}>
                      Call Client
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: tokens.border }]}
                  onPress={() => {
                    setShowActionModal(false);
                    onViewClient?.(selectedFollowUp.clientId);
                  }}
                >
                  <Ionicons name="person" size={24} color={tokens.textSecondary} />
                  <Text style={[styles.modalActionText, { color: tokens.textSecondary }]}>
                    View Client
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.closeButton, { borderColor: tokens.border }]}
                onPress={() => setShowActionModal(false)}
              >
                <Text style={[styles.closeButtonText, { color: tokens.textSecondary }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* Create Modal Placeholder */}
      <Modal
        transparent
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCreateModal(false)}
        />
        <View style={[styles.createModal, { backgroundColor: tokens.surface }]}>
          <Text style={[styles.modalTitle, { color: tokens.textPrimary }]}>
            Create Follow-up
          </Text>
          <Text style={[styles.modalSubtitle, { color: tokens.textSecondary }]}>
            Follow-up creation form coming soon
          </Text>
          <TouchableOpacity
            style={[styles.closeButton, { borderColor: tokens.border }]}
            onPress={() => setShowCreateModal(false)}
          >
            <Text style={[styles.closeButtonText, { color: tokens.textSecondary }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      fontFamily: 'Bytesized-Regular',
    },
    headerSubtitle: {
      fontSize: 14,
      marginTop: 4,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 8,
    },
    statCard: {
      flex: 1,
      borderRadius: 12,
      padding: 12,
    },
    statContent: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      marginTop: 4,
    },
    statLabel: {
      fontSize: 10,
      textTransform: 'uppercase',
      marginTop: 2,
    },
    searchSection: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      padding: 12,
      marginBottom: 12,
      gap: 8,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      padding: 0,
    },
    filterButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filtersExpanded: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
    },
    filterGroup: {
      marginBottom: 12,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    filterOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    filterOption: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
    filterOptionText: {
      fontSize: 12,
      fontWeight: '500',
    },
    clearFiltersButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
    clearFiltersText: {
      fontSize: 12,
      fontWeight: '500',
    },
    tabsContainer: {
      paddingVertical: 8,
      gap: 8,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      marginRight: 8,
      gap: 6,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
    },
    tabBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    tabBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    listSection: {
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 12,
    },
    emptySubtext: {
      fontSize: 13,
      marginTop: 4,
      textAlign: 'center',
    },
    followUpsList: {
      gap: 12,
    },
    followUpItem: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      backgroundColor: tokens.surface,
    },
    overdueItem: {
      borderColor: '#EF4444',
    },
    followUpHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    followUpTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 8,
    },
    priorityIndicator: {
      width: 4,
      height: 20,
      borderRadius: 2,
      marginRight: 10,
    },
    followUpTitle: {
      fontSize: 16,
      fontWeight: '600',
      flex: 1,
    },
    badges: {
      flexDirection: 'row',
      gap: 6,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    overdueBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    overdueBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    followUpDetails: {
      gap: 6,
      marginBottom: 8,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailText: {
      fontSize: 13,
    },
    followUpNotes: {
      fontSize: 12,
      marginTop: 8,
      fontStyle: 'italic',
    },
    followUpActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 6,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '600',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    actionModal: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
    },
    createModal: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: 14,
      marginBottom: 20,
    },
    modalActions: {
      gap: 12,
      marginBottom: 20,
    },
    modalActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 12,
    },
    modalActionText: {
      fontSize: 16,
      fontWeight: '600',
    },
    closeButton: {
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    closeButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
