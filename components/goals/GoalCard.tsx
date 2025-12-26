/**
 * GoalCard Component
 *
 * Displays a single goal with progress, status, and key information.
 * Neomorphic design for consistent mobile UI.
 *
 * @module components/goals/GoalCard
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import {
  Goal,
  GoalStatus,
  GoalCategory,
  Priority,
  GOAL_CATEGORIES,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from '../../services/goals';

export interface GoalCardProps {
  goal: Goal;
  onPress?: (goal: Goal) => void;
  onLongPress?: (goal: Goal) => void;
  showMilestones?: boolean;
  compact?: boolean;
  selected?: boolean;
  milestonesCount?: number;
  completedMilestonesCount?: number;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onPress,
  onLongPress,
  showMilestones = true,
  compact = false,
  selected = false,
  milestonesCount = 0,
  completedMilestonesCount = 0,
}) => {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const categoryInfo = GOAL_CATEGORIES.find((c) => c.value === goal.category);
  const statusColor = STATUS_COLORS[goal.status];
  const priorityColor = PRIORITY_COLORS[goal.priority];

  const isOverdue =
    new Date(goal.endDate) < new Date() &&
    goal.status !== 'completed' &&
    goal.status !== 'cancelled';

  const daysRemaining = useMemo(() => {
    const now = new Date();
    const end = new Date(goal.endDate);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [goal.endDate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatStatusName = (status: GoalStatus) => {
    return status
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusIcon = (status: GoalStatus) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'in-progress':
        return 'play-circle';
      case 'not-started':
        return 'ellipse-outline';
      case 'overdue':
        return 'alert-circle';
      case 'paused':
        return 'pause-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'ellipse-outline';
    }
  };

  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 'urgent':
        return 'flame';
      case 'high':
        return 'arrow-up-circle';
      case 'medium':
        return 'remove-circle';
      case 'low':
        return 'arrow-down-circle';
      default:
        return 'remove-circle';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && styles.containerSelected,
        isOverdue && styles.containerOverdue,
      ]}
      onPress={() => onPress?.(goal)}
      onLongPress={() => onLongPress?.(goal)}
      activeOpacity={0.8}
    >
      {/* Category color bar */}
      <View
        style={[
          styles.categoryBar,
          { backgroundColor: categoryInfo?.color || '#6B7280' },
        ]}
      />

      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={compact ? 1 : 2}>
              {goal.title}
            </Text>
            {!compact && goal.description && (
              <Text style={styles.description} numberOfLines={2}>
                {goal.description}
              </Text>
            )}
          </View>

          <View style={styles.statusBadge}>
            <View
              style={[
                styles.badgeContent,
                { backgroundColor: statusColor + '20' },
              ]}
            >
              <Ionicons
                name={getStatusIcon(goal.status)}
                size={12}
                color={statusColor}
              />
              {!compact && (
                <Text style={[styles.badgeText, { color: statusColor }]}>
                  {formatStatusName(goal.status)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>{Math.round(goal.progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${goal.progress}%`,
                  backgroundColor:
                    goal.progress >= 100
                      ? '#10B981'
                      : goal.progress >= 75
                      ? '#D4AF37'
                      : goal.progress >= 50
                      ? '#F59E0B'
                      : '#6B7280',
                },
              ]}
            />
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          {/* Priority */}
          <View style={styles.metaItem}>
            <Ionicons
              name={getPriorityIcon(goal.priority)}
              size={14}
              color={priorityColor}
            />
            <Text style={[styles.metaText, { color: priorityColor }]}>
              {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
            </Text>
          </View>

          {/* Category */}
          <View style={styles.metaItem}>
            <View
              style={[
                styles.categoryDot,
                { backgroundColor: categoryInfo?.color || '#6B7280' },
              ]}
            />
            <Text style={styles.metaText}>{categoryInfo?.label || goal.category}</Text>
          </View>

          {/* Timeframe */}
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={tokens.textSecondary} />
            <Text style={styles.metaText}>
              {goal.timeframe.charAt(0).toUpperCase() + goal.timeframe.slice(1)}
            </Text>
          </View>
        </View>

        {/* Footer row */}
        <View style={styles.footerRow}>
          {/* Deadline */}
          <View style={styles.deadlineContainer}>
            <Ionicons
              name={isOverdue ? 'alert-circle' : 'time-outline'}
              size={14}
              color={isOverdue ? '#EF4444' : tokens.textSecondary}
            />
            <Text
              style={[
                styles.deadlineText,
                isOverdue && { color: '#EF4444', fontWeight: '600' },
              ]}
            >
              {isOverdue
                ? `Overdue by ${Math.abs(daysRemaining)} days`
                : daysRemaining === 0
                ? 'Due today'
                : daysRemaining === 1
                ? 'Due tomorrow'
                : `${daysRemaining} days left`}
            </Text>
          </View>

          {/* Milestones */}
          {showMilestones && milestonesCount > 0 && (
            <View style={styles.milestonesContainer}>
              <Ionicons name="flag-outline" size={14} color={tokens.textSecondary} />
              <Text style={styles.milestonesText}>
                {completedMilestonesCount}/{milestonesCount}
              </Text>
            </View>
          )}

          {/* Tags */}
          {goal.tags.length > 0 && !compact && (
            <View style={styles.tagsContainer}>
              {goal.tags.slice(0, 2).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
              {goal.tags.length > 2 && (
                <Text style={styles.moreTagsText}>+{goal.tags.length - 2}</Text>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      marginBottom: 12,
      borderRadius: 16,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      overflow: 'hidden',
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    containerSelected: {
      borderColor: tokens.accent,
      borderWidth: 2,
    },
    containerOverdue: {
      borderLeftColor: '#EF4444',
      borderLeftWidth: 3,
    },
    categoryBar: {
      width: 4,
      borderTopLeftRadius: 16,
      borderBottomLeftRadius: 16,
    },
    content: {
      flex: 1,
      padding: 14,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    titleContainer: {
      flex: 1,
      marginRight: 10,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: tokens.textPrimary,
      letterSpacing: 0.3,
    },
    description: {
      fontSize: 13,
      color: tokens.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    statusBadge: {
      flexShrink: 0,
    },
    badgeContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    progressContainer: {
      marginBottom: 10,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    progressLabel: {
      fontSize: 11,
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    progressValue: {
      fontSize: 13,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    progressBar: {
      height: 6,
      backgroundColor: tokens.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 10,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 11,
      color: tokens.textSecondary,
      textTransform: 'capitalize',
    },
    categoryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    deadlineContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    deadlineText: {
      fontSize: 11,
      color: tokens.textSecondary,
    },
    milestonesContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    milestonesText: {
      fontSize: 11,
      color: tokens.textSecondary,
    },
    tagsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tag: {
      backgroundColor: tokens.border,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    tagText: {
      fontSize: 9,
      color: tokens.textSecondary,
      fontWeight: '500',
    },
    moreTagsText: {
      fontSize: 9,
      color: tokens.textSecondary,
    },
  });

export default GoalCard;
