"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Animated, LayoutAnimation, Platform, UIManager, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useApi } from "../lib/hooks/useApi";
import { clientsApi } from "../lib/api/endpoints";
import ReceiptModal from "./billing/ReceiptModal";
import TimeTrackerModal from "./modals/TimeTrackerModal";
import { showDeleteConfirmation } from "./modals/DeleteConfirmationModal";

interface SelectorClient {
  id: string;
  name: string;
  status?: string;
  createdAt?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

interface ClientSelectorPanelProps {
  onNavigateToClients?: () => void;
  variant?: 'recent' | 'all';
  searchQuery?: string;
  statusFilter?: string;
  serviceFilter?: string;
  onViewClientDetail?: (clientId: string) => void;
}

export default function ClientSelectorPanel({
  onNavigateToClients,
  variant = 'all',
  searchQuery = '',
  statusFilter = 'all',
  serviceFilter = 'all',
  onViewClientDetail
}: ClientSelectorPanelProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const isRecent = variant === 'recent';
  const limit = isRecent ? 9 : 100; // Show 9 for recent, 100 for all

  // State for menu, selections, and expansion
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [selectedClients, setSelectedClients] = React.useState<Set<string>>(new Set());
  const [expandedClientId, setExpandedClientId] = React.useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = React.useState(false);
  const [receiptClientId, setReceiptClientId] = React.useState<string | null>(null);
  const [showTimeTrackerModal, setShowTimeTrackerModal] = React.useState(false);
  const [timerClientId, setTimerClientId] = React.useState<string | null>(null);
  const [batchLoading, setBatchLoading] = React.useState(false);
  const [batchProgress, setBatchProgress] = React.useState<{ current: number; total: number } | null>(null);

  // Animation for list appearance
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ✨ New API client - replaces 45+ lines of fetch logic
  const { data: clients, loading, error } = useApi(
    () => clientsApi.getClients({ limit }),
    [limit]
  );

  // Animate list when clients load
  useEffect(() => {
    if (clients && clients.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [clients, fadeAnim]);

  // Toggle expanded client with animation
  const toggleExpanded = (clientId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedClientId(expandedClientId === clientId ? null : clientId);
  };

  // Filter and sort clients based on search, filters, and variant
  const sortedClients = React.useMemo(() => {
    if (!clients) return [];

    let filtered = [...clients];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(query) ||
        (client.status && client.status.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client =>
        client.status && client.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply service line filter (assuming clients might have a serviceType field)
    // Note: This assumes the client object has a serviceType or similar field
    // Adjust based on your actual data structure
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(client => {
        // TODO: Update this based on actual client data structure
        // For now, this is a placeholder
        return true;
      });
    }

    if (!isRecent) {
      // For 'all' variant, return filtered clients
      return filtered;
    }

    // For 'recent' variant, sort by createdAt and limit to 9
    return filtered
      .sort((a, b) => {
        // Handle missing createdAt - put at end
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;

        // Parse dates and compare (newer first)
        try {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } catch (e) {
          console.warn('[ClientSelectorPanel] Invalid date:', a.createdAt, b.createdAt);
          return 0;
        }
      })
      .slice(0, 9);
  }, [clients, isRecent, searchQuery, statusFilter, serviceFilter]);

  const headerText = isRecent ? 'Recent Clients' : 'Clients';

  // Toggle checkbox selection with haptic feedback
  const toggleClientSelection = useCallback((clientId: string) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
    // Haptic feedback
    Haptics.selectionAsync().catch(() => {});
  }, []);

  // Select all clients
  const handleSelectAll = useCallback(() => {
    if (!sortedClients) return;
    const allIds = sortedClients.map(c => c.id);
    if (selectedClients.size === allIds.length) {
      // All selected, deselect all
      setSelectedClients(new Set());
    } else {
      // Select all
      setSelectedClients(new Set(allIds));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [sortedClients, selectedClients.size]);

  // Menu action handlers
  const handleViewInfo = (client: SelectorClient) => {
    console.log('[ClientSelectorPanel] View info:', client);
    setOpenMenuId(null);
    if (onViewClientDetail) {
      onViewClientDetail(client.id);
    }
  };

  const handleEditClient = (client: SelectorClient) => {
    console.log('[ClientSelectorPanel] Edit client:', client);
    setOpenMenuId(null);
    // TODO: Navigate to edit client screen
  };

  const handleSelectClient = (client: SelectorClient) => {
    console.log('[ClientSelectorPanel] Select client:', client);
    setOpenMenuId(null);
    // TODO: Set as active client
  };

  const handleDeleteClient = (client: SelectorClient) => {
    console.log('[ClientSelectorPanel] Delete client:', client);
    setOpenMenuId(null);

    showDeleteConfirmation({
      title: 'Delete Client?',
      message: 'This will permanently remove this client and all associated data.',
      itemName: client.name,
      onConfirm: async () => {
        try {
          const response = await clientsApi.deleteClient(client.id);
          if (response.success) {
            console.log('[ClientSelectorPanel] Client deleted:', client.id);
            // Refresh the client list by triggering a re-fetch
            // Note: The useApi hook will need to be updated to support manual refresh
            // For now, we rely on the next fetch cycle
          } else {
            console.error('[ClientSelectorPanel] Failed to delete client:', response);
          }
        } catch (error) {
          console.error('[ClientSelectorPanel] Error deleting client:', error);
        }
      },
    });
  };

  // Batch operation handlers with progress tracking
  const handleBatchDelete = useCallback(async () => {
    const count = selectedClients.size;
    if (count === 0 || batchLoading) return;

    console.log('[ClientSelectorPanel] Batch delete:', Array.from(selectedClients));

    showDeleteConfirmation({
      title: `Delete ${count} Client${count > 1 ? 's' : ''}?`,
      message: `This will permanently remove ${count} client${count > 1 ? 's' : ''} and all associated data.`,
      confirmText: `Delete ${count}`,
      onConfirm: async () => {
        setBatchLoading(true);
        const clientIds = Array.from(selectedClients);
        let successCount = 0;
        let failedCount = 0;

        try {
          for (let i = 0; i < clientIds.length; i++) {
            setBatchProgress({ current: i + 1, total: clientIds.length });
            try {
              const response = await clientsApi.deleteClient(clientIds[i]);
              if (response.success) {
                successCount++;
              } else {
                failedCount++;
              }
            } catch (err) {
              failedCount++;
              console.error(`[ClientSelectorPanel] Failed to delete client ${clientIds[i]}:`, err);
            }
          }

          console.log('[ClientSelectorPanel] Batch delete completed:', { successCount, failedCount });

          if (failedCount > 0 && successCount > 0) {
            Alert.alert(
              'Partial Success',
              `Deleted ${successCount} of ${count} clients. ${failedCount} failed.`
            );
          } else if (failedCount > 0) {
            Alert.alert('Error', 'Failed to delete clients. Please try again.');
          }

          setSelectedClients(new Set());
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } catch (error) {
          console.error('[ClientSelectorPanel] Error during batch delete:', error);
          Alert.alert('Error', 'An error occurred during batch delete.');
        } finally {
          setBatchLoading(false);
          setBatchProgress(null);
        }
      },
    });
  }, [selectedClients, batchLoading]);

  const handleBatchExport = useCallback(() => {
    const count = selectedClients.size;
    console.log('[ClientSelectorPanel] Batch export:', Array.from(selectedClients));
    // TODO: Implement export functionality
    Alert.alert(
      'Export Clients',
      `Export functionality for ${count} client${count > 1 ? 's' : ''} coming soon.`
    );
  }, [selectedClients]);

  const handleDeselectAll = useCallback(() => {
    setSelectedClients(new Set());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  // Quick action handlers
  const handleMessage = (client: SelectorClient) => {
    console.log('[ClientSelectorPanel] Message client:', client);
    // TODO: Open message composer
  };

  const handleAppointment = (client: SelectorClient) => {
    console.log('[ClientSelectorPanel] Create appointment:', client);
    // TODO: Open appointment scheduler
  };

  const handleReceipt = (client: SelectorClient) => {
    console.log('[ClientSelectorPanel] Send receipt:', client);
    setReceiptClientId(client.id);
    setShowReceiptModal(true);
  };

  const handleNote = (client: SelectorClient) => {
    console.log('[ClientSelectorPanel] Add note:', client);
    // TODO: Open note editor
  };

  const handleTimer = (client: SelectorClient) => {
    console.log('[ClientSelectorPanel] Start timer:', client);
    setTimerClientId(client.id);
    setShowTimeTrackerModal(true);
  };

  const selectedCount = selectedClients.size;
  const allSelected = sortedClients && sortedClients.length > 0 && selectedCount === sortedClients.length;

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{headerText}</Text>
        <View style={styles.headerActions}>
          {/* Select All button - only show when not in recent mode */}
          {!isRecent && sortedClients && sortedClients.length > 0 && (
            <TouchableOpacity
              onPress={handleSelectAll}
              style={[styles.selectAllButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={allSelected ? 'checkbox' : 'checkbox-outline'}
                size={16}
                color={allSelected ? tokens.accent : tokens.textSecondary}
              />
              <Text style={[styles.selectAllText, { color: allSelected ? tokens.accent : tokens.textSecondary }]}>
                {allSelected ? 'Deselect' : 'Select All'}
              </Text>
            </TouchableOpacity>
          )}
          {isRecent && (
            <TouchableOpacity
              onPress={onNavigateToClients}
              style={styles.iconButton}
              activeOpacity={0.6}
            >
              <Ionicons name="chevron-forward" size={18} color={tokens.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Batch Operations Bar */}
      {selectedCount > 0 && (
        <View style={[styles.batchBar, { backgroundColor: tokens.highlight + '20', borderColor: tokens.accent }]}>
          <View style={styles.batchCountContainer}>
            <Text style={[styles.batchCount, { color: tokens.textPrimary }]}>
              {selectedCount} selected
            </Text>
            {batchProgress && (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="small" color={tokens.accent} />
                <Text style={[styles.progressText, { color: tokens.textSecondary }]}>
                  {batchProgress.current}/{batchProgress.total}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.batchActions}>
            <TouchableOpacity
              style={[styles.batchButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
              onPress={handleBatchExport}
              disabled={batchLoading}
            >
              <Ionicons name="download-outline" size={16} color={tokens.accent} />
              <Text style={[styles.batchButtonText, { color: tokens.accent }]}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
              onPress={handleDeselectAll}
              disabled={batchLoading}
            >
              <Ionicons name="close" size={16} color={tokens.textSecondary} />
              <Text style={[styles.batchButtonText, { color: tokens.textSecondary }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.batchButton,
                styles.batchButtonDanger,
                { borderColor: tokens.error || '#ef4444' },
                batchLoading && styles.batchButtonDisabled,
              ]}
              onPress={handleBatchDelete}
              disabled={batchLoading}
            >
              {batchLoading ? (
                <ActivityIndicator size="small" color={tokens.error || '#ef4444'} />
              ) : (
                <Ionicons name="trash-outline" size={16} color={tokens.error || '#ef4444'} />
              )}
              <Text style={[styles.batchButtonText, { color: tokens.error || '#ef4444' }]}>
                {batchLoading ? 'Deleting...' : 'Delete'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {loading && <Text style={styles.statusHint}>Loading database...</Text>}
      {error && <Text style={styles.statusHint}>{error}</Text>}
      {!loading && !error && (!sortedClients || sortedClients.length === 0) && (
        <Text style={styles.statusHint}>No clients found.</Text>
      )}
      <Animated.View style={{ opacity: fadeAnim }}>
      {sortedClients && sortedClients.map((client) => {
        const isSelected = selectedClients.has(client.id);
        const isMenuOpen = openMenuId === client.id;
        const isExpanded = expandedClientId === client.id;

        return (
          <View key={client.id} style={styles.clientContainer}>
            <TouchableOpacity
              style={styles.clientRow}
              onPress={() => toggleExpanded(client.id)}
              activeOpacity={0.7}
            >
              {/* Client info */}
              <View style={styles.clientInfo}>
                <View style={styles.clientNameRow}>
                  <Text style={styles.clientName}>{client.name}</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={tokens.textSecondary} />
                </View>
                {client.status && (
                  <Text style={styles.clientStatus}>{client.status}</Text>
                )}
              </View>

              {/* Actions: Menu icon and Checkbox */}
              <View style={styles.actionsRow}>
                {/* Triple-dot menu */}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(isMenuOpen ? null : client.id);
                  }}
                  style={styles.menuButton}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color={tokens.textSecondary} />
                </TouchableOpacity>

                {/* Checkbox */}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleClientSelection(client.id);
                  }}
                  style={styles.checkboxButton}
                >
                  <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={20} color={isSelected ? tokens.accent : tokens.textSecondary} />
                </TouchableOpacity>
              </View>

            </TouchableOpacity>

            {/* Menu popup */}
            {isMenuOpen && (
              <View style={styles.menuPopup}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleViewInfo(client)}
                >
                  <Ionicons name="information-circle-outline" size={16} color={tokens.textPrimary} />
                  <Text style={styles.menuItemText}>View info</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleEditClient(client)}
                >
                  <Ionicons name="create-outline" size={16} color={tokens.textPrimary} />
                  <Text style={styles.menuItemText}>Edit client</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleSelectClient(client)}
                >
                  <Ionicons name="checkmark" size={16} color={tokens.textPrimary} />
                  <Text style={styles.menuItemText}>Select client</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  onPress={() => handleDeleteClient(client)}
                >
                  <Ionicons name="trash-outline" size={16} color={tokens.error || '#ef4444'} />
                  <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                    Delete client
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Expanded Detail Section */}
            {isExpanded && (
              <View style={[styles.expandedSection, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                {/* Client Details */}
                <View style={styles.detailsGrid}>
                  {client.email && (
                    <View style={styles.detailItem}>
                      <Ionicons name="mail-outline" size={14} color={tokens.textSecondary} />
                      <Text style={[styles.detailLabel, { color: tokens.textSecondary }]}>Email</Text>
                      <Text style={[styles.detailValue, { color: tokens.textPrimary }]}>{client.email}</Text>
                    </View>
                  )}
                  {client.phone && (
                    <View style={styles.detailItem}>
                      <Ionicons name="call-outline" size={14} color={tokens.textSecondary} />
                      <Text style={[styles.detailLabel, { color: tokens.textSecondary }]}>Phone</Text>
                      <Text style={[styles.detailValue, { color: tokens.textPrimary }]}>{client.phone}</Text>
                    </View>
                  )}
                  {client.address && (
                    <View style={styles.detailItem}>
                      <Ionicons name="location-outline" size={14} color={tokens.textSecondary} />
                      <Text style={[styles.detailLabel, { color: tokens.textSecondary }]}>Location</Text>
                      <Text style={[styles.detailValue, { color: tokens.textPrimary }]}>
                        {[client.address.street, client.address.city, client.address.state]
                          .filter(Boolean)
                          .join(', ') || 'N/A'}
                      </Text>
                    </View>
                  )}
                  {client.status && (
                    <View style={styles.detailItem}>
                      <Ionicons name="ellipse" size={10} color={tokens.textSecondary} />
                      <Text style={[styles.detailLabel, { color: tokens.textSecondary }]}>Status</Text>
                      <Text style={[styles.detailValue, { color: tokens.accent }]}>{client.status}</Text>
                    </View>
                  )}
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActionsSection}>
                  <Text style={[styles.quickActionsLabel, { color: tokens.textSecondary }]}>Quick Actions</Text>
                  <View style={styles.quickActionsGrid}>
                    <TouchableOpacity
                      style={[styles.quickActionButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                      onPress={() => handleMessage(client)}
                    >
                      <Ionicons name="chatbubble" size={18} color={tokens.accent} />
                      <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickActionButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                      onPress={() => handleAppointment(client)}
                    >
                      <Ionicons name="calendar" size={18} color={tokens.accent} />
                      <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Appointment</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickActionButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                      onPress={() => handleReceipt(client)}
                    >
                      <Ionicons name="document-text" size={18} color={tokens.accent} />
                      <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Receipt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickActionButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                      onPress={() => handleNote(client)}
                    >
                      <Ionicons name="create" size={18} color={tokens.accent} />
                      <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Note</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickActionButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                      onPress={() => handleTimer(client)}
                    >
                      <Ionicons name="timer" size={18} color={tokens.accent} />
                      <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Timer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      })}
      </Animated.View>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setReceiptClientId(null);
        }}
        onReceiptCreated={() => {
          setShowReceiptModal(false);
          setReceiptClientId(null);
        }}
        initialClientId={receiptClientId || undefined}
      />

      {/* Time Tracker Modal */}
      <TimeTrackerModal
        isOpen={showTimeTrackerModal}
        onClose={() => {
          setShowTimeTrackerModal(false);
          setTimerClientId(null);
        }}
        initialClientId={timerClientId || undefined}
        onTimeEntryCreated={() => {
          console.log('[ClientSelectorPanel] Time entry created');
        }}
      />
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: tokens.border,
      backgroundColor: tokens.surface,
      padding: 16,
      marginBottom: 16,
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    headingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    heading: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    selectAllButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
    },
    selectAllText: {
      fontSize: 12,
      fontWeight: "600",
    },
    cta: {
      color: tokens.accent,
      textTransform: "uppercase",
      fontSize: 12,
      fontWeight: "600",
    },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 1, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    clientContainer: {
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    clientRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      position: "relative",
    },
    clientInfo: {
      flex: 1,
    },
    clientNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    clientName: {
      color: tokens.textPrimary,
      fontWeight: "600",
      fontSize: 15,
    },
    clientStatus: {
      color: tokens.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    menuButton: {
      padding: 6,
      borderRadius: 8,
    },
    checkboxButton: {
      padding: 4,
    },
    menuPopup: {
      position: "absolute",
      right: 40,
      top: 35,
      backgroundColor: tokens.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      minWidth: 160,
      zIndex: 1000,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    menuItemText: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: "500",
    },
    menuItemDanger: {
      borderBottomWidth: 0,
    },
    menuItemTextDanger: {
      color: tokens.error || '#ef4444',
    },
    batchBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginTop: 12,
      marginBottom: 12,
    },
    batchCountContainer: {
      flexDirection: "column",
      gap: 4,
    },
    batchCount: {
      fontSize: 14,
      fontWeight: "600",
    },
    progressContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    progressText: {
      fontSize: 12,
    },
    batchActions: {
      flexDirection: "row",
      gap: 8,
    },
    batchButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
    },
    batchButtonDanger: {
      backgroundColor: "transparent",
    },
    batchButtonDisabled: {
      opacity: 0.6,
    },
    batchButtonText: {
      fontSize: 13,
      fontWeight: "600",
    },
    expandedSection: {
      paddingHorizontal: 12,
      paddingVertical: 16,
      borderTopWidth: 1,
      marginTop: 8,
    },
    detailsGrid: {
      gap: 12,
      marginBottom: 16,
    },
    detailItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    detailLabel: {
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      minWidth: 70,
    },
    detailValue: {
      fontSize: 14,
      flex: 1,
    },
    quickActionsSection: {
      marginTop: 8,
    },
    quickActionsLabel: {
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      marginBottom: 10,
    },
    quickActionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    quickActionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      minWidth: 110,
    },
    quickActionText: {
      fontSize: 13,
      fontWeight: "600",
    },
    statusHint: {
      color: tokens.textSecondary,
      fontSize: 12,
      marginBottom: 6,
    },
  });
