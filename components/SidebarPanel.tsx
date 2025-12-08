"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

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

interface SidebarPanelProps {
  onSelect?: (tab: string) => void;
  onClose?: () => void;
}

export default function SidebarPanel({ onSelect, onClose }: SidebarPanelProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>CRM Navigation</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={16} color={tokens.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
      {navigation.map((item) => (
        <TouchableOpacity
          key={item}
          style={styles.item}
          onPress={() => onSelect?.(item)}
        >
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

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      backgroundColor: tokens.surface,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    heading: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tokens.border,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: tokens.surface,
    },
    subheading: {
      marginTop: 16,
    },
    item: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    label: {
      color: tokens.textSecondary,
      fontSize: 14,
      textTransform: "uppercase",
    },
  });
