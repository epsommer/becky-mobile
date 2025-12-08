"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { ReceiptItem, DEFAULT_TAX_CONFIG } from "../../types/billing";

interface ReceiptSummaryProps {
  items: ReceiptItem[];
  showTax?: boolean;
}

export default function ReceiptSummary({ items, showTax = true }: ReceiptSummaryProps) {
  const { tokens } = useTheme();

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const taxableAmount = items
    .filter(item => item.taxable)
    .reduce((sum, item) => sum + item.totalPrice, 0);

  const tax = showTax ? taxableAmount * DEFAULT_TAX_CONFIG.rate : 0;
  const total = subtotal + tax;

  const hasAnyTaxableItems = items.some(item => item.taxable);

  return (
    <View style={[styles.container, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: tokens.textSecondary }]}>Subtotal</Text>
        <Text style={[styles.value, { color: tokens.textPrimary }]}>${subtotal.toFixed(2)}</Text>
      </View>

      {showTax && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: tokens.textSecondary }]}>
            Tax ({hasAnyTaxableItems ? `${(DEFAULT_TAX_CONFIG.rate * 100).toFixed(1)}%` : 'N/A'})
          </Text>
          <Text style={[styles.value, { color: tokens.textPrimary }]}>
            {hasAnyTaxableItems ? `$${tax.toFixed(2)}` : 'N/A'}
          </Text>
        </View>
      )}

      <View style={[styles.row, styles.totalRow, { borderTopColor: tokens.border }]}>
        <Text style={[styles.totalLabel, { color: tokens.textPrimary }]}>Total</Text>
        <Text style={[styles.totalValue, { color: tokens.accent }]}>${total.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
  },
  value: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  totalRow: {
    borderTopWidth: 2,
    paddingTop: 12,
    marginBottom: 0,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 18,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
});
