"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const quickMessages = [
  { title: "Request status update", client: "Woodgreen Landscaping", label: "Email" },
  { title: "Send booking notice", client: "Marina Studio", label: "SMS" },
  { title: "Share testimonial", client: "Sammy Creative", label: "Email" },
];

export default function QuickMessagePanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Quick messages</Text>
        <TouchableOpacity>
          <Text style={styles.cta}>Compose</Text>
        </TouchableOpacity>
      </View>
      {quickMessages.map((message) => (
        <View key={message.title} style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.title}>{message.title}</Text>
            <Text style={styles.client}>{message.client}</Text>
          </View>
          <Text style={styles.label}>{message.label}</Text>
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
      elevation: 5,
    },
    headingRow: {
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
    cta: {
      color: tokens.accent,
      textTransform: "uppercase",
      fontSize: 12,
      fontWeight: "600",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    textBlock: {
      flex: 1,
    },
    title: {
      color: tokens.textSecondary,
      fontWeight: "600",
    },
    client: {
      color: tokens.highlight,
      fontSize: 12,
      marginTop: 2,
    },
    label: {
      color: tokens.accent,
      fontSize: 11,
      fontWeight: "600",
      alignSelf: "center",
    },
  });
