"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const navigation = [
  "Dashboard",
  "Clients",
  "Conversations",
  "Testimonials",
  "Billing",
  "Time Manager",
  "Goals",
  "Service Lines",
];

const serviceLines = [
  "Woodgreen Landscaping",
  "Whiteknight Snow Removal",
  "Tommy Studio",
];

export default function SidebarPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>CRM Navigation</Text>
      {navigation.map((item) => (
        <TouchableOpacity key={item} style={styles.item}>
          <Text style={styles.label}>{item}</Text>
        </TouchableOpacity>
      ))}
      <Text style={[styles.heading, styles.subheading]}>Service lines</Text>
      {serviceLines.map((line) => (
        <View key={line} style={styles.item}>
          <Text style={styles.label}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#0d111f",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f2335",
  },
  heading: {
    color: "#f5f6ff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  subheading: {
    marginTop: 16,
  },
  item: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#151a29",
  },
  label: {
    color: "#c5cff9",
    fontSize: 14,
    textTransform: "uppercase",
  },
});
