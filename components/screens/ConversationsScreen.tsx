"use client";

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import ConversationTimelinePanel from "../ConversationTimelinePanel";
import ConversationSummaryPanel from "../ConversationSummaryPanel";
import ClientConversationsPanel from "../ClientConversationsPanel";
import ConversationDetailPanel from "../ConversationDetailPanel";

export default function ConversationsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.heading}>Conversations</Text>
        <Text style={styles.subheading}>Real-time threads</Text>
      </View>
      <ConversationTimelinePanel />
      <ConversationSummaryPanel />
      <ClientConversationsPanel />
      <ConversationDetailPanel />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  heading: {
    color: "#f5f6ff",
    fontSize: 18,
    fontWeight: "700",
  },
  subheading: {
    color: "#9cb3ff",
    fontSize: 12,
  },
});
