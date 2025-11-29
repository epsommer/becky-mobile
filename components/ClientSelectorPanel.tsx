"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const clients = [
  { name: "Woodgreen Landscaping", status: "On track" },
  { name: "Marina Studio", status: "Conversation active" },
  { name: "Sammy Creative", status: "Quote pending" },
];

export default function ClientSelectorPanel() {
  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Clients</Text>
        <TouchableOpacity>
          <Text style={styles.cta}>All</Text>
        </TouchableOpacity>
      </View>
      {clients.map((client) => (
        <View key={client.name} style={styles.clientRow}>
          <View>
            <Text style={styles.clientName}>{client.name}</Text>
            <Text style={styles.clientStatus}>{client.status}</Text>
          </View>
          <TouchableOpacity style={styles.switchBtn}>
            <Text style={styles.switchText}>Switch</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1b2134",
    backgroundColor: "#0f1322",
    padding: 16,
    marginBottom: 16,
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
  clientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#151a29",
  },
  clientName: {
    color: "#cbd3f4",
    fontWeight: "600",
  },
  clientStatus: {
    color: "#9cb3ff",
    fontSize: 11,
  },
  switchBtn: {
    backgroundColor: "#5c93ff",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  switchText: {
    color: "#0c1221",
    fontWeight: "700",
    fontSize: 11,
  },
});
