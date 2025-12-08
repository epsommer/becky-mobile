"use client";

import React from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { ColorTheme, GrainIntensity, ThemeTokens, WindowTheme, useTheme } from "../theme/ThemeContext";

const profileInfo = [
  { label: "Name", value: "Evangelo Sommer" },
  { label: "Title", value: "System Administrator" },
  { label: "Email", value: "support@evangelosommer.com" },
  { label: "Phone", value: "+1 (647) 327-8401" },
];

interface AccountSettingsPanelProps {
  onClose: () => void;
}

const colorThemes: { id: ColorTheme; label: string; desc: string }[] = [
  { id: "light", label: "Light", desc: "Soft neutral" },
  { id: "mocha", label: "Mocha", desc: "Warm dark" },
  { id: "overkast", label: "Overkast", desc: "Monochrome" },
  { id: "true-night", label: "True Night", desc: "Deep neutral" },
  { id: "gilded-meadow", label: "Gilded Meadow", desc: "Sunkissed" },
];

const windowThemes: { id: WindowTheme; label: string; desc: string }[] = [
  { id: "neomorphic", label: "Neomorphic", desc: "3D glass-shell" },
  { id: "tactical", label: "Tactical", desc: "HUD dark steel" },
];

const grainLevels: { id: GrainIntensity; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export default function AccountSettingsPanel({ onClose }: AccountSettingsPanelProps) {
  const { colorTheme, windowTheme, grainIntensity, setColorTheme, setWindowTheme, setGrainIntensity, tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

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
      <View style={styles.row}>
        <Text style={styles.label}>Two-factor</Text>
        <Switch
          value={false}
          trackColor={{ false: tokens.border, true: tokens.accent }}
          thumbColor={tokens.textPrimary}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Login notifications</Text>
        <Switch
          value
          trackColor={{ false: tokens.border, true: tokens.accent }}
          thumbColor={tokens.textPrimary}
        />
      </View>

      <Text style={[styles.heading, styles.sectionSpacing]}>Display & Theme</Text>
      <Text style={styles.subheading}>Color Theme</Text>
      <View style={styles.themeRow}>
        {colorThemes.map((option) => {
          const active = option.id === colorTheme;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.themeOption, active && styles.themeOptionActive]}
              onPress={() => setColorTheme(option.id)}
            >
              <View style={[styles.themeSwatch, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <View style={[styles.swatchDot, { backgroundColor: tokens.accent }]} />
              </View>
              <Text style={styles.themeLabel}>{option.label}</Text>
              <Text style={styles.themeDesc}>{option.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.subheading, styles.sectionSpacingSmall]}>Window Style</Text>
      <View style={styles.themeRow}>
        {windowThemes.map((option) => {
          const active = option.id === windowTheme;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.themeOption, active && styles.themeOptionActive]}
              onPress={() => setWindowTheme(option.id)}
            >
              <Text style={styles.themeLabel}>{option.label}</Text>
              <Text style={styles.themeDesc}>{option.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.subheading, styles.sectionSpacingSmall]}>Grain</Text>
      <View style={styles.chipRow}>
        {grainLevels.map((option) => {
          const active = option.id === grainIntensity;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setGrainIntensity(option.id)}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.action} onPress={onClose}>
        <Text style={styles.actionText}>Close settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      padding: 24,
      backgroundColor: tokens.surface,
      gap: 4,
    },
    heading: {
      fontSize: 18,
      fontWeight: "700",
      color: tokens.textPrimary,
      marginBottom: 12,
    },
    subheading: {
      fontSize: 13,
      fontWeight: "700",
      color: tokens.textPrimary,
      textTransform: "uppercase",
      marginBottom: 10,
    },
    sectionSpacing: {
      marginTop: 22,
    },
    sectionSpacingSmall: {
      marginTop: 14,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    label: {
      color: tokens.textSecondary,
      fontSize: 12,
      textTransform: "uppercase",
    },
    value: {
      color: tokens.textPrimary,
      fontSize: 14,
      maxWidth: "65%",
      textAlign: "right",
    },
    themeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    themeOption: {
      width: "48%",
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: tokens.border,
      backgroundColor: tokens.surface,
    },
    themeOptionActive: {
      borderColor: tokens.accent,
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    themeLabel: {
      color: tokens.textPrimary,
      fontWeight: "700",
      fontSize: 13,
    },
    themeDesc: {
      color: tokens.textSecondary,
      fontSize: 12,
      marginTop: 4,
    },
    themeSwatch: {
      width: 42,
      height: 26,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
      borderWidth: 1,
    },
    swatchDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      backgroundColor: tokens.surface,
    },
    chipActive: {
      backgroundColor: tokens.accent,
      borderColor: tokens.accent,
    },
    chipLabel: {
      color: tokens.textPrimary,
      fontWeight: "700",
      fontSize: 12,
    },
    chipLabelActive: {
      color: tokens.background,
    },
    action: {
      marginTop: 24,
      backgroundColor: tokens.accent,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: "center",
    },
    actionText: {
      fontWeight: "700",
      color: tokens.background,
    },
  });
