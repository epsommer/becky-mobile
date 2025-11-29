"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const documents = [
  { type: "Invoice", client: "Woodgreen Landscaping", amount: "$2,480", status: "Sent" },
  { type: "Quote", client: "Marina Studio", amount: "$1,160", status: "Approved" },
  { type: "Receipt", client: "Sammy Creative", amount: "$980", status: "Paid" },
];

export default function BillingDocumentsPanel() {
  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Billing docs</Text>
        <TouchableOpacity>
          <Text style={styles.cta}>New doc</Text>
        </TouchableOpacity>
      </View>
      {documents.map((doc) => (
        <View key={`${doc.type}-${doc.client}`} style={styles.row}>
          <View>
            <Text style={styles.label}>{doc.type}</Text>
            <Text style={styles.client}>{doc.client}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.amount}>{doc.amount}</Text>
            <Text style={styles.status}>{doc.status}</Text>
          </View>
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
    marginBottom: 12,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f5f6ff",
  },
  cta: {
    color: "#6fb1ff",
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: "#151a29",
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  label: {
    color: "#9cb3ff",
    fontSize: 11,
    textTransform: "uppercase",
  },
  client: {
    color: "#cbd3f4",
    fontSize: 14,
    fontWeight: "600",
  },
  meta: {
    alignItems: "flex-end",
  },
  amount: {
    color: "#94a6ff",
    fontSize: 14,
    fontWeight: "700",
  },
  status: {
    color: "#8fd7ff",
    fontSize: 11,
    marginTop: 4,
  },
});
