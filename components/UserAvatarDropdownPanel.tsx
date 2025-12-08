"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import NeomorphicCard from "./NeomorphicCard";

interface UserAvatarDropdownPanelProps {
  onAccountSettings: () => void;
  onPreferences: () => void;
  onSignOut: () => void;
  onActivityLog: () => void;
}

export default function UserAvatarDropdownPanel({
  onAccountSettings,
  onPreferences,
  onSignOut,
  onActivityLog,
}: UserAvatarDropdownPanelProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  return (
    <NeomorphicCard style={[styles.wrapper, styles.dropdownCard]} contentStyle={styles.panel}>
      <TouchableOpacity style={styles.item} onPress={onAccountSettings}>
        <Text style={styles.text}>Account settings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={onPreferences}>
        <Text style={styles.text}>Preferences</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={onActivityLog}>
        <Text style={styles.text}>Activity log</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.item, styles.signOut]} onPress={onSignOut}>
        <Text style={styles.text}>Sign out</Text>
      </TouchableOpacity>
    </NeomorphicCard>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    wrapper: {
      minWidth: 160,
      zIndex: 50,
      elevation: 20,
    },
    dropdownCard: {
      marginTop: 6,
      marginRight: -12,
    },
    panel: {
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: tokens.border,
      zIndex: 51,
      elevation: 24,
    },
    item: {
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    signOut: {
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      marginTop: 4,
    },
    text: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
  });
