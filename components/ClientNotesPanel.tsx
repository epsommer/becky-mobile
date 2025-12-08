"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

const notes = [
  {
    title: "Invoice follow-up",
    detail: "Need to confirm breakout for hydro work before sending final receipt.",
    timestamp: "Today · 09:42",
  },
  {
    title: "Testimonial draft",
    detail: "Marina Studio loved the gallery walkthrough; request testimonial next week.",
    timestamp: "Yesterday · 16:05",
  },
  {
    title: "Creative brief",
    detail: "Sammy wants directory upload for new product drops (arrive Friday).",
    timestamp: "2d ago · 11:23",
  },
];

export default function ClientNotesPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Client notes</Text>
      {notes.map((note) => (
        <View key={note.title} style={styles.noteCard}>
          <Text style={styles.noteTitle}>{note.title}</Text>
          <Text style={styles.noteDetail}>{note.detail}</Text>
          <Text style={styles.noteTimestamp}>{note.timestamp}</Text>
        </View>
      ))}
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
      fontSize: 16,
      fontFamily: 'Bytesized-Regular',
      fontWeight: "700",
      color: tokens.textPrimary,
      marginBottom: 12,
    },
    noteCard: {
      backgroundColor: tokens.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    noteTitle: {
      color: tokens.textSecondary,
      fontFamily: 'lores-9-wide',
      fontWeight: "600",
      marginBottom: 4,
    },
    noteDetail: {
      color: tokens.textPrimary,
      fontFamily: 'lores-9-wide',
      fontSize: 13,
      marginBottom: 6,
    },
    noteTimestamp: {
      color: tokens.accent,
      fontFamily: 'lores-9-wide',
      fontSize: 11,
      textTransform: "uppercase",
    },
  });
