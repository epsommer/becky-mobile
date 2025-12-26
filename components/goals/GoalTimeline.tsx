/**
 * GoalTimeline Component
 *
 * Visual timeline of goals and milestones.
 *
 * @module components/goals/GoalTimeline
 */

import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import {
  Goal,
  Milestone,
  GoalStatus,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from '../../services/goals';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIMELINE_DAY_WIDTH = 40;

export interface GoalTimelineProps {
  goals: Goal[];
  milestones: Milestone[];
  viewMode?: 'week' | 'month' | 'quarter';
  onGoalPress?: (goal: Goal) => void;
  onMilestonePress?: (milestone: Milestone) => void;
}

interface TimelineItem {
  id: string;
  type: 'goal' | 'milestone';
  title: string;
  startDate: Date;
  endDate: Date;
  status: GoalStatus;
  progress?: number;
  color: string;
  data: Goal | Milestone;
}

const GoalTimeline: React.FC<GoalTimelineProps> = ({
  goals,
  milestones,
  viewMode = 'month',
  onGoalPress,
  onMilestonePress,
}) => {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calculate date range
  const dateRange = useMemo(() => {
    const start = new Date(selectedDate);
    const end = new Date(selectedDate);

    switch (viewMode) {
      case 'week':
        start.setDate(start.getDate() - start.getDay());
        end.setDate(start.getDate() + 6);
        break;
      case 'month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        break;
      case 'quarter':
        const quarter = Math.floor(start.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        end.setMonth(quarter * 3 + 3, 0);
        break;
    }

    return { start, end };
  }, [selectedDate, viewMode]);

  // Generate dates for the timeline
  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [dateRange]);

  // Convert goals and milestones to timeline items
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    goals.forEach((goal) => {
      const start = new Date(goal.startDate);
      const end = new Date(goal.endDate);

      // Check if goal overlaps with visible range
      if (end >= dateRange.start && start <= dateRange.end) {
        items.push({
          id: goal.id,
          type: 'goal',
          title: goal.title,
          startDate: start,
          endDate: end,
          status: goal.status,
          progress: goal.progress,
          color: goal.color || PRIORITY_COLORS[goal.priority],
          data: goal,
        });
      }
    });

    milestones.forEach((milestone) => {
      const date = new Date(milestone.dueDate);

      // Check if milestone is in visible range
      if (date >= dateRange.start && date <= dateRange.end) {
        items.push({
          id: milestone.id,
          type: 'milestone',
          title: milestone.title,
          startDate: date,
          endDate: date,
          status: milestone.status,
          progress: milestone.progress,
          color: milestone.color || PRIORITY_COLORS[milestone.priority],
          data: milestone,
        });
      }
    });

    return items.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [goals, milestones, dateRange]);

  // Navigate months
  const navigatePrevious = () => {
    const newDate = new Date(selectedDate);
    switch (viewMode) {
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'quarter':
        newDate.setMonth(newDate.getMonth() - 3);
        break;
    }
    setSelectedDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(selectedDate);
    switch (viewMode) {
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'quarter':
        newDate.setMonth(newDate.getMonth() + 3);
        break;
    }
    setSelectedDate(newDate);
  };

  // Get title for the current view
  const getViewTitle = () => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      year: 'numeric',
    };

    switch (viewMode) {
      case 'week':
        return `Week of ${dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'quarter':
        const quarter = Math.floor(dateRange.start.getMonth() / 3) + 1;
        return `Q${quarter} ${dateRange.start.getFullYear()}`;
      default:
        return dateRange.start.toLocaleDateString('en-US', options);
    }
  };

  // Calculate item position and width
  const getItemStyle = (item: TimelineItem) => {
    const totalDays = timelineDates.length;
    const startIndex = Math.max(
      0,
      Math.floor(
        (item.startDate.getTime() - dateRange.start.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const endIndex = Math.min(
      totalDays - 1,
      Math.floor(
        (item.endDate.getTime() - dateRange.start.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const duration = endIndex - startIndex + 1;

    return {
      left: startIndex * TIMELINE_DAY_WIDTH,
      width: Math.max(duration * TIMELINE_DAY_WIDTH - 4, TIMELINE_DAY_WIDTH - 4),
    };
  };

  const getStatusIcon = (status: GoalStatus, type: 'goal' | 'milestone') => {
    if (type === 'milestone') return 'diamond';
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'in-progress':
        return 'play-circle';
      case 'overdue':
        return 'alert-circle';
      case 'paused':
        return 'pause-circle';
      default:
        return 'ellipse-outline';
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={navigatePrevious} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color={tokens.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getViewTitle()}</Text>
        <TouchableOpacity onPress={navigateNext} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color={tokens.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Timeline */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.timelineContainer}>
          {/* Date headers */}
          <View style={styles.dateRow}>
            {timelineDates.map((date, index) => (
              <View
                key={index}
                style={[
                  styles.dateCell,
                  isToday(date) && styles.dateCellToday,
                ]}
              >
                <Text style={styles.dayName}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                </Text>
                <Text
                  style={[styles.dayNumber, isToday(date) && styles.dayNumberToday]}
                >
                  {date.getDate()}
                </Text>
              </View>
            ))}
          </View>

          {/* Timeline items */}
          <View style={styles.itemsContainer}>
            {/* Grid lines */}
            <View style={styles.gridLines}>
              {timelineDates.map((date, index) => (
                <View
                  key={index}
                  style={[
                    styles.gridLine,
                    isToday(date) && styles.gridLineToday,
                  ]}
                />
              ))}
            </View>

            {/* Items */}
            {timelineItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={tokens.textSecondary} />
                <Text style={styles.emptyText}>No goals in this period</Text>
              </View>
            ) : (
              timelineItems.map((item, rowIndex) => {
                const itemStyle = getItemStyle(item);
                return (
                  <View
                    key={item.id}
                    style={[styles.itemRow, { height: 50, marginTop: rowIndex * 4 }]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.timelineItem,
                        {
                          left: itemStyle.left,
                          width: itemStyle.width,
                          backgroundColor: item.color + '30',
                          borderLeftColor: item.color,
                        },
                      ]}
                      onPress={() => {
                        if (item.type === 'goal') {
                          onGoalPress?.(item.data as Goal);
                        } else {
                          onMilestonePress?.(item.data as Milestone);
                        }
                      }}
                    >
                      <Ionicons
                        name={getStatusIcon(item.status, item.type) as any}
                        size={12}
                        color={item.color}
                      />
                      <Text
                        style={[styles.itemTitle, { color: item.color }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {item.progress !== undefined && (
                        <Text style={[styles.itemProgress, { color: item.color }]}>
                          {item.progress}%
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Ionicons name="ellipse" size={8} color="#10B981" />
          <Text style={styles.legendText}>Goal</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="diamond" size={8} color="#8B5CF6" />
          <Text style={styles.legendText}>Milestone</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.todayIndicator, { backgroundColor: tokens.accent }]} />
          <Text style={styles.legendText}>Today</Text>
        </View>
      </View>

      {/* Summary stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{goals.length}</Text>
          <Text style={styles.statLabel}>Goals</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{milestones.length}</Text>
          <Text style={styles.statLabel}>Milestones</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {timelineItems.filter((i) => i.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {timelineItems.filter((i) => i.status === 'overdue').length}
          </Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      backgroundColor: tokens.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: tokens.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    navButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    timelineContainer: {
      paddingVertical: 12,
    },
    dateRow: {
      flexDirection: 'row',
      paddingHorizontal: 8,
    },
    dateCell: {
      width: TIMELINE_DAY_WIDTH,
      alignItems: 'center',
      paddingVertical: 4,
    },
    dateCellToday: {
      backgroundColor: tokens.accent + '20',
      borderRadius: 8,
    },
    dayName: {
      fontSize: 10,
      color: tokens.textSecondary,
      textTransform: 'uppercase',
    },
    dayNumber: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    dayNumberToday: {
      color: tokens.accent,
    },
    itemsContainer: {
      minHeight: 150,
      marginTop: 8,
      paddingHorizontal: 8,
      position: 'relative',
    },
    gridLines: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 8,
      right: 0,
      flexDirection: 'row',
    },
    gridLine: {
      width: TIMELINE_DAY_WIDTH,
      borderLeftWidth: 1,
      borderLeftColor: tokens.border,
      opacity: 0.3,
    },
    gridLineToday: {
      backgroundColor: tokens.accent + '10',
      borderLeftColor: tokens.accent,
      opacity: 0.5,
    },
    itemRow: {
      position: 'relative',
    },
    timelineItem: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 6,
      borderLeftWidth: 3,
      gap: 4,
    },
    itemTitle: {
      flex: 1,
      fontSize: 11,
      fontWeight: '500',
    },
    itemProgress: {
      fontSize: 10,
      fontWeight: '700',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 13,
      color: tokens.textSecondary,
      marginTop: 8,
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendText: {
      fontSize: 11,
      color: tokens.textSecondary,
    },
    todayIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    stats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    statLabel: {
      fontSize: 10,
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });

export default GoalTimeline;
