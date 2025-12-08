"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const details = [
  { label: "Client", value: "Woodgreen Landscaping" },
  { label: "Amount", value: "$2,480" },
  { label: "Due date", value: "Nov 30" },
  { label: "Status", value: "Sent" },
];

export default function ReceiptDetailsPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Receipt details</Text>
      {details.map((item) => (
        <View key={item.label} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
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
      paddingVertical: 10,
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
