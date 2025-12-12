"use client";

import React, { useCallback } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { useCalendar } from "../context/CalendarContext";

export default function CalendarIntegrationPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const {
    activeIntegration,
    syncingGoogle,
    lastGoogleSyncAt,
    syncFromGoogleCalendar,
    initiateGoogleAuth,
  } = useCalendar();

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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }, []);

  // Handle sync button press
  const handleSync = useCallback(async () => {
    if (activeIntegration) {
      await syncFromGoogleCalendar();
    } else {
      // Initiate Google OAuth
      const authUrl = await initiateGoogleAuth();
      if (authUrl) {
        // Open in browser for OAuth
        const canOpen = await Linking.canOpenURL(authUrl);
        if (canOpen) {
          await Linking.openURL(authUrl);
        } else {
          Alert.alert(
            "Cannot Open Browser",
            "Please connect Google Calendar from the web app first."
          );
        }
      }
    }
  }, [activeIntegration, syncFromGoogleCalendar, initiateGoogleAuth]);

  // Get status text and color
  const getGoogleStatus = () => {
    if (syncingGoogle) {
      return { text: "Syncing...", color: tokens.accent };
    }
    if (activeIntegration) {
      return { text: "Connected", color: tokens.highlight };
    }
    return { text: "Not connected", color: tokens.textSecondary };
  };

  const googleStatus = getGoogleStatus();

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Calendar sync</Text>
        <TouchableOpacity onPress={handleSync} disabled={syncingGoogle}>
          <Text style={styles.cta}>
            {activeIntegration ? "Sync Now" : "Connect"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Google Calendar */}
      <TouchableOpacity
        style={styles.integrationRow}
        onPress={handleSync}
        disabled={syncingGoogle}
      >
        <View style={styles.integrationInfo}>
          <View style={styles.integrationIconRow}>
            <Ionicons
              name="logo-google"
              size={18}
              color={activeIntegration ? tokens.accent : tokens.textSecondary}
            />
            <Text style={styles.integrationLabel}>Google Calendar</Text>
          </View>
          <Text style={[styles.integrationDetail, { color: googleStatus.color }]}>
            {googleStatus.text}
          </Text>
        </View>
        <View style={styles.integrationRight}>
          {syncingGoogle ? (
            <ActivityIndicator size="small" color={tokens.accent} />
          ) : activeIntegration ? (
            <View>
              <Text style={styles.integrationTime}>
                {formatLastSync(lastGoogleSyncAt)}
              </Text>
              {activeIntegration.calendarName && (
                <Text style={styles.calendarName} numberOfLines={1}>
                  {activeIntegration.calendarName}
                </Text>
              )}
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={tokens.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Notion Calendar - placeholder */}
      <View style={styles.integrationRow}>
        <View style={styles.integrationInfo}>
          <View style={styles.integrationIconRow}>
            <Ionicons name="document-text-outline" size={18} color={tokens.textSecondary} />
            <Text style={styles.integrationLabel}>Notion Calendar</Text>
          </View>
          <Text style={[styles.integrationDetail, { color: tokens.textSecondary }]}>
            Coming soon
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={tokens.textSecondary} />
      </View>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      marginTop: 16,
      borderRadius: 18,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      padding: 16,
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    headingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    heading: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    cta: {
      color: tokens.accent,
      textTransform: "uppercase",
      fontSize: 12,
      fontWeight: "600",
    },
    integrationRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    integrationInfo: {
      flex: 1,
    },
    integrationIconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    integrationLabel: {
      color: tokens.textPrimary,
      fontWeight: "600",
      fontSize: 14,
    },
    integrationDetail: {
      fontSize: 12,
      marginTop: 4,
      marginLeft: 26,
    },
    integrationRight: {
      alignItems: "flex-end",
    },
    integrationTime: {
      color: tokens.textSecondary,
      fontSize: 11,
      textAlign: "right",
    },
    calendarName: {
      color: tokens.textSecondary,
      fontSize: 10,
      textAlign: "right",
      marginTop: 2,
      maxWidth: 120,
    },
  });
