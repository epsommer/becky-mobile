/**
 * MilestoneCard Component
 *
 * Displays a single milestone with completion status.
 *
 * @module components/goals/MilestoneCard
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import {
  Milestone,
  GoalStatus,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from '../../services/goals';

export interface MilestoneCardProps {
  milestone: Milestone;
  onPress?: (milestone: Milestone) => void;
  onToggleComplete?: (milestone: Milestone) => void;
  compact?: boolean;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  onPress,
  onToggleComplete,
  compact = false,
}) => {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const statusColor = STATUS_COLORS[milestone.status];
  const priorityColor = PRIORITY_COLORS[milestone.priority];
  const isComplete = milestone.status === 'completed';

  const isOverdue =
    new Date(milestone.dueDate) < new Date() &&
    !isComplete &&
    milestone.status !== 'cancelled';

  const daysRemaining = useMemo(() => {
    const now = new Date();
    const due = new Date(milestone.dueDate);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [milestone.dueDate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMilestoneTypeIcon = (type: string) => {
    switch (type) {
      case 'checkpoint':
        return 'flag';
      case 'deadline':
        return 'time';
      case 'review':
        return 'clipboard';
      case 'deliverable':
        return 'document-text';
      default:
        return 'diamond';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isComplete && styles.containerComplete,
        isOverdue && styles.containerOverdue,
      ]}
      onPress={() => onPress?.(milestone)}
      activeOpacity={0.8}
    >
      {/* Checkbox */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          isComplete && styles.checkboxComplete,
        ]}
        onPress={() => onToggleComplete?.(milestone)}
      >
        {isComplete && (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        )}
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Ionicons
              name={getMilestoneTypeIcon(milestone.type) as any}
              size={14}
              color={isComplete ? tokens.textSecondary : statusColor}
            />
            <Text
              style={[
                styles.title,
                isComplete && styles.titleComplete,
              ]}
              numberOfLines={compact ? 1 : 2}
            >
              {milestone.title}
            </Text>
          </View>

          {!compact && (
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: statusColor + '20' },
              ]}
            >
              <Text style={[styles.typeText, { color: statusColor }]}>
                {milestone.type}
              </Text>
            </View>
          )}
        </View>

        {!compact && milestone.description && (
          <Text
            style={[styles.description, isComplete && styles.descriptionComplete]}
            numberOfLines={2}
          >
            {milestone.description}
          </Text>
        )}

        {/* Meta row */}
        <View style={styles.metaRow}>
          {/* Due date */}
          <View style={styles.metaItem}>
            <Ionicons
              name={isOverdue ? 'alert-circle' : 'calendar-outline'}
              size={12}
              color={isOverdue ? '#EF4444' : tokens.textSecondary}
            />
            <Text
              style={[
                styles.metaText,
                isOverdue && { color: '#EF4444', fontWeight: '600' },
              ]}
            >
              {isComplete && milestone.completedDate
                ? `Completed ${formatDate(milestone.completedDate)}`
                : isOverdue
                ? `Overdue by ${Math.abs(daysRemaining)} days`
                : daysRemaining === 0
                ? 'Due today'
                : daysRemaining === 1
                ? 'Due tomorrow'
                : `Due ${formatDate(milestone.dueDate)}`}
            </Text>
          </View>

          {/* Priority */}
          <View style={styles.metaItem}>
            <Ionicons
              name={
                milestone.priority === 'urgent'
                  ? 'flame'
                  : 'arrow-up-circle-outline'
              }
              size={12}
              color={priorityColor}
            />
            <Text style={[styles.metaText, { color: priorityColor }]}>
              {milestone.priority.charAt(0).toUpperCase() + milestone.priority.slice(1)}
            </Text>
          </View>

          {/* Estimated hours */}
          {milestone.estimatedHours && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={tokens.textSecondary} />
              <Text style={styles.metaText}>
                {milestone.estimatedHours}h
              </Text>
            </View>
          )}
        </View>

        {/* Progress bar (if not complete) */}
        {!isComplete && milestone.progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${milestone.progress}%`,
                    backgroundColor: statusColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{milestone.progress}%</Text>
          </View>
        )}

        {/* Tags */}
        {!compact && milestone.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {milestone.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            {milestone.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{milestone.tags.length - 3}</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    containerComplete: {
      opacity: 0.7,
      backgroundColor: tokens.background,
    },
    containerOverdue: {
      borderColor: '#EF4444',
      borderLeftWidth: 3,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: tokens.border,
      marginRight: 12,
      marginTop: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxComplete: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    content: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    titleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginRight: 8,
    },
    title: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    titleComplete: {
      textDecorationLine: 'line-through',
      color: tokens.textSecondary,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    typeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    description: {
      fontSize: 12,
      color: tokens.textSecondary,
      lineHeight: 18,
      marginBottom: 8,
    },
    descriptionComplete: {
      textDecorationLine: 'line-through',
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 11,
      color: tokens.textSecondary,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    progressBar: {
      flex: 1,
      height: 4,
      backgroundColor: tokens.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },
    progressText: {
      fontSize: 11,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 8,
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

export default MilestoneCard;
