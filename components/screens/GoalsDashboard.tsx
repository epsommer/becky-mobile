/**
 * GoalsDashboard Screen
 *
 * Comprehensive goals dashboard with:
 * - Quick stats overview
 * - Goal list with filtering and sorting
 * - Timeline visualization
 * - Goal creation and editing
 * - Progress tracking
 *
 * @module components/screens/GoalsDashboard
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import { useGoals, Goal, Milestone, GoalStatus, GoalCategory, GoalTimeframe, CreateGoalRequest, UpdateGoalRequest, GOAL_CATEGORIES, STATUS_COLORS } from '../../hooks/useGoals';
import {
  GoalCard,
  GoalCreationModal,
  GoalTimeline,
  GoalProgressBar,
  MilestoneCard,
} from '../goals';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'list' | 'timeline';
type SortBy = 'deadline' | 'priority' | 'progress' | 'created';
type FilterStatus = 'all' | GoalStatus;
type FilterCategory = 'all' | GoalCategory;

const GoalsDashboard: React.FC = () => {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const {
    goals,
    milestones,
    quickStats,
    loading,
    refreshing,
    error,
    activeGoals,
    completedGoals,
    overdueGoals,
    upcomingDeadlines,
    refresh,
    createGoal,
    updateGoal,
    deleteGoal,
    updateProgress,
    getMilestonesByGoalId,
    getGoalAnalytics,
    getPriorityColor,
    getStatusColor,
    getCategoryColor,
  } = useGoals();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [sortBy, setSortBy] = useState<SortBy>('deadline');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort goals
  const filteredGoals = useMemo(() => {
    let result = [...goals];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (goal) =>
          goal.title.toLowerCase().includes(query) ||
          goal.description?.toLowerCase().includes(query) ||
          goal.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter((goal) => goal.status === filterStatus);
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      result = result.filter((goal) => goal.category === filterCategory);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'deadline':
          comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'progress':
          comparison = a.progress - b.progress;
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [goals, searchQuery, filterStatus, filterCategory, sortBy, sortAsc]);

  // Handle goal save (create or update)
  const handleSaveGoal = useCallback(
    async (request: CreateGoalRequest | UpdateGoalRequest) => {
      if (editingGoal) {
        await updateGoal(editingGoal.id, request as UpdateGoalRequest);
      } else {
        await createGoal(request as CreateGoalRequest);
      }
      setEditingGoal(undefined);
    },
    [editingGoal, createGoal, updateGoal]
  );

  // Handle goal press
  const handleGoalPress = useCallback((goal: Goal) => {
    setSelectedGoal(goal);
  }, []);

  // Handle goal edit
  const handleEditGoal = useCallback((goal: Goal) => {
    setEditingGoal(goal);
    setShowCreateModal(true);
    setSelectedGoal(null);
  }, []);

  // Handle goal delete
  const handleDeleteGoal = useCallback(
    (goal: Goal) => {
      Alert.alert(
        'Delete Goal',
        `Are you sure you want to delete "${goal.title}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteGoal(goal.id);
              setSelectedGoal(null);
            },
          },
        ]
      );
    },
    [deleteGoal]
  );

  // Handle progress update
  const handleUpdateProgress = useCallback(
    async (goal: Goal, newProgress: number) => {
      await updateProgress(goal.id, newProgress, undefined, undefined);
    },
    [updateProgress]
  );

  // Render quick stats
  const renderQuickStats = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{quickStats.total}</Text>
        <Text style={styles.statLabel}>Total Goals</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statValue, { color: '#D4AF37' }]}>{quickStats.inProgress}</Text>
        <Text style={styles.statLabel}>In Progress</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statValue, { color: '#10B981' }]}>{quickStats.completed}</Text>
        <Text style={styles.statLabel}>Completed</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statValue, { color: '#EF4444' }]}>{quickStats.overdue}</Text>
        <Text style={styles.statLabel}>Overdue</Text>
      </View>
    </View>
  );

  // Render filters
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={tokens.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search goals..."
          placeholderTextColor={tokens.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={tokens.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterChipsScroll}
      >
        <View style={styles.filterChipsRow}>
          {/* View mode toggle */}
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons
                name="list"
                size={16}
                color={viewMode === 'list' ? '#FFFFFF' : tokens.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'timeline' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('timeline')}
            >
              <Ionicons
                name="calendar"
                size={16}
                color={viewMode === 'timeline' ? '#FFFFFF' : tokens.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Status filter */}
          <TouchableOpacity
            style={[styles.filterChip, filterStatus !== 'all' && styles.filterChipActive]}
            onPress={() => {
              const statuses: FilterStatus[] = ['all', 'in-progress', 'completed', 'overdue', 'not-started', 'paused'];
              const currentIndex = statuses.indexOf(filterStatus);
              setFilterStatus(statuses[(currentIndex + 1) % statuses.length]);
            }}
          >
            <Ionicons name="funnel" size={14} color={filterStatus !== 'all' ? tokens.accent : tokens.textSecondary} />
            <Text style={[styles.filterChipText, filterStatus !== 'all' && styles.filterChipTextActive]}>
              {filterStatus === 'all' ? 'Status' : filterStatus.replace('-', ' ')}
            </Text>
          </TouchableOpacity>

          {/* Category filter */}
          <TouchableOpacity
            style={[styles.filterChip, filterCategory !== 'all' && styles.filterChipActive]}
            onPress={() => {
              const categories: FilterCategory[] = ['all', ...GOAL_CATEGORIES.map((c) => c.value)];
              const currentIndex = categories.indexOf(filterCategory);
              setFilterCategory(categories[(currentIndex + 1) % categories.length]);
            }}
          >
            <Ionicons name="grid" size={14} color={filterCategory !== 'all' ? tokens.accent : tokens.textSecondary} />
            <Text style={[styles.filterChipText, filterCategory !== 'all' && styles.filterChipTextActive]}>
              {filterCategory === 'all' ? 'Category' : GOAL_CATEGORIES.find((c) => c.value === filterCategory)?.label || filterCategory}
            </Text>
          </TouchableOpacity>

          {/* Sort */}
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => {
              const sortOptions: SortBy[] = ['deadline', 'priority', 'progress', 'created'];
              const currentIndex = sortOptions.indexOf(sortBy);
              if (currentIndex === sortOptions.length - 1) {
                setSortAsc(!sortAsc);
                setSortBy(sortOptions[0]);
              } else {
                setSortBy(sortOptions[currentIndex + 1]);
              }
            }}
          >
            <Ionicons
              name={sortAsc ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={tokens.textSecondary}
            />
            <Text style={styles.filterChipText}>
              {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
            </Text>
          </TouchableOpacity>

          {/* Clear filters */}
          {(filterStatus !== 'all' || filterCategory !== 'all' || searchQuery) && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setFilterStatus('all');
                setFilterCategory('all');
                setSearchQuery('');
              }}
            >
              <Ionicons name="close" size={14} color="#EF4444" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );

  // Render goal detail panel
  const renderGoalDetail = () => {
    if (!selectedGoal) return null;

    const goalMilestones = getMilestonesByGoalId(selectedGoal.id);
    const analytics = getGoalAnalytics(selectedGoal.id);

    return (
      <View style={styles.detailPanel}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{selectedGoal.title}</Text>
          <TouchableOpacity onPress={() => setSelectedGoal(null)}>
            <Ionicons name="close" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {selectedGoal.description && (
            <Text style={styles.detailDescription}>{selectedGoal.description}</Text>
          )}

          {/* Progress section */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Progress</Text>
            <GoalProgressBar
              progress={selectedGoal.progress}
              currentValue={selectedGoal.currentValue}
              targetValue={selectedGoal.targetValue}
              progressUnit={selectedGoal.progressUnit}
              showValues
            />

            {/* Quick progress buttons */}
            <View style={styles.progressButtons}>
              {[25, 50, 75, 100].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.progressButton,
                    selectedGoal.progress >= p && styles.progressButtonActive,
                  ]}
                  onPress={() => handleUpdateProgress(selectedGoal, p)}
                >
                  <Text
                    style={[
                      styles.progressButtonText,
                      selectedGoal.progress >= p && styles.progressButtonTextActive,
                    ]}
                  >
                    {p}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Analytics */}
          {analytics && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Analytics</Text>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsValue}>
                    {analytics.timeToDeadline > 0 ? analytics.timeToDeadline : 'Overdue'}
                  </Text>
                  <Text style={styles.analyticsLabel}>Days to Deadline</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text style={[
                    styles.analyticsValue,
                    { color: analytics.riskLevel === 'high' ? '#EF4444' : analytics.riskLevel === 'medium' ? '#F59E0B' : '#10B981' }
                  ]}>
                    {analytics.riskLevel.charAt(0).toUpperCase() + analytics.riskLevel.slice(1)}
                  </Text>
                  <Text style={styles.analyticsLabel}>Risk Level</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsValue}>
                    {analytics.milestonesCompleted}/{analytics.milestonesTotal}
                  </Text>
                  <Text style={styles.analyticsLabel}>Milestones</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsValue}>
                    {analytics.timeSpent}h
                  </Text>
                  <Text style={styles.analyticsLabel}>Time Spent</Text>
                </View>
              </View>

              {/* Insights */}
              {analytics.insights.length > 0 && (
                <View style={styles.insightsContainer}>
                  {analytics.insights.map((insight, index) => (
                    <View
                      key={index}
                      style={[
                        styles.insightCard,
                        {
                          borderLeftColor:
                            insight.type === 'error'
                              ? '#EF4444'
                              : insight.type === 'warning'
                              ? '#F59E0B'
                              : insight.type === 'success'
                              ? '#10B981'
                              : '#6B7280',
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          insight.type === 'error'
                            ? 'alert-circle'
                            : insight.type === 'warning'
                            ? 'warning'
                            : insight.type === 'success'
                            ? 'checkmark-circle'
                            : 'information-circle'
                        }
                        size={16}
                        color={
                          insight.type === 'error'
                            ? '#EF4444'
                            : insight.type === 'warning'
                            ? '#F59E0B'
                            : insight.type === 'success'
                            ? '#10B981'
                            : '#6B7280'
                        }
                      />
                      <View style={styles.insightContent}>
                        <Text style={styles.insightMessage}>{insight.message}</Text>
                        {insight.suggestedAction && (
                          <Text style={styles.insightAction}>{insight.suggestedAction}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Milestones */}
          {goalMilestones.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Milestones ({goalMilestones.length})</Text>
              {goalMilestones.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  compact
                />
              ))}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.detailActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditGoal(selectedGoal)}
            >
              <Ionicons name="pencil" size={18} color={tokens.accent} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDanger]}
              onPress={() => handleDeleteGoal(selectedGoal)}
            >
              <Ionicons name="trash" size={18} color="#EF4444" />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="trophy" size={24} color={tokens.accent} />
          <Text style={styles.headerTitle}>Goals</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingGoal(undefined);
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tokens.accent} />
        }
      >
        {/* Quick stats */}
        {renderQuickStats()}

        {/* Average progress */}
        <View style={styles.overallProgress}>
          <Text style={styles.overallProgressLabel}>Overall Progress</Text>
          <GoalProgressBar
            progress={quickStats.averageProgress}
            height={10}
            showLabel={false}
          />
          <Text style={styles.overallProgressValue}>{quickStats.averageProgress}%</Text>
        </View>

        {/* Filters */}
        {renderFilters()}

        {/* Content based on view mode */}
        {viewMode === 'list' ? (
          <View style={styles.goalsList}>
            {filteredGoals.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="flag-outline" size={48} color={tokens.textSecondary} />
                <Text style={styles.emptyTitle}>No goals found</Text>
                <Text style={styles.emptyDescription}>
                  {searchQuery || filterStatus !== 'all' || filterCategory !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first goal to get started'}
                </Text>
                {!searchQuery && filterStatus === 'all' && filterCategory === 'all' && (
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => {
                      setEditingGoal(undefined);
                      setShowCreateModal(true);
                    }}
                  >
                    <Text style={styles.emptyButtonText}>Create Goal</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onPress={handleGoalPress}
                  onLongPress={handleEditGoal}
                  milestonesCount={getMilestonesByGoalId(goal.id).length}
                  completedMilestonesCount={
                    getMilestonesByGoalId(goal.id).filter((m) => m.status === 'completed').length
                  }
                />
              ))
            )}
          </View>
        ) : (
          <GoalTimeline
            goals={filteredGoals}
            milestones={milestones}
            viewMode="month"
            onGoalPress={handleGoalPress}
          />
        )}

        {/* Upcoming deadlines section */}
        {upcomingDeadlines.length > 0 && (
          <View style={styles.upcomingSection}>
            <Text style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={16} color={tokens.accent} /> Upcoming Deadlines
            </Text>
            {upcomingDeadlines.slice(0, 5).map((item) => (
              <View key={item.id} style={styles.upcomingItem}>
                <Ionicons
                  name={'endDate' in item ? 'flag' : 'diamond'}
                  size={14}
                  color={tokens.accent}
                />
                <Text style={styles.upcomingTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.upcomingDate}>
                  {'endDate' in item
                    ? new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Goal detail panel */}
      {selectedGoal && renderGoalDetail()}

      {/* Creation/Edit modal */}
      <GoalCreationModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingGoal(undefined);
        }}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
      />

      {/* Error display */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#FFFFFF" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: tokens.surface,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: tokens.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      minWidth: (SCREEN_WIDTH - 52) / 4,
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: tokens.border,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    statLabel: {
      fontSize: 10,
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 4,
    },
    overallProgress: {
      backgroundColor: tokens.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    overallProgressLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    overallProgressValue: {
      fontSize: 14,
      fontWeight: '700',
      color: tokens.textPrimary,
      textAlign: 'right',
      marginTop: 6,
    },
    filtersContainer: {
      marginBottom: 16,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: tokens.border,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: tokens.textPrimary,
    },
    filterChipsScroll: {
      marginHorizontal: -16,
      paddingHorizontal: 16,
    },
    filterChipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    viewModeToggle: {
      flexDirection: 'row',
      backgroundColor: tokens.surface,
      borderRadius: 8,
      padding: 4,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    viewModeButton: {
      padding: 6,
      borderRadius: 6,
    },
    viewModeButtonActive: {
      backgroundColor: tokens.accent,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: tokens.border,
      gap: 6,
    },
    filterChipActive: {
      borderColor: tokens.accent,
      backgroundColor: tokens.accent + '20',
    },
    filterChipText: {
      fontSize: 12,
      color: tokens.textSecondary,
      textTransform: 'capitalize',
    },
    filterChipTextActive: {
      color: tokens.accent,
      fontWeight: '600',
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 4,
    },
    clearButtonText: {
      fontSize: 12,
      color: '#EF4444',
      fontWeight: '500',
    },
    goalsList: {
      flex: 1,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginTop: 16,
    },
    emptyDescription: {
      fontSize: 14,
      color: tokens.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    emptyButton: {
      marginTop: 20,
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: tokens.accent,
      borderRadius: 12,
    },
    emptyButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    upcomingSection: {
      marginTop: 20,
      backgroundColor: tokens.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    sectionHeader: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginBottom: 12,
    },
    upcomingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
      gap: 10,
    },
    upcomingTitle: {
      flex: 1,
      fontSize: 13,
      color: tokens.textPrimary,
    },
    upcomingDate: {
      fontSize: 12,
      color: tokens.textSecondary,
    },
    detailPanel: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: tokens.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 10,
    },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    detailTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '700',
      color: tokens.textPrimary,
      marginRight: 12,
    },
    detailDescription: {
      fontSize: 14,
      color: tokens.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    detailSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    progressButtons: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    progressButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: tokens.border,
      alignItems: 'center',
    },
    progressButtonActive: {
      backgroundColor: tokens.accent,
    },
    progressButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    progressButtonTextActive: {
      color: '#FFFFFF',
    },
    analyticsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    analyticsItem: {
      width: '48%',
      backgroundColor: tokens.background,
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    analyticsValue: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    analyticsLabel: {
      fontSize: 10,
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 4,
    },
    insightsContainer: {
      marginTop: 12,
      gap: 8,
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: tokens.background,
      padding: 12,
      borderRadius: 10,
      borderLeftWidth: 3,
      gap: 10,
    },
    insightContent: {
      flex: 1,
    },
    insightMessage: {
      fontSize: 13,
      color: tokens.textPrimary,
      lineHeight: 18,
    },
    insightAction: {
      fontSize: 12,
      color: tokens.textSecondary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    detailActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: tokens.background,
      gap: 8,
    },
    actionButtonDanger: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.accent,
    },
    errorBanner: {
      position: 'absolute',
      bottom: 20,
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#EF4444',
      padding: 12,
      borderRadius: 10,
      gap: 8,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      color: '#FFFFFF',
    },
  });

export default GoalsDashboard;
