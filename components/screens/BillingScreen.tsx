"use client";

import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import ReceiptsPanel from "../ReceiptsPanel";
import ReceiptDetailsPanel from "../ReceiptDetailsPanel";
import BillingDocumentsPanel from "../BillingDocumentsPanel";

export default function BillingScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Billing</Text>
      <ReceiptsPanel />
      <ReceiptDetailsPanel />
      <BillingDocumentsPanel />
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
