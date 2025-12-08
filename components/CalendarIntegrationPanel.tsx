"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const integrations = [
  { label: "Google Calendar", status: "Synced", detail: "Next sync in 12m" },
  { label: "Notion Calendar", status: "Requires consent", detail: "Connect to share events" },
];

export default function CalendarIntegrationPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Calendar sync</Text>
        <TouchableOpacity>
          <Text style={styles.cta}>Manage</Text>
        </TouchableOpacity>
      </View>
      {integrations.map((integration) => (
        <View key={integration.label} style={styles.integrationRow}>
          <View>
            <Text style={styles.integrationLabel}>{integration.label}</Text>
            <Text style={styles.integrationDetail}>{integration.status}</Text>
          </View>
          <Text style={styles.integrationTime}>{integration.detail}</Text>
        </View>
      ))}
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
    headingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    heading: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    cta: {
      color: tokens.accent,
      textTransform: "uppercase",
      fontSize: 12,
      fontWeight: "600",
    },
    integrationRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    integrationLabel: {
      color: tokens.textSecondary,
      fontWeight: "600",
    },
    integrationDetail: {
      color: tokens.highlight,
      fontSize: 12,
      marginTop: 2,
    },
    integrationTime: {
      color: tokens.textPrimary,
      fontSize: 11,
      textAlign: "right",
    },
  });
