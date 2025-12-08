"use client";

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const notifications = [
  {
    title: "Client feedback received",
    detail: "Marina Studio submitted a testimonial reply.",
    time: "2m ago",
  },
  {
    title: "Receipt delivered",
    detail: "Woodgreen Landscaping confirmed the invoice.",
    time: "1h ago",
  },
  {
    title: "Testimonial request fail",
    detail: "Sammy Creative's email bounced. Retry?",
    time: "Yesterday",
  },
];

export default function NotificationsModalPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <ScrollView contentContainerStyle={styles.panel}>
      <Text style={styles.heading}>Notifications</Text>
      {notifications.map((note) => (
        <View key={note.title} style={styles.notification}>
          <Text style={styles.title}>{note.title}</Text>
          <Text style={styles.detail}>{note.detail}</Text>
          <Text style={styles.time}>{note.time}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      backgroundColor: tokens.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: tokens.border,
      padding: 20,
      minHeight: 200,
    },
    heading: {
      fontSize: 18,
      fontWeight: "700",
      color: tokens.textPrimary,
      marginBottom: 12,
    },
    notification: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
      marginBottom: 8,
    },
    title: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    detail: {
      color: tokens.textSecondary,
      fontSize: 12,
      marginTop: 4,
    },
    time: {
      color: tokens.highlight,
      fontSize: 11,
      marginTop: 6,
      textTransform: "uppercase",
    },
  });
