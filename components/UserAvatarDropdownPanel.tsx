"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface UserAvatarDropdownPanelProps {
  onAccountSettings: () => void;
  onPreferences: () => void;
  onSignOut: () => void;
}

export default function UserAvatarDropdownPanel({
  onAccountSettings,
  onPreferences,
  onSignOut,
}: UserAvatarDropdownPanelProps) {
  return (
    <View style={styles.panel}>
      <TouchableOpacity style={styles.item} onPress={onAccountSettings}>
        <Text style={styles.text}>Account settings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={onPreferences}>
        <Text style={styles.text}>Preferences</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={onSignOut}>
        <Text style={styles.text}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 70,
    right: 24,
    backgroundColor: "#0d111f",
    borderRadius: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1f2335",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 160,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  text: {
    color: "#f5f6ff",
    fontSize: 14,
    fontWeight: "600",
  },
});
