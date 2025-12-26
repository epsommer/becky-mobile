"use client";

import React, { useMemo } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { useGoals } from "../hooks/useGoals";

interface GoalsWidgetProps {
  onPress?: () => void;
}

export default function GoalsWidget({ onPress }: GoalsWidgetProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const { quickStats, activeGoals, loading, initialized } = useGoals();

  // Calculate derived stats
  const stats = useMemo(() => {
    // If we have active goals, show top 3 stats
    if (activeGoals.length > 0) {
      // Get average progress across all goals
      const avgProgress = quickStats.averageProgress;

      // Get count of goals in progress
      const inProgressCount = quickStats.inProgress;

      // Get count of completed goals
      const completedCount = quickStats.completed;

      return [
        {
          label: "Progress",
          value: `${avgProgress}%`,
          meta: `${quickStats.total} total goals`,
          color: avgProgress >= 75 ? "#10B981" : avgProgress >= 50 ? "#D4AF37" : "#F59E0B",
        },
        {
          label: "Active",
          value: String(inProgressCount),
          meta: `${quickStats.overdue} overdue`,
          color: "#6fb1ff",
        },
        {
          label: "Done",
          value: String(completedCount),
          meta: "completed",
          color: "#10B981",
        },
      ];
    }

    // Default placeholder stats when no goals exist
    return [
      { label: "Progress", value: "0%", meta: "No goals yet", color: "#6B7280" },
      { label: "Active", value: "0", meta: "Create a goal", color: "#6B7280" },
      { label: "Done", value: "0", meta: "completed", color: "#6B7280" },
    ];
  }, [quickStats, activeGoals]);

  if (loading && !initialized) {
    return (
      <View style={styles.panel}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Goals</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={tokens.accent} />
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.panel}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Goals</Text>
        {onPress && (
          <Ionicons name="chevron-forward" size={18} color={tokens.textSecondary} />
        )}
      </View>
      <View style={styles.grid}>
        {stats.map((goal) => (
          <View key={goal.label} style={styles.card}>
            <Text style={[styles.label, { color: goal.color }]}>{goal.label}</Text>
            <Text style={styles.value}>{goal.value}</Text>
            <Text style={styles.meta}>{goal.meta}</Text>
          </View>
        ))}
      </View>

      {/* Quick overdue alert */}
      {quickStats.overdue > 0 && (
        <View style={styles.overdueAlert}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.overdueText}>
            {quickStats.overdue} goal{quickStats.overdue > 1 ? 's' : ''} overdue
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      marginTop: 16,
      borderRadius: 18,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      padding: 16,
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    heading: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    grid: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    card: {
      width: "30%",
      backgroundColor: tokens.background,
      borderRadius: 12,
      padding: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: tokens.border,
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    },
    label: {
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 6,
      textTransform: "uppercase",
    },
    value: {
      fontSize: 18,
      fontWeight: "700",
      color: tokens.textPrimary,
    },
    meta: {
      fontSize: 10,
      color: tokens.textSecondary,
      marginTop: 4,
      textAlign: "center",
    },
    loadingContainer: {
      height: 80,
      justifyContent: "center",
      alignItems: "center",
    },
    overdueAlert: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      gap: 6,
    },
    overdueText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#EF4444",
    },
  });
