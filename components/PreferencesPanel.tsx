"use client";

import React from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

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
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Preferences</Text>
      {preferences.map((pref) => (
        <View key={pref.label} style={styles.row}>
          <View style={styles.textGroup}>
            <Text style={styles.label}>{pref.label}</Text>
            <Text style={styles.description}>{pref.description}</Text>
          </View>
          <Switch value={pref.enabled} />
        </View>
      ))}
      <TouchableOpacity style={styles.action} onPress={onClose}>
        <Text style={styles.actionText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#0d111f",
    marginHorizontal: 28,
    marginTop: 120,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1f2335",
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f5f6ff",
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
    color: "#9cb3ff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  description: {
    color: "#cbd3f4",
    fontSize: 13,
    marginTop: 4,
  },
  action: {
    marginTop: 12,
    backgroundColor: "#5c93ff",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionText: {
    color: "#0c1221",
    fontWeight: "700",
  },
});
