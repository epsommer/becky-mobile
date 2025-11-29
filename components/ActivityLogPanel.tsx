"use client";

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const activityLog = [
  "Signed in on iPhone 15 Pro (Toronto)",
  "Calendar sync enabled for Woodgreen Landscaping",
  "Receipt sent to Marina Studio",
  "Testimonial requested for Sammy Creative",
  "Notifications preferences updated",
];

export default function ActivityLogPanel() {
  return (
    <ScrollView contentContainerStyle={styles.panel}>
      <Text style={styles.heading}>Activity log</Text>
      {activityLog.map((entry) => (
        <View key={entry} style={styles.row}>
          <Text style={styles.entry}>{entry}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#0d111f",
    marginHorizontal: 28,
    marginTop: 120,
    borderRadius: 28,
    padding: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f5f6ff",
    marginBottom: 12,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2335",
  },
  entry: {
    color: "#cbd3f4",
    fontSize: 14,
  },
});
