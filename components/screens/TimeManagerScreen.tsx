"use client";

import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import TimeManagerPanel from "../TimeManagerPanel";

export default function TimeManagerScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Time manager</Text>
      <TimeManagerPanel />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  heading: {
    color: "#f5f6ff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
});
