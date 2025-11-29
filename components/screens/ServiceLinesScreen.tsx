"use client";

import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import ServiceLinesPanel from "../ServiceLinesPanel";
import CalendarIntegrationPanel from "../CalendarIntegrationPanel";
import CalendarIntegrationManagerPanel from "../CalendarIntegrationManagerPanel";

export default function ServiceLinesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Service lines</Text>
      <ServiceLinesPanel />
      <CalendarIntegrationPanel />
      <CalendarIntegrationManagerPanel />
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
