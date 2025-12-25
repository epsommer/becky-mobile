"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { useGoogleCalendar } from "../hooks/useGoogleCalendar";
import { useCalendar } from "../context/CalendarContext";

/**
 * Status badge colors based on status type
 */
const getStatusColor = (
  status: "connected" | "disconnected" | "syncing" | "error" | "success",
  tokens: ThemeTokens
) => {
  switch (status) {
    case "connected":
    case "success":
      return "#22C55E"; // green-500
    case "syncing":
      return tokens.accent;
    case "error":
      return "#EF4444"; // red-500
    case "disconnected":
    default:
      return tokens.textSecondary;
  }
};

/**
 * Format bytes to human readable size
 */
const formatEventCount = (count: number): string => {
  if (count === 0) return "No events";
  if (count === 1) return "1 event";
  return `${count} events`;
};

interface IntegrationRowProps {
  label: string;
  status: string;
  statusType: "connected" | "disconnected" | "syncing" | "error" | "success";
  detail: string;
  onAction?: () => void;
  actionLabel?: string;
  isLoading?: boolean;
  tokens: ThemeTokens;
}

const IntegrationRow: React.FC<IntegrationRowProps> = ({
  label,
  status,
  statusType,
  detail,
  onAction,
  actionLabel,
  isLoading,
  tokens,
}) => {
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);
  const statusColor = getStatusColor(statusType, tokens);

  return (
    <View style={styles.row}>
      <View style={styles.rowContent}>
        <View style={styles.statusDot}>
          <View
            style={[styles.dot, { backgroundColor: statusColor }]}
          />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.detail}>{detail}</Text>
        </View>
      </View>
      <View style={styles.rowActions}>
        <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
        {onAction && actionLabel && (
          <TouchableOpacity
            onPress={onAction}
            disabled={isLoading}
            style={[
              styles.actionButton,
              isLoading && styles.actionButtonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={tokens.accent} />
            ) : (
              <Text style={styles.actionButtonText}>{actionLabel}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function CalendarIntegrationManagerPanel() {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  // Google Calendar hook
  const {
    isConnected,
    isLoading,
    calendarName,
    calendarEmail,
    lastSyncAt,
    lastSyncError,
    formattedLastSync,
    syncStatus,
    syncedEvents,
    autoSyncEnabled,
    connect,
    disconnect,
    sync,
    setAutoSyncEnabled,
    refreshConnectionStatus,
  } = useGoogleCalendar();

  // Calendar context for event integration
  const {
    fetchCalendarIntegrations,
    syncFromGoogleCalendar,
    syncingGoogle,
    integrationsLoading,
  } = useCalendar();

  // Local state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch integrations on mount
  useEffect(() => {
    fetchCalendarIntegrations();
  }, [fetchCalendarIntegrations]);

  /**
   * Handle connect to Google Calendar
   */
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const result = await connect();
      if (result.success) {
        Alert.alert(
          "Connected",
          "Your Google Calendar has been connected successfully.",
          [{ text: "OK" }]
        );
        // Refresh integrations in calendar context
        await fetchCalendarIntegrations();
      } else {
        Alert.alert(
          "Connection Failed",
          result.error || "Failed to connect to Google Calendar. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred.",
        [{ text: "OK" }]
      );
    } finally {
      setIsConnecting(false);
    }
  }, [connect, fetchCalendarIntegrations]);

  /**
   * Handle disconnect from Google Calendar
   */
  const handleDisconnect = useCallback(async () => {
    Alert.alert(
      "Disconnect Google Calendar",
      "Are you sure you want to disconnect your Google Calendar? This will stop syncing events.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            setIsDisconnecting(true);
            try {
              const result = await disconnect();
              if (result.success) {
                Alert.alert(
                  "Disconnected",
                  "Your Google Calendar has been disconnected.",
                  [{ text: "OK" }]
                );
                await fetchCalendarIntegrations();
              } else {
                Alert.alert(
                  "Error",
                  result.error || "Failed to disconnect. Please try again.",
                  [{ text: "OK" }]
                );
              }
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error ? error.message : "An unexpected error occurred.",
                [{ text: "OK" }]
              );
            } finally {
              setIsDisconnecting(false);
            }
          },
        },
      ]
    );
  }, [disconnect, fetchCalendarIntegrations]);

  /**
   * Handle manual sync
   */
  const handleSync = useCallback(async () => {
    if (isSyncing || syncingGoogle) return;

    setIsSyncing(true);
    try {
      // Use the calendar context sync which integrates with the event store
      await syncFromGoogleCalendar();
    } catch (error) {
      console.error("[CalendarIntegrationManagerPanel] Sync error:", error);
      Alert.alert(
        "Sync Failed",
        error instanceof Error ? error.message : "Failed to sync. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, syncingGoogle, syncFromGoogleCalendar]);

  /**
   * Handle auto-sync toggle
   */
  const handleAutoSyncToggle = useCallback(
    async (value: boolean) => {
      await setAutoSyncEnabled(value);
    },
    [setAutoSyncEnabled]
  );

  /**
   * Determine Google Calendar status
   */
  const getGoogleStatus = (): {
    status: string;
    statusType: "connected" | "disconnected" | "syncing" | "error" | "success";
    detail: string;
  } => {
    if (isLoading || integrationsLoading) {
      return {
        status: "Loading...",
        statusType: "syncing",
        detail: "Checking connection",
      };
    }

    if (!isConnected) {
      return {
        status: "Not connected",
        statusType: "disconnected",
        detail: "Tap to connect",
      };
    }

    if (syncStatus === "syncing" || syncingGoogle || isSyncing) {
      return {
        status: "Syncing...",
        statusType: "syncing",
        detail: "Fetching events",
      };
    }

    if (syncStatus === "error" || lastSyncError) {
      return {
        status: "Sync error",
        statusType: "error",
        detail: lastSyncError || "Last sync failed",
      };
    }

    if (syncStatus === "success") {
      return {
        status: "Synced",
        statusType: "success",
        detail: formattedLastSync,
      };
    }

    return {
      status: "Connected",
      statusType: "connected",
      detail: calendarName || calendarEmail || formattedLastSync || "Ready to sync",
    };
  };

  const googleStatus = getGoogleStatus();
  const isAnyLoading =
    isLoading ||
    integrationsLoading ||
    isConnecting ||
    isDisconnecting ||
    isSyncing ||
    syncingGoogle;

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Calendar Integrations</Text>
        {isConnected && (
          <View style={styles.connectedBadge}>
            <View style={[styles.dot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.connectedText}>Active</Text>
          </View>
        )}
      </View>

      {/* Google Calendar Integration */}
      <View style={styles.integrationCard}>
        <View style={styles.integrationHeader}>
          <View style={styles.integrationIcon}>
            <Text style={styles.iconText}>G</Text>
          </View>
          <View style={styles.integrationInfo}>
            <Text style={styles.integrationTitle}>Google Calendar</Text>
            <Text style={styles.integrationSubtitle}>
              {isConnected
                ? calendarEmail || "Connected"
                : "Sync your events with Google"}
            </Text>
          </View>
        </View>

        <IntegrationRow
          label="Sync status"
          status={googleStatus.status}
          statusType={googleStatus.statusType}
          detail={googleStatus.detail}
          onAction={isConnected ? handleSync : undefined}
          actionLabel={isConnected ? "Sync now" : undefined}
          isLoading={isSyncing || syncingGoogle}
          tokens={tokens}
        />

        {isConnected && (
          <>
            <View style={styles.separator} />

            {/* Last sync info */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last sync</Text>
              <Text style={styles.infoValue}>{formattedLastSync}</Text>
            </View>

            {/* Synced events count */}
            {syncedEvents.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Synced events</Text>
                <Text style={styles.infoValue}>
                  {formatEventCount(syncedEvents.length)}
                </Text>
              </View>
            )}

            {/* Auto-sync toggle */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Auto-sync on open</Text>
                <Text style={styles.toggleDescription}>
                  Automatically sync when app opens
                </Text>
              </View>
              <Switch
                value={autoSyncEnabled}
                onValueChange={handleAutoSyncToggle}
                trackColor={{ false: tokens.border, true: tokens.accent }}
                thumbColor={autoSyncEnabled ? "#FFFFFF" : "#F4F4F4"}
              />
            </View>

            <View style={styles.separator} />

            {/* Disconnect button */}
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Text style={styles.disconnectText}>Disconnect</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {!isConnected && (
          <TouchableOpacity
            style={[styles.connectButton, isConnecting && styles.buttonDisabled]}
            onPress={handleConnect}
            disabled={isConnecting || isAnyLoading}
          >
            {isConnecting ? (
              <ActivityIndicator size="small" color={tokens.background} />
            ) : (
              <Text style={styles.connectText}>Connect Google Calendar</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Notion Integration (Coming Soon) */}
      <View style={[styles.integrationCard, styles.comingSoonCard]}>
        <View style={styles.integrationHeader}>
          <View style={[styles.integrationIcon, styles.notionIcon]}>
            <Text style={styles.iconText}>N</Text>
          </View>
          <View style={styles.integrationInfo}>
            <Text style={styles.integrationTitle}>Notion</Text>
            <Text style={styles.integrationSubtitle}>
              Sync with Notion databases
            </Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
      </View>

      {/* Help text */}
      <Text style={styles.helpText}>
        Connect your calendar services to sync events automatically and keep
        everything in one place.
      </Text>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      marginTop: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: tokens.border,
      backgroundColor: tokens.surface,
      padding: 16,
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    heading: {
      color: tokens.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    connectedBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    connectedText: {
      color: "#22C55E",
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 6,
    },
    integrationCard: {
      backgroundColor: tokens.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      padding: 16,
      marginBottom: 12,
    },
    comingSoonCard: {
      opacity: 0.7,
    },
    integrationHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    integrationIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: "#4285F4", // Google blue
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    notionIcon: {
      backgroundColor: "#000000",
    },
    iconText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "700",
    },
    integrationInfo: {
      flex: 1,
    },
    integrationTitle: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    integrationSubtitle: {
      color: tokens.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    comingSoonBadge: {
      backgroundColor: tokens.border,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    comingSoonText: {
      color: tokens.textSecondary,
      fontSize: 11,
      fontWeight: "500",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
    },
    rowContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    statusDot: {
      width: 8,
      height: 8,
      marginRight: 10,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    rowText: {
      flex: 1,
    },
    label: {
      color: tokens.textPrimary,
      fontWeight: "600",
      fontSize: 14,
    },
    detail: {
      fontSize: 12,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    rowActions: {
      flexDirection: "row",
      alignItems: "center",
    },
    status: {
      fontSize: 12,
      fontWeight: "500",
      marginRight: 10,
    },
    actionButton: {
      backgroundColor: tokens.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      minWidth: 70,
      alignItems: "center",
    },
    actionButtonDisabled: {
      opacity: 0.6,
    },
    actionButtonText: {
      color: tokens.background,
      fontSize: 12,
      fontWeight: "600",
    },
    separator: {
      height: 1,
      backgroundColor: tokens.border,
      marginVertical: 12,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    infoLabel: {
      color: tokens.textSecondary,
      fontSize: 13,
    },
    infoValue: {
      color: tokens.textPrimary,
      fontSize: 13,
      fontWeight: "500",
    },
    toggleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
    },
    toggleLabel: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: "500",
    },
    toggleDescription: {
      color: tokens.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    connectButton: {
      marginTop: 12,
      backgroundColor: tokens.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    connectText: {
      color: tokens.background,
      fontWeight: "700",
      fontSize: 15,
    },
    disconnectButton: {
      alignItems: "center",
      paddingVertical: 12,
    },
    disconnectText: {
      color: "#EF4444",
      fontWeight: "600",
      fontSize: 14,
    },
    helpText: {
      color: tokens.textSecondary,
      fontSize: 12,
      textAlign: "center",
      marginTop: 4,
    },
  });
