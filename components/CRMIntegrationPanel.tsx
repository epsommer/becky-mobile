"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const integrations = [
  {
    name: "CRM integration",
    detail: "Convert conversations and receipts into structured CRM records with AI",
    status: "Ready to run",
  },
  {
    name: "Message importer",
    detail: "Import email/SMS threads from any device",
    status: "Last run 2h ago",
  },
];

export default function CRMIntegrationPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>CRM integrations</Text>
      {integrations.map((integration) => (
        <View key={integration.name} style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.title}>{integration.name}</Text>
            <Text style={styles.detail}>{integration.detail}</Text>
          </View>
          <Text style={styles.status}>{integration.status}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Run integration</Text>
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
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingTop: 12,
      paddingBottom: 10,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    textBlock: {
      flex: 1,
      paddingRight: 12,
    },
    title: {
      color: tokens.textSecondary,
      fontWeight: "600",
    },
    detail: {
      color: tokens.highlight,
      fontSize: 12,
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
