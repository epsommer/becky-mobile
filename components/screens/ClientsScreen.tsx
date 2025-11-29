"use client";

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import ClientSelectorPanel from "../ClientSelectorPanel";
import ClientNotesPanel from "../ClientNotesPanel";
import TestimonialsPanel from "../TestimonialsPanel";
import QuickMessagePanel from "../QuickMessagePanel";

export default function ClientsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <ClientSelectorPanel />
      <ClientNotesPanel />
      <TestimonialsPanel />
      <QuickMessagePanel />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
