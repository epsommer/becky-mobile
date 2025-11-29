"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const receipts = [
  {
    client: "Woodgreen Landscaping",
    amount: "$2,480",
    status: "Sent",
    due: "Due Nov 30",
  },
  {
    client: "Marina Studio",
    amount: "$1,160",
    status: "Draft",
    due: "Edit before send",
  },
  {
    client: "Sammy Creative",
    amount: "$980",
    status: "Paid",
    due: "Settled",
  },
];

export default function ReceiptsPanel() {
  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Receipts</Text>
        <TouchableOpacity>
          <Text style={styles.cta}>Create</Text>
        </TouchableOpacity>
      </View>
      {receipts.map((receipt) => (
        <View key={receipt.client} style={styles.row}>
          <View>
            <Text style={styles.client}>{receipt.client}</Text>
            <Text style={styles.amount}>{receipt.amount}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.status}>{receipt.status}</Text>
            <Text style={styles.due}>{receipt.due}</Text>
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
    borderTopWidth: 1,
    borderTopColor: "#151a29",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  client: {
    color: "#c5d0ff",
    fontSize: 14,
    fontWeight: "600",
  },
  amount: {
    color: "#94a6ff",
    fontSize: 12,
    marginTop: 4,
  },
  meta: {
    alignItems: "flex-end",
  },
  status: {
    color: "#8fd7ff",
    fontSize: 12,
    fontWeight: "600",
  },
  due: {
    color: "#9cb3ff",
    fontSize: 11,
    marginTop: 2,
  },
});
