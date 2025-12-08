"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const workflows = [
  { label: "Google sync health", status: "Healthy", detail: "Next sync in 5m" },
  { label: "Notion board", status: "Needs permission", detail: "Grant access" },
  { label: "Calendar availability", status: "7 slots open", detail: "Refresh" },
];

export default function CalendarIntegrationManagerPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Calendar integrations</Text>
      {workflows.map((workflow) => (
        <View key={workflow.label} style={styles.row}>
          <View>
            <Text style={styles.label}>{workflow.label}</Text>
            <Text style={styles.detail}>{workflow.detail}</Text>
          </View>
          <Text style={styles.status}>{workflow.status}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Manage connections</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      marginTop: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: tokens.border,
      backgroundColor: tokens.surface,
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
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingVertical: 10,
    },
    label: {
      color: tokens.textSecondary,
      fontWeight: "600",
    },
    detail: {
      fontSize: 12,
      color: tokens.highlight,
      marginTop: 4,
    },
    status: {
      color: tokens.accent,
      fontSize: 11,
      alignSelf: "center",
    },
    button: {
      marginTop: 16,
      backgroundColor: tokens.accent,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: "center",
    },
    buttonText: {
      color: tokens.background,
      fontWeight: "700",
    },
  });
