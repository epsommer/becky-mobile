"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const goals = [
  { label: "Revenue", value: "$87K", meta: "91% of target", color: "#91e78f" },
  { label: "Retention", value: "82%", meta: "↑3% MoM", color: "#6fb1ff" },
  { label: "Bookings", value: "46", meta: "25 new this week", color: "#f4d35e" },
];

export default function GoalsWidget() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Goals</Text>
      <View style={styles.grid}>
        {goals.map((goal) => (
          <View key={goal.label} style={styles.card}>
            <Text style={[styles.label, { color: goal.color }]}>{goal.label}</Text>
            <Text style={styles.value}>{goal.value}</Text>
            <Text style={styles.meta}>{goal.meta}</Text>
          </View>
        ))}
      </View>
    </View>
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
    heading: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 12,
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
  });
