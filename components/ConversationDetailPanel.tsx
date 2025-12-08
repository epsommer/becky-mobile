"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const details = [
  { label: "Last action", value: "Receipt delivered" },
  { label: "Owner", value: "Evangelo Sommer" },
  { label: "Next action", value: "Send follow-up email" },
];

export default function ConversationDetailPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Conversation details</Text>
      {details.map((detail) => (
        <View key={detail.label} style={styles.row}>
          <Text style={styles.label}>{detail.label}</Text>
          <Text style={styles.value}>{detail.value}</Text>
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
      elevation: 5,
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
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    label: {
      color: tokens.textSecondary,
      fontSize: 11,
      textTransform: "uppercase",
    },
    value: {
      color: tokens.textPrimary,
      fontWeight: "600",
    },
  });
