"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const integrations = [
  {
    name: "CRM integration",
    detail: "Convert conversations and receipts into structured CRM records with AI",
    status: "Ready to run",
  },
  {
    name: "Message importer",
    detail: "Import email/SMS threads from any device",
    status: "Last run 2h ago",
  },
];

export default function CRMIntegrationPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>CRM integrations</Text>
      {integrations.map((integration) => (
        <View key={integration.name} style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.title}>{integration.name}</Text>
            <Text style={styles.detail}>{integration.detail}</Text>
          </View>
          <Text style={styles.status}>{integration.status}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Run integration</Text>
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
    borderTopWidth: 1,
    borderTopColor: "#151a29",
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  textBlock: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: "#cbd3f4",
    fontWeight: "600",
  },
  detail: {
    color: "#9cb3ff",
    fontSize: 12,
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
