"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const integrations = [
  { label: "Google Calendar", status: "Synced", detail: "Next sync in 12m" },
  { label: "Notion Calendar", status: "Requires consent", detail: "Connect to share events" },
];

export default function CalendarIntegrationPanel() {
  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Calendar sync</Text>
        <TouchableOpacity>
          <Text style={styles.cta}>Manage</Text>
        </TouchableOpacity>
      </View>
      {integrations.map((integration) => (
        <View key={integration.label} style={styles.integrationRow}>
          <View>
            <Text style={styles.integrationLabel}>{integration.label}</Text>
            <Text style={styles.integrationDetail}>{integration.status}</Text>
          </View>
          <Text style={styles.integrationTime}>{integration.detail}</Text>
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
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
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
  integrationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#151a29",
  },
  integrationLabel: {
    color: "#cbd3f4",
    fontWeight: "600",
  },
  integrationDetail: {
    color: "#8fd7ff",
    fontSize: 12,
    marginTop: 2,
  },
  integrationTime: {
    color: "#9cb3ff",
    fontSize: 11,
    textAlign: "right",
  },
});
