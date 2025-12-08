"use client";

import React from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

interface Preference {
  label: string;
  description: string;
  enabled: boolean;
}

const preferences: Preference[] = [
  { label: "Theme sync", description: "Keep neomorphic/tactical themes aligned", enabled: true },
  { label: "Compact mode", description: "Reduce spacing for more rows", enabled: false },
  { label: "Notifications", description: "Push updates for receipts & testimonials", enabled: true },
];

interface PreferencesPanelProps {
  onClose: () => void;
}

export default function PreferencesPanel({ onClose }: PreferencesPanelProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Preferences</Text>
      {preferences.map((pref) => (
        <View key={pref.label} style={styles.row}>
          <View style={styles.textGroup}>
            <Text style={styles.label}>{pref.label}</Text>
            <Text style={styles.description}>{pref.description}</Text>
          </View>
          <Switch
            value={pref.enabled}
            trackColor={{ false: tokens.border, true: tokens.accent }}
            thumbColor={tokens.textPrimary}
          />
        </View>
      ))}
      <TouchableOpacity style={styles.action} onPress={onClose}>
        <Text style={styles.actionText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      backgroundColor: tokens.surface,
      padding: 24,
      borderWidth: 1,
      borderColor: tokens.border,
      borderRadius: 24,
    },
    heading: {
      fontSize: 18,
      fontWeight: "700",
      color: tokens.textPrimary,
      marginBottom: 20,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    textGroup: {
      flex: 1,
      paddingRight: 12,
    },
    label: {
      color: tokens.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    description: {
      color: tokens.textPrimary,
      fontSize: 13,
      marginTop: 4,
    },
    action: {
      marginTop: 12,
      backgroundColor: tokens.accent,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: "center",
    },
    actionText: {
      color: tokens.background,
      fontWeight: "700",
    },
  });
