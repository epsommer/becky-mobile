"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";

const conversationHighlights = [
  { title: "Voice call recap", client: "Marina Studio", status: "Awaiting follow-up" },
  { title: "Text thread archive", client: "Sammy Creative", status: "Flagged for review" },
  { title: "Email import stable", client: "Woodgreen Landscaping", status: "Ready for CRM" },
];

export default function ConversationSummaryPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Conversation highlights</Text>
      {conversationHighlights.map((conversation) => (
        <View style={styles.row} key={conversation.title}>
          <View style={styles.textBlock}>
            <Text style={styles.title}>{conversation.title}</Text>
            <Text style={styles.client}>{conversation.client}</Text>
          </View>
          <Text style={styles.status}>{conversation.status}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: "#0f1322",
    borderWidth: 1,
    borderColor: "#1b2134",
    padding: 16,
  },
  heading: {
    color: "#f5f6ff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: "#151a29",
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  textBlock: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    color: "#cbd3f4",
    fontWeight: "600",
  },
  client: {
    color: "#9cb3ff",
    fontSize: 12,
    marginTop: 4,
  },
  status: {
    color: "#8fd7ff",
    fontSize: 11,
    textTransform: "uppercase",
  },
});
