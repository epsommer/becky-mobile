"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const workflows = [
  { label: "Google sync health", status: "Healthy", detail: "Next sync in 5m" },
  { label: "Notion board", status: "Needs permission", detail: "Grant access" },
  { label: "Calendar availability", status: "7 slots open", detail: "Refresh" },
];

export default function CalendarIntegrationManagerPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Calendar integrations</Text>
      {workflows.map((workflow) => (
        <View key={workflow.label} style={styles.row}>
          <View>
            <Text style={styles.label}>{workflow.label}</Text>
            <Text style={styles.detail}>{workflow.detail}</Text>
          </View>
          <Text style={styles.status}>{workflow.status}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Manage connections</Text>
      </TouchableOpacity>
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
  heading: {
    color: "#f5f6ff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#151a29",
    paddingVertical: 10,
  },
  label: {
    color: "#cbd3f4",
    fontWeight: "600",
  },
  detail: {
    fontSize: 12,
    color: "#9cb3ff",
    marginTop: 4,
  },
  status: {
    color: "#8fd7ff",
    fontSize: 11,
    alignSelf: "center",
  },
  button: {
    marginTop: 16,
    backgroundColor: "#6fb1ff",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#0c1221",
    fontWeight: "700",
  },
});
