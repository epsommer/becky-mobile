"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";

const goals = [
  { label: "Revenue", value: "$87K", meta: "91% of target", color: "#91e78f" },
  { label: "Retention", value: "82%", meta: "↑3% MoM", color: "#6fb1ff" },
  { label: "Bookings", value: "46", meta: "25 new this week", color: "#f4d35e" },
];

export default function GoalsWidget() {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Goals</Text>
      <View style={styles.grid}>
        {goals.map((goal) => (
          <View key={goal.label} style={styles.card}>
            <Text style={[styles.label, { color: goal.color }]}>{goal.label}</Text>
            <Text style={styles.value}>{goal.value}</Text>
            <Text style={styles.meta}>{goal.meta}</Text>
          </View>
        ))}
      </View>
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
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  card: {
    width: "30%",
    backgroundColor: "#141a2d",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1a1f30",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f5f6ff",
  },
  meta: {
    fontSize: 10,
    color: "#9cb3ff",
    marginTop: 4,
    textAlign: "center",
  },
});
