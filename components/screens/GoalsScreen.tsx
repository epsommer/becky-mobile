"use client";

import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import GoalsWidget from "../GoalsWidget";
import ServiceLinesPanel from "../ServiceLinesPanel";

export default function GoalsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Goals</Text>
      <GoalsWidget />
      <ServiceLinesPanel />
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
