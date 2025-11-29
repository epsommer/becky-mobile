"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const quickMessages = [
  { title: "Request status update", client: "Woodgreen Landscaping", label: "Email" },
  { title: "Send booking notice", client: "Marina Studio", label: "SMS" },
  { title: "Share testimonial", client: "Sammy Creative", label: "Email" },
];

export default function QuickMessagePanel() {
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

const styles = StyleSheet.create({
  panel: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1b2134",
    backgroundColor: "#0f1322",
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
  cta: {
    color: "#6fb1ff",
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#151a29",
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: "#cbd3f4",
    fontWeight: "600",
  },
  client: {
    color: "#9cb3ff",
    fontSize: 12,
    marginTop: 2,
  },
  label: {
    color: "#8fd7ff",
    fontSize: 11,
    fontWeight: "600",
    alignSelf: "center",
  },
});
