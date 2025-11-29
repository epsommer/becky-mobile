"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";

const details = [
  { label: "Last action", value: "Receipt delivered" },
  { label: "Owner", value: "Evangelo Sommer" },
  { label: "Next action", value: "Send follow-up email" },
];

export default function ConversationDetailPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Conversation details</Text>
      {details.map((detail) => (
        <View key={detail.label} style={styles.row}>
          <Text style={styles.label}>{detail.label}</Text>
          <Text style={styles.value}>{detail.value}</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#151a29",
  },
  label: {
    color: "#9cb3ff",
    fontSize: 11,
    textTransform: "uppercase",
  },
  value: {
    color: "#cbd3f4",
    fontWeight: "600",
  },
});
