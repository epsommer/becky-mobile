"use client";

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const activityLog = [
  "Signed in on iPhone 15 Pro (Toronto)",
  "Calendar sync enabled for Woodgreen Landscaping",
  "Receipt sent to Marina Studio",
  "Testimonial requested for Sammy Creative",
  "Notifications preferences updated",
];

export default function ActivityLogPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <ScrollView contentContainerStyle={styles.panel}>
      <Text style={styles.heading}>Activity log</Text>
      {activityLog.map((entry) => (
        <View key={entry} style={styles.row}>
          <Text style={styles.entry}>{entry}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      backgroundColor: tokens.surface,
      padding: 20,
    },
    heading: {
      fontSize: 18,
      fontWeight: "700",
      color: tokens.textPrimary,
      marginBottom: 12,
    },
    row: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    entry: {
      color: tokens.textSecondary,
      fontSize: 14,
    },
  });
