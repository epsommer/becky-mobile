"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { useCalendar } from "../context/CalendarContext";

type TabType = "general" | "integrations";

interface Preference {
  label: string;
  description: string;
  enabled: boolean;
}

const generalPreferences: Preference[] = [
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
  const [activeTab, setActiveTab] = useState<TabType>("general");

  const {
    activeIntegration,
    calendarIntegrations,
    syncingGoogle,
    lastGoogleSyncAt,
    syncFromGoogleCalendar,
    initiateGoogleAuth,
    fetchCalendarIntegrations,
  } = useCalendar();

  // Fetch calendar integrations when switching to integrations tab
  useEffect(() => {
    if (activeTab === "integrations") {
      fetchCalendarIntegrations();
    }
  }, [activeTab, fetchCalendarIntegrations]);

  // Format last sync time
  const formatLastSync = useCallback((isoString: string | null) => {
    if (!isoString) return "Never synced";

    const lastSync = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  }, []);

  // Handle Google Calendar connect/sync
  const handleGoogleCalendar = useCallback(async () => {
    if (activeIntegration) {
      await syncFromGoogleCalendar();
    } else {
      const authUrl = await initiateGoogleAuth();
      if (authUrl) {
        const canOpen = await Linking.canOpenURL(authUrl);
        if (canOpen) {
          Alert.alert(
            "Connect Google Calendar",
            "You'll be redirected to Google to authorize access. After authorization, return to the app.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Continue",
                onPress: async () => {
                  await Linking.openURL(authUrl);
                  // After returning, refresh integrations
                  setTimeout(() => fetchCalendarIntegrations(), 2000);
                },
              },
            ]
          );
        } else {
          Alert.alert(
            "Cannot Open Browser",
            "Please connect Google Calendar from the web app at evangelosommer.com/preferences"
          );
        }
      }
    }
  }, [activeIntegration, syncFromGoogleCalendar, initiateGoogleAuth, fetchCalendarIntegrations]);

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    Alert.alert(
      "Disconnect Google Calendar",
      "Are you sure you want to disconnect? You can reconnect anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            // TODO: Implement disconnect API
            Alert.alert("Info", "Please disconnect from the web app at evangelosommer.com/preferences");
          },
        },
      ]
    );
  }, []);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Preferences</Text>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "general" && styles.tabActive]}
          onPress={() => setActiveTab("general")}
        >
          <Ionicons
            name="settings-outline"
            size={18}
            color={activeTab === "general" ? tokens.accent : tokens.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === "general" && styles.tabTextActive]}>
            General
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "integrations" && styles.tabActive]}
          onPress={() => setActiveTab("integrations")}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={activeTab === "integrations" ? tokens.accent : tokens.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === "integrations" && styles.tabTextActive]}>
            Integrations
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "general" && (
          <View>
            {generalPreferences.map((pref) => (
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
          </View>
        )}

        {activeTab === "integrations" && (
          <View>
            <Text style={styles.sectionTitle}>Calendar Integrations</Text>
            <Text style={styles.sectionDescription}>
              Connect your calendars to sync events automatically
            </Text>

            {/* Google Calendar */}
            <View style={styles.integrationCard}>
              <View style={styles.integrationHeader}>
                <View style={styles.integrationIconRow}>
                  <View style={[styles.integrationIcon, { backgroundColor: activeIntegration ? '#4285F4' : tokens.border }]}>
                    <Ionicons name="logo-google" size={20} color="#fff" />
                  </View>
                  <View style={styles.integrationInfo}>
                    <Text style={styles.integrationName}>Google Calendar</Text>
                    <Text style={[
                      styles.integrationStatus,
                      { color: activeIntegration ? tokens.highlight : tokens.textSecondary }
                    ]}>
                      {syncingGoogle ? "Syncing..." : activeIntegration ? "Connected" : "Not connected"}
                    </Text>
                  </View>
                </View>
                {syncingGoogle && (
                  <ActivityIndicator size="small" color={tokens.accent} />
                )}
              </View>

              {activeIntegration && (
                <View style={styles.integrationDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Calendar</Text>
                    <Text style={styles.detailValue}>
                      {activeIntegration.calendarName || activeIntegration.calendarEmail || "Primary"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Last synced</Text>
                    <Text style={styles.detailValue}>{formatLastSync(lastGoogleSyncAt)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.integrationActions}>
                <TouchableOpacity
                  style={[styles.integrationButton, styles.integrationButtonPrimary]}
                  onPress={handleGoogleCalendar}
                  disabled={syncingGoogle}
                >
                  <Ionicons
                    name={activeIntegration ? "sync-outline" : "add-outline"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.integrationButtonTextPrimary}>
                    {activeIntegration ? "Sync Now" : "Connect"}
                  </Text>
                </TouchableOpacity>

                {activeIntegration && (
                  <TouchableOpacity
                    style={[styles.integrationButton, styles.integrationButtonSecondary]}
                    onPress={handleDisconnect}
                  >
                    <Ionicons name="unlink-outline" size={18} color={tokens.textSecondary} />
                    <Text style={styles.integrationButtonTextSecondary}>Disconnect</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Notion Calendar - Coming Soon */}
            <View style={[styles.integrationCard, styles.integrationCardDisabled]}>
              <View style={styles.integrationHeader}>
                <View style={styles.integrationIconRow}>
                  <View style={[styles.integrationIcon, { backgroundColor: tokens.border }]}>
                    <Ionicons name="document-text-outline" size={20} color={tokens.textSecondary} />
                  </View>
                  <View style={styles.integrationInfo}>
                    <Text style={styles.integrationName}>Notion Calendar</Text>
                    <Text style={[styles.integrationStatus, { color: tokens.textSecondary }]}>
                      Coming soon
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Outlook Calendar - Coming Soon */}
            <View style={[styles.integrationCard, styles.integrationCardDisabled]}>
              <View style={styles.integrationHeader}>
                <View style={styles.integrationIconRow}>
                  <View style={[styles.integrationIcon, { backgroundColor: tokens.border }]}>
                    <Ionicons name="mail-outline" size={20} color={tokens.textSecondary} />
                  </View>
                  <View style={styles.integrationInfo}>
                    <Text style={styles.integrationName}>Outlook Calendar</Text>
                    <Text style={[styles.integrationStatus, { color: tokens.textSecondary }]}>
                      Coming soon
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

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
      maxHeight: "90%",
    },
    heading: {
      fontSize: 18,
      fontWeight: "700",
      color: tokens.textPrimary,
      marginBottom: 16,
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: tokens.background,
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
    },
    tabActive: {
      backgroundColor: tokens.surface,
    },
    tabText: {
      fontSize: 13,
      fontWeight: "600",
      color: tokens.textSecondary,
    },
    tabTextActive: {
      color: tokens.accent,
    },
    content: {
      flex: 1,
      marginBottom: 16,
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
    // Integrations tab styles
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: tokens.textPrimary,
      marginBottom: 4,
    },
    sectionDescription: {
      fontSize: 12,
      color: tokens.textSecondary,
      marginBottom: 16,
    },
    integrationCard: {
      backgroundColor: tokens.background,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    integrationCardDisabled: {
      opacity: 0.6,
    },
    integrationHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    integrationIconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    integrationIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    integrationInfo: {
      flex: 1,
    },
    integrationName: {
      fontSize: 15,
      fontWeight: "600",
      color: tokens.textPrimary,
    },
    integrationStatus: {
      fontSize: 12,
      marginTop: 2,
    },
    integrationDetails: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    detailLabel: {
      fontSize: 12,
      color: tokens.textSecondary,
    },
    detailValue: {
      fontSize: 12,
      color: tokens.textPrimary,
      fontWeight: "500",
    },
    integrationActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    integrationButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    integrationButtonPrimary: {
      backgroundColor: tokens.accent,
    },
    integrationButtonSecondary: {
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    integrationButtonTextPrimary: {
      fontSize: 13,
      fontWeight: "600",
      color: "#fff",
    },
    integrationButtonTextSecondary: {
      fontSize: 13,
      fontWeight: "600",
      color: tokens.textSecondary,
    },
    action: {
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
