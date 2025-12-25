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
    integrationsLoading,
    integrationsLoaded,
    syncFromGoogleCalendar,
    initiateGoogleAuth,
    fetchCalendarIntegrations,
    disconnectIntegration,
  } = useCalendar();

  const [disconnecting, setDisconnecting] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  // Integration providers configuration
  const integrationProviders = [
    {
      id: 'google',
      name: 'Google Calendar',
      description: 'Sync with Google Calendar for seamless scheduling',
      icon: 'logo-google' as const,
      color: '#4285F4',
      available: true,
    },
    {
      id: 'notion',
      name: 'Notion Calendar',
      description: 'Integrate with Notion databases as calendars',
      icon: 'document-text-outline' as const,
      color: '#000000',
      available: false,
    },
    {
      id: 'outlook',
      name: 'Microsoft Outlook',
      description: 'Connect with Outlook calendar and email',
      icon: 'mail-outline' as const,
      color: '#0078D4',
      available: false,
    },
    {
      id: 'apple',
      name: 'Apple Calendar',
      description: 'Integrate with Apple Calendar (iCloud)',
      icon: 'logo-apple' as const,
      color: '#555555',
      available: false,
    },
    {
      id: 'webhook',
      name: 'Custom Webhook',
      description: 'Custom integration via webhooks',
      icon: 'link-outline' as const,
      color: '#22C55E',
      available: false,
    },
  ];

  // Check if a provider is connected
  const isProviderConnected = (providerId: string) => {
    if (providerId === 'google') {
      return !!activeIntegration;
    }
    return false;
  };

  // Handle menu actions
  const handleMenuAction = (providerId: string, action: 'connect' | 'sync' | 'disconnect') => {
    setMenuOpenFor(null);
    if (providerId === 'google') {
      if (action === 'connect' || action === 'sync') {
        handleGoogleCalendar();
      } else if (action === 'disconnect') {
        handleDisconnect();
      }
    } else {
      Alert.alert('Coming Soon', `${integrationProviders.find(p => p.id === providerId)?.name} integration is coming soon!`);
    }
  };

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
    if (!activeIntegration) return;

    Alert.alert(
      "Disconnect Google Calendar",
      `Are you sure you want to disconnect ${activeIntegration.calendarEmail || 'this calendar'}? You can reconnect anytime.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            setDisconnecting(true);
            try {
              const success = await disconnectIntegration(activeIntegration.id);
              if (success) {
                Alert.alert("Success", "Google Calendar has been disconnected.");
              } else {
                Alert.alert("Error", "Failed to disconnect. Please try again.");
              }
            } catch (err) {
              console.error("Error disconnecting:", err);
              Alert.alert("Error", "An error occurred while disconnecting.");
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ]
    );
  }, [activeIntegration, disconnectIntegration]);

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
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
          <View style={{ paddingBottom: 20 }}>
            <Text style={styles.sectionTitle}>Calendar Integrations</Text>
            <Text style={styles.sectionDescription}>
              Connect your calendars to sync events automatically
            </Text>

            {integrationProviders.map((provider) => {
              const isConnected = isProviderConnected(provider.id);
              const isGoogle = provider.id === 'google';
              const isLoading = isGoogle && (integrationsLoading || disconnecting || syncingGoogle);

              // Determine status
              let statusText = 'Not connected';
              let statusColor = tokens.textSecondary;

              if (!provider.available) {
                statusText = 'Coming soon';
                statusColor = tokens.textSecondary;
              } else if (isLoading) {
                statusText = integrationsLoading ? 'Checking...' : disconnecting ? 'Disconnecting...' : 'Syncing...';
                statusColor = tokens.textSecondary;
              } else if (isConnected) {
                statusText = 'Connected';
                statusColor = '#22C55E';
              } else {
                statusText = 'Not connected';
                statusColor = tokens.textSecondary;
              }

              return (
                <View
                  key={provider.id}
                  style={[
                    styles.integrationCard,
                    !provider.available && styles.integrationCardDisabled
                  ]}
                >
                  <View style={styles.integrationHeader}>
                    <View style={styles.integrationIconRow}>
                      {/* Icon with connection indicator */}
                      <View style={styles.iconWrapper}>
                        <View style={[
                          styles.integrationIcon,
                          { backgroundColor: isConnected ? provider.color : (provider.available ? provider.color : tokens.border) }
                        ]}>
                          <Ionicons name={provider.icon} size={20} color="#fff" />
                        </View>
                        {/* Green dot indicator for connected */}
                        {isConnected && (
                          <View style={styles.connectedBadge}>
                            <Ionicons name="checkmark" size={8} color="#fff" />
                          </View>
                        )}
                      </View>

                      <View style={styles.integrationInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.integrationName}>{provider.name}</Text>
                          {isConnected && (
                            <View style={[styles.statusBadge, { backgroundColor: '#22C55E20' }]}>
                              <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
                              <Text style={[styles.statusBadgeText, { color: '#22C55E' }]}>Connected</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.integrationDescription}>{provider.description}</Text>
                        {isGoogle && isConnected && activeIntegration && (
                          <Text style={styles.accountInfo}>
                            {activeIntegration.calendarEmail || activeIntegration.calendarName || 'Primary'}
                            {lastGoogleSyncAt && ` · ${formatLastSync(lastGoogleSyncAt)}`}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Three-dot menu or loading indicator */}
                    <View style={styles.menuContainer}>
                      {isLoading ? (
                        <ActivityIndicator size="small" color={tokens.accent} />
                      ) : (
                        <TouchableOpacity
                          style={styles.menuButton}
                          onPress={() => setMenuOpenFor(menuOpenFor === provider.id ? null : provider.id)}
                        >
                          <Ionicons name="ellipsis-vertical" size={20} color={tokens.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Dropdown menu */}
                  {menuOpenFor === provider.id && (
                    <View style={styles.dropdownMenu}>
                      {provider.available ? (
                        isConnected ? (
                          <>
                            <TouchableOpacity
                              style={styles.menuItem}
                              onPress={() => handleMenuAction(provider.id, 'sync')}
                            >
                              <Ionicons name="sync-outline" size={18} color={tokens.textPrimary} />
                              <Text style={styles.menuItemText}>Sync Now</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.menuItem}
                              onPress={() => handleMenuAction(provider.id, 'disconnect')}
                            >
                              <Ionicons name="unlink-outline" size={18} color="#EF4444" />
                              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Disconnect</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => handleMenuAction(provider.id, 'connect')}
                          >
                            <Ionicons name="add-outline" size={18} color={tokens.accent} />
                            <Text style={[styles.menuItemText, { color: tokens.accent }]}>Connect</Text>
                          </TouchableOpacity>
                        )
                      ) : (
                        <View style={styles.menuItem}>
                          <Ionicons name="time-outline" size={18} color={tokens.textSecondary} />
                          <Text style={[styles.menuItemText, { color: tokens.textSecondary }]}>Coming Soon</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
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
      borderRadius: 24,
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
      marginBottom: 16,
      maxHeight: 400,
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
      flex: 1,
    },
    iconWrapper: {
      position: "relative",
    },
    integrationIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    connectedBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: "#22C55E",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: tokens.background,
    },
    integrationInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    integrationName: {
      fontSize: 15,
      fontWeight: "600",
      color: tokens.textPrimary,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: "600",
    },
    integrationDescription: {
      fontSize: 11,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    accountInfo: {
      fontSize: 10,
      color: tokens.textSecondary,
      marginTop: 4,
    },
    menuContainer: {
      marginLeft: 8,
    },
    menuButton: {
      padding: 8,
    },
    dropdownMenu: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    menuItemText: {
      fontSize: 14,
      fontWeight: "500",
      color: tokens.textPrimary,
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
