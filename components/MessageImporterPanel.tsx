"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const spreads = [
  { label: "Inbox import", detail: "Import SMS, email, or WhatsApp threads", status: "Ready" },
  { label: "Export CRM data", detail: "Share structured data to partner tools", status: "Idle" },
];

export default function MessageImporterPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Message importer</Text>
      {spreads.map((spread) => (
        <View key={spread.label} style={styles.row}>
          <View>
            <Text style={styles.label}>{spread.label}</Text>
            <Text style={styles.detail}>{spread.detail}</Text>
          </View>
          <Text style={styles.status}>{spread.status}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Run importer</Text>
      </TouchableOpacity>
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
    borderTopWidth: 1,
    borderTopColor: "#151a29",
    paddingVertical: 10,
  },
  label: {
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
