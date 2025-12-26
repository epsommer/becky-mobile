"use client";

import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import GoalsDashboard from "./GoalsDashboard";

/**
 * GoalsScreen
 *
 * Main screen for goals management, wrapping the GoalsDashboard component.
 */
export default function GoalsScreen() {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tokens.background }]}>
      <GoalsDashboard />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
