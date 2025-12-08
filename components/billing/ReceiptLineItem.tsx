"use client";

import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { ReceiptItem } from "../../types/billing";
import BillingModeToggle from "./BillingModeToggle";

interface ReceiptLineItemProps {
  item: ReceiptItem;
  index: number;
  onUpdate: (field: keyof ReceiptItem, value: any) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export default function ReceiptLineItem({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: ReceiptLineItemProps) {
  const { tokens } = useTheme();

  const handleQuantityChange = (text: string) => {
    const value = text === '' ? 0 : parseFloat(text);
    if (!isNaN(value)) {
      onUpdate('quantity', value);
    }
  };

  const handleUnitPriceChange = (text: string) => {
    const value = text === '' ? 0 : parseFloat(text);
    if (!isNaN(value)) {
      onUpdate('unitPrice', value);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
      <View style={styles.header}>
        <Text style={[styles.itemNumber, { color: tokens.textSecondary }]}>
          Item #{index + 1}
        </Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
            <Ionicons name="trash-outline" size={16} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: tokens.textSecondary }]}>Description *</Text>
        <TextInput
          style={[styles.input, { color: tokens.textPrimary, borderColor: tokens.border }]}
          placeholder="Enter service description"
          placeholderTextColor={tokens.textSecondary}
          value={item.description}
          onChangeText={(text) => onUpdate('description', text)}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Billing Mode Toggle */}
      <BillingModeToggle
        value={item.billingMode || 'quantity'}
        onChange={(mode) => onUpdate('billingMode', mode)}
      />

      {/* Quantity and Unit Price */}
      <View style={styles.row}>
        <View style={[styles.field, styles.halfField]}>
          <Text style={[styles.label, { color: tokens.textSecondary }]}>
            {item.billingMode === 'hours' ? 'Hours' : 'Quantity'} *
          </Text>
          <TextInput
            style={[styles.input, { color: tokens.textPrimary, borderColor: tokens.border }]}
            placeholder="0"
            placeholderTextColor={tokens.textSecondary}
            value={item.quantity > 0 ? item.quantity.toString() : ''}
            onChangeText={handleQuantityChange}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={[styles.field, styles.halfField]}>
          <Text style={[styles.label, { color: tokens.textSecondary }]}>
            {item.billingMode === 'hours' ? 'Hourly Rate' : 'Unit Price'} *
          </Text>
          <TextInput
            style={[styles.input, { color: tokens.textPrimary, borderColor: tokens.border }]}
            placeholder="$0.00"
            placeholderTextColor={tokens.textSecondary}
            value={item.unitPrice > 0 ? item.unitPrice.toString() : ''}
            onChangeText={handleUnitPriceChange}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: tokens.textSecondary }]}>Total</Text>
        <Text style={[styles.totalValue, { color: tokens.accent }]}>
          ${item.totalPrice.toFixed(2)}
        </Text>
      </View>

      {/* Taxable Checkbox */}
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => onUpdate('taxable', !item.taxable)}
      >
        <View style={[
          styles.checkbox,
          {
            borderColor: tokens.border,
            backgroundColor: item.taxable ? tokens.accent : 'transparent'
          }
        ]}>
          {item.taxable && (
            <Ionicons name="checkmark" size={14} color={tokens.background} />
          )}
        </View>
        <Text style={[styles.checkboxLabel, { color: tokens.textSecondary }]}>
          Taxable
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  removeButton: {
    padding: 4,
  },
  field: {
    marginBottom: 12,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "lores-9-wide",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 18,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
    textTransform: "uppercase",
  },
});
