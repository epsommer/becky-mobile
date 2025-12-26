/**
 * GoalProgressBar Component
 *
 * Animated progress bar with celebration effects for goals.
 *
 * @module components/goals/GoalProgressBar
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';

export interface GoalProgressBarProps {
  progress: number;
  targetValue?: number;
  currentValue?: number;
  progressUnit?: string;
  height?: number;
  showLabel?: boolean;
  showValues?: boolean;
  animated?: boolean;
  celebrateOnComplete?: boolean;
}

const GoalProgressBar: React.FC<GoalProgressBarProps> = ({
  progress,
  targetValue,
  currentValue,
  progressUnit = 'percentage',
  height = 8,
  showLabel = true,
  showValues = false,
  animated = true,
  celebrateOnComplete = true,
}) => {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens, height), [tokens, height]);

  const animatedProgress = useRef(new Animated.Value(0)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0.5)).current;

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const isComplete = clampedProgress >= 100;

  // Animate progress bar
  useEffect(() => {
    if (animated) {
      Animated.timing(animatedProgress, {
        toValue: clampedProgress,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      animatedProgress.setValue(clampedProgress);
    }
  }, [clampedProgress, animated, animatedProgress]);

  // Celebration animation when complete
  useEffect(() => {
    if (isComplete && celebrateOnComplete) {
      Animated.parallel([
        Animated.timing(celebrationOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(celebrationScale, {
          toValue: 1,
          tension: 120,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Fade out after 2 seconds
        setTimeout(() => {
          Animated.timing(celebrationOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }, 2000);
      });
    }
  }, [isComplete, celebrateOnComplete, celebrationOpacity, celebrationScale]);

  const getProgressColor = () => {
    if (clampedProgress >= 100) return '#10B981';
    if (clampedProgress >= 75) return '#D4AF37';
    if (clampedProgress >= 50) return '#F59E0B';
    if (clampedProgress >= 25) return '#8B5CF6';
    return '#6B7280';
  };

  const progressWidth = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const formatValue = (value: number) => {
    if (progressUnit === 'percentage') return `${Math.round(value)}%`;
    if (progressUnit === 'currency') return `$${value.toLocaleString()}`;
    return `${value.toLocaleString()} ${progressUnit}`;
  };

  return (
    <View style={styles.container}>
      {/* Header with label and value */}
      {(showLabel || showValues) && (
        <View style={styles.header}>
          {showLabel && (
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Progress</Text>
              {isComplete && (
                <View style={styles.completeBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                  <Text style={styles.completeText}>Complete</Text>
                </View>
              )}
            </View>
          )}
          {showValues && currentValue !== undefined && targetValue !== undefined ? (
            <Text style={styles.values}>
              {formatValue(currentValue)} / {formatValue(targetValue)}
            </Text>
          ) : (
            <Text style={styles.percentage}>{Math.round(clampedProgress)}%</Text>
          )}
        </View>
      )}

      {/* Progress bar */}
      <View style={styles.barContainer}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: progressWidth,
              backgroundColor: getProgressColor(),
            },
          ]}
        />

        {/* Milestone markers */}
        {[25, 50, 75].map((marker) => (
          <View
            key={marker}
            style={[
              styles.milestone,
              {
                left: `${marker}%`,
                opacity: clampedProgress >= marker ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>

      {/* Celebration effect */}
      {isComplete && celebrateOnComplete && (
        <Animated.View
          style={[
            styles.celebration,
            {
              opacity: celebrationOpacity,
              transform: [{ scale: celebrationScale }],
            },
          ]}
        >
          <Ionicons name="trophy" size={20} color="#D4AF37" />
          <Text style={styles.celebrationText}>Goal Achieved!</Text>
        </Animated.View>
      )}
    </View>
  );
};

const createStyles = (tokens: ThemeTokens, height: number) =>
  StyleSheet.create({
    container: {
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    completeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
    },
    completeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#10B981',
      textTransform: 'uppercase',
    },
    values: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    percentage: {
      fontSize: 14,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    barContainer: {
      height: height,
      backgroundColor: tokens.border,
      borderRadius: height / 2,
      overflow: 'hidden',
      position: 'relative',
    },
    barFill: {
      height: '100%',
      borderRadius: height / 2,
    },
    milestone: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: tokens.background,
      marginLeft: -1,
    },
    celebration: {
      position: 'absolute',
      right: 0,
      top: -4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: tokens.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    celebrationText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#D4AF37',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
  });

export default GoalProgressBar;
