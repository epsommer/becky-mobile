"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const serviceLines = [
  { title: "Service Lines", detail: "Landscaping · Snow removal · Creative", extra: "4 active" },
  { title: "Goals & Billing", detail: "Revenue targets, invoices, OPS", extra: "2 overdue" },
  { title: "Time Manager", detail: "Schedule, availability, planners", extra: "Today: 7 slots" },
];

export default function ServiceLinesPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Service focus</Text>
      {serviceLines.map((line) => (
        <View key={line.title} style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.title}>{line.title}</Text>
            <Text style={styles.detail}>{line.detail}</Text>
          </View>
          <Text style={styles.extra}>{line.extra}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Manage services</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      width: '100%',
      alignSelf: 'stretch',
    },
    heading: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontFamily: 'Bytesized-Regular',
      fontWeight: "700",
      marginBottom: 12,
    },
    row: {
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingVertical: 12,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    textBlock: {
      flex: 1,
      paddingRight: 12,
    },
    title: {
      color: tokens.textSecondary,
      fontFamily: 'lores-9-wide',
      fontWeight: "600",
    },
    detail: {
      color: tokens.highlight,
      fontSize: 12,
      fontFamily: 'lores-9-wide',
      marginTop: 4,
    },
    extra: {
      color: tokens.accent,
      fontSize: 11,
      fontFamily: 'lores-9-wide',
      textTransform: "uppercase",
      alignSelf: "center",
    },
    button: {
      marginTop: 16,
      backgroundColor: tokens.accent,
      borderRadius: 14,
      paddingVertical: 10,
      alignItems: "center",
    },
    buttonText: {
      color: tokens.background,
      fontFamily: 'lores-9-wide',
      fontWeight: "700",
    },
  });
