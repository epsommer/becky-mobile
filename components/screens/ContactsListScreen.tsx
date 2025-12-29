"use client";

/**
 * ContactsListScreen - Screen for viewing and managing synced device contacts
 *
 * Features:
 * - Display synced device contacts with search and filtering
 * - Per-contact action buttons (Create Client, SMS, View Info)
 * - Batch selection for creating multiple clients
 * - Integration with BatchClientCreationModal and ContactInfoModal
 * - Pull-to-refresh functionality
 * - Themed styling matching app design system
 */
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, ThemeTokens } from "../../theme/ThemeContext";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { database } from "../../lib/database";
import { LocalContact } from "../../lib/database/models/LocalContact";
import { Q } from "@nozbe/watermelondb";

// Import modals
import ContactInfoModal from "../modals/ContactInfoModal";
import BatchClientCreationModal from "../modals/BatchClientCreationModal";
import { useContactActions, BatchCreationResult } from "../../hooks/useContactActions";

interface ContactsListScreenProps {
  onBack: () => void;
  onBatchAction?: (selectedIds: string[]) => void;
  onViewClientDetail?: (clientId: string) => void;
}

export default function ContactsListScreen({
  onBack,
  onBatchAction,
  onViewClientDetail,
}: ContactsListScreenProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  // Contact actions hook
  const { openSMS, canOpenSMS } = useContactActions();

  // State
  const [contacts, setContacts] = useState<LocalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Modal states
  const [contactInfoModalVisible, setContactInfoModalVisible] = useState(false);
  const [selectedContactForInfo, setSelectedContactForInfo] = useState<LocalContact | null>(null);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [contactsForBatch, setContactsForBatch] = useState<LocalContact[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Load contacts from database
  const loadContacts = useCallback(async () => {
    if (!refreshing) {
      setLoading(true);
    }
    try {
      let query = database.get<LocalContact>("local_contacts").query();

      if (searchQuery.trim()) {
        query = database.get<LocalContact>("local_contacts").query(
          Q.or(
            Q.where("name", Q.like(`%${searchQuery}%`)),
            Q.where("email", Q.like(`%${searchQuery}%`)),
            Q.where("phone", Q.like(`%${searchQuery}%`))
          )
        );
      }

      const results = await query.fetch();
      // Sort: matched contacts first, then alphabetically
      results.sort((a, b) => {
        if (a.isMatched && !b.isMatched) return -1;
        if (!a.isMatched && b.isMatched) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
      setContacts(results);
    } catch (error) {
      console.error("[ContactsListScreen] Error loading contacts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, refreshing]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Pull to refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadContacts();
  }, [loadContacts]);

  // Animate list when contacts load
  useEffect(() => {
    if (!loading && contacts.length > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, contacts, fadeAnim, slideAnim]);

  // Toggle contact selection with animation
  const toggleSelection = useCallback((contactId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  }, []);

  // Toggle select all
  const toggleSelectAll = useCallback(() => {
    Haptics.selectionAsync();
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
    setSelectAll(!selectAll);
  }, [selectAll, contacts]);

  // Handle batch action - open batch creation modal
  const handleBatchAction = useCallback(() => {
    if (selectedIds.size > 0) {
      const selectedContacts = contacts.filter((c) => selectedIds.has(c.id));
      setContactsForBatch(selectedContacts);
      setBatchModalVisible(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [selectedIds, contacts]);

  // Handle single contact create client action
  const handleCreateClient = useCallback((contact: LocalContact) => {
    setContactsForBatch([contact]);
    setBatchModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Handle SMS action
  const handleSMS = useCallback(
    async (contact: LocalContact) => {
      if (contact.phone) {
        await openSMS(contact.phone);
      } else {
        Alert.alert(
          "No Phone Number",
          "This contact does not have a phone number to send SMS."
        );
      }
    },
    [openSMS]
  );

  // Handle view contact info action
  const handleViewInfo = useCallback((contact: LocalContact) => {
    setSelectedContactForInfo(contact);
    setContactInfoModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Handle batch creation success
  const handleBatchSuccess = useCallback(
    (result: BatchCreationResult) => {
      // Clear selection
      setSelectedIds(new Set());
      setSelectAll(false);

      // Show success message
      if (result.successCount > 0) {
        Alert.alert(
          "Clients Created",
          `Successfully created ${result.successCount} client${result.successCount !== 1 ? "s" : ""}.${
            result.failedCount > 0
              ? ` ${result.failedCount} failed.`
              : ""
          }`
        );
      }

      // Refresh contacts to update sync status
      loadContacts();

      // Legacy callback for external handling
      if (onBatchAction && result.createdClients.length > 0) {
        onBatchAction(result.createdClients.map((c) => c.client.id));
      }
    },
    [loadContacts, onBatchAction]
  );

  // Handle create client from contact info modal
  const handleCreateClientFromInfo = useCallback(
    (contact: LocalContact) => {
      setContactInfoModalVisible(false);
      // Small delay to let modal close
      setTimeout(() => {
        handleCreateClient(contact);
      }, 300);
    },
    [handleCreateClient]
  );

  // Render action buttons for a contact
  const renderActionButtons = (item: LocalContact) => {
    const hasPhone = canOpenSMS(item.phone);

    return (
      <View style={styles.actionButtons}>
        {/* Create Client button - hidden if already synced */}
        {!item.isMatched && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: tokens.accent + "20" }]}
            onPress={() => handleCreateClient(item)}
            activeOpacity={0.7}
            accessibilityLabel="Create client from this contact"
            accessibilityRole="button"
          >
            <Ionicons name="person-add" size={16} color={tokens.accent} />
          </TouchableOpacity>
        )}

        {/* SMS button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: hasPhone ? tokens.surface : tokens.muted + "20",
              borderWidth: 1,
              borderColor: hasPhone ? tokens.border : tokens.muted + "40",
            },
          ]}
          onPress={() => handleSMS(item)}
          disabled={!hasPhone}
          activeOpacity={0.7}
          accessibilityLabel={hasPhone ? "Send SMS to this contact" : "No phone number available"}
          accessibilityRole="button"
        >
          <Ionicons
            name="chatbubble"
            size={16}
            color={hasPhone ? tokens.textSecondary : tokens.muted}
          />
        </TouchableOpacity>

        {/* View Info button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border },
          ]}
          onPress={() => handleViewInfo(item)}
          activeOpacity={0.7}
          accessibilityLabel="View contact details"
          accessibilityRole="button"
        >
          <Ionicons name="information-circle" size={18} color={tokens.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  };

  // Render contact item
  const renderContact = ({ item }: { item: LocalContact }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <View
        style={[
          styles.contactItem,
          isSelected && { backgroundColor: tokens.accent + "20" },
        ]}
      >
        {/* Selection checkbox */}
        <TouchableOpacity
          style={styles.checkboxTouchable}
          onPress={() => toggleSelection(item.id)}
          activeOpacity={0.7}
          accessibilityLabel={isSelected ? "Deselect contact" : "Select contact"}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected }}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: isSelected ? tokens.accent : tokens.border,
                backgroundColor: isSelected ? tokens.accent : "transparent",
              },
            ]}
          >
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        {/* Contact info */}
        <TouchableOpacity
          style={styles.contactInfo}
          onPress={() => handleViewInfo(item)}
          activeOpacity={0.7}
        >
          <View style={styles.contactNameRow}>
            <Text style={[styles.contactName, { color: tokens.textPrimary }]} numberOfLines={1}>
              {item.displayName}
            </Text>
            {item.isMatched && (
              <View style={[styles.syncedBadgeInline, { backgroundColor: tokens.accent + "30" }]}>
                <Ionicons name="checkmark" size={10} color={tokens.accent} />
              </View>
            )}
          </View>
          {item.phone && (
            <Text style={[styles.contactDetail, { color: tokens.textSecondary }]} numberOfLines={1}>
              {item.phone}
            </Text>
          )}
          {item.email && (
            <Text style={[styles.contactDetail, { color: tokens.textSecondary }]} numberOfLines={1}>
              {item.email}
            </Text>
          )}
          {item.company && (
            <Text style={[styles.contactDetail, { color: tokens.muted }]} numberOfLines={1}>
              {item.company}
            </Text>
          )}
        </TouchableOpacity>

        {/* Action buttons */}
        {renderActionButtons(item)}
      </View>
    );
  };

  const syncedCount = contacts.filter((c) => c.isMatched).length;
  const unsyncedCount = contacts.length - syncedCount;

  return (
    <View style={[styles.container, { backgroundColor: tokens.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color={tokens.accent} />
          <Text style={[styles.backText, { color: tokens.accent }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
          Device Contacts
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Stats bar */}
      <View
        style={[styles.statsBar, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
      >
        <Text style={[styles.statText, { color: tokens.textSecondary }]}>
          {contacts.length} total
        </Text>
        <Text style={[styles.statText, { color: tokens.accent }]}>{syncedCount} synced</Text>
        <Text style={[styles.statText, { color: tokens.muted }]}>
          {unsyncedCount} not synced
        </Text>
      </View>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <View style={[styles.batchBar, { backgroundColor: tokens.accent }]}>
          <Text style={[styles.batchText, { color: tokens.background }]}>
            {selectedIds.size} selected
          </Text>
          <View style={styles.batchActions}>
            <TouchableOpacity
              style={[styles.batchClearButton, { borderColor: tokens.background }]}
              onPress={() => {
                setSelectedIds(new Set());
                setSelectAll(false);
              }}
            >
              <Text style={[styles.batchClearText, { color: tokens.background }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchButton, { backgroundColor: tokens.background }]}
              onPress={handleBatchAction}
            >
              <Ionicons name="people" size={14} color={tokens.accent} />
              <Text style={[styles.batchButtonText, { color: tokens.accent }]}>Create Clients</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: tokens.surface, borderColor: tokens.border },
        ]}
      >
        <Ionicons name="search" size={16} color={tokens.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: tokens.textPrimary }]}
          placeholder="Search contacts..."
          placeholderTextColor={tokens.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close" size={14} color={tokens.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Select all toggle */}
      <TouchableOpacity style={styles.selectAllRow} onPress={toggleSelectAll}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: selectAll ? tokens.accent : tokens.border,
              backgroundColor: selectAll ? tokens.accent : "transparent",
            },
          ]}
        >
          {selectAll && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={[styles.selectAllText, { color: tokens.textSecondary }]}>
          Select All
        </Text>
      </TouchableOpacity>

      {/* Contacts list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
            Loading contacts...
          </Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="people-outline"
            size={48}
            color={tokens.muted}
            style={{ marginBottom: 16 }}
          />
          <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
            No contacts found
          </Text>
          <Text style={[styles.emptySubtext, { color: tokens.muted }]}>
            Import contacts from the Clients page
          </Text>
        </View>
      ) : (
        <Animated.View
          style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <FlatList
            data={contacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[tokens.accent]}
                tintColor={tokens.accent}
              />
            }
          />
        </Animated.View>
      )}

      {/* Contact Info Modal */}
      <ContactInfoModal
        visible={contactInfoModalVisible}
        contact={selectedContactForInfo}
        onClose={() => {
          setContactInfoModalVisible(false);
          setSelectedContactForInfo(null);
        }}
        onCreateClient={handleCreateClientFromInfo}
      />

      {/* Batch Client Creation Modal */}
      <BatchClientCreationModal
        visible={batchModalVisible}
        contacts={contactsForBatch}
        onClose={() => {
          setBatchModalVisible(false);
          setContactsForBatch([]);
        }}
        onSuccess={handleBatchSuccess}
      />
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    backText: {
      fontSize: 16,
      fontWeight: "500",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      fontFamily: "Bytesized-Regular",
    },
    statsBar: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: 12,
      marginHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 12,
    },
    statText: {
      fontSize: 13,
      fontWeight: "600",
    },
    batchBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 16,
      borderRadius: 8,
      marginBottom: 12,
    },
    batchText: {
      fontSize: 14,
      fontWeight: "600",
    },
    batchActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    batchClearButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
    },
    batchClearText: {
      fontSize: 13,
      fontWeight: "500",
    },
    batchButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      gap: 6,
    },
    batchButtonText: {
      fontSize: 13,
      fontWeight: "700",
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      gap: 8,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      padding: 0,
    },
    selectAllRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 12,
    },
    selectAllText: {
      fontSize: 14,
      fontWeight: "500",
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    contactItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 8,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    checkboxTouchable: {
      padding: 4,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    contactInfo: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },
    contactNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    contactName: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 2,
      flexShrink: 1,
    },
    syncedBadgeInline: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    contactDetail: {
      fontSize: 13,
    },
    actionButtons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    actionButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    syncedBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    unsyncedBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: 14,
      textAlign: "center",
      marginTop: 8,
    },
  });
