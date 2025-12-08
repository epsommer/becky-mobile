"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const spreads = [
  { label: "Inbox import", detail: "Import SMS, email, or WhatsApp threads", status: "Ready" },
  { label: "Export CRM data", detail: "Share structured data to partner tools", status: "Idle" },
];

export default function MessageImporterPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Message importer</Text>
      {spreads.map((spread) => (
        <View key={spread.label} style={styles.row}>
          <View>
            <Text style={styles.label}>{spread.label}</Text>
            <Text style={styles.detail}>{spread.detail}</Text>
          </View>
          <Text style={styles.status}>{spread.status}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Run importer</Text>
      </TouchableOpacity>
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
