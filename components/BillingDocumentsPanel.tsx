"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const documents = [
  { type: "Invoice", client: "Woodgreen Landscaping", amount: "$2,480", status: "Sent" },
  { type: "Quote", client: "Marina Studio", amount: "$1,160", status: "Approved" },
  { type: "Receipt", client: "Sammy Creative", amount: "$980", status: "Paid" },
];

export default function BillingDocumentsPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Billing docs</Text>
        <TouchableOpacity>
          <Text style={styles.cta}>New doc</Text>
        </TouchableOpacity>
      </View>
      {documents.map((doc) => (
        <View key={`${doc.type}-${doc.client}`} style={styles.row}>
          <View>
            <Text style={styles.label}>{doc.type}</Text>
            <Text style={styles.client}>{doc.client}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.amount}>{doc.amount}</Text>
            <Text style={styles.status}>{doc.status}</Text>
          </View>
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
      marginBottom: 12,
    },
    heading: {
      fontSize: 16,
      fontWeight: "700",
      color: tokens.textPrimary,
    },
    cta: {
      color: tokens.accent,
      textTransform: "uppercase",
      fontSize: 12,
      fontWeight: "600",
    },
    row: {
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingVertical: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    label: {
      color: tokens.textSecondary,
      fontSize: 11,
      textTransform: "uppercase",
    },
    client: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    meta: {
      alignItems: "flex-end",
    },
    amount: {
      color: tokens.highlight,
      fontSize: 14,
      fontWeight: "700",
    },
    status: {
      color: tokens.accent,
      fontSize: 11,
      marginTop: 4,
    },
  });
