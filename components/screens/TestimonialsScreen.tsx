"use client";

import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import TestimonialsPanel from "../TestimonialsPanel";
import QuickMessagePanel from "../QuickMessagePanel";

export default function TestimonialsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Testimonials</Text>
      <TestimonialsPanel />
      <QuickMessagePanel />
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
