"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";

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

const styles = StyleSheet.create({
  panel: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#0f1322",
    padding: 16,
    borderWidth: 1,
    borderColor: "#1b2134",
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f5f6ff",
    marginBottom: 8,
  },
  noteCard: {
    backgroundColor: "#161b2d",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#21273d",
  },
  noteTitle: {
    color: "#c5d0ff",
    fontWeight: "600",
    marginBottom: 4,
  },
  noteDetail: {
    color: "#9fb1d8",
    fontSize: 13,
    marginBottom: 6,
  },
  noteTimestamp: {
    color: "#6f85cc",
    fontSize: 11,
    textTransform: "uppercase",
  },
});
