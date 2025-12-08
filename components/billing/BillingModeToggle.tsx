"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";

interface BillingModeToggleProps {
  value: 'quantity' | 'hours';
  onChange: (mode: 'quantity' | 'hours') => void;
  disabled?: boolean;
}

export default function BillingModeToggle({
  value,
  onChange,
  disabled = false,
}: BillingModeToggleProps) {
  const { tokens } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: tokens.textSecondary }]}>Billing Mode</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.leftButton,
            {
              backgroundColor: value === 'quantity' ? tokens.accent : tokens.background,
              borderColor: tokens.border,
            },
          ]}
          onPress={() => !disabled && onChange('quantity')}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Ionicons name="cube-outline" size={16} color={value === 'quantity' ? tokens.background : tokens.textSecondary} />
          <Text
            style={[
              styles.toggleText,
              { color: value === 'quantity' ? tokens.background : tokens.textPrimary },
            ]}
          >
            Quantity
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.rightButton,
            {
              backgroundColor: value === 'hours' ? tokens.accent : tokens.background,
              borderColor: tokens.border,
            },
          ]}
          onPress={() => !disabled && onChange('hours')}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={16} color={value === 'hours' ? tokens.background : tokens.textSecondary} />
          <Text
            style={[
              styles.toggleText,
              { color: value === 'hours' ? tokens.background : tokens.textPrimary },
            ]}
          >
            Hours
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  leftButton: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0.5,
  },
  rightButton: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeftWidth: 0.5,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
});
