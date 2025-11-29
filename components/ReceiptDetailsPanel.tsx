"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";

const details = [
  { label: "Client", value: "Woodgreen Landscaping" },
  { label: "Amount", value: "$2,480" },
  { label: "Due date", value: "Nov 30" },
  { label: "Status", value: "Sent" },
];

export default function ReceiptDetailsPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Receipt details</Text>
      {details.map((item) => (
        <View key={item.label} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
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
  heading: {
    color: "#f5f6ff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
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
