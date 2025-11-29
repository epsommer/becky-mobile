"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";

const shifts = [
  { label: "Today", detail: "3 booked events", status: "On schedule" },
  { label: "Tomorrow", detail: "2 follow-ups", status: "Needs review" },
  { label: "Next week", detail: "5 proposals", status: "Planned" },
];

export default function TimeManagerPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Time manager</Text>
      {shifts.map((shift) => (
        <View key={shift.label} style={styles.row}>
          <View>
            <Text style={styles.label}>{shift.label}</Text>
            <Text style={styles.detail}>{shift.detail}</Text>
          </View>
          <Text style={styles.status}>{shift.status}</Text>
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
    borderTopWidth: 1,
    borderTopColor: "#151a29",
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
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
});
