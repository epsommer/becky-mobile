"use client";

import React from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

const preferences = [
  { label: "Theme", value: "Neomorphic / Tactical" },
  { label: "Grain", value: "Medium" },
  { label: "Window style", value: "Neomorphic" },
];

const profileInfo = [
  { label: "Name", value: "Evangelo Sommer" },
  { label: "Title", value: "System Administrator" },
  { label: "Email", value: "support@evangelosommer.com" },
  { label: "Phone", value: "+1 (647) 327-8401" },
];

const securitySettings = [
  { label: "Two-factor", enabled: false },
  { label: "Login notifications", enabled: true },
];

interface AccountSettingsPanelProps {
  onClose: () => void;
}

export default function AccountSettingsPanel({ onClose }: AccountSettingsPanelProps) {
  return (
    <ScrollView contentContainerStyle={styles.panel} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Profile</Text>
      {profileInfo.map((item) => (
        <View key={item.label} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}

      <Text style={[styles.heading, styles.sectionSpacing]}>Security</Text>
      {securitySettings.map((setting) => (
        <View key={setting.label} style={styles.row}>
          <Text style={styles.label}>{setting.label}</Text>
          <Switch value={setting.enabled} />
        </View>
      ))}

      <Text style={[styles.heading, styles.sectionSpacing]}>Preferences</Text>
      {preferences.map((pref) => (
        <View key={pref.label} style={styles.row}>
          <Text style={styles.label}>{pref.label}</Text>
          <Text style={styles.value}>{pref.value}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.action} onPress={onClose}>
        <Text style={styles.actionText}>Close settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: 24,
    backgroundColor: "#0d111f",
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f5f6ff",
    marginBottom: 12,
  },
  sectionSpacing: {
    marginTop: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  label: {
    color: "#9cb3ff",
    fontSize: 12,
    textTransform: "uppercase",
  },
  value: {
    color: "#f5f6ff",
    fontSize: 14,
    maxWidth: "65%",
    textAlign: "right",
  },
  action: {
    marginTop: 24,
    backgroundColor: "#5c93ff",
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  actionText: {
    fontWeight: "700",
    color: "#0c1221",
  },
});
