"use client";

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const timeline = [
  { time: "08:20", line: "Woodgreen – Proposal delivered" },
  { time: "09:45", line: "Marina Studio – Questionnaire completed" },
  { time: "11:30", line: "Sammy Creative – Gallery approval" },
  { time: "14:10", line: "New conversation imported from email" },
];

export default function ConversationTimelinePanel() {
  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Conversation timeline</Text>
        <Text style={styles.subheading}>Latest sync</Text>
      </View>
      <ScrollView>
        {timeline.map((entry) => (
          <View key={entry.line} style={styles.entry}>
            <Text style={styles.time}>{entry.time}</Text>
            <Text style={styles.line}>{entry.line}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: "#0e131f",
    borderWidth: 1,
    borderColor: "#1d2442",
    padding: 16,
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heading: {
    color: "#f5f6ff",
    fontSize: 16,
    fontWeight: "700",
  },
  subheading: {
    fontSize: 11,
    color: "#9cb3ff",
    textTransform: "uppercase",
  },
  entry: {
    borderTopWidth: 1,
    borderTopColor: "#1a1f30",
    paddingVertical: 10,
  },
  time: {
    color: "#6f85cc",
    fontSize: 11,
    textTransform: "uppercase",
  },
  line: {
    color: "#cbd3f4",
    fontSize: 13,
    marginTop: 4,
  },
});
