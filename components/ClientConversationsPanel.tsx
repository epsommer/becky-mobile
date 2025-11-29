"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";

const conversations = [
  {
    title: "Marina Studio · Message thread",
    snippet: "Waiting on design approval to send updated quote.",
    badge: "ACTION",
  },
  {
    title: "Woodgreen Landscaping · Email",
    snippet: "Invoice dispute resolved − confirm payment.",
    badge: "REVIEW",
  },
  {
    title: "Sammy Creative · Call notes",
    snippet: "Need gallery walkthrough for testimonial request.",
    badge: "FOLLOW‑UP",
  },
];

export default function ClientConversationsPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Conversations</Text>
      {conversations.map((conv) => (
        <View key={conv.title} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{conv.title}</Text>
            <Text style={styles.badge}>{conv.badge}</Text>
          </View>
          <Text style={styles.snippet}>{conv.snippet}</Text>
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
  card: {
    borderTopWidth: 1,
    borderTopColor: "#151a29",
    paddingVertical: 12,
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: {
    color: "#cbd3f4",
    fontWeight: "600",
    flex: 1,
    marginRight: 10,
  },
  badge: {
    color: "#e2b76d",
    fontSize: 11,
    fontWeight: "600",
  },
  snippet: {
    color: "#9cb3ff",
    fontSize: 12,
  },
});
