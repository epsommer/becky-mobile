"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const serviceLines = [
  { title: "Service Lines", detail: "Landscaping · Snow removal · Creative", extra: "4 active" },
  { title: "Goals & Billing", detail: "Revenue targets, invoices, OPS", extra: "2 overdue" },
  { title: "Time Manager", detail: "Schedule, availability, planners", extra: "Today: 7 slots" },
];

export default function ServiceLinesPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Service focus</Text>
      {serviceLines.map((line) => (
        <View key={line.title} style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.title}>{line.title}</Text>
            <Text style={styles.detail}>{line.detail}</Text>
          </View>
          <Text style={styles.extra}>{line.extra}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Manage services</Text>
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
    borderTopWidth: 1,
    borderTopColor: "#151a29",
    paddingVertical: 12,
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
  extra: {
    color: "#8fd7ff",
    fontSize: 11,
    textTransform: "uppercase",
    alignSelf: "center",
  },
  button: {
    marginTop: 16,
    backgroundColor: "#5c93ff",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#0c1221",
    fontWeight: "700",
  },
});
